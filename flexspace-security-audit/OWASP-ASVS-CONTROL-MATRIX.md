# OWASP ASVS Control Matrix — FlexSpace Iloilo

| Field | Value |
|---|---|
| **Target** | `https://flexspace-z079.onrender.com` (API) · `https://flexspace-iloilo.vercel.app` (frontend) |
| **Source assessed** | `/home/khent/flexspace` — `github.com/500-Pesos-Noche-Buena/flexspace` (177 commits, `main`) |
| **Assessment date** | 22 Oct 2026 |
| **Code changes made** | **None.** Read-only assessment. |
| **ASVS v4.0.3 source** | `OWASP/ASVS` tag `v4.0.3` → `4.0/docs_en/OWASP Application Security Verification Standard 4.0.3-en.csv` — 286 requirements |
| **ASVS v5.0.0 source** | `OWASP/ASVS` tag `v5.0.0_release` → `5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv` — 345 requirements |
| **Companion documents** | `OWASP-SECURITY-ASSESSMENT.md` · `OWASP-WSTG-COVERAGE-REMEDIATION-PLAN.md` · `SECURITY-PENTEST-REPORT.md` (Part A) · `SECURITY-PENTEST-REPORT-SANDBOX.md` (Part B) |
| **Result** | **ASVS v4.0.3 L1 / L2 / L3 — ALL DENIED** · **ASVS v5.0.0 — DENIED** |

---

## 0. How to read this document

**Level notation.** `L123` means the requirement is mandated at Level 1, Level 2 **and** Level 3. `L23` means Level 2 and Level 3. `L3` means Level 3 only. Levels come from the official English CSVs — they are not estimated.

**Verdict notation.**

| Verdict | Meaning |
|---|---|
| `FAIL` | The requirement was verified against the running system and/or the source, and it is **not** satisfied |
| `PARTIAL` | Some of the requirement's substance is satisfied, but not enough to satisfy it |
| `PASS*` | Satisfied in practice, but by an *accident of implementation* rather than by an explicit control — this is **not** a durable pass and will regress without an explicit control |
| `PASS` | Verified satisfied, with an explicit control behind it |

**Scope of counting.** Only requirements that were **explicitly assessed** appear in the tables below. Requirements that were not individually verified are omitted rather than assumed passing. Consequently the failure counts are a **floor**, not a ceiling — the true number of failing requirements is at least this high. Of the 127 mandated Level 1 requirements, only 42 have been assessed; the remaining 85 are unverified.

**Revision note (Part B reconciliation).** This matrix was extended from 99 to 122 rows when the second assessment was reconciled into the review. Nine v4 rows and fourteen v5 rows were added, and **five verdicts were corrected** (`V7.1.1` PASS → FAIL, `V5.1.2` PASS\* → FAIL, `V15.3.3` PASS\* → FAIL, `V12.1.1` PASS → PARTIAL, `V13.4.2` PASS → PARTIAL). The previously published v4 counts (35 / 56 / 58) and v5 counts (19 / 39 / 41) were manual tallies and were inaccurate; they have been replaced with script-derived figures.

**Conformance rule.** ASVS conformance is all-or-nothing per level: a Level 1 claim requires that **every** L1 requirement passes. The failure counts below therefore deny every level.

---

## 1. ASVS v4.0.3 — conformance verdict

| Level | Requirements in level | Assessed rows | Failed | Conformance |
|---|---|---|---|---|
| **Level 1** | 127 | 42 | **33** | **DENIED** |
| **Level 2** | 253 | 64 | **54** | **DENIED** |
| **Level 3** | 273 | 66 | **55** | **DENIED** |

> The three counts are cumulative (an L2 requirement also counts as an L1 requirement), which is why the numbers increase by level. A Level 1 claim is impossible as soon as one L1 requirement fails — and 33 fail.
>
> **Counting rule.** "Failed" counts rows whose verdict is `FAIL`. A further 3 / 4 / 5 rows at L1 / L2 / L3 are `PARTIAL` — controls that are present but incomplete; they also block a conformance claim, so the effective non-conforming totals are **36 / 58 / 60**. All three figures are computed mechanically from the matrix rows in §2 against the official CSV, not tallied by hand.
>
> **Correction.** The previous figures in this document (35 / 56 / 58) were a manual tally and were over-stated by 2–3 at each level. The table above supersedes them.

### 1.1 Failure distribution by ASVS v4.0.3 chapter

| Chapter | Chapter name | Failed | Partial | Dominant findings |
|---|---|---|---|---|
| **V1** | Architecture, Design and Threat Modeling | 8 | — | C1, C2, C3, C4, C5, M5, M9, L1, L4, FLEX-01 |
| **V2** | Authentication | 4 | — | M8, M9, H5, FLEX-01, FLEX-07, FLEX-17, FLEX-22 |
| **V3** | Session Management | 5 | — | C3, C4, FLEX-20, FLEX-28 |
| **V4** | Access Control | 3 | — | C1, C2, M5, M6, M7, L4, FLEX-11, FLEX-13, FLEX-14, FLEX-17, FLEX-41, FLEX-42, FLEX-43 |
| **V5** | Validation, Sanitization and Encoding | 5 | 1 | C4, M4, M5, M8, M9, FLEX-01, FLEX-04, FLEX-13, FLEX-15 |
| **V6** | Stored Cryptography | 2 | 1 | C3, C5, L1, H5, FLEX-16, FLEX-17, FLEX-22 |
| **V7** | Error Handling and Logging | 5 | — | C1, C2, M2, M5, M6, FLEX-16, FLEX-34 |
| **V8** | Data Protection | 1 | — | M1 |
| **V9** | Communication | 0 | — | — (HSTS on the frontend — PASS) |
| **V10** | Malicious Code | 0 | 1 | H6 |
| **V11** | Business Logic | 6 | — | C1, C2, H3, M6, M8, FLEX-04, FLEX-07, FLEX-08 |
| **V12** | Files and Resources | 3 | 2 | M3, M4, L4, FLEX-37 |
| **V13** | API and Web Service | 3 | — | C1, C2, M3, M5, FLEX-04, FLEX-11, FLEX-13 |
| **V14** | Configuration | 11 | — | M1, M2, M9, H1, H6, L2, L3, L5, FLEX-25, FLEX-33 |

**Weakest chapters:** V14 Configuration (11 failed), V1 Architecture (8), V11 Business Logic (6), V3 Session Management (5), V5 Validation (5), V7 Error Handling and Logging (5).

---

## 2. ASVS v4.0.3 — assessed requirement matrix

