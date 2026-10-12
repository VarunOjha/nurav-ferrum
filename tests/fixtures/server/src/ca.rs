//! Local development certificate authority for the fixture server (owner decision Q-202, 2026-10-11).
//!
//! - The CA lives **outside the repository**, in `%LOCALAPPDATA%\Ferrum\dev-ca` (or `FERRUM_DEV_CA_DIR`):
//!   `ca-cert.pem` and `ca-key.pem`. The key is never committed.
//! - The CA is **name-constrained** to `localhost`, `127.0.0.0/8` and `::1`, so it cannot issue a certificate
//!   that a client would accept for any other host.
//! - The owner installs `ca-cert.pem` into his **user** certificate store with his own confirmation
//!   (`certutil -user -addstore Root ca-cert.pem` shows a Windows security prompt). Ferrum's real certificate
//!   checks are never weakened.

use std::path::{Path, PathBuf};
use std::sync::Arc;

use rcgen::{
    BasicConstraints, CertificateParams, CidrSubnet, DistinguishedName, DnType,
    ExtendedKeyUsagePurpose, GeneralSubtree, IsCa, Issuer, KeyPair, KeyUsagePurpose,
    NameConstraints,
};
use time::{Duration, OffsetDateTime};

/// Common name of the development CA.
pub const CA_NAME: &str = "Ferrum local development CA (this PC only, localhost)";

/// Errors from creating or loading the CA.
#[derive(Debug)]
pub enum CaError {
    /// File system error.
    Io(std::io::Error),
    /// Certificate generation or parsing error.
    Cert(rcgen::Error),
    /// TLS configuration error.
    Tls(rustls::Error),
    /// No CA exists yet (run `fixture-server ca init`).
    Missing(PathBuf),
}

impl std::fmt::Display for CaError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CaError::Io(e) => write!(f, "file error: {e}"),
            CaError::Cert(e) => write!(f, "certificate error: {e}"),
            CaError::Tls(e) => write!(f, "TLS error: {e}"),
            CaError::Missing(p) => write!(
                f,
                "no development CA in {} (run: fixture-server ca init)",
                p.display()
            ),
        }
    }
}

impl std::error::Error for CaError {}

impl From<std::io::Error> for CaError {
    fn from(e: std::io::Error) -> Self {
        CaError::Io(e)
    }
}
impl From<rcgen::Error> for CaError {
    fn from(e: rcgen::Error) -> Self {
        CaError::Cert(e)
    }
}
impl From<rustls::Error> for CaError {
    fn from(e: rustls::Error) -> Self {
        CaError::Tls(e)
    }
}

/// Default CA folder: `FERRUM_DEV_CA_DIR`, else `%LOCALAPPDATA%\Ferrum\dev-ca`.
pub fn default_dir() -> PathBuf {
    if let Some(d) = std::env::var_os("FERRUM_DEV_CA_DIR") {
        return PathBuf::from(d);
    }
    let base = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    base.join("Ferrum").join("dev-ca")
}

/// Path of the CA certificate inside `dir`.
pub fn cert_path(dir: &Path) -> PathBuf {
    dir.join("ca-cert.pem")
}

fn key_path(dir: &Path) -> PathBuf {
    dir.join("ca-key.pem")
}

fn ca_params() -> CertificateParams {
    let mut p = CertificateParams::default();
    let mut dn = DistinguishedName::new();
    dn.push(DnType::CommonName, CA_NAME);
    dn.push(
        DnType::OrganizationName,
        "Ferrum development (not a public CA)",
    );
    p.distinguished_name = dn;
    p.is_ca = IsCa::Ca(BasicConstraints::Constrained(0));
    p.key_usages = vec![
        KeyUsagePurpose::KeyCertSign,
        KeyUsagePurpose::CrlSign,
        KeyUsagePurpose::DigitalSignature,
    ];
    p.name_constraints = Some(NameConstraints {
        permitted_subtrees: vec![
            GeneralSubtree::DnsName("localhost".into()),
            GeneralSubtree::IpAddress(CidrSubnet::V4([127, 0, 0, 0], [255, 0, 0, 0])),
            GeneralSubtree::IpAddress(CidrSubnet::V6(
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                [0xff; 16],
            )),
        ],
        excluded_subtrees: vec![],
    });
    let now = OffsetDateTime::now_utc();
    p.not_before = now - Duration::days(1);
    p.not_after = now + Duration::days(730);
    p
}

