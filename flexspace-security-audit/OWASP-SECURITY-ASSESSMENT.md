# OWASP Security Layer Assessment — FlexSpace Iloilo

| Field | Value |
|---|---|
| **Target — frontend** | `https://flexspace-iloilo.vercel.app` |
| **Target — backend API** | `https://flexspace-z079.onrender.com` |
| **Source assessed** | `/home/khent/flexspace` — `github.com/500-Pesos-Noche-Buena/flexspace` (177 commits, `main`) |
| **Assessment date** | 22 Oct 2026 |
| **Assessment type** | OWASP-layer conformance review — black-box against production + white-box source review |
| **Code changes made** | **None.** This engagement was read-only. No file in `/home/khent/flexspace` was created, modified, or deleted. |
| **Companion report** | `SECURITY-PENTEST-REPORT.md` (full findings, PoCs, code-level remediation) |
| **Second engagement** | `SECURITY-PENTEST-REPORT-SANDBOX.md` — an independent sandbox-based assessment (MongoDB replica set, Redis, mock PayBridge, mock SMTP) covering 43 findings, 26 of them new relative to Part A. Reconciled into this document as **Part B** (§6). |
| **Frameworks applied** | OWASP Top 10 (2021) · OWASP API Security Top 10 (2023) · OWASP ASVS v4.0.3 · OWASP ASVS v5.0.0 · OWASP Web Security Testing Guide (118 test IDs) |
| **OWASP sources used** | Official OWASP repositories and release artefacts, fetched for this assessment: `OWASP/ASVS` tag `v4.0.3` + `v5.0.0_release` (English requirement CSVs, 286 + 345 requirements) and `OWASP/wstg` `master` (test-ID index, 118 IDs) |
| **Overall OWASP verdict** | **FAIL** — 9 of 10 OWASP Top 10 (2021) categories fail · 8 of 10 API categories fail · ASVS conformance **denied at every level** |
| **Merged finding register** | **10 Critical · 15 High · 15 Medium · 10 Low/Info = 50 findings**, plus 3 A09 observations (Part A: 24 · Part B: 26) |

---

## 0. Direct answer to the question asked

> *"Did this pass on the OWASP security layer?"*

**No.** On the evidence below the application fails 9 of the 10 OWASP Top 10 (2021) categories, 8 of the 10 OWASP API Security Top 10 (2023) categories, and **33 of the 127 requirements that ASVS v4.0.3 mandates at Level 1** (55 fail at Level 3; 50 under ASVS v5.0.0). ASVS conformance is all-or-nothing per level, so **Level 1, Level 2 and Level 3 conformance are all denied**.

The single OWASP category that passes cleanly is **A10 — Server-Side Request Forgery** (no SSRF vector was found in source or at runtime). One API category passes for the same reason (**API7**).

The most important structural conclusion is not a single finding but a pattern:

> **FlexSpace's cryptographic core is sound; its *authorisation*, *input-validation* and *payment-verification* layers are absent.**
> JWT verification is correct, bcrypt is used properly, Turnstile is enforced server-side on login, path-normalisation and HTTP-verb bypasses fail closed, and the admin surface is genuinely gated. But five mechanisms that the codebase treats as security controls are not security controls at all:
> 1. a **"secret" shipped to the browser** (`x-app-fingerprint`) that is the sole guard on a chunk of the API;
> 2. **payment state transitions with no authentication and no gateway verification**;
> 3. a **hardcoded production key** feeding a content pipeline that lands raw HTML in `dangerouslySetInnerHTML`;
> 4. **request bodies trusted as domain data** — the payment amount, the POS order total and the voucher are all accepted from the client (Part B);
> 5. **`req.body` trusted as a query** — the password-reset flow passes a client object straight into `User.findOne()`, which is a **full account takeover in three requests** (Part B, FLEX-01).
>
> Every Critical finding in this assessment traces back to one of those five.

### The single most urgent item

> **`POST /api/v1/auth/forgot-password` with `{"email":{"$ne":null}}` selects the first user in the database. The OTP endpoint has no rate limit, the OTP is six digits generated with `Math.random()`, and `verify-otp` returns the reset token in the response body. That is unauthenticated account takeover of any account, in three requests, at any time.**
>
> Source: `server/app/api/v1/controllers/passwordController.js:19` and `:65` (`User.findOne({ email })` with `email` taken from `req.body`), `server/app/api/v1/routes/authRoutes.js:67-69` (no limiter), `server/app/api/v1/services/otpService.js:7` (`Math.floor(100000 + Math.random() * 900000)`).
>
> This is the highest-priority fix in the whole programme. It is a new finding from the Part B engagement and it did not appear in the Part A report.

---

## 1. Document set

| # | Document | Contents |
|---|---|---|
| 1 | `OWASP-SECURITY-ASSESSMENT.md` *(this file)* | Top 10 (2021) verdicts, API Top 10 (2023) verdicts, per-finding cross-reference, **Part B reconciliation**, proposed solutions |
| 2 | `OWASP-ASVS-CONTROL-MATRIX.md` | Requirement-level ASVS v4.0.3 and v5.0.0 matrices, level-by-level readiness |
| 3 | `OWASP-WSTG-COVERAGE-REMEDIATION-PLAN.md` | WSTG test-by-test coverage (117 IDs), consolidated secure-by-design patterns, re-test plan |
| — | `SECURITY-PENTEST-REPORT.md` | **Part A** — live black-box + source findings, with PoCs and code-level fixes (updated — see §5) |
| — | `SECURITY-PENTEST-REPORT-SANDBOX.md` | **Part B** — independent sandbox-based assessment, 43 findings with reproductions (preserved verbatim) |

---

## 2. Scorecards

### 2.1 OWASP Top 10 (2021)

| Category | Verdict | Findings | One-line reason |
|---|---|---|---|
| **A01 Broken Access Control** | **FAIL** | C1, C2, M5, M6, M7, L4, FLEX-01, FLEX-04, FLEX-08, FLEX-09, FLEX-10, FLEX-11, FLEX-12, FLEX-13, FLEX-14, FLEX-17, FLEX-41, FLEX-42, FLEX-43 | Anonymous callers can read booking records and flip payment state; authenticated users can re-credit a victim tenant's earnings, write off another owner's platform fees, take over a space listing, create staff inside a competitor's space, and use any owner surface with a plain customer token |
| **A02 Cryptographic Failures** | **FAIL** | C3, C5, H5, L1, FLEX-16, FLEX-17, FLEX-20, FLEX-22, FLEX-32, FLEX-34 | Production key material is hardcoded in source/Dockerfile and shipped in the public browser bundle; passwords are emailed in clear text; bcrypt hashes and live reset tokens are persisted in the log database; access tokens cannot be revoked; payment verification selects an arbitrary gateway key |
| **A03 Injection** | **FAIL** | C4, FLEX-01, FLEX-15, FLEX-28 | Owner-controlled text → LLM → raw HTML → `dangerouslySetInnerHTML`; customer names → receipt HTML → the operator's authenticated session; a client-supplied object injected into a Mongo query in the password-reset flow; and the session token is stored where that XSS can read it |
| **A04 Insecure Design** | **FAIL** | C1, C2, C3, C4, M9, FLEX-01, FLEX-04, FLEX-07, FLEX-08, FLEX-09, FLEX-10, FLEX-11, FLEX-12, FLEX-13, FLEX-15, FLEX-25, FLEX-32, FLEX-41 | The design uses a client-side header as auth, has no server-side payment state machine, no webhook integrity check, no LLM-output trust boundary, no registration approval gate for listings, and treats request bodies as authoritative domain data **and as query objects** |
| **A05 Security Misconfiguration** | **FAIL** | H1, M1, M2, M3, L2, L3, L5, FLEX-25, FLEX-33, FLEX-37, FLEX-42 | No security headers, permissive credentialed CORS, verbose errors, 50 MB bodies, broken SMTP, a shipped `NODE_ENV=development` that silently disables the entire anti-DDoS layer, 100 MB in-memory uploads, and no role gate on `/space` |
| **A06 Vulnerable & Outdated Components** | **FAIL** | H6 | 1 critical + 30 high advisories across two dependency trees; no SBOM, no audit gate in CI |
| **A07 Identification & Authentication Failures** | **FAIL** | M8, M9, C3, **FLEX-01**, FLEX-07, FLEX-14, FLEX-17, FLEX-20, FLEX-22, FLEX-28 | **Unauthenticated account takeover via NoSQL injection in the password-reset flow**; no rate limit on the OTP endpoints; a 6-digit `Math.random()` OTP; registration has no CAPTCHA; the lockout layer depends on an unvalidated proxy header. *JWT/bcrypt/Turnstile core itself passes* |
| **A08 Software & Data Integrity Failures** | **FAIL** | C2, C3, C5, H6, FLEX-31 | Payment webhooks are accepted without signature verification; key material is embedded in the image and the bundle; dependencies are unpinned; the voucher rule exists in two divergent implementations |
| **A09 Security Logging and Monitoring Failures** | **FAIL** | A09-01, A09-02, A09-03, FLEX-16, FLEX-34, FLEX-40 | Unauthenticated payment state changes are not security-logged; log IP attribution is unreliable; the log database itself retains plaintext passwords, bcrypt hashes and live reset tokens |
| **A10 Server-Side Request Forgery** | **PASS** | — | All outbound HTTP uses a fixed base URL; no user-controlled URL fetch found in source; host-header injection attempt failed |

**Score: 1 PASS / 9 FAIL** (A10 is the only pass).

### 2.2 OWASP API Security Top 10 (2023)

| Category | Verdict | Findings | One-line reason |
|---|---|---|---|
| **API1 Broken Object Level Authorization** | **FAIL** | M5, L4, FLEX-08, FLEX-09, FLEX-11, FLEX-13, FLEX-14, FLEX-17, FLEX-43 | `GET /space/booking/:id/review` returns a booking (guest, total, space) for any valid ObjectId, unauthenticated; tenant-owned orders, vouchers, listings and staff rows are all addressable across tenants |
| **API2 Broken Authentication** | **FAIL** | C3, M8, M9, FLEX-01, FLEX-07, FLEX-20, FLEX-28 | A static header is used as an auth substitute; the reset flow is injectable and unthrottled; access tokens live 12 hours and cannot be revoked; the token is stored where XSS can read it. *JWT verification itself passes* |
| **API3 Broken Object Property Level Authorization** | **FAIL** | M5, C1, FLEX-10, FLEX-13, FLEX-14 | Responses return the whole booking document including `qr_code_token` to anonymous callers; writable properties are not allow-listed |
| **API4 Unrestricted Resource Consumption** | **FAIL** | M3, H3, H4, L4, FLEX-07, FLEX-37 | 50 MB bodies; 100 MB in-memory uploads; unauthenticated analytics ingestion and AI chat drive unbounded third-party spend; OTP guessing is unmetered |
| **API5 Broken Function Level Authorization** | **FAIL** | C1, C2, C3, M6, M8, FLEX-01, FLEX-04, FLEX-11, FLEX-12, FLEX-14, FLEX-17, FLEX-22, FLEX-41, FLEX-42 | Sensitive functions are reachable with no function-level authorisation; the whole `/space` owner surface answers a customer token. *The `/admin` surface is correctly gated — a genuine pass inside a failing category* |
| **API6 Unrestricted Access to Sensitive Business Flows** | **FAIL** | C1, C2, H3, M8, FLEX-01, FLEX-04, FLEX-07, FLEX-08, FLEX-09, FLEX-10, FLEX-31, FLEX-41 | The payment flow, analytics pipeline, credential-recovery flow and listing-publication flow can all be driven at will |
| **API7 Server Side Request Forgery** | **PASS** | — | No user-controlled outbound request target found |
| **API8 Security Misconfiguration** | **FAIL** | H1, M1, M2, L2, L5, C5, FLEX-16, FLEX-22, FLEX-25, FLEX-32, FLEX-33, FLEX-34, FLEX-40 | Credentialed CORS with attacker-registrable origins; no headers; verbose errors and stack traces; default secrets in code; secrets in logs |
| **API9 Improper Inventory Management** | **PARTIAL** | L2, *(API9-01 — new)* | No API inventory or OpenAPI contract; unmounted controller retains an outbound `decrypt` capability; undocumented public endpoints |
| **API10 Unsafe Consumption of APIs** | **FAIL** | C2, C5, C4, FLEX-15 | Third-party payment events are consumed without signature verification; the third-party AI output is consumed without sanitisation; customer text reaches the operator's HTML |

