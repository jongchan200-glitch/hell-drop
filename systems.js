'use strict';
/* HELL FALL v0.4 — stable local progress and detachable soundtrack slots.
   Catalog & paid/rewarded ad connections intentionally disabled until implemented. */
(function(){
  const KEY='hell_fall_profile_v1';
  const DEFAULT_MUSIC=.07; // 7%: quiet ambience on first launch; slider remains 0–100%.
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
  const ITEM_CATALOG=[]; // Future in-game items: {id,name,price,type,description,effect}
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
  const int=(v)=>Math.max(0,Math.floor(Number(v)||0));
  function newProfile(){return {coins:0,totalDepth:0,level:1,runs:0,worldCoins:0,inventory:[],settings:{music:DEFAULT_MUSIC,sfx:.32,boostSide:'left',musicDefaultRevision:1},claimed:[]};}
  function load(){let obj={};try{obj=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){/* blocked */}
    const p={...newProfile(),...obj};p.coins=int(p.coins);p.totalDepth=int(p.totalDepth);p.runs=int(p.runs);p.worldCoins=int(p.worldCoins);
    p.inventory=Array.isArray(p.inventory)?p.inventory.filter(x=>typeof x==='string').slice(0,200):[];
    p.claimed=Array.isArray(p.claimed)?p.claimed.filter(x=>typeof x==='string').slice(0,200):[];
    // Prior builds saved the old default (26%) into profiles even without visiting settings.
    // Migrate that untouched default once. Preserve all other custom music choices and
    // do not alter gameplay coins, records, levels, effects volume or control layout.
    const oldSettings=obj?.settings||{};
    const oldMusic=oldSettings.music;
    const isOldDefault=oldSettings.musicDefaultRevision!==1
      && (oldMusic==null||Number(oldMusic)===.26);
    p.settings={
      music:clamp(isOldDefault?DEFAULT_MUSIC:(oldMusic??DEFAULT_MUSIC),0,1),
      sfx:clamp(oldSettings.sfx??.32,0,1),
      boostSide:oldSettings.boostSide==='right'?'right':'left',
      musicDefaultRevision:1
    };
    p.level=levelFromDepth(p.totalDepth);return p;
  }
  let profile=load();
  function save(){try{localStorage.setItem(KEY,JSON.stringify(profile));return true}catch(_){return false}}
  function threshold(level){const n=Math.max(0,level-1);return 2400+n*1700+n*n*190;}
  function levelFromDepth(distance){let lv=1,remain=int(distance);while(lv<1000&&remain>=threshold(lv)){remain-=threshold(lv);lv++}return lv;}
  function levelProgress(distance){let remain=int(distance);for(let lv=1;lv<1000;lv++){const need=threshold(lv);if(remain<need)return {level:lv,within:remain,next:need,ratio:remain/need};remain-=need}return {level:1000,within:0,next:1,ratio:1};}
  function awardRun(distance,foundCoins){distance=int(distance);foundCoins=int(foundCoins);const old=profile.level;
    profile.totalDepth+=distance;profile.runs++;profile.worldCoins+=foundCoins;
    profile.level=levelFromDepth(profile.totalDepth);
    let bonus=0;for(let lv=old+1;lv<=profile.level;lv++)bonus+=8+4*lv;
    profile.coins+=foundCoins+bonus;save();return {distance,foundCoins,bonus,levelUps:profile.level-old,level:profile.level,newBalance:profile.coins};
  }
  function purchase(id){const item=ITEM_CATALOG.find(x=>x.id===id);if(!item)return {ok:false,reason:'판매 준비 중'};
    if(profile.inventory.includes(id))return {ok:false,reason:'이미 보유'};
    if(profile.coins<item.price)return {ok:false,reason:'코인이 부족해요'};
    profile.coins-=item.price;profile.inventory.push(id);save();return {ok:true,item};
  }
  function setting(name,value){
    if(name==='boostSide'){profile.settings.boostSide=value==='right'?'right':'left';save();return;}
    if(!['music','sfx'].includes(name))return;profile.settings[name]=clamp(value,0,1);save();
  }
  const audio={ctx:null,lastTapSound:0,bgm:null,previous:null,activeTrack:-1,fadeTime:0,
    async unlock(){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      if(!this.ctx)this.ctx=new C();if(this.ctx.state==='suspended')try{await this.ctx.resume()}catch(_){/* muted */}},
    effect(name){const ctx=this.ctx;if(!ctx||ctx.state!=='running'||profile.settings.sfx===0)return;
      const now=ctx.currentTime;if(name==='tap'&&now-this.lastTapSound<.13)return;
      if(name==='tap')this.lastTapSound=now;
      const params={tap:[305,180,.045,.17],jump:[430,650,.17,.27],coin:[840,1170,.19,.32],clock:[720,910,.22,.29],hit:[205,69,.28,.33],level:[540,1060,.34,.30],start:[470,685,.19,.23]};
      const [f1,f2,duration,amount]=params[name]||params.tap;
      try{const os=ctx.createOscillator(),gain=ctx.createGain();os.type=name==='hit'?'triangle':'sine';os.frequency.setValueAtTime(f1,now);os.frequency.exponentialRampToValueAtTime(Math.max(50,f2),now+duration);gain.gain.setValueAtTime(.00001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,profile.settings.sfx*amount),now+.01);gain.gain.exponentialRampToValueAtTime(.00001,now+duration);os.connect(gain).connect(ctx.destination);os.start(now);os.stop(now+duration+.02)}catch(_){/* no device audio */}
    },
    playZone(zone){const idx=Math.max(0,Math.min(7,zone+1));if(idx===this.activeTrack)return;
      const slot=MUSIC_SLOTS[idx];this.activeTrack=idx;this.fadeTime=0;
      // A fast double switch should not leave a third track playing behind the scenes.
      if(this.previous){this.previous.pause();this.previous=null;}
      this.previous=this.bgm;this.bgm=null;
      if(slot?.ready){try{
        const track=new Audio(slot.file);track.loop=true;track.preload='metadata';track.volume=0;
        track.setAttribute('playsinline','');track.play().catch(()=>{});this.bgm=track;
      }catch(_){/* audio disabled */}}
    },
    fade(dt){this.fadeTime+=dt;const t=clamp(this.fadeTime/2.2,0,1);
      if(this.bgm)this.bgm.volume=clamp(profile.settings.music*t,0,1);
      if(this.previous){this.previous.volume=clamp(profile.settings.music*(1-t),0,1);if(t>=1){this.previous.pause();this.previous=null}}
    },
    stop(){this.activeTrack=-1;if(this.bgm){this.bgm.pause();this.bgm=null}if(this.previous){this.previous.pause();this.previous=null}},
    visibility(hidden){if(hidden){this.bgm?.pause();this.previous?.pause()}else if(this.bgm)this.bgm.play().catch(()=>{})}
  };
  // The actual reward provider must validate the completed impression before calling this.
  // No fake ad credits, real-money checkout, or automatic reward bypass exists in v0.4.
  window.HellSystems={profile,save,setting,awardRun,levelProgress,levelFromDepth,threshold,ITEM_CATALOG,MUSIC_SLOTS,audio,purchase};
})();