| Requirement | Section | Levels | Verdict | Findings | Note |
|---|---|---|---|---|---|
| `V1.4.1` | Access Control Architecture | L23 | FAIL | C1, C2, M5 | Payment/IDOR decisions are enforced on no trusted layer — the "protection" middleware is a static header check, and several endpoints enforce nothing. |
| `V1.4.4` | Access Control Architecture | L23 | FAIL | C3, C1 | Three different ad-hoc "access" mechanisms (header secret, JWT, none) instead of one vetted access-control mechanism. |
| `V1.5.4` | Input and Output Architecture | L23 | FAIL | C4 | Output encoding is not applied at the HTML sink; raw LLM output is injected with `dangerouslySetInnerHTML`. |
| `V1.6.2` | Cryptographic Architecture | L23 | FAIL | C3, C5, L1 | Key material is hardcoded in the repo/Dockerfile and shipped in the public browser bundle. |
| `V1.6.4` | Cryptographic Architecture | L23 | FAIL | C3 | A symmetric secret shipped to the browser is treated as an authentication control (ASVS explicitly requires client-side secrets to be treated as public). |
| `V1.11.2` | Business Logic Architecture | L23 | FAIL | C1, C2, FLEX-01 | The highest-value business flow (payment) has no authentication, no gateway verification, and no signature check. |
| `V1.11.3` | Business Logic Architecture | L3 | FAIL | C1, C2 | Payment steps are not bound to a verified upstream event, so steps can be invoked out of order. |
| `V1.12.2` | Secure File Upload Architecture | L23 | FAIL | M4, L4 | Uploaded files are served from a static path inside the web root with client-declared MIME type. |
| `V2.2.1` | General Authenticator Security | L123 | FAIL | M8, M9, FLEX-01, FLEX-07 | Anti-automation controls exist but do not cover registration or the OTP/reset routes (`authRoutes.js:67-69` has no limiter), and their IP resolution depends on an unvalidated proxy header.  |
| `V2.2.2` | General Authenticator Security | L123 | FAIL | FLEX-07 | E-mail OTP is used as a first-factor authenticator, not a secondary confirmation: the reset flow is the only factor between an attacker and an account. |
| `V2.2.3` | General Authenticator Security | L123 | FAIL | FLEX-01, FLEX-07 | No secure notification is sent when authentication details change; the password-reset endpoint overwrites the credential without notifying the account owner or revoking existing sessions.  |
| `V2.5.1` | Credential Recovery | L123 | FAIL | H5, FLEX-17, FLEX-22 | The generated initial password is e-mailed in clear text (`WelcomeEmail.js:16`), and staff accounts fall back to the committed default `FlexSpace2026` (`staffController.js:95`). |
| `V3.1.1` | Fundamental Session Management Security | L123 | **PASS** | — | Session tokens are never placed in URL parameters; they are carried in the `Authorization` header. |
| `V3.2.1` | Session Binding | L123 | **PASS** | — | A new token is generated on authentication (`authController` issues a fresh JWT on each login).  |
| `V3.2.3` | Session Binding | L123 | FAIL | C4 | The JWT is stored in `localStorage`, so any XSS on the origin yields the session token (amplifies C4).  |
| `V3.3.1` | Session Termination | L123 | FAIL | FLEX-20 | Logout does not invalidate the session token: the JWT is stateless, so there is no server-side record to mark as revoked and the token remains usable until its 720-minute expiry. |
| `V3.3.2` | Session Termination | L23 | FAIL | FLEX-20 | The absolute session lifetime is 720 minutes (`config.js:18`) with no periodic re-authentication and no inactivity timeout, so a stolen token is usable for half a day. |
| `V3.5.2` | Token-based Session Management | L23 | FAIL | C3 | A static API secret is used in place of a session token for API access.  |
| `V3.5.3` | Token-based Session Management | L23 | FAIL | FLEX-20 | The stateless session token has no revocation mechanism, and the role is read from the token payload rather than re-checked against the database, so a demoted or disabled account keeps its old privileges.  |
| `V4.1.1` | General Access Control Design | L123 | FAIL | C1, C2, M5, M6, L4, FLEX-11, FLEX-13, FLEX-14, FLEX-17, FLEX-41, FLEX-42, FLEX-43 | Access-control rules are not enforced on a trusted service layer for several object and function endpoints. The `/space` router additionally has no role gate, so every owner surface answers a plain customer token. |
| `V4.1.2` | General Access Control Design | L123 | FAIL | M7, FLEX-13, FLEX-14 | An attribute used to make a security decision (client IP for review-like dedup) is taken from a client-supplied header. |
| `V4.1.3` | General Access Control Design | L123 | FAIL | C1, C2, M5, FLEX-08, FLEX-11, FLEX-12, FLEX-13, FLEX-17, FLEX-42 | Least privilege is not applied: anonymous callers can read booking/space records and flip payment state; a `role=user` token is accepted on every `/space` owner route. |
| `V5.1.1` | Input Validation | L123 | PARTIAL | M9 | HTTP parameter pollution defences are not implemented; the app relies on Express defaults. |
| `V5.1.2` | Input Validation | L123 | **FAIL** | M8, FLEX-13 | **Corrected from PASS\*.** The "Mongoose strict mode saves us" assumption was wrong: `spaceController.update` (`spaceController.js:147-160`) uses an explicit block-list of only `_id`, `__v` and `created_at`, so `user_id` is writable and a space can be transferred to an arbitrary account. Mongoose strict mode does not protect against a field that **is** in the schema. |
| `V5.1.3` | Input Validation | L123 | FAIL | C4, M4, M5, FLEX-01, FLEX-04, FLEX-08, FLEX-09, FLEX-10 | Not all input is validated: `Space.name` has no constraint, uploads trust client MIME, ID parameters are unvalidated. |
| `V5.2.1` | Sanitization and Sandboxing | L123 | FAIL | C4, FLEX-15 | Untrusted HTML (LLM output derived from space-owner input) is not sanitised before being stored and rendered. |
| `V5.3.1` | Output Encoding and Injection Prevention | L123 | FAIL | C4, FLEX-15 | No output encoding is applied for the HTML context at `BlogDetail.jsx:160`. |
| `V5.3.5` | Output Encoding and Injection Prevention | L123 | FAIL | C4, FLEX-15 | Context-specific output encoding is absent where a safe mechanism (sanitiser) was not provided. |
| `V6.1.1` | Data Classification | L23 | PARTIAL | H5, FLEX-16, FLEX-22 | Sensitive personal data (password, e-mail) is transmitted in clear text inside an e-mail body. |
| `V6.4.1` | Secret Management | L23 | FAIL | C5, L1, FLEX-17, FLEX-22, FLEX-25 | No secrets-management solution: keys live in source, in the `Dockerfile` `ENV`, and in the client bundle. |
| `V6.4.2` | Secret Management | L23 | FAIL | C3, C5 | Key material is exposed to the application and to the browser rather than being isolated. |
| `V7.1.1` | Log Content | L123 | **FAIL** | H5, FLEX-16 | **Corrected from PASS.** `errorLogService.sanitizeRequestData` redacts only the *exact* keys `password`, `token`, `secret`, `key`, `authorization`, `api_key` — so `newPassword`, `resetPassword`, `otp` and `resetToken` are **not** redacted. `logsActivity.js:92` persists `doc.toObject()` (the whole user document, bcrypt hash included) and `:154` persists the raw update object. Credentials and payment details **are** logged.  |
| `V7.1.2` | Log Content | L123 | FAIL | FLEX-16, FLEX-34 | Other sensitive data is logged: the whole user document (`doc.toObject()`, including the bcrypt hash), raw update objects, and extensive `console.log` output containing PII, tokens and order payloads.  |
| `V7.1.3` | Log Content | L23 | FAIL | C1, C2 | Successful unauthenticated payment-state transitions are not logged as security events with an actor. |
| `V7.2.2` | Log Processing | L23 | FAIL | C1, C2, M5, M6 | Failed and successful access-control decisions on sensitive objects are not consistently logged. |
| `V7.4.1` | Error Handling | L123 | FAIL | M2 | Raw internal error text is returned to the client (Mongoose cast errors reveal model names and paths). |
| `V8.2.1` | Client-side Data Protection | L123 | FAIL | M1 | No anti-caching headers on API responses that carry booking, review and product data. |
| `V9.1.1` | Client Communication Security | L123 | **PASS** | — | TLS is enforced for all client connectivity; HSTS is present on the Vercel frontend (`max-age=63072000; includeSubDomains; preload`). |
| `V10.1.1` | Code Integrity | L3 | PARTIAL | H6 | No static-analysis / dependency-scanning gate in the build pipeline. |
| `V11.1.1` | Business Logic Security | L123 | FAIL | C1, FLEX-01, FLEX-04, FLEX-08, FLEX-41, FLEX-43 | Payment business-logic flows are not bound to a single user session; the space-owner onboarding approval rule (business permit + DTI registration) is not applied on the listing-creation path. |
| `V11.1.2` | Business Logic Security | L123 | FAIL | C1, C2 | All steps of the payment flow are not processed in a single verified transaction. |
| `V11.1.3` | Business Logic Security | L123 | FAIL | H3, M6, M8, FLEX-07, FLEX-08 | No limits on specific business actions (analytics writes, review submissions, registrations). |
| `V11.1.4` | Business Logic Security | L123 | FAIL | M8, H3, FLEX-07 | Anti-automation controls are absent on registration and on analytics ingestion. |
| `V11.1.7` | Business Logic Security | L23 | FAIL | C1, C2 | Unusual business activity (unauthenticated payment transitions) is not monitored. |
| `V11.1.8` | Business Logic Security | L23 | FAIL | C1, C2 | No alerting is configured for anomalous payment or authentication events. |
| `V12.1.1` | File Upload | L123 | **PARTIAL** | M3, M4, FLEX-37 | **Corrected from PASS.** A 10 MB per-file limit exists (`upload.js:13`), but `files: 10` combined with `multer.memoryStorage()` (`upload.js:8`) lets a single request hold **100 MB in the Node heap**, which the per-file limit does not bound. |
| `V12.2.1` | File Integrity | L23 | FAIL | M4 | Uploaded files are validated by the client-declared MIME type only, not by content/magic bytes. |
| `V12.4.1` | File Storage | L123 | FAIL | L4, FLEX-37 | Uploaded files are stored inside the web root and served by a static route. |
| `V12.5.2` | File Download | L123 | FAIL | M4, L4 | Uploaded files can be served with an attacker-chosen content type and would be executed in the origin context. |
| `V12.6.1` | SSRF Protection | L123 | PARTIAL | M4 | An allow-list of file types exists but is client-declared. |
| `V13.1.4` | Generic Web Service Security | L23 | FAIL | C1, C2, M5, FLEX-11, FLEX-12, FLEX-13, FLEX-14, FLEX-17 | Authorisation is not declared/enforced per URI for sensitive endpoints. |
| `V13.2.2` | RESTful Web Service | L123 | FAIL | M3, M5, FLEX-04, FLEX-09, FLEX-10, FLEX-13 | No JSON schema validation is performed on any request body. |
| `V13.2.6` | RESTful Web Service | L23 | FAIL | C2 | The inbound webhook payload is not signed and is not verified as unmodified in transit. |
| `V14.1.3` | Build and Deploy | L23 | FAIL | M1, M9 | Server configuration is not hardened: no helmet, no trust proxy, permissive CORS, 50 MB body limit. |
| `V14.2.1` | Dependency | L123 | FAIL | H6 | Components are not up to date: 1 critical and 30 high advisories across the two dependency trees. |
| `V14.2.5` | Dependency | L23 | FAIL | H6 | No SBOM is maintained. |
| `V14.3.2` | Unintended Security Disclosure | L123 | FAIL | FLEX-25 | Debug behaviour is not disabled by configuration: `.env.example:1` ships `NODE_ENV=development`, which enables stack traces and silently disables the anti-DDoS middleware (`app.js:172-181`). |
| `V14.3.3` | Unintended Security Disclosure | L123 | FAIL | M2 | Responses expose Express (`x-powered-by: Express`) and internal infrastructure detail. |
| `V14.4.1` | HTTP Security Headers | L123 | **PASS** | — | `Content-Type` is present on the responses sampled. |
| `V14.4.3` | HTTP Security Headers | L123 | FAIL | M1 | No `Content-Security-Policy` header on either the frontend or the API. |
| `V14.4.4` | HTTP Security Headers | L123 | FAIL | M1 | No `X-Content-Type-Options: nosniff` header on API responses (absent on the frontend too). |
| `V14.4.5` | HTTP Security Headers | L123 | PASS | — | `Strict-Transport-Security` is present on the Vercel frontend. **Not** present on the API responses sampled (Cloudflare terminates TLS and does not add it by default). |
| `V14.4.6` | HTTP Security Headers | L123 | FAIL | M1 | No `Referrer-Policy` header on API responses. |
| `V14.4.7` | HTTP Security Headers | L123 | FAIL | M1 | No `frame-ancestors` / `X-Frame-Options` protection on API responses. |
| `V14.5.2` | HTTP Request Header Validation | L123 | **PASS** | — | The `Origin` header is not used for authentication or access-control decisions (the CORS defect is a response-header problem, not an auth bypass). |
| `V14.5.3` | HTTP Request Header Validation | L123 | FAIL | H1 | CORS uses wildcard subdomain regexes (any `*.vercel.app` / `*.onrender.com`) with `access-control-allow-credentials: true`. |
| `V14.5.4` | HTTP Request Header Validation | L23 | FAIL | M9 | A proxy-supplied header (`cf-connecting-ip`) is honoured without validating the proxy hop. |

