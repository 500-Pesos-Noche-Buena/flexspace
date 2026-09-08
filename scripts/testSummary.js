const fs = require('node:fs');
const path = require('node:path');
const readJson = file => { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return null; } };
function summarize(root, results) {
    const server = results.find(r=>r.name.startsWith('Server:'));
    const client = results.filter(r=>r.name.startsWith('Client:'));
    const testStage = client.find(r=>r.name.includes('interactions'));
    const serverLog = server?.output ?? (server ? fs.readFileSync(path.join(root,'test-results',server.log),'utf8') : '');
    const serverCounts = serverLog.match(/Tests:\s+(\d+) passed, (\d+) failed, (\d+) skipped/);
    const suiteCounts = serverLog.match(/Suites:\s+(\d+) passed, (\d+) failed/);
    const clientReport = testStage?.report;
    const backendCoverage=server?.execution;
    const clientCoverage=testStage?.coverage;
    const serverCoverage=server?.coverage;
    const serverFailures=[...serverLog.matchAll(/^FAIL\s+(.+)$/gm)].map(match=>match[1]);
    const clientFailures=clientReport?.testResults?.filter(suite=>suite.status==='failed').map(suite=>path.relative(root,suite.name)) || [];
    return {
        server: { passed: Boolean(server?.passed), tests:serverCounts ? {passed:+serverCounts[1],failed:+serverCounts[2],skipped:+serverCounts[3]} : null,
            suites:suiteCounts ? {passed:+suiteCounts[1],failed:+suiteCounts[2]} : null,
            filesLoaded:backendCoverage?.files?.filter(f=>f.loaded).length, filesTotal:backendCoverage?.files?.length,
            lineCoverage:serverCoverage?.total?.lines?.pct, branchCoverage:serverCoverage?.total?.branches?.pct, failedSuites:serverFailures },
        client: { passed:client.length>0&&client.every(r=>r.passed), tests:clientReport ? {passed:clientReport.numPassedTests,failed:clientReport.numFailedTests,skipped:clientReport.numPendingTests} : null,
            lineCoverage:clientCoverage?.total?.lines?.pct, branchCoverage:clientCoverage?.total?.branches?.pct,
            failedSuites:clientFailures, checks:client.map(r=>({name:r.name.replace('Client: ',''),passed:r.passed})) }
    };
}
function printSummary(summary, results, seconds) {
    const count=tests=>tests ? `${tests.passed} passed | ${tests.failed} failed | ${tests.skipped} skipped` : 'Test counts unavailable — check stage log';
    const status=passed=>passed?'PASS':'FAIL';
    console.log('\n'+'═'.repeat(68));
    console.log('FINAL PROJECT SUMMARY');
    console.log('═'.repeat(68));
    console.log(`SERVER  ${status(summary.server.passed)}  ${count(summary.server.tests)}`);
    if(summary.server.suites) console.log(`        Suites: ${summary.server.suites.passed} passed | ${summary.server.suites.failed} failed`);
    if(summary.server.filesTotal) console.log(`        Backend files loaded: ${summary.server.filesLoaded}/${summary.server.filesTotal} (execution inventory)`);
    if(summary.server.lineCoverage!=null)console.log(`        Coverage: ${summary.server.lineCoverage}% lines | ${summary.server.branchCoverage}% branches`);
    console.log(`\nCLIENT  ${status(summary.client.passed)}  ${count(summary.client.tests)}`);
    for(const check of summary.client.checks) console.log(`        ${status(check.passed)}  ${check.name}`);
    if(summary.client.lineCoverage!=null) console.log(`        Coverage: ${summary.client.lineCoverage}% lines | ${summary.client.branchCoverage}% branches`);
    const failures=results.filter(r=>!r.passed);
    const failedSuites=[...summary.server.failedSuites,...summary.client.failedSuites];
    if(failures.length){
        console.log('\nNEEDS ATTENTION');
        for(const result of failures) console.log(`  FAIL ${result.name} → test-results/${result.log}`);
        for(const name of failedSuites) console.log(`       ${name}`);
    }
    console.log(`\nOVERALL ${status(!failures.length)}  ${results.length-failures.length}/${results.length} stages passed · ${seconds.toFixed(1)} seconds`);
    console.log('Reports: test-results/summary.json | client/coverage/index.html');
    console.log('Passing checks do not mean every branch is covered.');
    console.log('═'.repeat(68));
}
module.exports={summarize,printSummary,readJson};
