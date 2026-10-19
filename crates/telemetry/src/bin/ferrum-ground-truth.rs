//! Ground-truth helper for the sampler validation (p5.4); a test tool, not part of Ferrum. It reads one command per
//! line on stdin and answers one line on stdout, then waits for the next command:
//!
//! - `alloc <MiB>`: allocate that many MiB and write every byte (so every page is committed and touched) -> `done`;
//! - `free`: release that memory -> `done`;
//! - `burn <ms>`: keep this one thread busy for that long -> `done <elapsed ms>`;
//! - `quit` (or the end of stdin): exit.
//!
//! It prints `ready` first. Between commands it blocks on stdin and uses no CPU, so readings taken then are steady.

use std::io::{BufRead, Write};
use std::time::Instant;

fn main() {
    let stdin = std::io::stdin();
    let mut out = std::io::stdout().lock();
    let mut held: Option<Vec<u8>> = None;
    let _ = writeln!(out, "ready");
    let _ = out.flush();
    for line in stdin.lock().lines() {
        let Ok(line) = line else { break };
        let mut words = line.split_whitespace();
        let answer = match (words.next(), words.next().map(str::parse::<u64>)) {
            (Some("alloc"), Some(Ok(mib))) => {
                let bytes = (mib * 1024 * 1024) as usize;
                let mut v: Vec<u8> = Vec::with_capacity(bytes);
                v.resize(bytes, 1);
                held = Some(std::hint::black_box(v));
                "done".to_string()
            }
            (Some("free"), None) => {
                held = None;
                "done".to_string()
            }
            (Some("burn"), Some(Ok(ms))) => {
                let start = Instant::now();
                let mut x = 0u64;
                while start.elapsed().as_millis() < u128::from(ms) {
                    for i in 0..10_000u64 {
                        x = std::hint::black_box(
                            x.wrapping_mul(6364136223846793005).wrapping_add(i),
                        );
                    }
                }
                std::hint::black_box(x);
                format!("done {}", start.elapsed().as_millis())
            }
            (Some("quit"), None) => break,
            _ => format!("error unknown command {line:?}"),
        };
        let _ = writeln!(out, "{answer}");
        let _ = out.flush();
    }
    drop(held);
}
