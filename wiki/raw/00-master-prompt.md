# RAW SOURCE — Ferrum master prompt (verbatim, as supplied by the project owner on 2026-10-08)

> Immutable raw source. Do not edit. Owner override recorded in `01-scoping-decisions.md`:
> the final instruction "Start implementation now. Do not stop after producing only a plan…" is
> **explicitly cancelled** by the owner. Planning + approval comes first.

---

# CLAUDECODE MASTER PROMPT
## Project: Ferrum — Resource-Efficient Web Application Container

### 1. Your Role

You are acting as a Principal Rust Engineer, Windows Systems Engineer, Browser Performance Engineer, Security Engineer, and Experimental Systems Researcher.

Your task is to design, implement, benchmark, document, and test an open-source Rust desktop application called **Ferrum**.

Ferrum is a lightweight, security-conscious web application container built using Rust, Tauri, and Microsoft WebView2.

The project must also produce a rigorous, reproducible experimental framework comparing Ferrum against Google Chrome, Microsoft Edge, and an unoptimized Tauri baseline.

The long-term objective is to investigate whether intelligent WebView lifecycle management, resource isolation, and adaptive policies can reduce resource consumption while preserving website compatibility, usability, and security.

The deliverables must support a legitimate open-source research publication. Do not fabricate scientific novelty, experimental results, citations, statistical significance, or performance improvements.

---

### 2. Primary Objectives

Build a functioning Windows desktop application with the following properties:

1. Load arbitrary HTTPS websites using WebView2.
2. Provide a minimal, modern browser-like interface.
3. Support multiple tabs, navigation, redirects, and session persistence.
4. Implement configurable security policies.
5. Support website isolation where technically feasible.
6. Minimize memory, CPU, and energy consumption.
7. Introduce an experimental adaptive WebView lifecycle manager.
8. Collect reliable process-level performance telemetry.
9. Compare performance against Chrome, Edge, and baseline Tauri.
10. Produce reproducible benchmark results and research artifacts.
11. Dumps network call logs of browser to a folder for review of activity

Prioritize correctness, security, observability, and reproducibility over premature optimization.

### 3. Development Environment

Target platform:

- Windows 11 x64
- Rust stable toolchain
- Tauri 2.x
- Microsoft WebView2
- Tokio for asynchronous Rust operations
- Serde for serialization
- Tracing for structured diagnostics
- Windows APIs where necessary
- Playwright for supported browser automation
- Python for statistical analysis and visualizations

Prefer current stable versions of dependencies.

Verify API compatibility against official documentation before implementation.

Use established, maintained crates wherever possible.

Avoid unnecessary dependencies.

Do not assume Tauri exposes every WebView2 feature directly. When necessary, investigate lower-level integrations and document their limitations.

### 4. Architecture

Implement the following logical components:

**Application Shell**

Responsibilities:
- Window creation
- Custom navigation controls
- Tab management
- Address bar
- Sidebar
- Keyboard shortcuts
- Settings interface
- Split-view support in a later phase

**WebView Manager**

Responsibilities:
- Create and destroy WebViews
- Manage navigation
- Track lifecycle state
- Manage persistent sessions
- Handle external links
- Handle downloads
- Support site-specific configuration

**Security Policy Engine**

Responsibilities:
- Domain allowlists and blocklists
- Permission management
- Navigation interception
- External protocol handling
- Native API access restrictions
- Secure session configuration
- Security audit logging

**Resource Manager**

Responsibilities:
- Track process memory
- Track CPU usage
- Track WebView activity
- Identify inactive sessions
- Apply lifecycle policies
- Reclaim resources where supported
- Restore discarded sessions

**Telemetry Engine**

Responsibilities:
- Collect resource metrics
- Track navigation performance
- Measure startup latency
- Record lifecycle transitions
- Export structured benchmark datasets
- Track experiment metadata

**Benchmark Harness**

Responsibilities:
- Launch benchmark targets
- Execute repeatable workloads
- Collect measurements
- Validate workload equivalence
- Run repeated experiments
- Export raw results
- Generate statistical summaries

**Research Analysis**

Responsibilities:
- Compare configurations
- Calculate confidence intervals
- Estimate effect sizes
- Produce publication-quality plots
- Document limitations
- Generate reproducible analysis reports

### 5. Core Application Features

Implement incrementally.

**Phase 1: Minimal WebView Container**

