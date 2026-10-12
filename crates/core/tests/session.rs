//! Session file tests (P3 task p3.5).

use std::path::PathBuf;

use ferrum_core::session::{self, Session, SessionError, SessionTab};

fn dir() -> PathBuf {
    let d = PathBuf::from(env!("CARGO_TARGET_TMPDIR"))
        .join(format!("core-session-{}", std::process::id()));
    std::fs::create_dir_all(&d).unwrap();
    d
}

fn tab(url: &str) -> SessionTab {
    SessionTab {
        url: url.into(),
        title: format!("Title of {url}"),
        profile: "ferrum-default".into(),
    }
}

#[test]
fn save_then_load_round_trips() {
    let p = dir().join("round.json");
    let s = Session::now(
        vec![tab("https://a.example/"), tab("https://b.example/x")],
        Some(1),
    );
    session::save(&p, &s).unwrap();
    assert_eq!(session::load(&p).unwrap(), Some(s));
}

#[test]
fn missing_file_is_no_session() {
    assert_eq!(session::load(&dir().join("none.json")).unwrap(), None);
}

#[test]
fn newer_or_broken_files_are_refused() {
    let p = dir().join("newer.json");
    std::fs::write(
        &p,
        r#"{"version": 7, "saved_at": 0, "active": null, "tabs": []}"#,
    )
    .unwrap();
    assert!(matches!(
        session::load(&p),
        Err(SessionError::NewerVersion(7))
    ));
    let p = dir().join("broken.json");
    std::fs::write(&p, r#"{"version": 1, "tabs": [{"url": "#).unwrap();
    assert!(matches!(session::load(&p), Err(SessionError::Invalid(_))));
    let p = dir().join("noversion.json");
    std::fs::write(&p, r#"{"tabs": []}"#).unwrap();
    assert!(matches!(session::load(&p), Err(SessionError::Invalid(_))));
}

#[test]
fn an_active_index_outside_the_list_is_dropped() {
    let s = Session::now(vec![tab("https://a.example/")], Some(5));
    assert_eq!(s.active, None);
    let p = dir().join("active.json");
    std::fs::write(
        &p,
        r#"{"version": 1, "saved_at": 1, "active": 3, "tabs": [{"url": "https://a.example/"}]}"#,
    )
    .unwrap();
    assert_eq!(session::load(&p).unwrap().unwrap().active, None);
}

#[test]
fn saving_never_leaves_half_a_file() {
    // Overwrite many times: every read sees a complete session (the old one or the new one).
    let p = dir().join("atomic.json");
    for i in 0..50 {
        let tabs = (0..=i)
            .map(|n| tab(&format!("https://example.org/{n}")))
            .collect();
        session::save(&p, &Session::now(tabs, Some(0))).unwrap();
        let back = session::load(&p).unwrap().unwrap();
        assert_eq!(back.tabs.len(), i + 1);
    }
    let leftovers = std::fs::read_dir(p.parent().unwrap())
        .unwrap()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name()
                .to_string_lossy()
                .starts_with("atomic.json.tmp")
        })
        .count();
    assert_eq!(leftovers, 0);
}
