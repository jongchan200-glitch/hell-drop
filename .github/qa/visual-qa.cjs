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
    ['starter-boy','?v=nov27-clean31','starter_boy',0],
    ['starter-girl','?v=nov27-clean31','starter_girl',1],
    ['premium-girl','?rig=1&keypose=1&starter=1&workrig=1&v=nov27-clean31','useoi',2],
    ['premium-boy','?v=nov27-clean31','uiji',3]
  ]){
    await reset(query);
    await page.locator('[data-initial-actor="'+((index===0||index===3)?'uiji':'useoi')+'"]').click();
    const startStats=await page.evaluate(()=>({
      profile:window.HellSystems.profile,
      catalog:window.HellSystems.CHARACTER_CATALOG,
      items:window.HellSystems.ITEM_CATALOG
    }));
    if(startStats.items.filter(i=>i.kind==='drink').length!==6)throw Error('Missing six stat drinks');
    if(startStats.catalog.length!==4||startStats.profile.coins!==1000)throw Error('Expected four skins and exact test grant');
    if(index===0||index===1){
      await page.waitForFunction(()=>{const i=document.getElementById('lobbyHero');return i?.src.includes('starter_')&&!i.hidden&&i.naturalWidth>100},{timeout:15000});
      const pre=await page.evaluate(()=>({
        home:/\/assets\/starter_(boy|girl)_portrait_v29\.webp/.test(document.getElementById('homeAvatar').src),
        showcase:/\/assets\/starter_(boy|girl)_portrait_v29\.webp/.test(document.querySelector('.turnaround-pose.is-selected')?.src||''),
        stats:document.querySelector('#lobbyTraits')?.textContent,
        assetReady:document.querySelectorAll('#lobbyCharacter img').length===1&&document.querySelectorAll('#lobbyCharacter canvas').length===0
      }));
      if(!pre.home||!pre.showcase||!pre.assetReady)throw Error('Starter lobby illustration not replaced '+JSON.stringify(pre));
      if(index===0){
        await page.screenshot({path:'qa-shot-starter-home.jpg',type:'jpeg',quality:65});
        console.log('QAIMAGE_STARTER_HOME='+fs.readFileSync('qa-shot-starter-home.jpg').toString('base64'));
        await page.locator('[data-panel="character"]').first().click();
        await page.waitForFunction(()=>[...document.querySelectorAll('.starter-pick-card [data-starter-face]')].every(i=>i.src.includes('_portrait_v29.webp')&&i.naturalWidth>100),{timeout:15000});
        const chooser=await page.evaluate(()=>({
          count:document.querySelectorAll('.starter-pick-card').length,
          transformed:document.querySelectorAll('.starter-pick-card img[src*="_portrait_v29.webp"]').length,
          starter:document.querySelector('[data-starter-face="starter_boy"]')?.src.includes('/assets/starter_boy_portrait_v29.webp')
        }));
        if(chooser.count!==2||chooser.transformed!==1||!chooser.starter)throw Error('Character cards visually stale '+JSON.stringify(chooser));
        await page.screenshot({path:'qa-shot-starter-choice.jpg',type:'jpeg',quality:65});
        console.log('QAIMAGE_STARTER_CHOICE='+fs.readFileSync('qa-shot-starter-choice.jpg').toString('base64'));
        await page.locator('#drawerClose').click();
      }
    }
    if(index>=2){
      await page.locator('[data-panel="character"]').first().click();
      await page.locator('[data-character-pick="'+hero+'"]').click();
      await page.locator('[data-market-buy-character="'+hero+'"]').click();
      await page.locator('[data-market-equip-skin="'+hero+'"]').click();
      await page.locator('#drawerClose').click();
    }
    if(index===2){
      await page.waitForFunction(()=>document.querySelector('#lobbyHero')?.src.endsWith('/hero_intro.webp')&&!document.querySelector('#lobbyHero').hidden);
      await page.locator('#lobbyCharacter').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(()=>document.querySelector('#lobbyHero')?.src.endsWith('/hero_back_fixed.webp')&&!document.querySelector('#lobbyHero').hidden);
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(()=>document.querySelector('#lobbyHero')?.src.endsWith('/hero_intro.webp')&&!document.querySelector('#lobbyHero').hidden);
    }
    const selected=await page.evaluate(()=>window.HellFallTest.snapshot().character);
    if(selected!==hero)throw Error('Character selected '+selected+' expected '+hero);
    if(index===0){
      const stocked=await page.evaluate(()=>{
        const sys=window.HellSystems;
        const a=sys.purchase('vitality_5'),b=sys.purchase('calm_10');
        const x=sys.setCharacterSlot('starter_boy',0,'vitality_5');
        const y=sys.setCharacterSlot('starter_boy',1,'calm_10');
        return {a:a.ok,b:b.ok,x,y,coins:sys.profile.coins};
      });
      if(!stocked.a||!stocked.b||!stocked.x||!stocked.y)throw Error('Drink purchase/equip failed '+JSON.stringify(stocked));
    }
    if(index<2){
      await page.waitForFunction(
        actor=>window.HellStarterPoses?.ready?.(actor),
        index===0?'uiji':'useoi',{timeout:12000}
      );
      const art=await page.evaluate(()=>window.HellStarterPoses?.status());
      if(!(await page.evaluate(()=>window.HellStarterPoses?.usesWholeBodyArt)))throw Error('Rejected vector body renderer still active');
      if(!art?.ready?.[index===0?'uiji':'useoi'])throw Error('Missing complete-body approved art '+JSON.stringify(art));
      console.log('QAART_'+name.toUpperCase().replace(/-/g,'_')+'='+JSON.stringify(art));
    }
    await page.locator('#start').click();await page.waitForTimeout(320);
    const before=await page.evaluate(()=>window.HellFallTest.snapshot());
    if(before.stage!=='PLAYING')throw Error('Game did not launch '+JSON.stringify(before.stage));
    if(before.character!==hero)throw Error('Run hero mismatch');
    if(index===0){
      await page.evaluate(()=>window.HellPlatform.setNativePaused(true));
      const paused=await page.evaluate(()=>window.HellFallTest.snapshot().depth);
      await page.waitForTimeout(250);
      const still=await page.evaluate(()=>window.HellFallTest.snapshot().depth);
      if(paused!==still)throw Error('Native pause advanced physics');
      await page.evaluate(()=>window.HellPlatform.setNativePaused(false));
    }
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
    if(index>=2 && (before.stats.speed!==73||before.stats.brake!==72))throw Error('Premium stats wrong '+JSON.stringify(before.stats));
    if(index<2){
      await page.screenshot({path:'qa-shot-'+name+'-glide.jpg',type:'jpeg',quality:60});
      console.log('QAIMAGE_GLIDE_'+name.toUpperCase().replace(/-/g,'_')+'='+fs.readFileSync('qa-shot-'+name+'-glide.jpg').toString('base64'));
      // Real browser thumb events: five successive taps must accelerate,
      // followed by two distinct wall hops. Previous QA only tested one hop.
      const initial=await page.evaluate(()=>window.HellFallTest.snapshot());
      for(let n=0;n<5;n++){
        await page.locator('#boost').tap();
        await page.waitForTimeout(160);
      }
      const boosted=await page.evaluate(()=>window.HellFallTest.snapshot());
      if(boosted.tapCount-initial.tapCount<5)throw Error('Galaxy acceleration button dropped taps '+JSON.stringify({before:initial.tapCount,after:boosted.tapCount}));
      if(boosted.boost<.08)throw Error('Rapid thumb tapping did not accelerate '+JSON.stringify({boost:boosted.boost,speed:boosted.speed}));
      if(boosted.poseFrames<1)throw Error('Starter action atlas was not drawn');
      const anim=await page.evaluate(()=>window.HellStarterPoses.status());
      if(anim.lastPose!=='fast')throw Error('After acceleration the complete-body fast pose did not appear '+JSON.stringify(anim));
      console.log('QATOUCH_'+name.toUpperCase().replace(/-/g,'_')+'='+JSON.stringify({
        taps:boosted.tapCount,boost:boosted.boost,speed:boosted.speed,frames:boosted.poseFrames
      }));
      await page.screenshot({path:'qa-shot-'+name+'-boost.jpg',quality:55,type:'jpeg'});
      console.log('QAIMAGE_BOOST_'+name.toUpperCase().replace(/-/g,'_')+'='+fs.readFileSync('qa-shot-'+name+'-boost.jpg').toString('base64'));
    }
    const shot='qa-shot-'+name+'.jpg';
    await page.screenshot({path:shot,type:'jpeg',quality:50});
    console.log('QAINFO_'+name.toUpperCase().replace(/-/g,'_')+'='+JSON.stringify({
      stage:before.stage,hero:before.character,stats:before.stats,starter:index<2,rig
    }));
    console.log('QAIMAGE_'+name.toUpperCase().replace(/-/g,'_')+'='+fs.readFileSync(shot).toString('base64'));
    // Start a separate fresh run for jump testing, before the first obstacle.
    // The accelerated screenshot sequence may already reach collision depth.
    await page.evaluate(()=>window.HellFallTest.start());
    await page.waitForTimeout(150);
    const jumpStart=await page.evaluate(()=>window.HellFallTest.snapshot());
    if(jumpStart.stage!=='PLAYING'||jumpStart.depth>100)throw Error('Wall jump test did not start in safe zone '+JSON.stringify(jumpStart));
    const priorWall=jumpStart.wall;
    await page.locator('#jump').tap();await page.waitForTimeout(120);
    if(index<2){
      const anim=await page.evaluate(()=>window.HellStarterPoses.status());
      if(anim.lastPose!=='kick')throw Error('Complete-body wall-kick pose did not appear '+JSON.stringify({anim,snapshot:await page.evaluate(()=>window.HellFallTest.snapshot())}));
    }
    const firstHop=await page.evaluate(()=>window.HellFallTest.snapshot());
    if(!(firstHop.hopVisual<1)||firstHop.wall===priorWall)
      throw Error('Wall jump did not respond to mobile touch '+JSON.stringify(firstHop));
    await page.screenshot({path:'qa-shot-'+name+'-kick.jpg',type:'jpeg',quality:55});
    console.log('QAIMAGE_KICK_'+name.toUpperCase().replace(/-/g,'_')+'='+fs.readFileSync('qa-shot-'+name+'-kick.jpg').toString('base64'));
    await page.waitForTimeout(360);
    // Second distinct touch returns to the original wall; tap fallback must
    // never synthesize a double jump on the first press.
    if((await page.evaluate(()=>window.HellFallTest.snapshot().stage))==='PLAYING'){
      await page.locator('#jump').tap();await page.waitForTimeout(100);
      const second=await page.evaluate(()=>window.HellFallTest.snapshot());
      if(second.wall!==priorWall||second.hopVisual>=1)
        throw Error('Second wall hop failed '+JSON.stringify(second));
      console.log('QADOUBLE_KICK_'+name.toUpperCase().replace(/-/g,'_')+'='+JSON.stringify({first:firstHop.wall,returned:second.wall}));
    }
  }
  // Actual UI purchase test, same shared test wallet across both actors.
  await reset('?v=nov27-clean31');
  await page.screenshot({path:'qa-shot-actor-onboarding.jpg',type:'jpeg',quality:65});
  console.log('QAIMAGE_ACTOR_ONBOARDING='+fs.readFileSync('qa-shot-actor-onboarding.jpg').toString('base64'));
  await page.locator('[data-initial-actor="uiji"]').click();
  if(await page.evaluate(()=>window.HellSystems.equipSkin('uiji')))throw Error('Unowned skin equipped');
  async function buyAndEquip(id){
    await page.locator('[data-character-pick="'+id+'"]').click();
    await page.locator('[data-market-buy-character="'+id+'"]').click();
    await page.locator('[data-market-equip-skin="'+id+'"]').click();
    await page.locator('#drawerClose').click();
  }
  await page.locator('[data-panel="character"]').first().click();
  await buyAndEquip('uiji');
  let p=await page.evaluate(()=>window.HellSystems.profile);
  if(p.coins!==900||p.selectedCharacter!=='uiji'||p.accountActor!=='uiji')throw Error('Male purchase failed '+JSON.stringify(p));
  await page.locator('[data-panel="character"]').first().click();
  await page.locator('[data-test-actor="useoi"]').click();
  await buyAndEquip('useoi');
  p=await page.evaluate(()=>window.HellSystems.profile);
  if(p.coins!==800||p.selectedCharacter!=='useoi'||p.accountActor!=='uiji')throw Error('Female purchase/shared wallet failed');
  await page.locator('[data-panel="character"]').first().click();
  await page.locator('[data-test-actor="uiji"]').click();
  await page.locator('[data-character-pick="starter_boy"]').click();
  await page.locator('[data-character-pick="uiji"]').click();
  await page.locator('#drawerClose').click();
  await page.locator('[data-panel="shop"]').first().click();
  await page.locator('[data-market-group="bubble"]').click();
  await page.locator('[data-market-item="bubble_10"]').click();
  await page.locator('[data-market-buy="bubble_10"]').click();
  await page.screenshot({path:'qa-shot-skin-wallet.jpg',type:'jpeg',quality:65});
  console.log('QAIMAGE_SKIN_WALLET='+fs.readFileSync('qa-shot-skin-wallet.jpg').toString('base64'));
  p=await page.evaluate(()=>window.HellSystems.profile);
  if(p.coins!==780||p.consumables.bubble_10!==1)throw Error('Item deduction mismatch');
  const duplicate=await page.evaluate(()=>window.HellSystems.purchaseSkin('uiji'));
  if(duplicate.ok)throw Error('Duplicate skin purchase');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.HellFallTest);
  p=await page.evaluate(()=>window.HellSystems.profile);
  if(p.coins!==780||p.selectedCharacter!=='uiji'||p.accountActor!=='uiji'||p.equippedSkins.useoi!=='useoi'||p.ownedSkins.length!==4||p.consumables.bubble_10!==1)throw Error('Persistent wallet/skins/actor failed '+JSON.stringify(p));
  console.log('QAWALLET='+JSON.stringify({coins:p.coins,owned:p.ownedSkins,active:p.activeActor,equipped:p.equippedSkins,bubble:p.consumables.bubble_10}));
  await page.evaluate(()=>{localStorage.clear();localStorage.setItem('hell_fall_profile_v1',JSON.stringify({selectedCharacter:'useoi',coins:42,runs:4,totalDepth:5000,inventory:['helmet_basic'],wardrobes:{useoi:{quickSlots:[null,null],gear:{helmet:'helmet_basic'}}}}));});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-initial-actor="useoi"]').click();
  const migrated=await page.evaluate(()=>({p:window.HellSystems.profile,old:JSON.parse(localStorage.getItem('hell_fall_profile_v1')),helmet:window.HellSystems.wardrobeOf('starter_girl').gear.helmet}));
  if(migrated.p.coins!==1000||migrated.p.selectedCharacter!=='starter_girl'||migrated.p.ownedSkins.length!==2||migrated.p.runs!==4||migrated.p.totalDepth!==5000||migrated.helmet!=='helmet_basic'||migrated.old.coins!==42)throw Error('Legacy migration failed '+JSON.stringify(migrated));
  console.log('QAMIGRATION_TEST='+JSON.stringify({coins:migrated.p.coins,legacyCoins:migrated.old.coins,runs:migrated.p.runs,helmet:migrated.helmet}));
  // Throttled portrait requests plus rapid actor switches: the last selected actor wins.
  await page.route('**/assets/starter_*_portrait_v29.webp',async route=>{await new Promise(r=>setTimeout(r,route.request().url().includes('boy')?450:80));await route.continue();});
  await page.locator('[data-panel="character"]').first().click();
  await page.locator('[data-test-actor="uiji"]').click();
  await page.locator('[data-test-actor="useoi"]').click();
  await page.locator('#drawerClose').click();
  await page.waitForFunction(()=>{const i=document.querySelector('#lobbyHero');return i.src.endsWith('starter_girl_portrait_v29.webp')&&!i.hidden&&i.naturalWidth>0;});
  await page.waitForTimeout(600);
  const portrait=await page.evaluate(()=>({src:document.querySelector('#lobbyHero').src,count:document.querySelectorAll('#lobbyCharacter img').length,canvases:document.querySelectorAll('#lobbyCharacter canvas').length}));
  if(portrait.count!==1||portrait.canvases!==0||!portrait.src.endsWith('starter_girl_portrait_v29.webp'))throw Error('Portrait overlap or stale image '+JSON.stringify(portrait));
  console.log('QAPORTRAIT='+JSON.stringify(portrait));
  if(errors.length)throw Error('Browser JS errors: '+JSON.stringify(errors.slice(0,12)));
  await browser.close();console.log('QA_PASS_STAT_DRINK_STARTER');
})().catch(e=>{console.error(e);process.exit(1)});