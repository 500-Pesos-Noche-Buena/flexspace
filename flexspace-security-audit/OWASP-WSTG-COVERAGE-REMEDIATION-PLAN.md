# OWASP WSTG Coverage & Remediation Plan — FlexSpace Iloilo

| Field | Value |
|---|---|
| **Target** | `https://flexspace-z079.onrender.com` (API) · `https://flexspace-iloilo.vercel.app` (frontend) |
| **Source assessed** | `/home/khent/flexspace` — `github.com/500-Pesos-Noche-Buena/flexspace` (177 commits, `main`) |
| **Assessment date** | 22 Oct 2026 |
| **Code changes made** | **None.** Read-only assessment. |
| **WSTG source** | `OWASP/wstg` `master` — `document/4-Web_Application_Security_Testing/`, test IDs and titles extracted from each test's `\|ID\|` table. **118 test documents / 117 unique test IDs** across 13 categories (the tree contains one duplicated identifier — see §5.7) |
| **Companion documents** | `OWASP-SECURITY-ASSESSMENT.md` · `OWASP-ASVS-CONTROL-MATRIX.md` · `SECURITY-PENTEST-REPORT.md` (Part A) · `SECURITY-PENTEST-REPORT-SANDBOX.md` (Part B) |
| **Coverage achieved** | **117 of 117 unique test IDs dispositioned — 0 untriaged.** By depth: 96 `EXECUTED` (live request), 2 `PARTIAL`, 19 `SOURCE` (source-code disposition). By result: **47 FAIL · 49 PASS / PASS\*** · 21 N/A |
| **Revision** | Extended in the Part B reconciliation (22 Oct 2026): **five verdicts corrected** (`WSTG-INJT-05`, `WSTG-INJT-20`, `WSTG-ATHN-09`, `WSTG-ATHZ-03`, `WSTG-SESS-06` all moved to FAIL; `WSTG-SESS-07` re-based on the correct evidence). Counts are computed from the matrix rows by script, not tallied by hand. |

---

## 0. How to read the coverage column

| Coverage | Meaning |
|---|---|
| `EXECUTED` | The test was actively performed against the running application and/or the source |
| `PARTIAL` | The test was performed but not to full depth; the limitation is stated in the note |
| `SOURCE` | Dispositioned by source-code review rather than by live request (e.g. protocol-level tests that cannot be exercised against a managed platform) |
| `N/A` | Not applicable — the technology or feature under test is absent; the reason is given |
| `OUT-OF-SCOPE` | Deliberately excluded from this engagement; the reason is given |

**Result column** — `FAIL` / `PASS` / `PASS*` (passing by accident of implementation rather than by an explicit control) / `N/A` / `NOT TESTED`.

**The key structural result of this coverage pass:** the failures cluster in six WSTG categories — **BUSL (business logic, 10 of 10 fail), CONF (configuration, 7 of 15), APIT (API testing, 4 of 5), CLNT (client-side, 4 of 15), ATHZ (authorisation, 3 of 5), INJT (injection, 4 of 23)** — while the *authentication* and *session* categories pass mostly. FlexSpace authenticates reasonably well and authorises badly, and it trusts the client for money and for identity. That is the single sentence that summarises this assessment.

**What Part B changed.** The sandbox engagement (43 findings, of which 26 are new) closed the single largest gap in this coverage pass: it exercised the application *as an authenticated user* across tenant boundaries. Five tests that previously passed now fail — including `WSTG-INJT-05` (the application is injectable at the data layer, just not with SQL) and `WSTG-ATHN-09` (the password-reset flow is not safe). See `OWASP-SECURITY-ASSESSMENT.md` §6.

---

## 1. Coverage summary by category

| Category | Name | Test IDs | Dispositioned | FAIL | PASS / PASS* | N/A | Findings raised |
|---|---|---|---|---|---|---|---|
| **INFO** | Information Gathering | 10 | 10 | 4 | 6 | 0 | L2, C3, C4, C5, H5 |
| **CONF** | Configuration & Deployment | 15 | 15 | 7 | 6 | 2 | H1, M1, M2, M3, L2, L4, L5, H6, M9 · FLEX-06, FLEX-17, FLEX-22, FLEX-24, FLEX-25, FLEX-29, FLEX-32, FLEX-33, FLEX-36, FLEX-37, FLEX-38, FLEX-39 |
| **IDNT** | Identity Management | 5 | 5 | 1 | 4 | 0 | M8 · FLEX-07 |
| **ATHN** | Authentication | 11 | 11 | **4** | 3 | 4 | M8, M9, C3, C5 · FLEX-01, FLEX-07, FLEX-17, FLEX-22, FLEX-30 |
| **ATHZ** | Authorization | 5 | 5 | **3** | 1 | 1 | C1, C2, M5, M6, M7, L4 · FLEX-08, FLEX-11, FLEX-12, FLEX-13, FLEX-14, FLEX-17, FLEX-42, FLEX-43 |
| **SESS** | Session Management | 11 | 11 | **3** | 6 | 2 | M8 (storage), L6 (pass) · FLEX-20, FLEX-28 |
| **INJT** | Injection | 23 | 23 | **4** | 12 | 7 | C4, M4, H5 · FLEX-01, FLEX-05, FLEX-13, FLEX-15, FLEX-35 |
| **ERRH** | Error Handling | 2 | 2 | 1 | 1 | 0 | M2 |
| **CRYP** | Weak Cryptography | 4 | 4 | 2 | 1 | 1 | C3, C5, H5, L1 |
| **BUSL** | Business Logic | 10 | 10 | **10** | 0 | 0 | C1, C2, H3, H4, M4, M6, M8 · FLEX-02, FLEX-03, FLEX-04, FLEX-08, FLEX-09, FLEX-10, FLEX-23, FLEX-41 |
| **CLNT** | Client-side | 15 | 15 | 4 | 9 | 2 | H1, M1, C4 · FLEX-15, FLEX-21, FLEX-28 |
| **APIT** | API Testing | 5 | 5 | **4** | 0 | 1 | C1, C2, C3, M5, M8 · FLEX-11, FLEX-13, FLEX-17, FLEX-23, FLEX-42 |
| **WASM** | WebAssembly | 1 | 1 | 0 | 0 | 1 | — |
| | **Total** | **117** | **117** | **47** | **49** | **21** | |

> Counts are of *test IDs dispositioned*, not of individual assertions. Several tests raised more than one finding.

**Reading the shape of this table.** `BUSL` is **10 of 10 fail** — every business-logic test failed, and that is the category that maps directly onto money. `APIT` is 4 of 5 fail, while `ATHN` and `SESS` are mostly passes. The application authenticates reasonably well and authorises badly; the whole risk profile is concentrated in the categories where a state change is supposed to be prevented.

**Part B moved five tests from PASS to FAIL**, which is why the totals are 47 FAIL rather than the 42 published with Part A: `WSTG-INJT-05` (query-operator injection in the reset flow), `WSTG-INJT-20` (mass assignment beyond `role`), `WSTG-ATHN-09` (the password-reset path), `WSTG-ATHZ-03` (privilege escalation without needing the admin role) and `WSTG-SESS-06` (logout does not invalidate a live token).