Build a functioning application capable of:

- Opening a configurable HTTPS website
- Navigating backward and forward
- Refreshing the current page
- Displaying the current URL
- Handling HTTP redirects
- Handling internal navigation
- Handling external links
- Managing cookies and persistent sessions
- Displaying loading and error states
- Opening developer tools in development builds

Use secure defaults.

Do not expose privileged Rust functionality to untrusted website content.

Do not bypass certificate validation.

Do not weaken Chromium sandboxing.

Do not bypass OAuth provider restrictions on embedded browsers.

**Phase 2: Multi-Website Container**

Add:

- Multiple tabs
- Tab creation and closure
- Tab switching
- Configurable startup websites
- Keyboard shortcuts
- Session restoration
- Configurable per-site settings
- Navigation history
- Basic download management

Ensure the UI remains responsive when individual websites are computationally expensive.

**Phase 3: Security Controls**

Implement:

- Navigation policy enforcement
- External URL handling
- Permission controls
- Secure download behavior
- Session storage configuration
- Origin-aware policy evaluation
- Logging of denied actions
- Restricted native capability exposure

Investigate the feasibility of independent WebView2 user-data directories and profile isolation.

Document precisely which resources remain shared.

Do not claim complete process or security isolation without validating it.

**Phase 4: Resource Management**

Implement lifecycle states:

- ACTIVE
- BACKGROUND
- IDLE
- DISCARD_CANDIDATE
- DISCARDED
- RESTORING

Build a configurable state machine that manages transitions.

Possible inputs:

- Last user interaction
- Current memory pressure
- Website activity
- Session restoration cost
- Media playback state
- Active downloads
- User-configured exclusions
- Unsaved form risk

Initially implement deterministic policies.

Later implement an experimental adaptive policy.

Never discard a session during a potentially destructive operation without an explicit safety mechanism.

### 6. Adaptive Lifecycle Research

Investigate whether resource-aware lifecycle policies can outperform fixed idle-time policies.

Compare at least four strategies:

1. No application-level lifecycle management.
2. Fixed idle-time discard policy.
3. Memory-pressure-based discard policy.
4. Adaptive cost-aware lifecycle policy.

Investigate an objective function:

J = αM + βE + γL

Where:

- M = normalized memory consumption
- E = normalized energy consumption
- L = normalized session restoration latency
- α, β, γ = experimentally chosen weights

Document how each variable is measured and normalized.

Do not assume this objective function or policy is scientifically novel.

Conduct a literature review before claiming novelty.

Implement policies behind feature flags so identical workloads can be evaluated under different configurations.

### 7. Performance Benchmark Dimensions

Build an automated benchmark suite covering the following dimensions.

**Memory**

Measure:

- Idle process memory
- Active browsing memory
- Peak committed memory
- Private bytes
- Working set
- Process-tree aggregate memory
- Memory after tab creation
- Memory after tab closure
- Memory after session restoration
- Memory after repeated navigation
- Memory under memory pressure

Distinguish private memory from shared physical pages.

Avoid misleading aggregation of shared working sets.

**CPU**

Measure:

- Idle CPU utilization
- CPU time during navigation
- CPU during JavaScript-heavy workloads
- CPU during scrolling
- Background CPU consumption
- CPU during session restoration

**Startup**

Measure:

- Cold startup
- Warm startup
- Time to window visibility
- Time to first meaningful render
- Time to interactive state

Define each timing boundary precisely.

**Navigation**

Measure:

- Same-origin navigation
- Cross-origin navigation
- HTTP redirects
- Back/forward navigation
- Cached navigation
- Uncached navigation
- p50, p95, and p99 latency where sample sizes support them

**Rendering**

Measure:

- Scrolling smoothness
- Frame latency
- Dropped frames
- Animation responsiveness
- Canvas performance
- WebGL performance where supported

**Energy**

Investigate:

- Idle energy consumption
- Active browsing energy consumption
- Video playback energy
- Background session energy
- Energy per completed workload

Use reliable platform-specific measurement methods.

If hardware or software does not support defensible energy measurement, mark the dimension unsupported rather than inventing estimates.

**Reliability**

Measure:

- Crash frequency
- Session restoration success
- Recovery time
- Navigation failures
- Memory growth over long-running sessions
- Behavior after network interruptions

**Security Overhead**

Measure:

