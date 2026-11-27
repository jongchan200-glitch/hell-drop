'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('fs');
const B=require('../../balance.js');
const profiles=[
 ['basic_lines',{clockRate:0}],['basic_half',{clockRate:.5}],['basic_all',{}],
 ['explorer',{speed:73}],['wing_dragon',{speed:78}],
 ['wing_dragon_vitality',{speed:88}],['no_pet',{speed:86,timeBonus:15}],
 ['mid_time',{speed:88,timeBonus:10}],['max',{speed:88,timeBonus:15}]
];
const balance=Object.fromEntries(profiles.map(([k,p])=>[k,B.simulateIdeal(p)]));
console.log('QABALANCE='+JSON.stringify(balance));
assert(balance.basic_lines.depth>=21000&&balance.basic_lines.depth<28500);
assert(balance.basic_all.depth<28500&&balance.basic_all.depth>balance.basic_half.depth);
assert(balance.wing_dragon.depth>=28500&&balance.wing_dragon.depth<36500);
assert(balance.wing_dragon_vitality.depth>=36500&&!balance.wing_dragon_vitality.won);
assert(!balance.no_pet.won&&!balance.mid_time.won);
assert(balance.max.won&&balance.max.seconds>=300&&balance.max.seconds<=420&&balance.max.remaining>0);
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const snap=()=>page.evaluate(()=>window.HellFallTest.snapshot());
 const prof=()=>page.evaluate(()=>window.HellSystems.profile);
 const click=async s=>{await page.locator(s).first().click()};
 const shot=async n=>{await page.screenshot({path:'qa-shot-'+n+'.jpg',type:'jpeg',quality:65});console.log('QAIMAGE_'+n.toUpperCase().replace(/-/g,'_')+'='+fs.readFileSync('qa-shot-'+n+'.jpg').toString('base64'))};
 async function reset(actor='uiji'){
   await page.goto('http://127.0.0.1:8765/?v=nov27-coco34',{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.HellFallTest,{timeout:15000});
   await click('[data-initial-actor="'+actor+'"]');
   await page.waitForFunction(()=>!document.querySelector('#lobbyHero').hidden&&document.querySelector('#lobbyHero').naturalWidth>0);
   // QA-only deterministic world; early obstacle walls are opposite the starting lane.
   await page.evaluate(seed=>{Math.random=()=>((seed+.1)/1e9);},2);
 }
 async function shop(tab){await click('[data-panel="shop"]');await click('[data-market-tab="'+tab+'"]')}
 async function buySkin(id){
   await shop('skins');
   assert.equal(await page.locator('[data-market-character]').count(),2);
   assert.equal(await page.locator('[data-market-character] img').count(),0);
   await click('[data-market-character="'+id+'"]');
   assert.equal(await page.locator('.market-large-art img').count(),0);
   await click('[data-market-buy-character="'+id+'"]');
   await click('#drawerClose');
   await click('[data-panel="character"]');await click('[data-wardrobe-tab="skins"]');
   assert.equal(await page.locator('[data-character-pick]').count(),2);
   await click('[data-character-pick="'+id+'"]');await click('#drawerClose');
 }
 async function tapBoost(times=5){
   for(let i=0;i<times;i++){await page.locator('#boost').tap();await page.waitForTimeout(115)}
 }
 for(const [actor,id,stat] of [['uiji','starter_boy',70],['useoi','starter_girl',70],['uiji','uiji',73],['useoi','useoi',73],['uiji','wingsuit_boy',76],['useoi','wingsuit_girl',76]]){
   await reset(actor);
   const p0=await prof();assert.equal(p0.coins,1000);assert.equal(p0.slotCount,2);assert.equal(p0.ownedSkins.length,2);
   if(id.startsWith('starter')){
     await click('[data-panel="character"]');
     assert.equal(await page.locator('[data-character-pick]').count(),1);
     assert.equal(await page.locator('[data-character-pick] img').count(),0);
     if(actor==='uiji')await shot('owned-starter');
     await click('#drawerClose');
   }else{
     await buySkin(id);
     assert.equal((await prof()).selectedCharacter,id);
   }
   if(id==='useoi'){
     await page.waitForFunction(()=>document.querySelector('#lobbyHero').src.endsWith('hero_intro.webp')&&!document.querySelector('#lobbyHero').hidden);
     await page.locator('#lobbyCharacter').focus();await page.keyboard.press('ArrowRight');
     await page.waitForFunction(()=>document.querySelector('#lobbyHero').src.endsWith('hero_back_fixed.webp')&&!document.querySelector('#lobbyHero').hidden);
     await page.keyboard.press('ArrowLeft');
   }
   if(id==='wingsuit_boy'){
     await click('[data-panel="character"]');await click('[data-preview-motion]');
     await page.waitForFunction(()=>!!document.querySelector('[data-preview-canvas]'));
     await shot('motion-preview');await click('#drawerClose');
   }
   await click('#start');await page.waitForTimeout(250);
   const before=await snap();assert.equal(before.stage,'PLAYING');assert.equal(before.character,id);assert.equal(before.stats.speed,stat);
   assert.equal(await page.locator('#controls button').count(),2);
   assert.equal(await page.locator('#controls .item-quickbar').count(),0);
   assert.equal(before.displayDepth,Math.floor(before.depth/10));
   const hud=await page.locator('#depthLabel').textContent();
   assert(hud.endsWith('m'));
   // Exercise two wall hops before accelerating into the first randomized hazard.
   await page.locator('#jump').tap();await page.waitForTimeout(180);
   const jumped=await snap();assert.equal(jumped.wall,'R');
   await page.locator('#jump').tap();await page.waitForTimeout(180);
   const returned=await snap();assert.equal(returned.wall,'L');
   await tapBoost(5);
   const boosted=await snap();
   assert(boosted.tapCount>=5&&boosted.speed>before.speed&&boosted.stage==='PLAYING','boost '+id+' '+JSON.stringify(boosted));
   if(id.startsWith('starter')||id.startsWith('wingsuit'))assert.equal(await page.evaluate(()=>window.HellStarterPoses.status().lastHero),id);
   console.log('QASKIN_'+id+'='+JSON.stringify({speed:boosted.stats.speed,taps:boosted.tapCount,wall:returned.wall,displayDepth:boosted.displayDepth}));
   if(id.startsWith('wingsuit'))await shot('play-'+id);
 }
 // Real UI shopping, preparation, consumption, dragon and save.
 await reset('uiji');
 await shop('skins');await shot('skin-shop');await click('[data-market-character="wingsuit_boy"]');await shot('skin-detail');
 await click('[data-market-close]');await click('#drawerClose');
 await shop('pets');await click('[data-market-item="baby_dragon"]');await shot('pet-shop');await click('[data-market-buy-pet="baby_dragon"]');await click('#drawerClose');
 await click('[data-panel="character"]');await click('[data-wardrobe-tab="pets"]');await click('[data-equip-pet="baby_dragon"]');
 assert.equal((await prof()).equippedPets.uiji,'baby_dragon');await shot('pet-equipped');await click('#drawerClose');
 await page.waitForFunction(()=>!document.querySelector('#homePet').classList.contains('hidden'));
 // Start with two of each: a single selected unit is consumed, not the remaining stock.
 await shop('items');await click('[data-market-group="drink"]');await click('[data-market-item="time_15"]');await click('[data-market-buy="time_15"]');
 await click('[data-market-item="time_15"]');await click('[data-market-buy="time_15"]');
 await click('[data-market-item="vitality_5"]');await click('[data-market-buy="vitality_5"]');
 await click('[data-market-item="vitality_5"]');await click('[data-market-buy="vitality_5"]');await click('#drawerClose');
 assert.equal((await prof()).consumables.time_15,2);
 await click('#homePrepSlots [data-prep-slot="0"]');await shot('slot-picker');
 await click('[data-loadout-item="time_15"]');assert.equal((await prof()).consumables.time_15,2);
 await click('#homePrepSlots [data-prep-slot="0"]');assert.equal((await prof()).wardrobes.uiji.quickSlots[0],null);assert.equal((await prof()).consumables.time_15,2);
 await click('#homePrepSlots [data-prep-slot="0"]');await click('[data-loadout-item="time_15"]');
 await click('#homePrepSlots [data-prep-slot="1"]');await click('[data-loadout-item="vitality_5"]');
 assert.equal((await prof()).consumables.vitality_5,2);
 await shot('home-prepared');
 await click('#start');await page.waitForTimeout(250);let run=await snap();
 assert.equal(run.pet,'baby_dragon');assert.equal(run.stats.speed,77);assert.equal(run.stats.timeBonus,15);
 assert.equal(run.profile.consumables.time_15,1);assert.equal(run.profile.consumables.vitality_5,1);
 assert(run.profile.wardrobes.uiji.quickSlots.every(x=>x===null));assert.equal(run.runItems.length,2);assert(Number.isFinite(run.petX));
 const a=await snap();await page.locator('#jump').tap();await page.waitForTimeout(200);const shifted=await snap();assert.notEqual(a.petX,shifted.petX);await page.locator('#jump').tap();await page.waitForTimeout(180);await tapBoost();const b=await snap();assert.equal(b.stage,'PLAYING');
 assert.equal(b.stats.timeBonus,15);assert.equal(b.stats.speed,77);await shot('dragon-play');
 // Lifecycle pause must stop simulation. This also verifies retained web/native glue.
 await page.evaluate(()=>window.HellPlatform.setNativePaused(true));const pa=await snap();await page.waitForTimeout(300);const pb=await snap();assert.equal(pa.depth,pb.depth);await page.evaluate(()=>window.HellPlatform.setNativePaused(false));
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.HellFallTest);let p=await prof();
 assert.equal(p.consumables.time_15,1);assert.equal(p.consumables.vitality_5,1);assert(p.wardrobes.uiji.quickSlots.every(x=>x===null));assert.equal(p.equippedPets.uiji,'baby_dragon');
 await click('#start');run=await snap();assert.equal(run.stats.speed,72);assert.equal(run.stats.timeBonus,0);assert.equal(run.runItems.length,0);assert.equal(run.profile.consumables.time_15,1);
 console.log('QACONSUME='+JSON.stringify({first:{speed:b.stats.speed,timeBonus:b.stats.timeBonus,pet:b.pet,stock:b.profile.consumables.time_15},next:{stats:run.stats,stock:run.profile.consumables.time_15}}));
 // Permanent slot purchases and one-per-category selections.
 await reset('useoi');
 await click('#homePrepSlots [data-prep-slot="2"]');await click('[data-buy-slot="2"]');
 assert.equal((await prof()).slotCount,3);assert.equal((await prof()).coins,850);
 await click('#homePrepSlots [data-prep-slot="3"]');await click('[data-buy-slot="3"]');
 p=await prof();assert.equal(p.slotCount,4);assert.equal(p.coins,550);
 const stock=await page.evaluate(()=>{const s=window.HellSystems;return ['bubble_10','vitality_3','calm_3','time_5'].map(id=>s.purchase(id).ok)});
 assert(stock.every(Boolean));
 for(const [i,id] of ['bubble_10','vitality_3','calm_3','time_5'].entries()){
   await click('#homePrepSlots [data-prep-slot="'+i+'"]');await click('[data-loadout-item="'+id+'"]');
 }
 await click('#start');run=await snap();assert.equal(run.bubbleCharges,1);assert.equal(run.stats.speed,73);assert.equal(run.stats.brake,73);assert.equal(run.stats.timeBonus,5);assert.equal(run.runItems.length,4);
 assert(run.profile.wardrobes.useoi.quickSlots.every(x=>x===null));assert.equal(run.profile.slotCount,4);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.HellFallTest);assert.equal((await prof()).slotCount,4);

 // Coco has its own portrait, motion atlas, three bonuses and persistent ownership.
 await reset('uiji');
 await shop('pets');assert.equal(await page.locator('[data-market-item]').count(),2);
 await click('[data-market-item="coco"]');assert.equal(await page.locator('.market-large-art .coco-art').count(),1);
 await shot('coco-shop');await click('[data-market-buy-pet="coco"]');await click('#drawerClose');
 let cp=await prof();assert.equal(cp.coins,650);assert(cp.ownedPets.includes('coco'));assert.equal(cp.equippedPets.uiji,null);
 await click('[data-panel="character"]');await click('[data-wardrobe-tab="pets"]');await click('[data-equip-pet="coco"]');
 assert.equal(await page.locator('.preview-dragon .coco-art').count(),1);await shot('coco-equipped');await click('#drawerClose');
 assert.equal(await page.locator('#homePet.coco-art:not(.hidden)').count(),1);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.HellFallTest);
 assert.equal((await prof()).equippedPets.uiji,'coco');
 await page.evaluate(()=>{Math.random=()=>2.1/1e9;});
 await click('#start');await page.waitForFunction(()=>['flap-up','flap-down'].includes(window.HellFallTest.snapshot().petPose));
 let cr=await snap();assert.equal(cr.pet,'coco');assert.equal(cr.stats.speed,73);assert.equal(cr.stats.brake,72);assert.equal(cr.stats.timeBonus,5);
 await shot('coco-flap');
 await tapBoost(10);await page.waitForFunction(()=>window.HellFallTest.snapshot().petPose==='dive',{timeout:5000});
 cr=await snap();assert.equal(cr.stage,'PLAYING');await shot('coco-dive');
 console.log('QACOCO='+JSON.stringify({pet:cr.pet,pose:cr.petPose,stats:cr.stats,coins:cr.profile.coins}));

 // Migrate a former WEB 3.2 account with actual purchased gear and legacy raw-distance units.
 await page.evaluate(()=>{
  localStorage.clear();
  localStorage.setItem('hell_fall_skin_test_v30',JSON.stringify({coins:42,identityChosen:true,accountActor:'uiji',activeActor:'uiji',equippedSkins:{uiji:'uiji',useoi:'starter_girl'},ownedSkins:['starter_boy','starter_girl','uiji'],totalDepth:123450,level:7,levelMigration:2,levelBaseDepth:123450,levelBaseLevel:7,runs:5,inventory:['helmet_basic','helmet_frog'],consumables:{bubble_10:2},wardrobes:{uiji:{quickSlots:['bubble_10',null],gear:{helmet:'helmet_basic'}},useoi:{quickSlots:[null,null],gear:{}}}}));
  localStorage.setItem('hell_fall_web_v42_best','25000');
 });
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.HellFallTest);
 p=await prof();assert.equal(p.coins,522);assert.equal(p.level,7);assert.equal(p.totalDepth,123450);assert.equal(p.runs,5);assert.equal(p.selectedCharacter,'uiji');assert.equal(p.consumables.bubble_10,2);assert.equal(p.retiredGearRefund,480);
 assert.equal(await page.locator('#homeBest').textContent(),'2,500');assert.equal(await page.locator('#homeTotal').textContent(),'12,345');
 assert(await page.evaluate(()=>!!localStorage.getItem('hell_fall_skin_test_v30_pre_rpg33')));
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.HellFallTest);assert.equal((await prof()).coins,522);
 console.log('QAMIGRATION='+JSON.stringify({coins:p.coins,total:p.totalDepth,level:p.level,refund:p.retiredGearRefund}));
 assert.equal(errors.length,0,JSON.stringify(errors));
 await browser.close();console.log('QA_PASS_RPG33');
})().catch(e=>{console.error(e);process.exit(1)});
