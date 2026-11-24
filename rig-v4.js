/* HELL DROP · Modular Costume Rig V4 — free pure Canvas 2D, Android WebView-compatible.
 * Same timeline and 2-bone foot IK for EVERY combination; clothing changes render assets only.
 * Art is one self-contained 4x3 transparent atlas: 4 heads, 2 torsos, 2 arms, 2 legs, 2 capes.
 */
'use strict';
(()=>{
 const TILE=384,TAU=Math.PI*2;
 const PART={boy:0,girl:1,frog:2,cat:3,head_boy:0,head_girl:1,head_frog:2,head_cat:3,
 rogue:4,teal:5,torso_rogue:4,torso_teal:5,armR:6,armL:7,legL:8,legR:9,
 leg_left:8,leg_right:9,red:10,blue:11,cape_red:10,cape_teal:11};
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const smooth=(v)=>{const x=clamp(v);return x*x*(3-2*x)};
 const lerp=(a,b,v)=>a+(b-a)*v;
 const keys=[0,.11,.22,.34,.54,.75,.9,1];
 const keyposes=[
  {torso:-.06,arms:1.25,legs:.55,knee:.1,head:.02,fold:0,drop:0},
  {torso:-.28,arms:.62,legs:.22,knee:.8,head:.18,fold:.4,drop:9},
  {torso:-.45,arms:1.7,legs:1.1,knee:1.04,head:.16,fold:.52,drop:13},
  {torso:.10,arms:2.12,legs:.92,knee:.4,head:-.12,fold:.43,drop:-21},
  {torso:.12,arms:1.65,legs:1.3,knee:.55,head:-.24,fold:.12,drop:-29},
  {torso:.13,arms:1.7,legs:.78,knee:.75,head:.07,fold:0,drop:-17},
  {torso:-.38,arms:.9,legs:.7,knee:.72,head:.18,fold:.2,drop:6},
  {torso:0,arms:1.15,legs:.55,knee:.1,head:0,fold:0,drop:0}
 ];
 const labels=['벽에 접근','다리 접기','발 고정 · 강하게 밀기','도약','공중 회전','망토 다시 펼침','착지 준비','자세 복귀'];
 const atlas=new Image();atlas.src='rigv4-kit.webp';
 function getPose(mode,time,progress,from){
  const drift=Math.sin(time*5.5),wobble=Math.sin(time*9.2),p={};
  const fast=mode==='fast',dead=mode==='hit',jump=mode==='jump';
  p.torso=fast?-.19+.035*drift:.025*drift;
  p.arm=fast?.22+drift*.05:1.24+drift*.075;
  p.leg=fast?.13+wobble*.03:.58+wobble*.09;
  p.knee=fast?-.22:.17;
  p.head=fast?.03:drift*.045;
  p.fold=fast?.85:0;
  p.drop=drift*2;
  p.progress=progress;
  p.plant=0;
  p.label=fast?'고속 낙하 · 몸을 모음':'일반 낙하 · 망토 펼침';
  if(dead){Object.assign(p,{torso:1,arm:1.7,leg:.8,knee:.9,head:.4,fold:.2,label:'피격 · 관절 이완'})}
  if(jump){
   let i=0;while(i<keys.length-2&&progress>keys[i+1])i++;
   const u=smooth((progress-keys[i])/(keys[i+1]-keys[i]));
   const x=keyposes[i],y=keyposes[i+1];
   for(const k of ['torso','arms','legs','knee','head','fold','drop'])p[k==='arms'?'arm':k==='legs'?'leg':k]=lerp(x[k],y[k],u);
   // One whole turn, finished before the arrival frame.
   p.torso+=(from==='L'?1:-1)*TAU*smooth((progress-.24)/.53);
   p.plant=smooth((progress-.08)/.085)*(1-smooth((progress-.215)/.10));
   p.label=labels[i];
  }
  return p;
 }
 function limbIK(ax,ay,tx,ty,L1,L2,bend){
  let dx=tx-ax,dy=ty-ay;const d0=Math.hypot(dx,dy)||1;
  const d=clamp(d0,Math.abs(L1-L2)+.01,L1+L2-.01);
  dx/=d0;dy/=d0;
  const a=(L1*L1-L2*L2+d*d)/(2*d), h=Math.sqrt(Math.max(0,L1*L1-a*a));
  return {kx:ax+dx*a-dy*h*bend,ky:ay+dy*a+dx*h*bend,
   fx:ax+dx*d,fy:ay+dy*d,error:Math.max(0,d0-(L1+L2))};
 }
 function draw(ctx,config){
  const {x,y,scale=1,time=0,mode='normal',progress=0,from='L',look={}}=config;
  const style={head:'boy',outfit:'rogue',cape:'red',boots:'gold',bracelet:'gold',brooch:'star',...look};
  const pose=getPose(mode,time,progress,from);
  const show=atlas.complete&&atlas.naturalWidth;
  if(!show)return pose;
  const tile=(id,dx,dy,w,h)=>{
   const n=typeof id==='number'?id:PART[id];if(n==null)return;
   ctx.drawImage(atlas,(n%4)*TILE,Math.floor(n/4)*TILE,TILE,TILE,dx,dy,w,h);
  };
  const framed=(id,x0,y0,w,h,ang=0)=>{ctx.save();ctx.translate(x0,y0);ctx.rotate(ang);tile(id,-w*.5,-h*.5,w,h);ctx.restore()};
  function sparkle(cx,cy,rad,color){ctx.save();ctx.translate(cx,cy);ctx.shadowColor=color;ctx.shadowBlur=10;ctx.fillStyle=color;
   ctx.beginPath();ctx.moveTo(0,-rad);ctx.quadraticCurveTo(rad*.28,-rad*.28,rad,0);ctx.quadraticCurveTo(rad*.28,rad*.28,0,rad);ctx.quadraticCurveTo(-rad*.28,rad*.28,-rad,0);ctx.quadraticCurveTo(-rad*.28,-rad*.28,0,-rad);ctx.fill();ctx.restore()}
  function wristGem(side,angle){
   if(style.bracelet==='none')return;
   ctx.save();ctx.translate(side*94,-12);ctx.rotate(-side*angle);
   const g=ctx.createLinearGradient(-9,-5,9,8);
   g.addColorStop(0,'#f6e0a2');g.addColorStop(.48,'#a56a27');g.addColorStop(1,'#41314a');
   ctx.strokeStyle=g;ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(0,0,13,8,side*.25,0,TAU);ctx.stroke();
   if(style.bracelet==='crystal'){sparkle(0,-3,8,'#75f5f6')}else{sparkle(0,-4,6,'#ffdfa0')}
   ctx.restore();
  }
  function brooch(){
   if(style.brooch==='none')return;
   ctx.save();ctx.translate(0,-68);
   const g=ctx.createRadialGradient(-3,-3,2,0,0,13);
   if(style.brooch==='crystal'){g.addColorStop(0,'#e2ffff');g.addColorStop(.5,'#38dce9');g.addColorStop(1,'#134658')}
   else {g.addColorStop(0,'#fff6ce');g.addColorStop(.5,'#edbd65');g.addColorStop(1,'#876038')}
   ctx.fillStyle=g;ctx.strokeStyle='#6a3c31';ctx.lineWidth=2;
   ctx.beginPath();ctx.arc(0,0,11,0,TAU);ctx.fill();ctx.stroke();sparkle(0,0,6,'#fff5d5');ctx.restore();
  }
  function cape(side){
   if(style.cape==='none')return;
   ctx.save();ctx.translate(side*57,-65);
   const wind=Math.sin(time*(mode==='fast'?13:8)+side)*.08;
   ctx.rotate(-side*(.06+wind+(mode==='jump'?.16*Math.sin(Math.PI*progress):0)));
   if(side===1)ctx.scale(-1,1);
   ctx.scale(1-pose.fold*.54,1+pose.fold*.15);
   // The atlas cape clasp is on its right edge, so both wings share one anchor rule.
   tile(style.cape==='blue'?'cape_teal':'cape_red',-210,-22,217,194);
   ctx.restore();
  }
  // more accurate body-space IK, calculated only while foot presses the wall.
  const wallX=config.wallX;
  let plantX=0,plantY=0;
  if(mode==='jump'&&wallX!=null&&pose.plant>.001){
   const dx=(wallX-x)/scale,dy=(y+53*scale-(y+pose.drop*scale))/scale;
   const cs=Math.cos(pose.torso),sn=Math.sin(pose.torso);
   plantX=dx*cs+dy*sn;plantY=-dx*sn+dy*cs;
  }
  ctx.save();ctx.translate(x,y+pose.drop*scale);ctx.scale(scale,scale);ctx.rotate(pose.torso);
  if(mode==='hit')ctx.globalAlpha=.92;
  cape(-1);cape(1);
  function leg(side){
   const item=side<0?'leg_left':'leg_right';
   const hip={x:side*37,y:60};
   let ang=-side*pose.leg,kneeAng=-side*pose.knee;
   let knee={x:hip.x-Math.sin(ang)*74,y:hip.y+Math.cos(ang)*74};
   let foot={x:knee.x-Math.sin(ang+kneeAng)*72,y:knee.y+Math.cos(ang+kneeAng)*72};
   if(pose.plant>.002&&side===(from==='L'?-1:1)){
    const tx=lerp(foot.x,plantX,pose.plant),ty=lerp(foot.y,plantY,pose.plant);
    const ik=limbIK(hip.x,hip.y,tx,ty,74,72,-side);
    knee={x:ik.kx,y:ik.ky};foot={x:ik.fx,y:ik.fy};
   }
   // Use TWO actual image segments, knee is a real articulated joint.
   function segment(start,end,imgStart,imgHeight,top){
    const dx=end.x-start.x,dy=end.y-start.y,angle=-Math.atan2(dx,dy);
    const part=PART[item],col=(part%4)*TILE,row=Math.floor(part/4)*TILE;
    ctx.save();ctx.translate(start.x,start.y);ctx.rotate(angle);
    if(style.boots==='teal')ctx.filter='hue-rotate(125deg) saturate(.84)';
    if(style.boots==='black')ctx.filter='saturate(.48) brightness(.9)';
    ctx.drawImage(atlas,col,row+imgStart,TILE,imgHeight,-43,top,86,Math.hypot(dx,dy)+20);
    ctx.restore();
   }
   segment(hip,knee,16,205,-6);
   segment(knee,foot,186,190,-13);
   return foot;
  }
  const footL=leg(-1),footR=leg(1);
  tile(style.outfit==='teal'?'torso_teal':'torso_rogue',-88,-94,176,187);
  function arm(side){
   const id=side<0?'armL':'armR';
   const rot=-side*pose.arm+Math.sin(time*7+side)*.025;
   ctx.save();ctx.translate(side*43,-52);ctx.rotate(rot);
   // Shoulder-to-elbow and elbow-to-wrist are separate painted layers.
   const src=PART[id],col=(src%4)*TILE,row=Math.floor(src/4)*TILE;
   const dx=side<0?-91:-13;
   ctx.drawImage(atlas,col,row,TILE,211,dx,-13,104,92);
   const ex=side*48,ey=73,bend=side*(mode==='fast'?-.30:.14*Math.sin(time*4+side));
   ctx.translate(ex,ey);ctx.rotate(bend);
   ctx.drawImage(atlas,col,row+174,TILE,210,dx-ex,-18,104,104);
   if(style.bracelet!=='none'){
    ctx.save();ctx.translate(side*43,62);
    const grad=ctx.createLinearGradient(-10,-9,9,9);grad.addColorStop(0,'#fff2bd');grad.addColorStop(.4,'#b58745');grad.addColorStop(1,'#472d38');
    ctx.strokeStyle=grad;ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(0,0,13,9,-side*.3,0,TAU);ctx.stroke();
    sparkle(0,-5,style.bracelet==='crystal'?8:5,style.bracelet==='crystal'?'#4ff3ff':'#ffe0a0');
    ctx.restore();
   }
   ctx.restore();
  }
  arm(-1);arm(1);brooch();
  ctx.save();ctx.translate(0,-66);ctx.rotate(pose.head-pose.torso*.14);
  // Head is a single replaceable rendered part; *no hair/helmet overlap*.
  const head=style.head==='girl'?'head_girl':style.head==='frog'?'head_frog':style.head==='cat'?'head_cat':'head_boy';
  tile(head,-100,-188,200,193);
  ctx.restore();
  ctx.restore();
  return {...pose,feet:[footL,footR]};
 }
 window.HellRigV4={atlas,PART,draw,getPose,limbIK,VERSION:'4.0'};
})();
