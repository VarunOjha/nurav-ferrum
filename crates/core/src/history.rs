//! The local browsing history (P3 task p3.7): the pages the user visited, newest first, kept in `history.json` in
//! Ferrum's data folder, never committed, and clearable at once. Pure Rust: the app records visits, the shell shows
//! and searches them.

use std::path::Path;

use serde::{Deserialize, Serialize};

/// The history file format this Ferrum writes.
pub const VERSION: u32 = 1;

/// How many entries are kept (the oldest go first).
pub const LIMIT: usize = 1000;

/// One visit.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Entry {
    /// The page's address.
    pub url: String,
    /// Its title (empty until the page reports one).
    #[serde(default)]
    pub title: String,
    /// When it was visited (milliseconds since 1970).
    pub visited_at: u64,
}

/// The history, newest entry first.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields)]
pub struct History {
    /// File format version (0 for a history never saved).
    #[serde(default)]
    pub version: u32,
    /// The entries, newest first.
    pub entries: Vec<Entry>,
}

impl History {
    /// Records a visit to `url` at `at`. A visit to the address of the newest entry updates that entry instead of
    /// adding a duplicate (a reload, or a page reporting its address twice). Keeps at most [`LIMIT`] entries.
    pub fn visit(&mut self, url: &str, at: u64) {
        if let Some(first) = self.entries.first_mut()
            && first.url == url
        {
            first.visited_at = at;
            return;
        }
        self.entries.insert(
            0,
            Entry {
                url: url.to_string(),
                title: String::new(),
                visited_at: at,
            },
        );
        self.entries.truncate(LIMIT);
    }

    /// Sets the title of the newest entry for `url` (pages report their title after their address).
    pub fn set_title(&mut self, url: &str, title: &str) -> bool {
        match self.entries.iter_mut().find(|e| e.url == url) {
            Some(e) if e.title != title => {
                e.title = title.to_string();
                true
            }
            _ => false,
        }
    }

    /// Up to `limit` entries whose address or title contains `query` (any case), newest first; all when empty.
    pub fn search(&self, query: &str, limit: usize) -> Vec<Entry> {
        let q = query.trim().to_lowercase();
        self.entries
            .iter()
            .filter(|e| {
                q.is_empty()
                    || e.url.to_lowercase().contains(&q)
                    || e.title.to_lowercase().contains(&q)
            })
            .take(limit)
            .cloned()
            .collect()
    }

    /// Forgets every entry.
    pub fn clear(&mut self) {
        self.entries.clear();
    }
}

/// Writes `history` to `path` atomically.
pub fn save(path: &Path, history: &History) -> std::io::Result<()> {
    let mut h = history.clone();
    h.version = VERSION;
    let text = serde_json::to_vec_pretty(&h).map_err(std::io::Error::other)?;
    crate::fsutil::write_atomic(path, &text)
}

/// Reads the history at `path`: empty when there is none; an error when it cannot be used.
pub fn load(path: &Path) -> Result<History, String> {
    let text = match std::fs::read_to_string(path) {
        Ok(t) => t,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(History::default()),
        Err(e) => return Err(e.to_string()),
    };
    let h: History = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    if h.version > VERSION {
        return Err(format!(
            "history file version {} is from a newer Ferrum",
            h.version
        ));
    }
    Ok(h)
}
