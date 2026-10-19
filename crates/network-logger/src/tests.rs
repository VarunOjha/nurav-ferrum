//! p5.9 tests: the record has exactly the allowed fields (no header, cookie or body field), its checks, the writer's
//! rotation, and the deletion of old session folders that leaves everything else alone.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};

use super::*;

const NOW: u64 = 1_792_000_000_000; // 2026-10-15T...Z

fn rec(url: &str) -> NetRecord {
    NetRecord {
        ts: rfc3339_ms(NOW),
        t_ms: 1200,
        tab: 3,
        profile: "shared".into(),
        site: "https://localhost:8443".into(),
        url: url.into(),
        method: "GET".into(),
        status: Some(200),
        resource_type: Some(ResourceType::Image),
        content_length: Some(120),
        policy_decision: "allowed".into(),
    }
}

/// A fresh empty folder under the target directory (never outside the repo's build output).
fn temp_dir(name: &str) -> PathBuf {
    static N: AtomicU32 = AtomicU32::new(0);
    let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../target/test-tmp/network-logger")
        .join(format!(
            "{name}-{}-{}",
            std::process::id(),
            N.fetch_add(1, Ordering::Relaxed)
        ));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn a_record_has_exactly_the_allowed_fields_and_no_header_cookie_or_body() {
    let v = serde_json::to_value(rec("https://localhost:8443/a.png?x=1")).unwrap();
    let keys: Vec<&str> = v.as_object().unwrap().keys().map(String::as_str).collect();
    let mut want = FIELDS.to_vec();
    want.sort_unstable();
    assert_eq!(keys, want, "serde_json keeps keys sorted");
    for k in &keys {
        for banned in [
            "header",
            "cookie",
            "body",
            "content",
            "auth",
            "token",
            "payload",
            "post_data",
        ] {
            assert!(
                !k.contains(banned) || *k == "content_length",
                "field {k} looks like it could carry {banned}"
            );
        }
    }
    // a line with an extra field (for example a header) is refused when read back
    let mut line = serde_json::to_value(rec("https://x.test/")).unwrap();
    line["headers"] = serde_json::json!({"cookie": "a=1"});
    assert!(
        parse_line(&line.to_string())
            .unwrap_err()
            .contains("unknown field")
    );
    // the full address is kept (Q-114)
    let r =
        parse_line(&serde_json::to_string(&rec("https://localhost:8443/a.png?token=abc")).unwrap())
            .unwrap();
    assert_eq!(r.url, "https://localhost:8443/a.png?token=abc");
}

#[test]
fn checks_refuse_bad_values() {
    let mut blocked = rec("https://ads.test/");
    blocked.status = None;
    blocked.method = String::new();
    blocked.resource_type = None;
    blocked.content_length = None;
    blocked.policy_decision = "blocked:blocklist".into();
    validate(&blocked).unwrap();
    let cases: Vec<(NetRecord, &str)> = vec![
        (
            NetRecord {
                ts: "2026-10-15 10:00:00".into(),
                ..rec("https://x.test/")
            },
            "ts",
        ),
        (
            NetRecord {
                url: String::new(),
                ..rec("https://x.test/")
            },
            "url is empty",
        ),
        (
            NetRecord {
                policy_decision: "maybe".into(),
                ..rec("https://x.test/")
            },
            "policy_decision",
        ),
        (
            NetRecord {
                policy_decision: "blocked:".into(),
                ..blocked.clone()
            },
            "no rule",
        ),
        (
            NetRecord {
                status: Some(200),
                ..blocked.clone()
            },
            "no response status",
        ),
        (
            NetRecord {
                status: None,
                ..rec("https://x.test/")
            },
            "has a response status",
        ),
        (
            NetRecord {
                status: Some(42),
                ..rec("https://x.test/")
            },
            "not an HTTP status",
        ),
    ];
    for (r, want) in cases {
        let e = validate(&r).unwrap_err();
        assert!(e.contains(want), "{r:?}: {e}");
    }
}

#[test]
fn resource_types_from_fetch_destinations() {
    use ResourceType::*;
    for (dest, want) in [
        ("document", Document),
        ("iframe", Frame),
        ("style", Stylesheet),
        ("script", Script),
        ("image", Image),
        ("font", Font),
        ("video", Media),
        ("empty", Fetch),
        ("serviceworker", Worker),
        ("manifest", Manifest),
        ("report", Other),
    ] {
        assert_eq!(ResourceType::from_fetch_dest(dest), want, "{dest}");
    }
}

#[test]
fn times_and_session_names() {
    assert_eq!(rfc3339_ms(0), "1970-01-01T00:00:00.000Z");
    assert_eq!(rfc3339_ms(1_760_387_401_123), "2025-10-13T20:30:01.123Z");
    let name = session_name(1_760_387_401_123, 4242);
    assert_eq!(name, "20251013-203001-4242");
    assert_eq!(session_start_ms(&name), Some(1_760_387_401_000));
    for bad in [
        "20251013-203001",
        "20251313-203001-1",
        "notes",
        "20251013-203001-x",
        "2025101-203001-1",
    ] {
        assert_eq!(session_start_ms(bad), None, "{bad}");
    }
}

#[test]
fn the_writer_rotates_and_keeps_at_most_max_files() {
    let root = temp_dir("rotate");
    let session = session_name(NOW, 1);
    let one = serde_json::to_string(&rec("https://localhost:8443/a"))
        .unwrap()
        .len() as u64
        + 1;
    // room for two lines per file, three files kept
    let mut log = NetLog::open(&root, &session, 2 * one, 3).unwrap();
    for i in 0..9 {
        log.write(&rec(&format!(
            "https://localhost:8443/{}",
            (b'a' + i) as char
        )))
        .unwrap();
    }
    let mut files: Vec<String> = std::fs::read_dir(log.folder())
        .unwrap()
        .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    files.sort();
    // nine lines, two per file: files 0 to 4; the oldest two deleted
    assert_eq!(
        files,
        [
            "netlog.0002.jsonl",
            "netlog.0003.jsonl",
            "netlog.0004.jsonl"
        ]
    );
    let mut urls = vec![];
    for f in &files {
        for line in std::fs::read_to_string(log.folder().join(f))
            .unwrap()
            .lines()
        {
            urls.push(parse_line(line).unwrap().url);
        }
    }
    let tail: Vec<String> = ["e", "f", "g", "h", "i"]
        .iter()
        .map(|c| format!("https://localhost:8443/{c}"))
        .collect();
    assert_eq!(urls, tail);
    // a bad record is not written
    assert!(
        log.write(&NetRecord {
            url: String::new(),
            ..rec("x")
        })
        .is_err()
    );
    assert!(
        NetLog::open(&root, "../escape", 100, 1).is_err(),
        "only session folder names"
    );
}

#[test]
fn prune_deletes_only_old_session_folders_and_only_log_files() {
    let root = temp_dir("prune");
    let day = 86_400_000;
    let old = session_name(NOW - 20 * day, 7);
    let recent = session_name(NOW - 3 * day, 8);
    let current = session_name(NOW - 30 * day, 9); // old, but the running session
    let with_other = session_name(NOW - 40 * day, 10);
    for s in [&old, &recent, &current, &with_other] {
        let mut l = NetLog::open(&root, s, 1 << 20, 4).unwrap();
        l.write(&rec("https://localhost:8443/")).unwrap();
    }
    std::fs::write(root.join(&with_other).join("notes.txt"), "mine").unwrap();
    std::fs::create_dir_all(root.join("my-folder")).unwrap();
    std::fs::write(root.join("readme.txt"), "x").unwrap();

    let removed = prune(&root, NOW, 14, &current).unwrap();
    assert_eq!(removed, vec![root.join(&old)]);
    assert!(root.join(&recent).join(file_name(0)).exists());
    assert!(root.join(&current).join(file_name(0)).exists());
    // the folder with a file Ferrum did not write keeps that file and stays
    assert!(root.join(&with_other).join("notes.txt").exists());
    assert!(!root.join(&with_other).join(file_name(0)).exists());
    assert!(root.join("my-folder").is_dir() && root.join("readme.txt").exists());
    // retention 0: never delete
    assert!(
        prune(&root, NOW + 400 * day, 0, &current)
            .unwrap()
            .is_empty()
    );
}
