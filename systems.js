'use strict';
/* HELL FALL v0.4 — stable local progress and detachable soundtrack slots.
   Catalog & paid/rewarded ad connections intentionally disabled until implemented. */
(function(){
  // Only the build-time flag enables the two-actor test wallet. Production has a separate storage namespace.
  const TEST_MODE=true,LEGACY_KEY='hell_fall_profile_v1';
  const KEY=TEST_MODE?'hell_fall_skin_test_v30':'hell_fall_skin_release_v1';
  const ACTOR_CATALOG=[{id:'uiji',name:'우지',base:'starter_boy'},{id:'useoi',name:'우서',base:'starter_girl'}];
  const DEFAULT_MUSIC=.20; // 20% default; real output controlled by Web Audio GainNode.
  // Original arrangements from the user's Rhythm Game Lab / shared game-music library.
  // Local MP3s are loaded only when their zone is played; no external URL dependency.
  const MUSIC_SLOTS=[
    {name:'홈 화면',title:'비발디 겨울 2악장 · 밤의 발라드',file:'audio/menu.mp3',ready:true},
    {name:'지표면 · 지하 동굴',title:'모차르트 터키 행진곡 · 어쿠스틱 여행',file:'audio/zone_01.m4a',ready:true},
    {name:'깊은 암반층',title:'베토벤 비창 3악장 · 따뜻한 피아노팝',file:'audio/zone_02.m4a',ready:true},
    {name:'마그마 지대',title:'베토벤 월광소나타 3악장 · EASY 다이내믹 V6',file:'audio/zone_03.mp3',ready:true},
    {name:'맨틀 지대',title:'비발디 겨울 1악장 · 설원 모험',file:'audio/zone_04.mp3',ready:true},
    {name:'외핵',title:'베토벤 비창 3악장 · ARCADE BREAK',file:'audio/zone_05.mp3',ready:true},
    {name:'내핵',title:'베토벤 월광소나타 3악장 · HARD 다이내믹 V6',file:'audio/zone_06.mp3',ready:true},
    {name:'지옥의 심연',title:'비발디 겨울 1악장 · ARCADE BOSS',file:'audio/zone_07.mp3',ready:true}
  ];
  // Free starter portraits use approved complete-body game illustrations.
  // The premium Uiji/Useoi original artwork is immutable.
  const CHARACTER_CATALOG=[
    {id:'starter_boy',name:'우지 기본 복장',description:'무료 기본 스킨 · 최고속도 70% · 감속 70%',front:'assets/starter_boy_portrait_v29.webp',actor:'uiji',actions:'assets/starter_boy_actions_v29.webp',starter:true,price:0,speedBonus:0,brakeBonus:0,hasBack:false},
    {id:'starter_girl',name:'우서 기본 복장',description:'무료 기본 스킨 · 최고속도 70% · 감속 70%',front:'assets/starter_girl_portrait_v29.webp',actor:'useoi',actions:'assets/starter_girl_actions_v29.webp',starter:true,price:0,speedBonus:0,brakeBonus:0,hasBack:false},
    {id:'useoi',name:'우서 탐험가 스킨',description:'기존 원화 · 최고속도 +3%p · 감속 +2%p',front:'assets/hero_intro.webp',actor:'useoi',starter:false,price:100,speedBonus:3,brakeBonus:2,hasBack:true},
    {id:'uiji',name:'우지 탐험가 스킨',description:'기존 원화 · 최고속도 +3%p · 감속 +2%p',front:'assets/uiji_intro.webp',actor:'uiji',starter:false,price:100,speedBonus:3,brakeBonus:2,hasBack:false},
    {id:'wingsuit_boy',name:'우지 윙슈트',description:'윙슈트 · 최고속도 +6%p · 감속 +5%p',front:'assets/wingsuit_boy_portrait.webp',actions:'assets/wingsuit_boy_actions.webp',actor:'uiji',starter:false,kind:'wingsuit',price:200,speedBonus:6,brakeBonus:5,hasBack:false},
    {id:'wingsuit_girl',name:'우서 윙슈트',description:'윙슈트 · 최고속도 +6%p · 감속 +5%p',front:'assets/wingsuit_girl_portrait.webp',actions:'assets/wingsuit_girl_actions.webp',actor:'useoi',starter:false,kind:'wingsuit',price:200,speedBonus:6,brakeBonus:5,hasBack:false}
  ];
  // Rendering IDs are stable for existing art. Domain objects are two actors and six skins.
  const SKIN_CATALOG=CHARACTER_CATALOG;
  const actorOf=id=>SKIN_CATALOG.find(c=>c.id===id)?.actor;
  const baseOf=actor=>ACTOR_CATALOG.find(a=>a.id===actor)?.base;
  const validActor=id=>ACTOR_CATALOG.some(a=>a.id===id);
  const actorName=id=>ACTOR_CATALOG.find(a=>a.id===id)?.name||'우지';
  const skinsFor=actor=>SKIN_CATALOG.filter(c=>c.actor===actor);
  // Beta balance: the exact prices can be adjusted without changing saved purchases.
  const PET_CATALOG=[{id:'baby_dragon',name:'아기 용',price:200,speedBonus:2,brakeBonus:0,timeBonus:0,iconIndex:6,description:'작은 날개로 함께 낙하하는 영구 펫 · 최고속 +2%p'}];
  const SLOT_PRICES={2:150,3:300};
  const ITEM_CATALOG=[
    {id:'bubble_10',name:'노란 버블 보호막',kind:'bubble',price:20,hits:1,color:'#ffe579',icon:'🟡',description:'한 판 동안 충돌 1회 방어'},
    {id:'bubble_20',name:'초록 버블 보호막',kind:'bubble',price:45,hits:2,color:'#72f3a3',icon:'🟢',description:'한 판 동안 충돌 2회 방어'},
    {id:'bubble_30',name:'빨간 버블 보호막',kind:'bubble',price:80,hits:3,color:'#ff7787',icon:'🔴',description:'한 판 동안 충돌 3회 방어'},
    // One run per consumable; grades retain their purchased IDs.
    {id:'vitality_3',name:'활력 드링크 · 소',kind:'drink',stat:'speed',bonus:3,price:30,color:'#ffbb39',icon:'⚡',description:'한 판 동안 최고속도 +3%p'},
    {id:'vitality_5',name:'활력 드링크 · 중',kind:'drink',stat:'speed',bonus:5,price:55,color:'#ffad25',icon:'⚡',description:'한 판 동안 최고속도 +5%p'},
    {id:'vitality_10',name:'활력 드링크 · 대',kind:'drink',stat:'speed',bonus:10,price:100,color:'#ff803b',icon:'⚡',description:'한 판 동안 최고속도 +10%p'},
    {id:'calm_3',name:'침착 드링크 · 소',kind:'drink',stat:'brake',bonus:3,price:30,color:'#6bdafa',icon:'❄️',description:'한 판 동안 연타 중단 시 감속력 +3%p'},
    {id:'calm_5',name:'침착 드링크 · 중',kind:'drink',stat:'brake',bonus:5,price:55,color:'#3dbbe6',icon:'❄️',description:'한 판 동안 연타 중단 시 감속력 +5%p'},
    {id:'calm_10',name:'침착 드링크 · 대',kind:'drink',stat:'brake',bonus:10,price:100,color:'#3899e9',icon:'❄️',description:'한 판 동안 연타 중단 시 감속력 +10%p'},
    {id:'time_5',name:'시간의 드링크 · 소',kind:'drink',stat:'time',bonus:5,price:35,color:'#d2a0ff',icon:'⏳',description:'한 판 동안 타임라인·시계 획득 시간 +5%'},
    {id:'time_10',name:'시간의 드링크 · 중',kind:'drink',stat:'time',bonus:10,price:65,color:'#b984ff',icon:'⏳',description:'한 판 동안 타임라인·시계 획득 시간 +10%'},
    {id:'time_15',name:'시간의 드링크 · 대',kind:'drink',stat:'time',bonus:15,price:120,color:'#8d59e3',icon:'⏳',description:'한 판 동안 타임라인·시계 획득 시간 +15%'}
  ];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
  const int=(v)=>Math.max(0,Math.floor(Number(v)||0));
  function newProfile(){return {coins:TEST_MODE?1000:0,identityChosen:false,accountActor:null,activeActor:'uiji',equippedSkins:{uiji:'starter_boy',useoi:'starter_girl'},ownedSkins:['starter_boy','starter_girl'],skinRevision:1,rpgRevision:0,slotCount:2,ownedPets:[],equippedPets:{uiji:null,useoi:null},retiredGearRefund:0,totalDepth:0,level:1,levelMigration:2,levelBaseDepth:0,levelBaseLevel:1,runs:0,worldCoins:0,inventory:[],selectedCharacter:'starter_boy',ownedCharacters:['starter_boy','starter_girl'],characterOwnershipRevision:1,equippedHelmet:null,armedBubble:null,wardrobes:{},consumables:{},settings:{music:DEFAULT_MUSIC,sfx:.32,boostSide:'left',musicDefaultRevision:2},claimed:[]};}
  function load(){let obj={},hasCurrent=false;
    try{const raw=window.HellPlatform.storage.read(KEY);hasCurrent=!!raw;
      obj=JSON.parse(raw||(TEST_MODE?window.HellPlatform.storage.read(LEGACY_KEY):null)||'{}')||{};
    }catch(_){obj={};hasCurrent=false;}
    const p={...newProfile(),...obj};
    // First test migration gets an exact 1000-coin wallet and unpurchased test skins.
    // The legacy key remains untouched, including prior balance and ownership.
    p.coins=hasCurrent?int(p.coins):TEST_MODE?1000:0;p.totalDepth=int(p.totalDepth);p.runs=int(p.runs);p.worldCoins=int(p.worldCoins);
    p.inventory=Array.isArray(p.inventory)?p.inventory.filter(x=>typeof x==='string').slice(0,200):[];
    p.slotCount=Math.max(2,Math.min(4,int(obj.slotCount)||2));
    p.ownedPets=Array.isArray(obj.ownedPets)?[...new Set(obj.ownedPets.filter(id=>PET_CATALOG.some(p=>p.id===id)))]:[];
    p.equippedPets={uiji:null,useoi:null};for(const a of ACTOR_CATALOG){const id=obj.equippedPets?.[a.id];if(p.ownedPets.includes(id))p.equippedPets[a.id]=id;}
    // Retired helmets: retain the pre-migration record and refund exactly once.
    if(!obj.rpgRevision){
      const refund=(p.inventory.includes('helmet_basic')?160:0)+(p.inventory.includes('helmet_frog')?320:0);
      if(hasCurrent)window.HellPlatform.storage.write(KEY+'_pre_rpg33',JSON.stringify(obj));
      p.coins+=refund;p.retiredGearRefund=refund;
    }
    p.rpgRevision=1;p.inventory=p.inventory.filter(id=>id!=='helmet_basic'&&id!=='helmet_frog');
    p.claimed=Array.isArray(p.claimed)?p.claimed.filter(x=>typeof x==='string').slice(0,200):[];
    const granted=new Set(['starter_boy','starter_girl']);
    if(hasCurrent&&Array.isArray(obj.ownedSkins))for(const id of obj.ownedSkins)
      if(SKIN_CATALOG.some(c=>c.id===id))granted.add(id);
    p.ownedSkins=Array.from(granted);p.ownedCharacters=p.ownedSkins;
    p.characterOwnershipRevision=1;p.skinRevision=1;
    p.identityChosen=hasCurrent&&obj.identityChosen===true&&validActor(obj.accountActor);
    p.accountActor=p.identityChosen?obj.accountActor:null;
    p.activeActor=p.identityChosen?(TEST_MODE&&validActor(obj.activeActor)?obj.activeActor:p.accountActor):
      (actorOf(obj.selectedCharacter)||'uiji');
    p.equippedSkins={};
    for(const a of ACTOR_CATALOG){
      const prior=hasCurrent?obj.equippedSkins?.[a.id]:null;
      p.equippedSkins[a.id]=granted.has(prior)&&actorOf(prior)===a.id?prior:a.base;
    }
    p.selectedCharacter=p.equippedSkins[p.activeActor];
    p.equippedHelmet=null;
    p.consumables={};
    for(const item of ITEM_CATALOG.filter(x=>x.kind==='bubble'||x.kind==='drink')){
      const n=Number(obj?.consumables?.[item.id]);
      p.consumables[item.id]=Number.isFinite(n)?Math.max(0,Math.min(99,Math.floor(n))):0;
    }
    // Gear and quick slots belong to the actor, not the outfit.
    // For old saves prefer the last active outfit, then the other outfit; the
    // original per-outfit records still exist in the untouched legacy key.
    const legacyChar=obj.selectedCharacter;
    p.wardrobes={};
    for(const a of ACTOR_CATALOG){
      const primary=actorOf(legacyChar)===a.id?legacyChar:a.base;
      const old=hasCurrent?(obj.wardrobes?.[a.id]||{}):
        (obj.wardrobes?.[primary]||obj.wardrobes?.[a.id]||obj.wardrobes?.[a.base]||{});
      const secondary=hasCurrent?{}:(obj.wardrobes?.[primary===a.base?a.id:a.base]||{});
      const priorSlots=Array.isArray(old.quickSlots)?old.quickSlots:
        (actorOf(legacyChar)===a.id&&Array.isArray(obj.quickSlots)?obj.quickSlots:[obj.armedBubble||null,null]);
      const quickSlots=[null,null,null,null],types=new Set();
      for(let i=0;i<p.slotCount;i++){
        const candidate=priorSlots[i]||secondary.quickSlots?.[i]||null;
        const item=ITEM_CATALOG.find(x=>x.id===candidate);
        const type=item&&(item.kind==='bubble'?'bubble':item.stat);
        if(item&&p.consumables[item.id]>0&&!types.has(type)){quickSlots[i]=item.id;types.add(type);}
      }
      p.wardrobes[a.id]={quickSlots,gear:{}};
    }
    p.armedBubble=null;
    // Untouched old default 26%/7% -> new default 20%.
    // Preserve chosen music levels including 0% and 2%, coins, scores and SFX.
    const oldSettings=obj?.settings||{};
    const oldMusic=oldSettings.music;
    const revision=Number(oldSettings.musicDefaultRevision)||0;
    const untouchedDefault=(oldMusic==null)
      || (revision<1&&Number(oldMusic)===.26)
      || (revision===1&&Number(oldMusic)===.07);
    p.settings={
      music:clamp(untouchedDefault?DEFAULT_MUSIC:oldMusic,0,1),
      sfx:clamp(oldSettings.sfx??.32,0,1),
      boostSide:oldSettings.boostSide==='right'?'right':'left',
      musicDefaultRevision:2
    };
    // Existing players keep their earned level. Slow progression starts from
    // their current saved total instead of silently downgrading old accounts.
    const savedLevel=Math.max(1,Math.min(999,int(obj?.level)||legacyLevelFromDepth(p.totalDepth)));
    p.levelMigration=2;
    if(obj?.levelMigration===2){
      p.levelBaseDepth=Math.min(p.totalDepth,int(obj.levelBaseDepth));
      p.levelBaseLevel=Math.max(1,int(obj.levelBaseLevel)||1);
    }else{
      p.levelBaseDepth=p.totalDepth;
      p.levelBaseLevel=Math.max(savedLevel,legacyLevelFromDepth(p.totalDepth));
    }
    p.level=computeLevelProgress(p.totalDepth,p.levelBaseDepth,p.levelBaseLevel).level;
    return p;
  }
  let profile=load();
  function save(){return window.HellPlatform.storage.write(KEY,JSON.stringify(profile));}
  save(); // Persist the one-time grant immediately, not on every reload.
  function legacyThreshold(level){const n=Math.max(0,level-1);return 2400+n*1700+n*n*190;}
  function legacyLevelFromDepth(distance){let lv=1,remain=int(distance);while(lv<1000&&remain>=legacyThreshold(lv)){remain-=legacyThreshold(lv);lv++;}return lv;}
  // New-player thresholds are intentionally substantially slower; retained
  // old-level baselines prevent a level reset on existing installations.
  function threshold(level){const n=Math.max(0,level-1);return 7500+n*4000+n*n*420;}
  function computeLevelProgress(distance,baseDepth=0,baseLevel=1){
    let remain=Math.max(0,int(distance)-int(baseDepth));
    for(let lv=Math.max(1,int(baseLevel));lv<1000;lv++){
      const need=threshold(lv);
      if(remain<need)return {level:lv,within:remain,next:need,ratio:remain/need};
      remain-=need;
    }
    return {level:1000,within:0,next:1,ratio:1};
  }
  function levelFromDepth(distance){return computeLevelProgress(distance).level;}
  function levelProgress(distance){return computeLevelProgress(distance,profile.levelBaseDepth,profile.levelBaseLevel);}
  function awardRun(distance,foundCoins){distance=int(distance);foundCoins=int(foundCoins);const old=profile.level;
    profile.totalDepth+=distance;profile.runs++;profile.worldCoins+=foundCoins;
    profile.level=levelProgress(profile.totalDepth).level;
    let bonus=0;for(let lv=old+1;lv<=profile.level;lv++)bonus+=8+4*lv;
    profile.coins+=foundCoins+bonus;save();return {distance,foundCoins,bonus,levelUps:profile.level-old,level:profile.level,newBalance:profile.coins};
  }
  function wardrobeOf(characterId){
    return profile.wardrobes[actorOf(characterId)||characterId]||null;
  }
  function purchase(id){
    const item=ITEM_CATALOG.find(x=>x.id===id);
    if(!item)return {ok:false,reason:'판매 준비 중'};
    if((profile.consumables[id]||0)>=99)return {ok:false,reason:'최대 99개까지 보관 가능'};
    if(profile.coins<item.price)return {ok:false,reason:'코인이 부족해요'};
    const oldCoins=profile.coins,oldQty=profile.consumables[id]||0;
    profile.coins-=item.price;profile.consumables[id]=oldQty+1;
    if(!save()){profile.coins=oldCoins;profile.consumables[id]=oldQty;return {ok:false,reason:'저장할 수 없어 구매를 취소했어요'};}
    return {ok:true,item,coins:profile.coins};
  }
  const petOf=actor=>PET_CATALOG.find(p=>p.id===profile.equippedPets[actorOf(actor)||actor||profile.activeActor])||null;
  function purchasePet(id){
    const item=PET_CATALOG.find(p=>p.id===id);if(!item)return {ok:false,reason:'판매 준비 중'};
    if(profile.ownedPets.includes(id))return {ok:false,reason:'이미 보유 중'};
    if(profile.coins<item.price)return {ok:false,reason:'코인이 부족해요'};
    profile.coins-=item.price;profile.ownedPets.push(id);
    if(!save()){profile.coins+=item.price;profile.ownedPets.pop();return {ok:false,reason:'저장 실패'};}
    return {ok:true,item,coins:profile.coins};
  }
  function equipPet(id){
    if(id!==null&&!profile.ownedPets.includes(id))return false;
    const a=profile.activeActor,old=profile.equippedPets[a];profile.equippedPets[a]=id;
    if(!save()){profile.equippedPets[a]=old;return false;}return true;
  }
  function purchaseSlot(index){
    if(!Number.isInteger(index)||index!==profile.slotCount||index>3)return {ok:false,reason:'앞 슬롯부터 열어 주세요'};
    const price=SLOT_PRICES[index];if(profile.coins<price)return {ok:false,reason:'코인이 부족해요'};
    profile.coins-=price;profile.slotCount++;
    if(!save()){profile.coins+=price;profile.slotCount--;return {ok:false,reason:'저장 실패'};}
    return {ok:true,price};
  }
  function ownsSkin(id){return profile.ownedSkins.includes(id);}
  function purchaseSkin(id){
    const skin=SKIN_CATALOG.find(c=>c.id===id);
    if(!profile.identityChosen||!skin||skin.actor!==profile.activeActor)return {ok:false,reason:'선택한 캐릭터의 스킨만 구매할 수 있어요'};
    if(ownsSkin(id))return {ok:false,reason:'이미 보유 중'};
    if(profile.coins<skin.price)return {ok:false,reason:'코인이 부족해요'};
    const oldCoins=profile.coins;
    profile.coins-=skin.price;profile.ownedSkins.push(id);
    if(!save()){profile.coins=oldCoins;profile.ownedSkins.pop();return {ok:false,reason:'저장할 수 없어 구매를 취소했어요'};}
    return {ok:true,skin,character:skin,coins:profile.coins};
  }
  function selectActor(id){
    if(!validActor(id)||(!TEST_MODE&&profile.identityChosen&&id!==profile.accountActor))return false;
    const old={identityChosen:profile.identityChosen,accountActor:profile.accountActor,activeActor:profile.activeActor,selectedCharacter:profile.selectedCharacter};
    if(!profile.identityChosen){profile.accountActor=id;profile.identityChosen=true;}
    profile.activeActor=id;profile.selectedCharacter=profile.equippedSkins[id]||baseOf(id);
    if(!save()){Object.assign(profile,old);return false;}return true;
  }
  function equipSkin(id){
    if(!profile.identityChosen||!ownsSkin(id)||actorOf(id)!==profile.activeActor)return false;
    const old=profile.selectedCharacter;
    profile.selectedCharacter=id;profile.equippedSkins[profile.activeActor]=id;
    if(!save()){profile.selectedCharacter=old;profile.equippedSkins[profile.activeActor]=old;return false;}return true;
  }
  const ownsCharacter=ownsSkin,purchaseCharacter=purchaseSkin;
  function characterStats(id){
    const hero=CHARACTER_CATALOG.find(c=>c.id===id)||CHARACTER_CATALOG[0];
    return {speed:70+(hero.speedBonus||0),brake:70+(hero.brakeBonus||0)};
  }
  const selectCharacter=equipSkin;
  const itemType=i=>i.kind==='bubble'?'bubble':i.stat;
  function setCharacterSlot(characterId,index,itemId){
    const wardrobe=wardrobeOf(characterId);
    if(!wardrobe||!Number.isInteger(index)||index<0||index>=profile.slotCount)return false;
    if(itemId!==null){
      const item=ITEM_CATALOG.find(x=>x.id===itemId);
      if(!item||(profile.consumables[itemId]||0)<1)return false;
      if(wardrobe.quickSlots.some((id,i)=>i!==index&&ITEM_CATALOG.some(x=>x.id===id&&itemType(x)===itemType(item))))return false;
    }
    const old=wardrobe.quickSlots[index];wardrobe.quickSlots[index]=itemId;
    if(!save()){wardrobe.quickSlots[index]=old;return false;}return true;
  }
  function startLoadout(){
    const wardrobe=wardrobeOf(profile.selectedCharacter);
    if(!wardrobe)return {ok:false,reason:'캐릭터를 먼저 선택해 주세요'};
    const oldQty={...profile.consumables},oldSlots=Object.fromEntries(Object.entries(profile.wardrobes).map(([a,w])=>[a,w.quickSlots.slice()]));
    const items=[],types=new Set();
    for(const id of wardrobe.quickSlots.slice(0,profile.slotCount)){
      if(!id)continue;const item=ITEM_CATALOG.find(x=>x.id===id);
      if(!item||(profile.consumables[id]||0)<1||types.has(itemType(item)))return {ok:false,reason:'장착한 아이템 수량 또는 종류를 확인해 주세요'};
      types.add(itemType(item));items.push(item);
    }
    for(const i of items)profile.consumables[i.id]--;
    wardrobe.quickSlots=[null,null,null,null];
    for(const entry of Object.values(profile.wardrobes))entry.quickSlots=entry.quickSlots.map(id=>id&&(profile.consumables[id]||0)>0?id:null);
    if(!save()){profile.consumables=oldQty;for(const [a,slots] of Object.entries(oldSlots))profile.wardrobes[a].quickSlots=slots;return {ok:false,reason:'저장할 수 없어 출전을 취소했어요'};}
    return {ok:true,items,pet:petOf(profile.selectedCharacter)};
  }
  function setting(name,value){
    if(name==='boostSide'){profile.settings.boostSide=value==='right'?'right':'left';save();return;}
    if(!['music','sfx'].includes(name))return;
    profile.settings[name]=clamp(value,0,1);
    if(name==='music'){profile.settings.musicDefaultRevision=2;audio.applyMusicVolume();}
    save();
  }
  const audio={ctx:null,lastTapSound:0,bgm:null,bgmSource:null,bgmGain:null,bgmRoute:'pending',lastMusicGain:null,mode:'off',trackIndex:0,previewIndex:-1,
    async unlock(){
      const C=window.AudioContext||window.webkitAudioContext;
      if(!C)return;
      try{
        if(!this.ctx)this.ctx=new C();
        if(this.bgm&&!this.bgmGain)this._routeBgm();
        if(this.ctx.state==='suspended')await this.ctx.resume();
      }catch(err){console.warn('Audio context unavailable; using media volume fallback',err);}
    },
    effect(name){const ctx=this.ctx;if(!ctx||ctx.state!=='running'||profile.settings.sfx===0)return;
      const now=ctx.currentTime;if(name==='tap'&&now-this.lastTapSound<.13)return;
      if(name==='tap')this.lastTapSound=now;
      const params={tap:[305,180,.045,.12],jump:[430,650,.15,.19],coin:[740,990,.17,.22],clock:[680,900,.20,.22],checkpoint:[520,850,.27,.24],hit:[205,69,.26,.24],level:[540,1060,.32,.22],start:[470,685,.19,.18]};
      const [f1,f2,duration,amount]=params[name]||params.tap;
      try{const os=ctx.createOscillator(),gain=ctx.createGain();os.type=name==='hit'?'triangle':'sine';os.frequency.setValueAtTime(f1,now);os.frequency.exponentialRampToValueAtTime(Math.max(50,f2),now+duration);gain.gain.setValueAtTime(.00001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,profile.settings.sfx*amount),now+.01);gain.gain.exponentialRampToValueAtTime(.00001,now+duration);os.connect(gain).connect(ctx.destination);os.start(now);os.stop(now+duration+.02)}catch(_){/* no device audio */}
    },
    // Route BGM through a separate Web Audio gain (SFX bypass this node).
    _routeBgm(){
      if(this.bgmGain||this.bgmRoute==='media-fallback'||!this.ctx||!this.bgm)return;
      if(!this.ctx.createMediaElementSource||!this.ctx.createGain)return;
      try{
        const gain=this.ctx.createGain();
        gain.gain.value=0; // never allow a loud burst on first connection
        const source=this.ctx.createMediaElementSource(this.bgm);
        source.connect(gain);gain.connect(this.ctx.destination);
        this.bgmSource=source;this.bgmGain=gain;this.bgmRoute='webaudio';
        this.lastMusicGain=null;
        this.applyMusicVolume();
      }catch(err){
        this.bgmRoute='media-fallback';
        console.warn('Web Audio BGM gain unavailable; reverting to media volume',err);
      }
    },
    applyMusicVolume(){
      const v=clamp(profile.settings.music,0,1);
      if(!this.bgm)return;
      if(this.ctx&&!this.bgmGain)this._routeBgm();
      if(this.bgmGain){
        if(this.lastMusicGain!==v){
          if(this.bgmGain.gain.setValueAtTime)
            this.bgmGain.gain.setValueAtTime(v,this.ctx.currentTime);
          else this.bgmGain.gain.value=v;
          this.lastMusicGain=v;
        }
        this.bgm.muted=false;
        this.bgm.volume=1; // prevent accidental double attenuation
      }else{
        this.bgm.muted=v===0;
        this.bgm.volume=v;
        if(this.ctx)this.bgmRoute='media-fallback';
      }
    },
    // One media element survives game-over and retry; only a natural track end advances.
    _ensureElement(){
      if(this.bgm)return this.bgm;
      const el=new Audio();el.loop=false;el.preload='auto';el.setAttribute('playsinline','');
      el.addEventListener('ended',()=>{
        if(this.mode==='game'){
          this.trackIndex=(this.trackIndex+1)%7;
          this._playCatalog(this.trackIndex+1);
        }else if(this.mode==='preview')this.stopPreview();
      });
      this.bgm=el;this._routeBgm();this.applyMusicVolume();return el;
    },
    _playCatalog(catalogIndex){
      const slot=MUSIC_SLOTS[catalogIndex];
      if(!slot?.ready||!slot.file)return;
      const el=this._ensureElement();
      el.pause();el.src=slot.file;el.load();
      this.applyMusicVolume();
      if(!document.hidden)el.play().catch(()=>{});
    },
    startGamePlaylist(){
      if(this.mode==='game')return; // retry without restarting the current song
      this.mode='game';this.previewIndex=-1;this.trackIndex=0;
      this._playCatalog(1);
    },
    preview(catalogIndex){
      if(catalogIndex<1){this.stopPreview();return;}
      if(this.mode==='game')return;
      this.mode='preview';this.previewIndex=catalogIndex;
      this._playCatalog(catalogIndex);
    },
    stopPreview(){if(this.mode==='preview')this.stop();},
    fade(){this.applyMusicVolume();},
    stop(){
      this.mode='off';this.previewIndex=-1;this.trackIndex=0;
      if(this.bgm){this.bgm.pause();this.bgm.removeAttribute('src');this.bgm.load();}
    },
    visibility(hidden){
      if(hidden)this.bgm?.pause();
      else if(this.mode!=='off'&&this.bgm)this.bgm.play().catch(()=>{});
    }
  };
  // The actual reward provider must validate the completed impression before calling this.
  // No fake ad credits, real-money checkout, or automatic reward bypass exists in v0.4.
  window.HellSystems={TEST_MODE,ACTOR_CATALOG,SKIN_CATALOG,actorName,skinsFor,selectActor,equipSkin,purchaseSkin,ownsSkin,profile,save,setting,awardRun,levelProgress,levelFromDepth,threshold,CHARACTER_CATALOG,ITEM_CATALOG,MUSIC_SLOTS,audio,purchase,purchaseCharacter,ownsCharacter,characterStats,selectCharacter,wardrobeOf,setCharacterSlot,startLoadout,PET_CATALOG,SLOT_PRICES,petOf,purchasePet,equipPet,purchaseSlot};
})();