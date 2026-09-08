# Run all project checks

From `/var/www/html/flexspace`, run:

```sh
npm test
```

You do not need to run individual test files. The command automatically discovers backend and frontend tests and runs four stages:

1. Backend JavaScript syntax, controller and service tests, model validation, real MongoDB workflows and HTTP routes.
2. Client source correctness checks (undefined variables, unsafe code and other runtime hazards).
3. Client React interaction tests, page-opening checks and coverage.
4. Complete production client build, including its service worker.

Output streams live. Backend suites print RUN and PASS/FAIL. An elapsed-time message appears every 10 seconds during a longer stage. The final summary repeats Server and Client pass/fail, test counts, source/build checks, coverage and failed-suite names. You do not need to scroll up to find each result.

A failed stage does not stop the remaining stages; the final command exits with code 1 if any stage failed. Stage timeouts fail rather than silently succeeding.

## Setup

Install dependencies from the root, `client` and `server` package directories if needed. Start the local MongoDB replica set configured in `server/.env.test` before running the full command.

Only test processes load `.env.test`. `server.js` and `app.js` retain normal development configuration. Each database suite creates and removes its own uniquely named test database. Tests do not clear development records or the base test database. External email, payments, uploads and AI providers are replaced at their boundaries; they are not contacted.

## Reports

- `test-results/summary.json`: pass/fail and duration of each project stage.
- `test-results/runs/<run-id>/*.log`: complete stage output, isolated so simultaneous runs do not mix results.
- `test-results/source-inventory.json`: client/server source inventory and empty scaffolds.
- `client/coverage/index.html`: browser-readable line, branch and function coverage; untested client files are included.
- `client/coverage/test-results.json`: individual React test results.
- `server/coverage/index.html`: measured backend line, branch, statement and function coverage, including untested production files.
- `server/coverage/backend-coverage.json`: additional observed backend function inventory.
- `test-results/coverage-gaps.json`: files and coverage metrics below the 100% target.
- `test-results/runs/<run-id>/{server,client}-coverage/`: reports belonging to that specific run. Canonical coverage folders show the most recently copied reports.

Open either HTML coverage report in a browser to see the specific lines and functions that still need tests.

## Scope and limits

The suite checks all controller files through request validation/dependency-failure cases, all 18 model schemas, successful admin/space/user reads and writes, real HTTP authentication/authorization, atomic booking/consumable settlement, stock, vouchers, payment totals, cash change, reporting, and external-provider failure handling. Email-job regressions verify that failed deliveries reject for queue retries rather than being marked successful.

Client checks include all page modules opening with unavailable API data, shared form validation, login/registration/password rules, session handling, API errors, room/pax pricing, payment submission and report/receipt rendering. Notification regressions cover duplicate rows, polling overlap, logout during a request, saved preferences and unsupported browser capabilities. Page-opening checks are smoke tests: they do not click every button or exercise every valid and invalid input on every page.

This is a single command for the whole project's checks, **not 100% coverage or a guarantee of no bugs**. Real-browser end-to-end workflows, device layouts, external service delivery, and many individual form/event branches still require additional tests or manual checks. The coverage reports expose these gaps instead of hiding them.

## Focused development commands

```sh
npm run test:server
npm run test:client
npm --prefix client run test:watch
```

New server tests go in `server/tests/**/*.test.js`; use `.integration.test.js` for database/HTTP suites. New React tests go in `client/tests/**/*.test.jsx` (or `.test.js`). They are picked up automatically by `npm test`.

## Enforce the coverage target

```sh
npm run test:strict
```

This runs the same checks and additionally exits unsuccessfully unless **both** client and server reach 100% lines, branches, functions and statements. Normal `npm test` reports the coverage gap without turning that gap alone into a failed test. A strict coverage failure with passing tests means coverage remains incomplete; it does not mean those tests failed.

Automatic test discovery and route inventories include new files/routes, but they cannot infer every business rule. Existing tests should remain stable when internals change while behavior stays the same; changed requirements need updated expectations and new behaviors need new tests. Even 100% executed coverage cannot prove every possible input or combination is correct.
