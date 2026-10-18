//! p5.3 live check of the Windows counters on this PC: the test process reads itself (every counter filled, including
//! `PrivateWorkingSetSize` from `PROCESS_MEMORY_COUNTERS_EX2`), and a process that has ended reads as gone.
#![cfg(windows)]

use ferrum_telemetry::sampler::Reading;
use ferrum_telemetry::win;

#[test]
fn the_test_process_reads_its_own_counters() {
    // some CPU work so the CPU counters are above zero
    let mut x = 0u64;
    for i in 0..20_000_000u64 {
        x = x.wrapping_mul(31).wrapping_add(i);
    }
    std::hint::black_box(x);
    let Reading::Read(c) = win::read(std::process::id()) else {
        panic!("could not read the own process");
    };
    println!("own process: {c:?}");
    assert!(c.created_100ns > 0);
    assert!(c.private_commit_bytes > 0);
    assert!(c.working_set_bytes > 0);
    let pws = c
        .private_working_set_bytes
        .expect("EX2 private working set");
    assert!(
        pws > 0 && pws <= c.working_set_bytes,
        "private working set within the working set"
    );
    assert!(c.page_faults > 0);
    assert!(c.cpu_user_100ns + c.cpu_kernel_100ns > 0);
    assert!(c.cycles.is_some_and(|n| n > 0));
    let again = win::sample(&[std::process::id()]);
    assert!(
        matches!(&again[0].1, Reading::Read(d) if d.created_100ns == c.created_100ns),
        "same process, same creation time"
    );
}

#[test]
fn an_ended_process_reads_as_gone() {
    let mut child = std::process::Command::new("cmd.exe")
        .args(["/C", "exit", "0"])
        .spawn()
        .unwrap();
    let pid = child.id();
    child.wait().unwrap();
    // The Child value still holds its handle, so Windows keeps the ended process's record: exit time set.
    assert_eq!(win::read(pid), Reading::Gone, "ended, handle still held");
    drop(child);
}
