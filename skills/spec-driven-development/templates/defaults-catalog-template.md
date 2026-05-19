# Project Defaults Catalog

**Purpose:** This file is the **only** place the spec-driven workflow is allowed to apply project-wide defaults. If a piece of information is required by the spec template and is not present in either (a) the engineer's input or (b) this catalog, the agent MUST mark it `[NEEDS CLARIFICATION: not in defaults catalog]` rather than choose a value.

**Why:** Per project policy, the engineer fills gaps, not the agent. Silent agent assumptions are forbidden. This catalog makes every default visible, version-controlled, and reviewable. Adding a new default is an explicit edit to this file.

**Created:** [YYYY-MM-DD]
**Last amended:** [YYYY-MM-DD]
**Maintainer:** [Engineer name + role]

---

## How to Use

- The agent reads this file at the start of every Specify, Import, or Amend phase.
- Every default the agent applies MUST be cited by section + bullet ID (e.g., `D-AUTH-1`).
- Adding, modifying, or removing a default is an engineer-authored edit to this file. The agent MUST NOT extend the catalog itself.
- If a default applies in some contexts but not others, write the context as part of the bullet (e.g., "applies to public-facing APIs only").
- When the catalog and the engineer's input conflict, the engineer's input wins; the agent records the conflict in the spec under a `## Defaults Overridden` section.

---

## Authentication & Authorisation

- **D-AUTH-1**: [Default authentication mechanism for new public APIs. Example: "OAuth2 authorisation_code flow with refresh tokens."]
- **D-AUTH-2**: [Default for service-to-service. Example: "mTLS with internal CA at infra/cert-authority."]
- **D-AUTH-3**: [Default authorisation model. Example: "RBAC via the existing `auth.policy` service; deny-by-default."]

## Storage & Persistence

- **D-STORE-1**: [Default relational store. Example: "PostgreSQL 15 in the project's RDS cluster."]
- **D-STORE-2**: [Default object store. Example: "S3 with bucket-per-environment naming `acme-{env}-{purpose}`."]
- **D-STORE-3**: [Default cache. Example: "Redis 7 in cluster mode for session and rate-limit data."]
- **D-STORE-4**: [Default backup policy. Example: "Daily snapshots, 30-day retention; tested quarterly."]

## Performance & Scale

- **D-PERF-1**: [Default p95 latency target for user-facing endpoints. Example: "≤200 ms at the load defined per-feature."]
- **D-PERF-2**: [Default availability target. Example: "99.9% monthly per service; 99.95% for the API gateway."]
- **D-PERF-3**: [Default throughput baseline. Example: "Each new endpoint sized for at least 100 RPS sustained on a single replica."]

## Observability

- **D-OBS-1**: [Required structured-log fields. Example: "request_id, user_id (or anonymous), feature, action, duration_ms, status."]
- **D-OBS-2**: [Required metrics for each endpoint. Example: "RED: requests_total, errors_total, request_duration_seconds (histogram)."]
- **D-OBS-3**: [Required trace span. Example: "OpenTelemetry span per request with attributes matching D-OBS-1."]
- **D-OBS-4**: [Default alert thresholds. Example: "p95 latency > 2× target for 5 min → page; error rate > 1% for 5 min → page."]

## Security

- **D-SEC-1**: [Default secret-management mechanism. Example: "AWS Secrets Manager; never inlined; loaded at startup."]
- **D-SEC-2**: [Default crypto. Example: "Ciphers: AES-256-GCM (data at rest), ChaCha20-Poly1305 (data in transit), Ed25519 (signatures)."]
- **D-SEC-3**: [Default input validation. Example: "All external inputs validated against an explicit schema; reject by default."]
- **D-SEC-4**: [Default security review trigger. Example: "Any new endpoint exposing user data or accepting file uploads requires security-auditor sign-off before /finish."]

## Data Handling

- **D-DATA-1**: [Default retention. Example: "User-generated content retained 7 years; access logs retained 90 days; debug logs retained 14 days."]
- **D-DATA-2**: [Default PII handling. Example: "Email and name are PII; hashed in logs; never sent to third parties without explicit user opt-in."]
- **D-DATA-3**: [Default backup integrity. Example: "Every backup includes integrity checksum; quarterly restore drill."]

## Testing

- **D-TEST-1**: [Default test framework. Example: "pytest for Python services; cargo test for Rust crates; flutter test for Flutter."]
- **D-TEST-2**: [Default test categories. Example: "Each feature has contract tests + integration tests + unit tests; UI flows have e2e tests."]
- **D-TEST-3**: [Default test data policy. Example: "Tests use real database (Postgres in CI); never mock the DB."]
- **D-TEST-4**: [Default coverage gate. Example: "New code: ≥80% line coverage in CI; declining coverage fails the build."]

## Error Handling & Resilience

- **D-RES-1**: [Default retry policy. Example: "Exponential backoff with jitter, max 3 attempts, only on idempotent operations."]
- **D-RES-2**: [Default circuit-breaker policy. Example: "Open after 5 consecutive failures; half-open after 30 s."]
- **D-RES-3**: [Default graceful-degradation policy. Example: "When a non-critical dependency is down, return cached or partial data with X-Stale-Data header."]

## Internationalisation & Accessibility

- **D-I18N-1**: [Default supported locales. Example: "en-US (canonical); other locales: only when product explicitly requests."]
- **D-A11Y-1**: [Default accessibility target. Example: "WCAG 2.2 AA for user-facing surfaces."]

## Project-Specific

- **D-PROJ-1**: [Project-specific default — e.g., "Atlas P2P features default to iroh QUIC transport with mDNS + DHT discovery."]
- **D-PROJ-2**: [Project-specific default — e.g., "Python BE features default to Django 4.2 + DRF + Celery; new modules go under modules/."]

---

## Removed / Deprecated Defaults

When a default is removed, move it here with a `**Reason:**` line. Do not delete — the historical record matters when reviewing old specs.

- *(empty)*

---

## Catalog Discipline

- The agent MUST cite the bullet ID (e.g., `D-AUTH-1`) in `spec.md §Assumptions` whenever it applies a default from this catalog.
- The agent MUST NOT silently apply a default that is not in this catalog.
- When the catalog itself contains placeholders (`[Default …]` text), the agent MUST treat the placeholder as a `[NEEDS CLARIFICATION]` and flag the spec accordingly.