**Score: 1 PASS / 1 PARTIAL / 8 FAIL** (API7 is the only pass).

### 2.3 ASVS readiness

| Target | Result | Reason |
|---|---|---|
| **ASVS v4.0.3 Level 1** | **DENIED** | 33 of the 127 L1 requirements fail (42 assessed); conformance requires all L1 requirements to pass |
| **ASVS v4.0.3 Level 2** | **DENIED** | 54 of the 253 L2 requirements fail (64 assessed) |
| **ASVS v4.0.3 Level 3** | **DENIED** | 55 of the 273 L3 requirements fail (66 assessed) |
| **ASVS v5.0.0** | **DENIED** | 50 requirements assessed and failed (19 fail at Level 1, 47 at Level 2, 50 at Level 3), including L1 requirements in Encoding, Validation, Authorisation, Authentication and File Handling |

> The 55 (v4) and 50 (v5) figures are requirements **explicitly assessed and failed** — computed mechanically from the matrix rows against the official ASVS CSVs, not tallied by hand. A further 5 (v4) and 3 (v5) rows are `PARTIAL`, giving effective non-conforming totals of 60 (v4) and 53 (v5). The remaining requirements were not individually verified, so no positive conformance claim is made for them either way. Detail: `OWASP-ASVS-CONTROL-MATRIX.md`.

---

## 3. OWASP Top 10 (2021) — detail

### A01 — Broken Access Control · **FAIL**

**Findings:** C1, C2, M5, M6, M7, L4, FLEX-01, FLEX-04, FLEX-08, FLEX-09, FLEX-10, FLEX-11, FLEX-12, FLEX-13, FLEX-14, FLEX-17, FLEX-41, FLEX-42, FLEX-43

**What was observed**

| Evidence | Location |
|---|---|
| `POST /api/v1/landing/orders/:orderId/confirm-payment` has **no `auth` middleware**, no signature check and no gateway re-verification. It sets `status='completed'`, `payment_status='paid'` and returns the full booking document. Verified live: booking `FLX-5380` moved `pending` → `completed`/`paid` with one anonymous `curl`. | `landingRoutes.js:68-70` → `landingController.js:417-472` |
| `POST /api/v1/space/payment-webhook` accepts an unsigned, unauthenticated body and mutates `Order`/`Booking` records. Verified live: `HTTP 200 {"success":true}`. | `spaceRoutes.js:87-131` |
| `GET /api/v1/space/booking/:id/review` returns a booking (guest name, total amount, space details) for any valid ObjectId with **no ownership check**. | `spaceRoutes.js:43` → `bookingController.js:388-440` |
| `POST /api/v1/space/public/reviews` accepts review submissions unauthenticated. | `spaceRoutes.js:39` |
| `POST /api/v1/landing/reviews/:reviewId/like` derives the dedup identity from `x-forwarded-for` — a client-controlled attribute used for a security decision. | `landingController.js:159-197` |
| `/uploads` is served by `express.static` from inside the web root. | `app.js:184` |
| *Part B:* `POST /api/v1/space/orders/:orderId/fix-payment` carries only `auth` — any authenticated user can re-credit a **victim tenant's** order into their own earnings ledger. | `spaceRoutes.js:215` → `posController.js:731` |
| *Part B:* `POST /api/v1/space/payment/confirm-fee-payment` carries only `auth` — a `role=user` account can mark another owner's platform fees as collected. | `spaceRoutes.js:231` → `paymentController.js:227` |
| *Part B:* `POST /api/v1/space/staff` takes `space_id` from `req.body` — staff can be created inside **another tenant's** space. | `staffController.js:77, 91-97` |
| *Part B:* `PUT /api/v1/space/:id` writes `user_id` from the request body — a space listing can be transferred to an arbitrary account. | `spaceController.js:147-160` |
| *Part B:* a forged review submitted unauthenticated is **auto-approved** and exposes booking PII. | `bookingController.js:454-552` |
| *Part B:* the `/space` router mounts every owner route with `auth` only and `authMiddleware` never inspects `req.user.role` — `/space/earnings`, `/space/dashboard/*`, `/space/bookings` and `/space/staff` all answer a plain customer token. | `spaceRoutes.js` (router mount) |
| *Part B:* `POST /api/v1/space/spaces` lets a customer publish a live, bookable listing without the permit/DTI approval gate that registration requires. | `spaceController.js` (create path) |
| *Part B:* the planted staff account is filtered out of the victim owner's staff list by `parent_id`, so the tenant it attacks cannot see, disable or delete it. | `staffController.js` (`index`) |

**Proposed solution (design level)**

1. **Introduce one authorisation layer and route everything through it.** Every endpoint gets exactly one of: `public`, `authenticated`, or `authenticated + role/ownership check`. No endpoint may rely on "the caller probably knows the secret".
2. **Ownership checks belong to the query, not the response.** For every object-scoped route, the lookup itself must be scoped to the caller's identity (`{ _id, user_id: req.user.id }`) so an unauthorised id returns `404`, never a `403` that confirms existence.
3. **Separate authentication from authorisation.** `protectionMiddleware` (a static header comparison) must be deleted, not repurposed — it is the reason C1/C2 exist in spirit.
4. **Payments must be authorised by the gateway, not by the caller.** See A04 and API10.

---

### A02 — Cryptographic Failures · **FAIL**

**Findings:** C3, C5, H5, L1, FLEX-16, FLEX-17, FLEX-20, FLEX-22, FLEX-32, FLEX-34

**What was observed**

| Evidence | Location |
|---|---|
| The shared secret `74ef8bea…47e4d3b` is embedded in plaintext in the public JS bundle and is the sole guard on `/landing/explorer`, `/landing/space/:id`, `/landing/stats`, `/landing/reviews`. Verified live: `200` with the header, `403` without. | `client/src/utils/Api.jsx:22,62` → `protectionMiddleware.js:7-17` |
| `BLOG_API_KEY` falls back to the literal `flexspace-secret-key` in code **and** is baked into the container image. Verified live: the hardcoded key is accepted (request proceeds into the AI generation path, timing out at 30 s), a wrong key is rejected with `401` in 0.75 s. | `blogController.js:50-53`, `cron/generate-blogs.js:3`, `Dockerfile:34` |
| Fallback secrets with no env-var override are present in `protectionMiddleware` (`iloilo_work_2026_secure`) and elsewhere. | `protectionMiddleware.js:9` |
| The welcome e-mail transmits the account password in clear text. | `emails/WelcomeEmail.js:16` |

**Proposed solution**

1. **Treat every browser-delivered value as public.** ASVS v4.0.3 **V1.6.4** states this explicitly: *"the architecture treats client-side secrets — such as symmetric keys, passwords, or API tokens — as public, and clients are not trusted."* Delete `x-app-fingerprint` entirely.
2. **Move every secret to a managed store.** Render secret store or a vault (AWS/GCP Secrets Manager). Rotate `INTERNAL_API_KEY` and `BLOG_API_KEY`, then purge them from git history (`git filter-repo` / BFG) — they are in the published repository.
3. **Remove every `|| 'literal'` fallback for a secret.** A missing secret must fail the process at boot (`if (!process.env.X) throw`), never silently degrade to a known default. This single pattern removes L1 and most of C5.
4. **Never mail a password.** Send a one-time, single-use, short-expiry link; the password itself is set by the user.

---

### A03 — Injection · **FAIL**

**Findings:** C4, FLEX-01, FLEX-15, FLEX-28

**What was observed**

The complete stored-XSS chain, source-verified end to end:

```
Space.name  (owner-controlled, Space.js:12-15 — no length, pattern or charset constraint)
   └─> aiBlogGeneratorService.js:161-218  — interpolated into the Gemini prompt
        └─> Gemini returns raw HTML
             └─> Blog.content  (schema: { type: String, required: true } — no sanitisation)
                  └─> client/src/pages/Landing/BlogDetail.jsx:160
                       dangerouslySetInnerHTML={{ __html: blog.content }}
```

Two further injection families from Part B:

| Vector | Mechanism | Location |
|---|---|---|
| **NoSQL operator injection** — `{"email":{"$ne":null}}` selects the first user in the database. The same pattern is used in `verifyOTP`. This is the account-takeover path. | `req.body.email` is interpolated into a Mongo filter with no type check | `passwordController.js:19, 65, 134` |
| **Stored XSS via customer names** — a customer-supplied name reaches the **operator's** authenticated session through receipt and report HTML. Different sink from C4, higher impact: it executes inside a staff session that can move money. | customer name interpolated into operator-facing HTML | `Pos/Index.jsx:761`, `Earnings/Index.jsx:115`, `TotalOrders/Index.jsx:228` |

> **Correction to Part A.** Part A recorded NoSQL injection on *login* as **blocked** (non-finding `L8`) and, on that basis, wrote *"NoSQL injection was tested and did not succeed"*. That statement is true for `POST /auth/login` and **false for the password-reset flow**. `WSTG-INJT-05` therefore moves from PASS to **FAIL**. The general claim that the application is not injectable must be withdrawn.

Verified live: a published blog's `content` begins with `<article class="blog-post">` and carries no sanitisation — 4 343 characters of raw markup from the model.

**What was tested and did *not* succeed** (recorded so the category verdict is not over-stated): NoSQL operator injection on the login body (blocked by Turnstile plus Mongoose strict typing), SQL/command injection (not applicable — Mongoose only), reflected XSS, HTTP parameter pollution, HTTP response splitting, host-header injection.

**Proposed solution**

1. **Treat LLM output as untrusted input, always.** The model is a *transformer*, not a sanitiser. Run every generated fragment through a maintained HTML sanitiser (DOMPurify server-side, or `sanitize-html`) with an allow-list of tags/attributes before it is persisted — and again before it is rendered.
2. **Never render model output as HTML.** If the blog body only needs paragraphs, headings and lists, render it as Markdown → sanitised HTML, or as structured data → React elements. `dangerouslySetInnerHTML` should not be reachable from a stored field.
3. **Constrain the input too.** Add length/pattern/charset limits to `Space.name` and `description`; strip control characters. This reduces, but does not replace, output sanitisation.
4. **Add a CSP without `unsafe-inline`** — this is the containment layer that stops this class of bug from becoming token theft (it compounds with A07, since the JWT is in `localStorage`).

---

### A04 — Insecure Design · **FAIL**

**Findings:** C1, C2, C3, C4, M9, FLEX-01, FLEX-04, FLEX-07, FLEX-08, FLEX-09, FLEX-10, FLEX-11, FLEX-12, FLEX-13, FLEX-15, FLEX-25, FLEX-32, FLEX-41