### 2.2 Requirements that pass today — and what must not break them

| Requirement | Why it matters | Note for remediation |
|---|---|---|
| `V3.1.1` | Session tokens are not revealed in URLs | Keep tokens in the `Authorization` header only |
| `V3.2.1` | A new token is issued on each authentication | Preserve on the `HttpOnly` cookie migration |
| `V9.1.1` | TLS + HSTS on the frontend | Add HSTS to the API responses too (currently missing) |
| `V14.4.1` | `Content-Type` present | Keep |
| `V14.4.5` | HSTS on the frontend | Replicate on the API |
| `V14.5.2` | `Origin` not used for auth decisions | **Critical to preserve** — if the CORS fix is implemented by "validating the Origin header in the auth middleware", this pass turns into a fail. Keep CORS as a response concern |

> **Two entries were removed from this list after the Part B reconciliation.** `V7.1.1` and `V5.1.2` were carried as passes on the basis of controls that turned out to be narrower than recorded — key-exact log redaction, and accidental rather than enforced mass-assignment protection. Both are now **FAIL**. `V12.1.1` was downgraded to **PARTIAL** (the per-file cap does not bound the per-request heap use).

---

## 3. ASVS v5.0.0 — conformance verdict

ASVS v5.0.0 restructures the standard into 17 chapters and renumbers every requirement, so the v4 identifiers above do not carry over. The mapping is **not** 1:1 and must not be presented as one.

