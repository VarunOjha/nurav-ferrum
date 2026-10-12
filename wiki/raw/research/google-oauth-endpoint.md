---
id: research-google-oauth-endpoint
type: research-note
title: "Google OAuth 2.0 authorization endpoint (for the p2.13 sign-in classifier)"
updated: 2026-10-11
sources:
  - https://accounts.google.com/.well-known/openid-configuration
  - https://developers.google.com/identity/protocols/oauth2/web-server
---

# Google OAuth 2.0 authorization endpoint (P2, task p2.13)

> Raw research note. Written by Claude in session s02. **Access date for every URL: 2026-10-11.**
> Labels: **VERIFIED** = read in the primary page fetched in this session; **UNCERTAIN** = not read in a primary
> source. Pages were read through a fetch tool that summarises; quoted text is what the tool returned from the page.
> The policy reason (Google forbids OAuth requests from embedded user-agents) is already recorded in
> [tauri-webview2-capabilities.md](tauri-webview2-capabilities.md) section 8; this note only pins the addresses.

## G1. Google's OpenID discovery document

- URL: https://accounts.google.com/.well-known/openid-configuration
- **VERIFIED** values: `"issuer": "https://accounts.google.com"`, `"authorization_endpoint":
  "https://accounts.google.com/o/oauth2/v2/auth"`, `"device_authorization_endpoint":
  "https://oauth2.googleapis.com/device/code"`, `"token_endpoint": "https://oauth2.googleapis.com/token"`.
- Use for Ferrum: the address a page sends the browser to when it starts a Google sign-in is the authorization
  endpoint. The token and device endpoints are called by servers or devices, not opened as pages, so the classifier
  does not need them.

## G2. "Using OAuth 2.0 for Web Server Applications" (Google for Developers)

- URL: https://developers.google.com/identity/protocols/oauth2/web-server
- **VERIFIED** quote: "Google's OAuth 2.0 endpoint is at `https://accounts.google.com/o/oauth2/v2/auth`. This
  endpoint is accessible only over HTTPS."
- **VERIFIED** quote (error list): "The authorization endpoint is displayed inside an embedded user-agent disallowed
  by Google's OAuth 2.0 Policies." (the `disallowed_useragent` error).
- No last-updated date was visible in the fetched content.

## Not established here

- **UNCERTAIN**: older or alternative entry paths (for example `/o/oauth2/auth` without `v2`, or the pages Google's
  sign-in moves through after the authorization endpoint). Ferrum's P2 classifier matches the authorization endpoint
  path family `/o/oauth2/` on `accounts.google.com` over https; a wider list needs a new note with sources.
- **UNCERTAIN**: whether Google refuses sign-in in a Ferrum (WebView2) view in practice. Observe, never circumvent
  (adr-0015).
