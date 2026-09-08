#!/usr/bin/env node
// One entry point for backend tests. Application startup is never imported.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { fileURLToPath } = require('node:url');
const coverageDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'flexspace-coverage-'));
const exercised = new Map();
const root = __dirname;
const reportDir = process.env.FLEXSPACE_COVERAGE_DIR || path.join(root, 'coverage');
const started = Date.now();
const unitOnly = process.argv.includes('--unit');
const verbose = process.argv.includes('--verbose');
const color = (code, text) => process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text;
const pass = text => console.log(`${color(32, 'PASS')}  ${text}`);
const fail = text => console.log(`${color(31, 'FAIL')}  ${text}`);
function files(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        if (['node_modules', '.git', 'coverage', 'temp'].includes(entry.name)) return [];
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? files(file) : [file];
    });
}
console.log(`\nFlexSpace Backend Tests · ${unitOnly ? 'without database tests' : 'full suite'}\n`);
console.log('Environment: server/.env.test (test processes only)\n');
console.log('RUN   Checking backend JavaScript syntax...');
let syntaxFailures = 0;
const sources = files(root).filter(file => file.endsWith('.js'));
for (const file of sources) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 10000 });
    if (result.status !== 0) {
        syntaxFailures++;
        fail(`Syntax: ${path.relative(root, file)}`);
        console.log(result.stderr || result.error?.message || 'Syntax check did not finish.');
    }
}
if (!syntaxFailures) pass(`Syntax checked ${sources.length} JavaScript files`);
const tests = files(path.join(root, 'tests')).filter(file => file.endsWith('.test.js') &&
    (!unitOnly || !file.endsWith('.integration.test.js'))).sort();
let suitesPassed = 0, suitesFailed = 0, passed = 0, failed = 0, skipped = 0;
for (const file of tests) {
    const label = path.relative(root, file);
    if (!fs.statSync(file).size) { fail(`${label}: empty test file`); suitesFailed++; continue; }
    console.log(`RUN   ${label}`);
    const result = spawnSync(process.execPath, ['--require', path.join(root, 'tests/support/setup.js'), file], {
        cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, RUN_BOOKING_DB_TESTS: '1', FLEXSPACE_TEST_RUN: '1', NODE_V8_COVERAGE: coverageDir }
    });
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    const count = name => Number(output.match(new RegExp(`^# ${name} (\\d+)$`, 'm'))?.[1] || 0);
    const suitePassed = count('pass'), suiteFailed = count('fail'), suiteSkipped = count('skipped');
    passed += suitePassed; failed += suiteFailed; skipped += suiteSkipped;
    if (result.status === 0 && count('tests') > 0 && !suiteFailed) {
        suitesPassed++;
        pass(`${label} (${suitePassed} passed${suiteSkipped ? `, ${suiteSkipped} skipped` : ''})`);
    } else {
        suitesFailed++;
        fail(label);
        console.log(result.error?.message || output.trim() || 'Suite did not report any tests.');
    }
    if (verbose && result.status === 0) console.log(output.trim());
}
// Record observed function execution; loading a file is not full behavioral coverage.
for (const file of fs.readdirSync(coverageDir)) {
    const report = JSON.parse(fs.readFileSync(path.join(coverageDir, file), 'utf8'));
    for (const script of report.result || []) {
        if (!script.url.startsWith('file:')) continue;
        const filename = fileURLToPath(script.url);
        if (!filename.startsWith(root + path.sep) || filename.includes('/node_modules/')) continue;
        const functions = exercised.get(filename) || new Map();
        for (const fn of script.functions) {
            const range = fn.ranges[0];
            if (!range) continue;
            const key = `${range.startOffset}:${range.endOffset}:${fn.functionName}`;
            functions.set(key, Boolean(functions.get(key) || range.count > 0));
        }
        exercised.set(filename, functions);
    }
}
const production = sources.filter(file => !file.includes('/tests/') && !file.includes('/scripts/') && file !== __filename);
const coverage = production.map(file => {
    const functions = exercised.get(file);
    return { file: path.relative(root, file), loaded: Boolean(functions),
        observedFunctions: functions?.size || 0, executedFunctions: functions ? [...functions.values()].filter(Boolean).length : 0 };
});
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'backend-coverage.json'), JSON.stringify({
    note: 'Observed V8 function execution, not proof of all branches or successful workflows. Unloaded startup and maintenance scripts require separate checks.',
    files: coverage
}, null, 2));
console.log('RUN   Building backend line, branch and function coverage...');
const coverageReport = spawnSync(process.execPath, [path.join(path.dirname(require.resolve('c8/package.json')), 'bin/c8.js'),
    'report', '--all', '--src', '.', '--include', '**/*.js', '--exclude', 'tests/**', '--exclude', 'scripts/**',
    '--exclude', 'test.js', '--exclude', 'coverage/**', '--exclude', 'node_modules/**',
    '--temp-directory', coverageDir, '--reports-dir', reportDir,
    '--reporter', 'text-summary', '--reporter', 'html', '--reporter', 'json-summary', '--reporter', 'json'],
    {cwd:root,encoding:'utf8',timeout:60000,maxBuffer:10*1024*1024});
console.log(coverageReport.stdout || '');
if(coverageReport.status !== 0) { fail('Backend coverage generation');console.log(coverageReport.stderr || coverageReport.error?.message); }
fs.rmSync(coverageDir, { recursive: true, force: true });
console.log(`\nExecution report: server/coverage/backend-coverage.json (${coverage.filter(row => row.loaded).length}/${coverage.length} backend files loaded)`);
const ok = coverageReport.status === 0 && !syntaxFailures && !suitesFailed && tests.length > 0;
console.log('\n' + '─'.repeat(60));
console.log(`Suites: ${suitesPassed} passed, ${suitesFailed} failed`);
console.log(`Tests:  ${passed} passed, ${failed} failed, ${skipped} skipped`);
console.log(`Time:   ${((Date.now() - started) / 1000).toFixed(2)} seconds`);
console.log(color(ok ? 32 : 31, ok ? '\nOK — all selected checks passed.\n' : '\nFAILED — see details above.\n'));
process.exitCode = ok ? 0 : 1;
