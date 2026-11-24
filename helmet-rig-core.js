'use strict';
/*
 * HELL FALL · shared helmet fitting model v0.1
 * Master asset is an opaque wrap-around shell with a transparent FACE opening.
 * Equipment design changes only replace the corresponding same-viewBox artwork.
 * Rig must be called INSIDE the actor's translate/rotate/scale stack.
 * LIVE CHARACTER SPRITES ARE NOT MODIFIED by this laboratory module.
 */
(function(){
  const sources={helmet_basic:'assets/helmet_master_basic.svg'};
  const images={};
  Object.entries(sources).forEach(([key,url])=>{const im=new Image();im.src=url;images[key]=im;});
  const PRESETS={
    uiji:{
      open:{x:0,y:-65,size:79},
      folded:{x:0,y:-65,size:77},
      frantic:{x:0,y:-64,size:78},
      jump:{x:0,y:-64,size:77},
      dead:{x:0,y:-65,size:77},
      portrait:{left:50,top:-10,width:100}
    }
  };
  function draw(ctx,{id='helmet_basic',character='uiji',pose='open',unit=1,x=0,y=0,size=0}={}){
    const image=images[id];
    if(!image||!image.complete||!image.naturalWidth)return false;
    const raw=PRESETS[character]?.[pose]||PRESETS.uiji.open;
    const p={x:raw.x+x,y:raw.y+y,size:size||raw.size};
    ctx.drawImage(image,(p.x-p.size/2)*unit,(p.y-p.size/2)*unit,p.size*unit,p.size*unit);
    return true;
  }
  window.HellHelmetRig={sources,images,PRESETS,draw};
})();