**A note on the `N/A` count.** 21 results are "not applicable" because the technology or feature under test does not exist in this application (SQL, LDAP, XML, OAuth, WebSockets, GraphQL, Flash, WebAssembly, CSV export, MFA, cookies, security questions, native buffers, padding oracles). These are recorded as N/A with a stated reason rather than as passes — an absent feature is not a satisfied test.

---

## 2. Full WSTG coverage matrix (117 unique test IDs / 118 test documents)

### 2.1 INFO — Information Gathering

| Test ID | Test name | Coverage | Result | Note |
|---|---|---|---|---|
| `WSTG-INFO-01` | Conduct Search Engine Reconnaissance for Information Leakage | EXECUTED | PASS | No indexed sensitive artefacts surfaced in public search for the deployed hostnames. |
| `WSTG-INFO-02` | Fingerprint Web Server | EXECUTED | PASS* | Express/Node detected via `x-powered-by` and error signatures. Passes functionally; the header itself is an information leak (M2, `WSTG-CONF-14`). |
| `WSTG-INFO-03` | Review Webserver Metafiles for Information Leakage | EXECUTED | **FAIL** | `robots.txt` enumerates administrative route names → **L2**. |
| `WSTG-INFO-04` | Attack Surface Identification | EXECUTED | **FAIL** | Surface is large and unauthenticated: payment confirmation, webhook, review, analytics, chat, e-mail → **C1, C2, H3, H4, H5**. No inventory exists (API9). |
| `WSTG-INFO-05` | Review Web Page Content for Information Leakage | EXECUTED | **FAIL** | Public JS bundle contains the shared secret → **C3**; `Blog.content` contains raw model HTML → **C4**. *Part B:* the internal secret is deliberately compiled into the client bundle via `VITE_INTERNAL_SECRET` → **FLEX-27**. |
| `WSTG-INFO-06` | Identify Application Entry Points | EXECUTED | PASS | Entry points enumerated from the route table; all reachable and mapped to handlers. |
| `WSTG-INFO-07` | Map Execution Paths Through Application | EXECUTED | PASS | Authenticated, admin and anonymous paths traced to controllers. |
| `WSTG-INFO-08` | Fingerprint Web Application Framework | EXECUTED | PASS | Express + Mongoose + React/Vite confirmed; no framework-level version disclosure beyond `x-powered-by`. |
| `WSTG-INFO-09` | Fingerprint Web Application | EXECUTED | PASS | Fingerprinting consistent across frontend and API. |
| `WSTG-INFO-10` | Map Application Architecture | EXECUTED | **FAIL** | Architecture is a single monolithic Express API plus a SPA — but the *security* architecture is incoherent: three access mechanisms (JWT, static header, none) → **C1, C3**, ASVS `V1.4.4`. |

### 2.2 CONF — Configuration and Deployment Management

| Test ID | Test name | Coverage | Result | Note |
|---|---|---|---|---|
| `WSTG-CONF-01` | Network Infrastructure Configuration | EXECUTED | **FAIL** | Cloudflare fronting identified; `cf-connecting-ip` trusted by the app without hop validation → **M9**. |
| `WSTG-CONF-02` | Application Platform Configuration | EXECUTED | **FAIL** | No `helmet`, no `trust proxy`, 50 MB bodies, `extended: true`, dependency advisories, broken SMTP → **M1, M3, H6, L5**. *Part B:* `multer.memoryStorage()` with `files: 10` × 10 MB buffers 100 MB per request in heap → **FLEX-37**; `.env.example` ships `NODE_ENV=development` → **FLEX-25**; the anti-DDoS middleware is skipped entirely outside production → **FLEX-26**; no security headers → **FLEX-29**; 50 MB body limit → **FLEX-36**; 67 vulnerable dependency entries → **FLEX-38**. |
| `WSTG-CONF-03` | File Extensions Handling for Sensitive Information | SOURCE | PASS | No `.bak`/`.old`/`.git` artefacts reachable; the repo is public but the deployment does not expose VCS paths. |
| `WSTG-CONF-04` | Review Old Backup and Unreferenced Files | EXECUTED | **FAIL** | `Dockerfile` `ENV BLOG_API_KEY`, `cron/generate-blogs.js` fallback, `protectionMiddleware` fallback → **C5, L1**. *Part B:* the `Dockerfile` never sets `INTERNAL_API_KEY`, so `protectionMiddleware` falls back to the `iloilo_work_2026_secure` in any default deployment → **FLEX-06**; the blog pipeline is reachable with the committed default key → **FLEX-18**; live secrets remain in the 177-commit history → **FLEX-39**. |
| `WSTG-CONF-05` | Enumerate Infrastructure and Application Admin Interfaces | EXECUTED | PASS | `/admin` and `/api/v1/health/*` enumerated. Admin correctly gated (**PASS**); health endpoints leak state → **M2**. *Part B:* payment verification resolves an arbitrary space (`Space.findOne({ status: 'Open Now' })`), so an arbitrary gateway key is used → **FLEX-32**; `/health` discloses uptime, RSS memory and the Redis/queue layout → **FLEX-24**. |
| `WSTG-CONF-06` | HTTP Methods | EXECUTED | PASS | `TRACE` disabled; unsupported verbs rejected; method overrides (`X-HTTP-Method-Override`) did not bypass routing → **L7**. |
| `WSTG-CONF-07` | HTTP Strict Transport Security | EXECUTED | **FAIL** | HSTS present on the Vercel frontend (`max-age=63072000`), **absent on API responses** → **M1**. |
| `WSTG-CONF-08` | RIA Cross Domain Policy | EXECUTED | PASS | No cross-domain policy files served. |
| `WSTG-CONF-09` | File Permissions | SOURCE | **FAIL** | Uploaded files land inside the web root and are served by a static route → **L4**. |
| `WSTG-CONF-10` | Subdomain Takeover | PARTIAL | N/A | No dangling DNS records identified; a full takeover sweep of the `vercel.app`/`onrender.com` tenant space is outside the engagement's authorisation. |
| `WSTG-CONF-11` | Cloud Storage | EXECUTED | PASS | No public cloud-storage buckets exposed by the application. |
| `WSTG-CONF-12` | Content Security Policy | EXECUTED | **FAIL** | No CSP on frontend or API → **M1**. |
| `WSTG-CONF-13` | Path Confusion | EXECUTED | PASS | Path normalisation and traversal payloads (`../`, encoded variants) failed closed → **L7**. |
| `WSTG-CONF-14` | Other HTTP Security Header Misconfigurations | EXECUTED | **FAIL** | Missing `nosniff`, `Referrer-Policy`, `frame-ancestors`; `x-powered-by` present → **M1, M2**. |
| `WSTG-CONF-15` | Feature Flag Security Bypass | SOURCE | N/A | No feature-flag system in use. |

### 2.3 IDNT — Identity Management

