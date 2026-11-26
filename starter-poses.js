'use strict';
/*
 * Hell Drop WEB 2.8 -- whole-body starter sprite renderer.
 * Female and male are each a REAL three-pose transparent sprite atlas,
 * extracted from the user's approved full-body 2D artwork.
 * No stick figures, pixel recolors, face compositing or Work skeletal rigs.
 * Original premium Uiji/Useoi artworks and renderers remain untouched.
 */
(function(){
  const FRAME_W=384,FRAME_H=450;
  const paths={uiji:'assets/starter_boy_actions.webp?v=28',useoi:'assets/starter_girl_actions.webp?v=28'};
  const atlases={},loaded={},failures={};
  let draws=0,lastPose='glide',lastHero='uiji',lastMotionPhase=0;
  for(const [who,src] of Object.entries(paths)){
    const img=new Image();
    loaded[who]=false;
    img.onload=()=>{atlases[who]=img;loaded[who]=true;};
    img.onerror=()=>{failures[who]='이미지를 읽지 못했습니다: '+src;};
    img.src=src;
  }
  function draw({ctx,x,y,u,who,fold,elapsed,speed,dead,hopping,hopFrom,hopVisual,boost=0}){
    const img=atlases[who];
    if(!img||!img.complete||!img.naturalWidth)return false;
    const pose=hopping?'kick':(fold>.28||boost>.17||speed>390)?'fast':'glide';
    // The actual three hand-drawn action poses are selected per input state.
    // A subtle twelve-step whole-body sway preserves the original gameplay
    // cadence without changing anatomy, face or clothes between frames.
    const idx=pose==='glide'?0:pose==='fast'?1:2;
    const duration=pose==='kick'?.42:pose==='fast'?.68:.90;
    const t=pose==='kick'?Math.max(0,Math.min(1,hopVisual||0)):
       (elapsed%duration)/duration;
    const step=Math.floor(t*12)%12;
    const phase=step*(Math.PI/6);
    const sway=Math.sin(phase);
    const lift=pose==='glide'?Math.sin(phase)*1.5:pose==='fast'?Math.sin(phase)*1.8:Math.sin(t*Math.PI)*-3;
    const rot=pose==='glide'?sway*.022:pose==='fast'?sway*.016:
      (hopFrom==='L'?1:-1)*(-.12+.21*t);
    const breathing=1+Math.cos(phase)*.012;
    const width=178*u*breathing;
    const height=width*FRAME_H/FRAME_W;
    const faceRight=pose==='kick'&&hopFrom==='R';
    ctx.save();
    ctx.translate(x,y+lift*u);
    if(faceRight)ctx.scale(-1,1);
    ctx.rotate(rot);
    if(dead)ctx.rotate(.18);
    ctx.drawImage(img,idx*FRAME_W,0,FRAME_W,FRAME_H,
      -width/2,-height*.50,width,height);
    ctx.restore();
    draws++;lastPose=pose;lastHero=who;lastMotionPhase=step;
    return true;
  }
  window.HellStarterPoses={
    draw,poses:['glide','fast','kick'],frames:12,usesWholeBodyArt:true,
    ready:(who)=>!!loaded[who],
    getCachedCount:()=>draws,
    status:()=>({ready:{...loaded},failures:{...failures},source:'whole-body WebP atlases',draws,lastPose,lastHero,lastMotionPhase})
  };
})();