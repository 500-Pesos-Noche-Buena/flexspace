# Backend tests and development configuration

Only test processes load `server/.env.test`. Normal `server.js` startup retains its original `.env` / production environment behavior, and `app.js` does not load test settings. The single test entry point is `server/test.js`.

From the project root:

```sh
npm test
# Equivalent direct command:
node server/test.js
```

Or inside `server`:

```sh
npm test
npm run test:unit
npm test -- --verbose
```

The full command syntax-checks every backend JavaScript file and runs all nonempty test suites. `test:unit` runs the same syntax checks and tests that do not require MongoDB.

The full suite connects to `MONGODB_URI` from `.env.test`. MongoDB must already be running as a replica set. It creates a new database named `co_working_test_run_<time>_<process>` using the configured database name as its prefix. Cleanup is restricted to that run's database; it never clears `co_working_test` or application records. Database connectivity failures fail the command instead of silently skipping tests.

Tests run with `NODE_ENV=test` even though the development configuration contains `NODE_ENV=development`. External service credentials are replaced with test values. Email and payment gateway tests stub their transports and do not send messages or create payment links.

Coverage includes authentication, password verification, OTP expiration, user account status, email success/failure, payment gateway success/failure, room/pax pricing validation, package selection, booking consumables, stock, branch permissions, concurrent settlement, deposits, vouchers, reports and pagination. Syntax checks cover the entire backend; these behavioral tests are not exhaustive coverage of every endpoint or third-party integration.

## Reading the result

The runner prints a PASS or FAIL line for each suite, then totals for suites, tests and elapsed time. Use `--verbose` to see individual test names and detailed output. Failures always include their details. Exit code 0 means all selected checks passed; exit code 1 means a failed check, timeout, empty suite or startup error.

New tests belong anywhere under `server/tests` with a `.test.js` suffix and are automatically discovered. Database suites use `.integration.test.js` so `--unit` can exclude them. Use Node's built-in `node:test` and `node:assert/strict`; no additional test framework installation is needed. The test count includes the parent test for nested integration scenarios.

## Controller checks and execution report

The controller contract suite invokes 212 request handlers across all 42 controller files with validation and dependency-failure cases. The database suite also exercises successful scoped reads and model writes across admin, space and user controllers. These checks do not imply every handler has every successful or failing branch tested.

Each run writes `server/coverage/backend-coverage.json`. This lists backend files loaded and observed V8 functions executed. Unloaded files and unexecuted functions remain visible; importing a module is not complete behavioral coverage. Application startup and maintenance scripts are not executed by the test runner.

Frontend receipt regression tests run through the same command. They check decimal amounts, linked product counts, promo credits, and rejection of unpaid checkout responses.