| Test ID | Test name | Coverage | Result | Note |
|---|---|---|---|---|
| `WSTG-IDNT-01` | Role Definitions | EXECUTED | PASS | Roles are `user`/`admin`; `role` in a registration body is ignored (Mongoose strict mode) → **PASS***. |
| `WSTG-IDNT-02` | User Registration Process | EXECUTED | **FAIL** | Registration has no CAPTCHA and no e-mail verification → **M8**. *Part B:* the credential-recovery path is a second, unprotected registration of an authenticated session → **FLEX-07**. |
| `WSTG-IDNT-03` | Account Provisioning Process | SOURCE | PASS | Accounts are created inactive-less but immediately usable; mitigated by adding e-mail verification (P2/P8). |
| `WSTG-IDNT-04` | Account Enumeration and Guessable User Account | EXECUTED | PASS | Registration and login responses do not distinguish "user exists" from "user missing" (consistent message and timing). |
| `WSTG-IDNT-05` | Weak or Unenforced Username Policy | SOURCE | PASS | E-mail is the identifier; no numeric IDs used as usernames. |

### 2.4 ATHN — Authentication

| Test ID | Test name | Coverage | Result | Note |
|---|---|---|---|---|
| `WSTG-ATHN-01` | Credentials Transported over an Encrypted Channel | EXECUTED | PASS | TLS enforced; no credential accepted over plaintext. |
| `WSTG-ATHN-02` | Default Credentials | EXECUTED | **FAIL** | The fallback secret `flexspace-secret-key` is a *default credential* for the blog pipeline and it is **live in production** → **C5**. *Part B:* two more committed defaults — a staff account created with the literal password `FlexSpace2026` (`staffController.js:95`) → **FLEX-17**, and the same literal mailed to customers in the welcome flow (`emailController.js:21`) → **FLEX-22**. |
| `WSTG-ATHN-03` | Weak Lock Out Mechanism | EXECUTED | **FAIL** | Rate limiting is bypassable in aggregate because the limiter's identity is an unvalidated header, and registration has no CAPTCHA → **M9, M8**. *Part B:* the OTP and password-reset routes carry **no limiter at all** (`authRoutes.js:67-69`), and the OTP is a 6-digit `Math.random()` value (900 000 keyspace) → **FLEX-07**; 500 calls to `forgot-password` produced 500 real e-mails → **FLEX-30**; the limiter bucket is keyed on a client-controlled IP → **FLEX-19**. |
| `WSTG-ATHN-04` | Bypassing Authentication Schema | EXECUTED | **FAIL** | (a) The static `x-app-fingerprint` header bypasses the API's own protection on guarded routes → **C3**. (b) Unauthenticated access to guarded *business* routes → **C1, C2**. *(JWT schema itself passed: `alg:none`, weak secrets, and HS/RS confusion all rejected — L6.)* *Part B:* (c) `POST /auth/forgot-password` accepts a MongoDB operator object as `email`, so authentication is bypassed outright and the target account is taken over → **FLEX-01**. |
| `WSTG-ATHN-05` | Vulnerable Remember Password | SOURCE | N/A | No "remember me" credential flow. |
| `WSTG-ATHN-06` | Browser Cache Weaknesses | EXECUTED | PASS* | Authenticated API responses are not explicitly `no-store`; `Cache-Control` is not set → see **M1** (`V8.2.1`). |
| `WSTG-ATHN-07` | Weak Authentication Methods | EXECUTED | PASS | No insecure "auth" alternatives beyond the fingerprint header (raised under ATHN-04). |
| `WSTG-ATHN-08` | Weak Security Question Answer | SOURCE | N/A | No security-question flow. |
| `WSTG-ATHN-09` | Weak Password Change or Reset Functionalities | PARTIAL | **FAIL** | **Corrected from PASS.** The password-*change* path does enforce the current password and uses bcrypt, but the password-*reset* path does not: `req.body.email` is used directly as a MongoDB filter (`passwordController.js:19, 65, 134`), the OTP is a 6-digit `Math.random()` value, the reset routes are unthrottled, and `verify-otp` returns the reset token in the body → **FLEX-01, FLEX-07**. The initial-password flow (clear-text e-mail) remains a provisioning issue → **H5**. |
| `WSTG-ATHN-10` | Weaker Authentication in Alternative Channel | SOURCE | N/A | No mobile/native/alternate channel. |
| `WSTG-ATHN-11` | Multi-Factor Authentication | SOURCE | N/A | MFA not implemented. Not a finding at the current application risk tier; recommended once the Critical set is closed. |

### 2.5 ATHZ — Authorization

| Test ID | Test name | Coverage | Result | Note |
|---|---|---|---|---|
| `WSTG-ATHZ-01` | Directory Traversal / File Include | EXECUTED | PASS | Traversal payloads fail closed → **L7**. |
| `WSTG-ATHZ-02` | Bypassing Authorization Schema | EXECUTED | **FAIL** | The API's protection schema is a static header (C3); several sensitive endpoints have no schema at all → **C1, C2, M6**. *Part B:* `fix-payment` and `confirm-fee-payment` are guarded by `auth` only, with no tenant scope → **FLEX-11, FLEX-12**; the whole `/space` router has no role gate, so every owner surface answers a plain customer token → **FLEX-42**. |
| `WSTG-ATHZ-03` | Privilege Escalation | EXECUTED | **FAIL** | **Corrected from PASS.** `role: admin` in a registration body *is* ignored and admin routes require a valid admin JWT — but escalation does not need the admin role: a `role=user` account can mark another owner's platform fees as collected → **FLEX-12**, and `spaceController.update` accepts `user_id` from the body, so a space listing can be transferred to an arbitrary account → **FLEX-13**. |
| `WSTG-ATHZ-04` | Insecure Direct Object References | EXECUTED | **FAIL** | `GET /space/booking/:id/review` returns booking data for any valid ObjectId, unauthenticated → **M5**; review-like identity from a client header → **M7**. *Part B:* any authenticated user can re-credit a victim tenant's order → **FLEX-11**; a voucher issued in one tenant zeroes another tenant's bill → **FLEX-08**; staff can be created inside another tenant's space → **FLEX-17**; a forged review is auto-approved → **FLEX-14**; the planted staff account is invisible to the tenant it attacks, so it cannot be seen or deleted → **FLEX-43**. |
| `WSTG-ATHZ-05` | OAuth Weaknesses | SOURCE | N/A | No OAuth surface. |

### 2.6 SESS — Session Management