/// Creates the CA in `dir` if it does not exist yet. Returns `true` when a new CA was written.
pub fn init(dir: &Path) -> Result<bool, CaError> {
    if cert_path(dir).exists() && key_path(dir).exists() {
        return Ok(false);
    }
    std::fs::create_dir_all(dir)?;
    let key = KeyPair::generate()?;
    let cert = ca_params().self_signed(&key)?;
    std::fs::write(key_path(dir), key.serialize_pem())?;
    std::fs::write(cert_path(dir), cert.pem())?;
    Ok(true)
}

/// A freshly signed leaf certificate for the loopback names, as PEM strings.
pub struct Leaf {
    /// Certificate chain PEM: the leaf followed by the CA certificate.
    pub chain_pem: String,
    /// Leaf private key PEM.
    pub key_pem: String,
}

/// Extra names on the leaf certificate (P3 task p3.6): separate test sites on this PC. Chromium sends every
/// `*.localhost` name to the loopback address, and the CA's name limit (`localhost`) covers them, so they need no
/// change to the system. `one.` and `two.site-a.localhost` share the registrable domain `site-a.localhost`.
pub const TEST_SITES: &[&str] = &[
    "site-a.localhost",
    "one.site-a.localhost",
    "two.site-a.localhost",
    "site-b.localhost",
];

/// Signs a new leaf certificate for `localhost`, the [`TEST_SITES`], `127.0.0.1` and `::1` with the CA in `dir`.
pub fn issue_leaf(dir: &Path) -> Result<Leaf, CaError> {
    if !cert_path(dir).exists() || !key_path(dir).exists() {
        return Err(CaError::Missing(dir.to_path_buf()));
    }
    let ca_pem = std::fs::read_to_string(cert_path(dir))?;
    let ca_key = KeyPair::from_pem(&std::fs::read_to_string(key_path(dir))?)?;
    // The issuer name and key match the stored CA (same deterministic distinguished name, same key).
    let issuer = Issuer::new(ca_params(), ca_key);
    let mut names = vec!["localhost".to_string()];
    names.extend(TEST_SITES.iter().map(|s| s.to_string()));
    names.extend(["127.0.0.1".to_string(), "::1".to_string()]);
    let mut params = CertificateParams::new(names)?;
    let mut dn = DistinguishedName::new();
    dn.push(DnType::CommonName, "localhost (Ferrum fixtures)");
    params.distinguished_name = dn;
    params.key_usages = vec![
        KeyUsagePurpose::DigitalSignature,
        KeyUsagePurpose::KeyEncipherment,
    ];
    params.extended_key_usages = vec![ExtendedKeyUsagePurpose::ServerAuth];
    let now = OffsetDateTime::now_utc();
    params.not_before = now - Duration::days(1);
    params.not_after = now + Duration::days(30);
    let leaf_key = KeyPair::generate()?;
    let leaf = params.signed_by(&leaf_key, &issuer)?;
    Ok(Leaf {
        chain_pem: format!("{}{}", leaf.pem(), ca_pem),
        key_pem: leaf_key.serialize_pem(),
    })
}

/// A rustls server configuration (ring provider) for a leaf from [`issue_leaf`].
pub fn server_config(leaf: &Leaf) -> Result<Arc<rustls::ServerConfig>, CaError> {
    use rustls::pki_types::pem::PemObject;
    use rustls::pki_types::{CertificateDer, PrivateKeyDer};
    let certs: Vec<CertificateDer<'static>> =
        CertificateDer::pem_slice_iter(leaf.chain_pem.as_bytes())
            .collect::<Result<_, _>>()
            .map_err(|e| CaError::Io(std::io::Error::other(e.to_string())))?;
    let key = PrivateKeyDer::from_pem_slice(leaf.key_pem.as_bytes())
        .map_err(|e| CaError::Io(std::io::Error::other(e.to_string())))?;
    let provider = Arc::new(rustls::crypto::ring::default_provider());
    let mut cfg = rustls::ServerConfig::builder_with_provider(provider)
        .with_safe_default_protocol_versions()?
        .with_no_client_auth()
        .with_single_cert(certs, key)?;
    cfg.alpn_protocols = vec![b"http/1.1".to_vec()];
    Ok(Arc::new(cfg))
}
