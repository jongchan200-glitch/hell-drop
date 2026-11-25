'use strict';
/* 2026-11-25 latest eight-pose artwork: optional gameplay renderer.
   Enabled only for ?keypose=1; no score, physics, save, shop or economy changes.
   It preserves the original artist's 8 poses, mesh deformations and timing. */
(()=>{
  const query=new URLSearchParams(location.search);
  if(query.get('keypose')!=='1')return;
  const boxes=[[54,15,349,402],[561,21,225,392],[991,19,243,403],[1391,19,336,395],[56,472,347,399],[513,449,304,422],[934,483,367,383],[1408,473,339,400]];
  const curves=[[[0,4,379,377],[0,3,379,378],[1,3,381,378],[3,3,382,379],[4,4,384,379],[5,5,384,379],[5,6,384,379],[4,7,384,379],[3,7,384,378],[1,7,383,378],[0,6,381,378],[0,5,380,377]],[[68,2,318,382],[69,2,318,382],[71,2,318,382],[72,2,319,382],[71,2,320,381],[70,3,320,382],[68,4,321,382],[67,5,321,382],[65,5,321,382],[65,5,320,382],[65,4,319,382],[66,3,318,382]],[[68,2,318,382],[70,1,319,382],[72,1,319,382],[72,1,319,382],[70,2,318,381],[69,3,319,382],[68,5,321,382],[67,6,322,382],[66,6,322,382],[65,5,320,382],[64,4,318,382],[65,3,317,382]]];
  const image=new Image();
  const layers=Array.from({length:8},()=>document.createElement('canvas'));
  const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
  const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
  // Fixed landmark pairs from the latest Work key-pose animation source.
  const controls={
    6:[[.28,.26],[.13,.28],[.68,.53],[.48,.59],[.02,.51],[.82,.96]],
    7:[[.40,.27],[.13,.35],[.70,.56],[.45,.62],[.27,.72],[.16,.95]],
    4:[[.52,.31],[.18,.36],[.81,.35],[.52,.65],[.47,.89],[.42,.98]],
    3:[[.61,.28],[.10,.33],[.90,.40],[.56,.59],[.30,.78],[.70,.96]],
    0:[[.49,.32],[.12,.42],[.87,.42],[.49,.67],[.25,.94],[.72,.95]]
  };
  const actor={enabled:true,ready:false,error:'',draw};
  window.HellKeypose=actor;
  function artwork(i){
    const c=layers[i];
    const revision=window.HellStarterKit?.revision??-1;
    // Recompose each pose's original pixels and fitted equipment when a
    // garment toggle changes; every triangle keeps the same Work mesh timing.
    if(!c.width||c._starterRevision!==revision){
      const [x,y,w,h]=boxes[i];
      if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
      const ink=c.getContext('2d');
      ink.clearRect(0,0,w,h);
      window.HellStarterKit?.paintUnder?.(ink,i,w,h);
      ink.drawImage(image,x,y,w,h,0,0,w,h);
      window.HellStarterKit?.paintOver?.(ink,i,w,h);
      c._starterRevision=revision;
    }
    return c;
  }
  function surface(ctx,i,phase,wind,turn,peer,amount){
    const img=artwork(i),w=img.width,h=img.height;
    const xs=Array.from({length:9},(_,j)=>j/8),ys=xs;
    const point=(u,v)=>{
      const edge=(u-.5)*2,hair=(1-smooth(v/.5))*Math.abs(edge);
      const lag=Math.sin(phase-v*2);
      let dx=0,dy=0,total=0;
      if(amount&&controls[peer]&&controls[i]){
        controls[i].forEach(([x,y],n)=>{
          const weight=1/((u-x)**2+(v-y)**2+.006)**2;
          total+=weight;
          dx+=(controls[peer][n][0]-x)*weight;
          dy+=(controls[peer][n][1]-y)*weight;
        });
        dx*=amount/total;dy*=amount/total;
      }
      return [(u+dx-.5)*w*(1-.045*Math.abs(turn))+w*(hair*lag*.027*wind+turn*(.5-v)*.043),
        (v+dy-.52)*h+h*(.017*wind*lag*hair+.013*Math.sin(phase+edge)*smooth((v-.57)/.43))];
    };
    for(let j=1;j<ys.length;j++)for(let k=1;k<xs.length;k++){
      const u=xs[k-1],v=ys[j-1],du=xs[k]-u,dv=ys[j]-v;
      for(const [a,b,c] of [[[u,v],[u+du,v],[u,v+dv]],[[u+du,v+dv],[u,v+dv],[u+du,v]]]){
        const A=point(...a),B=point(...b),C=point(...c);
        const sx=(b[0]-a[0])*w,sy=(c[1]-a[1])*h;
        ctx.save();
        // Slight overlap between warped mesh triangles avoids visible white
        // stitching lines from canvas antialiasing at low phone resolutions.
        const mid=[(A[0]+B[0]+C[0])/3,(A[1]+B[1]+C[1])/3];
        const over=P=>[mid[0]+(P[0]-mid[0])*1.07,mid[1]+(P[1]-mid[1])*1.07];
        ctx.beginPath();ctx.moveTo(...over(A));ctx.lineTo(...over(B));ctx.lineTo(...over(C));
        ctx.closePath();ctx.clip();
        const xx=(B[0]-A[0])/sx,xy=(B[1]-A[1])/sx;
        const yx=(C[0]-A[0])/sy,yy=(C[1]-A[1])/sy;
        ctx.transform(xx,xy,yx,yy,A[0]-xx*a[0]*w-yx*a[1]*h,A[1]-xy*a[0]*w-yy*a[1]*h);
        ctx.drawImage(img,0,0);
        ctx.restore();
      }
    }
  }
  function draw({ctx,x,y,u,fold,elapsed,speed,dead,hopping,hopFrom,hopVisual,character}){
    if(!actor.ready||dead)return false;
    try{
      const girl=character!=='uiji';
      const wall=hopping?(hopFrom==='R'?'R':'L'):'';
      const p=hopping?clamp(hopVisual):1;
      const side=wall==='L'?1:-1;
      const mode=fold>.88?2:fold>.28?1:0;
      const time=wall?p*.4:elapsed;
      const duration=wall?.4:(girl?(mode?(.5660527304):1.0471975512):[1.2631578947,.8336397137,.6504065041][mode]);
      const phase=2*Math.PI*time/duration,wind=.5+fold;
      let parts,roll=0,turn=0;
      if(wall){
        const land=smooth((p-.65)/.35),travel=smooth((p-.1)/.62);
        roll=side*(girl?(-.20+.46*travel)*(1-land):(-.27+.48*smooth(p))*(1-smooth((p-.72)/.28)));
        turn=side*Math.sin(Math.PI*p);
        const release=smooth((p-.62)/.15),settle=smooth((p-.79)/.21);
        parts=girl?[[6,1-release],[7,release*(1-settle)],[4,settle]]:[[3,1-land],[0,land]];
      }else{
        parts=[[girl?(mode?5:4):mode,1]];
        roll=girl?Math.sin(time*5)*fold*.02:Math.sin(phase)*.022-fold*.22;
      }
      ctx.save();
      for(const [i,alpha] of parts){
        if(alpha<=0)continue;
        const size=(girl?150:168)*u,scale=size/Math.max(boxes[i][2],boxes[i][3]);
        ctx.save();
        ctx.translate(x,y+Math.sin(phase)*1.3*u);
        if(!girl){
          const motionMode=mode;
          const normalizedSpeed=clamp((speed-112)/650);
          const f=(time*(9.5+normalizedSpeed*5.5)*[1,1.09,1.23][motionMode]+[0,2,5][motionMode])%12;
          const row=curves[motionMode],a=row[Math.floor(f)],b=row[(Math.floor(f)+1)%12];
          const bounds=a.map((v,j)=>v+(b[j]-v)*(f%1)),base=row[0];
          ctx.scale((bounds[2]-bounds[0])/(base[2]-base[0]),(bounds[3]-bounds[1])/(base[3]-base[1]));
        }
        ctx.rotate(roll);
        ctx.scale(scale*(wall==='R'&&i!==4&&i!==0?-1:1),scale);
        ctx.globalAlpha*=alpha;
        const next=parts.find(([id,a])=>id!==i&&a>0);
        surface(ctx,i,phase,wind,turn,next?.[0],next?.[1]||0);
        ctx.restore();
      }
      ctx.restore();
      return true;
    }catch(err){
      actor.ready=false;actor.enabled=false;actor.error=String(err);
      console.error('Keypose renderer failed; original character restored',err);
      return false;
    }
  }
  image.onload=()=>{
    try{
      for(let i=0;i<8;i++)artwork(i);
      actor.ready=true;
      console.info('Latest eight-pose character art loaded for in-game test');
    }catch(err){actor.error=String(err);actor.enabled=false;console.error(err);}
  };
  image.onerror=()=>{
    actor.error='8-pose sprite atlas unavailable';
    actor.enabled=false;
    console.warn('Keypose artwork not loaded; original character retained');
  };
  image.src='character-production/uiji-useoi/keypose-study/poses.png?v=nov25-game1';
})();
