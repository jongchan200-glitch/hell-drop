'use strict';
/* HELL FALL v0.4 — stable local progress and detachable soundtrack slots.
   Catalog & paid/rewarded ad connections intentionally disabled until implemented. */
(function(){
  const KEY='hell_fall_profile_v1';
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
  const CHARACTER_CATALOG=[
    {id:'useoi',name:'우서이',description:'첫 번째 탐험가',front:'assets/hero_intro.webp',hasBack:true},
    {id:'uiji',name:'우이지',description:'두 번째 탐험가',front:'assets/uiji_intro.webp',hasBack:false}
  ];
  // Beta balance: the exact prices can be adjusted without changing saved purchases.
  const ITEM_CATALOG=[
    {id:'bubble_10',name:'노란 버블 보호막',kind:'bubble',price:20,seconds:10,color:'#ffe579',icon:'🟡',description:'플레이 중 사용하면 10초 보호'},
    {id:'bubble_20',name:'초록 버블 보호막',kind:'bubble',price:45,seconds:20,color:'#72f3a3',icon:'🟢',description:'플레이 중 사용하면 20초 보호'},
    {id:'bubble_30',name:'빨간 버블 보호막',kind:'bubble',price:80,seconds:30,color:'#ff7787',icon:'🔴',description:'플레이 중 사용하면 30초 보호'},
    {id:'helmet_basic',name:'탐험가 헬멧',kind:'helmet',price:160,hits:1,icon:'🪖',description:'장착 시 매 판 충돌 1회 방어'},
    {id:'helmet_frog',name:'개구리 헬멧',kind:'helmet',price:320,hits:2,icon:'🐸',description:'장착 시 매 판 충돌 2회 방어'}
  ];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
  const int=(v)=>Math.max(0,Math.floor(Number(v)||0));
  function newProfile(){return {coins:0,totalDepth:0,level:1,levelMigration:2,levelBaseDepth:0,levelBaseLevel:1,runs:0,worldCoins:0,inventory:[],selectedCharacter:'useoi',equippedHelmet:null,armedBubble:null,wardrobes:{},consumables:{},settings:{music:DEFAULT_MUSIC,sfx:.32,boostSide:'left',musicDefaultRevision:2},claimed:[]};}
  function load(){let obj={};try{obj=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){/* blocked */}
    const p={...newProfile(),...obj};p.coins=int(p.coins);p.totalDepth=int(p.totalDepth);p.runs=int(p.runs);p.worldCoins=int(p.worldCoins);
    p.inventory=Array.isArray(p.inventory)?p.inventory.filter(x=>typeof x==='string').slice(0,200):[];
    p.claimed=Array.isArray(p.claimed)?p.claimed.filter(x=>typeof x==='string').slice(0,200):[];
    p.selectedCharacter=CHARACTER_CATALOG.some(c=>c.id===obj?.selectedCharacter)?obj.selectedCharacter:'useoi';
    p.equippedHelmet=ITEM_CATALOG.some(x=>x.id===obj?.equippedHelmet&&x.kind==='helmet'&&p.inventory.includes(x.id))?obj.equippedHelmet:null;
    p.consumables={};
    for(const item of ITEM_CATALOG.filter(x=>x.kind==='bubble')){
      const n=Number(obj?.consumables?.[item.id]);
      p.consumables[item.id]=Number.isFinite(n)?Math.max(0,Math.min(99,Math.floor(n))):0;
    }
    // Wardrobes are stored per character. Ownership (quantities) remains global;
    // equipping does NOT spend a consumable, only pressing its in-game button does.
    // Move old armed bubble / worn helmet to the previously selected character once.
    const legacyChar=p.selectedCharacter;
    p.wardrobes={};
    for(const character of CHARACTER_CATALOG){
      const old=obj?.wardrobes?.[character.id]||{};
      const priorSlots=Array.isArray(old.quickSlots)?old.quickSlots:
        (character.id===legacyChar&&Array.isArray(obj?.quickSlots)?obj.quickSlots:
          (character.id===legacyChar?[obj?.armedBubble||null,null]:[null,null]));
      const quickSlots=[0,1].map(i=>{
        const candidate=priorSlots[i];
        return ITEM_CATALOG.some(x=>x.id===candidate&&x.kind==='bubble'&&p.consumables[x.id]>0)?candidate:null;
      });
      const oldGear=old.gear||{};
      const helmetCandidate=oldGear.helmet||(character.id===legacyChar?obj?.equippedHelmet:null);
      const gear={helmet:null,cape:null,shoes:null,pants:null,top:null};
      if(ITEM_CATALOG.some(x=>x.id===helmetCandidate&&x.kind==='helmet'&&p.inventory.includes(x.id)))gear.helmet=helmetCandidate;
      p.wardrobes[character.id]={quickSlots,gear};
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
  function save(){try{localStorage.setItem(KEY,JSON.stringify(profile));return true}catch(_){return false}}
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
    return profile.wardrobes[characterId]||null;
  }
  function purchase(id){
    const item=ITEM_CATALOG.find(x=>x.id===id);
    if(!item)return {ok:false,reason:'판매 준비 중'};
    if(item.kind==='helmet'&&profile.inventory.includes(id))return {ok:false,reason:'이미 보유 중'};
    if(item.kind==='bubble'&&profile.consumables[id]>=99)return {ok:false,reason:'최대 99개까지 보관 가능'};
    if(profile.coins<item.price)return {ok:false,reason:'코인이 부족해요'};
    profile.coins-=item.price;
    if(item.kind==='helmet'){
      profile.inventory.push(id);
    }else if(item.kind==='bubble'){
      profile.consumables[id]=(profile.consumables[id]||0)+1;
    }
    // Purchasing only adds to the warehouse. It never auto-equips or activates.
    save();return {ok:true,item,coins:profile.coins};
  }
  function selectCharacter(id){
    if(!CHARACTER_CATALOG.some(c=>c.id===id))return false;
    profile.selectedCharacter=id;save();return true;
  }
  function setCharacterSlot(characterId,index,itemId){
    const wardrobe=wardrobeOf(characterId);
    if(!wardrobe||!Number.isInteger(index)||index<0||index>1)return false;
    if(itemId!==null){
      const item=ITEM_CATALOG.find(x=>x.id===itemId&&x.kind==='bubble');
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
    const id=wardrobe.quickSlots[index],item=ITEM_CATALOG.find(x=>x.id===id&&x.kind==='bubble');
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
  window.HellSystems={profile,save,setting,awardRun,levelProgress,levelFromDepth,threshold,CHARACTER_CATALOG,ITEM_CATALOG,MUSIC_SLOTS,audio,purchase,selectCharacter,wardrobeOf,setCharacterSlot,setCharacterGear,consumeCharacterSlot,equipHelmet,armBubble,startLoadout};
})();