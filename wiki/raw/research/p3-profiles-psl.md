---
id: research-p3-profiles-psl
type: research-note
title: "P3 sources for per-site profiles: the psl crate (Public Suffix List) and WebView2's ProfileName rules"
updated: 2026-10-12
sources:
  - https://crates.io/api/v1/crates/psl (accessed 2026-10-12)
  - https://crates.io/api/v1/crates/psl/versions?per_page=5 (accessed 2026-10-12)
  - cargo info psl, cargo info publicsuffix (crates.io index, 2026-10-12)
  - https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2controlleroptions (accessed 2026-10-12; page updated 2026-10-12, default view webview2-1.0.4258.31)
---

# P3 sources for per-site profiles (task p3.6)

> Raw research note. Written by Claude in session s02 on 2026-10-12. **VERIFIED** = read in that source on that day.
> A crate registry or documentation page can change later.

## R1. A maintained Rust crate for the Public Suffix List

- **VERIFIED** (crates.io API, 2026-10-12): crate `psl`, newest stable version 2.1.241, published 2026-10-08; first
  published 2017-01-06; about 35.6 million downloads. The five newest versions (2.1.237 to 2.1.241) were published on
  2026-09-24, 2026-09-25, 2026-10-03, 2026-10-07 and 2026-10-08, each with licence `MIT/Apache-2.0`.
- **VERIFIED** (`cargo info psl`): description "Extract root domain and suffix from a domain name", repository
  github.com/addr-rs/psl, default feature `helpers` (the `domain_str` and `suffix_str` functions).
- **VERIFIED** (`cargo info publicsuffix`): an alternative, `publicsuffix` 2.3.0 (MIT/Apache-2.0,
  github.com/rushmorem/publicsuffix), which parses a list at run time. Not chosen: Ferrum would have to ship or fetch the
  list itself.
- Read in the crate source (registry copy of psl 2.1.241, `src/lib.rs`): `domain_str(name)` returns the registrable
  domain and `suffix_str(name)` the public suffix; the list is compiled into the crate.
- Observed in Ferrum's unit tests (crates/core/tests/profiles.rs, 2026-10-12): `www.bbc.co.uk` gives `bbc.co.uk`,
  `user.github.io` gives `user.github.io` (github.io is on the list), `one.site-a.localhost` gives `site-a.localhost`,
  and `localhost` alone gives no registrable domain (Ferrum then uses the host itself).
- Consequence: the release frequency means the list in a given Ferrum build is as old as its `psl` version; updating
  the pinned version updates the list (a dependency bump, reviewed with `cargo deny`).

## R2. WebView2 profile names

- **VERIFIED** (Microsoft Learn, ICoreWebView2ControllerOptions, `get_ProfileName`): the profile name "is only allowed
  to contain the following ASCII characters. It has a maximum length of 64 characters excluding the null-terminator. It
  is ASCII case insensitive." Allowed: a-z, A-Z, 0-9, and `#`, `@`, `$`, `(`, `)`, `+`, `-`, `_`, `~`, `.`, space.
  "the text must not end with a period '.' or ' ' (space)". Upper-case letters are treated as lower-case because "the
  profile name will be mapped to the real profile directory path on disk".
- **VERIFIED** (same page, sample code): an invalid profile name makes `CreateCoreWebView2ControllerOptions` /
  setting the property fail with `E_INVALIDARG` ("The validation of parameters occurs when setting the properties").
- Observed on disk in P2 and P3: the profile `ferrum-default` is stored as `EBWebView\WV2Profile_ferrum-default`; the
  p3.6 smoke test found `EBWebView\WV2Profile_user-work` for a named profile.
