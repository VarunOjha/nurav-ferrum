//! The settings screen's host side (P3 task p3.14). The shell shows the settings and sends changes here; it never
//! touches the file. `settings_set` checks every value first (start-up sites by the address-bar rules, per-site
//! entries by the settings rules, the download folder must exist) and only then writes the user settings file in one
//! step (`ferrum_core::config::save`, atomic) and applies the new settings: per-site profiles, permission grants, the
//! blocked sites (p4.17) and the download folder at once, start-up sites and restore at the next start. Invalid input changes nothing. Only the shell may call these
//! commands (capability `shell.json`); pages have no bridge (p2.3 test).

use std::path::PathBuf;

use ferrum_core::address::{Outcome, normalize};
use ferrum_core::config::{self, Config, PermissionKind, SiteSettings};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::UserConfigPath;
use crate::content::AppConfig;

/// One per-site entry as the screen shows it.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiteRow {
    /// The site (its main domain).
    pub site: String,
    /// A named profile, or empty for the site's own.
    pub profile: String,
    /// Permissions granted to the site (p4.5), by settings name (`camera`, ...). Missing: keep what the site has.
    #[serde(default)]
    pub permissions: Option<Vec<String>>,
}

/// What the settings screen shows and edits.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsView {
    /// Start-up sites, in order.
    pub startup_urls: Vec<String>,
    /// Reopen the last session at start.
    pub restore_on_startup: bool,
    /// Per-site entries.
    pub sites: Vec<SiteRow>,
    /// The chosen download folder (empty = the Windows Downloads folder).
    pub download_folder: String,
    /// Blocked sites, one rule each (p4.17; `[security] blocklist`): `example.com` blocks the site and its subdomains,
    /// `=www.example.com` that host only. Missing: keep the current list.
    #[serde(default)]
    pub blocklist: Option<Vec<String>>,
    /// Shown only: the folder used when none is chosen.
    #[serde(default)]
    pub default_download_folder: String,
    /// Shown only: how sites are kept apart ("per-site", "shared" or "per-site-udf").
    #[serde(default)]
    pub isolation: String,
    /// Shown only: the settings file that is written.
    #[serde(default)]
    pub file: String,
}

fn view_of(app: &AppHandle, c: &Config) -> SettingsView {
    SettingsView {
        startup_urls: c.session.startup_urls.clone(),
        restore_on_startup: c.session.restore_on_startup,
        sites: c
            .sites
            .iter()
            .map(|s| SiteRow {
                site: s.site.clone(),
                profile: s.profile.clone().unwrap_or_default(),
                permissions: Some(s.permissions.iter().map(|k| k.name().to_string()).collect()),
            })
            .collect(),
        download_folder: c
            .downloads
            .folder
            .as_ref()
            .map(|p| p.display().to_string())
            .unwrap_or_default(),
        blocklist: Some(c.security.blocklist.clone()),
        default_download_folder: app
            .path()
            .download_dir()
            .map(|p| p.display().to_string())
            .unwrap_or_default(),
        isolation: c.isolation.mode.name().into(),
        file: app
            .state::<UserConfigPath>()
            .0
            .as_ref()
            .map(|p| p.display().to_string())
            .unwrap_or_default(),
    }
}

/// The settings in effect, for the settings screen.
#[tauri::command]
pub fn settings_get(app: AppHandle) -> SettingsView {
    view_of(&app, &app.state::<AppConfig>().get())
}

/// Checks `input` against the settings rules and returns the new settings, or every problem found (plain words).
pub fn apply(current: &Config, input: &SettingsView) -> Result<Config, Vec<String>> {
    let mut problems = Vec::new();
    let mut next = current.clone();
    let mut urls = Vec::new();
    for raw in input
        .startup_urls
        .iter()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
    {
        if raw == "about:blank" {
            urls.push(raw.to_string());
            continue;
        }
        match normalize(raw, &current.security) {
            Outcome::Navigate { url, .. } => urls.push(url.to_string()),
            _ => problems.push(format!("Start-up site \"{raw}\" is not a web address.")),
        }
    }
    next.session.startup_urls = urls;
    next.session.restore_on_startup = input.restore_on_startup;
    next.sites = input
        .sites
        .iter()
        .filter(|r| !r.site.trim().is_empty())
        .map(|r| {
            let site = r.site.trim().to_ascii_lowercase();
            let permissions = match &r.permissions {
                // The screen did not send them: the site keeps its grants.
                None => current
                    .sites
                    .iter()
                    .find(|c| c.site == site)
                    .map(|c| c.permissions.clone())
                    .unwrap_or_default(),
                Some(names) => names
                    .iter()
                    .filter_map(|n| {
                        let k = PermissionKind::from_name(n.trim());
                        if k.is_none() {
                            problems.push(format!(
                                "Permission \"{n}\" for {site} is not a permission name."
                            ));
                        }
                        k
                    })
                    .collect(),
            };
            SiteSettings {
                site,
                profile: Some(r.profile.trim().to_string()).filter(|p| !p.is_empty()),
                permissions,
            }
        })
        .collect();
    // Blocked sites (p4.17): each line checked by the security engine's own rule parser, so the message names the line.
    if let Some(lines) = &input.blocklist {
        let mut rules = Vec::new();
        for raw in lines.iter().map(|l| l.trim()).filter(|l| !l.is_empty()) {
            let rule = raw.to_ascii_lowercase();
            match ferrum_security::HostRule::parse(&rule) {
                Ok(_) => {
                    if !rules.contains(&rule) {
                        rules.push(rule);
                    }
                }
                Err(e) => problems.push(format!("Blocked site \"{raw}\": {e}.")),
            }
        }
        next.security.blocklist = rules;
    }
    let folder = input.download_folder.trim();
    next.downloads.folder = if folder.is_empty() {
        None
    } else {
        let p = PathBuf::from(folder);
        if !p.is_absolute() || !p.is_dir() {
            problems.push(format!(
                "Download folder \"{folder}\" does not exist (use a full path to an existing folder)."
            ));
        }
        Some(p)
    };
    // The same rules as a settings file (sites, labels, start pages, site lists).
    if let Err(e) = config::validate(next.clone()) {
        problems.push(e.to_string());
    }
    if let Err(e) = crate::policy::build(&next) {
        problems.push(e);
    }
    if problems.is_empty() {
        Ok(next)
    } else {
        Err(problems)
    }
}

