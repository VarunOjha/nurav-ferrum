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
            "shell_focused",
        ]),
    ))
    .expect("Tauri build step failed");
}
