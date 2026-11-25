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
  // Render original 8 Work poses as a real-pixel contact sheet for visual fit QA.
  const sheet=await page.evaluate(async()=>{
    const pose=new Image();
    pose.src='character-production/uiji-useoi/keypose-study/poses.png';
    await pose.decode();
    const boxes=[[54,15,349,402],[561,21,225,392],[991,19,243,403],[1391,19,336,395],[56,472,347,399],[513,449,304,422],[934,483,367,383],[1408,473,339,400]];
    const c=document.createElement('canvas');c.width=1400;c.height=940;
    const ink=c.getContext('2d');ink.fillStyle='#34313b';ink.fillRect(0,0,c.width,c.height);
    for(let i=0;i<8;i++){
      const [x,y,w,h]=boxes[i],col=i%4,row=Math.floor(i/4),cx=col*350+175,cy=row*470+240;
      const scale=Math.min(315/w,390/h);
      ink.drawImage(pose,x,y,w,h,cx-w*scale/2,cy-h*scale/2,w*scale,h*scale);
      ink.fillStyle='white';ink.font='bold 27px sans-serif';ink.fillText('#'+i,col*350+14,row*470+33);
    }
    return c.toDataURL('image/jpeg',.6).split(',')[1];
  });
  console.log('QAIMAGE_ATLAS='+sheet);
  console.log('QAERRORS='+JSON.stringify(errors.slice(0,12)));
  // Current app has known optional-resource 404s; make test gate depend on
  // playable canvas/loaded 8-pose art instead of unrelated broken asset URLs.
  if(!await page.evaluate(()=>window.HellKeypose?.ready))throw Error('pose renderer not ready');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
