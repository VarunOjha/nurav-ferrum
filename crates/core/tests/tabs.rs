//! Tab model tests (P3 task p3.1): fixed cases for each rule, then random operation sequences that check every rule
//! after every step. The random generator is a small xorshift with fixed seeds, so a failure always repeats.

use std::collections::HashSet;

use ferrum_core::tabs::{CLOSED_LIMIT, Place, TabId, Tabs};

fn three() -> (Tabs<&'static str>, TabId, TabId, TabId) {
    let mut t = Tabs::new();
    let a = t.open("a", Place::End, true);
    let b = t.open("b", Place::End, false);
    let c = t.open("c", Place::End, false);
    (t, a, b, c)
}

#[test]
fn first_tab_is_active_and_ids_count_up() {
    let mut t = Tabs::new();
    assert_eq!(t.active(), None);
    let a = t.open("a", Place::End, false);
    assert_eq!(
        t.active(),
        Some(a),
        "the only tab is active even when not asked"
    );
    let b = t.open("b", Place::End, false);
    assert_eq!(t.active(), Some(a));
    assert!(b.0 > a.0);
    t.check().unwrap();
}

#[test]
fn closing_the_active_tab_activates_a_neighbour() {
    let (mut t, a, b, c) = three();
    t.activate(b);
    assert_eq!(t.close(b).unwrap().active, Some(c), "right-hand neighbour");
    assert_eq!(
        t.close(c).unwrap().active,
        Some(a),
        "left one when the closed tab was last"
    );
    assert_eq!(t.close(a).unwrap().active, None, "no tab left");
    assert!(t.is_empty());
    t.check().unwrap();
}

#[test]
fn closing_another_tab_keeps_the_active_one() {
    let (mut t, a, b, _c) = three();
    assert_eq!(t.close(b).unwrap().active, Some(a));
    t.check().unwrap();
}

#[test]
fn ids_are_never_reused_even_after_reopen() {
    let (mut t, a, b, c) = three();
    t.close(b);
    let r = t.reopen_closed().unwrap();
    assert!(![a, b, c].contains(&r));
    assert_eq!(t.index_of(r), Some(1), "reopened at its old place");
    assert_eq!(t.active(), Some(r));
    assert_eq!(t.get(r), Some(&"b"));
    let d = t.open("d", Place::End, false);
    assert!(d.0 > r.0);
    t.check().unwrap();
}

#[test]
fn new_tab_after_active() {
    let (mut t, a, b, _c) = three();
    t.activate(a);
    let n = t.open("n", Place::AfterActive, false);
    assert_eq!(t.ids()[1], n);
    assert_eq!(t.ids()[2], b);
}

#[test]
fn next_and_previous_wrap_around() {
    let (mut t, a, _b, c) = three();
    assert_eq!(t.activate_previous(), Some(c));
    assert_eq!(t.activate_next(), Some(a));
    let mut empty: Tabs<()> = Tabs::new();
    assert_eq!(empty.activate_next(), None);
}

#[test]
fn move_keeps_the_active_tab_and_clamps() {
    let (mut t, a, b, c) = three();
    assert!(t.move_to(a, 99));
    assert_eq!(t.ids(), vec![b, c, a]);
    assert_eq!(t.active(), Some(a));
    assert!(!t.move_to(TabId(999), 0));
}

#[test]
fn unknown_ids_change_nothing() {
    let (mut t, a, ..) = three();
    assert!(!t.activate(TabId(999)));
    assert!(t.close(TabId(999)).is_none());
    assert_eq!(t.active(), Some(a));
    assert_eq!(t.len(), 3);
}

#[test]
fn closed_stack_is_bounded() {
    let mut t = Tabs::new();
    for i in 0..(CLOSED_LIMIT + 10) {
        let id = t.open(i, Place::End, true);
        t.close(id);
    }
    assert_eq!(t.closed_len(), CLOSED_LIMIT);
    assert_eq!(
        t.reopen_closed().map(|id| *t.get(id).unwrap()),
        Some(CLOSED_LIMIT + 9)
    );
}

/// xorshift64*: deterministic, good enough to pick operations.
struct Rng(u64);
impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 >> 12;
        self.0 ^= self.0 << 25;
        self.0 ^= self.0 >> 27;
        self.0.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }
    fn below(&mut self, n: usize) -> usize {
        (self.next() % n as u64) as usize
    }
}

#[test]
fn random_operation_sequences_keep_every_rule() {
    for seed in 1..=200u64 {
        let mut rng = Rng(seed.wrapping_mul(0x9E37_79B9_7F4A_7C15) | 1);
        let mut t: Tabs<u64> = Tabs::new();
        let mut handed_out: HashSet<TabId> = HashSet::new();
        let mut highest = 0u64;
        for step in 0..500 {
            let ids = t.ids();
            let pick = |rng: &mut Rng| -> TabId {
                if ids.is_empty() || rng.below(10) == 0 {
                    TabId(rng.next() % 1000) // sometimes an unknown id
                } else {
                    ids[rng.below(ids.len())]
                }
            };
            let before_active = t.active();
            let op = rng.below(8);
            let mut new_id = None;
            match op {
                0 | 1 => {
                    let place = if rng.below(2) == 0 {
                        Place::End
                    } else {
                        Place::AfterActive
                    };
                    new_id = Some(t.open(step, place, rng.below(2) == 0));
                }
                2 => {
                    let id = pick(&mut rng);
                    let was_active = before_active == Some(id);
                    let idx = t.index_of(id);
                    if let Some(r) = t.close(id) {
                        if was_active && !t.is_empty() {
                            // The neighbour now sits at the closed tab's index (or the last position).
                            let want = t.id_at(idx.unwrap().min(t.len() - 1));
                            assert_eq!(r.active, want, "seed {seed} step {step}: neighbour rule");
                        }
                        if !was_active {
                            assert_eq!(
                                r.active, before_active,
                                "seed {seed} step {step}: active kept"
                            );
                        }
                    }
                }
                3 => {
                    let id = pick(&mut rng);
                    let ok = t.activate(id);
                    assert_eq!(ok, ids.contains(&id));
                }
                4 => {
                    let id = pick(&mut rng);
                    t.move_to(id, rng.below(ids.len() + 2));
                    assert_eq!(
                        t.active(),
                        before_active,
                        "seed {seed} step {step}: move kept the active tab"
                    );
                }
                5 => {
                    t.activate_next();
                }
                6 => {
                    t.activate_previous();
                }
                _ => {
                    new_id = t.reopen_closed();
                }
            }
            if let Some(id) = new_id {
                assert!(
                    handed_out.insert(id),
                    "seed {seed} step {step}: id {id} handed out twice"
                );
                assert!(id.0 > highest, "seed {seed} step {step}: ids count up");
                highest = id.0;
            }
            if let Err(e) = t.check() {
                panic!("seed {seed} step {step} op {op}: {e}");
            }
            assert_eq!(t.len(), t.ids().len());
        }
    }
}
