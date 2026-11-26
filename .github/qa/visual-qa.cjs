'use strict';
const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Validate plain launch as well as old bookmarked trial query: neither may
  // load deprecated skeletal, key-pose or starter outfit rendering.
  for(const [name,query,hero] of [
    ['original-girl','?v=nov26-original-2d','useoi'],
    ['old-test-link-safe','?rig=1&keypose=1&starter=1&workrig=1&v=nov26-original-2d','uiji']
  ]){
    await page.goto('http://127.0.0.1:8765/'+query,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>!!window.HellFallTest,{timeout:15000});
    if(hero==='uiji'){
      await page.locator('[data-panel="character"]').first().click();
      await page.locator('[data-character-index="1"]').click();
      await page.waitForTimeout(180);
      await page.locator('#drawerClose').click().catch(async()=>{await page.keyboard.press('Escape')});
    }
    const profile=await page.evaluate(()=>window.HellFallTest.snapshot().character);
    if(profile!==hero)throw Error('Selected wrong 2D character: '+profile+' expected '+hero);
    await page.locator('#start').click();
    await page.waitForTimeout(350);
    const check=await page.evaluate(()=>({
      stage:window.HellFallTest.snapshot().stage,
      hero:window.HellFallTest.snapshot().character,
      workRigLoaded:!!window.HellWorkRig,
      keyposeLoaded:!!window.HellKeypose,
      starterLoaded:!!window.HellStarterKit,
      v3Loaded:!!window.HellRigV2,
      experimentalLinks:document.querySelectorAll('#keyposeGameEntry,#starterOutfitEntry,.work-rig-entry').length,
      scene:document.querySelector('#scene')?.getBoundingClientRect().toJSON()
    }));
    if(check.stage!=='PLAYING')throw Error('Game not playing: '+JSON.stringify(check));
    if(check.workRigLoaded||check.keyposeLoaded||check.starterLoaded||check.v3Loaded||check.experimentalLinks)throw Error('Trial renderer still loaded: '+JSON.stringify(check));
    const shot='qa-shot-'+name+'.jpg';
    await page.screenshot({path:shot,quality:55,type:'jpeg'});
    console.log('QAINFO_'+name.toUpperCase().replace(/-/g,'_')+'='+JSON.stringify(check));
    console.log('QAIMAGE_'+name.toUpperCase().replace(/-/g,'_')+'='+fs.readFileSync(shot).toString('base64'));
    await page.locator('#jump').tap();
    await page.waitForTimeout(130);
    const hop=await page.evaluate(()=>({hopVisual:window.HellFallTest.snapshot().hopVisual,stage:window.HellFallTest.snapshot().stage}));
    if(!(hop.hopVisual<1))throw Error('Wall jump not triggered '+JSON.stringify(hop));
    await page.screenshot({path:'qa-shot-'+name+'-kick.jpg',quality:55,type:'jpeg'});
    console.log('QAINFO_KICK_'+name.toUpperCase().replace(/-/g,'_')+'='+JSON.stringify(hop));
  }
  if(errors.length)throw Error('Browser errors: '+JSON.stringify(errors.slice(0,6)));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
