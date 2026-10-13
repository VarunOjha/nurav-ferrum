---
id: comp-core
type: component
title: "Core crate (shared types, config schema, traits)"
status: implemented
last_verified_commit: ebc79ca
updated: 2026-10-13
sources:
  - raw/00-master-prompt.md
  - raw/research/tauri-webview2-capabilities.md
related: [ov-arch-crate-graph, ov-arch-configuration, comp-app-shell, comp-webview-manager, comp-security-engine, comp-resource-manager, comp-telemetry, comp-network-logger, comp-benchmark-harness, adr-0018, phase-p1-foundation]
approvable: true
path: crates/core/
crate: ferrum-core
trust_level: trusted
phase_introduced: phase-p1-foundation
shipped: true
unsafe_code: false
responsibilities:
  - "Shared identifiers: TabId, SiteKey, ProfileName, RunId"
  - "Configuration schema structs with defaults, validation and canonical hashing (config_sha256)"
  - "Event and record types: NavTiming, NetRecord, LifecycleTransition, ProcessSample, DeniedAction"
  - "Traits for dependency inversion: LifecycleActuator, Clock"
  - "Common error types"
interfaces:
  - "config::Config, config::load(user: Option<&Path>, override_file: Option<&Path>) -> Result<Loaded, ConfigError>, config::hash(&Config) -> String"
  - "types::*, events::*, traits::{LifecycleActuator, Clock}"
connects: []
---

# comp-core

The leaf crate. `#![forbid(unsafe_code)]`. It depends on serde (and similar) only: **no Tauri, no `windows`, no Ferrum crate**. Every other Rust crate depends on it ([crate graph](../ov-arch-crate-graph.md)). It is introduced in phase-p1-foundation as part of the workspace scaffold, so later phases share one set of types from day one.

It has no outgoing `connects` edges because it calls nothing. Every other Rust component points to it.

## Implementation status (P2, first working app)

Built in P2 (evidence in [the P2 evidence folder](../../raw/evidence/phase-p2-minimal-container/)):

- `config`: the settings schema (`[session]`, `[security]`, `[storage]`), `load` (user file, then `--config`),
  `validate`, `parse`, canonical form and `hash` (`sha256:`), warnings; unknown keys are refused.
- `address`: `normalize` turns address-bar input into navigate, confirm (links to other apps) or refuse; `site` keeps
  only the scheme and host of an address for the log.
- `oauth`: `classify` recognises the start of a Google sign-in (endpoint recorded in
  [google-oauth-endpoint](../../raw/research/google-oauth-endpoint.md)); a test-only pattern only when the app passes
  one (debug builds).

Unit tests: `crates/core/tests/{config,address,oauth}.rs` in P2; P3 adds `{tabs,shortcuts,session,profiles,history}.rs`.

## Implementation status (P3, tabs and sessions)

