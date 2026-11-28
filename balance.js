'use strict';
/* WEB 3.3: shared production physics + deterministic ideal time-budget check.
 * Internal units remain unchanged for save compatibility and visuals; 10 units = 1 displayed meter.
 * Gate depths are deterministic, their walls and hazards remain randomized. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HellBalance=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const T=Object.freeze({LIMIT:42,MAX:1560,START:124,GLIDE:112,GLIDE_TIER:8,BOOST_SPEED:510,BOOST_TIER:35,MIN_TAP_INTERVAL:.055,TAP_RATE_BASE:.8,TAP_RATE_RANGE:4,RISE_RESPONSE:1.2,FALL_RESPONSE:6.7,HOP_SECONDS:.155});
 const BOUNDS=Object.freeze([0,30000,80000,140000,210000,285000,365000,480000]);
 const CLEAR_DEPTH=BOUNDS[7], SCALE=10;
 const CHECKPOINT_GAPS=Object.freeze([4000,5200,5500,6000,6500,4200,5000]);
 const CHECKPOINT_BONUS=Object.freeze([4.5,3.3,3.2,3,.45,.7,.6]);
 const CLOCK_GAPS=Object.freeze([3600,4200,4500,4800,5000,3200,3600]);
 const CLOCK_BONUS=Object.freeze([3,3,3,3,.60,1.45,1.28]);
 const FIRST_LINE=1450,FIRST_CLOCK=900;
 function zoneOf(d){let z=0;while(z<6&&d>=BOUNDS[z+1])z++;return z;}
 function tierOf(d){return Math.min(17,Math.floor(Math.max(0,d)/2000));}
 function distance(d){return Math.floor(Math.max(0,Number(d)||0)/SCALE);}
 function reward(seconds,percent=0){return Math.round(seconds*(1+percent/100)*100)/100;}
 function speedStep(depth,speed,oldBoost,rate,stats,dt){
   const demand=Math.max(0,Math.min(1,(rate-T.TAP_RATE_BASE)/T.TAP_RATE_RANGE)),targetBoost=Math.pow(demand,1.55);
   const responseBoost=targetBoost>oldBoost?T.RISE_RESPONSE*(1+(stats.accel||0)/100):T.FALL_RESPONSE*(stats.brake/70);
   const boost=oldBoost+(targetBoost-oldBoost)*(1-Math.exp(-responseBoost*dt));
   const tier=tierOf(depth),ratio=stats.speed/70;
   const target=Math.min(T.MAX*ratio,T.GLIDE+tier*T.GLIDE_TIER+(T.BOOST_SPEED+tier*T.BOOST_TIER)*Math.pow(boost,1.15)*ratio);
   const response=target>speed?4.25*(1+(stats.accel||0)/100):2.6*(stats.brake/70);
   return {boost,speed:speed+(target-speed)*(1-Math.exp(-response*dt))};
 }
 function simulateIdeal({speed=60,brake=70,timeBonus=0,clockRate=1,taps=6}={}){
   const lines=[],clocks=[];
   for(let d=FIRST_LINE;d<CLEAR_DEPTH;d+=CHECKPOINT_GAPS[zoneOf(d)])lines.push({depth:d,bonus:CHECKPOINT_BONUS[zoneOf(d)]});
   for(let d=FIRST_CLOCK;d<CLEAR_DEPTH;d+=CLOCK_GAPS[zoneOf(d)])if(!lines.some(g=>Math.abs(g.depth-d)<200))clocks.push({depth:d,bonus:CLOCK_BONUS[zoneOf(d)]});
   let depth=0,v=T.START,boost=0,left=T.LIMIT,t=0,li=0,ci=0,credits=0,taken=0,missed=0,checkpoints=0;
   const boundaries=[];let nz=1,dt=1/60;
   for(let i=0;i<60*900;i++){
     const old=depth,start=left,step=speedStep(depth,v,boost,t>=1/taps?taps:0,{speed,brake},dt);
     depth+=(v+step.speed)*.5*dt;v=step.speed;boost=step.boost;left=Math.max(0,left-dt);
     while(li<lines.length&&lines[li].depth<=depth){const g=lines[li++];if(start>dt*(g.depth-old)/Math.max(.001,depth-old)){left=Math.min(T.LIMIT,left+reward(g.bonus,timeBonus));checkpoints++;}}
     while(ci<clocks.length&&clocks[ci].depth<=depth){const g=clocks[ci++];credits+=clockRate;if(credits>=1-1e-8&&start>dt*(g.depth-old)/Math.max(.001,depth-old)){credits-=1;left=Math.min(T.LIMIT,left+reward(g.bonus,timeBonus));taken++;}else missed++;}
     t+=dt;
     while(nz<BOUNDS.length&&depth>=BOUNDS[nz]){boundaries.push({depth:distance(BOUNDS[nz]),seconds:+t.toFixed(2),left:+left.toFixed(2)});nz++;}
     if(left<=0||depth>=CLEAR_DEPTH)break;
   }
   return {depth:distance(Math.min(depth,CLEAR_DEPTH)),seconds:+t.toFixed(2),remaining:+left.toFixed(2),won:depth>=CLEAR_DEPTH&&left>0,taken,missed,checkpoints,boundaries};
 }
 return {T,BOUNDS,CLEAR_DEPTH,SCALE,CHECKPOINT_GAPS,CHECKPOINT_BONUS,CLOCK_GAPS,CLOCK_BONUS,FIRST_LINE,FIRST_CLOCK,zoneOf,tierOf,distance,reward,speedStep,simulateIdeal};
});
