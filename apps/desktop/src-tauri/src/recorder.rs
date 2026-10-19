//! Ferrum's own measuring during normal use (P5 task p5.11; owner's Q-230 answer: off unless switched on). When
//! `[telemetry] enabled = true`, one export run (export schema v1, `ferrum-telemetry`) is written to
//! `<data dir>/<[telemetry] dir>/<run id>.NNNN.jsonl`: the run line (versions, settings fingerprint, machine), process
//! samples at the set interval, the startup chain, one `nav_timing` per finished navigation and every lifecycle
//! transition. No web address is written.
//!
//! The file's clock must never go backwards, but the startup marks are known only after the first page has drawn. So
//! records wait in a buffer: until the startup chain is in (at most [`HOLD_MS`] after start), then for one second at a
//! time, sorted by time before they are written. A record older than the last one written (it waited longer than that)
//! is dropped and counted, never written out of order.
//!
//! At start, run files older than `retention_days` are deleted: only files named like this recorder's runs. On exit
//! the run is finished (its `.part` file renamed).

use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use ferrum_core::config::{Config, Telemetry};
use ferrum_telemetry::export::{ExportWriter, Record, RunMeta, SCHEMA_VERSION};
use serde_json::{Value, json};
use tauri::{AppHandle, Manager};

/// How long records wait for the startup chain at most (milliseconds on the run clock).
pub const HOLD_MS: u64 = 15_000;
/// Size at which the next file of a run starts.
const MAX_FILE_BYTES: u64 = 50 * 1024 * 1024;

struct Recorder {
    writer: Option<ExportWriter>,
    folder: PathBuf,
    buffer: Vec<Record>,
    holding: bool,
    last_t: u64,
    dropped: u64,
    failed: bool,
}

static REC: OnceLock<Mutex<Recorder>> = OnceLock::new();

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// The run's label: start time and process id, as a session folder of the network log is named.
fn run_id(started_unix_ms: u64) -> String {
    ferrum_network_logger::session_name(started_unix_ms, std::process::id())
}

/// The run line of this start.
fn meta(config: &Config, started_unix_ms: u64) -> RunMeta {
    RunMeta {
        schema_version: SCHEMA_VERSION,
        run_id: run_id(started_unix_ms),
        file_seq: 0,
        started_unix_ms,
        ferrum_version: env!("CARGO_PKG_VERSION").into(),
        git_sha: env!("FERRUM_GIT_SHA").into(),
        git_dirty: env!("FERRUM_GIT_DIRTY") == "true",
        os_build: ferrum_telemetry::win::os_build().unwrap_or_else(|| "unknown".into()),
        webview2_runtime: tauri::webview_version().unwrap_or_else(|_| "unknown".into()),
        config_sha256: ferrum_core::config::hash(config),
        machine_id: config.telemetry.machine_id.clone(),
        sample_interval_ms: Some(config.telemetry.sample_interval_ms),
    }
}

/// Deletes this recorder's run files in `dir` older than `days` (0 = never), except the running one. Only files named
/// `<run id>.NNNN.jsonl` or `<run id>.NNNN.jsonl.part`, with a run id that is a start time, are touched.
pub fn prune(dir: &Path, now_unix_ms: u64, days: u32, keep: &str) -> std::io::Result<usize> {
    if days == 0 || !dir.is_dir() {
        return Ok(0);
    }
    let limit = u64::from(days) * 86_400_000;
    let mut n = 0;
    for e in std::fs::read_dir(dir)? {
        let e = e?;
        let name = e.file_name().to_string_lossy().into_owned();
        let stem = name.strip_suffix(".part").unwrap_or(&name);
        let Some(stem) = stem.strip_suffix(".jsonl") else {
            continue;
        };
        let Some((id, seq)) = stem.rsplit_once('.') else {
            continue;
        };
        if seq.len() != 4 || !seq.bytes().all(|b| b.is_ascii_digit()) || id == keep {
            continue;
        }
        let Some(start) = ferrum_network_logger::session_start_ms(id) else {
            continue;
        };
        if e.file_type()?.is_file() && now_unix_ms.saturating_sub(start) > limit {
            std::fs::remove_file(e.path())?;
            n += 1;
        }
    }
    Ok(n)
}

