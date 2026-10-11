//! `fixture-server`: local HTTPS fixture server for Ferrum's tests (P2 task p2.1). Test support only.
//!
//! ```text
//! fixture-server ca init                       create the development CA (outside the repo) and print how to install it
//! fixture-server ca path                       print where the CA certificate is
//! fixture-server serve [--port N] [--exit-after SECONDS]
//!                                              serve https://localhost:N (default 8443); with --exit-after it stops by itself
//! fixture-server routes                        print the documented routes and status codes
//! ```

use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::process::ExitCode;
use std::time::Duration;

use fixture_server::{ROUTES, ca, serve};

fn usage() -> ExitCode {
    eprintln!(
        "usage: fixture-server ca init | ca path | serve [--port N] [--exit-after SECONDS] | routes"
    );
    ExitCode::from(2)
}

fn flag(args: &[String], name: &str) -> Option<String> {
    args.iter()
        .position(|a| a == name)
        .and_then(|i| args.get(i + 1))
        .cloned()
}

#[tokio::main]
async fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let dir = ca::default_dir();
    match args.first().map(String::as_str) {
        Some("ca") => match args.get(1).map(String::as_str) {
            Some("init") => match ca::init(&dir) {
                Ok(created) => {
                    let cert = ca::cert_path(&dir);
                    println!(
                        "{} {}",
                        if created {
                            "Created"
                        } else {
                            "Already present:"
                        },
                        cert.display()
                    );
                    println!(
                        "Install it for your Windows user only (a security prompt asks you to confirm):"
                    );
                    println!("  certutil -user -addstore Root \"{}\"", cert.display());
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("{e}");
                    ExitCode::FAILURE
                }
            },
            Some("path") => {
                println!("{}", ca::cert_path(&dir).display());
                ExitCode::SUCCESS
            }
            _ => usage(),
        },
        Some("routes") => {
            for r in ROUTES {
                println!("{}\t{}\t{}", r.status, r.path, r.purpose);
            }
            ExitCode::SUCCESS
        }
        Some("serve") => {
            let port: u16 = flag(&args, "--port")
                .and_then(|p| p.parse().ok())
                .unwrap_or(8443);
            let exit_after = flag(&args, "--exit-after")
                .and_then(|s| s.parse().ok())
                .map(Duration::from_secs);
            let tls = match ca::issue_leaf(&dir).and_then(|leaf| ca::server_config(&leaf)) {
                Ok(t) => t,
                Err(e) => {
                    eprintln!("{e}");
                    return ExitCode::FAILURE;
                }
            };
            let addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port);
            println!("serving https://localhost:{port}/ (exit after: {exit_after:?})");
            match serve(addr, tls, exit_after).await {
                Ok(()) => ExitCode::SUCCESS,
                Err(e) => {
                    eprintln!("server error: {e}");
                    ExitCode::FAILURE
                }
            }
        }
        _ => usage(),
    }
}
