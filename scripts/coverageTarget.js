const fs=require('node:fs');
const path=require('node:path');
const metrics=['lines','branches','functions','statements'];
function coverageTarget(root,target=100,reports){
    const areas=['server','client'].map(area=>{
        let report;
        if(reports)report=reports[area];
        else try{report=JSON.parse(fs.readFileSync(path.join(root,area,'coverage/coverage-summary.json'),'utf8'));}catch{}
        return {area,target,reached:Boolean(report)&&metrics.every(metric=>report.total[metric].pct>=target),
            metrics:report?Object.fromEntries(metrics.map(metric=>[metric,report.total[metric].pct])):null,
            gaps:report?Object.entries(report).filter(([file])=>file!=='total').filter(([,counts])=>metrics.some(metric=>counts[metric].pct<target)).map(([file,counts])=>({file:path.relative(root,file),...Object.fromEntries(metrics.map(metric=>[metric,counts[metric].pct]))})):[]};
    });
    return {target,reached:areas.every(area=>area.reached),areas};
}
module.exports={coverageTarget};