This is the category that explains the others. Four design decisions are individually defensible in isolation and collectively unsafe:

| # | Design decision | Consequence |
|---|---|---|
| 1 | A static header value is used as an access-control mechanism | The "secret" must ship to the browser, so it is public — and it is now in every user's cache (C3) |
| 2 | Payment state transitions are triggered by the *client* rather than derived from a *verified provider event* | Anyone can mark a booking paid (C1) |
| 3 | Third-party payment events are consumed without an integrity check | Anyone can forge a settlement (C2) |
| 4 | Security identity is derived from an intermediary header the app never validates, with a private-range "trusted" exemption | The whole anti-DDoS layer is one header away from failing open (M9) |

**Proposed solution — the three design rules that would close 5 of 5 Criticals**

> **Rule 1 — Never put a secret in the browser.** Anything the browser knows is public. Authentication must be the user's credential.
>
> **Rule 2 — State changes are consequences, not commands.** The server must not accept "mark this paid". It must observe a provider event (or independently poll the provider) and derive the state change. A client-side "confirm" button must only *ask* the server to re-verify.
>
> **Rule 3 — Every state transition needs a trust anchor.** Either a server-side session, a provider signature, or a server-to-server lookup. "The endpoint is called" is not a trust anchor.

Applying them:
- **C1** → the `confirm-payment` endpoint becomes a *re-verify* operation: the server calls PayMongo/PayBridge with the intent id, compares the amount and currency against the booking, and only then transitions — all inside one idempotent transaction with a unique constraint on the provider reference.
- **C2** → the webhook verifies an HMAC over the **raw request body** using a shared secret the gateway signs with (constant-time compare), then re-verifies the payment with the gateway API before mutating. An unsigned event is rejected with `401`.
- **C3** → delete `protectionMiddleware` and the `x-app-fingerprint` header.
- **C4** → sanitise LLM output and constrain owner input.
- **M9** → resolve the client IP once, from a validated source, and use that single value everywhere.

---

### A05 — Security Misconfiguration · **FAIL**

**Findings:** H1, M1, M2, M3, L2, L3, L5, FLEX-25, FLEX-33, FLEX-37, FLEX-42

| Evidence | Location |
|---|---|
| `access-control-allow-origin: https://evil.attacker.vercel.app` with `access-control-allow-credentials: true` — verified live on both a simple request and a preflight (`204`, full allowed-method/header list). The allow-list is `/^https:\/\/.*\.vercel\.app$/` and `/^https:\/\/.*\.onrender\.com$/` — **anyone can deploy to those domains.** | `app.js:94-113, 128-165` |
| No `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` or `frame-ancestors` on API responses; none on the frontend either. Verified live. | `app.js`, `client/vercel.json` |
| `x-powered-by: Express` on every API response; Mongoose cast errors return raw internals (`Cast to ObjectId failed for value "notanobjectid" (type string) at path "_id" for model "Space"`) — verified live. `/health` returns uptime, memory usage, worker state and queue readiness — verified live. | `app.js:212`, `errorHandler.js:44-48` |
| `express.json({ limit: '50mb' })` and `express.urlencoded({ extended: true, limit: '50mb' })` — a 60 MB body was accepted; `extended: true` also enables the vulnerable `qs` parser. | `app.js:168-169` |
| `robots.txt` lists administrative route names. | `public/robots.txt` |
| Production SMTP fails with `Missing credentials for "PLAIN"` — every transactional e-mail silently fails. | `emailService` / env |
| `helmet` is not used anywhere; `app.set('trust proxy', …)` is never set. | `app.js` |

**Proposed solution**

