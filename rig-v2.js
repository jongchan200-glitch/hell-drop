'use strict';
/* Original Hell Fall movement-compatible modular mascot; no external SDK. */
(()=>{
let ctx=null,t=0,LOOK=null;
const min=(v,a,b)=>Math.min(b,Math.max(a,v));
const ease=v=>{v=min(v,0,1);return v*v*(3-2*v)};
const mix=(a,b,v)=>a+(b-a)*v;
 function drawPath(points,color,stroke='#1d2737',lineWidth=2.7){ctx.beginPath();for(let i=0;i<points.length;i++){const [x,y]=points[i];i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke()}}
 function outline(fill,stroke='#233041',width=3){ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke()}}
 function circle(x,y,r,fill,stroke,width=2){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);outline(fill,stroke,width)}
 function ellipse(x,y,rx,ry,fill,stroke,width=2){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);outline(fill,stroke,width)}
 function rounded(x,y,ww,hh,r,fill,stroke,width=2.6){ctx.beginPath();ctx.roundRect(x,y,ww,hh,r);outline(fill,stroke,width)}
 function gradient(a,b,y0,y1){const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,a);g.addColorStop(1,b);return g}
 function line(points,color,width=2){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke()}
 function star(x,y,size,fill){ctx.save();ctx.translate(x,y);ctx.rotate(t*.07);ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?size*.42:size;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.restore()}
 function withJoint(x,y,rot,paint){ctx.save();ctx.translate(x,y);ctx.rotate(rot);paint();ctx.restore()}
 const STYLES={
  explorer:{main:'#3dacae',mid:'#70e2d0',shade:'#1f5f76',trim:'#f8d091',pants:'#2c7185',cuff:'#c9d9c7',badge:'#fbe6ac'},
  pilot:{main:'#d96c59',mid:'#ffba77',shade:'#7f4054',trim:'#ffe0a3',pants:'#8a4857',cuff:'#f3d0a7',badge:'#fff0c4'},
  star:{main:'#7772c8',mid:'#c4acff',shade:'#453e81',trim:'#ead1ff',pants:'#5e579c',cuff:'#e6d8ff',badge:'#f6e3b3'}
 };
 const MASCOTS={
  cat:{base:'#f7bb6b',high:'#ffdf9c',shade:'#d57e62',inner:'#f2a4a2',eye:'#283a4a',muzzle:'#fff3d9'},
  dog:{base:'#e9b88c',high:'#ffdfb6',shade:'#c4886c',inner:'#e5a1a2',eye:'#303744',muzzle:'#fff1d7'},
  frog:{base:'#7bcf9a',high:'#c5f2ad',shade:'#429d83',inner:'#8becb5',eye:'#213d47',muzzle:'#dcf6bb'}
 };
 function cape(p,wind){
   if(LOOK.cape==='none')return;
   const hue=LOOK.cape==='red'?['#eb8a83','#af455c','#662e54']:['#7beae0','#33b5bd','#1b657c'];
   const flap=Math.sin(t*6.4)*7+wind*27;
   ctx.save();ctx.translate(0,-63);
   ctx.beginPath();ctx.moveTo(-33,4);ctx.quadraticCurveTo(-60,10,-70-flap*.44,46+wind*22);
   ctx.bezierCurveTo(-67-flap,77+wind*30,-32-flap*.4,94+wind*37,0,70+wind*25);
   ctx.bezierCurveTo(29+flap*.3,98+wind*41,68+flap,78+wind*32,69+flap*.55,41+wind*18);
   ctx.quadraticCurveTo(54,6,33,4);ctx.quadraticCurveTo(0,18,-33,4);ctx.closePath();
   const g=ctx.createLinearGradient(-85,0,85,90);g.addColorStop(0,hue[2]);g.addColorStop(.45,hue[1]);g.addColorStop(1,hue[0]);outline(g,'#243144',3.5);
   ctx.beginPath();ctx.moveTo(-23,15);ctx.quadraticCurveTo(-35,45,-29-flap*.4,74+wind*13);ctx.strokeStyle='#fff7';ctx.lineWidth=3;ctx.stroke();
   ctx.beginPath();ctx.moveTo(29,15);ctx.quadraticCurveTo(47,49,32+flap*.45,83+wind*22);ctx.strokeStyle='#09233048';ctx.lineWidth=3;ctx.stroke();
   line([[-23,4],[0,21],[23,4]],'#ffe7a7',4);
   ctx.restore();
 }
 function torso(style,p){
   // One anatomical torso; its garment is placed inside the SAME spine transform.
   const wobble=Math.sin(t*5.1)*.7;
   ctx.save();ctx.translate(0,wobble);
   ctx.beginPath();ctx.moveTo(-23,-70);ctx.bezierCurveTo(-44,-63,-43,-27,-37,2);ctx.quadraticCurveTo(-36,20,-19,25);ctx.quadraticCurveTo(0,33,19,25);ctx.quadraticCurveTo(37,20,37,2);ctx.bezierCurveTo(43,-27,44,-63,23,-70);ctx.quadraticCurveTo(0,-80,-23,-70);ctx.closePath();
   const g=ctx.createLinearGradient(-38,-62,35,20);g.addColorStop(0,style.mid);g.addColorStop(.46,style.main);g.addColorStop(1,style.shade);outline(g,'#243244',4);
   ctx.beginPath();ctx.moveTo(-18,-57);ctx.quadraticCurveTo(0,-63,19,-57);ctx.lineTo(14,-19);ctx.lineTo(-13,-19);ctx.closePath();ctx.fillStyle='#ffffff1d';ctx.fill();
   ctx.beginPath();ctx.moveTo(-25,-70);ctx.quadraticCurveTo(0,-45,25,-70);ctx.strokeStyle=style.trim;ctx.lineWidth=5;ctx.stroke();
   // Belt follows pelvis instead of floating in world coordinates.
   rounded(-36,4,72,14,4,style.shade,'#203348',2.5);
   rounded(-9,5,18,13,3,style.trim,'#624a4d',1.4);circle(0,12,2.8,'#fff6ce',null);
   if(LOOK.outfit==='explorer'){
      line([[0,-49],[0,-12]],'#e3fff2',2);rounded(-17,-44,15,15,5,'#256a81','#d7dfca',1.7);star(-10,-37,4,style.badge);
      rounded(14,-37,11,16,2,'#20657c','#d3edc7',1.3);line([[16,-33],[23,-33]],'#f9d58f',2);
   }else if(LOOK.outfit==='pilot'){
      line([[-24,-55],[19,-15]],'#ffdda3',7);line([[24,-55],[-19,-15]],'#ffdda3',7);rounded(-10,-43,20,25,6,'#3c7389','#ffe5a4',2);circle(0,-32,5,'#bde7df',null);
   }else{
      star(0,-44,10,'#fbe6b2');star(-22,-21,4,'#eed9fc');star(22,-19,4,'#eed9fc');line([[-17,-2],[17,-2]],'#dfc3ef',2);
   }
   ctx.restore();
 }
 function arm(side,style,ang,elbowAngle){
   withJoint(side*30,-57,ang,()=>{
      ellipse(0,1,13,13,style.main,'#243349',3);
      rounded(-13,1,26,34,12,gradient(style.mid,style.main,0,38),'#283649',3);
      line([[-8,4],[-7,25]],'#fff4',2.5);
      circle(0,34,10,style.cuff,'#29394d',2.5);
      withJoint(0,33,elbowAngle,()=>{
        rounded(-11,-2,22,28,11,gradient(style.main,style.shade,-2,29),'#253547',3);
        rounded(-12,22,24,9,4,style.cuff,'#293547',2);
        ellipse(0,34,14,11,'#f7e6c8','#26394b',2.8);
        circle(4,30,3,'#fff9e8',null);
      });
   });
 }
 function shoe(kind){
   const colors={boots:['#d39b6e','#78566b','#ffe9bd'],sneakers:['#f0e9fa','#748baf','#ffb37d'],jet:['#83edeb','#4273a6','#e7ffff']}[kind];
   ctx.save();ctx.translate(0,24);
   ctx.beginPath();ctx.moveTo(-13,-4);ctx.quadraticCurveTo(-14,8,-19,15);ctx.quadraticCurveTo(-24,24,-10,28);ctx.quadraticCurveTo(1,29,15,25);ctx.quadraticCurveTo(20,16,13,7);ctx.lineTo(12,-4);ctx.closePath();outline(gradient(colors[0],colors[1],-7,27),'#273244',3.5);
   line([[-14,19],[14,19]],'#f2eac9',4);
   if(kind==='jet'){
      rounded(-9,-2,18,7,3,'#ffffffbb',null);star(0,8,5,'#f9e2ac');
      line([[-7,27],[-7,32]],'#8eebfd',3);
   }else if(kind==='sneakers'){line([[-6,6],[6,7]],'#ffe1ae',3);line([[-6,12],[7,12]],'#ffe1ae',2)}
   else{rounded(-10,0,20,8,3,'#f3c28e','#7a5b60',1.5)}
   ctx.restore();
 }
 function leg(side,style,upperRot,kneeRot){
   withJoint(side*19,16,upperRot,()=>{
     ellipse(0,1,12,14,style.pants,'#253445',3);
     rounded(-12,0,24,36,10,gradient(style.main,style.pants,0,38),'#263748',3);
     line([[-8,5],[-7,27]],'#ffffff34',2);
     withJoint(0,33,kneeRot,()=>{
       circle(0,0,11,style.pants,'#29394c',2.4);
       rounded(-11,1,22,29,10,gradient(style.pants,style.shade,0,33),'#26384a',3);
       shoe(LOOK.shoes);
     });
   });
 }
 function maskDraw(kind,p){
   const m=MASCOTS[kind];
   ctx.save();ctx.translate(0,-111);
   ctx.rotate(p.headTilt);
   const bounce=Math.sin(t*8.4)*.7;
   ctx.translate(0,bounce);
   // Decorative ears or eye stalks are anchored to the same skull joint.
   if(kind==='cat'){
     ctx.beginPath();ctx.moveTo(-44,-19);ctx.quadraticCurveTo(-60,-74,-30,-65);ctx.lineTo(-4,-37);ctx.closePath();outline(gradient(m.high,m.base,-70,-12),'#4b414b',4);
     ctx.beginPath();ctx.moveTo(44,-19);ctx.quadraticCurveTo(60,-74,30,-65);ctx.lineTo(4,-37);ctx.closePath();outline(gradient(m.high,m.base,-70,-12),'#4b414b',4);
     drawPath([[-43,-36],[-40,-56],[-27,-42]],m.inner,null);drawPath([[43,-36],[40,-56],[27,-42]],m.inner,null);
   }else if(kind==='dog'){
     // Dark floppy fabric ears behind the head, no hair/skin texture required.
     ellipse(-51,-20,20,33,'#ac735f','#544453',4);
     ellipse(51,-20,20,33,'#ac735f','#544453',4);
     ellipse(-55,-23,8,19,'#e5a7a0',null);ellipse(55,-23,8,19,'#e5a7a0',null);
   }else{
     circle(-36,-42,23,gradient(m.high,m.base,-65,-10),'#305748',4);
     circle(36,-42,23,gradient(m.high,m.base,-65,-10),'#305748',4);
   }
   // Universal head silhouette designed for any mask on this rig.
   ctx.beginPath();ctx.moveTo(-44,-39);ctx.bezierCurveTo(-66,-22,-67,22,-47,40);
   ctx.bezierCurveTo(-25,62,25,62,47,40);ctx.bezierCurveTo(67,22,66,-22,44,-39);
   ctx.bezierCurveTo(24,-58,-24,-58,-44,-39);ctx.closePath();
   const g=ctx.createLinearGradient(-48,-53,36,52);g.addColorStop(0,m.high);g.addColorStop(.48,m.base);g.addColorStop(1,m.shade);outline(g,'#34444e',4.5);
   ctx.beginPath();ctx.ellipse(-16,-27,27,11,-.22,0,Math.PI*2);ctx.fillStyle='#ffffff30';ctx.fill();
   ellipse(-40,17,17,13,'#fff9e228',null);ellipse(40,17,17,13,'#fff9e228',null);
   if(kind==='dog'){
     ellipse(-28,-28,19,10,'#c48c76',null);ellipse(30,-28,19,10,'#c48c76',null);
     ellipse(0,23,32,24,m.muzzle,null);
   }else if(kind==='cat'){
     ellipse(0,28,29,19,m.muzzle,null);
     line([[-46,-6],[-26,-11]],'#db895f',4);line([[46,-6],[26,-11]],'#db895f',4);
   }else{ellipse(0,24,35,20,'#c9f7ac69',null)}
   const squint=p.fast>.78;
   if(squint){
     ctx.beginPath();ctx.moveTo(-37,0);ctx.quadraticCurveTo(-22,-12,-9,0);ctx.moveTo(9,0);ctx.quadraticCurveTo(22,-12,37,0);ctx.strokeStyle=m.eye;ctx.lineWidth=5;ctx.lineCap='round';ctx.stroke();
   }else{
     for(const side of [-1,1]){
       ellipse(side*24,-5,10.8,15,m.eye,'#fff1db',2);
       ellipse(side*21,-10,4.1,6,'#fff',null);
       circle(side*27,-1,2.2,'#fff6ea',null);
     }
   }
   if(kind==='frog'){
     circle(-23,20,6,'#5cb37d70',null);circle(23,20,6,'#5cb37d70',null);
     ctx.beginPath();ctx.arc(0,15,16,.16,Math.PI-.16);ctx.strokeStyle='#376b54';ctx.lineWidth=3.8;ctx.lineCap='round';ctx.stroke();
   }else{
     drawPath([[-6,15],[6,15],[0,21]],kind==='cat'?'#af6572':'#765a58',null);
     ctx.beginPath();ctx.moveTo(0,22);ctx.lineTo(0,27);ctx.quadraticCurveTo(-8,35,-14,26);ctx.moveTo(0,27);ctx.quadraticCurveTo(8,35,14,26);ctx.strokeStyle='#705b56';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.stroke();
     if(kind==='cat'){
       line([[-20,25],[-47,22]],'#775f59',1.8);line([[-19,30],[-47,35]],'#775f59',1.8);
       line([[20,25],[47,22]],'#775f59',1.8);line([[19,30],[47,35]],'#775f59',1.8);
     }
   }
   for(const side of [-1,1]){
     ellipse(side*39,12,8,4,kind==='frog'?'#73c5a084':'#f3aab58a',null);
   }
   // A small clasp at the back edge suggests a wearable full-head costume.
   rounded(-18,43,36,8,4,'#ffe9bd','#786b64',1.5);
   circle(0,47,2.5,'#f9fff8',null);
   ctx.restore();
 }
 function body(p){
   const style=STYLES[LOOK.outfit];
   withJoint(0,0,p.tilt,()=>{
     cape(p,p.fast);
     // The same connected joint hierarchy is shared across masks and outfits.
     leg(-1,style,p.legL,p.kneeL);leg(1,style,p.legR,p.kneeR);
     arm(-1,style,p.armL,p.elbowL);arm(1,style,p.armR,p.elbowR);
     torso(style,p);
     // Neck belongs to this body; head costume covers the whole face/skull.
     rounded(-15,-89,30,22,10,'#e3cbaa','#304050',2.5);
     maskDraw(LOOK.mask,p);
     if(p.jumpActive){
       ctx.save();ctx.globalAlpha=(1-p.jumpProgress)*.45;
       ctx.strokeStyle='#cef9fa';ctx.lineWidth=3;
       ctx.beginPath();ctx.arc(0,-25,107+p.jumpProgress*43,Math.PI*.18,Math.PI*.86);ctx.stroke();ctx.restore();
     }
   });
 }


