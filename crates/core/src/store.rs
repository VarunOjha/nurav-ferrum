//! The local store for history and bookmarks (P3 feature set, task p3.18, adr-0032): one SQLite file, `ferrum.db`, in
//! Ferrum's data folder, with a word index (FTS5) on titles and addresses for fast search. SQLite is compiled into
//! Ferrum (the `rusqlite` crate, bundled), so nothing is installed on the PC. Browsing data: never committed.
//!
//! Every change is one transaction, so a crash never leaves a half-written file. Deleted rows are overwritten
//! (`secure_delete`) and Clear history compacts the file (`VACUUM`), so cleared entries do not linger inside it.

use std::path::Path;

use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};

use crate::backup::{BookmarkRecord, Contents};
use crate::history::{Entry, History};

/// The database layout this Ferrum writes (SQLite `user_version`).
pub const SCHEMA_VERSION: i32 = 1;

/// How many history entries are kept (the oldest go first).
pub const HISTORY_LIMIT: usize = 50_000;

/// The folder whose bookmarks the bookmarks bar shows; new bookmarks go here unless another folder is given.
pub const BAR_FOLDER: &str = "Favourites bar";

/// The longest address kept (longer ones are refused).
pub const MAX_URL: usize = 4096;
/// The longest title kept (longer ones are cut).
pub const MAX_TITLE: usize = 500;
/// The longest folder name kept.
pub const MAX_FOLDER: usize = 100;

/// One bookmark.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Bookmark {
    /// Its id in the store.
    pub id: i64,
    /// The page's address (`http` or `https` only).
    pub url: String,
    /// Its name.
    pub title: String,
    /// The folder it is in ([`BAR_FOLDER`] for the bookmarks bar).
    pub folder: String,
    /// Its place within the folder (lower first).
    pub position: i64,
    /// When it was added (milliseconds since 1970).
    pub created_at: u64,
}

/// What an import added (p3.21).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Default)]
pub struct ImportReport {
    /// Bookmarks added.
    pub bookmarks: usize,
    /// History entries added.
    pub history: usize,
    /// Entries left out: already there (merge), or not a web address.
    pub skipped: usize,
}

/// Why the store could not be used.
#[derive(Debug)]
pub enum StoreError {
    /// The file was written by a newer Ferrum; it is left alone.
    Newer(i32),
    /// SQLite reported an error (a damaged file, a full disk ...).
    Sqlite(rusqlite::Error),
    /// The input was refused (see the message).
    Invalid(String),
}

impl std::fmt::Display for StoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StoreError::Newer(v) => write!(f, "database version {v} is from a newer Ferrum"),
            StoreError::Sqlite(e) => write!(f, "{e}"),
            StoreError::Invalid(m) => write!(f, "{m}"),
        }
    }
}

impl std::error::Error for StoreError {}

impl From<rusqlite::Error> for StoreError {
    fn from(e: rusqlite::Error) -> Self {
        StoreError::Sqlite(e)
    }
}

/// History and bookmarks in one SQLite database.
pub struct Store {
    conn: Connection,
}

const SCHEMA: &str = "
CREATE TABLE history (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  visited_at INTEGER NOT NULL
);
CREATE INDEX history_by_time ON history (visited_at DESC, id DESC);
CREATE INDEX history_by_url ON history (url);
CREATE VIRTUAL TABLE history_words USING fts5 (title, url, content='history', content_rowid='id');
CREATE TRIGGER history_ai AFTER INSERT ON history BEGIN
  INSERT INTO history_words (rowid, title, url) VALUES (new.id, new.title, new.url);
END;
CREATE TRIGGER history_ad AFTER DELETE ON history BEGIN
  INSERT INTO history_words (history_words, rowid, title, url) VALUES ('delete', old.id, old.title, old.url);
END;
CREATE TRIGGER history_au AFTER UPDATE OF title, url ON history BEGIN
  INSERT INTO history_words (history_words, rowid, title, url) VALUES ('delete', old.id, old.title, old.url);
  INSERT INTO history_words (rowid, title, url) VALUES (new.id, new.title, new.url);