- Navigation policy evaluation latency
- Permission enforcement overhead
- Session isolation overhead
- Additional memory attributable to security controls

Separate security correctness tests from performance measurements.

### 8. Benchmark Competitors

Compare:

A. Google Chrome

B. Microsoft Edge

C. Minimal Tauri + WebView2 baseline

D. Ferrum without adaptive resource management

E. Ferrum with adaptive resource management

Ensure the comparisons are fair.

Use equivalent:

- Website workloads
- Viewport sizes
- Network conditions
- Cache policies
- Authentication state
- Browser extensions configuration
- Background throttling policies
- Hardware configuration

Do not disable Chrome or Edge resource-saving features merely to improve Ferrum's results.

Record browser versions, WebView2 runtime versions, operating system versions, and benchmark configurations.

### 9. Benchmark Workloads

Create controlled synthetic workloads representing:

1. Static informational website
2. JavaScript-heavy single-page application
3. Large DOM website
4. Continuous scrolling
5. Frequent navigation
6. Video playback
7. Canvas/WebGL application
8. Multiple simultaneously active sessions
9. Many background sessions
10. Repeated session destruction and restoration

Use controlled local test pages whenever possible to reduce variability.

Add representative public websites as supplementary real-world workloads.

Avoid depending exclusively on live third-party websites because content and network behavior can change between experiments.

### 10. Experimental Methodology

For each benchmark:

- Record the hardware configuration.
- Record operating system details.
- Record dependency and runtime versions.
- Define workload parameters.
- Specify warmup behavior.
- Execute repeated independent trials.
- Randomize or counterbalance test order.
- Record raw measurements.
- Capture failure conditions.
- Preserve experiment metadata.

Target at least 30 independent trials per major configuration where practical.

Use appropriate statistical techniques rather than assuming a particular sample count guarantees validity.

Analyze:

- Mean
- Median
- Standard deviation
- p95 latency
- Confidence intervals
- Effect sizes
- Relative differences
- Statistical uncertainty

Use bootstrap confidence intervals where appropriate.

Clearly distinguish statistically detectable effects from practically meaningful improvements.

Do not cherry-pick successful runs.

### 11. Security Testing

Build automated tests for:

- Blocked-domain navigation
- External protocol handling
- Unauthorized native command invocation
- Cross-origin access attempts
- Permission denial
- Session data isolation
- Download handling
- Redirect-based policy bypass
- Malformed URL handling
- Application recovery after renderer crashes

Use harmless, controlled security test fixtures.

Never weaken WebView2 security protections to improve benchmark results.

Document the threat model and the security properties actually enforced.

### 12. Research Artifacts

Maintain the following repository structure:

```text
ferrum/
├── apps/
│   └── desktop/
├── crates/
│   ├── core/
│   ├── webview-manager/
│   ├── security/
│   ├── resource-manager/
│   └── telemetry/
├── benchmarks/
│   ├── workloads/
│   ├── runners/
│   ├── configurations/
│   └── results/
├── experiments/
│   ├── baseline/
│   ├── lifecycle/
│   ├── isolation/
│   └── security/
├── analysis/
│   ├── scripts/
│   ├── notebooks/
│   └── figures/
├── research/
│   ├── literature/
│   ├── methodology/
│   ├── hypotheses/
│   └── paper/
├── docs/
├── tests/
├── scripts/
├── README.md
├── ARCHITECTURE.md
├── SECURITY.md
├── BENCHMARKING.md
├── REPRODUCIBILITY.md
├── AI_USAGE.md
└── LICENSE
```

Keep generated measurements separate from source code.

Do not commit private authentication tokens, browser profiles, or sensitive browsing information.

### 13. Research Paper

Prepare a research manuscript with the working title:

**Adaptive Resource Management for Chromium-Based Desktop Web Containers: Design and Experimental Evaluation**

Suggested sections:

1. Abstract
2. Introduction
3. Background and Related Work
4. Research Questions
5. System Architecture
6. Adaptive Resource Management
7. Experimental Methodology
8. Results
9. Security and Usability Tradeoffs
10. Threats to Validity
11. Related Work
12. Conclusion
13. References

Use an established academic LaTeX template appropriate to the eventual venue.

Do not write a results section claiming improvements until experiments have actually been completed.

Maintain a traceable relationship between:

- Research questions
- Hypotheses
- Experiments
- Raw data
- Statistical analyses
- Figures
- Conclusions

