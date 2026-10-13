//! Host rules for the blocklist and the allowlist (adr-0015 rule 2).
//!
//! Rule syntax, one rule per entry:
//! - `example.com` is a **suffix** rule: it matches `example.com` and every subdomain (`a.b.example.com`).
//! - `=www.example.com` is an **exact** rule: it matches that host only.
//! - IP addresses (`192.0.2.1`, `[2001:db8::1]` or `2001:db8::1`) are always exact.
//!
//! Hosts are normalised the way the URL parser normalises them (lower case, international names in their `xn--`
//! form, numeric IPv4 forms such as `2130706433` read as dotted addresses), so a rule matches whatever spelling a page
//! uses. A rule never contains a scheme, port, path, wildcard or user name: such entries are refused, not guessed.

use url::Host;

/// One blocklist or allowlist entry.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HostRule {
    /// Normalised host: an ASCII domain, a dotted IPv4 address or a bracketed IPv6 address.
    host: String,
    /// `true` for a suffix rule (host and subdomains), `false` for an exact rule.
    suffix: bool,
    /// The entry as written, for decision records and the audit log.
    text: String,
}

/// Why a rule entry was refused.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RuleError {
    /// The entry is empty.
    Empty,
    /// The entry is not a plain host name or IP address.
    NotAHost(String),
}

impl std::fmt::Display for RuleError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RuleError::Empty => write!(f, "the rule is empty"),
            RuleError::NotAHost(t) => write!(f, "{t:?} is not a host name or IP address"),
        }
    }
}

impl std::error::Error for RuleError {}

impl HostRule {
    /// Reads one entry (see the module documentation for the syntax).
    pub fn parse(text: &str) -> Result<HostRule, RuleError> {
        let trimmed = text.trim();
        if trimmed.is_empty() {
            return Err(RuleError::Empty);
        }
        let (exact, body) = match trimmed.strip_prefix('=') {
            Some(rest) => (true, rest),
            None => (false, trimmed),
        };
        let not_a_host = || RuleError::NotAHost(trimmed.to_string());
        let forbidden = |c: char| c.is_whitespace() || c.is_control() || "/?#*@\\%".contains(c);
        if body.is_empty() || body.chars().any(forbidden) {
            return Err(not_a_host());
        }
        // A bare IPv6 address (`2001:db8::1`) is accepted without brackets for convenience.
        let bracketed;
        let body = if body.contains(':') && !body.starts_with('[') {
            bracketed = format!("[{body}]");
            bracketed.as_str()
        } else {
            body
        };
        let body = body.strip_suffix('.').unwrap_or(body);
        match Host::parse(body).map_err(|_| not_a_host())? {
            Host::Domain(d) => Ok(HostRule {
                host: d,
                suffix: !exact,
                text: trimmed.to_string(),
            }),
            ip => Ok(HostRule {
                host: ip.to_string(),
                suffix: false,
                text: trimmed.to_string(),
            }),
        }
    }

    /// The entry as written.
    pub fn text(&self) -> &str {
        &self.text
    }

    /// Whether this rule matches a normalised URL host (as [`url::Url::host_str`] gives it, without a trailing dot).
    pub fn matches(&self, host: &str) -> bool {
        host == self.host
            || (self.suffix
                && host.len() > self.host.len()
                && host.ends_with(self.host.as_str())
                && host.as_bytes()[host.len() - self.host.len() - 1] == b'.')
    }

    /// How specific the rule is: more labels is more specific, and an exact rule beats a suffix rule with the same
    /// labels. Used for the allowlist override (adr-0015 rule 2): an allow rule wins only when it is strictly more
    /// specific than the block rule that matched.
    pub fn specificity(&self) -> u32 {
        let labels = self.host.split('.').count() as u32;
        labels * 2 + u32::from(!self.suffix)
    }
}

/// A list of rules, as read from settings.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct RuleList {
    rules: Vec<HostRule>,
}

