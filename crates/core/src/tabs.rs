//! The tab model (P3 task p3.1): which tabs exist, in what order, and which one is active. Pure Rust, no window and
//! no WebView2, so its rules are tested on their own (`crates/core/tests/tabs.rs`, including random operation
//! sequences). The app keeps one `Tabs<T>` and creates, shows and closes web views to match it.
//!
//! Rules (checked after every operation by the tests):
//! - exactly one active tab whenever at least one tab exists, none when there are none;
//! - every id appears once in the order, and an id is never handed out again, not even after its tab closed;
//! - closing the active tab activates its right-hand neighbour, or the left one when it was the last.

use std::fmt;

/// A tab's id. Ids count up from 1 and are never reused within one `Tabs` (a reopened tab gets a new id).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct TabId(pub u64);

impl fmt::Display for TabId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Where a new tab goes in the order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Place {
    /// After the last tab (new tab from the strip or a shortcut).
    End,
    /// Right after the active tab (a link opened in a new tab), or at the end when no tab is active.
    AfterActive,
}

/// A closed tab kept for "reopen closed tab": its data and where it was.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Closed<T> {
    /// The tab's data when it closed.
    pub data: T,
    /// Its position when it closed.
    pub index: usize,
}

/// What `close` did.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CloseResult<T> {
    /// The closed tab's data.
    pub data: T,
    /// The tab that is active now (`None` when no tab is left).
    pub active: Option<TabId>,
}

/// How many closed tabs are remembered for reopening.
pub const CLOSED_LIMIT: usize = 25;

/// The open tabs, their order and the active one. `T` is the app's data per tab (address, title, profile, ...).
#[derive(Debug, Clone)]
pub struct Tabs<T> {
    order: Vec<(TabId, T)>,
    active: Option<TabId>,
    next: u64,
    closed: Vec<Closed<T>>,
}

impl<T> Default for Tabs<T> {
    fn default() -> Self {
        Self::new()
    }
}

impl<T> Tabs<T> {
    /// No tabs.
    pub fn new() -> Self {
        Tabs {
            order: Vec::new(),
            active: None,
            next: 1,
            closed: Vec::new(),
        }
    }

    /// Number of open tabs.
    pub fn len(&self) -> usize {
        self.order.len()
    }

    /// True when no tab is open.
    pub fn is_empty(&self) -> bool {
        self.order.is_empty()
    }

    /// The active tab.
    pub fn active(&self) -> Option<TabId> {
        self.active
    }

    /// The tab ids in strip order.
    pub fn ids(&self) -> Vec<TabId> {
        self.order.iter().map(|(id, _)| *id).collect()
    }

    /// Tabs in strip order with their data.
    pub fn iter(&self) -> impl Iterator<Item = (TabId, &T)> {
        self.order.iter().map(|(id, d)| (*id, d))
    }

    /// Position of `id` in the strip.
    pub fn index_of(&self, id: TabId) -> Option<usize> {
        self.order.iter().position(|(i, _)| *i == id)
    }

    /// The tab at `index` in the strip.
    pub fn id_at(&self, index: usize) -> Option<TabId> {
        self.order.get(index).map(|(id, _)| *id)
    }

    /// The data of tab `id`.
    pub fn get(&self, id: TabId) -> Option<&T> {
        self.order.iter().find(|(i, _)| *i == id).map(|(_, d)| d)
    }

    /// The data of tab `id`, to change it.
    pub fn get_mut(&mut self, id: TabId) -> Option<&mut T> {
        self.order
            .iter_mut()
            .find(|(i, _)| *i == id)
            .map(|(_, d)| d)
    }

    /// Opens a tab with `data` at `place`; it becomes active if `activate` is true or if it is the only tab.
    pub fn open(&mut self, data: T, place: Place, activate: bool) -> TabId {
        let id = TabId(self.next);
        self.next += 1;
        let index = match (place, self.active.and_then(|a| self.index_of(a))) {
            (Place::AfterActive, Some(i)) => i + 1,
            _ => self.order.len(),
        };
        self.order.insert(index, (id, data));
        if activate || self.active.is_none() {
            self.active = Some(id);
        }
        id
    }

    /// Makes `id` the active tab. False when there is no such tab.
    pub fn activate(&mut self, id: TabId) -> bool {
        if self.index_of(id).is_some() {
            self.active = Some(id);
            true
        } else {
            false
        }
    }

    /// Closes `id`. If it was active, its right-hand neighbour becomes active (the left one if it was last).
    /// The tab is remembered for `reopen_closed` (at most [`CLOSED_LIMIT`]).
    pub fn close(&mut self, id: TabId) -> Option<CloseResult<T>>
    where
        T: Clone,
    {
        let index = self.index_of(id)?;
        let (_, data) = self.order.remove(index);
        if self.active == Some(id) {
            self.active = if self.order.is_empty() {
                None
            } else {
                Some(self.order[index.min(self.order.len() - 1)].0)
            };
        }
        self.closed.push(Closed {
            data: data.clone(),
            index,
        });
        if self.closed.len() > CLOSED_LIMIT {
            self.closed.remove(0);
        }
        Some(CloseResult {
            data,
            active: self.active,
        })
    }

    /// Reopens the most recently closed tab at its old position (or the end), with a new id, and activates it.
    pub fn reopen_closed(&mut self) -> Option<TabId> {
        let c = self.closed.pop()?;
        let id = TabId(self.next);
        self.next += 1;
        let index = c.index.min(self.order.len());
        self.order.insert(index, (id, c.data));
        self.active = Some(id);
        Some(id)
    }

    /// Number of closed tabs that can be reopened.
    pub fn closed_len(&self) -> usize {
        self.closed.len()
    }

    /// Moves `id` to position `to` (clamped to the last position). The active tab does not change.
    pub fn move_to(&mut self, id: TabId, to: usize) -> bool {
        let Some(from) = self.index_of(id) else {
            return false;
        };
        let entry = self.order.remove(from);
        let to = to.min(self.order.len());
        self.order.insert(to, entry);
        true
    }

    /// Activates the next tab to the right, wrapping around (Ctrl+Tab).
    pub fn activate_next(&mut self) -> Option<TabId> {
        self.step(1)
    }

    /// Activates the next tab to the left, wrapping around (Ctrl+Shift+Tab).
    pub fn activate_previous(&mut self) -> Option<TabId> {
        self.step(-1)
    }

    fn step(&mut self, by: isize) -> Option<TabId> {
        let n = self.order.len() as isize;
        let i = self.active.and_then(|a| self.index_of(a))? as isize;
        let id = self.order[((i + by).rem_euclid(n)) as usize].0;
        self.active = Some(id);
        Some(id)
    }

    /// Checks the rules listed in the module documentation; `Err` names the broken one (used by the tests).
    pub fn check(&self) -> Result<(), String> {
        let mut seen = std::collections::HashSet::new();
        for (id, _) in &self.order {
            if !seen.insert(*id) {
                return Err(format!("id {id} appears twice"));
            }
            if id.0 >= self.next {
                return Err(format!(
                    "id {id} was not handed out yet (next {})",
                    self.next
                ));
            }
        }
        match (self.order.is_empty(), self.active) {
            (true, None) => Ok(()),
            (true, Some(a)) => Err(format!("active tab {a} but no tabs")),
            (false, None) => Err("tabs but no active tab".into()),
            (false, Some(a)) if !seen.contains(&a) => Err(format!("active tab {a} is not open")),
            _ => Ok(()),
        }
    }
}
