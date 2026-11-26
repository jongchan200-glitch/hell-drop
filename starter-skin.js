'use strict';
/* Basic 2D costume experiment. This NEVER generates or replaces a face.
 * It recolors only cape/clothing pixels outside the protected central face zone
 * of existing approved art. All source art and original premium frames remain.
 * No rig, head replacement, stretch mesh, or character portrait generation.
 */
(function(){
  const cache=new WeakMap(),previewCache=new Map(),inFlight=new Map();
  const source=(image)=>({w:image?.naturalWidth||image?.width||0,h:image?.naturalHeight||image?.height||0});
  const clip=v=>Math.min(255,Math.max(0,Math.round(v)));
  function getSprite(image,actor){
    if(!image)return image;
    const {w,h}=source(image);
    if(!w||!h)return image;
    let entries=cache.get(image);
    if(!entries){entries=new Map();cache.set(image,entries);}
    if(entries.has(actor))return entries.get(actor);
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    try{
      context.drawImage(image,0,0,w,h);
      const bitmap=context.getImageData(0,0,w,h),p=bitmap.data;
      const atlas=w===2304&&h===2304,cell=384;
      for(let y=0;y<h;y++){
        const vy=atlas?(y%cell)/cell:y/h;
        for(let x=0;x<w;x++){
          const i=(y*w+x)*4;
          if(p[i+3]<30)continue;
          const vx=atlas?(x%cell)/cell:x/w;
          // Leave the entire face/eyes/mouth/hair core pixel-for-pixel untouched.
          if(vx>.24&&vx<.76&&vy<.67)continue;
          const r=p[i],g=p[i+1],b=p[i+2];
          // Girl: vivid crimson superhero cape. Boy: violet superhero cape.
          const red=actor==='useoi'&&r>89&&r>g*1.31&&r>b*1.26&&g<175;
          const violet=actor==='uiji'&&r>73&&b>64&&r>g*1.22&&b>g*1.17&&b<r*1.75;
          if(!red&&!violet)continue;
          // Transform just the cape hue into neutral tied-cloth beige while
          // retaining original highlights, shadows, antialias and linework.
          const light=(r*0.29+g*.55+b*.16);
          const k=Math.min(1.33,Math.max(.45,light/128));
          p[i]=clip(184*k);
          p[i+1]=clip(137*k);
          p[i+2]=clip(94*k);
        }
      }
      context.putImageData(bitmap,0,0);
      // Existing 2D draw and helmet composer work with naturalWidth.
      canvas.naturalWidth=w;canvas.naturalHeight=h;
      entries.set(actor,canvas);return canvas;
    }catch(e){
      console.warn('Starter costume skipped; original source protected',e);
      entries.set(actor,image);return image;
    }
  }
  function preview(src,actor,callback){
    const key=src+'|'+actor;
    if(previewCache.has(key)){callback(previewCache.get(key));return;}
    let waiters=inFlight.get(key);
    if(waiters){waiters.push(callback);return;}
    waiters=[callback];inFlight.set(key,waiters);
    const image=new Image();
    const finish=(url)=>{
      previewCache.set(key,url);const callbacks=inFlight.get(key)||[];
      inFlight.delete(key);callbacks.forEach(fn=>fn(url));
    };
    image.onload=()=>{
      const colored=getSprite(image,actor);
      let url=src;try{url=colored===image?src:colored.toDataURL('image/webp',.90)}catch(_){}
      finish(url);
    };
    image.onerror=()=>finish(src);
    image.src=src;
  }
  function refreshPreviews(root=document){
    root.querySelectorAll('img[data-starter-face]').forEach(img=>{
      const id=img.dataset.starterFace,actor=id==='starter_boy'?'uiji':'useoi';
      const src=actor==='uiji'?'assets/uiji_intro.webp':'assets/hero_intro.webp';
      preview(src,actor,url=>{if(img.isConnected&&img.dataset.starterFace===id)img.src=url;});
    });
  }
  window.HellStarterSkin={getSprite,preview,refreshPreviews};
})();