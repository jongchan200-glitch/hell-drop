'use strict';
/*
 * HELMET 2.3: frame-by-frame HEAD REPLACEMENT, not an actor-independent overlay.
 * Uses original 36 unique pose frames, finds the opaque head/face within each,
 * removes old head pixels locally, inserts a fitted fully-enclosed helm, and
 * caches the 2304x2304 resulting sprite atlas. The existing body animation,
 * cape, frame timing, controls, hit boxes, and saved data never change.
 */
(function(){
  const URLS={helmet_basic:'assets/helmet_basic_full.svg',helmet_frog:'assets/helmet_frog_full.svg'};
  const helmImages={};
  const atlasCache=new WeakMap();
  const diagnostics={frames:0,compositions:0,misses:0};
  for(const [id,url] of Object.entries(URLS)){
    const im=new Image();im.onload=()=>{im._ready=true};im.onerror=()=>{im._ready=false};im.src=url;helmImages[id]=im;
  }
  const ready=id=>!!(helmImages[id]?.complete&&helmImages[id]?.naturalWidth);
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
  function detect(ctx,w,h){
    const data=ctx.getImageData(0,0,w,h).data,step=3;
    let l=w,t=h,r=-1,b=-1;
    // Alpha bbox ignores transparent margins and scales across portrait/atlas frames.
    for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){
      const z=(y*w+x)*4;if(data[z+3]<90)continue;
      l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
    }
    if(r<l)return null;
    const bh=b-t,bw=r-l,mid=(l+r)*.5,guessY=t+bh*.235;
    let cx=0,cy=0,weight=0;
    const ymin=t+bh*.08,ymax=t+bh*.49;
    const xmin=Math.max(l,mid-bh*.38),xmax=Math.min(r,mid+bh*.38);
    for(let y=Math.floor(ymin);y<ymax;y+=step)for(let x=Math.floor(xmin);x<xmax;x+=step){
      const z=(y*w+x)*4,rr=data[z],gg=data[z+1],bb=data[z+2],a=data[z+3];
      if(a<155||rr<115||rr<gg+17||gg<bb*.9||rr<bb+30||gg<55)continue;
      // Top-center facial skin has priority over hands and gold armor.
      const proximity=Math.max(.1,1-Math.abs(x-mid)/(bh*.45))*
        Math.max(.06,1-Math.abs(y-guessY)/(bh*.30));
      if(proximity<=.08)continue;
      cx+=x*proximity;cy+=y*proximity;weight+=proximity;
    }
    const size=Math.max(34,Math.min(170,bh*.40));
    const faceX=weight>8?cx/weight:mid;
    const faceY=weight>8?cy/weight:guessY+size*.20;
    // Helmet center sits above facial skin, replacing old fringe and skull.
    return {x:mid*.22+faceX*.78,y:faceY-size*.19,size,guess:weight<=8,bbox:[l,t,r,b]};
  }
  function mergeFrame(dst,source,sx,sy,sw,sh,helmet,calibration=null){
    const tmp=canvas(sw,sh),tx=tmp.getContext('2d',{willReadFrequently:true});
    tx.drawImage(source,sx,sy,sw,sh,0,0,sw,sh);
    const fit=detect(tx,sw,sh);
    if(!fit||!helmet){dst.drawImage(tmp,0,0);diagnostics.misses++;return fit;}
    if(calibration){
      fit.x=fit.x*.62+calibration.x*.38;
      fit.y=fit.y*.62+calibration.y*.38;
      fit.size=fit.size*.68+calibration.size*.32;
    }
    const {x,y,size}=fit;
    // Erase the actual head. This avoids an independent floating sticker.
    tx.save();tx.globalCompositeOperation='destination-out';
    tx.beginPath();tx.ellipse(x,y,size*.56,size*.55,0,0,Math.PI*2);
    tx.fill();tx.restore();
    const width=size*1.17;
    tx.drawImage(helmet,x-width*.5,y-width*.53,width,width);
    dst.drawImage(tmp,0,0);
    diagnostics.frames++;
    return fit;
  }
  function getAtlas(original,id){
    if(!original?.naturalWidth||!ready(id))return null;
    let items=atlasCache.get(original);if(!items){items=new Map();atlasCache.set(original,items)}
    if(items.has(id))return items.get(id);
    // Memory: keep max 1 active helmet atlas per original (roughly 21 MB).
    items.clear();
    const out=canvas(original.naturalWidth,original.naturalHeight);
    const dest=out.getContext('2d');
    const cols=6,rows=6,fw=original.naturalWidth/cols,fh=original.naturalHeight/rows;
    if(fw<100||fh<100)return null;
    // Calibrated separately for three sets of 12 poses. Preserve subframe
    // motion by blending a local fit with that pose's stable head baseline.
    const anchors=[];
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const t=canvas(fw,fh),tc=t.getContext('2d',{willReadFrequently:true});
      tc.drawImage(original,col*fw,row*fh,fw,fh,0,0,fw,fh);
      anchors.push(detect(tc,fw,fh));
    }
    const baselines=[];
    for(let pose=0;pose<3;pose++){
      const all=anchors.slice(pose*12,pose*12+12).filter(Boolean);
      const median=k=>{const a=all.map(p=>p[k]).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:0;};
      baselines.push({x:median('x'),y:median('y'),size:median('size')});
    }
    for(let i=0;i<36;i++){
      const col=i%cols,row=Math.floor(i/cols);
      dest.save();dest.translate(col*fw,row*fh);
      mergeFrame(dest,original,col*fw,row*fh,fw,fh,helmImages[id],baselines[Math.floor(i/12)]);
      dest.restore();
    }
    items.set(id,out);diagnostics.compositions++;
    return out;
  }
  const staticCache=new WeakMap();
  function getSprite(source,id){
    if(!source?.width&&!source?.naturalWidth)return null;
    if(!ready(id))return null;
    const w=source.naturalWidth||source.width,h=source.naturalHeight||source.height;
    let stored=staticCache.get(source);if(!stored){stored=new Map();staticCache.set(source,stored);}
    if(stored.has(id))return stored.get(id);
    stored.clear();
    const out=canvas(w,h);mergeFrame(out.getContext('2d'),source,0,0,w,h,helmImages[id]);
    stored.set(id,out);return out;
  }
  function drawPortrait(target,url,id){
    if(!target)return;
    const source=new Image();
    source.onload=()=>{
      if(!target.isConnected)return;
      const w=source.naturalWidth,h=source.naturalHeight;
      if(!w||!h)return;
      target.width=w;target.height=h;
      const ctx=target.getContext('2d');
      if(ready(id)){
        mergeFrame(ctx,source,0,0,w,h,helmImages[id]);
      }else{
        ctx.drawImage(source,0,0);
        const helm=helmImages[id];
        if(helm)helm.addEventListener('load',()=>{if(target.isConnected)drawPortrait(target,url,id)},{once:true});
      }
    };
    source.src=url;
  }
  window.HellHelmetComposer={URLS,images:helmImages,getAtlas,getSprite,drawPortrait,detect,diagnostics,ready};
})();
