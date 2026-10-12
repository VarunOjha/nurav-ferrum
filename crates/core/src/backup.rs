//! The backup file (P3 feature set, p3.21, adr-0032): bookmarks and history in one file, locked with a passphrase,
//! to move them to another Ferrum by hand. Cookies, logins and site data are never in it.
//!
//! Format (version 1), all integers little-endian:
//!
//! ```text
//! "FERRUMBK" (8) | format 1 (1) | Argon2id m_cost KiB (4) | t_cost (4) | p_cost (4) | salt (16) | nonce (24)
//! | XChaCha20-Poly1305 ciphertext of the JSON payload, with the 65 header bytes as associated data
//! ```
//!
//! The key is Argon2id(passphrase, salt). The cipher is authenticated and covers the header too: a wrong passphrase, a
//! changed byte anywhere, or a cut-off file is refused as a whole. Ferrum uses published primitives (RustCrypto
//! `argon2`, `chacha20poly1305`) and invents no cryptography; only the container layout above is its own. The
//! passphrase and the key are wiped from memory after use and never stored or logged.

use argon2::{Algorithm, Argon2, Params, Version};
use chacha20poly1305::aead::{Aead, KeyInit, Payload as AeadPayload};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::history::Entry;

/// The first bytes of every backup file.
pub const MAGIC: &[u8; 8] = b"FERRUMBK";
/// The container format this Ferrum writes and reads.
pub const FORMAT: u8 = 1;
/// The shortest passphrase accepted for a new backup.
pub const MIN_PASSPHRASE: usize = 12;
/// The largest backup file Ferrum opens.
pub const MAX_FILE: u64 = 100 * 1024 * 1024;
/// The file name ending of backups.
pub const EXTENSION: &str = "ferrum-backup";

const HEADER: usize = 8 + 1 + 4 + 4 + 4 + 16 + 24;
/// Argon2id cost Ferrum uses for new backups: 64 MiB, 3 passes, 1 lane.
pub const COST: Cost = Cost {
    m_kib: 64 * 1024,
    t: 3,
    p: 1,
};
/// The most work a backup file may ask for (a file asking for more is refused, so a crafted file cannot hang Ferrum).
const MAX_M_KIB: u32 = 512 * 1024;
const MAX_T: u32 = 10;
const MAX_P: u32 = 8;

/// Argon2id cost parameters.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Cost {
    /// Memory in KiB.
    pub m_kib: u32,
    /// Passes.
    pub t: u32,
    /// Lanes.
    pub p: u32,
}

/// One bookmark in a backup.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BookmarkRecord {
    /// Address.
    pub url: String,
    /// Name.
    pub title: String,
    /// Folder.
    pub folder: String,
    /// Place in the folder.
    pub position: i64,
    /// When it was added (ms since 1970).
    pub created_at: u64,
}

/// What a backup holds.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Contents {
    /// Always "ferrum-backup".
    pub kind: String,
    /// Contents version (1).
    pub version: u32,
    /// When the backup was made (ms since 1970).
    pub created_at: u64,
    /// Bookmarks.
    pub bookmarks: Vec<BookmarkRecord>,
    /// History, newest first.
    pub history: Vec<Entry>,
}

impl Contents {
    /// New contents made at `at`.
    pub fn new(at: u64, bookmarks: Vec<BookmarkRecord>, history: Vec<Entry>) -> Self {
        Contents {
            kind: "ferrum-backup".into(),
            version: 1,
            created_at: at,
            bookmarks,
            history,
        }
    }
}

/// Why a backup could not be made or opened.
#[derive(Debug, PartialEq, Eq)]
pub enum BackupError {
    /// The passphrase is shorter than [`MIN_PASSPHRASE`].
    PassphraseTooShort,
    /// The file is not a Ferrum backup.
    NotABackup,
    /// The file is from a newer Ferrum.
    Newer(u8),
    /// The file asks for unreasonable work to open it.
    Unreasonable,
    /// Wrong passphrase, or the file was changed or damaged (the two cannot be told apart, by design).
    WrongPassphraseOrDamaged,
    /// The file is larger than [`MAX_FILE`].
    TooLarge,
    /// The contents are not what a backup holds.
    BadContents(String),
    /// Something else failed (random numbers, key derivation).
    Failed(String),
}