1. **Replace the CORS regex allow-list with an exact-match list** of the real production origins, and set `credentials: false` unless cookie-based auth is introduced. Never use a wildcard subdomain pattern for a credentialed API.
2. **Adopt `helmet`** as the baseline, then layer the API-specific headers on top: `Content-Security-Policy` (with `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security` (also on the API, since Cloudflare terminates TLS and does not add it by default), and `Cache-Control: no-store` on authenticated/personal data.
3. **Reduce the body limit to what the application actually needs** (1 MB is ample) and set `extended: false`. This is the cheapest available DoS mitigation.
4. **Return generic errors to the client; keep the detail in the log.** Map every unhandled error to a fixed message plus a correlation id.
5. **Gate internal endpoints.** `/health` should expose `{status}` only, and `/api/v1/health/antiddos-status` should be behind admin auth or removed.
6. **Remove `robots.txt` administrative paths** and replace with `Disallow: /` on administrative surfaces.

---

### A06 — Vulnerable and Outdated Components · **FAIL**

**Findings:** H6

`npm audit` across both trees: **1 critical** (`proxy-addr` 2.0.7 — CVSS 9.8, and it sits directly in the IP-resolution path that M9 depends on) and **30 high** advisories, including `multer` 2.1.1 (upload path, M4), `nodemailer` 8.0.5 (mail path, H5), `path-to-regexp` 8.3.0 (routing) and `react-router-dom` 7.14.0 (client). There is no SBOM, no dependency-audit gate in CI, and no update automation.

**Proposed solution**

1. `npm audit fix` now; pin `proxy-addr ≥ 2.0.8`, `multer ≥ 2.3.0`, `nodemailer ≥ 8.0.6`, `path-to-regexp ≥ 8.3.1`, `react-router-dom ≥ 7.18.2`.
2. Introduce a **blocking audit gate** in CI (a PR that fails on any critical/high advisory) plus a weekly dependency-update bot.
3. Generate and version an **SBOM** (CycloneDX or SPDX) on every build, and store it as a build artefact.
4. Add `gitleaks` / `trufflehog` to CI so hardcoded secrets cannot re-enter (this is the control that would have prevented C5 and L1).

---

### A07 — Identification and Authentication Failures · **FAIL**

**Findings:** M8, M9, C3 (as a pseudo-authentication control), **FLEX-01**, FLEX-07, FLEX-14, FLEX-17, FLEX-20, FLEX-22, FLEX-28

**What passes — and should be preserved**

| Control | Result |
|---|---|
| JWT signature verification | **PASS** — `alg:none` rejected; 12 weak-secret candidates rejected; `jsonwebtoken` key-type rules prevent HS/RS confusion |
| Password hashing | **PASS** — `bcryptjs`, `saltRounds` from config (default 10) |
| Login bot-defence | **PASS** — Cloudflare Turnstile is verified **server-side** before credential processing (`authController.js:12-31`) |
| Registration mass-assignment | **PASS** — `role: admin` is ignored; the schema's strict mode wins. *(Registration only — the space-update path is **not** protected; see FLEX-13.)* |
| Admin surface | **PASS** — `/admin` requires a valid JWT **and** `role === 'admin'` (`adminRoutes.js:58-62`) |
| Logout | **PASS** — `401` for invalid tokens |

**What fails**

1. **Registration is unthrottled by anything human-distinguishing.** `POST /api/v1/auth/register` has the rate limiter but **no Turnstile** (`authRoutes.js:28-37`), unlike `/login` (`authRoutes.js:20-24`). Unlimited account creation, unlimited e-mail sending to arbitrary addresses (which is also a cheap spam/phishing vector).
2. **The session token lives in `localStorage`** (`Api.jsx:24`), so any XSS on the origin is a full account compromise. Combined with C4 this is the difference between "a blog page is defaced" and "every logged-in visitor's account is stolen".
3. **The rate limiter's identity is an unvalidated header** (M9).
4. **A static header is being used in place of authentication** (C3).
5. **The password-reset flow is injectable and unthrottled — unauthenticated account takeover.** `POST /auth/forgot-password` passes `req.body.email` straight into `User.findOne({ email })`; a body of `{"email":{"$ne":null}}` matches the first user in the collection. The OTP that follows is six digits generated by `Math.random()` (a 900 000-value keyspace, and not a CSPRNG), the three OTP/reset routes carry **no rate limiter**, and `POST /auth/verify-otp` returns the reset token in the response body. Three requests to takeover. (`passwordController.js:19, 65, 134`; `authRoutes.js:67-69`; `otpService.js:7`.)
6. **The access token lives for 12 hours and cannot be revoked.** `config.js:18` sets `accessExpirationMinutes: 720`; the token is stateless, so there is no server-side record to invalidate on logout, on password change or on role change, and the role is read from the token payload rather than from the database.

**Proposed solution**

1. **Extend Turnstile to `/register`** (and to any password-reset/OTP-verification flow). Enforce e-mail verification before the account is usable.
2. **Move the JWT out of `localStorage.** Use an `HttpOnly; Secure; SameSite=Strict` cookie with the `__Host-` prefix, plus CSRF protection (double-submit token or `SameSite=Strict` + origin check). This removes the XSS→token-theft escalation path entirely and makes CSRF a design question rather than an open door.
3. **Rotate `JWT_SECRET`**, confirm it is ≥ 256 bits of entropy and is *not* in the repo (it is read from `process.env.JWT_SECRET` — confirm Render actually sets it, and that a missing value fails at boot).
4. **Add a per-account limiter** keyed on the normalised e-mail address, so IP churn cannot defeat the lockout.
5. **Introduce `trust proxy` and derive the client IP from one validated source** (M9).

---

### A08 — Software and Data Integrity Failures · **FAIL**

**Findings:** C2, C3, C5, H6, FLEX-31

| Evidence | Interpretation |
|---|---|
| The payment webhook accepts a body with no signature, no nonce and no timestamp — verified live, `HTTP 200 {"success":true}` (`spaceRoutes.js:87-131`) | **No integrity guarantee on a state-changing third-party message.** This is the textbook A08 case |
| The webhook reads `data.order_number`, `data.payment_intent_id` and `data.metadata.type` straight from the body and writes them to `Order`/`Booking` | No allow-list of fields, no schema validation, no replay protection |
| Key material is embedded in the container image (`Dockerfile:34 ENV BLOG_API_KEY=flexspace-secret-key`) and in the public bundle | Build artifact integrity: the image and the client are both "trusted" sources of a secret |
| No SBOM, no pinned integrity hashes, no audit gate (H6) | Supply-chain integrity is unmanaged |

**Proposed solution**

1. **Verify the webhook signature over the raw body** (HMAC-SHA256, constant-time comparison) before parsing; reject `401` otherwise. Require the gateway's own event id as an idempotency key so replays are harmless.
2. **Re-verify with the gateway** after signature validation — the signature proves authenticity, the gateway call proves the money.
3. **Validate the payload against a schema** before use (no `metadata.type` string that silently switches which collection you write to).
4. **Move secrets out of the image** — inject at runtime from the platform's secret store; the image must contain no credentials.
5. **Pin dependencies with integrity hashes** and enforce the SBOM in CI (see A06).

---

### A09 — Security Logging and Monitoring Failures · **FAIL**

**New observations (not in the original pentest report):**

> **A09-01 — Unauthenticated payment state changes are not security-logged.**
> `POST /landing/orders/:orderId/confirm-payment` returns `200`, so `errorLogService` never fires; the only record is a `console.log('✅ Booking completed:', orderId)` with no actor, no source IP and no alert. ASVS v4.0.3 **V7.1.3** / **V7.2.2** and ASVS v5.0.0 **V16.3.2 / V16.3.3** all fail. An operator cannot tell a legitimate settlement from an attack after the fact.
>
> **A09-02 — Log IP attribution is unreliable, by design.**
> `errorLogService.extractClientIp()` (`errorLogService.js:7-19`) prefers `req.ip`; with `app.set('trust proxy')` unset, Express returns the **immediate peer** — the internal proxy — so every `ErrorLog` row records the same address and IP-based forensics is worthless. `autoLogger.extractIp()` (`autoLogger.js:3-10`) instead prefers the *unvalidated* `cf-connecting-ip`. Two components, two different (and both wrong) notions of "client IP".
>
> **A09-03 — No alerting exists for the highest-value event in the system.**
> There is no alert on a payment transition, on an admin action, on a bulk registration run, or on repeated authentication failures. The anti-DDoS module detects "under attack" from a request counter, but a *successful* forgery of a payment (C1/C2) is invisible to it.

**Correction — the redaction control is narrower than Part A recorded.** `errorLogService.sanitizeRequestData` strips the exact keys `password`, `token`, `secret`, `key`, `authorization` and `api_key`. That is a real control, but it is **key-exact**, so `newPassword`, `resetPassword`, `otp` and `resetToken` are **not** redacted, and `logsActivity.js:92` persists `doc.toObject()` — the whole user document, bcrypt hash included — while `:154` persists the raw update object. ASVS v4.0.3 **V7.1.1 moves from PASS to FAIL** (FLEX-16). The correct statement is: *passwords submitted under the key `password` are redacted; the credential-recovery flow's secret fields are not, and activity logs store whole documents.*

**Proposed solution**

1. **Define a security-event catalogue** and log every entry in a structured, append-only form: actor id, actor type (`user` / `anonymous`), object id, action, outcome, source IP (from the single trusted resolver), correlation id, timestamp.
2. **Never rely on `console.log` for security events.** Route them to the `ErrorLog`/`ActivityLog` models with a `severity` field that distinguishes `info` from `security`.
3. **Resolve the client IP once** (M9) and use that one function in `autoLogger`, `errorLogService` and `antiDdos`.
4. **Alert on:** any payment state transition, any admin action, ≥ N registrations per hour per IP, ≥ N authentication failures per account, and any webhook whose signature fails.
5. **Set `trust proxy` explicitly** so `req.ip` is meaningful, and set the log retention/immutability policy.

---

### A10 — Server-Side Request Forgery · **PASS**

**No SSRF vector was found.** Every outbound HTTP call uses a fixed base URL from configuration (`PAYBRIDGE_API_URL`, Gemini's fixed endpoint, Cloudflare's fixed verify endpoint) with only path or body values interpolated; no user-controlled host or URL is ever fetched. A host-header injection attempt was rejected with `403`. No internal metadata endpoints were probed (out of scope).

**Two caveats, recorded so the PASS is not over-read:**

1. `paymentIntentId` is interpolated into an outbound URL path (`${PAYBRIDGE_API_URL}/paymongo/verify/${paymentIntentId}`) without validation. It cannot change the host, but unvalidated path segments in an outbound request should still be encoded. → **API10**, Low impact.
2. This category was not tested exhaustively — no internal-network reachability testing was performed, by design.

**Proposed solution:** encode path parameters; keep the rule "the host of every outbound request comes from configuration, never from input" as an explicit, reviewed invariant.

---

## 4. OWASP API Security Top 10 (2023) — detail

The API-specific categories that the Top 10 view compresses. The application is a JSON API consumed by a first-party SPA on a different origin, with authentication carried in an `Authorization` header — a textbook API shape, so API-specific analysis is the more relevant lens.

### API1 Broken Object Level Authorization · **FAIL** — M5, L4, FLEX-08, FLEX-09, FLEX-11, FLEX-13, FLEX-14, FLEX-17, FLEX-43

`GET /api/v1/space/booking/:id/review` takes a raw ObjectId and returns booking data with no ownership or token check. The same pattern appears on `/booking/:id/can-review` and `/space/public/spaces/:spaceId`. **Proposed solution:** scope the lookup to the caller's identity; use single-use, expiring, booking-bound tokens (the QR flow already has a `qr_code_token` — make that the only path in) rather than enumerable ObjectIds.

### API2 Broken Authentication · **FAIL** — C3, M8, M9, FLEX-01, FLEX-07, FLEX-20, FLEX-28

The API accepts a static shared secret from the browser in place of a session token (C3), has no bot-control on registration (M8), and its rate-limiting identity is unvalidated (M9). *The JWT verifier itself passed every bypass attempt.* **Proposed solution:** one authentication mechanism — the user's session — for every endpoint that is not deliberately public; delete the fingerprint header; add Turnstile to registration; resolve client IP once.

### API3 Broken Object Property Level Authorization · **FAIL** — M5, C1, FLEX-10, FLEX-13, FLEX-14

Anonymous callers receive the entire booking document, including `qr_code_token` (the token that authorises the QR check-in path) and the guest's name and total. **Proposed solution:** return a purpose-built response shape per endpoint — never a serialised Mongoose document. Whitelist fields explicitly, and treat `qr_code_token` as a credential that must never leave the server except to its owner.

### API4 Unrestricted Resource Consumption · **FAIL** — M3, H3, H4, L4, FLEX-07, FLEX-37

A 50 MB body limit on every route; unauthenticated analytics ingestion; unauthenticated AI chat driving metered Gemini spend; a static `/uploads` route. **Proposed solution:** set the body limit to what the app needs (1 MB); require authentication and per-user quotas on `/analytics/track` and `/chat/support`; move uploads out of the web root; add a per-principal spend/quotas limit on the AI endpoints.

### API5 Broken Function Level Authorization · **FAIL** — C1, C2, C3, M6, M8, FLEX-01, FLEX-04, FLEX-11, FLEX-12, FLEX-14, FLEX-17, FLEX-22, FLEX-41, FLEX-42

Sensitive functions — confirm payment, ingest a settlement, submit a review, register an account — are reachable with no function-level authorisation. *Within this category the `/admin` surface is a genuine pass:* JWT plus a role check, applied as router-level middleware before any handler (`adminRoutes.js:58-62`); every admin route tested returned `401` without a valid token. **Proposed solution:** adopt the admin pattern as the application-wide pattern — a router-level `auth` plus a per-route role/ownership guard — and apply it to the payment, review and analytics routers.

### API6 Unrestricted Access to Sensitive Business Flows · **FAIL** — C1, C2, H3, M8, FLEX-01, FLEX-04, FLEX-07, FLEX-08, FLEX-09, FLEX-10, FLEX-31, FLEX-41

An anonymous client can drive the payment flow (C1), forge a settlement (C2), poison the analytics pipeline (H3) and mass-create accounts (M8). **Proposed solution:** treat each sensitive flow as a state machine with server-side transitions, rate limits keyed on a stable principal, and mandatory human-presence signals (Turnstile, e-mail verification) where the flow creates obligations.

### API7 Server Side Request Forgery · **PASS**

See A10 above.

### API8 Security Misconfiguration · **FAIL** — H1, M1, M2, L2, L5, C5, FLEX-16, FLEX-22, FLEX-25, FLEX-32, FLEX-33, FLEX-34, FLEX-40

Credentialed CORS reflecting attacker-registrable origins is the headline item here, with default secrets in code, missing headers, verbose errors and broken SMTP behind it. **Proposed solution:** exact-match CORS allow-list, `credentials: false`, helmet baseline, generic errors, no default secrets, and an environment-parity check that fails the boot when a production secret is missing.

### API9 Improper Inventory Management · **PARTIAL**

- There is **no API inventory** — no OpenAPI/Swagger contract and no endpoint catalogue, so a consumer cannot know which endpoints are public. The route table is the only source of truth, spread across six files.
- **`paybridgeController.js` is mounted on no route** yet contains an outbound `decrypt` capability (`paybridgeController.js:46-61`) and `encrypt` calls. Unmounted code with privileged capability is exactly what API9 warns about; it is also dead weight that can be re-mounted by mistake.
- **`landingController.publicLikeReview` uses `x-forwarded-for`** — a client-supplied value — as a de-duplication key.
- `robots.txt` advertises administrative paths.

**Proposed solution:** publish an OpenAPI contract generated from the route table; delete or formally deprecate unmounted controllers; maintain an explicit endpoint inventory with its auth requirement per endpoint, and treat "route added without an inventory entry" as a CI failure.

### API10 Unsafe Consumption of APIs · **FAIL** — C2, C5, C4, FLEX-15

Three ways this application consumes untrusted third-party input:

1. **Payment provider events** are consumed with no signature verification, and the consumed values are written directly to the database (`spaceRoutes.js:87-131`).
2. **The AI provider's output** is consumed as trusted HTML and stored verbatim (`Blog.content` → `dangerouslySetInnerHTML`).
3. **The provider API key** for that pipeline is a hardcoded literal, so the "trust boundary" is a string in a public repository.

**Proposed solution:** signature verification over the raw body for provider events; a sanitiser at the boundary for any provider-produced content; and a managed, rotatable credential so the boundary is real.

---

## 5. Findings register — master OWASP cross-reference

Severity as issued in `SECURITY-PENTEST-REPORT.md`. **5 Critical · 5 High · 9 Medium · 5 Low/Info.**

| ID | Sev | CVSS | Finding | Top 10 (2021) | API Top 10 (2023) | ASVS v4.0.3 | ASVS v5.0.0 | CWE | WSTG |
|---|---|---|---|---|---|---|---|---|---|
| **C1** | Critical | 9.1 | Unauthenticated payment confirmation | A01, A04, A08 | API1, API2, API5, API6 | V1.11.2, V1.11.3, V4.1.1, V11.1.1, V11.1.2, V13.1.4 | V2.3.1, V2.3.3, V8.2.1, V8.3.1, V15.3.1 | CWE-306, CWE-862 | WSTG-ATHN-04, WSTG-BUSL-02, WSTG-BUSL-10 |
| **C2** | Critical | 9.1 | Unsigned unauthenticated webhook forgery | A01, A04, A08 | API2, API5, API6, API10 | V1.11.2, V1.11.3, V4.1.1, V11.1.2, V13.1.4, V13.2.6 | V4.1.5, V8.2.1, V16.3.3 | CWE-345, CWE-347, CWE-862 | WSTG-ATHN-04, WSTG-BUSL-03, WSTG-BUSL-10 |
| **C3** | Critical | 8.6 | Client-side embedded "secret" bypasses API protection | A02, A04, A07, A08 | API2, API5, API8 | V1.6.2, V1.6.4, V3.5.2, V4.1.1 | V8.2.1, V13.3.1, V13.3.4 | CWE-798, CWE-321, CWE-522 | WSTG-CONF-04, WSTG-INFO-05, WSTG-APIT-04 |
| **C4** | Critical | 9.0 | Stored XSS via the AI content pipeline | A03, A04 | API10 | V1.5.4, V5.2.1, V5.3.1, V5.3.5 | V1.2.1, V1.3.1, V1.3.3, V1.3.7, V3.2.2 | CWE-79, CWE-74, CWE-20 | WSTG-INJT-02, WSTG-CLNT-03, WSTG-INFO-05 |
| **C5** | Critical | 8.1 | Hardcoded `flexspace-secret-key` is the live production key | A02, A05, A08 | API8, API10 | V1.6.2, V6.4.1, V6.4.2 | V11.1.1, V13.3.1, V13.3.4 | CWE-798, CWE-321, CWE-1188 | WSTG-CONF-04, WSTG-INFO-05 |
| **H1** | High | 7.5 | Credentialed CORS reflects any `*.vercel.app` / `*.onrender.com` | A05 | API8 | V14.5.3 | V3.5.1 | CWE-942, CWE-346 | WSTG-CLNT-07, WSTG-CONF-08 |
| **H3** | High | 6.5 | Unauthenticated analytics poisoning | A01, A04 | API4, API6 | V11.1.3, V11.1.4 | V2.4.1 | CWE-862, CWE-20 | WSTG-BUSL-04, WSTG-BUSL-05, WSTG-APIT-04 |
| **H4** | High | 6.5 | Unauthenticated AI chat (cost abuse / prompt injection) | A04, A05 | API4 | V11.1.3, V11.1.4 | V2.4.1 | CWE-862, CWE-20 | WSTG-BUSL-05, WSTG-APIT-04 |
| **H5** | High | 6.3 | Unauthenticated e-mail relay + plaintext password | A02, A05 | API4, API5, API8 | V2.5.1, V6.1.1 | V1.3.11, V8.2.1 | CWE-798, CWE-319, CWE-532 | WSTG-CONF-05, WSTG-INFO-05 |
| **H6** | High | 7.4 | Vulnerable dependencies (1 critical + 30 high) | A06, A08 | API8 | V14.2.1, V14.2.5, V10.1.1 | V15.1.2, V15.2.1 | CWE-1104, CWE-1395 | WSTG-CONF-02 |
| **M1** | Medium | 5.3 | Missing security headers (frontend + API) | A05 | API8 | V8.2.1, V14.1.3, V14.4.3, V14.4.4, V14.4.6, V14.4.7 | V3.4.1, V3.4.5, V12.1.1 | CWE-693, CWE-1021 | WSTG-CONF-12, WSTG-CONF-14, WSTG-CLNT-09 |
| **M2** | Medium | 5.3 | Internal error & infrastructure disclosure | A05 | API8, API9 | V7.4.1, V14.3.3 | V13.4.5, V16.5.1 | CWE-209, CWE-200 | WSTG-ERRH-01, WSTG-ERRH-02, WSTG-CONF-05 |
| **M3** | Medium | 6.5 | 50 MB request body limit | A05 | API4 | V13.2.2, V14.1.3 | V5.2.1 | CWE-400, CWE-770 | WSTG-CONF-02, WSTG-BUSL-05 |
| **M4** | Medium | 5.3 | Upload type filter trusts client-supplied MIME | A03, A05 | API4 | V1.12.2, V12.2.1, V12.5.2 | V5.2.2, V5.3.1 | CWE-434 | WSTG-BUSL-08, WSTG-BUSL-09 |
| **M5** | Medium | 5.3 | Unauthenticated IDOR on booking/space details | A01 | API1, API3 | V4.1.1, V4.1.3, V13.1.4 | V8.2.2, V8.3.1, V15.3.1 | CWE-639, CWE-200 | WSTG-ATHZ-04, WSTG-APIT-02, WSTG-APIT-03 |
| **M6** | Medium | 4.3 | Unauthenticated review submission (queue flooding) | A01 | API5, API6 | V4.1.1, V11.1.3 | V8.2.1 | CWE-862, CWE-20 | WSTG-BUSL-05, WSTG-ATHN-04 |
| **M7** | Medium | 4.3 | Review "like" identity taken from a client header | A01, A05 | API3 | V4.1.2, V14.5.4 | V15.3.4 | CWE-345, CWE-290 | WSTG-ATHZ-04 |
| **M8** | Medium | 5.3 | Unrestricted registration (no CAPTCHA) | A07 | API2, API6 | V2.2.1, V11.1.3, V11.1.4 | V2.4.1, V15.3.3 | CWE-799, CWE-307 | WSTG-IDNT-02, WSTG-ATHN-03 |
| **M9** | Medium | 5.3 | Security controls rely on an unvalidated proxy header | A04, A05, A07 | API2, API4 | V14.5.4, V1.4.1 | V4.1.3, V15.3.4 | CWE-290, CWE-441 | WSTG-CONF-01, WSTG-CONF-02 |
| **L1** | Low | 3.7 | Hardcoded fallback secrets in source | A02 | API8 | V1.6.2, V6.4.1 | V13.3.1 | CWE-798, CWE-1188 | WSTG-CONF-04 |
| **L2** | Low | 2.7 | `robots.txt` discloses admin route names | A05 | API9 | V14.3.3 | V13.4.5 | CWE-548 | WSTG-CONF-05, WSTG-INFO-03 |
| **L3** | Low | 2.1 | Dead webhook handler → 500 (bug, not exploitable) | A05 | API9 | V14.3.2 | V13.4.2 | CWE-755 | WSTG-CONF-05 |
| **L4** | Low | 3.7 | Latent unauthenticated static path for permit documents | A01 | API1, API4 | V1.12.2, V12.4.1 | V5.3.1, V5.3.2 | CWE-548, CWE-425 | WSTG-ATHZ-04, WSTG-CONF-09 |
| **L5** | Low | 2.1 | SMTP misconfigured in production | A05 | API8 | V9.2.3 | V12.2.1 | CWE-16 | WSTG-CONF-02 |
| **L6** | Info | — | JWT `alg:none` / weak secret — **not vulnerable** | *A07 pass* | *API2 pass* | V2.1.1, V6.2.1 | V7.2.1, V11.4.1 | — | WSTG-SESS-10, WSTG-ATHN-04 |
| **L7** | Info | — | Path normalisation & verb tampering — **not bypassable** | *A01 pass* | *API5 pass* | V13.1.4 | V8.3.1 | — | WSTG-INJT-03, WSTG-ATHZ-01 |
| **L8** | Info | — | NoSQL injection on login — blocked | *A03 pass* | *API2 pass* | V5.1.3, V6.1.1 | V2.2.1 | — | WSTG-INJT-05, WSTG-ATHN-04 |
| **A09-01** | Medium | 5.3 | *New:* unauthenticated payment changes are not security-logged | A09 | API5 | V7.1.3, V7.2.2 | V16.2.1, V16.3.2, V16.3.3 | CWE-778 | WSTG-BUSL-07, WSTG-INFO-10 |
| **A09-02** | Medium | 5.3 | *New:* log IP attribution unreliable | A09 | API3 | V7.2.1 | V16.2.1, V15.3.4 | CWE-778 | WSTG-BUSL-07 |
| **A09-03** | Medium | 5.3 | *New:* no alerting on high-value events | A09 | API6 | V7.1.3, V7.2.2 | V16.3.3 | CWE-778 | WSTG-BUSL-07 |

> **Register accounting.** The severity totals above are the issued Part A pentest register in `SECURITY-PENTEST-REPORT.md` (5 Critical · 5 High · 9 Medium · 5 Low/Info). §6 adds the Part B register (26 further findings) and states the **merged total of 10 Critical · 15 High · 15 Medium · 10 Low/Info = 50**. **L6 / L7 / L8 are verified-safe results** (JWT forgery attempts, path normalisation and verb tampering, NoSQL injection on login — all blocked) recorded in the report's non-findings section; they are listed here for traceability but are **not** counted as vulnerabilities.
>
> **A09-01 / A09-02 / A09-03 are new observations raised by this OWASP-layer review**, not by the original pentest. They are unrated against the pentest's CVSS rubric but each maps to at least one ASVS requirement. If they were issued as findings, the merged register would become **10 Critical · 15 High · 18 Medium · 10 Low/Info**, and A09 would move from *observations* to *failed category*.
>
> Part B's 26 new findings are listed in §6.3 with the same cross-reference columns. Part A's register above is unchanged.

---

## 6. Part B — Second assessment (sandbox engagement), reconciled

### 6.1 Why there are two reports

| | **Part A** — `SECURITY-PENTEST-REPORT.md` | **Part B** — `SECURITY-PENTEST-REPORT-SANDBOX.md` |
|---|---|---|
| Method | Live black-box against the deployed stack (Vercel + Render + Cloudflare) plus source review | Full local stack: MongoDB replica set, Redis, mock PayBridge gateway, mock SMTP; black-box + source review |
| Depth | Shallow per endpoint, wide surface | Deep per endpoint, including unauthenticated server-side flows (webhooks, POS, fee settlement, OTP) that the live environment does not expose |
| Finding IDs | `C1`–`C5`, `H1`–`H6`, `M1`–`M9`, `L1`–`L5` | `FLEX-01`–`FLEX-43` |
| Result | 24 findings + 3 non-findings | 43 findings |

Part B is the more complete of the two for **authentication, authorisation, tenant isolation and payment logic**, because a sandbox can reach server-side code paths that the live deployment routes to a third party. Part A is the more complete of the two for **perimeter and infrastructure** (Cloudflare, CORS, headers, dependency state, live key verification), because only the live stack shows the real edge configuration.

**Every Part B claim used in this assessment was independently re-verified against the source tree.** The re-verification confirmed all of them, including the parts that contradict Part A. Part B is therefore treated as authoritative wherever the two disagree, and the register below is the **union**.

### 6.2 Overlap map — 17 of Part B's 43 findings are the same defects as Part A

| Part B | Part A | Part B | Part A | Part B | Part A |
|---|---|---|---|---|---|
| `FLEX-02` | C1 | `FLEX-16` | **new** | `FLEX-30` | FLEX-07 |
| `FLEX-03` | C1 | `FLEX-17` | **new** | `FLEX-31` | **new** |
| `FLEX-04` | **new** | `FLEX-18` | C5 | `FLEX-32` | **new** |
| `FLEX-05` | H5 | `FLEX-19` | M9 | `FLEX-33` | **new** |
| `FLEX-06` | C5 | `FLEX-20` | **new** | `FLEX-34` | **new** |
| `FLEX-07` | **new** | `FLEX-21` | H1 | `FLEX-35` | FLEX-13 |
| `FLEX-08` | **new** | `FLEX-22` | **new** | `FLEX-36` | M3 |
| `FLEX-09` | **new** | `FLEX-23` | H4 | `FLEX-37` | **new** |
| `FLEX-10` | **new** | `FLEX-24` | M2 | `FLEX-38` | H6 |
| `FLEX-11` | **new** | `FLEX-25` | **new** | `FLEX-39` | L1 |
| `FLEX-12` | **new** | `FLEX-26` | FLEX-25 | `FLEX-40` | **new** |
| `FLEX-13` | **new** | `FLEX-27` | C3 | | |
| `FLEX-14` | M5 / M6 | `FLEX-28` | **new** | | |
| `FLEX-15` | **new** | `FLEX-29` | M1 | | |

Three overlaps deserve a note:

- **`FLEX-06` strengthens `C5` rather than duplicating it.** Part B observed that the committed `Dockerfile` never sets `INTERNAL_API_KEY`, so `config.js:13` (`internalSecret: process.env.INTERNAL_API_KEY`) resolves to `undefined` and `protectionMiddleware` falls back to the literal `iloilo_work_2026_secure`. Part A proved that the **live** deployment *does* set the variable (the wrong key returned 403, the right key returned 200), so the live exposure is `flexspace-secret-key` (C5), not the fallback. `FLEX-06` is the **default-deployment** variant and is recorded as an amplifier of C5, not a separate critical.
- **`FLEX-05` overlaps `H5` and is carried at `H5`'s High rating.** Part B rated the unauthenticated open relay as Critical; Part A's `H5` covers the same defect (open relay **plus** the plaintext welcome-email password) and rated it High. The merged register keeps the Part A rating so the same defect is not counted twice under two severities; the Critical rationale is preserved in `SECURITY-PENTEST-REPORT-SANDBOX.md` §4.
- **`FLEX-19` and `M9` are the same defect.** Part A's live test showed the Cloudflare edge blocks a client-supplied `cf-connecting-ip` with `HTTP 403` / `error code: 1000`, so the *live* bypass did not reproduce; Part B reproduced it in a sandbox with no edge in front. The defect is real and deployment-dependent — it is a live vulnerability on any deployment that is not behind a header-rewriting edge, and a latent one behind one. `M9` stands, with the rating already corrected to Medium (CVSS 5.3).

### 6.3 The 26 new findings

These are the defects that Part A did **not** report. Seventeen of them are in the Critical/High band.

| ID | Sev | CVSS | Finding | Top 10 (2021) | API Top 10 (2023) | ASVS v4.0.3 | ASVS v5.0.0 | CWE |
|---|---|---|---|---|---|---|---|---|
| **FLEX-01** | Critical | 9.8 | NoSQL operator injection in the password-reset flow → unauthenticated account takeover | A03, A07, A01, A04 | API2, API5, API6 | `V2.2.1`, `V2.5.1`, `V4.1.1`, `V5.1.3`, `V11.1.1`, `V13.1.4` | `V2.2.1`, `V2.2.2`, `V8.2.1`, `V8.3.1`, `V16.3.3` | CWE-943, CWE-287, CWE-20 |
| **FLEX-04** | Critical | 8.8 | Payment amount taken from the request body | A04, A01 | API5, API6 | `V4.1.1`, `V5.1.3`, `V11.1.1`, `V13.2.2` | `V2.2.1`, `V2.3.3`, `V8.2.1` | CWE-602, CWE-20 |
| **FLEX-07** | Critical | 8.8 | No rate limit on the OTP/reset endpoints; 6-digit OTP from `Math.random()` (900 000 keyspace) | A07, A04 | API2, API4, API6 | `V2.2.1`, `V2.2.2`, `V11.1.1`, `V11.1.3`, `V11.1.4` | `V2.4.1`, `V2.2.1`, `V6.2.1` | CWE-307, CWE-330, CWE-799 |
| **FLEX-08** | Critical | 8.1 | A voucher issued in one tenant zeroes another tenant's bill, reusable without limit | A01, A04 | API1, API6 | `V4.1.1`, `V4.1.3`, `V5.1.3`, `V11.1.1` | `V8.2.2`, `V8.4.1`, `V2.3.3` | CWE-862, CWE-639 |
| **FLEX-17** | Critical | 8.8 | Plant a staff account in any tenant's space, then read and settle that tenant's live bookings (staff scope trusts `space_id` without an ownership check) | A01, A02, A07 | API1, API5 | `V2.5.1`, `V4.1.1`, `V4.1.3`, `V6.4.1` | `V8.2.1`, `V8.4.1`, `V13.3.1` | CWE-862, CWE-639, CWE-269, CWE-798 |
| **FLEX-09** | High | 7.5 | Null `check_in_at` inflates a booking to ₱124,484,989.58 and credits the owner | A04, A01 | API1, API6 | `V5.1.3`, `V11.1.1`, `V13.2.2` | `V2.2.1`, `V2.3.3`, `V8.3.1` | CWE-20, CWE-682 |
| **FLEX-10** | High | 7.2 | POS order totals accepted from the client → platform fee computed from a fake total | A04, A01 | API3, API6 | `V5.1.3`, `V11.1.1`, `V13.2.2` | `V2.2.1`, `V2.3.3`, `V15.3.3` | CWE-602, CWE-20 |
| **FLEX-11** | High | 7.5 | Any authenticated user re-credits a victim tenant's order into their own earnings ledger | A01, A04 | API1, API5 | `V4.1.1`, `V4.1.3`, `V13.1.4` | `V8.2.2`, `V8.4.1`, `V8.3.1` | CWE-639, CWE-862 |
| **FLEX-12** | High | 7.1 | A `role=user` account can mark any space owner's platform fees as collected | A01, A04 | API5, API6 | `V4.1.1`, `V4.1.3`, `V13.1.4` | `V8.2.1`, `V8.4.1` | CWE-862, CWE-269 |
| **FLEX-13** | High | 7.5 | Mass assignment transfers space ownership to an arbitrary account | A01, A04 | API1, API3 | `V4.1.2`, `V5.1.2`, `V13.2.2` | `V15.3.3`, `V8.2.2`, `V8.4.1` | CWE-915 |
| **FLEX-14** | High | 7.4 | Unauthenticated forged review auto-approved; booking PII exposed | A01, A07 | API1, API3, API5 | `V4.1.1`, `V4.1.2`, `V11.1.1`, `V13.1.4` | `V8.2.2`, `V8.3.1`, `V2.3.3` | CWE-862, CWE-345, CWE-200 |
| **FLEX-15** | High | 7.4 | Stored XSS via customer-controlled names reaches the operator's authenticated session | A03, A04 | API10 | `V1.5.4`, `V5.2.1`, `V5.3.1`, `V5.3.5` | `V1.2.1`, `V1.3.1`, `V3.2.2` | CWE-79, CWE-116 |
| **FLEX-16** | High | 7.1 | Error and activity logs persist plaintext passwords, bcrypt hashes and live reset tokens | A02, A09 | API8 | `V6.1.1`, `V7.1.1`, `V7.1.2`, `V7.4.1` | `V14.2.4`, `V16.2.5`, `V16.4.2` | CWE-532, CWE-312, CWE-359 |
| **FLEX-20** | High | 6.5 | 12-hour access tokens that cannot be revoked; role trusted from the token | A07, A02 | API2 | `V3.1.1`, `V3.2.1`, `V3.3.1`, `V3.3.2`, `V3.5.3` | `V6.2.1`, `V7.1.1`, `V7.3.1`, `V7.4.1` | CWE-613 |
| **FLEX-41** | High | 7.1 | A customer can publish a live space listing with no business permit or DTI approval (registration gate bypassed) | A04, A01 | API6, API5 | `V4.1.1`, `V11.1.1`, `V13.1.4` | `V8.2.1`, `V8.4.1` | CWE-284, CWE-840 |
| **FLEX-22** | Medium | 5.3 | Default password `FlexSpace2026` issued to staff and e-mailed in clear text | A02, A07 | API5, API8 | `V2.5.1`, `V6.4.1`, `V6.4.2` | `V11.1.1`, `V13.3.1`, `V14.2.4` | CWE-798, CWE-319, CWE-1188 |
| **FLEX-25** | Medium | 5.3 | `.env.example` ships `NODE_ENV=development` → stack traces exposed **and the entire anti-DDoS layer disabled** | A05, A04 | API8 | `V1.6.2`, `V14.3.2`, `V14.4.1` | `V13.4.1`, `V13.4.2` | CWE-1188, CWE-209, CWE-693 |
| **FLEX-28** | Medium | 5.3 | Session token in `localStorage` (XSS-reachable) with no CSP to contain it | A03, A07 | API2 | `V3.2.3`, `V14.4.3`, `V14.4.6` | `V7.3.1`, `V3.4.5` | CWE-922, CWE-1004 |
| **FLEX-37** | Medium | 5.3 | `multer.memoryStorage()` buffers up to 100 MB per request in heap | A05 | API4 | `V12.1.1`, `V12.4.1` | `V5.2.1`, `V5.2.2` | CWE-400, CWE-770 |
| **FLEX-42** | Medium | 5.3 | The `/space` router has no role gate — every owner surface answers a plain customer token | A01, A05 | API5 | `V4.1.1`, `V4.1.3`, `V13.1.4` | `V8.2.1`, `V8.3.1`, `V8.4.1` | CWE-862, CWE-269 |
| **FLEX-43** | Medium | 5.3 | A planted staff account is invisible to the tenant whose space it lives in | A01 | API1 | `V4.1.1`, `V11.1.1` | `V8.2.2`, `V8.4.1` | CWE-639, CWE-863 |
| **FLEX-31** | Low | 3.1 | Two divergent implementations of the voucher rule | A08 | API6 | `V1.11.2`, `V14.2.1` | `V2.3.3`, `V15.3.1` | CWE-573 |
| **FLEX-32** | Low | 3.1 | Payment verification picks an arbitrary space → arbitrary gateway key | A02, A04 | API8 | `V4.1.3`, `V14.4.1` | `V8.4.1`, `V11.1.1` | CWE-441, CWE-320 |
| **FLEX-33** | Low | 2.1 | Duplicate index warning on `slug` | A05 | API8 | `V13.2.4` | `V13.4.4` | CWE-1035 |
| **FLEX-34** | Low | 3.1 | Extensive `console.log` of PII, tokens and order payloads | A09, A02 | API8 | `V7.1.2`, `V14.3.2` | `V16.2.5`, `V13.4.2` | CWE-532, CWE-200 |
| **FLEX-40** | Low | 2.1 | `ErrorLog` rows created for expected 4xx → log noise plus secret retention | A09 | API8 | `V7.1.2`, `V7.4.1` | `V16.2.3`, `V16.5.1` | CWE-778, CWE-532 |

> **Merged register: 10 Critical · 15 High · 15 Medium · 10 Low/Info = 50 findings**, plus the 3 A09 observations.
> Part A contributed 24 (5 Critical · 5 High · 9 Medium · 5 Low/Info). Part B contributed 26 (5 Critical · 10 High · 6 Medium · 5 Low/Info). The 17 overlapping Part B findings are counted once.

### 6.4 How Part B changes the Part A verdicts

Part B does **not** rescue any category — but it invalidates five specific Part A verdicts, all of which are corrected in `OWASP-ASVS-CONTROL-MATRIX.md`:

| ASVS requirement | Part A verdict | Corrected verdict | Why |
|---|---|---|---|
| `V7.1.1` (v4) — "does not log credentials or payment details" | **PASS** | **FAIL** | `sanitizeRequestData` redacts only the exact keys `password`, `token`, `secret`, `key`, `authorization`, `api_key`. `newPassword`, `otp` and `resetToken` are **not** redacted. `logsActivity.js:92` persists `doc.toObject()` (the whole user document, hash included) and `:154` persists the raw update object. FLEX-16. |
| `V5.1.2` (v4) — mass assignment | **PASS\*** | **FAIL** | The "Mongoose strict mode blocks it" assumption was wrong for `spaceController.update` — its allow/block-list (`spaceController.js:147-160`) blocks only `_id`, `__v` and `created_at`. `user_id` is writable. FLEX-13. |
| `V15.3.3` (v5) — "countermeasures to protect against mass assignment" | **PASS\*** | **FAIL** | Same root cause as above. FLEX-13. |
| `V12.1.1` (v4) — "will not accept large files" | **PASS** | **PARTIAL** | A 10 MB per-file cap exists, but `files: 10` plus `memoryStorage` means a single request can buffer 100 MB in the Node heap. FLEX-37. |
| `V13.4.2` (v5) — "production settings and no development mode" | **PASS** | **PARTIAL** | `server/.env.example:1` ships `NODE_ENV=development`, so a deployment that copies the example file returns stack traces and absolute filesystem paths in API responses (`errorHandler.js:47`). FLEX-25. |

Three Part A statements are also corrected in wording rather than verdict:

- **`WSTG-SESS-07`** ("session tokens not expired") → tokens *do* expire, after **720 minutes** (`config.js:18`), but they cannot be revoked and the role is read from the token. FLEX-20.
- **`WSTG-INJT-05`** (NoSQL injection on login — Part A recorded it as **blocked**) → login *is* blocked; the **password-reset** flow is not. The Part A non-finding `L8` stays as-is, and FLEX-01 is raised separately.
- **`L8`** ("NoSQL injection on login — blocked") → unchanged for login, but it must no longer be read as "the application is not injectable". `WSTG-INJT-05` moves to **FAIL**.

---

## 7. Proposed solutions — consolidated, by design pattern

The **50 merged findings** (10 Critical · 15 High · 15 Medium · 10 Low/Info) plus the 3 A09 observations reduce to **sixteen** design changes. P1–P4 close the five Part A Critical findings; the five Part B Critical findings (FLEX-01, FLEX-04, FLEX-07, FLEX-08 and FLEX-17) are closed by P10, P11 and P12 — **P12 alone closes two of them** (FLEX-08 and FLEX-17).

The first nine patterns (P1–P9) come from Part A; P10–P16 come from Part B and cover the defects Part A did not reach.

### P1 — Delete the client-side fingerprint and make session auth the only gate
**Closes:** C3 (and contributes to A02, A07, API2)
Replace `protectionMiddleware` with the same router-level `auth` + role guard the admin surface already uses correctly. Remove `x-app-fingerprint` from `Api.jsx` and from the server. Any endpoint that must stay public should be listed explicitly in one `publicRoutes` array so the decision is reviewable.

### P2 — Make payment a verified consequence, never a client command
**Closes:** C1, C2 (and contributes to A04, A08, API5, API6, API10)
The server owns the state machine:
- `POST /orders/:id/confirm-payment` → **re-verify** with the gateway, compare amount/currency/booking, then transition inside one idempotent transaction with a unique constraint on `payment_intent_id`. Never trust a client-supplied status.
- `POST /space/payment-webhook` → **verify the provider's HMAC signature over the raw body** (constant-time compare), reject `401` on failure, validate the payload against a schema, then re-verify with the gateway before mutating. Use the provider event id as an idempotency key.
- Add an **out-of-band reconciliation job** that compares local `Order`/`Booking` rows against the gateway's list, so a missed webhook self-heals instead of leaving a booking unpaid forever.

### P3 — Treat all AI output as untrusted input
**Closes:** C4 (and hardens A03, API10)
Sanitise at the boundary (before persisting) *and* at the sink (before rendering), with a single maintained sanitiser and an explicit tag/attribute allow-list. Constrain `Space.name`/`description` with length/pattern limits. Add a CSP without `unsafe-inline`. Audit the existing `Blog` collection for payloads that predate the fix.

### P4 — Move every secret to a managed store and rotate what is exposed
**Closes:** C5, L1 (and hardens A02, A08)
Delete every `|| 'literal'` fallback for a secret. Boot must fail if a production secret is absent. Rotate `INTERNAL_API_KEY` and `BLOG_API_KEY`; purge from git history and from the container image. Add `gitleaks` to CI.

### P5 — One trusted client-IP resolver, used everywhere
**Closes:** M9, M7, A09-02
`app.set('trust proxy', 1)` → `req.ip`. If a CDN header must be honoured, verify the peer is inside Cloudflare's published ranges first. Remove the private-range "localhost" exemption from all limiter paths; gate dev behaviour on `NODE_ENV` only. Use this one resolver in `antiDdos`, `autoLogger`, `errorLogService` and `publicLikeReview`.

### P6 — Security-event logging and alerting
**Closes:** A09-01, A09-02, A09-03
A defined catalogue of security events written to structured storage with actor, object, action, outcome, trusted IP and correlation id. Alerts on payment transitions, admin actions, registration bursts and repeated authentication failures.

### P7 — Baseline headers, exact-origin CORS, bounded request bodies
**Closes:** H1, M1, M3, L2 (and hardens A05, API8)
`helmet` + an explicit header policy on both the Vercel app and the API; exact-match CORS allow-list with `credentials: false`; body limit 1 MB with `extended: false`; generic error responses with correlation ids; internal endpoints authenticated.

### P8 — Ownership-scoped data access and field-minimal responses
**Closes:** M5, C1-response (and hardens API1, API3)
Scope every object query to the caller's identity; return purpose-built response shapes; treat `qr_code_token` as a credential that never leaves the server except to its owner.

### P9 — Supply-chain and dependency hygiene
**Closes:** H6 (and hardens A06, A08, API8)
`npm audit fix` + pins, blocking audit gate in CI, SBOM per build, dependency-update bot, secret scanning in CI.

### P10 — Never let a request object become a query
**Closes:** FLEX-01, FLEX-07 (and hardens A03, A07, API2)
`User.findOne({ email })` with `email` read straight from `req.body` is a query operator injection: `{"email":{"$ne":null}}` selects the first user in the database. Fix at four levels:
- **Coerce at the boundary.** Reject any body value that is not a primitive `string`, and normalise before use: `const email = String(req.body.email ?? '').trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ValidationError();` Then query `User.findOne({ email })` with the coerced string — a string value can never carry an operator.
- **Never spread a request body into a query.** Audit every `findOne`/`findOneAndUpdate`/`updateOne` that takes a body object; build the filter from an explicit allow-list of scalar fields.
- **Turnstile + rate limit on every auth-adjacent route**, not just login. `authRoutes.js:67-69` currently applies no limiter to `/forgot-password`, `/verify-otp` and `/reset-password`.
- **Use a CSPRNG for the OTP** — `crypto.randomInt(0, 1_000_000)` — not `Math.random()`, and raise the OTP to ≥ 8 characters. The current 6-digit `Math.random()` code has a 900 000-value keyspace.

### P11 — The server computes the money
**Closes:** FLEX-04, FLEX-09, FLEX-10, FLEX-12, FLEX-31, FLEX-32 (and hardens A01, A04, API3, API6)
No amount, total, subtotal, fee, discount or date that affects a balance may come from the client.
- Rebuild the order total from the **line items in the database**, and the discount from the **voucher record**, not from the request. `posController.js:193-195` currently reads `total` and `subtotal` from the body; `rewardService.validateVoucher` returns `discount_amount` that the caller is free to ignore.
- Validate `check_in_at` / `check_out_at` against a schema before any arithmetic; a null date must be rejected, not defaulted to `now`, because `now - null` yields the epoch and inflates the bill by decades.
- One voucher rule, one implementation. `rewardService` and `bookingOrderService` implement the same rule differently; delete one and make the other the single source of truth.
- Bind a voucher to a `space_id` and enforce it. `validateVoucher` checks ownership only for `user_specific` vouchers and returns early for `space_specific`/`global` ones — before any `usage_count` increment — so a voucher issued to one space can be redeemed against another, without limit.

### P12 — Tenant identity comes from the token, never from the body
**Closes:** FLEX-08, FLEX-11, FLEX-12, FLEX-13, FLEX-14, FLEX-17, FLEX-32, FLEX-42, FLEX-43 (and hardens A01, API1, API5)
This is the single highest-leverage change in the Part B set, because it closes nine findings at once — including the two Critical ones (FLEX-08 and FLEX-17).
- Derive `space_id` / `tenant_id` from the authenticated principal and compare it to the target object. Never accept a `space_id` from `req.body` — `staffController.js:77` and `:97` do exactly that, which is how staff can be created inside a competitor's space.
- Write a `requireSpaceScope()` guard and mount it on **every** space-scoped route. `/orders/:orderId/fix-payment` and `/payment/confirm-fee-payment` currently have only `auth`, which proves *who* the caller is but not *which tenant* they may act for.
- Convert mass assignment into allow-listing. `spaceController.update` blocks only `_id`, `__v` and `created_at`; `user_id` is writable and therefore a space can be transferred to an arbitrary account. Explicitly allow-list the writable fields per controller and per action.
- Every query on a tenant-owned collection gets the tenant in the filter. Every earnings, fee and booking mutation re-checks ownership against the *target* record, not just the caller's role.
- **One role gate on the router.** `/space` is mounted with `auth` only and `authMiddleware.js` never inspects `req.user.role`, so every owner surface answers a plain customer token (FLEX-42). Mount `requireRole('space', 'staff')` alongside `requireSpaceScope()`.
- **One approval state machine.** `POST /space/spaces` lets a customer publish a live, bookable listing with no business permit and no DTI approval, because the registration gate is not re-applied (FLEX-41). Route listing creation through the same `SpaceRequest` approval flow as registration.
- **Scope staff listings by the assigned space, not by the creating account**, and notify the space owner when an account is attached to their space — otherwise a planted staff account is invisible to the tenant it attacks (FLEX-43).

### P13 — Revocable, short-lived sessions
**Closes:** FLEX-20, FLEX-07 (and hardens A07, API2)
`config.js:18` sets `accessExpirationMinutes: 720` — a 12-hour stateless JWT with no server-side session record, so it cannot be revoked and a role baked into it cannot be changed. Introduce a server-side session or token-version record: on logout, on password change, on role change and on suspected compromise, increment the user's token version so previously issued tokens fail verification. Drop the access token lifetime to 15–30 minutes with a rotating refresh token. Read the effective role from the database on each authorisation decision rather than from the token payload.

### P14 — Secrets must not survive into logs, e-mail or defaults
**Closes:** FLEX-16, FLEX-22, FLEX-25, FLEX-34, FLEX-40 (and hardens A02, A09, API8)
- **Redact by pattern, not by exact key.** `sanitizeRequestData` matches only `password`, `token`, `secret`, `key`, `authorization`, `api_key`. Match on substrings and case-insensitively so `newPassword`, `resetPassword`, `otp`, `resetToken`, `pin` and `cvv` are all caught. Redact by **value shape** as well: anything that looks like a JWT, a bcrypt hash or a MongoDB ObjectId in a token field.
- **Stop persisting whole documents.** `logsActivity.js:92` writes `doc.toObject()` and `:154` writes the raw update object, which is how the bcrypt hash and the live reset token end up in the log collection. Store an explicit allow-list of changed fields, excluding anything whose name matches the secret patterns.
- **Never ship a default password or a default secret.** `staffController.js:95` falls back to `password || 'FlexSpace2026'`; the Dockerfile never sets `INTERNAL_API_KEY` so `protectionMiddleware` falls back to `iloilo_work_2026_secure`. Boot must fail when a production secret is missing, and a staff account must be issued a one-time setup link instead of a default password.
- **`.env.example` must not be a runnable configuration.** It currently sets `NODE_ENV=development`, which both exposes stack traces and silently disables the entire anti-DDoS layer (`app.js:172-181`). Rename it `.env.template` and use empty placeholders.
- **Do not log expected 4xx as errors** — a 400 from a bad request body should not create an `ErrorLog` row containing that body.

### P15 — One rendering boundary for every operator-facing HTML
**Closes:** FLEX-15, FLEX-28, C4 (and hardens A03, API10)
`FLEX-15` is a second stored-XSS family that Part A did not find: customer-controlled names reach the operator's **authenticated** session through receipt and report HTML, not through the blog pipeline. Apply one rule everywhere: any value that can contain user text is escaped at the sink, and `dangerouslySetInnerHTML` is allowed only for content that has passed a maintained sanitiser with an explicit tag/attribute allow-list. Add a CSP without `unsafe-inline` so a missed sink is contained, and move the session token out of `localStorage` into an `HttpOnly` `__Host-` cookie so an XSS cannot exfiltrate it.

### P16 — Bound the work an unauthenticated request can cause
**Closes:** FLEX-37, FLEX-25 (and hardens A05, API4)
`upload.js:8` uses `multer.memoryStorage()` with `files: 10` and `fileSize: 10 MB`, so one request can hold 100 MB in the Node heap; switch to disk or Cloudinary streaming, and cap the request count. Rate-limit the analytics, AI chat and OTP endpoints per account **and** per trusted IP, and make the anti-DDoS layer unconditional rather than `NODE_ENV`-conditional so a misconfigured environment cannot silently remove it.


---

## 8. Verification plan (OWASP-aligned re-test)

After remediation, re-run against these OWASP anchors. Full command reference is in `SECURITY-PENTEST-REPORT.md` §10.

| OWASP anchor | Re-test | Expected result |
|---|---|---|
| A01 / API1 / API5 | Replay C1, C2, M5 | `401`/`404` for every unauthenticated variant; object ids return `404`, never data |
| A02 / API8 | Grep the bundle and repo for the rotated keys | No secret in the bundle; `x-app-fingerprint` gone from both client and server; old keys rejected `401` |
| A03 / API10 | Fetch every published blog; assert sanitiser output | No `<script>`, `onerror=`, `javascript:` or `data:` in any `Blog.content` |
| A04 / API10 | Forge a webhook with a valid body but invalid signature | `401`, no state change, security event logged |
| A05 / API8 | Request with `Origin: https://evil-attacker-xyz.vercel.app` | No `access-control-allow-origin` header at all |
| A05 | `curl -D-` every endpoint | `CSP`, `nosniff`, `Referrer-Policy`, `frame-ancestors`, `HSTS` present; body limit rejects > 1 MB with `413` |
| A06 | `npm audit` in both trees | 0 critical, 0 high |
| A07 / API2 | Register in a loop; attempt login bursts | CAPTCHA required on registration; lockout engages per account |
| A08 / API10 | Replay a captured webhook body | `401` (signature), `409`/no-op (replay) |
| A09 | Trigger C1's flow after the fix | Security event with actor + trusted IP + correlation id, and an alert fires |
| A07 / FLEX-01 | `POST /auth/forgot-password` with `{"email":{"$ne":null}}` and `{"email":{"$regex":"^a"}}` | `400` — the body value is coerced to a string and rejected |
| A07 / FLEX-01 | Three-request takeover chain (forgot → verify → reset) with operator payloads | Fails at the first request; no OTP, no reset token ever issued for a non-string identifier |
| A07 / FLEX-07 | 10 `verify-otp` attempts in a minute | `429` before the 10th; OTP is ≥ 8 characters from a CSPRNG |
| A01 / FLEX-08, FLEX-11, FLEX-17 | Redeem a voucher, re-credit an order and create staff against a second tenant | `403`/`404` in all three; the tenant filter excludes the object |
| A01 / FLEX-42, FLEX-43 | `GET /space/earnings` with a plain customer token; `GET /space/staff` as the victim owner | `403` on the first; the planted account is visible and removable on the second |
| A04 / FLEX-09, FLEX-10 | Booking with `check_in_at: null`; POS order whose body says `total: 1` | `400` on the first; the stored total is rebuilt from line items on the second |
| A08 / FLEX-13 | `PUT /space/:id` with `user_id` in the body | Field ignored — only allow-listed fields are written |
| A09 / FLEX-16 | Reset a password, then read `ActivityLog` and `ErrorLog` | No bcrypt hash, reset token, OTP or plaintext password in any row |
| A07 / FLEX-20 | Log out, then replay the same token | `401` — the token version was incremented; lifetime ≤ 30 minutes |
| A10 | Host-header injection | `403`/ignored (unchanged — keep it passing) |
| API9 | Enumerate endpoints; compare against an OpenAPI contract | Every route appears in the inventory with its auth requirement |

---

## 9. Appendix A — code locations referenced

| Location | Role |
|---|---|
| `server/app.js:94-113` | CORS allow-list (wildcard `*.vercel.app`, `*.onrender.com`, `192.168.*`, `10.*`) |
| `server/app.js:128-165` | CORS middleware — `credentials: true`, header/method allow-list, `maxAge: 86400` |
| `server/app.js:168-169` | 50 MB body limits, `extended: true` |
| `server/app.js:184` | `express.static` for `/uploads` |
| `server/app.js:207-225` | Public `/health` and `/api/v1/health/antiddos-status` |
| `server/app.js:262-264` | `captureRequest`, `autoLogger`, route mount |
| `server/app/api/v1/middleware/protectionMiddleware.js:7-17` | Static header comparison + `iloilo_work_2026_secure` fallback |
| `server/app/api/v1/middleware/antiDdos.js:14-23` | `extractIp()` — unvalidated proxy header first |
| `server/app/api/v1/middleware/antiDdos.js:25-31` | `isLocalhost()` private-range exemption |
| `server/app/api/v1/middleware/antiDdos.js:69-96, 129-137, 175-197` | `gatekeeper`, `globalLimiter`, `strictLimiter` |
| `server/app/api/v1/middleware/authMiddleware.js:12-27` | JWT verification (correct) |
| `server/app/api/v1/middleware/errorHandler.js:44-48` | Error response shape |
| `server/app/api/v1/middleware/autoLogger.js:3-10` | Second, different client-IP resolver |
| `server/app/api/v1/services/errorLogService.js:7-19, 96-110` | Third IP resolver; body redaction (good) |
| `server/app/api/v1/routes/landingRoutes.js:28-44, 60-74` | `protect`-guarded routes; unauthenticated payment routes |
| `server/app/api/v1/routes/spaceRoutes.js:39, 43-45, 87-131` | Unauthenticated review/booking routes; unsigned webhook |
| `server/app/api/v1/routes/routes.js:21, 101, 103-105` | Unauthenticated analytics, chat and e-mail routes |
| `server/app/api/v1/routes/authRoutes.js:20-37` | Login has Turnstile; register does not |
| `server/app/api/v1/routes/adminRoutes.js:58-62` | Admin router-level JWT + role guard (correct) |
| `server/app/api/v1/controllers/landingController.js:159-197` | Review-like identity from `x-forwarded-for` |
| `server/app/api/v1/controllers/landingController.js:417-472` | `confirmOrderPayment` — no auth, no verification |
| `server/app/api/v1/controllers/space/bookingController.js:388-440` | Unauthenticated booking read |
| `server/app/api/v1/controllers/space/paybridgeController.js:46-61` | Unmounted controller with outbound `decrypt` |
| `server/app/api/v1/controllers/blogController.js:50-53` | Blog API key check + `flexspace-secret-key` fallback |
| `server/app/api/v1/controllers/authController.js:12-31, 102-188` | Turnstile verification; registration flow |
| `server/app/api/v1/emails/WelcomeEmail.js:4, 16` | Plaintext password in the welcome e-mail |
| `server/app/api/v1/services/aiBlogGeneratorService.js:161-218` | Owner-controlled `Space.name` interpolated into the prompt |
| `server/app/api/v1/models/schema/Space.js:12-15` | `name` with no validation |
| `server/app/api/v1/models/schema/Blog.js:7` | `content` stored verbatim |
| `server/app/api/v1/utils/upload.js:12-29, 64` | 10 MB size limit; client-MIME-only filter |
| `server/app/api/v1/utils/logsActivity.js:17-35, 202-207` | Activity-log actor resolution; `captureRequest` |
| `server/config` → `server/app/config/config.js:12-19` | `internalSecret`, `jwt.secret` from env |
| `server/Dockerfile:34` | `ENV BLOG_API_KEY=flexspace-secret-key` |
| `server/cron/generate-blogs.js:3, 16` | Blog key fallback and header injection |
| `client/src/utils/Api.jsx:22, 24, 62` | Fingerprint constant; JWT in `localStorage` |
| `client/src/pages/Landing/BlogDetail.jsx:160` | `dangerouslySetInnerHTML` sink |
| `client/src/components/ui/UserManual.jsx:1235` | Second `dangerouslySetInnerHTML` sink |
| `client/vercel.json` | No global security-header configuration |

### Part B code locations

| Location | Role |
|---|---|
| `server/app/api/v1/controllers/passwordController.js:19, 65, 134` | `User.findOne({ email })` with `email` from `req.body` — the NoSQL injection / account-takeover path; `verifyOTP` returns the reset token in the body |
| `server/app/api/v1/routes/authRoutes.js:67-69` | `/forgot-password`, `/verify-otp`, `/reset-password` — **no rate limiter** |
| `server/app/api/v1/services/otpService.js:7` | `Math.floor(100000 + Math.random() * 900000)` — 6-digit OTP from a non-CSPRNG |
| `server/app/api/v1/services/errorLogService.js:96-103` | `sanitizeRequestData` — key-exact redaction list; `newPassword`/`otp`/`resetToken` missed |
| `server/app/api/v1/utils/logsActivity.js:92, 154, 190` | `doc.toObject()`, raw `changes`, `deletedData` persisted into the activity log |
| `server/app/api/v1/controllers/space/spaceController.js:147-160` | Update path — block-list covers only `_id`, `__v`, `created_at`; `user_id` is writable |
| `server/app/api/v1/controllers/space/staffController.js:77, 91-97, 144` | `space_id` from `req.body`; `password \|\| 'FlexSpace2026'` |
| `server/app/api/v1/controllers/space/posController.js:179-388, 731` | `total`/`subtotal`/`amount_received` from `req.body`; `fixOrderPayment` |
| `server/app/api/v1/controllers/space/paymentController.js:227` | `confirmFeePayment` |
| `server/app/api/v1/routes/spaceRoutes.js:215, 231` | `fix-payment` and `confirm-fee-payment` — `auth` only, no tenant scope |
| `server/app/api/v1/controllers/space/bookingController.js:355-365, 454-552` | Null `check_in_at` arithmetic; unauthenticated auto-approved review |
| `server/app/api/v1/services/rewardService.js:58, 63, 98-171` | Voucher `space_id` copy, `usage_count`, and `validateVoucher`/`validateAndUseVoucher` returning early for space/global vouchers |
| `server/app/api/v1/utils/upload.js:8, 12-14` | `multer.memoryStorage()`; `fileSize: 10 MB`, `files: 10` → 100 MB per request in heap |
| `server/app/config/config.js:13, 18` | `internalSecret` from env (unset in the Dockerfile); `accessExpirationMinutes: 720` |
| `server/app.js:172-181` | Anti-DDoS middleware enabled only when `NODE_ENV === 'production'` |
| `server/.env.example:1` | `NODE_ENV=development` — ships a development-mode default |
| `server/app/api/v1/controllers/landingController.js:384` | `Space.findOne({ status: 'Open Now' })` — an arbitrary space, hence an arbitrary gateway key |

## 10. Appendix B — OWASP artefacts used

| Artefact | Version | Source used |
|---|---|---|
| OWASP Top 10 | 2021 | OWASP Top 10 2021 category list |
| OWASP API Security Top 10 | 2023 | OWASP API Security Top 10 2023 category list |
| OWASP ASVS | **v4.0.3** | `OWASP/ASVS` tag `v4.0.3` → `4.0/docs_en/OWASP Application Security Verification Standard 4.0.3-en.csv` (286 requirements, with CWE + NIST mappings and L1/L2/L3 levels) |
| OWASP ASVS | **v5.0.0** | `OWASP/ASVS` tag `v5.0.0_release` → `5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv` (345 requirements) |
| OWASP WSTG | `master` (v5 draft tree) | `OWASP/wstg` → per-test `\|ID\|` tables, **117 unique test IDs** (118 documents) extracted for the coverage matrix |

> ASVS requirement identifiers and levels in `OWASP-ASVS-CONTROL-MATRIX.md` were extracted directly from the official English CSVs, not reconstructed from memory. Levels shown as `L23` mean the requirement is mandated at Level 2 and Level 3.