The v5 CSV records a single **minimum** level per requirement (70 at level 1, 183 at level 2, 92 at level 3). Levels are cumulative, so the number of requirements *mandated* at a level is 70 / 253 / 345.

| Level | Requirements mandated at the level | Assessed rows | Failed | Conformance |
|---|---|---|---|---|
| **Level 1** | 70 | 22 | **19** | **DENIED** |
| **Level 2** | 253 | 52 | **47** | **DENIED** |
| **Level 3** | 345 | 55 | **50** | **DENIED** |

Failure counts at a level are cumulative: **19** requirements whose minimum level is 1, **28** whose minimum level is 2, and **3** whose minimum level is 3. A further 1 / 3 / 3 rows at L1 / L2 / L3 are `PARTIAL`, so the effective non-conforming totals are **20 / 50 / 53**.

> **Correction.** The previous figures in this document (19 / 39 / 41) were a manual tally. Re-derived mechanically from the matrix rows in §3 against the official v5 CSV, the original (pre-Part-B) matrix failed **16 / 34 / 36**; after the Part B reconciliation and the five verdict corrections it fails **19 / 47 / 50**. The Level 1 figure of 19 is unchanged; the Level 2 and Level 3 figures were under-stated by 5 and 9 respectively.

### 3.1 Failure distribution by ASVS v5.0.0 chapter

| Chapter | Chapter name | Failed | Partial | Dominant findings |
|---|---|---|---|---|
| **V1** | Encoding and Sanitization | 5 | — | C4, H5, FLEX-15 |
| **V2** | Validation and Business Logic | 5 | — | C1, C2, M5, M8, H3, FLEX-01, FLEX-04 |
| **V3** | Web Frontend Security | 3 | 1 | C4, M1, H1, FLEX-15, FLEX-28 |
| **V4** | API and Web Service | 2 | — | M9, C2 |
| **V5** | File Handling | 6 | — | M4, L4, M3, FLEX-37 |
| **V6** | Authentication | 5 | — | FLEX-01, FLEX-07, FLEX-22 |
| **V7** | Session Management | 3 | — | — (JWT verification itself passes) FLEX-20 |
| **V8** | Authorization | 6 | — | C1, C2, M5, M6, M8, FLEX-08, FLEX-11, FLEX-12, FLEX-13, FLEX-14, FLEX-17, FLEX-41, FLEX-42, FLEX-43 |
| **V11** | Cryptography | 1 | — | C5, L1, FLEX-20 |
| **V13** | Configuration | 3 | 1 | M2, C5, L1, C3, FLEX-25 |
| **V14** | Data Protection | 2 | — | FLEX-16, FLEX-22 |
| **V15** | Secure Coding and Architecture | 3 | — | M5, M9, M8, FLEX-13, FLEX-14 |
| **V16** | Security Logging and Error Handling | 6 | — | C1, C2, M2, M5, M8, FLEX-16, FLEX-34, FLEX-40 |

**Weakest chapters:** V5 File Handling (6), V8 Authorization (6), V16 Logging and Error Handling (6), V1 Encoding and Sanitization (5), V2 Validation and Business Logic (5), V6 Authentication (5).

### 3.2 ASVS v5.0.0 assessed requirement matrix

> The **Level** column below is the requirement's *minimum* level, exactly as recorded in the official CSV. Because levels are cumulative, an `L1` requirement is also mandated at Level 2 and Level 3.

**v4 → v5 chapter correspondence used for triage** (approximate, for navigation only):

| v4 chapter | v5 chapter |
|---|---|
| V1 Architecture | V2 Business Logic Security · V8 Authorization |
| V2 Authentication | V4 Generic Web Service Security · V16 Logging |
| V3 Session Management | V7 Session Management |
| V4 Access Control | V8 Authorization |
| V5 Validation/Sanitization | V1 Injection Prevention · V2 Validation · V3 Unintended Content Interpretation |
| V6 Cryptography | V11 Cryptography |
| V7 Error Handling/Logging | V16 Logging · V16.5 Error Handling |
| V8 Data Protection | V15 Defensive Coding |
| V10 Malicious Code | V13 Configuration |
| V11 Business Logic | V2 Business Logic Security · V2.4 Anti-automation |
| V12 Files | V5 File Handling |
| V13 API/Web Service | V4 Generic Web Service Security |
| V14 Configuration | V12 Configuration · V13 Configuration · V14 Configuration |