impl std::fmt::Display for BackupError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BackupError::PassphraseTooShort => {
                write!(
                    f,
                    "the passphrase must be at least {MIN_PASSPHRASE} characters"
                )
            }
            BackupError::NotABackup => write!(f, "this is not a Ferrum backup file"),
            BackupError::Newer(v) => write!(f, "this backup is from a newer Ferrum (format {v})"),
            BackupError::Unreasonable => write!(
                f,
                "this backup file asks for too much work to open; refused"
            ),
            BackupError::WrongPassphraseOrDamaged => {
                write!(
                    f,
                    "wrong passphrase, or the file was changed or damaged; nothing was imported"
                )
            }
            BackupError::TooLarge => write!(f, "the file is larger than 100 MB; refused"),
            BackupError::BadContents(m) => write!(f, "the backup's contents are not usable: {m}"),
            BackupError::Failed(m) => write!(f, "{m}"),
        }
    }
}

impl std::error::Error for BackupError {}

fn key(passphrase: &str, salt: &[u8], cost: Cost) -> Result<Zeroizing<[u8; 32]>, BackupError> {
    let params =
        Params::new(cost.m_kib, cost.t, cost.p, Some(32)).map_err(|_| BackupError::Unreasonable)?;
    let mut out = Zeroizing::new([0u8; 32]);
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
        .hash_password_into(passphrase.as_bytes(), salt, out.as_mut())
        .map_err(|e| BackupError::Failed(format!("key derivation failed: {e}")))?;
    Ok(out)
}

/// Locks `contents` with `passphrase` (Ferrum's cost).
pub fn seal(contents: &Contents, passphrase: &str) -> Result<Vec<u8>, BackupError> {
    seal_with(contents, passphrase, COST)
}

/// Locks `contents` with `passphrase` and the given Argon2id cost (tests use a small one).
pub fn seal_with(
    contents: &Contents,
    passphrase: &str,
    cost: Cost,
) -> Result<Vec<u8>, BackupError> {
    if passphrase.chars().count() < MIN_PASSPHRASE {
        return Err(BackupError::PassphraseTooShort);
    }
    let mut salt = [0u8; 16];
    let mut nonce = [0u8; 24];
    getrandom::fill(&mut salt)
        .map_err(|e| BackupError::Failed(format!("no random numbers: {e}")))?;
    getrandom::fill(&mut nonce)
        .map_err(|e| BackupError::Failed(format!("no random numbers: {e}")))?;
    let mut header = Vec::with_capacity(HEADER);
    header.extend_from_slice(MAGIC);
    header.push(FORMAT);
    header.extend_from_slice(&cost.m_kib.to_le_bytes());
    header.extend_from_slice(&cost.t.to_le_bytes());
    header.extend_from_slice(&cost.p.to_le_bytes());
    header.extend_from_slice(&salt);
    header.extend_from_slice(&nonce);
    let k = key(passphrase, &salt, cost)?;
    let plain = Zeroizing::new(
        serde_json::to_vec(contents).map_err(|e| BackupError::Failed(e.to_string()))?,
    );
    let cipher = XChaCha20Poly1305::new_from_slice(k.as_ref())
        .map_err(|e| BackupError::Failed(e.to_string()))?;
    let sealed = cipher
        .encrypt(
            &XNonce::from(nonce),
            AeadPayload {
                msg: &plain,
                aad: &header,
            },
        )
        .map_err(|_| BackupError::Failed("encryption failed".into()))?;
    let mut out = header;
    out.extend_from_slice(&sealed);
    Ok(out)
}

fn u32_at(b: &[u8], at: usize) -> u32 {
    u32::from_le_bytes([b[at], b[at + 1], b[at + 2], b[at + 3]])
}

/// Opens a backup: checks the header, derives the key, decrypts and checks the contents. Nothing is changed anywhere;
/// the caller imports what this returns.
pub fn open(bytes: &[u8], passphrase: &str) -> Result<Contents, BackupError> {
    if bytes.len() as u64 > MAX_FILE {
        return Err(BackupError::TooLarge);
    }
    if bytes.len() < 8 || &bytes[..8] != MAGIC {
        return Err(BackupError::NotABackup);
    }
    if bytes.len() < HEADER + 16 {
        return Err(BackupError::WrongPassphraseOrDamaged);
    }
    if bytes[8] != FORMAT {
        return Err(if bytes[8] > FORMAT {
            BackupError::Newer(bytes[8])
        } else {
            BackupError::NotABackup
        });
    }
    let cost = Cost {
        m_kib: u32_at(bytes, 9),
        t: u32_at(bytes, 13),
        p: u32_at(bytes, 17),
    };
    if cost.m_kib > MAX_M_KIB || cost.t == 0 || cost.t > MAX_T || cost.p == 0 || cost.p > MAX_P {
        return Err(BackupError::Unreasonable);
    }
    let salt = &bytes[21..37];
    let mut nonce = [0u8; 24];
    nonce.copy_from_slice(&bytes[37..61]);
    let (header, sealed) = bytes.split_at(HEADER);
    let k = key(passphrase, salt, cost)?;
    let cipher = XChaCha20Poly1305::new_from_slice(k.as_ref())
        .map_err(|e| BackupError::Failed(e.to_string()))?;
    let plain = Zeroizing::new(
        cipher
            .decrypt(
                &XNonce::from(nonce),
                AeadPayload {
                    msg: sealed,
                    aad: header,
                },
            )
            .map_err(|_| BackupError::WrongPassphraseOrDamaged)?,
    );
    let c: Contents =
        serde_json::from_slice(&plain).map_err(|e| BackupError::BadContents(e.to_string()))?;
    if c.kind != "ferrum-backup" || c.version != 1 {
        return Err(BackupError::BadContents(format!(
            "{} version {}",
            c.kind, c.version
        )));
    }
    Ok(c)
}

