'use strict';
const {chromium} = require('playwright');
const fs=require('fs');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  for(const [name,query] of [['base','?rig=0&keypose=1'],['starter','?rig=0&keypose=1&starter=1']]){
    await page.goto('http://127.0.0.1:8765/'+query,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction('window.HellKeypose?.ready',{timeout:20000});
    await page.locator('#start').click();
    await page.waitForTimeout(350);
    const info=await page.evaluate(()=>({
      stage:window.HellFallTest?.snapshot()?.stage,
      keypose:window.HellKeypose?.ready,
      starter:!!window.HellStarterKit,
      kitLabels:document.querySelectorAll('#starterGearPanel label').length,
      canvas:document.querySelector('canvas#scene')?.getBoundingClientRect().toJSON()
    }));
    const shot='qa-shot-'+name+'.jpg';
    await page.screenshot({path:shot,quality:50,type:'jpeg'});
    console.log('QAINFO_'+name.toUpperCase()+'='+JSON.stringify(info));
    console.log('QAIMAGE_'+name.toUpperCase()+'='+fs.readFileSync(shot).toString('base64'));
    if(name==='starter'){
      const before=await page.evaluate(()=>window.HellStarterKit?.revision);
      await page.locator('#starterGearPanel button').click();
      const checks=page.locator('#starterGearPanel input[type=checkbox]');
      await checks.first().uncheck();
      const after=await page.evaluate(()=>window.HellStarterKit?.revision);
      if(after!==before+1)throw Error('Gear toggle failed');
      await page.screenshot({path:'qa-shot-starter-toggle.jpg',quality:50,type:'jpeg'});
      console.log('QAINFO_TOGGLE='+JSON.stringify({before,after,checkboxes:await checks.count()}));
    }
  }
  if(errors.length)throw Error('Browser errors: '+JSON.stringify(errors.slice(0,8)));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