| Requirement | Section | Level | Verdict | Findings | Note |
|---|---|---|---|---|---|
| `V1.2.1` | Injection Prevention | L1 | FAIL | C4 | Output encoding is not applied for the HTML document context at `BlogDetail.jsx:160`. |
| `V1.3.1` | Sanitization | L1 | FAIL | C4 | Untrusted HTML (LLM output seeded by space-owner input) is stored and rendered without a sanitiser. |
| `V1.3.3` | Sanitization | L2 | FAIL | C4 | Data passed into a dangerous context (raw HTML injection) is not sanitised first. |
| `V1.3.7` | Sanitization | L2 | FAIL | C4 | No protection against template/prompt injection: owner-controlled text is interpolated into the LLM prompt. |
| `V1.3.11` | Sanitization | L2 | FAIL | H5 | User input reaches the mail system unsanitised; the e-mail relay is also unauthenticated. |
| `V2.2.1` | Input Validation | L1 | FAIL | C1, M5, FLEX-01, FLEX-04 | Inputs are not validated against business/functional expectations before being acted upon. |
| `V2.2.2` | Input Validation | L1 | FAIL | M5, FLEX-01, FLEX-13 | Input validation is not enforced at a trusted service layer for object access, and a request body is used directly as a database query filter in the password-reset flow. |
| `V2.3.1` | Business Logic Security | L1 | FAIL | C1 | Business-logic flows are not bound to the same user/session. |
| `V2.3.3` | Business Logic Security | L2 | FAIL | C1, C2, FLEX-04, FLEX-08, FLEX-09, FLEX-10 | Payment transitions are not executed as a verified business-logic transaction. |
| `V2.4.1` | Anti-automation | L2 | FAIL | M8, H3, FLEX-07 | Anti-automation controls are absent on registration and analytics ingestion. |
| `V3.2.2` | Unintended Content Interpretation | L1 | FAIL | C4, FLEX-15 | Content intended to be displayed as text is rendered as HTML. |
| `V3.4.1` | Browser Security Mechanism Headers | L1 | PARTIAL | M1 | HSTS is present on the Vercel frontend; absent from API responses. |
| `V3.4.5` | Browser Security Mechanism Headers | L2 | FAIL | M1 | No referrer policy is set. |
| `V3.5.1` | Browser Origin Separation | L1 | FAIL | H1 | The application relies on a permissive CORS configuration rather than origin separation. |
| `V4.1.1` | Generic Web Service Security | L1 | **PASS** | — | `Content-Type` is present on sampled API responses. |
| `V4.1.3` | Generic Web Service Security | L2 | FAIL | M9 | A header field set by an intermediary layer (`cf-connecting-ip`) is used by the application without validating the intermediary. |
| `V4.1.5` | Generic Web Service Security | L3 | FAIL | C2 | The inbound webhook carries no per-message signature; any party can forge a payment event. |
| `V5.1.1` | File Handling Documentation | L2 | FAIL | M4 | No documented set of permitted file types/extensions. |
| `V5.2.1` | File Upload and Content | L1 | FAIL | M3, FLEX-37 | The API accepts request bodies up to 50 MB (`express.json` limit) — beyond what the application can safely process. |
| `V5.2.2` | File Upload and Content | L1 | FAIL | M4 | Uploaded file contents are not validated against the expected type; only the client-declared MIME type is checked. |
| `V5.3.1` | File Storage | L1 | FAIL | M4, L4 | Uploaded files are served from a static path inside the web root with a client-influenced content type. |
| `V5.3.2` | File Storage | L1 | FAIL | L4 | File paths are constructed from stored values without validation. |
| `V5.4.1` | File Download | L2 | FAIL | L4 | User-submitted filenames are not validated or ignored on download. |
| `V6.3.1` | General Authentication Security | L1 | FAIL | FLEX-01, FLEX-07 | Controls against credential stuffing and password brute force are not implemented on the OTP/reset routes: `authRoutes.js:67-69` applies no limiter, and a 6-digit `Math.random()` OTP has a 900 000-value keyspace. |
| `V6.3.6` | General Authentication Security | L3 | FAIL | FLEX-07 | E-mail is used as a single-factor authentication mechanism in the password-reset flow. |
| `V6.4.1` | Authentication Factor Lifecycle and Recovery | L1 | FAIL | FLEX-22 | Staff accounts are issued a committed default password (`FlexSpace2026`, `staffController.js:95`) rather than a securely randomly generated activation credential. |
| `V6.4.3` | Authentication Factor Lifecycle and Recovery | L2 | FAIL | FLEX-01 | The password-reset flow bypasses every other enabled authentication factor and accepts a client-controlled query object. |
| `V6.6.3` | Out-of-Band authentication mechanisms | L2 | FAIL | FLEX-07 | The out-of-band code is not protected against brute force: no rate limit, no attempt counter, no lockout.  |
| `V7.1.1` | Session Management Documentation | L2 | FAIL | FLEX-20 | The absolute session lifetime (720 minutes) is not documented or derived from a risk analysis, and no inactivity timeout exists. |
| `V7.2.1` | Fundamental Session Management Security | L1 | **PASS** | L6 | JWT verification is performed in a trusted server-side component; `alg:none` and weak-secret attempts were rejected.  |
| `V7.3.2` | Session Timeout | L2 | FAIL | FLEX-20 | There is no enforced absolute maximum session lifetime beyond the 720-minute token expiry, and re-authentication is never required. |
| `V7.4.1` | Session Termination | L1 | FAIL | FLEX-20 | Session termination (logout, password change, role change) does not disallow further use of the token — there is no server-side session record.  |
| `V8.1.1` | Authorization Documentation | L1 | FAIL | C1, C2, FLEX-11, FLEX-12, FLEX-13 | Authorisation documentation/rules for function- and data-level restriction do not exist for the payment endpoints.  |
| `V8.2.1` | General Authorization Design | L1 | FAIL | C1, C2, M6, M8, FLEX-12, FLEX-17, FLEX-41, FLEX-42 | Function-level access is not restricted to authorised consumers. The `/space` router applies no role gate at all. |
| `V8.2.2` | General Authorization Design | L1 | FAIL | C1, C2, M5, FLEX-08, FLEX-11, FLEX-13, FLEX-14, FLEX-17 | Data-specific access is not restricted — booking records are readable anonymously and mutable. |
| `V8.2.3` | General Authorization Design | L2 | FAIL | FLEX-13, FLEX-14 | Field-level write restrictions are not enforced: `user_id` and `space_id` are accepted from the request body. |
| `V8.3.1` | Operation Level Authorization | L1 | FAIL | C1, C2, M5, FLEX-01, FLEX-11, FLEX-12, FLEX-14, FLEX-17, FLEX-42 | Authorisation is not enforced at a trusted service layer. |
| `V8.4.1` | Other Authorization Considerations | L2 | FAIL | FLEX-08, FLEX-11, FLEX-12, FLEX-13, FLEX-17, FLEX-32, FLEX-41, FLEX-42, FLEX-43 | **Multi-tenant cross-tenant controls are absent.** A voucher issued in one tenant zeroes another tenant's bill; any authenticated user re-credits a victim tenant's order into their own ledger; a `role=user` account marks another owner's fees collected; staff can be created inside a competitor's space and then read and settle that space's bookings; a space can be transferred to an arbitrary account; a customer can publish a live listing without the onboarding approval; and the planted staff account is invisible to the tenant it attacks.  |
| `V11.1.1` | Cryptographic Inventory and Documentation | L2 | FAIL | C5, L1, FLEX-20, FLEX-32 | No documented cryptographic key-management policy; keys are hardcoded.  |
| `V13.3.1` | Secret Management | L2 | FAIL | C5, L1, FLEX-17, FLEX-22, FLEX-25 | No secrets-management solution is used for the production API keys. |
| `V13.3.4` | Secret Management | L3 | FAIL | C5, C3 | Secrets are not configured to expire and rotate. |
| `V13.4.2` | Unintended Information Leakage | L2 | **PARTIAL** | FLEX-25 | **Corrected from PASS.** The *running* production deployment omits stack traces, but `.env.example:1` ships `NODE_ENV=development`, which both exposes stack traces **and** silently disables the entire anti-DDoS middleware (`app.js:172-181`). A copy-paste of the shipped example into a deployment removes two controls at once. |
| `V13.4.5` | Unintended Information Leakage | L2 | FAIL | M2 | Monitoring endpoints (`/health`, `/api/v1/health/antiddos-status`) expose internal state publicly. |
| `V14.1.2` | Data Protection Documentation | L2 | FAIL | FLEX-16, FLEX-22 | No data-protection classification exists for credentials, reset tokens, bcrypt hashes or personal data, so logging rules cannot be derived from it. |
| `V14.2.4` | General Data Protection | L2 | FAIL | FLEX-16, FLEX-22 | Controls for how sensitive data is logged are not implemented; credentials, password hashes and live reset tokens are persisted into the log collection.  |
| `V15.3.1` | Defensive Coding | L1 | FAIL | M5, C1, FLEX-14 | Responses return the full booking document, including `qr_code_token`, to unauthenticated callers. |
| `V15.3.3` | Defensive Coding | L2 | **FAIL** | M8, FLEX-13 | **Corrected from PASS\*.** No per-controller, per-action field allow-list exists. `spaceController.update` block-lists only `_id`, `__v` and `created_at`; `user_id` is writable and a space listing can be transferred to an arbitrary account. |
| `V15.3.4` | Defensive Coding | L2 | FAIL | M9 | Proxying/middleware components do not transfer the user's original IP address in a validated way. |
| `V16.2.1` | General Logging | L2 | FAIL | C1, C2, FLEX-16, FLEX-34 | Log entries for security events do not carry a reliable actor identity for unauthenticated calls.  |
| `V16.2.3` | General Logging | L2 | FAIL | FLEX-40 | Logs are written to collections that are not documented, and expected 4xx responses create `ErrorLog` rows containing the request body — noise plus secret retention. |
| `V16.2.5` | General Logging | L2 | FAIL | FLEX-16 | **The v5 counterpart of v4 `V7.1.1`.** Logging is not driven by the data's protection level: `sanitizeRequestData` redacts only six exact key names, so `newPassword`, `otp` and `resetToken` are logged, and activity logs store whole user documents including bcrypt hashes.  |
| `V16.3.1` | Security Events | L2 | PARTIAL | M8 | Authentication operations are logged, but the anti-automation controls they depend on do not cover all authentication-adjacent endpoints. |
| `V16.3.2` | Security Events | L2 | FAIL | C1, C2, M5, FLEX-34 | Failed authorisation attempts on sensitive objects are not consistently logged. |
| `V16.3.3` | Security Events | L2 | FAIL | C1, C2, FLEX-01, FLEX-07 | Security-relevant events (unauthenticated payment state changes) are not defined, logged, or alerted on. |
| `V16.5.1` | Error Handling | L2 | FAIL | M2 | Raw internal error messages are returned to the consumer.  |