impl RuleList {
    /// Reads every entry; the first bad entry refuses the whole list (settings are checked before they are saved,
    /// adr-0015 validation), so a typo never silently drops a block rule.
    pub fn parse<S: AsRef<str>>(entries: &[S]) -> Result<RuleList, RuleError> {
        let rules = entries
            .iter()
            .map(|e| HostRule::parse(e.as_ref()))
            .collect::<Result<Vec<_>, _>>()?;
        Ok(RuleList { rules })
    }

    /// The most specific rule matching `host`, if any.
    pub fn best_match(&self, host: &str) -> Option<&HostRule> {
        self.rules
            .iter()
            .filter(|r| r.matches(host))
            .max_by_key(|r| r.specificity())
    }

    /// Number of rules.
    pub fn len(&self) -> usize {
        self.rules.len()
    }

    /// Whether the list has no rules.
    pub fn is_empty(&self) -> bool {
        self.rules.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rule(t: &str) -> HostRule {
        HostRule::parse(t).unwrap()
    }

    #[test]
    fn suffix_rule_matches_host_and_subdomains_only() {
        let r = rule("example.com");
        assert!(r.matches("example.com"));
        assert!(r.matches("a.example.com"));
        assert!(r.matches("a.b.example.com"));
        assert!(!r.matches("badexample.com"));
        assert!(!r.matches("example.com.evil.test"));
        assert!(!r.matches("com"));
    }

    #[test]
    fn exact_rule_matches_one_host() {
        let r = rule("=www.example.com");
        assert!(r.matches("www.example.com"));
        assert!(!r.matches("a.www.example.com"));
        assert!(!r.matches("example.com"));
    }

    #[test]
    fn rules_are_normalised_like_urls() {
        assert!(rule("EXAMPLE.com.").matches("example.com"));
        assert!(rule("bücher.example").matches("xn--bcher-kva.example"));
        assert!(rule("2130706433").matches("127.0.0.1"));
        assert!(rule("2001:DB8::1").matches("[2001:db8::1]"));
        assert!(rule("[::1]").matches("[::1]"));
    }

    #[test]
    fn ip_rules_are_exact() {
        let r = rule("192.0.2.1");
        assert!(r.matches("192.0.2.1"));
        assert!(!r.matches("1.192.0.2.1"));
        assert_eq!(r.specificity(), rule("=192.0.2.1").specificity());
    }

    #[test]
    fn bad_entries_are_refused() {
        assert_eq!(HostRule::parse("  "), Err(RuleError::Empty));
        for bad in [
            "https://example.com",
            "example.com/path",
            "*.example.com",
            "user@example.com",
            "exa mple.com",
            "example.com:443",
            "=",
            "a\\b",
            "50%.example",
            "ex\u{0}ample.com",
        ] {
            assert_eq!(
                HostRule::parse(bad),
                Err(RuleError::NotAHost(bad.to_string())),
                "{bad:?} should be refused"
            );
        }
        assert!(RuleError::Empty.to_string().contains("empty"));
        assert!(
            RuleError::NotAHost("x y".into())
                .to_string()
                .contains("not a host")
        );
    }

    #[test]
    fn specificity_orders_labels_then_exactness() {
        assert!(rule("docs.example.com").specificity() > rule("example.com").specificity());
        assert!(rule("=example.com").specificity() > rule("example.com").specificity());
        assert!(rule("a.example.com").specificity() > rule("=example.com").specificity());
    }

    #[test]
    fn list_keeps_most_specific_match_and_refuses_bad_entries() {
        let list = RuleList::parse(&["example.com", "docs.example.com", "other.test"]).unwrap();
        assert_eq!(list.len(), 3);
        assert!(!list.is_empty());
        assert_eq!(
            list.best_match("a.docs.example.com").unwrap().text(),
            "docs.example.com"
        );
        assert!(list.best_match("example.org").is_none());
        assert!(RuleList::parse(&["ok.test", "bad/entry"]).is_err());
        assert!(RuleList::default().is_empty());
    }
}