END;
CREATE TABLE bookmarks (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  folder TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX bookmarks_by_url ON bookmarks (url);
CREATE VIRTUAL TABLE bookmark_words USING fts5 (title, url, content='bookmarks', content_rowid='id');
CREATE TRIGGER bookmarks_ai AFTER INSERT ON bookmarks BEGIN
  INSERT INTO bookmark_words (rowid, title, url) VALUES (new.id, new.title, new.url);
END;
CREATE TRIGGER bookmarks_ad AFTER DELETE ON bookmarks BEGIN
  INSERT INTO bookmark_words (bookmark_words, rowid, title, url) VALUES ('delete', old.id, old.title, old.url);
END;
CREATE TRIGGER bookmarks_au AFTER UPDATE OF title, url ON bookmarks BEGIN
  INSERT INTO bookmark_words (bookmark_words, rowid, title, url) VALUES ('delete', old.id, old.title, old.url);
  INSERT INTO bookmark_words (rowid, title, url) VALUES (new.id, new.title, new.url);
END;
";

/// Checks that `url` may be kept: `http` or `https`, parseable, not too long. A `javascript:` or `file:` "bookmark"
/// could run code or open local files, so it is refused (adr-0032).
pub fn check_url(url: &str) -> Result<(), StoreError> {
    if url.len() > MAX_URL {
        return Err(StoreError::Invalid("the address is too long".into()));
    }
    match url::Url::parse(url) {
        Ok(u) if u.scheme() == "http" || u.scheme() == "https" => Ok(()),
        Ok(u) => Err(StoreError::Invalid(format!(
            "only web addresses (http, https) can be kept, not {}:",
            u.scheme()
        ))),
        Err(e) => Err(StoreError::Invalid(format!("not a web address: {e}"))),
    }
}

/// `s` without control characters, cut to `max` characters.
fn clean(s: &str, max: usize) -> String {
    s.chars()
        .filter(|c| !c.is_control())
        .take(max)
        .collect::<String>()
        .trim()
        .to_string()
}

/// A folder name: cleaned; empty means [`BAR_FOLDER`].
fn folder_name(folder: Option<&str>) -> String {
    match folder.map(|f| clean(f, MAX_FOLDER)) {
        Some(f) if !f.is_empty() => f,
        _ => BAR_FOLDER.to_string(),
    }
}

/// The search words of `query` as an FTS5 query: each word as a quoted prefix, all required. `None` when the query
/// has no words. Quoting means nothing the user types is read as FTS5 syntax.
pub fn word_query(query: &str) -> Option<String> {
    let words: Vec<String> = query
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .take(16)
        .map(|w| format!("\"{}\"*", w.to_lowercase()))
        .collect();
    if words.is_empty() {
        None
    } else {
        Some(words.join(" AND "))
    }
}

fn entry(r: &rusqlite::Row<'_>) -> rusqlite::Result<Entry> {
    Ok(Entry {
        url: r.get(0)?,
        title: r.get(1)?,
        visited_at: r.get::<_, i64>(2)?.max(0) as u64,
    })
}

fn bookmark(r: &rusqlite::Row<'_>) -> rusqlite::Result<Bookmark> {
    Ok(Bookmark {
        id: r.get(0)?,
        url: r.get(1)?,
        title: r.get(2)?,
        folder: r.get(3)?,
        position: r.get(4)?,
        created_at: r.get::<_, i64>(5)?.max(0) as u64,
    })
}

const BOOKMARK_COLUMNS: &str = "id, url, title, folder, position, created_at";

impl Store {
    /// Opens (or creates) the database at `path`. A database from a newer Ferrum is refused and left alone.
    pub fn open(path: &Path) -> Result<Store, StoreError> {
        if let Some(dir) = path.parent().filter(|d| !d.as_os_str().is_empty()) {
            std::fs::create_dir_all(dir).map_err(|e| StoreError::Invalid(e.to_string()))?;
        }
        Store::setup(Connection::open(path)?)
    }

    /// A store kept in memory only (self-tests, and when the file cannot be used).
    pub fn in_memory() -> Store {
        Store::setup(Connection::open_in_memory().expect("an in-memory database opens"))
            .expect("an in-memory database takes the schema")
    }

    fn setup(conn: Connection) -> Result<Store, StoreError> {
        conn.pragma_update(None, "secure_delete", "ON")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        let version: i32 = conn.pragma_query_value(None, "user_version", |r| r.get(0))?;
        if version > SCHEMA_VERSION {
            return Err(StoreError::Newer(version));
        }
        if version == 0 {
            conn.execute_batch(&format!(
                "BEGIN; {SCHEMA} PRAGMA user_version = {SCHEMA_VERSION}; COMMIT;"
            ))?;
        }
        // Reading the index checks it is usable (a damaged file fails here, not later).
        conn.query_row("SELECT count(*) FROM history_words", [], |r| {
            r.get::<_, i64>(0)
        })?;
        Ok(Store { conn })
    }

    // ---- history ----

    /// Records a visit to `url` at `at`. A visit to the address of the newest entry updates that entry instead of
    /// adding a duplicate (a reload, or a page reporting its address twice). Keeps at most [`HISTORY_LIMIT`] entries.
    /// Addresses that are not `http`/`https` are ignored.
    pub fn visit(&mut self, url: &str, at: u64) -> Result<(), StoreError> {
        if check_url(url).is_err() {
            return Ok(());
        }
        let tx = self.conn.transaction()?;
        let newest: Option<(i64, String)> = tx
            .query_row(
                "SELECT id, url FROM history ORDER BY visited_at DESC, id DESC LIMIT 1",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()?;
        match newest {
            Some((id, u)) if u == url => {
                tx.execute(
                    "UPDATE history SET visited_at = ?1 WHERE id = ?2",
                    params![at as i64, id],
                )?;
            }
            _ => {
                tx.execute(
                    "INSERT INTO history (url, title, visited_at) VALUES (?1, '', ?2)",
                    params![url, at as i64],
                )?;
                tx.execute(
                    "DELETE FROM history WHERE id IN (SELECT id FROM history ORDER BY visited_at DESC, id DESC \
                     LIMIT -1 OFFSET ?1)",
                    params![HISTORY_LIMIT as i64],
                )?;
            }
        }
        tx.commit()?;
        Ok(())
    }

    /// Sets the title of the newest entry for `url` (pages report their title after their address). True when it
    /// changed.
    pub fn set_title(&mut self, url: &str, title: &str) -> Result<bool, StoreError> {
        let title = clean(title, MAX_TITLE);
        let n = self.conn.execute(
            "UPDATE history SET title = ?2 WHERE id = (SELECT id FROM history WHERE url = ?1 \
             ORDER BY visited_at DESC, id DESC LIMIT 1) AND title <> ?2",
            params![url, title],
        )?;
        Ok(n > 0)
    }

    /// Up to `limit` entries whose title or address has words starting with every word of `query` (any case),
    /// newest first; the newest entries when `query` has no words.
    pub fn history(&self, query: &str, limit: usize) -> Result<Vec<Entry>, StoreError> {
        let limit = limit as i64;
        let rows = match word_query(query) {
            None => {
                let mut st = self.conn.prepare_cached(
                    "SELECT url, title, visited_at FROM history ORDER BY visited_at DESC, id DESC LIMIT ?1",
                )?;
                st.query_map(params![limit], entry)?
                    .collect::<Result<Vec<_>, _>>()?
            }
            Some(q) => {
                let mut st = self.conn.prepare_cached(
                    "SELECT h.url, h.title, h.visited_at FROM history_words w JOIN history h ON h.id = w.rowid \
                     WHERE history_words MATCH ?1 ORDER BY h.visited_at DESC, h.id DESC LIMIT ?2",
                )?;
                st.query_map(params![q, limit], entry)?
                    .collect::<Result<Vec<_>, _>>()?
            }
        };
        Ok(rows)
    }

    /// Up to `limit` different pages from the history matching `query` (as [`Store::history`]), each address once
    /// with its newest visit, newest first. For the address bar's suggestions (p3.20).
    pub fn suggest_history(&self, query: &str, limit: usize) -> Result<Vec<Entry>, StoreError> {
        let mut seen = std::collections::HashSet::new();
        Ok(self
            .history(query, limit.saturating_mul(10).max(50))?
            .into_iter()
            .filter(|e| seen.insert(e.url.clone()))
            .take(limit)
            .collect())
    }

    /// Forgets every visit to `url` (Shift+Delete on a suggestion). Returns how many entries went.
    pub fn remove_history_url(&mut self, url: &str) -> Result<usize, StoreError> {
        Ok(self
            .conn
            .execute("DELETE FROM history WHERE url = ?1", params![url])?)
    }

    /// Number of history entries.
    pub fn history_len(&self) -> Result<usize, StoreError> {
        Ok(self
            .conn
            .query_row("SELECT count(*) FROM history", [], |r| r.get::<_, i64>(0))?
            as usize)
    }

    /// Forgets the whole history: the entries and their word index, then compacts the file so nothing of them stays
    /// inside it.
    pub fn clear_history(&mut self) -> Result<(), StoreError> {
        let tx = self.conn.transaction()?;
        tx.execute("DELETE FROM history", [])?;
        tx.execute(
            "INSERT INTO history_words (history_words) VALUES ('rebuild')",
            [],
        )?;
        tx.commit()?;
        self.conn.execute_batch("VACUUM")?;
        Ok(())
    }

    /// Adds the entries of an old `history.json` (p3.7), keeping their order and times. Used once, when `ferrum.db`
    /// is new. Entries with other addresses are skipped.
    pub fn import_history(&mut self, old: &History) -> Result<usize, StoreError> {
        let tx = self.conn.transaction()?;
        let mut n = 0;
        {
            let mut st =
                tx.prepare("INSERT INTO history (url, title, visited_at) VALUES (?1, ?2, ?3)")?;
            // Oldest first, so ids grow with time like normal visits.
            for e in old.entries.iter().rev() {
                if check_url(&e.url).is_ok() {
                    st.execute(params![
                        e.url,
                        clean(&e.title, MAX_TITLE),
                        e.visited_at as i64
                    ])?;
                    n += 1;
                }
            }
        }
        tx.commit()?;
        Ok(n)
    }

    // ---- backup (p3.21) ----

    /// Everything a backup holds: every bookmark and the whole history (newest first).
    pub fn export(&self, at: u64) -> Result<Contents, StoreError> {
        let bookmarks = self
            .bookmarks()?
            .into_iter()
            .map(|b| BookmarkRecord {
                url: b.url,
                title: b.title,
                folder: b.folder,
                position: b.position,
                created_at: b.created_at,
            })
            .collect();
        Ok(Contents::new(
            at,
            bookmarks,
            self.history("", HISTORY_LIMIT)?,
        ))
    }

    /// Adds a backup's contents. `replace` first empties bookmarks and history; otherwise entries already here (same
    /// address and folder for a bookmark, same address and time for a visit) are skipped. Addresses that are not
    /// `http`/`https` are left out and titles are cleaned, as for every other entry. One transaction: all or nothing.
    pub fn import(&mut self, c: &Contents, replace: bool) -> Result<ImportReport, StoreError> {
        let mut r = ImportReport::default();
        let tx = self.conn.transaction()?;
        if replace {
            tx.execute("DELETE FROM bookmarks", [])?;
            tx.execute("DELETE FROM history", [])?;
        }
        {
            let mut exists =
                tx.prepare("SELECT 1 FROM bookmarks WHERE url = ?1 AND folder = ?2")?;
            let mut next = tx.prepare(
                "SELECT coalesce(max(position), -1) + 1 FROM bookmarks WHERE folder = ?1",
            )?;
            let mut add = tx.prepare(
                "INSERT INTO bookmarks (url, title, folder, position, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            )?;
            let mut ordered: Vec<&BookmarkRecord> = c.bookmarks.iter().collect();
            ordered.sort_by_key(|b| (b.folder.clone(), b.position));
            for b in ordered {
                let folder = folder_name(Some(&b.folder));
                if check_url(&b.url).is_err() || exists.exists(params![b.url, folder])? {
                    r.skipped += 1;
                    continue;
                }
                let mut title = clean(&b.title, MAX_TITLE);
                if title.is_empty() {
                    title = b.url.chars().take(MAX_TITLE).collect();
                }
                let position: i64 = next.query_row(params![folder], |x| x.get(0))?;
                add.execute(params![b.url, title, folder, position, b.created_at as i64])?;
                r.bookmarks += 1;
            }
            let mut seen =
                tx.prepare("SELECT 1 FROM history WHERE url = ?1 AND visited_at = ?2")?;
            let mut visit =
                tx.prepare("INSERT INTO history (url, title, visited_at) VALUES (?1, ?2, ?3)")?;
            // Oldest first, so ids grow with time like normal visits.
            for e in c.history.iter().rev() {
                if check_url(&e.url).is_err() || seen.exists(params![e.url, e.visited_at as i64])? {
                    r.skipped += 1;
                    continue;
                }
                visit.execute(params![
                    e.url,
                    clean(&e.title, MAX_TITLE),
                    e.visited_at as i64
                ])?;
                r.history += 1;
            }
        }
        tx.execute(
            "DELETE FROM history WHERE id IN (SELECT id FROM history ORDER BY visited_at DESC, id DESC \
             LIMIT -1 OFFSET ?1)",
            params![HISTORY_LIMIT as i64],
        )?;
        tx.commit()?;
        Ok(r)
    }

    /// Writes a consistent copy of the whole database to `path` (a new file), e.g. before an import replaces
    /// everything.
    pub fn copy_to(&self, path: &Path) -> Result<(), StoreError> {
        if path.exists() {
            return Err(StoreError::Invalid(format!(
                "{} already exists",
                path.display()
            )));
        }
        self.conn
            .execute("VACUUM INTO ?1", params![path.to_string_lossy()])?;
        Ok(())
    }

    // ---- bookmarks ----

    /// Adds a bookmark at the end of `folder` ([`BAR_FOLDER`] when none). Only `http`/`https` addresses.
    pub fn add_bookmark(
        &mut self,
        url: &str,
        title: &str,
        folder: Option<&str>,
        at: u64,
    ) -> Result<Bookmark, StoreError> {
        check_url(url)?;
        let folder = folder_name(folder);
        let mut title = clean(title, MAX_TITLE);
        if title.is_empty() {
            title = url.chars().take(MAX_TITLE).collect();
        }
        let tx = self.conn.transaction()?;
        let position: i64 = tx.query_row(
            "SELECT coalesce(max(position), -1) + 1 FROM bookmarks WHERE folder = ?1",
            params![folder],
            |r| r.get(0),
        )?;
        tx.execute(
            "INSERT INTO bookmarks (url, title, folder, position, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![url, title, folder, position, at as i64],
        )?;
        let id = tx.last_insert_rowid();
        tx.commit()?;
        self.bookmark(id)?
            .ok_or_else(|| StoreError::Invalid("bookmark not saved".into()))
    }

    /// The bookmark with `id`.
    pub fn bookmark(&self, id: i64) -> Result<Option<Bookmark>, StoreError> {
        Ok(self
            .conn
            .query_row(
                &format!("SELECT {BOOKMARK_COLUMNS} FROM bookmarks WHERE id = ?1"),
                params![id],
                bookmark,
            )
            .optional()?)
    }

    /// The first bookmark for `url`, if any (the star in the address bar).
    pub fn bookmark_for(&self, url: &str) -> Result<Option<Bookmark>, StoreError> {
        Ok(self
            .conn
            .query_row(
                &format!(
                    "SELECT {BOOKMARK_COLUMNS} FROM bookmarks WHERE url = ?1 ORDER BY id LIMIT 1"
                ),
                params![url],
                bookmark,
            )
            .optional()?)
    }

    /// Every bookmark, by folder (the bookmarks bar first) and position.
    pub fn bookmarks(&self) -> Result<Vec<Bookmark>, StoreError> {
        let mut st = self.conn.prepare_cached(&format!(
            "SELECT {BOOKMARK_COLUMNS} FROM bookmarks ORDER BY folder <> ?1, folder COLLATE NOCASE, position, id"
        ))?;
        Ok(st
            .query_map(params![BAR_FOLDER], bookmark)?
            .collect::<Result<Vec<_>, _>>()?)
    }

    /// Up to `limit` bookmarks whose title or address has words starting with every word of `query`.
    pub fn search_bookmarks(&self, query: &str, limit: usize) -> Result<Vec<Bookmark>, StoreError> {
        let Some(q) = word_query(query) else {
            return Ok(Vec::new());
        };
        let mut st = self.conn.prepare_cached(
            "SELECT b.id, b.url, b.title, b.folder, b.position, b.created_at FROM bookmark_words w \
             JOIN bookmarks b ON b.id = w.rowid WHERE bookmark_words MATCH ?1 ORDER BY rank LIMIT ?2",
        )?;
        Ok(st
            .query_map(params![q, limit as i64], bookmark)?
            .collect::<Result<Vec<_>, _>>()?)
    }

    /// Renames bookmark `id` and/or moves it to the end of another folder.
    pub fn update_bookmark(
        &mut self,
        id: i64,
        title: Option<&str>,
        folder: Option<&str>,
    ) -> Result<Bookmark, StoreError> {
        let current = self
            .bookmark(id)?
            .ok_or_else(|| StoreError::Invalid("no such bookmark".into()))?;
        let tx = self.conn.transaction()?;
        if let Some(t) = title {
            let t = clean(t, MAX_TITLE);
            if t.is_empty() {
                return Err(StoreError::Invalid("a bookmark needs a name".into()));
            }
            tx.execute(
                "UPDATE bookmarks SET title = ?2 WHERE id = ?1",
                params![id, t],
            )?;
        }
        if let Some(f) = folder {
            let f = folder_name(Some(f));
            if f != current.folder {
                let position: i64 = tx.query_row(
                    "SELECT coalesce(max(position), -1) + 1 FROM bookmarks WHERE folder = ?1",
                    params![f],
                    |r| r.get(0),
                )?;
                tx.execute(
                    "UPDATE bookmarks SET folder = ?2, position = ?3 WHERE id = ?1",
                    params![id, f, position],
                )?;
            }
        }
        tx.commit()?;
        self.bookmark(id)?
            .ok_or_else(|| StoreError::Invalid("no such bookmark".into()))
    }

    /// Moves bookmark `id` to `index` within its folder (0 = first).
    pub fn move_bookmark(&mut self, id: i64, index: usize) -> Result<(), StoreError> {
        let current = self
            .bookmark(id)?
            .ok_or_else(|| StoreError::Invalid("no such bookmark".into()))?;
        let tx = self.conn.transaction()?;
        let mut ids: Vec<i64> = {
            let mut st =
                tx.prepare("SELECT id FROM bookmarks WHERE folder = ?1 ORDER BY position, id")?;
            st.query_map(params![current.folder], |r| r.get(0))?
                .collect::<Result<Vec<_>, _>>()?
        };
        ids.retain(|&x| x != id);
        ids.insert(index.min(ids.len()), id);
        for (i, b) in ids.iter().enumerate() {
            tx.execute(
                "UPDATE bookmarks SET position = ?2 WHERE id = ?1",
                params![b, i as i64],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    /// Deletes bookmark `id`. True when it existed.
    pub fn remove_bookmark(&mut self, id: i64) -> Result<bool, StoreError> {
        Ok(self
            .conn
            .execute("DELETE FROM bookmarks WHERE id = ?1", params![id])?
            > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> std::path::PathBuf {
        let d = std::env::temp_dir().join(format!("ferrum-store-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d.join("ferrum.db")
    }

    #[test]
    fn word_index_is_compiled_in() {
        let s = Store::in_memory();
        let v: String = s
            .conn
            .query_row("SELECT sqlite_version()", [], |r| r.get(0))
            .unwrap();
        assert!(!v.is_empty());
        let opts: Vec<String> = {
            let mut st = s.conn.prepare("PRAGMA compile_options").unwrap();
            st.query_map([], |r| r.get(0))
                .unwrap()
                .map(Result::unwrap)
                .collect()
        };
        assert!(opts.iter().any(|o| o == "ENABLE_FTS5"), "{opts:?}");
    }

    #[test]
    fn visits_newest_first_with_titles_and_no_duplicate_on_reload() {
        let mut s = Store::in_memory();
        s.visit("https://a.example/", 1).unwrap();
        s.visit("https://b.example/x", 2).unwrap();
        s.visit("https://b.example/x", 3).unwrap();
        assert!(s.set_title("https://b.example/x", "Bee page").unwrap());
        assert!(!s.set_title("https://b.example/x", "Bee page").unwrap());
        let h = s.history("", 10).unwrap();
        assert_eq!(
            h.iter().map(|e| e.url.as_str()).collect::<Vec<_>>(),
            ["https://b.example/x", "https://a.example/"]
        );
        assert_eq!(h[0].title, "Bee page");
        assert_eq!(h[0].visited_at, 3);
    }

    #[test]
    fn other_schemes_are_not_history() {
        let mut s = Store::in_memory();
        s.visit("about:blank", 1).unwrap();
        s.visit("file:///C:/secret.txt", 2).unwrap();
        s.visit("javascript:alert(1)", 3).unwrap();
        assert_eq!(s.history_len().unwrap(), 0);
    }

    #[test]
    fn search_finds_words_of_titles_and_addresses_any_case() {
        let mut s = Store::in_memory();
        s.visit("https://localhost:8443/counted/history2", 1)
            .unwrap();
        s.set_title(
            "https://localhost:8443/counted/history2",
            "Counted history2",
        )
        .unwrap();
        s.visit("https://docs.rs/rusqlite/latest", 2).unwrap();
        s.set_title("https://docs.rs/rusqlite/latest", "rusqlite - Rust")
            .unwrap();
        let urls = |q: &str| {
            s.history(q, 10)
                .unwrap()
                .into_iter()
                .map(|e| e.url)
                .collect::<Vec<_>>()
        };
        assert_eq!(urls("COUNTED"), ["https://localhost:8443/counted/history2"]);
        assert_eq!(urls("rusq"), ["https://docs.rs/rusqlite/latest"]);
        assert_eq!(urls("docs rust"), ["https://docs.rs/rusqlite/latest"]);
        assert!(urls("nothing-like-this").is_empty());
        // FTS5 syntax typed by the user is only words.
        assert!(urls("\"\" OR * NEAR(").is_empty());
        assert_eq!(urls("").len(), 2);
    }

    #[test]
    fn oldest_entries_go_past_the_limit() {
        let mut s = Store::in_memory();
        let tx = s.conn.transaction().unwrap();
        for i in 0..HISTORY_LIMIT as i64 {
            tx.execute(
                "INSERT INTO history (url, title, visited_at) VALUES (?1, '', ?2)",
                params![format!("https://e.example/{i}"), i],
            )
            .unwrap();
        }
        tx.commit().unwrap();
        s.visit("https://new.example/", HISTORY_LIMIT as u64 + 5)
            .unwrap();
        assert_eq!(s.history_len().unwrap(), HISTORY_LIMIT);
        assert!(
            s.history("e.example 0", 5)
                .unwrap()
                .iter()
                .all(|e| e.url != "https://e.example/0")
        );
        assert_eq!(s.history("", 1).unwrap()[0].url, "https://new.example/");
    }

    #[test]
    fn clear_history_leaves_nothing_in_tables_index_or_file() {
        let p = temp("clear");
        {
            let mut s = Store::open(&p).unwrap();
            for i in 0..200 {
                s.visit(&format!("https://private-trace.example/page{i}"), i)
                    .unwrap();
                s.set_title(
                    &format!("https://private-trace.example/page{i}"),
                    "Secret Title Marker",
                )
                .unwrap();
            }
            s.add_bookmark("https://kept.example/", "Kept bookmark", None, 1)
                .unwrap();
            s.clear_history().unwrap();
            assert_eq!(s.history_len().unwrap(), 0);
            assert!(s.history("secret", 10).unwrap().is_empty());
            let words: i64 = s
                .conn
                .query_row("SELECT count(*) FROM history_words", [], |r| r.get(0))
                .unwrap();
            assert_eq!(words, 0);
            assert_eq!(s.bookmarks().unwrap().len(), 1, "bookmarks are not history");
        }
        let bytes = std::fs::read(&p).unwrap();
        let text = String::from_utf8_lossy(&bytes).to_lowercase();
        assert!(
            !text.contains("private-trace"),
            "a cleared address is still in the file"
        );
        assert!(
            !text.contains("secret title marker"),
            "a cleared title is still in the file"
        );
        assert!(text.contains("kept.example"));
    }

    #[test]
    fn imports_old_history_json_in_order() {
        let mut old = History::default();
        old.visit("https://one.example/", 10);
        old.visit("https://two.example/", 20);
        old.set_title("https://two.example/", "Two");
        old.visit("chrome://settings", 30);
        let mut s = Store::in_memory();
        assert_eq!(s.import_history(&old).unwrap(), 2);
        let h = s.history("", 10).unwrap();
        assert_eq!(
            h.iter().map(|e| e.url.as_str()).collect::<Vec<_>>(),
            ["https://two.example/", "https://one.example/"]
        );
        assert_eq!(h[0].title, "Two");
        assert_eq!(s.history("two", 5).unwrap().len(), 1);
    }

    #[test]
    fn survives_reopening_and_refuses_a_newer_file() {
        let p = temp("reopen");
        {
            let mut s = Store::open(&p).unwrap();
            s.visit("https://kept.example/", 1).unwrap();
            s.add_bookmark("https://kept.example/", "Kept", Some("Work"), 2)
                .unwrap();
        }
        {
            let s = Store::open(&p).unwrap();
            assert_eq!(s.history("kept", 5).unwrap().len(), 1);
            assert_eq!(s.bookmarks().unwrap()[0].folder, "Work");
            s.conn.pragma_update(None, "user_version", 99).unwrap();
        }
        assert!(matches!(Store::open(&p), Err(StoreError::Newer(99))));
    }

    #[test]
    fn a_damaged_file_is_an_error_not_a_crash() {
        let p = temp("damaged");
        std::fs::write(
            &p,
            b"this is not a database file at all, not even close .....................",
        )
        .unwrap();
        assert!(matches!(Store::open(&p), Err(StoreError::Sqlite(_))));
    }

    #[test]
    fn bookmarks_only_web_addresses() {
        let mut s = Store::in_memory();
        for bad in [
            "javascript:alert(1)",
            "file:///C:/Windows/win.ini",
            "data:text/html,hi",
            "not a url",
            "ftp://x.example/",
        ] {
            assert!(
                matches!(
                    s.add_bookmark(bad, "x", None, 1),
                    Err(StoreError::Invalid(_))
                ),
                "{bad}"
            );
        }
        assert!(s.bookmarks().unwrap().is_empty());
        let long = format!("https://x.example/{}", "a".repeat(MAX_URL));
        assert!(s.add_bookmark(&long, "x", None, 1).is_err());
    }

    #[test]
    fn bookmarks_add_rename_move_delete_and_search() {
        let mut s = Store::in_memory();
        let a = s
            .add_bookmark("https://github.com/you/ferrum", "Ferrum repo", None, 1)
            .unwrap();
        let b = s
            .add_bookmark("https://docs.rs/rusqlite", "", Some("Reading"), 2)
            .unwrap();
        let c = s
            .add_bookmark("https://tauri.app/", "Tauri\u{7}", None, 3)
            .unwrap();
        assert_eq!(a.folder, BAR_FOLDER);
        assert_eq!(b.title, "https://docs.rs/rusqlite", "no title: the address");
        assert_eq!(c.title, "Tauri", "control characters dropped");
        assert_eq!((a.position, c.position), (0, 1));
        assert_eq!(
            s.bookmark_for("https://github.com/you/ferrum")
                .unwrap()
                .unwrap()
                .id,
            a.id
        );
        let r = s
            .update_bookmark(a.id, Some("Ferrum on GitHub"), Some("Work"))
            .unwrap();
        assert_eq!(
            (r.title.as_str(), r.folder.as_str(), r.position),
            ("Ferrum on GitHub", "Work", 0)
        );
        assert!(s.update_bookmark(a.id, Some("  "), None).is_err());
        s.add_bookmark("https://mdn.example/", "MDN", None, 4)
            .unwrap();
        let d = s.bookmark_for("https://mdn.example/").unwrap().unwrap();
        s.move_bookmark(d.id, 0).unwrap();
        let bar: Vec<_> = s
            .bookmarks()
            .unwrap()
            .into_iter()
            .filter(|x| x.folder == BAR_FOLDER)
            .map(|x| x.title)
            .collect();
        assert_eq!(bar, ["MDN", "Tauri"]);
        assert_eq!(
            s.bookmarks().unwrap()[0].folder,
            BAR_FOLDER,
            "the bar's folder comes first"
        );
        assert_eq!(s.search_bookmarks("ferr", 5).unwrap()[0].id, a.id);
        assert_eq!(s.search_bookmarks("github", 5).unwrap().len(), 1);
        assert!(s.remove_bookmark(a.id).unwrap());
        assert!(!s.remove_bookmark(a.id).unwrap());
        assert!(s.search_bookmarks("ferr", 5).unwrap().is_empty());
    }

    #[test]
    fn suggestions_list_each_page_once_and_one_page_can_be_forgotten() {
        let mut s = Store::in_memory();
        for (i, u) in [
            "https://a.example/rust",
            "https://b.example/rust",
            "https://a.example/rust",
            "https://c.example/go",
        ]
        .iter()
        .enumerate()
        {
            s.visit(u, i as u64 + 1).unwrap();
        }
        let urls = |s: &Store| {
            s.suggest_history("rust", 5)
                .unwrap()
                .into_iter()
                .map(|e| e.url)
                .collect::<Vec<_>>()
        };
        assert_eq!(
            urls(&s),
            ["https://a.example/rust", "https://b.example/rust"]
        );
        assert_eq!(s.suggest_history("rust", 1).unwrap().len(), 1);
        assert_eq!(s.remove_history_url("https://a.example/rust").unwrap(), 2);
        assert_eq!(urls(&s), ["https://b.example/rust"]);
        assert_eq!(s.history_len().unwrap(), 2);
    }

    #[test]
    fn backup_export_and_import_merge_or_replace() {
        let mut a = Store::in_memory();
        a.visit("https://one.example/", 10).unwrap();
        a.set_title("https://one.example/", "One").unwrap();
        a.visit("https://two.example/", 20).unwrap();
        a.add_bookmark("https://bm.example/", "Bm", Some("Work"), 1)
            .unwrap();
        let mut c = a.export(99).unwrap();
        assert_eq!(
            (c.bookmarks.len(), c.history.len(), c.created_at),
            (1, 2, 99)
        );
        // A crafted backup: a script address and a control character are not taken over.
        c.bookmarks.push(BookmarkRecord {
            url: "javascript:alert(1)".into(),
            title: "evil".into(),
            folder: "Work".into(),
            position: 5,
            created_at: 1,
        });
        c.history.push(Entry {
            url: "file:///C:/x".into(),
            title: "x".into(),
            visited_at: 1,
        });
        c.history[0].title = "Two\u{7}".into();

        let mut b = Store::in_memory();
        b.add_bookmark("https://mine.example/", "Mine", None, 1)
            .unwrap();
        let r = b.import(&c, false).unwrap();
        assert_eq!((r.bookmarks, r.history, r.skipped), (1, 2, 2));
        assert_eq!(b.bookmarks().unwrap().len(), 2);
        assert!(
            b.bookmarks()
                .unwrap()
                .iter()
                .all(|x| x.url.starts_with("https://"))
        );
        assert_eq!(b.history("", 10).unwrap()[0].title, "Two");
        // Merging again adds nothing.
        let again = b.import(&c, false).unwrap();
        assert_eq!((again.bookmarks, again.history), (0, 0));
        // Replace: only the backup's entries stay.
        let r = b.import(&c, true).unwrap();
        assert_eq!((r.bookmarks, r.history), (1, 2));
        assert_eq!(
            b.bookmarks()
                .unwrap()
                .iter()
                .map(|x| x.url.as_str())
                .collect::<Vec<_>>(),
            ["https://bm.example/"]
        );
        assert_eq!(b.history("one", 5).unwrap().len(), 1);
    }

    #[test]
    fn copy_to_writes_a_usable_copy_and_never_overwrites() {
        let p = temp("copy");
        let mut s = Store::open(&p).unwrap();
        s.add_bookmark("https://kept.example/", "Kept", None, 1)
            .unwrap();
        let copy = p.with_file_name("copy.db");
        s.copy_to(&copy).unwrap();
        assert_eq!(Store::open(&copy).unwrap().bookmarks().unwrap().len(), 1);
        assert!(s.copy_to(&copy).is_err());
    }

    #[test]
    fn word_query_quotes_every_word() {
        assert_eq!(word_query("  "), None);
        assert_eq!(
            word_query("Ferr docs.rs"),
            Some("\"ferr\"* AND \"docs\"* AND \"rs\"*".into())
        );
        assert_eq!(
            word_query("a\"b OR c"),
            Some("\"a\"* AND \"b\"* AND \"or\"* AND \"c\"*".into())
        );
    }
}
