//! The Windows calls of the sampler (p5.3): the only `unsafe` code of this crate (adr-0019 point 3; the invariants are
//! listed on comp-telemetry under "Unsafe invariants"). Direct `windows` crate calls, no `sysinfo`:
//! `GetProcessMemoryInfo` with `PROCESS_MEMORY_COUNTERS_EX2`, `GetProcessTimes` and `QueryProcessCycleTime`, each on a
//! handle opened with `PROCESS_QUERY_LIMITED_INFORMATION` only. No WebView2 COM call is made here.

use std::mem::size_of;

use windows::Win32::Foundation::{
    CloseHandle, ERROR_INVALID_PARAMETER, FILETIME, HANDLE, WIN32_ERROR,
};
use windows::Win32::System::ProcessStatus::{
    GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS, PROCESS_MEMORY_COUNTERS_EX2,
};
use windows::Win32::System::Threading::{
    GetProcessTimes, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::System::WindowsProgramming::QueryProcessCycleTime;
use windows::core::HRESULT;

use crate::sampler::{Counters, Reading};

/// An open process handle, closed when dropped.
struct Process(HANDLE);

impl Drop for Process {
    fn drop(&mut self) {
        // SAFETY: (handles closed via RAII) self.0 came from a successful OpenProcess and is closed exactly once,
        // here. A failure to close cannot be acted on, so it is ignored.
        let _ = unsafe { CloseHandle(self.0) };
    }
}

fn ticks(t: FILETIME) -> u64 {
    (u64::from(t.dwHighDateTime) << 32) | u64::from(t.dwLowDateTime)
}

fn is_win32(e: &windows::core::Error, code: WIN32_ERROR) -> bool {
    e.code() == HRESULT::from_win32(code.0)
}

/// Reads one process's counters. A pid that no longer exists, or a process that has already exited, is
/// [`Reading::Gone`]; any other failure is [`Reading::Unreadable`] with the reason.
pub fn read(pid: u32) -> Reading {
    // SAFETY: (least access) OpenProcess takes plain values; PROCESS_QUERY_LIMITED_INFORMATION is the least access the
    // three counter calls accept. The handle is owned by `Process` and closed on every path.
    let process = match unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) } {
        Ok(h) => Process(h),
        Err(e) if is_win32(&e, ERROR_INVALID_PARAMETER) => return Reading::Gone,
        Err(e) => return Reading::Unreadable(format!("OpenProcess: {e}")),
    };

    let (mut created, mut exited, mut kernel, mut user) = (
        FILETIME::default(),
        FILETIME::default(),
        FILETIME::default(),
        FILETIME::default(),
    );
    // SAFETY: (no pointer escapes) the four out-pointers are to locals that outlive the call; the handle is open.
    if let Err(e) =
        unsafe { GetProcessTimes(process.0, &mut created, &mut exited, &mut kernel, &mut user) }
    {
        return Reading::Unreadable(format!("GetProcessTimes: {e}"));
    }
    if ticks(exited) != 0 {
        return Reading::Gone; // ended, but someone still holds a handle to it
    }

    let mut mem = PROCESS_MEMORY_COUNTERS_EX2 {
        cb: size_of::<PROCESS_MEMORY_COUNTERS_EX2>() as u32,
        ..Default::default()
    };
    // SAFETY: (cb set before the call) `mem` is a PROCESS_MEMORY_COUNTERS_EX2 whose `cb` and the size argument are its
    // own size, so Windows writes at most that many bytes; EX2 starts with the PROCESS_MEMORY_COUNTERS fields, as the
    // API expects for the pointer cast. The pointer is to a local that outlives the call.
    if let Err(e) = unsafe {
        GetProcessMemoryInfo(
            process.0,
            (&mut mem as *mut PROCESS_MEMORY_COUNTERS_EX2).cast::<PROCESS_MEMORY_COUNTERS>(),
            mem.cb,
        )
    } {
        return Reading::Unreadable(format!("GetProcessMemoryInfo: {e}"));
    }

    let mut cycles = 0u64;
    // SAFETY: (no pointer escapes) the out-pointer is to a local u64 that outlives the call; the handle is open.
    let cycles = unsafe { QueryProcessCycleTime(process.0, &mut cycles) }
        .ok()
        .map(|()| cycles);

    Reading::Read(Counters {
        created_100ns: ticks(created),
        private_commit_bytes: mem.PrivateUsage as u64,
        working_set_bytes: mem.WorkingSetSize as u64,
        private_working_set_bytes: Some(mem.PrivateWorkingSetSize as u64),
        page_faults: u64::from(mem.PageFaultCount),
        cpu_user_100ns: ticks(user),
        cpu_kernel_100ns: ticks(kernel),
        cycles,
    })
}

/// Reads every pid in turn (`win::sample(pids)` on comp-telemetry).
pub fn sample(pids: &[u32]) -> Vec<(u32, Reading)> {
    pids.iter().map(|&pid| (pid, read(pid))).collect()
}
