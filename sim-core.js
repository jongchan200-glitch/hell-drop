'use strict';
/** HELL FALL experimental simulation only. Pure and repeatable; no progress writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HellSimCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
const ZONES=['지표면 · 지하 동굴','깊은 암반층','마그마 지대','맨틀 지대','외핵','내핵','지옥의 심연'];
const BOUNDS=[0,18000,50000,105000,185000,300000,450000,635000];
const CLOCK_GAPS=[1150,1650,2250,3100,3850,3750,4500];
const CLOCK_BONUS=[3.75,3.45,3.18,3.02,2.86,2.78,2.64];
const PROFILES={
 perfect:{name:'최고속도 · 장비 사용',description:'초당 6회 연타 · 시계 전부 노림 · 마지막 구역에 보조장비 적용',rates:[6,6,6,6,6,6,6],gear:true,missFirst:0},
 noGear:{name:'최고속도 · 장비 없음',description:'같은 최고속도지만 마지막 구역 장비 없이 도전',rates:[6,6,6,6,6,6,6],gear:false,missFirst:0},
 medium:{name:'초반 중속 · 시계 2개 놓침',description:'초반 중속으로 시계 2개를 놓치고 점차 연타를 높임',rates:[4.85,5.05,5.3,5.6,5.85,6,6],gear:false,missFirst:2},
 normal:{name:'일반 플레이어',description:'엄지 연타 4.4~5.3회/초 · 장비 없음 · 코인 수집',rates:[4.4,4.6,4.8,4.9,5.0,5.15,5.3],gear:false,missFirst:0}
};
function zoneOf(d){for(let i=0;i<7;i++)if(d<BOUNDS[i+1])return i;return 6;}
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function seedRandom(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
const rand=seedRandom(20261122);
function buildWorld(){const clocks=[],coins=[],hazards=[];let d=740,n=0;
 while(d<BOUNDS[7]){const z=zoneOf(d);clocks.push({depth:Math.round(d),wall:(rand()<.5?'L':'R'),id:n++});d+=CLOCK_GAPS[z]*(.94+rand()*.12);}
 d=250;n=0;while(d<BOUNDS[7]){const z=zoneOf(d);coins.push({depth:Math.round(d),wall:rand()<.5?'L':'R',id:n++,value:1+Math.floor(rand()*3)});d+=(360+rand()*430)*(z>=5?1.25:1);}
 d=900;n=0;while(d<BOUNDS[7]){const z=zoneOf(d);const gap=(680+z*155)*(1+rand()*.8);
  if(!clocks.some(c=>Math.abs(c.depth-d)<Math.max(430,gap*.52))){hazards.push({depth:Math.round(d),wall:rand()<.5?'L':'R',id:n++,kind:(n+z)%4});}
  d+=gap;
 }
 return {clocks,coins,hazards};
}
const WORLD=buildWorld();
function simulate(profileName='perfect'){
 const p=PROFILES[profileName]||PROFILES.perfect, dt=.05, snapshots=[];
 let depth=0,speed=124,boost=0,timeLeft=10,elapsed=0,wall='L',fromWall='L',hopProgress=1,lastHop=-1e3;
 let ci=0,oi=0,mi=0,coins=0,clocks=0,missed=0,crashes=0,missedFirst=0,ended=false,won=false,endReason='';
 let lastEvent='준비 완료', lastKind='start';
 let prevZone=0;
 const maxStep=15000;
 function record(){snapshots.push({t:+elapsed.toFixed(2),depth:+depth.toFixed(1),speed:+speed.toFixed(1),boost:+boost.toFixed(3),time:+timeLeft.toFixed(2),wall,fromWall,hopProgress:+hopProgress.toFixed(2),coins,clocks,missed,crashes,zone:zoneOf(depth),event:lastEvent,eventKind:lastKind});}
 record();
 for(let step=1;step<maxStep&&!ended;step++){
  const z=zoneOf(depth),rate=p.rates[z],tapDemand=clamp((rate-1)/5,0,1);
  const desiredBoost=Math.pow(tapDemand,1.45),r=desiredBoost>boost?1.7:4.8;
  boost+= (desiredBoost-boost)*(1-Math.exp(-r*dt));
  const tier=Math.min(17,Math.floor(depth/2000));
  const desiredSpeed=Math.min(1560,112+tier*8+(510+tier*35)*Math.pow(boost,1.15));
  speed+=(desiredSpeed-speed)*(1-Math.exp(-(desiredSpeed>speed?4.25:2.6)*dt));
  const movement=speed*dt, next=depth+movement;
  // Rule-based autonomous pilot: prioritize survival, then clocks, then coins.
  // Decisions are constrained by a 0.155s wall jump and a 0.36s reaction interval.
  if(elapsed-lastHop>=.36&&hopProgress>=1){
   const reach=Math.max(450,speed*1.25),nearClock=WORLD.clocks[ci];
   const upcomingClock=nearClock&&nearClock.depth>depth&&nearClock.depth-depth<reach&&!(z===0&&missedFirst<p.missFirst);
   const hazard=WORLD.hazards[oi],danger=hazard&&hazard.depth>depth&&hazard.depth-depth<Math.max(390,speed*.73)&&hazard.wall===wall;
   let preferred=wall;
   if(danger)preferred=wall==='L'?'R':'L';
   else if(upcomingClock){preferred=nearClock.wall;
    // Do not switch onto a lethal obstacle positioned before the target clock.
    if(hazard&&hazard.wall===preferred&&hazard.depth<nearClock.depth&&hazard.depth-depth<speed*.62)preferred=wall;
   }else{
    // Coins are collected opportunistically. Safety and clocks take precedence.
    preferred=wall;
   }
   if(preferred!==wall){fromWall=wall;wall=preferred;hopProgress=0;lastHop=elapsed;}
  }
  hopProgress=Math.min(1,hopProgress+dt/.155);
  timeLeft=Math.max(0,timeLeft-dt);
  while(ci<WORLD.clocks.length&&WORLD.clocks[ci].depth<=next){const c=WORLD.clocks[ci++];
    if(z===0&&missedFirst<p.missFirst){missedFirst++;missed++;lastEvent='시계 일부러 놓침';lastKind='miss';}
    else if(wall===c.wall&&hopProgress>=.75){const zz=zoneOf(c.depth),add=CLOCK_BONUS[zz]+(p.gear&&zz===6?.74:0);timeLeft=Math.min(10,timeLeft+add);clocks++;lastEvent='⏱ 시계 +'+add.toFixed(2)+'초';lastKind='clock';}
    else {missed++;lastEvent='시계 획득 실패';lastKind='miss';}
  }
  while(mi<WORLD.coins.length&&WORLD.coins[mi].depth<=next){const c=WORLD.coins[mi++];if(wall===c.wall&&hopProgress>=.6){coins+=c.value;lastEvent='🪙 코인 +'+c.value;lastKind='coin';}}
  while(oi<WORLD.hazards.length&&WORLD.hazards[oi].depth<=next){const o=WORLD.hazards[oi++];if(wall===o.wall&&hopProgress>=.4){crashes++;ended=true;endReason='장애물 충돌';lastEvent='장애물 충돌!';lastKind='crash';break;}}
  depth=next;elapsed+=dt;
  if(zoneOf(depth)!==prevZone){prevZone=zoneOf(depth);lastEvent=(prevZone+1)+'구역 진입';lastKind='zone';}
  if(depth>=BOUNDS[7]){depth=BOUNDS[7];won=true;ended=true;endReason='최종 클리어';lastEvent='🏆 지옥 낙하 클리어!';lastKind='win';}
  if(timeLeft<=0&&!won){ended=true;endReason='시간 초과';lastEvent='시간 초과!';lastKind='time';}
  if(step%2===0||ended)record();
 }
 return {profile:profileName,info:p,frames:snapshots,world:WORLD,won,reason:endReason,endedAt:elapsed,endDepth:depth,clocks,missed,coins,crashes};
}
return {ZONES,BOUNDS,CLOCK_GAPS,CLOCK_BONUS,PROFILES,WORLD,zoneOf,simulate};
});