---

## 4. Level-by-level readiness

### 4.1 What it takes to claim ASVS v4.0.3 Level 1

**33** L1 requirements currently fail (plus 3 `PARTIAL`). The full L1 requirement set is **127**, of which only **42 have been assessed** in this engagement — the other 85 are untouched and must be verified before any Level 1 claim can be made. To claim Level 1, all 127 must be verified and passing.

| Work package | L1 failures closed | Effort |
|---|---|---|
| **P1** Delete the client-side fingerprint; one auth model | `V1.6.4`, `V3.5.2`, `V4.1.1`, `V4.1.3`, `V6.4.2` | M |
| **P2** Payment as a verified consequence; webhook signature | `V1.4.1`, `V1.4.4`, `V1.11.2`, `V4.1.1`, `V4.1.3`, `V11.1.1`, `V11.1.2`, `V13.1.4`, `V13.2.6` | L |
| **P3** Sanitise AI output; constrain owner input | `V1.5.4`, `V5.1.3`, `V5.2.1`, `V5.3.1`, `V5.3.5` | M |
| **P4** Managed secrets; rotate; remove defaults | `V1.6.2`, `V6.4.1` | M |
| **P5** One trusted client-IP resolver | `V14.1.3`, `V14.5.4`, `V2.2.1`, `V4.1.2` | S |
| **P6** Security-event logging and alerting | `V7.1.3`, `V7.2.2`, `V11.1.7`, `V11.1.8` | M |
| **P7** Headers, CORS, body limits, generic errors | `V14.4.3`, `V14.4.4`, `V14.4.6`, `V14.4.7`, `V14.5.3`, `V14.3.3`, `V7.4.1`, `V8.2.1`, `V13.2.2` | S |
| **P8** Ownership-scoped access; minimal responses | `V15.3.1`, `V5.1.3`, `V12.6.1` | M |
| **P9** Dependency + SBOM + secret scanning | `V14.2.1`, `V10.1.1` | S |
| **P10** Never let a request object become a query; type-coerce at the edge | `V2.2.1`, `V2.2.2`, `V5.1.3`, `V13.2.2` | **S** |
| **P11** The server computes the money | `V11.1.1`, `V11.1.3`, `V13.2.2`, `V4.1.1` | M |
| **P12** Tenant identity from the token, never from the body | `V4.1.1`, `V4.1.2`, `V4.1.3`, `V13.1.4` | **L** |
| **P13** Revocable, short-lived sessions | `V3.3.1`, `V3.5.3`, `V2.2.1` | M |
| **P14** Secrets must not survive into logs, e-mail or defaults | `V7.1.1`, `V7.1.2`, `V6.4.1`, `V2.5.1` | M |
| **P15** One rendering boundary for operator-facing HTML | `V5.2.1`, `V5.3.1`, `V5.3.5`, `V3.2.3` | M |
| **P16** Bound the work an unauthenticated request can cause | `V12.1.1`, `V11.1.4`, `V14.3.2` | S |

**Realistic L1 path:** P5 + P7 + P9 + P10 + P16 are small and clear 12+ L1 failures on their own; P1, P3, P4, P8, P14, P15 clear most of the rest; **P2 and P12 are the largest single items** but are also the ones that must be done for correctness, not only for ASVS. P12 alone closes the tenant-isolation findings (FLEX-08, FLEX-11, FLEX-12, FLEX-13, FLEX-14, FLEX-17, FLEX-42, FLEX-43) and the onboarding-approval bypass (FLEX-41).

**L1 requirements that will still fail after the P1–P16 work:** `V2.5.1` (clear-text password in e-mail → needs the one-time-link change), `V3.2.3` (JWT in `localStorage` → needs the `HttpOnly` cookie migration, which is its own project) and `V2.2.2` / `V2.2.3` (credential-recovery controls → need the one-time-link and notification change from P14).

**Assessment coverage caveat.** 42 of the 127 L1 requirements have been assessed. The 33 L1 failures are a **floor**, not a ceiling — the unassessed 85 may contain further failures. A Level 1 claim is not reachable by fixing what is known; it requires assessing the remainder.

### 4.2 Level 2 and Level 3

| Level | Additional work beyond Level 1 | Residual L2/L3 failures after P1–P9 |
|---|---|---|
| **Level 2** | Business-logic limits, session management depth, deeper file-handling controls, cryptography documentation | `V12.5.2` (download content-type), `V14.2.5` (SBOM), `V1.11.3` / `V1.12.2` / `V12.2.1` / `V13.2.6` (file + webhook depth), `V16.3.x` (logging depth), `V11.1.4` (anti-automation depth) |
| **Level 3** | Verified threat model, dependency assurance, full transaction integrity | `V1.11.3`, `V10.1.1` (SAST gate), `V4.1.5` (v5 signature requirement), `V13.3.4` (rotation), `V16.3.x` |

### 4.3 ASVS v5.0.0 notes for a future claim

- The v5 standard's **Level 1 is much narrower** (70 requirements vs 127 in v4) but **explicitly includes authorisation and sanitisation** (`V1.3.1`, `V2.2.2`, `V8.2.1`, `V8.2.2`, `V8.3.1` are all L1). A v5 Level 1 claim therefore requires fixing C1/C2/M5/C4 — the same work as the v4 L1 claim, expressed differently.
- v5 introduces an explicit **authorisation-documentation** requirement (`V8.1.1`) and explicit **secret-management** requirements (`V13.3.1`, `V13.3.4`). Both map directly onto findings that currently have no owning control.
- v5 removes the "anti-caching header" requirement that v4 carried as `V8.2.1`; the corresponding recommendation is now in `V15.3.1` (return only the required subset of fields) — which the current full-document response violates.

---

## 5. Proposed solutions, mapped to ASVS

