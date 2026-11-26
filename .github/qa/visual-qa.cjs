'use strict';
const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function reset(url){
    await page.goto('http://127.0.0.1:8765/'+url,{waitUntil:'domcontentloaded',timeout:30000});
    await page.evaluate(()=>localStorage.clear());
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.HellFallTest,{timeout:15000});
  }
  // Every check uses real mobile viewport, real game buttons and live physics.
  for(const [name,query,hero,index] of [
    ['starter-boy','?v=nov26-stats25','starter_boy',0],
    ['starter-girl','?v=nov26-stats25','starter_girl',1],
    ['premium-girl','?rig=1&keypose=1&starter=1&workrig=1&v=nov26-stats25','useoi',2]
  ]){
    await reset(query);
    const startStats=await page.evaluate(()=>({
      profile:window.HellSystems.profile,
      catalog:window.HellSystems.CHARACTER_CATALOG,
      items:window.HellSystems.ITEM_CATALOG
    }));
    if(startStats.items.filter(i=>i.kind==='drink').length!==6)throw Error('Missing six stat drinks');
    if(startStats.catalog.length!==4)throw Error('Expected two starters and two original premium actors');
    if(index!==0){
      if(index===2)await page.evaluate(()=>{
        const sys=window.HellSystems;sys.profile.coins=1000;
        const purchased=sys.purchaseCharacter('useoi');
        if(!purchased.ok)throw Error('Premium purchase failed: '+purchased.reason);
      });
      await page.locator('[data-panel="character"]').first().click();
      await page.locator('[data-character-index="'+index+'"]').click();
      await page.locator('#drawerClose').click();
    }
    const selected=await page.evaluate(()=>window.HellFallTest.snapshot().character);
    if(selected!==hero)throw Error('Character selected '+selected+' expected '+hero);
    if(index===0){
      const stocked=await page.evaluate(()=>{
        const sys=window.HellSystems;sys.profile.coins=1000;
        const a=sys.purchase('vitality_5'),b=sys.purchase('calm_10');
        const x=sys.setCharacterSlot('starter_boy',0,'vitality_5');
        const y=sys.setCharacterSlot('starter_boy',1,'calm_10');
        return {a:a.ok,b:b.ok,x,y,coins:sys.profile.coins};
      });
      if(!stocked.a||!stocked.b||!stocked.x||!stocked.y)throw Error('Drink purchase/equip failed '+JSON.stringify(stocked));
    }
    await page.locator('#start').click();await page.waitForTimeout(320);
    const before=await page.evaluate(()=>window.HellFallTest.snapshot());
    if(before.stage!=='PLAYING')throw Error('Game did not launch '+JSON.stringify(before.stage));
    if(before.character!==hero)throw Error('Run hero mismatch');
    const rig=await page.evaluate(()=>({
      workRig:!!window.HellWorkRig,keypose:!!window.HellKeypose,
      starterKit:!!window.HellStarterKit,rigV2:!!window.HellRigV2,
      links:document.querySelectorAll('#keyposeGameEntry,#starterOutfitEntry,.work-rig-entry').length
    }));
    if(Object.values(rig).some(Boolean))throw Error('Deprecated Work renderer still present '+JSON.stringify(rig));
    if(index===0){
      await page.locator('#quickItem0').tap();await page.locator('#quickItem1').tap();
      const active=await page.evaluate(()=>window.HellFallTest.snapshot());
      if(active.stats.speed!==75||active.stats.brake!==80)throw Error('Drinks did not stack independently '+JSON.stringify(active.stats));
      if(active.drinks.speed.left<=0||active.drinks.brake.left<=0)throw Error('Drink timers missing');
      if(active.profile.consumables.vitality_5!==0||active.profile.consumables.calm_10!==0)throw Error('Drink consumption not persistent');
      console.log('QADRINKS='+JSON.stringify({stats:active.stats,drink:active.drinks,consumed:true}));
    }
    if(index===2 && (before.stats.speed!==73||before.stats.brake!==72))throw Error('Premium stats wrong '+JSON.stringify(before.stats));
    const shot='qa-shot-'+name+'.jpg';
    await page.screenshot({path:shot,type:'jpeg',quality:50});
    console.log('QAINFO_'+name.toUpperCase().replace(/-/g,'_')+'='+JSON.stringify({
      stage:before.stage,hero:before.character,stats:before.stats,starter:index<2,rig
    }));
    console.log('QAIMAGE_'+name.toUpperCase().replace(/-/g,'_')+'='+fs.readFileSync(shot).toString('base64'));
    await page.locator('#jump').tap();await page.waitForTimeout(120);
    const hop=await page.evaluate(()=>window.HellFallTest.snapshot().hopVisual);
    if(!(hop<1))throw Error('Wall jump not triggered '+hop);
  }
  await reset('?v=nov26-stats25');
  const fresh=await page.evaluate(()=>window.HellSystems.selectCharacter('useoi'));
  if(fresh!==false)throw Error('Premium hero accessible without purchase');
  // Old versions shipped two free original heroes: do not remove them from
  // existing accounts after migration.
  await page.evaluate(()=>{
    localStorage.setItem('hell_fall_profile_v1',JSON.stringify({
      selectedCharacter:'useoi',coins:42,runs:4,totalDepth:5000,
      inventory:['helmet_basic'],
      wardrobes:{useoi:{quickSlots:[null,null],gear:{helmet:'helmet_basic'}}}
    }));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  const migrated=await page.evaluate(()=>({
    owned:window.HellSystems.profile.ownedCharacters,
    selected:window.HellSystems.profile.selectedCharacter,
    helmet:window.HellSystems.wardrobeOf('useoi').gear.helmet,
    coins:window.HellSystems.profile.coins
  }));
  if(migrated.selected!=='useoi'||!migrated.owned.includes('useoi')||!migrated.owned.includes('uiji')||migrated.helmet!=='helmet_basic'||migrated.coins!==42)
    throw Error('Old saved account migration failed '+JSON.stringify(migrated));
  console.log('QAMIGRATION='+JSON.stringify(migrated));
  if(errors.length)throw Error('Browser JS errors: '+JSON.stringify(errors.slice(0,12)));
  await browser.close();console.log('QA_PASS_STAT_DRINK_STARTER');
})().catch(e=>{console.error(e);process.exit(1)});