# OWASP Top 10 Detection Classification

This document classifies each OWASP Top 10 vulnerability by detection method: pattern-visible (automated tool coverage) versus judgment-required (agent reasoning coverage). The security-review agent uses this classification to know what it must reason about versus what SAST has already handled.

---

## Classification Key

- **Tool-detectable**: Semgrep, SAST, or dependency scanners can find this reliably through pattern matching. The security-review agent should not duplicate this work; it should reference the tool output.
- **Partially tool-detectable**: Tools catch a subset of cases. The agent must reason about what falls outside pattern coverage.
- **Judgment-only**: No pattern match is meaningful. The agent must reason about the system's design, data flow, or threat model.

---

## A01 — Broken Access Control

**Classification**: Judgment-only

Tools can find missing middleware annotations or obvious missing auth guards, but cannot determine whether the authorization model is correct. The agent must:

- Trace whether every protected route or resource verifies that the authenticated principal has permission for the specific resource being accessed (not just that the user is authenticated)
- Check for horizontal privilege escalation: can user A access user B's data by changing an ID parameter?
- Verify server-side enforcement — client-side-only checks are a fail regardless of what tools report
- Examine indirect object references and whether the mapping layer validates ownership

SAST handles: nothing reliably. Do not skip this check based on a clean SAST report.

---

## A02 — Cryptographic Failures

**Classification**: Partially tool-detectable

Tool-detectable subset (semgrep/secret scan handles these):
- Hardcoded secrets, API keys, and credentials in source
- Use of deprecated or broken algorithms (MD5, SHA1, DES, RC4) in crypto calls
- Missing TLS enforcement flags in HTTP client configuration

Judgment-required subset (agent must reason):
- Key management practices: where are keys stored, rotated, and revoked?
- Protocol selection: is TLS version pinned? Is certificate validation disabled anywhere?
- Data classification: are fields that qualify as PII or financial data encrypted at rest?
- Whether hashing is used where encryption is required (one-way vs reversible)

---

## A03 — Injection

**Classification**: Mostly tool-detectable

Semgrep and SAST have strong coverage for:
- SQL injection via string concatenation or format strings into queries
- Command injection via unsanitized input to shell calls
- XSS via unsanitized output to HTML rendering
- LDAP, XML, and path traversal injection patterns

Judgment-required gaps the agent must cover:
- ORM query construction that bypasses parameterization (raw() calls, literal() helpers)
- Second-order injection where user input is stored then retrieved and used in a query
- Template injection in server-side rendering engines
- Injection through indirect inputs (file names, headers, environment variables) not covered by standard rules

When SAST is clean, the agent should still spot-check ORM usage and template rendering.

---

## A04 — Insecure Design

**Classification**: Judgment-only

No pattern-matching tool can evaluate whether a design is secure. The agent must:

- Assess whether the threat model matches the actual attack surface (what adversaries are assumed, what trust boundaries exist)
- Identify missing rate limiting, brute-force protection, or account lockout logic
- Check for missing business logic controls (e.g., can a user skip a required payment step by crafting a direct API call?)
- Evaluate whether sensitive operations require re-authentication or additional confirmation
- Look for missing audit trails on security-sensitive operations

SAST handles: nothing in this category.

---

## A05 — Security Misconfiguration

**Classification**: Partially tool-detectable

Tool-detectable subset:
- Default credentials left in configuration files
- Verbose error messages or stack traces exposed to users (pattern: exception detail in response body)
- Missing security headers (Content-Security-Policy, X-Frame-Options, Strict-Transport-Security)
- Debug mode enabled in production configuration files

Judgment-required subset (agent must reason):
- Whether the principle of least privilege is applied to service accounts and IAM roles
- Unnecessary features, endpoints, or services left enabled
- Whether cloud storage buckets, queues, or databases are publicly accessible
- Whether secrets management is used or secrets are passed as environment variables in plaintext

---

## A06 — Vulnerable and Outdated Components

**Classification**: Fully tool-detectable

Dependency scanning (npm audit, pip-audit, Dependabot, Snyk, OSV-scanner) handles this category completely. The security-review agent should:

- Reference the tool output rather than re-inspect dependencies manually
- Flag if no dependency scanner is configured (that absence is itself a finding)
- Escalate any critical or high CVE findings from the tool output into the review report

The agent adds no value by re-reading package.json or requirements.txt. Trust the scanner.

---

## A07 — Identification and Authentication Failures

**Classification**: Partially tool-detectable

Tool-detectable subset:
- Weak password policy configuration (min length, complexity flags in auth library config)
- Known-insecure session token generation (use of Math.random() or non-cryptographic RNG for tokens)

Judgment-required subset (agent must reason):
- Session fixation: is the session ID regenerated after login?
- Session expiry: are tokens invalidated on logout server-side, or only client-side?
- MFA coverage: are high-privilege operations protected by a second factor?
- Credential stuffing protections: is there account lockout or anomaly detection?
- "Remember me" token security: are persistent tokens stored and validated securely?

---

## A08 — Software and Data Integrity Failures

**Classification**: Judgment-only

The agent must reason about:
- Deserialization of untrusted data: does the code deserialize user-controlled input into objects without type validation?
- Whether CI/CD pipeline steps verify artifact integrity (checksums, signatures)
- Whether auto-update mechanisms verify the source and integrity of updates
- Plugin or extension loading: are dynamically loaded components from verified sources?

SAST can flag known-dangerous deserialization calls in specific libraries, but cannot assess whether the overall data integrity model is sound.

---

## A09 — Security Logging and Monitoring Failures

**Classification**: Partially tool-detectable

Tool-detectable subset:
- Absence of log statements around authentication events (pattern: login function with no logger call)
- Logging of sensitive fields (passwords, tokens, PII) in log statements

Judgment-required subset (agent must reason):
- Whether failed authentication attempts are logged with enough context to support incident response
- Whether high-privilege operations (admin actions, permission changes, data exports) produce audit records
- Log completeness: does the log capture who, what, when, and from where?
- Whether logs are written to a location that application code can tamper with or delete
- Whether monitoring and alerting are configured on the log output (out of scope for code review, but worth noting if log destination is unclear)

---

## A10 — Server-Side Request Forgery (SSRF)

**Classification**: Partially tool-detectable

Tool-detectable subset:
- URL construction from user-controlled input passed to HTTP client calls (semgrep has rules for common HTTP libraries)
- Redirects that follow user-supplied URLs without validation

Judgment-required subset (agent must reason):
- Whether the application has a URL allowlist and whether the allowlist validation can be bypassed (DNS rebinding, redirect chains, IPv6 bypass patterns)
- Whether internal network endpoints (metadata services, internal APIs, database admin UIs) are reachable from the service and whether user-controlled URLs could reach them
- File scheme, gopher scheme, or other non-HTTP schemes passed to URL parsers
- Whether the application processes document formats (SVG, PDF, HTML) that can trigger outbound requests during rendering

When SAST finds no URL construction patterns, the agent should still check whether the application processes any file formats that embed URLs.
