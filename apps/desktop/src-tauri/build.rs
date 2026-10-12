//! Build script: Tauri code generation for the Ferrum app.
//!
//! The app's commands are declared here (app ACL manifest, P2 task p2.3). Declared commands are no longer allowed
//! by default: a web view may call one only if a capability that targets it grants the generated
//! `allow-<command>` permission. Only `capabilities/shell.json` (the shell web view) does.

fn main() {
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
            "test_focus",
            "test_crash",
            "shell_focused",
            "external_open_confirm",
            "external_cancel",
            "cross_site_confirm",
            "cross_site_cancel",
        ]),
    ))
    .expect("Tauri build step failed");
}