/// Starts the recorder when the settings switch it on. `started_unix_ms` is Ferrum's process creation time (the run
/// clock's zero). Returns the export folder, or `None` when the measuring is off.
pub fn init(
    data_dir: &Path,
    config: &Config,
    started_unix_ms: u64,
) -> Result<Option<PathBuf>, String> {
    let t: &Telemetry = &config.telemetry;
    if !t.enabled {
        return Ok(None);
    }
    let dir = data_dir.join(&t.dir);
    let meta = meta(config, started_unix_ms);
    match prune(&dir, now_ms(), t.retention_days, &meta.run_id) {
        Ok(n) if n > 0 => {
            tracing::info!(target: "ferrum::telemetry", files = n, days = t.retention_days, "old measuring files deleted")
        }
        Ok(_) => {}
        Err(e) => {
            tracing::warn!(target: "ferrum::telemetry", error = %e, "old measuring files not checked")
        }
    }
    let writer = ExportWriter::create(&dir, meta, MAX_FILE_BYTES)
        .map_err(|e| format!("measuring folder {}: {e}", dir.display()))?;
    let _ = REC.set(Mutex::new(Recorder {
        writer: Some(writer),
        folder: dir.clone(),
        buffer: Vec::new(),
        holding: true,
        last_t: 0,
        dropped: 0,
        failed: false,
    }));
    tracing::info!(target: "ferrum::telemetry", "measuring on");
    Ok(Some(dir))
}

/// Whether the measuring is on.
pub fn enabled() -> bool {
    REC.get().is_some()
}

/// The export folder of this run, when the measuring is on.
pub fn folder() -> Option<PathBuf> {
    REC.get().map(|r| r.lock().unwrap().folder.clone())
}

/// Keeps a record for the next flush (nothing when the measuring is off).
pub fn push(r: Record) {
    if let Some(rec) = REC.get() {
        rec.lock().unwrap().buffer.push(r);
    }
}

/// The startup chain is in (or will not come): records are written from the next flush on.
pub fn release() {
    if let Some(rec) = REC.get() {
        rec.lock().unwrap().holding = false;
    }
}

/// Writes the waiting records in time order (see the module text). `force` ignores the startup hold (exit).
pub fn flush(run_ms: u64, force: bool) {
    let Some(rec) = REC.get() else { return };
    let mut r = rec.lock().unwrap();
    if r.holding && !force && run_ms < HOLD_MS {
        return;
    }
    r.holding = false;
    let mut batch = std::mem::take(&mut r.buffer);
    batch.sort_by_key(|x| x.t_ms().unwrap_or(0));
    for x in batch {
        let t = x.t_ms().unwrap_or(0);
        if t < r.last_t {
            r.dropped += 1;
            if r.dropped == 1 {
                tracing::warn!(target: "ferrum::telemetry", kind = x.kind(), t_ms = t, last = r.last_t, "a late record was dropped (never written out of order)");
            }
            continue;
        }
        let Some(w) = r.writer.as_mut() else { return };
        match w.write(&x) {
            Ok(()) => r.last_t = t,
            Err(e) => {
                if !r.failed {
                    r.failed = true;
                    tracing::error!(target: "ferrum::telemetry", error = %e, "measuring file not written");
                }
            }
        }
    }
}

/// Writes what is waiting and finishes the run (exit). Later records are ignored.
pub fn finish(run_ms: u64) {
    flush(run_ms, true);
    let Some(rec) = REC.get() else { return };
    let mut r = rec.lock().unwrap();
    let dropped = r.dropped;
    if let Some(w) = r.writer.take() {
        match w.finish() {
            Ok(files) => {
                tracing::info!(target: "ferrum::telemetry", files = files.len(), dropped, "measuring run finished")
            }
            Err(e) => {
                tracing::error!(target: "ferrum::telemetry", error = %e, "measuring run not finished")
            }
        }
    }
}

