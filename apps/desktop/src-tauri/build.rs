//! Build script: Tauri code generation for the Ferrum app.
//!
//! The app's commands are declared here (app ACL manifest, P2 task p2.3). Declared commands are no longer allowed
//! by default: a web view may call one only if a capability that targets it grants the generated
//! `allow-<command>` permission. Only `capabilities/shell.json` (the shell web view) does.

fn main() {
    // The app icon is compiled into the program file; tauri-build does not watch it, so a new icon would be missed
    // by an incremental build (seen in p3.16).
    println!("cargo:rerun-if-changed=icons");
    // The commit Ferrum is built from, for the measuring files' run line (p5.11): 12 hex characters, and whether
    // tracked files had uncommitted changes at build time. Without git: 0000000 (unknown) and dirty.
    let git = |args: &[&str]| {
        std::process::Command::new("git")
            .args(args)
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
    };
    let sha = git(&["rev-parse", "--short=12", "HEAD"])
        .filter(|s| (7..=40).contains(&s.len()) && s.bytes().all(|b| b.is_ascii_hexdigit()))
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_else(|| "0000000".into());
    let dirty =
        git(&["status", "--porcelain", "--untracked-files=no"]).is_none_or(|s| !s.is_empty());
    println!("cargo:rustc-env=FERRUM_GIT_SHA={sha}");
    println!("cargo:rustc-env=FERRUM_GIT_DIRTY={dirty}");
    println!("cargo:rerun-if-changed=../../../.git/HEAD");
    println!("cargo:rerun-if-changed=../../../.git/index");
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "app_ping",
            "app_quit",
            "shell_layout",
            "shell_cover",
            "tab_navigate",
            "tab_back",
            "tab_forward",
            "tab_reload",
            "tab_stop",
            "tab_new",
            "tab_close",
            "tab_activate",
            "tab_move",
            "tab_next",
            "tab_previous",
            "tab_reopen",
            "tab_list",
            "test_stats",
            "test_processes",
            "test_sample",
            "test_startup",
            "test_nav_timing",
            "test_lifecycle",
            "test_netlog",
            "test_check_export",
            "log_folder",
            "log_folder_open",
            "tab_new_private",
            "site_data_clear",
            "test_focus",
            "test_crash",
            "test_crash_tab",
            "history_list",
            "history_clear",
            "history_remove",
            "library_suggest",
            "bookmark_list",
            "bookmark_for",
            "bookmark_add",
            "bookmark_update",
            "bookmark_move",
            "bookmark_remove",
            "appearance_get",
            "appearance_set",
            "backup_suggest_path",
            "backup_export",
            "backup_preview",
            "backup_import",
            "settings_get",
            "settings_set",
            "app_notes",
            "shell_focused",
            "external_open_confirm",
            "external_cancel",
            "cross_site_confirm",
            "cross_site_cancel",
            "permission_answer",
        ]),
    ))
    .expect("Tauri build step failed");
}
