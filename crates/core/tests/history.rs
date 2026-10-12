//! History tests (P3 task p3.7).

use std::path::PathBuf;

use ferrum_core::history::{self, History, LIMIT};

fn dir() -> PathBuf {
    let d = PathBuf::from(env!("CARGO_TARGET_TMPDIR"))
        .join(format!("core-history-{}", std::process::id()));
    std::fs::create_dir_all(&d).unwrap();
    d
}

#[test]
fn visits_are_newest_first_and_repeats_merge() {
    let mut h = History::default();
    h.visit("https://a.example/", 1);
    h.visit("https://b.example/", 2);
    h.visit("https://b.example/", 3); // reload: no duplicate, newer time
    h.visit("https://a.example/", 4); // a later visit to an older page is a new entry
    let urls: Vec<_> = h
        .entries
        .iter()
        .map(|e| (e.url.as_str(), e.visited_at))
        .collect();
    assert_eq!(
        urls,
        vec![
            ("https://a.example/", 4),
            ("https://b.example/", 3),
            ("https://a.example/", 1)
        ]
    );
}

#[test]
fn titles_attach_to_the_newest_entry() {
    let mut h = History::default();
    h.visit("https://a.example/", 1);
    h.visit("https://b.example/", 2);
    h.visit("https://a.example/", 3);
    assert!(h.set_title("https://a.example/", "A"));
    assert!(!h.set_title("https://a.example/", "A"), "no change");
    assert_eq!(h.entries[0].title, "A");
    assert_eq!(h.entries[2].title, "");
    assert!(!h.set_title("https://unknown.example/", "x"));
}

#[test]
fn search_matches_address_or_title_any_case() {
    let mut h = History::default();
    h.visit("https://news.example/", 1);
    h.set_title("https://news.example/", "Morning NEWS");
    h.visit("https://shop.example/cart", 2);
    assert_eq!(h.search("news", 10).len(), 1);
    assert_eq!(h.search("CART", 10)[0].url, "https://shop.example/cart");
    assert_eq!(h.search("", 10).len(), 2);
    assert_eq!(h.search("", 1).len(), 1);
    assert!(h.search("nothing", 10).is_empty());
}

#[test]
fn the_history_is_bounded() {
    let mut h = History::default();
    for i in 0..(LIMIT + 50) {
        h.visit(&format!("https://example.org/{i}"), i as u64);
    }
    assert_eq!(h.entries.len(), LIMIT);
    assert_eq!(
        h.entries[0].url,
        format!("https://example.org/{}", LIMIT + 49)
    );
}

#[test]
fn save_load_and_clear() {
    let p = dir().join("history.json");
    let mut h = History::default();
    h.visit("https://a.example/", 1);
    h.set_title("https://a.example/", "A");
    history::save(&p, &h).unwrap();
    let back = history::load(&p).unwrap();
    assert_eq!(back.entries, h.entries);
    h.clear();
    history::save(&p, &h).unwrap();
    assert!(history::load(&p).unwrap().entries.is_empty());
    assert!(!std::fs::read_to_string(&p).unwrap().contains("a.example"));
    assert!(
        history::load(&dir().join("none.json"))
            .unwrap()
            .entries
            .is_empty()
    );
    std::fs::write(dir().join("newer.json"), r#"{"version": 9, "entries": []}"#).unwrap();
    assert!(history::load(&dir().join("newer.json")).is_err());
}
