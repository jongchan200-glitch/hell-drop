'use strict';
/* WEB 2.9: independent standing portraits + three whole-body action drawings.
   Transform the complete art only; no face collage or skeletal/vector bodies.
   Motion is still three authored poses, not 36 separately illustrated frames. */
(function(){
  const W=384,H=450;
  const actors={uiji:'boy',useoi:'girl'}, atlases={}, portraits={},loaded={},failures={};
  let draws=0,lastPose='glide',lastHero='uiji',lastMotionPhase=0;
  for(const [who,sex] of Object.entries(actors)){
    const a=new Image(),p=new Image();
    loaded[who]=false;
    a.onload=()=>{atlases[who]=a;loaded[who]=true;};
    a.onerror=()=>{failures[who]='Action atlas unavailable';};
    p.onload=()=>{portraits[who]=p;};
    a.src='assets/starter_'+sex+'_actions_v29.webp';
    p.src='assets/starter_'+sex+'_portrait_v29.webp';
  }
  const clamp=v=>Math.max(0,Math.min(1,v));
  const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
  function draw({ctx,x,y,u,who,fold,elapsed,speed,dead,hopping,hopFrom,hopVisual,boost=0}){
    const img=atlases[who];
    if(!img?.naturalWidth){
      const p=portraits[who];
      if(p?.naturalWidth)ctx.drawImage(p,x-64*u,y-92*u,128*u,184*u);
      return true; // Never substitute the premium character on a slow load.
    }
    const wind=clamp((speed-112)/580),p=clamp(hopVisual??1);
    const side=hopFrom==='L'?1:-1;
    const fast=fold>.28||boost>.17||speed>390;
    const landing=hopping?smooth((p-.72)/.28):0;
    const kick=hopping&&p<.87&&!dead;
    const pose=kick?'kick':fast?'fast':'glide';
    const i=pose==='glide'?0:pose==='fast'?1:2;
    const phase=elapsed*(pose==='fast'?15+wind*9:8+wind*4);
    const wave=Math.sin(phase), wave2=Math.sin(phase*1.7+.8);
    let sx=1,sy=1,rot=0,dy=0,dx=0;
    if(pose==='glide'){
      // Bend and rock in the wind, with the knees already raised in the artwork.
      sx=1+.035*wave;sy=1-.022*wave;rot=.047*wave+.012*wave2;dy=3.2*wave2;
    }else if(pose==='fast'){
      sx=.94+.018*wave;sy=1.08+.025*wave;rot=-.08+.035*wave2;dy=2.6*wave;
    }else{
      const impact=1-smooth(p/.20),travel=smooth((p-.12)/.56);
      rot=side*(-.20+.49*travel)*(1-landing);
      sx=1+.10*impact-.06*Math.sin(Math.PI*p);sy=1/sx;
      dy=-4*Math.sin(Math.PI*p);
      dx=-side*5*impact;
    }
    if(dead){rot=.65;sy=.90;sx=1.05;}
    const width=(pose==='fast'?166:pose==='kick'?184:178)*u,height=width*H/W;
    ctx.save();ctx.translate(x+dx*u,y+dy*u);ctx.rotate(rot);
    // The source kicking foot faces right. Mirror only when leaving the left wall.
    ctx.scale((kick&&hopFrom==='L'?-1:1)*sx,sy);
    // Upper-body wind ripple via narrow horizontal image strips, preserving the
    // entire painted face and outfit; no cutout limb or face assembly.
    if(!kick&&!dead){
      const n=30;
      for(let j=0;j<n;j++){
        const y0=Math.floor(j*H/n),y1=Math.floor((j+1)*H/n);
        const f=(y0+y1)/(2*H);
        const drift=(1-f)*(1-f)*Math.sin(phase+f*5)*(pose==='fast'?2.4:3.4)*u;
        ctx.drawImage(img,i*W,y0,W,y1-y0,-width/2+drift,-height/2+y0*height/H,width,(y1-y0)*height/H+.25);
      }
    }else ctx.drawImage(img,i*W,0,W,H,-width/2,-height/2,width,height);
    ctx.restore();
    draws++;lastPose=pose;lastHero=who;lastMotionPhase=Math.floor((phase%(2*Math.PI))/(2*Math.PI)*12);
    return true;
  }
  window.HellStarterPoses={draw,poses:['glide','fast','kick'],frames:12,usesWholeBodyArt:true,
    ready:who=>!!loaded[who],getCachedCount:()=>draws,
    status:()=>({ready:{...loaded},failures:{...failures},source:'v29 independent portraits and whole-body action art',draws,lastPose,lastHero,lastMotionPhase})};
})();