/// Every second: flush; and, at the set interval, one process reading of Ferrum's set (as the p5.3 sampler). Runs for
/// the life of the app.
pub fn start_loops(app: &AppHandle, interval_ms: u32) {
    let h = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut sampler = ferrum_telemetry::sampler::Sampler::new();
        let interval = Duration::from_millis(u64::from(interval_ms));
        let mut next_sample = std::time::Instant::now() + Duration::from_millis(500);
        let mut next_flush = std::time::Instant::now() + Duration::from_secs(1);
        loop {
            let wake = next_sample.min(next_flush);
            crate::content::pause(
                wake.saturating_duration_since(std::time::Instant::now())
                    .as_millis() as u64,
            )
            .await;
            let now = std::time::Instant::now();
            if now >= next_sample {
                let mut set = crate::content::process_inventories(&h)
                    .await
                    .and_then(|l| crate::content::set_of(&l));
                if set.is_err() {
                    crate::content::pause(200).await;
                    set = crate::content::process_inventories(&h)
                        .await
                        .and_then(|l| crate::content::set_of(&l));
                }
                let t = crate::content::run_ms();
                for r in sampler.tick(
                    t,
                    set.as_ref().map_err(String::as_str),
                    ferrum_telemetry::win::read,
                ) {
                    push(r);
                }
                next_sample = std::time::Instant::now() + interval;
            }
            if now >= next_flush {
                flush(crate::content::run_ms(), false);
                next_flush = now + Duration::from_secs(1);
            }
        }
    });
}

/// Which folder: `telemetry` (the measuring) or `network` (the network log).
fn folder_of(app: &AppHandle, kind: &str) -> Result<PathBuf, String> {
    let running = match kind {
        "telemetry" => folder(),
        // the network log's root, not its session folder: older sessions sit next to it
        "network" => crate::netlog::folder().and_then(|f| f.parent().map(Path::to_path_buf)),
        _ => return Err(format!("unknown log {kind:?}")),
    };
    if let Some(f) = running {
        return Ok(f);
    }
    let config = app.state::<crate::content::AppConfig>().get();
    let data = match &config.storage.data_dir {
        Some(d) => d.clone(),
        None => app.path().app_local_data_dir().map_err(|e| e.to_string())?,
    };
    Ok(match kind {
        "telemetry" => data.join(&config.telemetry.dir),
        _ => data.join(&config.network_log.dir),
    })
}

/// The folder of the measuring files or of the network log, and whether it exists yet (settings screen, p5.11).
#[tauri::command]
pub fn log_folder(app: AppHandle, kind: String) -> Result<Value, String> {
    let f = folder_of(&app, &kind)?;
    Ok(json!({"path": f.display().to_string(), "exists": f.is_dir()}))
}

/// Opens that folder in File Explorer (settings screen, p5.11). Only these two folders of Ferrum's own can be opened.
#[tauri::command]
pub fn log_folder_open(app: AppHandle, kind: String) -> Result<(), String> {
    let f = folder_of(&app, &kind)?;
    if !f.is_dir() {
        return Err("No files yet: the folder is made when Ferrum first writes there.".into());
    }
    std::process::Command::new("explorer.exe")
        .arg(&f)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("File Explorer did not open: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prune_deletes_only_old_run_files() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../../target/test-tmp/recorder-prune")
            .join(std::process::id().to_string());
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let now = 1_792_000_000_000u64;
        let day = 86_400_000u64;
        let old = ferrum_network_logger::session_name(now - 20 * day, 1);
        let new = ferrum_network_logger::session_name(now - 2 * day, 2);
        let keep = ferrum_network_logger::session_name(now - 30 * day, 3);
        for name in [
            format!("{old}.0000.jsonl"),
            format!("{old}.0001.jsonl.part"),
            format!("{new}.0000.jsonl"),
            format!("{keep}.0000.jsonl.part"),
            "notes.jsonl".into(),
            format!("{old}.txt"),
        ] {
            std::fs::write(dir.join(&name), "x").unwrap();
        }
        assert_eq!(prune(&dir, now, 14, &keep).unwrap(), 2);
        let mut left: Vec<String> = std::fs::read_dir(&dir)
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        left.sort();
        let mut want = vec![
            format!("{new}.0000.jsonl"),
            format!("{keep}.0000.jsonl.part"),
            "notes.jsonl".to_string(),
            format!("{old}.txt"),
        ];
        want.sort();
        assert_eq!(left, want);
        assert_eq!(
            prune(&dir, now + 999 * day, 0, &keep).unwrap(),
            0,
            "0 = never"
        );
    }
}