| Test ID | Test name | Coverage | Result | Note |
|---|---|---|---|---|
| `WSTG-SESS-01` | Session Management Schema | EXECUTED | PASS | JWT with a server-side verified secret. |
| `WSTG-SESS-02` | Cookies Attributes | SOURCE | N/A | No cookies are used for session state (the token is in `localStorage` — see `WSTG-CLNT-12`). |
| `WSTG-SESS-03` | Session Fixation | EXECUTED | PASS | A fresh token is issued on login; the previous token is not reused. |
| `WSTG-SESS-04` | Exposed Session Variables | EXECUTED | PASS | No session data in URLs or server-rendered HTML. |
| `WSTG-SESS-05` | Cross Site Request Forgery | SOURCE | PASS* | Bearer-token auth in the `Authorization` header means a cross-site form cannot set the header — CSRF is structurally mitigated. *This protection disappears if the session moves to a cookie; that migration must add `SameSite=Strict` + a CSRF token.* |
| `WSTG-SESS-06` | Logout Functionality | EXECUTED | **FAIL** | **Corrected from PASS.** An invalid or absent token correctly returns `401`, but a *valid* token is not invalidated by logout: the JWT is stateless and there is no server-side session record to revoke, so the token keeps working until its expiry → **FLEX-20**. |
| `WSTG-SESS-07` | Session Timeout | SOURCE | **FAIL** | **Corrected.** Part A recorded "no token expiry observed"; the expiry does exist — `config.js:18` sets `accessExpirationMinutes: 720`, i.e. **12 hours**. The finding stands on different grounds: the lifetime is long, there is no inactivity timeout, no periodic re-authentication, and the token cannot be revoked → **FLEX-20**. |
| `WSTG-SESS-08` | Session Puzzling | SOURCE | PASS | No session-handling confusion found. |
| `WSTG-SESS-09` | Session Hijacking | EXECUTED | **FAIL** | The token sits in `localStorage`, so any XSS on the origin yields the session → amplifies **C4** into account takeover. |
| `WSTG-SESS-10` | JSON Web Tokens | EXECUTED | PASS | `alg:none` rejected; 12 weak-secret candidates rejected; HS/RS confusion prevented by `jsonwebtoken` key-type rules → **L6**. |
| `WSTG-SESS-11` | Concurrent Sessions | SOURCE | N/A | No concurrent-session policy; not implemented by design. |

### 2.7 INJT — Injection

| Test ID | Test name | Coverage | Result | Note |
|---|---|---|---|---|
| `WSTG-INJT-01` | Reflected Cross-Site Scripting | EXECUTED | PASS | Reflected payloads were not reflected unencoded. |
| `WSTG-INJT-02` | Stored Cross-Site Scripting | EXECUTED | **FAIL** | `Space.name` → LLM prompt → raw HTML in `Blog.content` → `dangerouslySetInnerHTML` at `BlogDetail.jsx:160` → **C4**. A second sink exists at `UserManual.jsx:1235`. *Part B:* a third family — customer-controlled names reaching the **operator's** authenticated session through receipt/report HTML → **FLEX-15**. |
| `WSTG-INJT-03` | HTTP Verb Tampering | EXECUTED | PASS | Method-override headers did not change the dispatched handler → **L7**. |
| `WSTG-INJT-04` | HTTP Parameter Pollution | EXECUTED | PASS* | Express's default parser behaviour held; no pollution-based bypass found, but no explicit defence exists → ASVS `V5.1.1` PARTIAL. |
| `WSTG-INJT-05` | SQL Injection | EXECUTED | **FAIL** | **Corrected from PASS.** There is no SQL surface (Mongoose only), but the equivalent attack on the data layer succeeds: `POST /auth/forgot-password` passes `req.body.email` straight into `User.findOne({ email })`, so `{"email":{"$ne":null}}` selects the first user in the database → **FLEX-01**. Part A had recorded login as blocked (non-finding `L8`) and therefore concluded the application was not injectable; that conclusion applies to login only. |
| `WSTG-INJT-06` | LDAP Injection | EXECUTED | N/A | No LDAP surface. |
| `WSTG-INJT-07` | XML Injection | EXECUTED | N/A | No XML parser in the request path. |
| `WSTG-INJT-08` | SSI Injection | EXECUTED | N/A | No server-side include mechanism. |
| `WSTG-INJT-09` | XPath Injection | EXECUTED | N/A | No XPath surface. |
| `WSTG-INJT-10` | IMAP/SMTP Injection | EXECUTED | **FAIL** | The unauthenticated e-mail relay accepts a caller-supplied recipient and body → header-injection/spam potential → **H5**. *Part B:* reproduced as an open relay → **FLEX-05**. |
| `WSTG-INJT-11` | Code Injection | EXECUTED | PASS | No dynamic `eval`/`Function` on user input. |
| `WSTG-INJT-12` | Command Injection | EXECUTED | PASS | No shell invocation of user input. |
| `WSTG-INJT-13` | Buffer Overflow / Format String | EXECUTED | N/A | Managed Node.js runtime; no native buffer handling of user input. |
| `WSTG-INJT-14` | Incubated Vulnerability | SOURCE | N/A | No scheduled/cron-driven task executes user-controlled code. The blog cron exists but consumes only configured content. |
| `WSTG-INJT-15` | HTTP Response Splitting | EXECUTED | PASS | CRLF injection attempts in headers/parameters were rejected. |
| `WSTG-INJT-16` | HTTP Request Smuggling | EXECUTED | PASS | CL/TE and TE/CL desync attempts failed; Cloudflare normalises the front hop. |
| `WSTG-INJT-17` | Host Header Injection | EXECUTED | PASS | Injected `Host` header rejected with `403`; no cache-poisoning or password-reset vector observed. |
| `WSTG-INJT-18` | Server-Side Template Injection | EXECUTED | PASS | No server-side template engine with user-controlled input. |
| `WSTG-INJT-19` | Server-Side Request Forgery | EXECUTED | PASS | All outbound calls use a fixed configured base URL; no user-controlled host → **A10 / API7 PASS**. *(One caveat: `paymentIntentId` is interpolated into an outbound URL path without encoding — see the consolidated solutions.)* |
| `WSTG-INJT-20` | Mass Assignment | EXECUTED | **FAIL** | **Corrected from PASS\*.** `role` cannot be mass-assigned at registration, but only because of Mongoose strict mode. Elsewhere the protection does not exist: `spaceController.update` block-lists only `_id`, `__v` and `created_at`, so `user_id` is writable and a space listing can be transferred to an arbitrary account → **FLEX-13**. ASVS `V5.1.2` and `V15.3.3` are now FAIL. *Part B:* `req.body` is spread straight into `findOneAndUpdate` in `posController`, `spaceController` and `roomController` with no field allow-list → **FLEX-35**. |
| `WSTG-INJT-21` | CSV Injection | SOURCE | N/A | No CSV export feature. |
| `WSTG-INJT-22` | Prototype Pollution | EXECUTED | PASS | `__proto__`/`constructor` payloads had no effect. |
| `WSTG-INJT-23` | Insecure Deserialization | EXECUTED | PASS | Only `JSON.parse` on request bodies; no `node-serialize`/`unserialize` surface. |

### 2.8 ERRH — Error Handling

| Test ID | Test name | Coverage | Result | Note |
|---|---|---|---|---|
| `WSTG-ERRH-01` | Improper Error Handling | EXECUTED | **FAIL** | Raw Mongoose cast errors returned to the client (`Cast to ObjectId failed for value "notanobjectid" ... for model "Space"`) → **M2**. *Part B:* stack traces and absolute paths are returned whenever `NODE_ENV != production` → **FLEX-25**; the activity logger persists whole documents — including bcrypt hashes and live reset tokens — and expected 4xx responses are written to `ErrorLog` as errors → **FLEX-16, FLEX-34, FLEX-40**. |
| `WSTG-ERRH-02` | Stack Traces | EXECUTED | PASS | Production responses omit the stack (the `errorHandler` strips it outside development). |

