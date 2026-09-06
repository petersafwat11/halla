const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
  const runs = [];
  try {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
      await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      await page.addInitScript(() => {
        window.lab = {lcp:null,cls:0,longTaskMs:0};
        new PerformanceObserver(list=>{for(const e of list.getEntries()) {window.lab.lcp=e.startTime;window.lab.lcpElement=e.element?.tagName;}}).observe({type:'largest-contentful-paint',buffered:true});
        let start=0,last=0,score=0;
        new PerformanceObserver(list=>{for(const e of list.getEntries()) if(!e.hadRecentInput){if(e.startTime-last>1000||e.startTime-start>5000){start=e.startTime;score=0;}score+=e.value;last=e.startTime;window.lab.cls=Math.max(window.lab.cls,score);}}).observe({type:'layout-shift',buffered:true});
        new PerformanceObserver(list=>{for(const e of list.getEntries())window.lab.longTaskMs+=Math.max(0,e.duration-50);}).observe({type:'longtask',buffered:true});
      });
      await page.goto(`${process.env.BASE_URL||'http://localhost:3100'}/en`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);
      runs.push({run,...await page.evaluate(()=>window.lab)});
      await context.close();
    }
  } finally {await browser.close();}
  const median = key => runs.map(r=>r[key]).sort((a,b)=>a-b)[1];
  const result={conditions:'Chrome headless, 390x844, cold browser cache, 150ms latency, 1.6Mbps download, CPU 4x; local production server; no field INP claim',runs,median:{lcp:runs.every(r=>r.lcp>0)?median('lcp'):null,cls:median('cls'),longTaskMs:median('longTaskMs')}};
  const output=path.join(os.tmpdir(),`halaa-lab-${process.env.AUDIT_LABEL||'current'}.json`);
  fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(output,JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1});
