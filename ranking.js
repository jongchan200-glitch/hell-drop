'use strict';
// Local demonstration adapter; no network, authentication, real player records or Firebase.
// Future server adapter supplies immutable dated snapshots and validates submissions.
// Local demo IDs and records are untrusted and must NEVER be uploaded as verified scores.
(function(){
 const store=window.HellPlatform.storage, key='hell_drop_rank_local_v1';
 let state={nickname:'',snapshot:null,previous:null};
 try{const v=JSON.parse(store.read(key)||'null');if(v&&typeof v==='object')state={...state,...v};}catch(_){}
 const clean=v=>String(v??'').trim().normalize('NFC');
 const valid=v=>{const s=clean(v);return [...s].length>=2&&[...s].length<=16&&!/[\x00-\x1f\x7f<>]/u.test(s);};
 const nickname=()=>valid(state.nickname)?clean(state.nickname):'';
 function register(v){if(!valid(v))return false;const n={...state,nickname:clean(v)};if(!store.write(key,JSON.stringify(n)))return false;state=n;return true;}
 const date=(now=Date.now())=>new Date(now+9*3600000).toISOString().slice(0,10);
 const yesterday=day=>new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 const names=['지옥의왕','불꽃기사','낙하천재','검은날개','별빛','폭풍','심연의빛','달빛여행','바람','눈꽃','검은별','가을','은하수','초승달','모험가','금빛날개','무지개','새벽','푸른불꽃','겨울바람','밤하늘','지층탐험가','돌개바람','하늘','천둥'];
 const skinIds=['starter_boy','starter_girl','uiji','useoi','wingsuit_boy','wingsuit_girl','pajama_boy','pajama_girl'];
 function mock(day){const d=Date.parse(day+'T00:00:00Z')/86400000;return names.map((nickname,i)=>({id:'demo-'+i,nickname,depth:Math.max(500,Math.min(48000,46500-i*1750+((d*(i+3)*71)%3000+3000)%3000)),skin:skinIds[i%skinIds.length],pet:[null,'winter','coco','baby_dragon'][i%4],level:Math.max(1,53-i*2),demo:true}));}
 function ordered(rows){return rows.slice().sort((a,b)=>b.depth-a.depth||a.id.localeCompare(b.id)).map((x,i)=>({...x,rank:i+1}));}
 function getSnapshot(me,now=Date.now()){
  const day=date(now);
  if(state.snapshot?.day===day)return state.snapshot;
  const own={id:'local-me',nickname:nickname(),depth:Math.max(0,Math.min(48000,Math.floor(Number(me.depth)||0))),skin:me.skin,pet:me.pet||null,level:Math.max(1,Math.floor(Number(me.level)||1)),demo:false};
  const prev=state.snapshot?.day===yesterday(day)?state.snapshot:null;
  const prior=prev?Object.fromEntries(prev.rows.map(r=>[r.id,r.rank])):{};
  const rows=ordered([...mock(day),own]).map(r=>({...r,change:prior[r.id]==null?null:prior[r.id]-r.rank,newEntry:!!prev&&prior[r.id]==null}));
  const snapshot={day,rows,mode:'demo',previousDay:prev?.day||null};const next={...state,snapshot,previous:prev};
  if(store.write(key,JSON.stringify(next)))state=next;
  return snapshot;
 }
 const provider=Object.freeze({mode:'local-demo',register,nickname,getSnapshot});
 window.HellRanking=Object.freeze({provider,date,valid,ordered});
})();