### 2.9 CRYP — Weak Cryptography

| Test ID | Test name | Coverage | Result | Note |
|---|---|---|---|---|
| `WSTG-CRYP-01` | Weak Transport Layer Security | EXECUTED | PASS | TLS 1.2+/1.3 only; no mixed content. |
| `WSTG-CRYP-02` | Padding Oracle | SOURCE | N/A | No symmetric block cipher in the request path. |
| `WSTG-CRYP-03` | Sensitive Information Sent via Unencrypted Channels | EXECUTED | **FAIL** | The welcome e-mail transmits the account password in clear text → **H5**. |
| `WSTG-CRYP-04` | Weak Cryptographic Primitives | EXECUTED | **FAIL** | Hardcoded key material in source, in the image and in the browser bundle → **C5, C3, L1**. *Part B:* the internal secret is designed to ship to the browser (`VITE_INTERNAL_SECRET` inlined by Vite) → **FLEX-27**; blog generation is public and guarded only by the committed default key → **FLEX-18**. |

### 2.10 BUSL — Business Logic

| Test ID | Test name | Coverage | Result | Note |
|---|---|---|---|---|
| `WSTG-BUSL-01` | Business Logic Data Validation | EXECUTED | **FAIL** | Payment and analytics inputs are not validated against business rules → **C1, H3**. *Part B:* the charged amount, the POS total and the booking duration are all client-supplied → **FLEX-04, FLEX-10, FLEX-09**. |
| `WSTG-BUSL-02` | Ability to Forge Requests | EXECUTED | **FAIL** | The payment-confirmation request can be forged and honoured by an anonymous client → **C1**. *Part B:* `confirm-payment` completes a booking without ever contacting the gateway → **FLEX-03**. |
| `WSTG-BUSL-03` | Integrity Checks | EXECUTED | **FAIL** | The webhook carries no signature; integrity of the settlement message is unverified → **C2**. *Part B:* an unauthenticated webhook marks any booking as paid → **FLEX-02**. |
| `WSTG-BUSL-04` | Process Timing | EXECUTED | **FAIL** | Booking/payment steps can be invoked out of order; no server-side state machine → **C1**. *Part B:* the amount, the POS total and the booking duration are all taken from the client → **FLEX-04, FLEX-09, FLEX-10**; a voucher is applied without a tenant check → **FLEX-08**. |
| `WSTG-BUSL-05` | Number of Times a Function Can Be Used Limits | EXECUTED | **FAIL** | Unrestricted registration, unbounded analytics ingestion, unmetered AI chat → **M8, H3, H4**. *Part B:* the AI chat endpoint is unauthenticated, so the third-party spend is unmetered → **FLEX-23**. |
| `WSTG-BUSL-06` | Circumvention of Workflows | EXECUTED | **FAIL** | The QR check-in workflow can be skipped by writing payment state directly → **C1**. *Part B:* the registration approval gate is not re-applied to listing creation, so a customer can publish a live, bookable space with no permit or DTI approval → **FLEX-41**. |
| `WSTG-BUSL-07` | Defenses Against Application Misuse | EXECUTED | **FAIL** | No misuse detection on the payment flow → **A09-03**. |
| `WSTG-BUSL-08` | Upload of Unexpected File Types | EXECUTED | **FAIL** | The upload filter trusts the client-supplied MIME type → **M4**. |
| `WSTG-BUSL-09` | Upload of Malicious Files | EXECUTED | **FAIL** | Files are served from a static path in the web root with an attacker-influenced content type → **M4, L4**. |
| `WSTG-BUSL-10` | Payment Functionality | EXECUTED | **FAIL** | The defining test of the engagement: payment state can be set to `paid` by an anonymous, unsigned request → **C1, C2**. *Part B:* the amount is client-supplied → **FLEX-04**; the same route completes without contacting the gateway → **FLEX-03**. |

### 2.11 CLNT — Client-side

| Test ID | Test name | Coverage | Result | Note |
|---|---|---|---|---|
| `WSTG-CLNT-01` | DOM-based Cross-Site Scripting | EXECUTED | PASS | DOM sinks reviewed; the only `dangerouslySetInnerHTML` sinks are fed by stored content (raised under INJT-02). |
| `WSTG-CLNT-02` | JavaScript Execution | EXECUTED | PASS | No `eval`/`setTimeout(string)`/`Function` on user input. |
| `WSTG-CLNT-03` | HTML Injection | EXECUTED | **FAIL** | Same sink as INJT-02 — raw model HTML injected into the DOM → **C4**. |
| `WSTG-CLNT-04` | Client-side URL Redirect | EXECUTED | PASS | No unvalidated `location` assignment from user data. |
| `WSTG-CLNT-05` | CSS Injection | EXECUTED | PASS | No user-controlled style injection found. |
| `WSTG-CLNT-06` | Client-side Resource Manipulation | EXECUTED | PASS | No client-controlled third-party resource loading. |
| `WSTG-CLNT-07` | Cross-Origin Resource Sharing | EXECUTED | **FAIL** | Credentialed CORS reflects any `*.vercel.app` / `*.onrender.com` origin → **H1**. *Part B:* confirmed dynamically for an attacker-controlled `*.vercel.app` and `*.onrender.com` origin, with `Access-Control-Allow-Credentials: true` → **FLEX-21**. |
| `WSTG-CLNT-08` | Cross Site Flashing | SOURCE | N/A | No Flash. |
| `WSTG-CLNT-09` | Clickjacking | EXECUTED | **FAIL** | No `X-Frame-Options` / `frame-ancestors` on the API; frontend framing unverified → **M1**. |
| `WSTG-CLNT-10` | WebSockets | EXECUTED | N/A | No WebSocket endpoint. |
| `WSTG-CLNT-11` | Web Messaging | EXECUTED | PASS | `postMessage` origins checked; no unsafe handler found. |
| `WSTG-CLNT-12` | Browser Storage | EXECUTED | **FAIL** | The JWT is stored in `localStorage` → amplifies **C4**. *Part B:* the stored token is directly readable by any script on the origin, which is what turns the customer-name XSS into operator account compromise → **FLEX-28**, **FLEX-15**. |
| `WSTG-CLNT-13` | Cross Site Script Inclusion | EXECUTED | PASS | No user-influenced `<script src>`. |
| `WSTG-CLNT-14` | Reverse Tabnabbing | EXECUTED | PASS | `rel="noopener"` present where `target="_blank"` is used. |
| `WSTG-CLNT-15` | Client-Side Template Injection | EXECUTED | PASS | No client-side template evaluation of user data. |

### 2.12 APIT — API Testing

