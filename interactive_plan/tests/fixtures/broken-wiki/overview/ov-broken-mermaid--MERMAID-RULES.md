---
id: ov-broken-mermaid
type: overview
title: "Broken fixture overview"
status: draft
updated: 2026-10-08
sources:
  - raw/00-broken-source.md
related: []
approvable: true
---

# Mermaid

```mermaid
flowchart LR
  a["A<br>line"] --> b["B"]
  click a callback
```

```mermaid
classDiagram
  class Host {
    <<trait>>
  }
```

```mermaid
sequenceDiagram
  A->>B: one; two
  A->>B: escaped #59; is fine
```
