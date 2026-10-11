//! HTTPS with the development CA: a loopback request succeeds, and the CA's name constraints stop it from
//! vouching for any other host. Uses a CA in Cargo's per-test temp folder, never the owner's real CA.

use std::path::PathBuf;
use std::sync::Arc;

use fixture_server::ca;
use rustls::pki_types::pem::PemObject;
use rustls::pki_types::{CertificateDer, ServerName};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

fn test_ca_dir(name: &str) -> PathBuf {
    let dir = PathBuf::from(env!("CARGO_TARGET_TMPDIR"))
        .join(format!("fixture-ca-{name}-{}", std::process::id()));
    ca::init(&dir).expect("create test CA");
    dir
}

fn client_config(ca_dir: &std::path::Path) -> Arc<rustls::ClientConfig> {
    let mut roots = rustls::RootCertStore::empty();
    for c in CertificateDer::pem_file_iter(ca::cert_path(ca_dir)).unwrap() {
        roots.add(c.unwrap()).unwrap();
    }
    let provider = Arc::new(rustls::crypto::ring::default_provider());
    Arc::new(
        rustls::ClientConfig::builder_with_provider(provider)
            .with_safe_default_protocol_versions()
            .unwrap()
            .with_root_certificates(roots)
            .with_no_client_auth(),
    )
}

/// Starts the fixture server on an ephemeral loopback port with `tls`; it stops by itself after 20 s.
async fn start(tls: Arc<rustls::ServerConfig>) -> std::net::SocketAddr {
    let handle = axum_server::Handle::new();
    let h2 = handle.clone();
    tokio::spawn(async move {
        axum_server::bind_rustls(
            "127.0.0.1:0".parse().unwrap(),
            axum_server::tls_rustls::RustlsConfig::from_config(tls),
        )
        .handle(h2)
        .serve(fixture_server::router().into_make_service())
        .await
        .unwrap();
    });
    let h3 = handle.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(20)).await;
        h3.graceful_shutdown(None);
    });
    handle.listening().await.expect("server listening")
}

async fn https_get(
    cfg: Arc<rustls::ClientConfig>,
    addr: std::net::SocketAddr,
    host: &str,
    path: &str,
) -> std::io::Result<String> {
    let tcp = tokio::net::TcpStream::connect(addr).await?;
    let name = ServerName::try_from(host.to_string()).unwrap();
    let mut tls = tokio_rustls::TlsConnector::from(cfg)
        .connect(name, tcp)
        .await?;
    tls.write_all(
        format!("GET {path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n").as_bytes(),
    )
    .await?;
    let mut out = Vec::new();
    tls.read_to_end(&mut out).await?;
    Ok(String::from_utf8_lossy(&out).into_owned())
}

#[tokio::test]
async fn https_on_localhost_works_with_the_dev_ca() {
    let dir = test_ca_dir("ok");
    let leaf = ca::issue_leaf(&dir).unwrap();
    let addr = start(ca::server_config(&leaf).unwrap()).await;
    let cfg = client_config(&dir);
    let landing = https_get(cfg.clone(), addr, "localhost", "/landing")
        .await
        .unwrap();
    assert!(landing.starts_with("HTTP/1.1 200"), "{landing}");
    let redirect = https_get(cfg.clone(), addr, "localhost", "/redirect/307")
        .await
        .unwrap();
    assert!(redirect.starts_with("HTTP/1.1 307"), "{redirect}");
    let ip = https_get(cfg, addr, "127.0.0.1", "/status/404")
        .await
        .unwrap();
    assert!(ip.starts_with("HTTP/1.1 404"), "{ip}");
}

#[tokio::test]
async fn the_dev_ca_cannot_vouch_for_other_hosts() {
    // A leaf for example.com signed by the (name-constrained) dev CA must be rejected by the client.
    let dir = test_ca_dir("constraint");
    let ca_key =
        rcgen::KeyPair::from_pem(&std::fs::read_to_string(dir.join("ca-key.pem")).unwrap())
            .unwrap();
    let ca_pem = std::fs::read_to_string(ca::cert_path(&dir)).unwrap();
    // Rebuild the issuer exactly as the crate does (same name and key).
    let mut ca_params = rcgen::CertificateParams::default();
    let mut dn = rcgen::DistinguishedName::new();
    dn.push(rcgen::DnType::CommonName, ca::CA_NAME);
    dn.push(
        rcgen::DnType::OrganizationName,
        "Ferrum development (not a public CA)",
    );
    ca_params.distinguished_name = dn;
    let issuer = rcgen::Issuer::new(ca_params, ca_key);
    let mut p = rcgen::CertificateParams::new(vec!["example.com".to_string()]).unwrap();
    p.extended_key_usages = vec![rcgen::ExtendedKeyUsagePurpose::ServerAuth];
    let k = rcgen::KeyPair::generate().unwrap();
    let evil = p.signed_by(&k, &issuer).unwrap();
    let leaf = ca::Leaf {
        chain_pem: format!("{}{}", evil.pem(), ca_pem),
        key_pem: k.serialize_pem(),
    };
    let addr = start(ca::server_config(&leaf).unwrap()).await;
    let err = https_get(client_config(&dir), addr, "example.com", "/")
        .await
        .expect_err("must be rejected");
    let msg = err.to_string();
    eprintln!("rejection: {msg}");
    assert!(msg.contains("NameConstraintViolation"), "{msg}");
}