| Test ID | Test name | Coverage | Result | Note |
|---|---|---|---|---|
| `WSTG-APIT-01` | API Reconnaissance | EXECUTED | **FAIL** | No OpenAPI contract; endpoint/auth inventory absent → API9 PARTIAL. |
| `WSTG-APIT-02` | API Broken Object Level Authorization | EXECUTED | **FAIL** | Booking objects readable and mutable by object id without ownership → **M5**. |
| `WSTG-APIT-03` | API Excessive Data Exposure | EXECUTED | **FAIL** | Full booking documents returned to anonymous callers, including `qr_code_token` → **M5**. |
| `WSTG-APIT-04` | API Broken Function Level Authorization | EXECUTED | **FAIL** | Sensitive functions reachable without function-level authorisation → **C1, C2, C3, M6, M8**. *(The `/admin` surface is correctly gated.)* *Part B:* the whole `/space` owner surface answers a plain customer token → **FLEX-42**; the AI chat endpoint is unauthenticated → **FLEX-23**. |
| `WSTG-APIT-99` | GraphQL | EXECUTED | N/A | No GraphQL endpoint. |

### 2.13 WASM — WebAssembly Testing

| Test ID | Test name | Coverage | Result | Note |
|---|---|---|---|---|
| `WSTG-WASM-01` | WebAssembly Reconnaissance | EXECUTED | N/A | No WebAssembly module served by the application. |

---

## 3. Consolidated proposed solutions

The 47 failing WSTG tests reduce to **sixteen** changes. Effort: **S** ≤ 1 day · **M** 2–5 days · **L** > 5 days. The identifiers below are the same `P1`–`P16` used in `OWASP-SECURITY-ASSESSMENT.md` §7, so a single vocabulary spans all three OWASP documents.

| ID | Change | Closes (WSTG) | Closes (finding) | Effort |
|---|---|---|---|---|
| **P1** | Delete the client-side fingerprint; one authentication model for the whole API | ATHN-04, ATHZ-02, CONF-04, CRYP-04 | C3, L1, FLEX-27 | M |
| **P2** | Payment as a verified consequence: gateway re-verification, webhook HMAC over the raw body, idempotent transaction, unique constraint on the provider reference | BUSL-01, BUSL-02, BUSL-03, BUSL-04, BUSL-06, BUSL-07, BUSL-10, APIT-04, ATHN-04 | C1, C2, FLEX-02, FLEX-03 | L |
| **P3** | Sanitise AI output at the boundary and at the sink; constrain owner input; add a CSP | INJT-02, CLNT-03 | C4, M1 | M |
| **P4** | Managed secret store; no `\|\|` fallbacks; rotate `INTERNAL_API_KEY`/`BLOG_API_KEY`; purge git history; `gitleaks` in CI | CONF-04, CRYP-04, ATHN-02 | C5, L1, FLEX-06, FLEX-18, FLEX-39 | M |
| **P5** | One trusted client-IP resolver (`trust proxy` + verified hop), drop the private-range exemption | CONF-01, ATHN-03, ATHZ-04, INFO-01 | M9, M7, FLEX-19 | S |
| **P6** | Security-event catalogue, structured logging, alerting on payment/admin/registration events | BUSL-07, INFO-10, ERRH-01 | A09-01/02/03 | M |
| **P7** | `helmet` baseline, exact-origin CORS with `credentials: false`, 1 MB bodies, generic errors, `no-store` on personal data | CONF-02, CONF-07, CONF-12, CONF-14, ERRH-01, ATHN-06, CLNT-07, CLNT-09 | H1, M1, M2, M3, FLEX-21, FLEX-29, FLEX-36 | S |
| **P8** | Ownership-scoped object queries; field-minimal response DTOs; treat `qr_code_token` as a credential | ATHZ-04, APIT-02, APIT-03 | M5, C1 (response), FLEX-14 | M |
| **P9** | Dependency audit gate, SBOM per build, dependency bot, secret scanning | CONF-02 | H6, FLEX-38 | S |
| **P10** | Never let a request object become a query: coerce `email` to a string at the boundary, allow-list every filter field, CSPRNG OTPs, rate-limit every auth-adjacent route | INJT-05, ATHN-03, ATHN-09, IDNT-02 | FLEX-01, FLEX-07, FLEX-30, FLEX-35 | S |
| **P11** | The server computes the money: rebuild totals from line items, reject null dates, one voucher rule bound to `space_id` | BUSL-01, BUSL-04, BUSL-10, INJT-20 | FLEX-04, FLEX-09, FLEX-10, FLEX-12, FLEX-31, FLEX-32 | M |
| **P12** | Tenant identity comes from the token, never from the body: `requireSpaceScope()` + `requireRole()` on every `/space` route, allow-listed writable fields, approval state machine for listings | ATHZ-02, ATHZ-03, ATHZ-04, APIT-02, APIT-04, BUSL-06 | FLEX-08, FLEX-11, FLEX-12, FLEX-13, FLEX-17, FLEX-41, FLEX-42, FLEX-43 | L |
| **P13** | Revocable, short-lived sessions: server-side token version, 15–30 min access token, role read from the database | ATHN-06, ATHN-09, SESS-06, SESS-07, SESS-09, CLNT-12, IDNT-02 | FLEX-20, FLEX-28 | M |
| **P14** | Secrets must not survive into logs, e-mail or defaults: redact by pattern and value shape, store an allow-list of changed fields, no default passwords, `.env.example` is not runnable | ERRH-01, CONF-02, CONF-04, ATHN-02, ATHN-09 | FLEX-16, FLEX-17, FLEX-22, FLEX-25, FLEX-26, FLEX-34, FLEX-40 | M |
| **P15** | One rendering boundary for every operator-facing HTML; move the session token out of `localStorage` | INJT-02, CLNT-01, CLNT-03, CLNT-12 | FLEX-15, C4 | M |
| **P16** | Bound the work an unauthenticated request can cause: stream uploads, cap counts, per-account **and** per-IP quotas, unconditional anti-DDoS layer | BUSL-05, BUSL-08, CONF-02, APIT-01 | FLEX-23, FLEX-37 | S |

### 3.1 Implementation order

```
Stage 1 (days 1-3)   P10 → P5  → P7  → P9      small, no behavioural risk; P10 first because it closes the account-takeover chain
Stage 2 (days 4-10)  P1  → P4  → P3  → P16      clears the C3/C5/C4 chain; needs a coordinated frontend+backend release
Stage 3 (days 11-25) P2                           payment rebuild — the highest-value change, needs provider-side work
Stage 4 (days 26-40) P8  → P6  → P12  → P14    ownership scoping, logging, tenant identity, secret hygiene
Stage 5 (days 41-50) P13 → P15                  revocable sessions, rendering boundary
```

Stage 1 and Stage 2 remove **all five Part A Critical findings except C1/C2**, and the two C1/C2 findings are both closed by Stage 3. Stage 1 opens with **P10**, which closes the Part B Critical **FLEX-01** — the three-request account takeover — because that outranks every revenue defect.

### 3.2 Secure-by-design patterns to adopt

These are the patterns whose absence caused the findings. Each is written as a rule, with the finding it prevents.