/// The user settings file to save to, or why Ferrum must not write it this run.
pub fn user_file(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let s = app.state::<UserConfigPath>();
    if let Some(why) = &s.1 {
        return Err(format!(
            "Your settings file was not changed: it could not be used when Ferrum started ({why}). Close Ferrum, \
             fix or move that file, then start Ferrum again."
        ));
    }
    s.0.clone()
        .ok_or_else(|| "Ferrum does not know where its settings file is.".to_string())
}

/// Problems from start-up the shell shows once: settings that could not be used, a library kept in memory only.
#[tauri::command]
pub fn app_notes(app: AppHandle) -> Vec<String> {
    let mut notes = Vec::new();
    if let Some(why) = &app.state::<UserConfigPath>().1 {
        notes.push(format!(
            "Your settings file could not be used ({why}); Ferrum runs with the standard settings and will not \
             change the file."
        ));
    }
    if let Some(p) = &app.state::<crate::library::Library>().problem {
        notes.push(p.clone());
    }
    notes
}

/// Saves the settings from the settings screen: everything is checked first; then the user settings file is written
/// in one step and the new settings apply. On any problem nothing changes and the problems are returned.
#[tauri::command]
pub fn settings_set(app: AppHandle, input: SettingsView) -> Result<SettingsView, Vec<String>> {
    let current = app.state::<AppConfig>().get();
    let next = apply(&current, &input)?;
    let path = user_file(&app).map_err(|e| vec![e])?;
    let loaded = config::validate(next.clone()).map_err(|e| vec![e.to_string()])?;
    let nav_policy = crate::policy::build(&loaded.config).map_err(|e| vec![e])?;
    config::save(&path, &loaded.config).map_err(|e| vec![e.to_string()])?;
    tracing::info!(target: "ferrum::config", config_hash = %config::hash(&loaded.config), "settings saved from the settings screen");
    *app.state::<AppConfig>().0.write().unwrap() = loaded;
    crate::policy::replace(&app, nav_policy);
    Ok(view_of(&app, &next))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(current: &Config, blocklist: Option<Vec<&str>>) -> SettingsView {
        SettingsView {
            startup_urls: current.session.startup_urls.clone(),
            restore_on_startup: current.session.restore_on_startup,
            sites: Vec::new(),
            download_folder: String::new(),
            blocklist: blocklist.map(|b| b.into_iter().map(String::from).collect()),
            default_download_folder: String::new(),
            isolation: String::new(),
            file: String::new(),
        }
    }

    #[test]
    fn blocked_sites_are_checked_cleaned_and_kept_when_not_sent() {
        let mut current = Config::default();
        current.security.blocklist = vec!["old.example".into()];
        // Not sent: the current list stays.
        let next = apply(&current, &input(&current, None)).unwrap();
        assert_eq!(next.security.blocklist, vec!["old.example".to_string()]);
        // Sent: trimmed, lower case, empty lines and repeats dropped.
        let next = apply(
            &current,
            &input(
                &current,
                Some(vec![
                    " Blocked.Example ",
                    "",
                    "=www.other.example",
                    "blocked.example",
                ]),
            ),
        )
        .unwrap();
        assert_eq!(
            next.security.blocklist,
            vec![
                "blocked.example".to_string(),
                "=www.other.example".to_string()
            ]
        );
        // An empty list clears it.
        let next = apply(&current, &input(&current, Some(vec![]))).unwrap();
        assert!(next.security.blocklist.is_empty());
    }

    #[test]
    fn a_bad_blocked_site_is_refused_with_its_line() {
        let current = Config::default();
        let e = apply(
            &current,
            &input(&current, Some(vec!["https://evil.example/path"])),
        )
        .unwrap_err();
        assert!(
            e.iter()
                .any(|p| p.starts_with("Blocked site \"https://evil.example/path\"")),
            "{e:?}"
        );
    }
}
