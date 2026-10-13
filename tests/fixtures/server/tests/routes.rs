//! Every documented route answers with its documented status code (no network, no TLS).

use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use fixture_server::{ROUTES, router};
use tower::ServiceExt;

async fn get(path: &str) -> axum::response::Response {
    router()
        .oneshot(Request::builder().uri(path).body(Body::empty()).unwrap())
        .await
        .unwrap()
}

#[tokio::test]
async fn every_route_returns_its_documented_status() {
    for r in ROUTES {
        let path = if r.path.starts_with("/slow") {
            "/slow?ms=10"
        } else {
            r.path
        };
        let res = get(path).await;
        assert_eq!(res.status().as_u16(), r.status, "{}", r.path);
    }
}

#[tokio::test]
async fn redirects_point_where_documented() {
    for code in ["301", "302", "303", "307", "308"] {
        let res = get(&format!("/redirect/{code}")).await;
        assert_eq!(res.headers()[header::LOCATION], "/landing", "{code}");
    }
    assert_eq!(
        get("/redirect/chain").await.headers()[header::LOCATION],
        "/redirect/302"
    );
    assert_eq!(
        get("/redirect/loop").await.headers()[header::LOCATION],
        "/redirect/loop"
    ); // p4.3: a redirect to another host, and nothing that is not https or a path.
    assert_eq!(
        get("/goto?url=https://127.0.0.1:8443/landing")
            .await
            .headers()[header::LOCATION],
        "https://127.0.0.1:8443/landing"
    );
    assert_eq!(
        get("/goto?url=javascript:alert(1)").await.status(),
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        get("/goto?url=//evil.test/").await.status(),
        StatusCode::BAD_REQUEST
    );
}

#[tokio::test]
async fn cookie_is_set_secure_and_read_back() {
    let set = get("/cookie/set").await;
    let c = set.headers()[header::SET_COOKIE].to_str().unwrap();
    assert!(
        c.starts_with("fixture=1") && c.contains("Secure") && c.contains("HttpOnly"),
        "{c}"
    );
    let read = router()
        .oneshot(
            Request::builder()
                .uri("/cookie/read")
                .header(header::COOKIE, "fixture=1")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body = axum::body::to_bytes(read.into_body(), 1 << 20)
        .await
        .unwrap();
    assert!(String::from_utf8_lossy(&body).contains("fixture=1"));
}

#[tokio::test]
async fn slow_page_waits_and_is_capped() {
    let t = std::time::Instant::now();
    assert_eq!(get("/slow?ms=200").await.status(), StatusCode::OK);
    assert!(t.elapsed() >= std::time::Duration::from_millis(200));
}

#[tokio::test]
async fn link_pages_contain_their_links() {
    let blank = axum::body::to_bytes(get("/links/blank").await.into_body(), 1 << 20)
        .await
        .unwrap();
    let blank = String::from_utf8_lossy(&blank);
    assert!(blank.contains("target=\"_blank\"") && blank.contains("window.open"));
    let schemes = axum::body::to_bytes(get("/links/schemes").await.into_body(), 1 << 20)
        .await
        .unwrap();
    let schemes = String::from_utf8_lossy(&schemes);
    assert!(schemes.contains("mailto:") && schemes.contains("ferrum-test:"));
}

#[tokio::test]
async fn downloads_are_deterministic_and_named() {
    let res = get("/download/file?bytes=1000").await;
    assert_eq!(
        res.headers()[header::CONTENT_DISPOSITION],
        "attachment; filename=\"fixture-1000.bin\""
    );
    let body = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        body.as_ref(),
        fixture_server::download_bytes(1000).as_slice()
    );
    assert_eq!(fixture_server::download_bytes(3), vec![7, 38, 69]);
    let fail = get("/download/fail").await;
    assert_eq!(fail.headers()[header::CONTENT_LENGTH], "1048576");
}

#[tokio::test]
async fn frames_and_links_only_point_to_https_or_this_site() {
    for bad in [
        "/frame?src=javascript:alert(1)",
        "/frame?src=//evil.example/",
        "/links/to?href=http://plain.example/",
        "/frame",
    ] {
        assert_eq!(get(bad).await.status(), StatusCode::BAD_REQUEST, "{bad}");
    }
    let ok = get("/frame?src=https://site-b.localhost:8443/cookie/read%22onload=x").await;
    let body = axum::body::to_bytes(ok.into_body(), usize::MAX)
        .await
        .unwrap();
    let text = String::from_utf8_lossy(&body);
    assert!(text.contains("&quot;onload=x"), "{text}");
}