| # | Rule | Prevents |
|---|---|---|
| R1 | **Anything the browser knows is public.** No secret, key or shared token may be delivered to a client. | C3, L1 |
| R2 | **A state change is a consequence, never a command.** The client may *request*; the server must *derive* and *verify*. | C1 |
| R3 | **Every inbound event from a third party carries a signature over its raw body**, verified with a constant-time compare before parsing. | C2 |
| R4 | **One trusted client-IP resolver**, used by every component that makes a security decision. No component may read a proxy header directly. | M9, M7, A09-02 |
| R5 | **All third-party content is untrusted.** Sanitise at the boundary and at the sink; never render it as raw HTML. | C4 |
| R6 | **A missing secret is a boot failure.** No fallback literal may exist for a production credential. | C5, L1 |
| R7 | **One authorisation model.** Every route is exactly one of `public` / `authenticated` / `authenticated + owner` / `authenticated + role`, declared in one place. | C1, C2, M5, M6, M8 |
| R8 | **Scope the query, not the response.** Authorisation is expressed in the database filter; an unauthorised id returns `404`. | M5 |
| R9 | **Return the minimum.** Responses are purpose-built DTOs, never serialised documents. | M5, API3 |
| R10 | **Every security decision is logged with an actor, an object, an outcome and a correlation id.** | A09-01/02/03 |
| R11 | **A request body is data, never a query.** Coerce every scalar at the boundary; build every filter from an explicit allow-list. | FLEX-01, FLEX-35 |
| R12 | **The server owns every number that affects money.** Amount, total, discount and duration are derived from stored records, never accepted from the client. | FLEX-04, FLEX-09, FLEX-10, FLEX-12 |
| R13 | **Identity and tenancy come from the token, never from the request.** `space_id` is derived from the authenticated principal and compared to the target object. | FLEX-08, FLEX-11, FLEX-13, FLEX-17, FLEX-42 |
| R14 | **A session is revocable and short-lived.** Stateless tokens with no server-side record are not sessions. | FLEX-20 |
| R15 | **Secrets are redacted by pattern and value shape, and are never defaulted.** A missing production secret is a boot failure, not a fallback literal. | FLEX-06, FLEX-16, FLEX-17, FLEX-22 |
| R16 | **An unauthenticated request may not cause unbounded work.** Uploads stream to disk, quotas are per-account *and* per-IP, and protective middleware is unconditional. | FLEX-23, FLEX-37 |

---

## 4. Re-test plan

### 4.1 Re-test order

| Phase | Tests to re-run | Entry condition |
|---|---|---|
| **R1** | `CONF-01`, `CONF-02`, `CONF-07`, `CONF-12`, `CONF-14`, `CLNT-07`, `CLNT-09`, `ERRH-01`, `ATHN-06` | P5, P7, P9 deployed |
| **R2** | `CONF-04`, `CRYP-04`, `ATHN-02`, `ATHN-04`, `ATHZ-02`, `INFO-05`, `SESS-10` | P1, P4 deployed |
| **R3** | `INJT-02`, `CLNT-03`, `CLNT-12`, `SESS-09` | P3 deployed |
| **R4** | `BUSL-01`..`BUSL-07`, `BUSL-10`, `APIT-02`, `APIT-03`, `APIT-04`, `ATHZ-04`, `ATHN-03`, `IDNT-02`, `BUSL-05` | P2, P8, P6, P10 deployed |
| **R5** | `INJT-05`, `ATHN-09`, `ATHZ-03`, `SESS-06`, `SESS-07`, `INJT-20`, `ERRH-01`, `BUSL-08`, `BUSL-09`, `CLNT-12`, `CONF-04`, `CRYP-04` | P10, P11, P12, P13, P14, P15 deployed |
| **R6** | Full sweep of all 117 test IDs | All stages complete |

### 4.2 Re-test assertions (pass criteria)

| Finding | Assertion | Expected |
|---|---|---|
| C1 | `POST /api/v1/landing/orders/:orderId/confirm-payment` with no `Authorization` header | `401`/`403`, booking unchanged |
| C1 | Same call with a valid *user* JWT but no gateway confirmation | `409` or `202` (pending verification), never `completed` |
| C1 | Two concurrent identical confirmations | Exactly one transition (idempotency enforced) |
| C2 | Webhook with a valid body and an invalid signature | `401`, no state change, security event logged |
| C2 | Webhook replayed with a previously accepted signature | No state change (idempotency key honoured) |
| C3 | `curl` a guarded route without the fingerprint header | `401` |
| C3 | Grep the production bundle for `INTERNAL_SECRET`/`fingerprint` | No match |
| C3 | `curl` with the old fingerprint value | `401` (the constant is gone) |
| C4 | Fetch every published blog and scan the content for `<script`, `onerror=`, `javascript:`, `data:text/html` | Zero matches |
| C4 | Publish a blog whose source text contains a payload | Content is escaped or stripped |
| C5 | `curl` the blog-generation endpoint with `flexspace-secret-key` | `401` |
| C5 | `grep -r "flexspace-secret-key"` in the repo and image | No match |
| C5 | Boot the API with `BLOG_API_KEY` unset | Process exits non-zero with a clear error |
| H1 | `Origin: https://evil-attacker-xyz.vercel.app` on a preflight | No `access-control-allow-origin` header |
| H1 | `Origin: https://flexspace-iloilo.vercel.app` on a preflight | Exact origin echoed, `credentials: false` |
| M1 | Header dump on frontend and API | `CSP`, `nosniff`, `Referrer-Policy`, `frame-ancestors`, `HSTS` present |
| M2 | `GET /api/v1/health` unauthenticated | `401`, or a minimal `{status}` body only |
| M2 | `GET /api/v1/space/booking/<invalid-oid>` | Generic message; no model or path names |
| M3 | `POST` a 5 MB body to any endpoint | `413` |
| M4 | Upload a file named `.html` with `Content-Type: image/png` | Rejected on magic-byte inspection |
| M5 | `GET /api/v1/space/booking/<other-users-oid>/review` | `404`, no body content |
| M5 | Response body inspection | No `qr_code_token`, no guest PII for non-owners |
| M7 | Repeat a review-like with a forged `x-forwarded-for` | The dedup key is server-derived and stable |
| M8 | 20 registrations in a minute from one IP | CAPTCHA required from the first request |
| M8 | Brute-force one account from rotating IPs | Per-account lockout engages |
| M9 | Same-window `A A A B A` request pattern | The limiter keys match the real client IP for all five |
| M9 | Request with `cf-connecting-ip: 10.0.0.1` | The app uses the real peer address, not the header |
| M9 | Request with a forged `x-forwarded-for` chain | The app ignores the untrusted header |
| A09-01 | Trigger the (now-fixed) payment flow | A security event with actor, object, outcome, IP and correlation id |
| A09-03 | The same event | An alert fires |
| A09-02 | Compare logged IPs across two clients | Distinct, correct client addresses |
| L2 | `GET /robots.txt` | No administrative route names |
| H6 | `npm audit` in both trees | 0 critical, 0 high |
| FLEX-01 | `POST /api/v1/auth/forgot-password` with `{"email":{"$ne":null}}` | `400` — the body value is not a string |
| FLEX-01 | `POST /api/v1/auth/forgot-password` with `{"email":{"$regex":"^a"}}` | `400` — same |
| FLEX-01 | `POST /api/v1/auth/reset-password` with `{"resetToken":{"$ne":null}}` | `400` — same |
| FLEX-07 | 10 requests to `verify-otp` with different 6-digit codes | `429` before the 10th; no OTP ever returned |
| FLEX-07 | Inspect the OTP generator | `crypto.randomInt`, ≥ 8 characters, not `Math.random()` |
| FLEX-08 | Redeem a `space_specific` voucher against another tenant's booking | `403` — voucher bound to the issuing `space_id` |
| FLEX-08 | Redeem the same voucher twice | `409` — `usage_count` enforced for every voucher type |
| FLEX-09 | Create a booking with `check_in_at: null` | `400` — rejected before any arithmetic |
| FLEX-10 | `POST` a POS order with `total: 1` and a real line item worth 5000 | Stored total is 5000; the body total is ignored |
| FLEX-11 | `POST /space/orders/<victim-order>/fix-payment` as another tenant | `404` — the tenant filter excludes the object |
| FLEX-12 | `POST /space/payment/confirm-fee-payment` with `role=user` | `403` — a role gate is enforced |
| FLEX-13 | `PUT /space/<id>` with `user_id` in the body | The field is ignored — only allow-listed fields are written |
| FLEX-14 | `POST /space/booking/<id>/review` unauthenticated | `401`; the review is queued, not auto-approved |
| FLEX-15 | A booking whose customer name is `<img src=x onerror=...>` | Rendered as text; no `onerror` attribute in the DOM |
| FLEX-16 | Trigger a password reset, then read the activity log and `ErrorLog` collections | No bcrypt hash, no reset token, no OTP, no plaintext password |
| FLEX-17 | `POST /space/staff` with another tenant's `space_id` | `403` — the space is not the caller's |
| FLEX-20 | Log out, then reuse the same token | `401` — the token version was incremented |
| FLEX-20 | Inspect `config.js` | Access-token lifetime ≤ 30 minutes |
| FLEX-22 | Read the welcome e-mail in the mock SMTP sink | No password in the body; a one-time setup link instead |
| FLEX-25 | `GET` an invalid ObjectId with `NODE_ENV=development` | Generic message; no stack, no filesystem path |
| FLEX-37 | Upload 10 × 10 MB in one request | `413`, or the file is streamed to disk; RSS does not jump 100 MB |
| FLEX-41 | `POST /space/spaces` as a `role=user` account | `202` — the listing enters the approval queue, not the live list |
| FLEX-42 | `GET /space/earnings` with a plain customer token | `403` — the `/space` router has a role gate |
| FLEX-43 | `GET /space/staff` as the victim owner after an account is attached | The attached account is listed and can be disabled |