- `tabs` (p3.1): `Tabs<T>`, the tab model without any window: `TabId` (counts up, never reused), `open` at the end or
  after the active tab, `close` (the active tab's right-hand neighbour takes over, else the left one), `activate`,
  `move_to`, `activate_next`/`activate_previous` (wrap around), a closed-tab stack of at most 25 with `reopen_closed`,
  and `check` for the rules. Tested with fixed cases and 200 random sequences of 500 operations
  ([check-p3.1](../../raw/evidence/phase-p3-tabs-sessions/check-p3.1.txt)).
- `shortcuts` (p3.3): the shortcut table (`for_key`, `Shortcut`, `repeats`, `name`), with unit tests. p3.19 adds
  `BookmarkPage` (Ctrl+D), `ToggleBookmarksBar` (Ctrl+Shift+B) and `ShowBookmarks` (Ctrl+Shift+O).
- `config` (p3.19): `[appearance] bookmarks_bar` (default true; `Appearance`), round-trip tested. p3.22 (adr-0033) adds
  `theme` (`graphite`, the only one), `accent` (`orange` default, `blue`, `green`, `violet`) and `density` (`roomy`
  default, `compact`); unknown names are refused.
- `session` and `fsutil` (p3.5): `session.json` (`Session`: version 1, save time, active index, tabs with address,
  title and profile), `save` (atomic) and `load` (none when missing; newer or unreadable files refused);
  `fsutil::write_atomic` and `fsutil::backup_broken` are shared with the settings file
  ([check-p3.5](../../raw/evidence/phase-p3-tabs-sessions/check-p3.5.txt)). `[session] restore_on_startup` is on by
  default from settings version 2 (a version-1 file keeps it off, as P2 never restored).
- `profiles` (p3.6): `site_key` (registrable domain via the `psl` crate 2.1.241; a suffix-only host and IP addresses
  are their own site), `profile_for_site` (`site-<site>` or `site-h-<hash>` within WebView2's name rules),
  `profile_for_url` (per-site, a `[[sites]]` named profile `user-<label>`, or the shared `ferrum-default`).
  `config` gains `[isolation] mode` (`per-site` default in version 2; a version-1 file keeps `shared`) and `[[sites]]`
  (`site`, optional `profile`), validated (the site must be its own registrable domain, listed once; labels 1 to 40
  of `a-z 0-9 - _`).
- `history` (p3.7): `History` (newest first; a visit to the newest entry's address updates it; at most 1000), `visit`,
  `set_title`, `search` (address or title, any case), `clear`; `save` (atomic) and `load` of `history.json`
  ([check-p3.7](../../raw/evidence/phase-p3-tabs-sessions/check-p3.7.txt)).
- `store` (p3.18, adr-0032): history and bookmarks in one SQLite file (`rusqlite` 0.40.2 with its bundled SQLite,
  MIT; FTS5 confirmed compiled in by a unit test). Tables `history` and `bookmarks`, each with an FTS5 word index
  (external content, kept by triggers); `user_version` 1, a newer file is refused (`StoreError::Newer`), a damaged one
  is an error. History: `visit` (newest-entry dedup, at most 50 000, oldest dropped), `set_title`, `history` (words of
  title and address as quoted prefixes, all required; newest first), `clear_history` (rows and index, then `VACUUM`;
  `secure_delete` is on), `import_history` (an old `history.json`). Bookmarks: `add_bookmark` (folder default
  "Favourites bar"), `bookmark`, `bookmark_for`, `bookmarks`, `search_bookmarks`, `update_bookmark`, `move_bookmark`,
  `remove_bookmark`; `check_url` keeps only `http`/`https` (no `javascript:`, `file:`, `data:`), titles cut to 500
  characters without control characters. The `history` module stays as the `history.json` reader for the one-time
  import. 12 unit tests ([check-p3.18](../../raw/evidence/phase-p3-tabs-sessions/check-p3.18.txt)). p3.20 adds
  `suggest_history` (each page once, newest visit first) and `remove_history_url` (every visit to one address)
  ([check-p3.20](../../raw/evidence/phase-p3-tabs-sessions/check-p3.20.txt)).
- `backup` (p3.21, adr-0032): the backup file. Header `FERRUMBK`, format 1, Argon2id cost (Ferrum writes 64 MiB, 3
  passes, 1 lane; a file asking for more than 512 MiB, 10 passes or 8 lanes is refused), 16-byte salt, 24-byte nonce;
  then XChaCha20-Poly1305 over the JSON contents (bookmarks, history) with the header as associated data. Crates
  `argon2` 0.6.0 and `chacha20poly1305` 0.11.0 (RustCrypto, MIT OR Apache-2.0; `getrandom` 0.4.3, `zeroize` 1.9.1),
  chosen over the `age` format to build on the two primitives directly (adr-0032 allowed either). Passphrase at least 12 characters;
  key and plaintext wiped after use; files over 100 MB refused. `seal`, `open`. Store gains `export`, `import` (merge
  skips what is there; replace empties first; one transaction; non-web addresses dropped) and `copy_to`
  (`VACUUM INTO`, never over an existing file). 8 unit tests ([check-p3.21](../../raw/evidence/phase-p3-tabs-sessions/check-p3.21.20261012-1618.txt)).
- P3 self-scan fixes (2026-10-13): both word indexes use FTS5's own `secure-delete`, so removing one entry or bookmark
  (Shift+Delete, the history limit, an import that replaces) also removes its words from the file, not only Clear
  history; `check_url` refuses an address with spaces at the ends or hidden characters (the stored text is the text
  checked); times from an old `history.json` or a backup are capped instead of wrapping to negative values; `seal`
  refuses to write a backup over 100 MB (one `open` would refuse); `argon2` and `chacha20poly1305` are built with
  their `zeroize` features, so their own copies of the key material are wiped too. Two more unit tests.
- `config` (p4.4): `[security] external_allowlist` (link types to other apps that may be offered; empty = any type,
  owner answer Q-224; the app checks the names when settings are loaded or saved).
- `config` (p4.3): settings version 3. `[security]` gains `blocklist`, `allowlist` (lists of site rules, empty by
  default, owner answer Q-113; the rule syntax is checked by the security engine when settings are loaded or saved)
  and `allowlist_only` (false). The `http_policy` default becomes `warn` (owner answer Q-112); `migrate_v2` keeps
  `upgrade` for a version-2 file that did not choose, as `migrate_v1` did for the version-1 defaults. Two more tests
  (`site_lists_are_read_and_saved`, the migration test extended).
- `config` (p3.8): `[downloads] folder` (none = the Windows Downloads folder).
- `config` (p3.2): `[security] new_window` gains `"new-tab"`, now the default (`same-view` was the P2 default).
- `config` (p3.4): the file carries `version` (`VERSION` = 2). A file without it is version 1 (P2) and is migrated
  when read (`migrate_v1`: a version-1 file that did not choose `new_window` keeps `same-view`, its P2 behaviour).
  A newer version is refused (`NewerVersion`, a clear message) and never written. `save` writes atomically (a
  temporary file next to it, then one rename); `backup_broken` copies an unreadable file aside as
  `<name>.broken-<seconds>` ([check-p3.4](../../raw/evidence/phase-p3-tabs-sessions/check-p3.4.txt)). Not yet built: shared ids, event and record types, and the
`LifecycleActuator` and `Clock` traits (later phases).