#[cfg(test)]
mod tests {
    use super::*;

    const FAST: Cost = Cost {
        m_kib: 64,
        t: 1,
        p: 1,
    };
    const PASS: &str = "correct horse battery";

    fn sample() -> Contents {
        Contents::new(
            7,
            vec![BookmarkRecord {
                url: "https://example.org/".into(),
                title: "Example".into(),
                folder: "Work".into(),
                position: 0,
                created_at: 1,
            }],
            vec![Entry {
                url: "https://example.org/a".into(),
                title: "A".into(),
                visited_at: 5,
            }],
        )
    }

    #[test]
    fn round_trip() {
        let sealed = seal_with(&sample(), PASS, FAST).unwrap();
        assert_eq!(&sealed[..8], MAGIC);
        assert_eq!(open(&sealed, PASS).unwrap(), sample());
        // Nothing of the contents is readable in the file.
        assert!(!String::from_utf8_lossy(&sealed).contains("example.org"));
    }

    #[test]
    fn two_backups_of_the_same_contents_differ() {
        assert_ne!(
            seal_with(&sample(), PASS, FAST).unwrap(),
            seal_with(&sample(), PASS, FAST).unwrap()
        );
    }

    #[test]
    fn short_passphrase_is_refused() {
        assert_eq!(
            seal_with(&sample(), "short", FAST),
            Err(BackupError::PassphraseTooShort)
        );
    }

    #[test]
    fn wrong_passphrase_changed_byte_and_cut_file_are_refused() {
        let sealed = seal_with(&sample(), PASS, FAST).unwrap();
        assert_eq!(
            open(&sealed, "correct horse batterY"),
            Err(BackupError::WrongPassphraseOrDamaged)
        );
        // Any byte after the magic and format: header (cost, salt, nonce) or ciphertext.
        for i in [21, 40, 61, sealed.len() / 2, sealed.len() - 1] {
            let mut bad = sealed.clone();
            bad[i] ^= 0x01;
            assert_eq!(
                open(&bad, PASS),
                Err(BackupError::WrongPassphraseOrDamaged),
                "byte {i}"
            );
        }
        assert_eq!(
            open(&sealed[..sealed.len() - 10], PASS),
            Err(BackupError::WrongPassphraseOrDamaged)
        );
        assert_eq!(
            open(&sealed[..30], PASS),
            Err(BackupError::WrongPassphraseOrDamaged)
        );
    }

    #[test]
    fn not_a_backup_newer_and_unreasonable_files_are_refused() {
        assert_eq!(
            open(b"PK\x03\x04 a zip file", PASS),
            Err(BackupError::NotABackup)
        );
        let mut sealed = seal_with(&sample(), PASS, FAST).unwrap();
        sealed[8] = 2;
        assert_eq!(open(&sealed, PASS), Err(BackupError::Newer(2)));
        let mut sealed = seal_with(&sample(), PASS, FAST).unwrap();
        sealed[9..13].copy_from_slice(&u32::MAX.to_le_bytes());
        assert_eq!(open(&sealed, PASS), Err(BackupError::Unreasonable));
        let big = vec![0u8; (MAX_FILE + 1) as usize];
        assert_eq!(open(&big, PASS), Err(BackupError::TooLarge));
    }

    #[test]
    fn ferrum_cost_is_the_documented_one() {
        assert_eq!(
            COST,
            Cost {
                m_kib: 65536,
                t: 3,
                p: 1
            }
        );
        let sealed = seal(&sample(), PASS).unwrap();
        assert_eq!(u32_at(&sealed, 9), 65536);
        assert_eq!(open(&sealed, PASS).unwrap(), sample());
    }
}