| ASVS requirement(s) | Proposed solution (see `OWASP-SECURITY-ASSESSMENT.md` §7) | Verifying test |
|---|---|---|
| `V1.5.4`, `V5.2.1`, `V5.3.1`, `V5.3.5`, `V1.2.1`, `V1.3.1`, `V1.3.3` (v5) | **P3** — sanitise at the boundary and at the sink; constrain `Space.name` | Fetch all blogs → no `onerror=` / `<script>` / `javascript:` |
| `V1.6.2`, `V6.4.1`, `V13.3.1`, `V13.3.4` (v5) | **P4** — managed secret store, no `\|\|` fallbacks, rotate + purge history | Boot with the env var unset → process exits non-zero |
| `V1.6.4`, `V3.5.2`, `V6.4.2` | **P1** — delete `x-app-fingerprint` / `protectionMiddleware` | `curl` without the header → `401`; grep the bundle → no secret |
| `V1.11.2`, `V1.11.3`, `V11.1.1`, `V11.1.2`, `V13.2.6`, `V4.1.5` (v5) | **P2** — gateway re-verification + webhook HMAC + idempotent transaction | Forge a webhook → `401`; replay a captured body → no state change |
| `V2.2.1`, `V2.2.2`, `V2.2.3`, `V5.1.3`, `V13.2.2`, `V11.1.1` | **P10** — never let a request object become a query; type-coerce at the edge | `{"email":{"$ne":null}}` → `400`, not a user record; OTP rate limit engages after N attempts |
| `V2.5.1`, `V6.1.1`, `V3.2.3`, `V6.4.1` | **P14** — one-time password-setup link; `HttpOnly` `__Host-` cookie for the session | E-mail contains no password; no token in `localStorage` |
| `V3.1.1`, `V3.2.1`, `V3.3.1`, `V3.3.2`, `V3.5.3`, `V7.1.1`, `V7.3.2`, `V7.4.1` (v5) | **P13** — revocable, short-lived sessions + server-side role source | Log out → the old token is rejected; the role follows the database, not the token |
| `V4.1.1`, `V4.1.3`, `V5.1.3`, `V15.3.1` (v5), `V8.2.2` (v5) | **P8** — ownership-scoped queries, field-minimal responses | Enumerate object ids → `404`, no `qr_code_token` in any body |
| `V4.1.1`, `V4.1.2`, `V4.1.3`, `V13.1.4`, `V8.4.1` (v5) | **P12** — tenant identity from the token, never from the body | Act as tenant B on tenant A's order → `404`/`403`; `user_id` in the body → rejected |
| `V5.1.3`, `V11.1.1`, `V11.1.3`, `V13.2.2`, `V4.1.1` | **P11** — the server computes the money (rebuild totals from the database) | Post a forged `total` → the stored total is unchanged |
| `V5.2.1`, `V5.3.1`, `V5.3.5`, `V3.2.3`, `V1.3.3` (v5) | **P15** — one rendering boundary for operator-facing HTML | A name of `<img src=x onerror=alert(1)>` → rendered as text |
| `V7.1.1`, `V7.1.2`, `V6.4.1`, `V2.5.1`, `V14.1.2`, `V14.2.4`, `V16.2.5` (v5) | **P14** — secrets must not survive into logs, e-mail or defaults | Grep the log collection → no bcrypt hash, no `resetToken`, no plaintext password |
| `V7.1.3`, `V7.2.2`, `V11.1.7`, `V11.1.8`, `V16.2.1`, `V16.3.2`, `V16.3.3` (v5) | **P6** — security-event catalogue + alerts | Trigger the flow → an event with actor/IP/correlation id, and an alert |
| `V12.1.1`, `V11.1.4`, `V14.3.2`, `V5.2.1` (v5) | **P16** — bound the work an unauthenticated request can cause | 100 MB upload → `413`; anti-DDoS active with `NODE_ENV=development` |
| `V14.2.1`, `V14.2.5`, `V10.1.1` | **P9** — audit gate, SBOM, `gitleaks` | `npm audit` → 0 critical/high; CI blocks on a planted secret |
| `V14.4.3`–`V14.4.7`, `V14.5.3`, `V14.3.3`, `V7.4.1`, `V8.2.1`, `V13.2.2` | **P7** — helmet, exact-origin CORS, 1 MB bodies, generic errors | Header dump; `Origin: https://evil-attacker-xyz.vercel.app` → no ACAO header |
| `V14.5.4`, `V14.1.3`, `V4.1.3` (v5), `V15.3.4` (v5) | **P5** — `trust proxy` + one resolver; drop the private-range exemption | Same-window `A A A B A` → limiter keys match the real client IP |

---

## 6. Traceability — finding → ASVS requirement