Verify every academic citation against an actual publication.

Do not invent citations, authors, DOIs, or conference proceedings.

### 14. Research Integrity and AI Disclosure

AI assistance is permitted for:

- Code generation
- Architecture exploration
- Test generation
- Experiment orchestration
- Data analysis assistance
- Technical writing assistance

However:

- All reported measurements must originate from actual experiments.
- All research claims must be independently verified.
- All references must be authentic.
- All statistical calculations must be reproducible.
- Human authors must remain responsible for the research.
- AI usage must be documented according to applicable publication policies.

Create `AI_USAGE.md` describing the categories of AI assistance.

Maintain an experiment log documenting design decisions, hypotheses, failed experiments, and subsequent revisions.

Do not manufacture evidence of research impact, external adoption, independent citations, or peer review.

### 15. Engineering Quality Requirements

Use:

- Idiomatic Rust
- Modular architecture
- Explicit error handling
- Structured logging
- Unit tests
- Integration tests
- Reproducible builds
- Dependency auditing
- Automated formatting
- Clippy
- CI workflows

Prefer small, independently testable modules.

Avoid unnecessary abstractions.

Do not introduce unsafe Rust without documenting the need and invariants.

Every optimization must have an associated benchmark demonstrating its effects.

### 16. Implementation Strategy

Work in incremental milestones.

**Milestone 1 — Working Desktop Application**

Deliver:

- Compilable Tauri application
- Functional WebView
- URL navigation
- Back/forward controls
- Refresh
- Basic error handling
- Documentation
- Smoke tests

**Milestone 2 — Multi-Tab Functionality**

Deliver:

- Tab manager
- Session management
- Persistent settings
- Navigation controls
- UI improvements
- Integration tests

**Milestone 3 — Security**

Deliver:

- Navigation policy engine
- Permission controls
- Origin-aware capability restrictions
- Security tests
- Threat model documentation

**Milestone 4 — Telemetry**

Deliver:

- Process metrics collection
- Startup measurements
- Navigation measurements
- Structured CSV/JSON exports
- Validation tests

**Milestone 5 — Benchmark Harness**

Deliver:

- Chrome and Edge automation
- Ferrum automation
- Controlled workloads
- Experiment configuration system
- Repeatable benchmark execution

**Milestone 6 — Adaptive Resource Manager**

Deliver:

- Lifecycle state machine
- Fixed-time policies
- Memory-pressure policies
- Adaptive policy prototype
- Safety tests
- Comparative benchmarks

**Milestone 7 — Research**

Deliver:

- Literature review
- Experiment results
- Statistical analysis
- Publication figures
- Draft manuscript
- Reproducibility instructions

### 17. How You Must Work

Do not attempt to implement the entire project in one response.

First inspect the repository and development environment.

Then:

1. Identify the current state.
2. Create or update a detailed implementation plan.
3. Identify technical risks.
4. Select the smallest useful milestone.
5. Implement that milestone.
6. Compile the code.
7. Run tests.
8. Fix failures.
9. Document what was accomplished.
10. Identify the next milestone.

Use actual tool execution to validate your work.

Never claim code compiled, tests passed, or benchmarks succeeded unless those actions were executed and their outcomes observed.

If the development environment is missing a dependency, document the issue and provide the exact setup instructions.

Do not silently substitute mock performance results for real measurements.

### 18. Initial Assignment

Begin with Milestone 1.

Before writing application code:

1. Inspect the operating system and Rust environment.
2. Verify the installed Rust and Node.js toolchains.
3. Verify the availability of WebView2.
4. Confirm compatible stable Tauri dependencies.
5. Review relevant Tauri security architecture.
6. Create `ARCHITECTURE.md`.
7. Create `RESEARCH_PLAN.md`.
8. Create a milestone checklist.

Then implement the smallest functioning Rust + Tauri application that can load an HTTPS website.

The initial application should support navigation, refresh, and back/forward operations.

It should not expose unnecessary native functionality to remote website content.

Build and test the application.

At the end, report:

- Files created or modified
- Architectural decisions
- Commands executed
- Test results
- Known limitations
- Security considerations
- Next recommended milestone

~~**Start implementation now. Do not stop after producing only a plan unless the environment prevents implementation.**~~ *(cancelled by owner — see 01-scoping-decisions.md)*
