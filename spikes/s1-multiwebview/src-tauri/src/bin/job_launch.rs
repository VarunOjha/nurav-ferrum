//! Spike S1 process-attribution helper (risk-r05): starts the spike app suspended inside a new Job
//! Object, resumes it in auto mode, and lists the job's processes once the app has written its own
//! WebView2 process list. The job is NOT created with kill-on-close: nothing is ever killed; the app
//! exits by itself after the hand-shake file `<out>.done` appears.
//!
//! Usage: job_launch <path-to-ferrum-spike-s1.exe> <out.json>
//! Writes `<out>.job.json`.

use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use serde_json::json;
use windows::Win32::Foundation::{CloseHandle, HANDLE, WAIT_OBJECT_0};
use windows::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, IsProcessInJob, JOBOBJECT_BASIC_PROCESS_ID_LIST,
    JobObjectBasicProcessIdList, QueryInformationJobObject,
};
use windows::Win32::System::Threading::{
    CREATE_SUSPENDED, GetCurrentProcess, GetExitCodeProcess, OpenProcess, PROCESS_INFORMATION, PROCESS_NAME_WIN32,
    PROCESS_QUERY_LIMITED_INFORMATION, QueryFullProcessImageNameW, ResumeThread, STARTUPINFOW, WaitForSingleObject,
    CreateProcessW,
};
use windows::core::{BOOL, PCWSTR, PWSTR};

fn exe_name(pid: u32) -> String {
    // SAFETY: the handle is opened for limited query only and closed before return; the buffer
    // outlives the call and its length is passed in `len`.
    unsafe {
        let Ok(h) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else { return "?".into() };
        let mut buf = [0u16; 1024];
        let mut len = buf.len() as u32;
        let ok = QueryFullProcessImageNameW(h, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut len).is_ok();
        let _ = CloseHandle(h);
        if !ok {
            return "?".into();
        }
        let full = String::from_utf16_lossy(&buf[..len as usize]);
        Path::new(&full).file_name().map(|s| s.to_string_lossy().into_owned()).unwrap_or(full)
    }
}

/// The Chromium `--type=` switch of each process (none = the browser process itself), read with
/// PowerShell's Get-CimInstance (read-only). Returns `pid -> type`.
fn process_types(pids: &[u32]) -> serde_json::Map<String, serde_json::Value> {
    let list = pids.iter().map(|p| p.to_string()).collect::<Vec<_>>().join(",");
    let script = format!(
        r#"Get-CimInstance Win32_Process -Filter 'ProcessId={}' | ForEach-Object {{ $t = if ($_.CommandLine -match '--type=(\S+)') {{ $Matches[1] }} else {{ '(none)' }}; "$($_.ProcessId)|$t" }}"#,
        list.replace(',', " OR ProcessId=")
    );
    let out = std::process::Command::new("powershell.exe").args(["-NoProfile", "-Command", &script]).output();
    let mut map = serde_json::Map::new();
    if let Ok(o) = out {
        for line in String::from_utf8_lossy(&o.stdout).lines() {
            if let Some((pid, t)) = line.trim().split_once('|') {
                map.insert(pid.to_string(), json!(t));
            }
        }
    }
    map
}

fn job_pids(job: HANDLE) -> Vec<u32> {
    // Header (two u32) + up to 4096 pids (usize each).
    let mut buf = vec![0usize; 4098];
    // SAFETY: the buffer is large enough for the header plus 4096 ids and is passed with its size;
    // the job handle is valid for the duration of the call.
    unsafe {
        let ptr = buf.as_mut_ptr() as *mut JOBOBJECT_BASIC_PROCESS_ID_LIST;
        if QueryInformationJobObject(
            Some(job),
            JobObjectBasicProcessIdList,
            ptr as *mut _,
            (buf.len() * size_of::<usize>()) as u32,
            None,
        )
        .is_err()
        {
            return Vec::new();
        }
        let n = (*ptr).NumberOfProcessIdsInList as usize;
        let ids = std::ptr::addr_of!((*ptr).ProcessIdList) as *const usize;
        (0..n).map(|i| *ids.add(i) as u32).collect()
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let exe = PathBuf::from(args.get(1).expect("usage: job_launch <exe> <out.json>"));
    let out = PathBuf::from(args.get(2).expect("usage: job_launch <exe> <out.json>"));
    let done = out.with_extension("done");
    let job_out = out.with_extension("job.json");

    // SAFETY: called before any other thread exists; the child inherits these variables.
    unsafe {
        std::env::set_var("FERRUM_SPIKE_MODE", "auto");
        std::env::set_var("FERRUM_SPIKE_OUT", &out);
    }

    // SAFETY: plain Win32 calls with owned, valid buffers; every handle is closed at the end.
    unsafe {
        let mut in_job = BOOL(0);
        let _ = IsProcessInJob(GetCurrentProcess(), None, &mut in_job);
        let job = CreateJobObjectW(None, PCWSTR::null()).expect("CreateJobObjectW");

        let mut cmd: Vec<u16> = format!("\"{}\"", exe.display()).encode_utf16().chain([0]).collect();
        let si = STARTUPINFOW { cb: size_of::<STARTUPINFOW>() as u32, ..Default::default() };
        let mut pi = PROCESS_INFORMATION::default();
        CreateProcessW(None, Some(PWSTR(cmd.as_mut_ptr())), None, None, false, CREATE_SUSPENDED, None, None, &si, &mut pi)
            .expect("CreateProcessW");
        AssignProcessToJobObject(job, pi.hProcess).expect("AssignProcessToJobObject");
        let assigned_before_resume = job_pids(job);
        ResumeThread(pi.hThread);

        // Wait for the app's own process list (bounded).
        let start = Instant::now();
        while !out.exists() && start.elapsed() < Duration::from_secs(90) {
            std::thread::sleep(Duration::from_millis(200));
        }
        std::thread::sleep(Duration::from_millis(300));
        let pids_now = job_pids(job);
        let types = process_types(&pids_now);
        let during: Vec<_> = pids_now
            .into_iter()
            .map(|p| json!({"pid": p, "exe": exe_name(p), "chromium_type": types.get(&p.to_string()).cloned().unwrap_or(json!(null))}))
            .collect();

        // Let the app exit by itself.
        let _ = std::fs::write(&done, b"done");
        let waited = WaitForSingleObject(pi.hProcess, 30_000);
        let mut code = 0u32;
        let _ = GetExitCodeProcess(pi.hProcess, &mut code);
        std::thread::sleep(Duration::from_secs(3));
        let after: Vec<_> = job_pids(job).into_iter().map(|p| json!({"pid": p, "exe": exe_name(p)})).collect();

        let report = json!({
            "launcher_already_in_a_job": in_job.as_bool(),
            "app_pid": pi.dwProcessId,
            "job_pids_before_resume": assigned_before_resume,
            "job_processes_while_running": during,
            "app_exited_by_itself": waited == WAIT_OBJECT_0,
            "app_exit_code": code,
            "job_processes_3s_after_app_exit": after,
        });
        std::fs::write(&job_out, serde_json::to_string_pretty(&report).unwrap()).expect("write job report");
        println!("{}", job_out.display());
        let _ = CloseHandle(pi.hThread);
        let _ = CloseHandle(pi.hProcess);
        let _ = CloseHandle(job);
    }
}
