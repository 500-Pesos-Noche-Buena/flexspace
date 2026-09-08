#!/usr/bin/env node
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {summarize,printSummary,readJson}=require('./scripts/testSummary');
const {coverageTarget}=require('./scripts/coverageTarget');
const root=__dirname,started=Date.now();
const outputDir=path.join(root,'test-results');fs.mkdirSync(outputDir,{recursive:true});
const runDir=path.join(outputDir,'runs',`${started}-${process.pid}`);fs.mkdirSync(runDir,{recursive:true});
const stages=[
    ['Server: validation, controllers, services and MongoDB',['--prefix','server','test']],
    ['Client: source correctness checks',['--prefix','client','run','test:static']],
    ['Client: component interactions and coverage',['--prefix','client','run','test:coverage']],
    ['Client: complete production build',['--prefix','client','run','build']]
];
console.log('\nFlexSpace · Complete project checks\n');
async function runStage(name, args, index) {
    console.log(`\nRUN   ${name}`);
    const start=Date.now();
    const area=name.startsWith('Server:')?'server':'client';
    const reportDir=path.join(runDir,`${area}-coverage`);
    const filename=path.relative(outputDir,path.join(runDir,`${index+1}-${area}.log`));
    const logfile=fs.createWriteStream(path.join(outputDir,filename));
    let output='';
    const child=spawn('npm',args,{cwd:root,env:{...process.env,FORCE_COLOR:'0',FLEXSPACE_COVERAGE_DIR:reportDir},stdio:['inherit','pipe','pipe']});
    const forward=(stream,text)=>{output+=text.toString();logfile.write(text);stream.write(text);};
    child.stdout.on('data',text=>forward(process.stdout,text));
    child.stderr.on('data',text=>forward(process.stderr,text));
    const heartbeat=setInterval(()=>console.log(`  ... ${name} still running · ${Math.floor((Date.now()-start)/1000)}s elapsed`),10000);
    let timedOut=false;
    const timeout=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');},300000);
    let error;
    child.on('error',err=>{error=err;console.error(err.message);});
    const code=await new Promise(resolve=>child.on('close',resolve));
    clearInterval(heartbeat);clearTimeout(timeout);
    await new Promise(resolve=>logfile.end(resolve));
    const passed=code===0&&!error&&!timedOut;
    const result={name,passed,output,seconds:(Date.now()-start)/1000,log:filename};
    if(name.startsWith('Server:')||name.includes('interactions')) {
        result.coverage=readJson(path.join(reportDir,'coverage-summary.json'));
        if(area==='client')result.report=readJson(path.join(reportDir,'test-results.json'));
        else result.execution=readJson(path.join(reportDir,'backend-coverage.json'));
        if(fs.existsSync(reportDir))fs.cpSync(reportDir,path.join(root,area,'coverage'),{recursive:true});
    }
    console.log(`${passed?'PASS':'FAIL'}  ${name} (${result.seconds.toFixed(1)}s)${timedOut?' — timed out':''}`);
    return result;
}
async function main(){
const results=[];
for(const [name,args] of stages)results.push(await runStage(name,args,results.length));
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    if(['node_modules','dist','coverage','.git','tests'].includes(entry.name))return [];
    const file=path.join(dir,entry.name);return entry.isDirectory()?walk(file):/\.(js|jsx)$/.test(file)?[file]:[];
});
const inventory=['client/src','server/app'].flatMap(dir=>walk(path.join(root,dir))).map(file=>({file:path.relative(root,file),empty:fs.statSync(file).size===0}));
fs.writeFileSync(path.join(outputDir,'source-inventory.json'),JSON.stringify(inventory,null,2));
const target=coverageTarget(root,100,{server:results[0].coverage,client:results.find(r=>r.name.includes('interactions')).coverage});
fs.writeFileSync(path.join(outputDir,'coverage-gaps.json'),JSON.stringify(target,null,2));
if(process.argv.includes('--require-full-coverage'))results.push({name:'100% coverage target (client and server)',passed:target.reached,seconds:0,log:'coverage-gaps.json'});
const summary=summarize(root,results);
const seconds=(Date.now()-started)/1000;
const stageResults=results.map(({report,coverage,output,execution,...result})=>result);
fs.writeFileSync(path.join(outputDir,'summary.json'),JSON.stringify({summary,coverageTarget:target.reached,results:stageResults,seconds},null,2));
const failures=results.filter(r=>!r.passed).length;
printSummary(summary,results,seconds);
console.log(`100% COVERAGE TARGET: ${target.reached ? 'REACHED' : 'NOT REACHED — see test-results/coverage-gaps.json'}`);
process.exitCode=failures?1:0;

}
main().catch(error=>{console.error(error);process.exitCode=1;});