| Finding | ASVS v4.0.3 | ASVS v5.0.0 |
|---|---|---|
| C1 | `V1.4.1`, `V1.4.4`, `V1.11.2`, `V1.11.3`, `V4.1.1`, `V4.1.3`, `V11.1.1`, `V11.1.2`, `V11.1.7`, `V11.1.8`, `V13.1.4` | `V2.3.1`, `V2.3.3`, `V8.1.1`, `V8.2.1`, `V8.3.1`, `V16.3.3` |
| C2 | `V1.4.1`, `V1.4.4`, `V1.11.2`, `V1.11.3`, `V4.1.1`, `V4.1.3`, `V11.1.2`, `V11.1.7`, `V11.1.8`, `V13.1.4`, `V13.2.6` | `V2.3.3`, `V4.1.5`, `V8.1.1`, `V8.2.1`, `V8.3.1`, `V16.3.3` |
| C3 | `V1.6.2`, `V1.6.4`, `V3.5.2`, `V6.4.2` | `V8.2.1`, `V13.3.1`, `V13.3.4` |
| C4 | `V1.5.4`, `V3.2.3`, `V5.1.3`, `V5.2.1`, `V5.3.1`, `V5.3.5` | `V1.2.1`, `V1.3.1`, `V1.3.3`, `V1.3.7`, `V2.2.1`, `V3.2.2` |
| C5 | `V1.6.2`, `V6.4.1`, `V6.4.2` | `V11.1.1`, `V13.3.1`, `V13.3.4` |
| H1 | `V14.5.3` | `V3.5.1` |
| H3 | `V11.1.3`, `V11.1.4` | `V2.4.1` |
| H4 | `V11.1.3`, `V11.1.4` | `V2.4.1` |
| H5 | `V2.5.1`, `V6.1.1` | `V1.3.11`, `V8.2.1` |
| H6 | `V10.1.1`, `V14.2.1`, `V14.2.5` | `V13.3.4` |
| M1 | `V8.2.1`, `V14.4.3`, `V14.4.4`, `V14.4.6`, `V14.4.7` | `V3.4.1`, `V3.4.5` |
| M2 | `V7.4.1`, `V14.3.3` | `V13.4.5`, `V16.5.1` |
| M3 | `V13.2.2`, `V14.1.3` | `V5.2.1` |
| M4 | `V1.12.2`, `V12.2.1`, `V12.5.2`, `V12.6.1` | `V5.1.1`, `V5.2.2`, `V5.3.1`, `V5.3.2`, `V5.4.1` |
| M5 | `V4.1.1`, `V4.1.3`, `V13.1.4`, `V13.2.2` | `V2.2.1`, `V2.2.2`, `V8.2.2`, `V8.3.1`, `V15.3.1` |
| M6 | `V4.1.1`, `V11.1.3`, `V7.2.2` | `V8.2.1` |
| M7 | `V4.1.2` | `V15.3.4` |
| M8 | `V2.2.1`, `V11.1.3`, `V11.1.4`, `V5.1.2` | `V2.4.1`, `V15.3.3` |
| M9 | `V14.1.3`, `V14.5.4`, `V2.2.1`, `V5.1.1`, `V4.1.2` | `V4.1.3`, `V15.3.4` |
| L1 | `V1.6.2`, `V6.4.1` | `V11.1.1`, `V13.3.1` |
| L2 | `V14.3.3` | `V13.4.5` |
| L3 | — | — |
| L4 | `V1.12.2`, `V12.4.1`, `V12.5.2`, `V4.1.1` | `V5.3.1`, `V5.3.2` |
| L5 | — | — |
| L6 | `V2.2.1`, `V5.1.3`, `V14.5.2` | `V7.2.1`, `V4.1.1` |
| L7 | `V4.1.1`, `V14.5.2` | `V8.3.1` |
| L8 | `V5.1.3`, `V2.2.1` | `V2.2.1` |
| FLEX-01 | `V2.2.1`, `V2.2.3`, `V4.1.1`, `V5.1.3`, `V11.1.1`, `V13.1.4`, `V1.11.2` | `V2.2.1`, `V2.2.2`, `V6.4.3`, `V8.2.1`, `V8.3.1`, `V16.3.3` |
| FLEX-04 | `V4.1.1`, `V5.1.3`, `V11.1.1`, `V13.2.2` | `V2.2.1`, `V2.3.3`, `V8.2.1` |
| FLEX-07 | `V2.2.1`, `V2.2.2`, `V11.1.1`, `V11.1.3`, `V11.1.4` | `V2.4.1`, `V6.3.1`, `V6.3.6`, `V6.6.3`, `V16.3.3` |
| FLEX-08 | `V4.1.1`, `V4.1.3`, `V5.1.3`, `V11.1.1` | `V8.2.2`, `V8.4.1`, `V2.3.3` |
| FLEX-09 | `V5.1.3`, `V11.1.1`, `V13.2.2` | `V2.2.1`, `V2.3.3`, `V8.3.1` |
| FLEX-10 | `V5.1.3`, `V11.1.1`, `V13.2.2` | `V2.2.1`, `V2.3.3`, `V15.3.3` |
| FLEX-11 | `V4.1.1`, `V4.1.3`, `V13.1.4` | `V8.2.2`, `V8.4.1`, `V8.3.1` |
| FLEX-12 | `V4.1.1`, `V4.1.3`, `V13.1.4` | `V8.2.1`, `V8.4.1` |
| FLEX-13 | `V4.1.2`, `V5.1.2`, `V13.2.2` | `V15.3.3`, `V8.2.2`, `V8.2.3`, `V8.4.1` |
| FLEX-14 | `V4.1.1`, `V4.1.2`, `V11.1.1`, `V13.1.4` | `V8.2.2`, `V8.3.1`, `V15.3.1`, `V2.3.3` |
| FLEX-15 | `V1.5.4`, `V5.2.1`, `V5.3.1`, `V5.3.5` | `V1.2.1`, `V1.3.1`, `V3.2.2` |
| FLEX-16 | `V6.1.1`, `V7.1.1`, `V7.1.2`, `V7.4.1` | `V14.1.2`, `V14.2.4`, `V16.2.5`, `V16.4.2` |
| FLEX-17 | `V2.5.1`, `V4.1.1`, `V4.1.3`, `V6.4.1` | `V8.2.1`, `V8.4.1`, `V13.3.1`, `V6.4.1` |
| FLEX-20 | `V3.1.1`, `V3.2.1`, `V3.3.1`, `V3.3.2`, `V3.5.3` | `V7.1.1`, `V7.3.2`, `V7.4.1`, `V11.1.1` |
| FLEX-41 | `V4.1.1`, `V11.1.1`, `V13.1.4` | `V8.2.1`, `V8.4.1` |
| FLEX-42 | `V4.1.1`, `V4.1.3`, `V13.1.4` | `V8.2.1`, `V8.3.1`, `V8.4.1` |
| FLEX-43 | `V4.1.1`, `V11.1.1` | `V8.2.2`, `V8.4.1` |
| FLEX-22 | `V2.5.1`, `V6.4.1`, `V6.4.2` | `V6.4.1`, `V11.1.1`, `V13.3.1`, `V14.2.4` |
| FLEX-25 | `V1.6.2`, `V14.3.2`, `V14.4.1` | `V13.4.2` |
| FLEX-28 | `V3.2.3`, `V14.4.3`, `V14.4.6` | `V7.3.1`, `V3.4.5` |
| FLEX-37 | `V12.1.1`, `V12.4.1` | `V5.2.1`, `V5.2.2` |
| FLEX-31 | `V1.11.2`, `V14.2.1` | `V2.3.3`, `V15.3.1` |
| FLEX-32 | `V4.1.3`, `V14.4.1` | `V8.4.1`, `V11.1.1` |
| FLEX-33 | `V13.2.4` | `V13.4.4` |
| FLEX-34 | `V7.1.2`, `V14.3.2` | `V16.2.5`, `V13.4.2` |
| FLEX-40 | `V7.1.2`, `V7.4.1` | `V16.2.3`, `V16.5.1` |
| A09-01 | `V7.1.3`, `V7.2.2`, `V11.1.7`, `V11.1.8` | `V16.2.1`, `V16.3.2`, `V16.3.3` |
| A09-02 | `V7.2.2`, `V14.1.3` | `V16.2.1`, `V15.3.4` |
| A09-03 | `V7.1.3`, `V11.1.8` | `V16.3.3` |

---

## 7. Provenance

| Item | Value |
|---|---|
| ASVS v4.0.3 requirement count | 286 total; level marks recorded in the `level1`/`level2`/`level3` columns — 127 / 253 / 273 (cumulative) |
| ASVS v5.0.0 requirement count | 345 total; single minimum-level column `L` — 70 at L1, 183 at L2, 92 at L3, so 70 / 253 / 345 mandated per level (cumulative) |
| Chapters used | v4: V1–V14 · v5: V1–V8, V11, V13, V14, V15, V16 |
| Requirement descriptions quoted from | The official OWASP English CSV exports for each tag (not from memory) |
| Level values | Read from the official CSVs, never inferred |
| Verification | All **122 rows** in this document (67 v4 + 55 v5) are re-checked programmatically against the official CSVs — requirement ID, section name and level. **0 mismatches.** Every failure count in this document is computed from those rows by script, not tallied by hand. |
| Level notation in §2 | `L123` = mandated at Levels 1, 2 and 3 · `L23` = Levels 2 and 3 · `L3` = Level 3 only |

**Prepared as part of the OWASP security-layer review. No application code was modified during this assessment.**
