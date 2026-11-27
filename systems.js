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
    {id:'starter_boy',name:'우지 기본 복장',description:'무료 기본 스킨 · 최고속도 70% · 감속 70%',front:'assets/starter_boy_portrait_v29.webp',actor:'uiji',starter:true,price:0,speedBonus:0,brakeBonus:0,hasBack:false},
    {id:'starter_girl',name:'우서 기본 복장',description:'무료 기본 스킨 · 최고속도 70% · 감속 70%',front:'assets/starter_girl_portrait_v29.webp',actor:'useoi',starter:true,price:0,speedBonus:0,brakeBonus:0,hasBack:false},
    {id:'useoi',name:'우서 탐험가 스킨',description:'기존 원화 · 최고속도 +3%p · 감속 +2%p',front:'assets/hero_intro.webp',actor:'useoi',starter:false,price:100,speedBonus:3,brakeBonus:2,hasBack:true},
    {id:'uiji',name:'우지 탐험가 스킨',description:'기존 원화 · 최고속도 +3%p · 감속 +2%p',front:'assets/uiji_intro.webp',actor:'uiji',starter:false,price:100,speedBonus:3,brakeBonus:2,hasBack:false}
  ];
  // Rendering IDs are stable for existing art. Domain objects are two actors and four skins.
  const SKIN_CATALOG=CHARACTER_CATALOG;
  const actorOf=id=>SKIN_CATALOG.find(c=>c.id===id)?.actor;
  const baseOf=actor=>ACTOR_CATALOG.find(a=>a.id===actor)?.base;
  const validActor=id=>ACTOR_CATALOG.some(a=>a.id===id);
  const actorName=id=>ACTOR_CATALOG.find(a=>a.id===id)?.name||'우지';
  const skinsFor=actor=>SKIN_CATALOG.filter(c=>c.actor===actor);
  // Beta balance: the exact prices can be adjusted without changing saved purchases.
  const ITEM_CATALOG=[
    {id:'bubble_10',name:'노란 버블 보호막',kind:'bubble',price:20,seconds:10,color:'#ffe579',icon:'🟡',description:'플레이 중 사용하면 10초 보호'},
    {id:'bubble_20',name:'초록 버블 보호막',kind:'bubble',price:45,seconds:20,color:'#72f3a3',icon:'🟢',description:'플레이 중 사용하면 20초 보호'},
    {id:'bubble_30',name:'빨간 버블 보호막',kind:'bubble',price:80,seconds:30,color:'#ff7787',icon:'🔴',description:'플레이 중 사용하면 30초 보호'},
    {id:'helmet_basic',name:'탐험가 헬멧',kind:'helmet',price:160,hits:1,icon:'🪖',description:'장착 시 매 판 충돌 1회 방어'},
    {id:'helmet_frog',name:'개구리 헬멧',kind:'helmet',price:320,hits:2,icon:'🐸',description:'장착 시 매 판 충돌 2회 방어'},
    // Test prices / 20-second effect duration: tune after real phone play.
    {id:'vitality_3',name:'활력 드링크 · 소',kind:'drink',stat:'speed',bonus:3,seconds:20,price:30,color:'#ffbb39',icon:'⚡',description:'20초 동안 최고속도 +3%p'},
    {id:'vitality_5',name:'활력 드링크 · 중',kind:'drink',stat:'speed',bonus:5,seconds:20,price:55,color:'#ffad25',icon:'⚡',description:'20초 동안 최고속도 +5%p'},
    {id:'vitality_10',name:'활력 드링크 · 대',kind:'drink',stat:'speed',bonus:10,seconds:20,price:100,color:'#ff803b',icon:'⚡',description:'20초 동안 최고속도 +10%p'},
    {id:'calm_3',name:'침착 드링크 · 소',kind:'drink',stat:'brake',bonus:3,seconds:20,price:30,color:'#6bdafa',icon:'❄️',description:'20초 동안 연타 중단 시 감속력 +3%p'},
    {id:'calm_5',name:'침착 드링크 · 중',kind:'drink',stat:'brake',bonus:5,seconds:20,price:55,color:'#3dbbe6',icon:'❄️',description:'20초 동안 연타 중단 시 감속력 +5%p'},
    {id:'calm_10',name:'침착 드링크 · 대',kind:'drink',stat:'brake',bonus:10,seconds:20,price:100,color:'#3899e9',icon:'❄️',description:'20초 동안 연타 중단 시 감속력 +10%p'}
  ];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
  const int=(v)=>Math.max(0,Math.floor(Number(v)||0));
  function newProfile(){return {coins:TEST_MODE?1000:0,identityChosen:false,accountActor:null,activeActor:'uiji',equippedSkins:{uiji:'starter_boy',useoi:'starter_girl'},ownedSkins:['starter_boy','starter_girl'],skinRevision:1,totalDepth:0,level:1,levelMigration:2,levelBaseDepth:0,levelBaseLevel:1,runs:0,worldCoins:0,inventory:[],selectedCharacter:'starter_boy',ownedCharacters:['starter_boy','starter_girl'],characterOwnershipRevision:1,equippedHelmet:null,armedBubble:null,wardrobes:{},consumables:{},settings:{music:DEFAULT_MUSIC,sfx:.32,boostSide:'left',musicDefaultRevision:2},claimed:[]};}
  function load(){let obj={},hasCurrent=false;
    try{const raw=window.HellPlatform.storage.read(KEY);hasCurrent=!!raw;
      obj=JSON.parse(raw||(TEST_MODE?window.HellPlatform.storage.read(LEGACY_KEY):null)||'{}')||{};
    }catch(_){obj={};hasCurrent=false;}
    const p={...newProfile(),...obj};
    // First test migration gets an exact 1000-coin wallet and unpurchased test skins.
    // The legacy key remains untouched, including prior balance and ownership.
    p.coins=hasCurrent?int(p.coins):TEST_MODE?1000:0;p.totalDepth=int(p.totalDepth);p.runs=int(p.runs);p.worldCoins=int(p.worldCoins);
    p.inventory=Array.isArray(p.inventory)?p.inventory.filter(x=>typeof x==='string').slice(0,200):[];
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
    p.equippedHelmet=ITEM_CATALOG.some(x=>x.id===obj?.equippedHelmet&&x.kind==='helmet'&&p.inventory.includes(x.id))?obj.equippedHelmet:null;
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
      const quickSlots=[0,1].map(i=>{
        const candidate=priorSlots[i]||secondary.quickSlots?.[i]||null;
        return ITEM_CATALOG.some(x=>x.id===candidate&&(x.kind==='bubble'||x.kind==='drink')&&p.consumables[x.id]>0)?candidate:null;
      });
      if(quickSlots[0]&&quickSlots[0]===quickSlots[1]&&p.consumables[quickSlots[0]]<2)quickSlots[1]=null;
      const helmetCandidate=old.gear?.helmet||secondary.gear?.helmet||(actorOf(legacyChar)===a.id?obj.equippedHelmet:null);
      const gear={helmet:null,cape:null,shoes:null,pants:null,top:null};
      if(ITEM_CATALOG.some(x=>x.id===helmetCandidate&&x.kind==='helmet'&&p.inventory.includes(x.id)))gear.helmet=helmetCandidate;
      p.wardrobes[a.id]={quickSlots,gear};
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
    if(item.kind==='helmet'&&profile.inventory.includes(id))return {ok:false,reason:'이미 보유 중'};
    if((item.kind==='bubble'||item.kind==='drink')&&profile.consumables[id]>=99)return {ok:false,reason:'최대 99개까지 보관 가능'};
    if(profile.coins<item.price)return {ok:false,reason:'코인이 부족해요'};
    const oldCoins=profile.coins,oldQty=profile.consumables[id]||0;
    profile.coins-=item.price;
    if(item.kind==='helmet'){
      profile.inventory.push(id);
    }else if(item.kind==='bubble'||item.kind==='drink'){
      profile.consumables[id]=(profile.consumables[id]||0)+1;
    }
    // Purchasing only adds to the warehouse. It never auto-equips or activates.
    if(!save()){
      profile.coins=oldCoins;
      if(item.kind==='helmet')profile.inventory=profile.inventory.filter(x=>x!==id);
      else profile.consumables[id]=oldQty;
      return {ok:false,reason:'저장할 수 없어 구매를 취소했어요'};
    }
    return {ok:true,item,coins:profile.coins};
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
  function setCharacterSlot(characterId,index,itemId){
    const wardrobe=wardrobeOf(characterId);
    if(!wardrobe||!Number.isInteger(index)||index<0||index>1)return false;
    if(itemId!==null){
      const item=ITEM_CATALOG.find(x=>x.id===itemId&&(x.kind==='bubble'||x.kind==='drink'));
      if(!item||(profile.consumables[itemId]||0)<1)return false;
      const other=wardrobe.quickSlots[1-index];
      if(other===itemId&&(profile.consumables[itemId]||0)<2)return false;
    }
    wardrobe.quickSlots[index]=itemId;save();return true;
  }
  function setCharacterGear(characterId,slot,itemId){
    const wardrobe=wardrobeOf(characterId);
    if(!wardrobe||!['helmet','cape','shoes','pants','top'].includes(slot))return false;
    if(itemId!==null){
      const item=ITEM_CATALOG.find(x=>x.id===itemId&&profile.inventory.includes(itemId));
      if(!item||(item.kind==='helmet'?'helmet':item.slot)!==slot)return false;
    }
    wardrobe.gear[slot]=itemId;save();return true;
  }
  function consumeCharacterSlot(characterId,index){
    const wardrobe=wardrobeOf(characterId);
    if(!wardrobe||characterId!==profile.selectedCharacter||!Number.isInteger(index)||index<0||index>1)
      return {ok:false,reason:'잘못된 아이템 슬롯'};
    const id=wardrobe.quickSlots[index],item=ITEM_CATALOG.find(x=>x.id===id&&(x.kind==='bubble'||x.kind==='drink'));
    if(!item)return {ok:false,reason:'장착된 아이템이 없어'};
    if((profile.consumables[id]||0)<=0)return {ok:false,reason:'아이템이 부족해'};
    profile.consumables[id]--;
    if(profile.consumables[id]===0){
      // All characters share inventory. Empty slots return to the warehouse
      // state when the final unit is consumed; no other character can use it.
      for(const entry of Object.values(profile.wardrobes))
        entry.quickSlots=entry.quickSlots.map(x=>x===id?null:x);
    }
    save();return {ok:true,item,remaining:profile.consumables[id]};
  }
  // Compatibility with old settings/store callers: always target active hero.
  function equipHelmet(id){return setCharacterGear(profile.selectedCharacter,'helmet',id);}
  function armBubble(id){return setCharacterSlot(profile.selectedCharacter,0,id);}
  function startLoadout(){
    const wardrobe=wardrobeOf(profile.selectedCharacter);
    const id=wardrobe?.gear?.helmet;
    const helmet=ITEM_CATALOG.find(x=>x.id===id&&x.kind==='helmet'&&profile.inventory.includes(x.id));
    return {
      bubbleSeconds:0,bubbleColor:null,bubbleName:'',
      quickSlots:wardrobe?.quickSlots?.slice(0,2)||[null,null],
      helmetId:helmet?.id||null,helmetHits:helmet?.hits||0
    };
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
  window.HellSystems={TEST_MODE,ACTOR_CATALOG,SKIN_CATALOG,actorName,skinsFor,selectActor,equipSkin,purchaseSkin,ownsSkin,profile,save,setting,awardRun,levelProgress,levelFromDepth,threshold,CHARACTER_CATALOG,ITEM_CATALOG,MUSIC_SLOTS,audio,purchase,purchaseCharacter,ownsCharacter,characterStats,selectCharacter,wardrobeOf,setCharacterSlot,setCharacterGear,consumeCharacterSlot,equipHelmet,armBubble,startLoadout};
})();