const KICK_TIMES=[0,.13,.28,.48,.72,1];
const KEYFRAMES=[
 {tilt:0,head:0,armL:.24,armR:-.24,elbowL:0,elbowR:0,legL:0,legR:0,kneeL:0,kneeR:0,drop:0},
 {tilt:-.13,head:.10,armL:.78,armR:-.36,elbowL:-.22,elbowR:.30,legL:.98,legR:-.28,kneeL:-.55,kneeR:.72,drop:12},
 {tilt:.31,head:-.20,armL:1.38,armR:-.85,elbowL:.20,elbowR:-.45,legL:1.42,legR:-.87,kneeL:-.20,kneeR:.98,drop:-12},
 {tilt:.73,head:-.23,armL:-.83,armR:.95,elbowL:-.60,elbowR:.60,legL:-.76,legR:.74,kneeL:1.05,kneeR:-1.08,drop:-18},
 {tilt:.16,head:.05,armL:.53,armR:-.42,elbowL:-.26,elbowR:.20,legL:.33,legR:-.27,kneeL:.54,kneeR:-.48,drop:8},
 {tilt:0,head:0,armL:0,armR:0,elbowL:0,elbowR:0,legL:0,legR:0,kneeL:0,kneeR:0,drop:0}
];
const KEYS=['tilt','head','armL','armR','elbowL','elbowR','legL','legR','kneeL','kneeR','drop'];
function jumpKeys(progress,from){
 const j=min(progress,0,1);let index=0;
 while(index<KICK_TIMES.length-2&&j>KICK_TIMES[index+1])index++;
 const ratio=ease((j-KICK_TIMES[index])/(KICK_TIMES[index+1]-KICK_TIMES[index]));
 const sign=from==='L'?1:-1,out={};
 for(const k of KEYS){
   let a=KEYFRAMES[index][k],b=KEYFRAMES[index+1][k];
   if(sign<0){
     const opp={armL:'armR',armR:'armL',elbowL:'elbowR',elbowR:'elbowL',legL:'legR',legR:'legL',kneeL:'kneeR',kneeR:'kneeL'}[k];
     if(opp){a=-KEYFRAMES[index][opp];b=-KEYFRAMES[index+1][opp];}
     else if(k==='tilt'||k==='head'){a=-a;b=-b;}
   }
   out[k]=mix(a,b,ratio);
 }
 out.phase=['접근·준비','발 고정','벽 밀어내기','공중 회전','착지','자세 복귀'][index];
 return out;
}
function poseAt(arg){
 const speed=Number(arg.speed)||112,fast=min((speed-115)/990,0,1),fold=min(arg.fold===undefined?fast:arg.fold,0,1);
 const elapsed=Number(arg.elapsed)||0,side=arg.hopFrom||'L',jumpProgress=arg.hopping?min(arg.hopVisual||0,0,1):1;
 const inJump=jumpProgress<1,sway=Math.sin(elapsed*(5.3+fast*4.4)),drift=Math.sin(elapsed*(9+fast*6));
 const contract=ease(min(fold*1.1,0,1));
 const base={
   fast,fold,jumpActive:inJump,jumpProgress,tilt:sway*(.025+.018*fast)-contract*.17,
   headTilt:-sway*.045+contract*.06,
   armL:mix(.89,.12,contract)+drift*.07,armR:mix(-.89,-.12,contract)-drift*.07,
   elbowL:mix(-.24,-.61,contract)+sway*.055,elbowR:mix(.24,.61,contract)-sway*.055,
   legL:mix(-.30,.06,contract)+sway*.075,legR:mix(.30,-.06,contract)-sway*.075,
   kneeL:mix(.22,.53,contract),kneeR:mix(-.22,-.53,contract),drop:sway*1.8,
   phase:contract>.8?'최고속 웅크리기':fast>.3?'가속·망토 접기':'자유낙하'
 };
 if(arg.dead){
    base.tilt=side==='R'?.82:-.82;base.headTilt=.2;
    base.armL=1.3;base.armR=-1.4;base.elbowL=-1.1;base.elbowR=1.1;
    base.legL=-.65;base.legR=.68;base.kneeL=1;base.kneeR=-1;
    base.phase='피격·기절';return base;
 }
 if(inJump){
   const k=jumpKeys(jumpProgress,side),weight=Math.sin(Math.PI*jumpProgress)**.48;
   for(const key of KEYS){if(key==='head')base.headTilt+=k[key]*weight;else base[key]+=k[key]*weight;}
   base.headTilt-=base.tilt*.22*weight;
   base.phase=k.phase;
 }
 return base;
}
function impact(ctx0,arg,p,unit){
 if(!p.jumpActive)return;
 const q=p.jumpProgress,side=arg.hopFrom==='R'?1:-1;
 const intensity=Math.max(0,1-Math.abs(q-.2)/.18);
 if(intensity<=0)return;
 const wallX=arg.wallEdge!==undefined?arg.wallEdge:arg.x+side*83*unit,y=arg.y+32*unit;
 ctx0.save();ctx0.globalAlpha*=intensity*.9;
 ctx0.strokeStyle='#fff3c2';ctx0.lineWidth=2.5*unit;
 ctx0.beginPath();ctx0.arc(wallX,y,(16+(1-intensity)*25)*unit,Math.PI*.38,Math.PI*1.6);ctx0.stroke();
 ctx0.lineCap='round';
 for(let k=0;k<7;k++){
  const a=k/7*Math.PI*2+q*3.1,r=(22+k%3*6)*unit;
  ctx0.beginPath();ctx0.moveTo(wallX+Math.cos(a)*r,y+Math.sin(a)*r);
  ctx0.lineTo(wallX+Math.cos(a)*(r+8*unit),y+Math.sin(a)*(r+8*unit));ctx0.stroke();
 }
 ctx0.restore();
}
function draw(arg){
 if(!arg||!arg.ctx)return null;
 ctx=arg.ctx;t=Number(arg.elapsed)||0;
 LOOK=arg.look||activeLook;
 const p=poseAt(arg),u=Number(arg.u)||1,unit=.65*u;
 ctx.save();
 ctx.translate(arg.x,(Number(arg.y)||0)+p.drop*unit);
 if(arg.hopping)ctx.translate(0,-Math.sin(Math.PI*(arg.hopVisual||0))*6*unit);
 ctx.scale(unit,unit);ctx.rotate(p.tilt);
 if(p.fold>.66){const f=ease((p.fold-.66)/.34);ctx.scale(1-.055*f,1+.025*f);}
 ctx.shadowColor='#050b18b0';ctx.shadowBlur=14;ctx.shadowOffsetY=5;
 body(p);ctx.restore();impact(ctx,arg,p,unit);
 return p;
}
const JOINTS={head:[0,-111],neck:[0,-79],shoulderL:[-30,-57],shoulderR:[30,-57],elbowL:[-30,-22],elbowR:[30,-22],hipL:[-19,16],hipR:[19,16]};
const PARTS={mask:['cat','dog','frog'],outfit:['explorer','pilot','star'],shoes:['boots','sneakers','jet'],cape:['teal','red','none']};
const DEFAULT={mask:'cat',outfit:'explorer',shoes:'boots',cape:'teal'};
const LOOK_KEY='hell_fall_rig_look_v2',ENABLE_KEY='hell_fall_rig_test_v2';
const query=()=>{try{return new URLSearchParams(location.search)}catch(_){return new URLSearchParams()}};
function restore(){
 try{const val=JSON.parse(localStorage.getItem(LOOK_KEY)||'{}');return Object.fromEntries(Object.entries(DEFAULT).map(([k,d])=>[k,PARTS[k].includes(val[k])?val[k]:d]));}
 catch(_){return {...DEFAULT}}
}
let activeLook=restore(),enabled=query().get('rig')==='1';
if(query().get('rig')===null){try{enabled=localStorage.getItem(ENABLE_KEY)==='1'}catch(_){}}
function getLook(){return {...activeLook}}
function setLook(part,id){if(!PARTS[part]?.includes(id))return false;activeLook[part]=id;try{localStorage.setItem(LOOK_KEY,JSON.stringify(activeLook))}catch(_){}return true}
function isEnabled(){return enabled}
function setEnabled(v){enabled=!!v;try{localStorage.setItem(ENABLE_KEY,enabled?'1':'0')}catch(_){}return enabled}
window.HellRigV2={draw,poseAt,jumpKeys,getLook,setLook,isEnabled,setEnabled,PARTS,JOINTS,VERSION:'2.0'};

})();