### 4.3 Regression tests to add to the permanent suite

| Test | Asserts | Prevents regression of |
|---|---|---|
| `security/auth-required.spec.js` | Every non-`publicRoutes` endpoint returns `401` without a token | C3, M6 |
| `security/object-ownership.spec.js` | A user cannot read or mutate another user's booking/space | M5 |
| `security/payment-webhook.spec.js` | Invalid signature → `401`; replay → no-op | C2 |
| `security/payment-confirm.spec.js` | Confirmation without gateway verification cannot complete a booking | C1 |
| `security/cors.spec.js` | Only exact allow-listed origins receive `Access-Control-Allow-Origin` | H1 |
| `security/headers.spec.js` | The required security headers are present on every response | M1 |
| `security/xss-sanitiser.spec.js` | A hostile payload in blog content is escaped at render time | C4 |
| `security/secrets.spec.js` | No known literal secret appears in the source or the built bundle | C5, L1 |
| `security/ip-resolution.spec.js` | The limiter keys on the real client address | M9 |
| `security/security-events.spec.js` | Payment and admin actions produce structured log entries | A09-01 |
| `security/query-coercion.spec.js` | No request object is ever passed to a Mongo filter; operator payloads are rejected | FLEX-01, FLEX-35 |
| `security/tenant-scope.spec.js` | Every space-scoped route rejects a caller from another tenant | FLEX-08, FLEX-11, FLEX-17 |
| `security/server-computes-money.spec.js` | Totals, fees and durations are derived server-side and cannot be lowered by the client | FLEX-04, FLEX-09, FLEX-10 |
| `security/token-revocation.spec.js` | A token issued before logout or a password change is rejected | FLEX-20 |
| `security/log-redaction.spec.js` | No secret, hash or token appears in any persisted log row | FLEX-16 |

---

## 5. Known limitations of this coverage pass

Recorded so the coverage claim is not over-read:

1. **No authenticated-user testing.** All user-scoped flows were exercised as an anonymous client or with a self-registered account. A malicious *authenticated* user was not modelled — a dedicated IDOR sweep with two test accounts on either side of an ownership boundary was not performed. **Part B closed most of this gap**: the sandbox engagement modelled a self-registered customer against a victim tenant and found FLEX-08, FLEX-11, FLEX-12, FLEX-13 and FLEX-17. It did not model a *staff* account attacking a third tenant, nor an admin-level adversary, so that path remains open.
2. **No web-application-firewall or cloud-console review.** Cloudflare rules, Render service configuration, DNS, and the MongoDB Atlas deployment were not in scope; the assessment saw only HTTP behaviour.
3. **No dependency-vulnerability reproduction.** Advisories were enumerated from `npm audit`; none was individually exploited.
4. **No file-upload content execution was attempted** beyond type validation; the exploit chain for a served HTML file was reasoned, not run.
5. **Subdomain takeover was partially assessed** (`WSTG-CONF-10`).
6. **The payment provider's own API was not tested** — the findings concern how FlexSpace *consumes* it, not the provider.
7. **WSTG `master` was used**, which is an in-progress v5 draft. It contains one duplicated identifier — `WSTG-INJT-13` is used twice (Buffer Overflow and Format String Injection) — so the tree holds **118 test documents but only 117 unique IDs**. Both documents are covered by a single merged row above; the count of unique IDs is 117 and that is what the totals use.

---

## 6. Provenance

| Item | Value |
|---|---|
| WSTG test IDs dispositioned | **117 unique IDs** / 118 test documents — every ID present in `OWASP/wstg` `master`, `document/4-Web_Application_Security_Testing/` |
| Test titles | Taken verbatim from each test file's `\|ID\|` table |
| Categories | INFO · CONF · IDNT · ATHN · ATHZ · SESS · INJT · ERRH · CRYP · BUSL · CLNT · APIT · WASM |
| Finding IDs | `SECURITY-PENTEST-REPORT.md` (Part A: `C1`–`C5`, `H1`–`H6`, `M1`–`M9`, `L1`–`L5`) · `SECURITY-PENTEST-REPORT-SANDBOX.md` (Part B: `FLEX-01`–`FLEX-43`) |
| Result counts | Computed from the 117 matrix rows by script: **47 FAIL · 49 PASS / PASS\* · 21 N/A** (Part A only: 42 / 54 / 21) |
| Pattern identifiers | `P1`–`P16` and `R1`–`R16` are shared with `OWASP-SECURITY-ASSESSMENT.md` §7 |
| ASVS references | `OWASP-ASVS-CONTROL-MATRIX.md` |
| Code changes during this assessment | **None** |
