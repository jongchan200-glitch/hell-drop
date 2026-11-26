'use strict';
/**
 * Hell Drop starter-only 2D animation frames.
 * Separately drawn outfit/body for EACH of 6 motions x 6 animation cels.
 * Motion timing/position comes from the existing original game; this module
 * changes artwork only. Exact face/hair pixels are cropped from original
 * approved hero sprites, never regenerated or color-filtered.
 * Rendered sprites are cached at 320px; no huge 2304px palette scan per frame.
 */
(function(){
  const SIZE=320, FRAMES=6, caches=new Map();
  const poses=['glide','fold','fast','kickL','kickR','hit'];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const rand=i=>Math.sin(i*6.293)*.5;
  function srcSize(im){return{w:im?.naturalWidth||im?.width||0,h:im?.naturalHeight||im?.height||0};}
  function line(c,d,color='#76533a',thick=3){
    c.beginPath();c.strokeStyle=color;c.lineWidth=thick;
    c.lineCap='round';c.lineJoin='round';c.stroke(new Path2D(d));
  }
  function fill(c,d,color,edge='#5e4534',thick=3){
    const p=new Path2D(d);c.fillStyle=color;c.fill(p);
    if(edge){c.strokeStyle=edge;c.lineWidth=thick;c.lineJoin='round';c.lineCap='round';c.stroke(p);}
  }
  function bez(c,paths,color,stroke='#77583d',lw=2){fill(c,paths,color,stroke,lw);}
  function ellipse(c,x,y,rx,ry,color,edge=null,lw=2,angle=0){
    c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);
    c.fillStyle=color;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=lw;c.stroke();}
  }
  function shoe(c,x,y,rot=0){
    c.save();c.translate(x,y);c.rotate(rot);
    // Blue open-toed slide with dark non-slip sole.
    fill(c,'M-19 1 Q-23 14 -13 18 L20 19 Q30 12 18 2 Q-1 -5 -19 1Z','#183f77','#1b304a',3);
    fill(c,'M-19 -3 Q-5 -12 18 -3 L22 6 Q1 13 -19 6Z','#3573cb','#21437d',2);
    line(c,'M-10 12 Q4 16 18 11','#91b2ef',2.2);
    ellipse(c,-7,5,3,2,'#ecc6a3');ellipse(c,1,6,2.9,2,'#ecc6a3');ellipse(c,9,6,2.4,1.7,'#eabf9b');
    c.restore();
  }
  function limb(c,ax,ay,bx,by,width,start,end){
    c.save();
    c.lineWidth=width+5;c.strokeStyle=end;c.lineCap='round';
    c.beginPath();c.moveTo(ax,ay);c.lineTo(bx,by);c.stroke();
    c.strokeStyle=start;c.lineWidth=width;c.stroke();
    c.restore();
  }
  function drawHead(c,im,who,pose,phase){
    const {w,h}=srcSize(im);if(!w||!h)return;
    const isGirl=who==='useoi';
    // Every face is the *original approved artwork*, cropped in-image.
    // The rest of the original costume never enters these new sprites.
    let sx=isGirl?95:165,sy=isGirl?9:0,sw=isGirl?323:635,sh=isGirl?260:530;
    const jitter=Math.sin(phase*Math.PI*2/FRAMES)*2;
    c.save();c.translate(160,109+jitter);
    c.rotate((pose==='fast'?.10:pose==='hit'?-.14:0)+jitter*.003);
    if(pose==='kickL')c.rotate(-.13);
    if(pose==='kickR')c.rotate(.13);
    // Head sits naturally above the newly drawn shirt and cloth knot.
    c.drawImage(im,sx/w*w,sy/h*h,sw,sh,-70,-82,140,120);
    c.restore();
  }
  function makeFrame(who,pose,frame,face){
    const c=document.createElement('canvas');c.width=SIZE;c.height=SIZE;
    const g=c.getContext('2d');
    const pulse=Math.sin(frame*2*Math.PI/FRAMES);
    const p=pose,glide=p==='glide',fold=p==='fold',fast=p==='fast',kick=p==='kickL'||p==='kickR',hit=p==='hit';
    const lift=pulse*3.2,flap=Math.cos(frame*2*Math.PI/FRAMES)*8;
    const kickSign=p==='kickL'?-1:1;
    g.save();g.translate(0,lift);
    // One original timed action, five separately illustrated body silhouettes.
    if(kick){g.translate(160,183);g.rotate(kickSign*.29);g.translate(-160,-183);}
    if(hit){g.translate(160,188);g.rotate(.62+0.04*pulse);g.translate(-160,-188);}
    const spread=glide?1:fold?.48:fast?.23:kick?.83:.56;
    const left=160-(64+85*spread),right=160+(64+85*spread);
    const topLeft=100-(23*spread),topRight=220+(23*spread);
    // The tied beige fabric cape is a separate new silhouette per pose/frame.
    bez(g,'M153 144 Q105 124 '+topLeft+' 142 Q'+(left+3)+' 186 '+left+' '+(230+flap)+' Q'+(left+30)+' '+(227+flap)+' '+(left+51)+' '+(240+flap)+
      ' Q111 248 142 214 Q156 201 160 182Z','#d6a172','#875d3e',3);
    bez(g,'M167 144 Q209 125 '+topRight+' 141 Q'+(right-2)+' 179 '+right+' '+(229-flap)+' Q'+(right-36)+' '+(229-flap)+' '+(right-52)+' '+(240-flap)+
      ' Q209 243 179 215 Q164 199 160 182Z','#d9ae7e','#875d3e',3);
    line(g,'M155 155 Q126 185 '+(left+22)+' '+(221+flap),'#f9d2a3',2);
    line(g,'M170 153 Q194 183 '+(right-23)+' '+(221-flap),'#a5754d',2);
    // Legs and loose shorts are drawn in actual different leg angles.
    const lean=fast?7:fold?3:glide?12:hit?20:6;
    const legs=[
      {x:142,tx:glide?112:fold?142:fast?150:kick?160-kickSign*45:124,
        ty:glide?268:fold?268:fast?282:kick?260:256},
      {x:180,tx:glide?210:fold?180:fast?177:kick?160+kickSign*64:199,
        ty:glide?269:fold?270:fast?283:kick?261:255}
    ];
    for(let i=0;i<2;i++){
      const l=legs[i];limb(g,l.x,219,l.tx,l.ty,22,'#efbf94','#7a493b');
      ellipse(g,l.tx,l.ty,8,10,'#e6b286','#8e5c41',2);
      shoe(g,l.tx+(i?2:-2),l.ty+11,(i?-1:1)*.15+(kick?kickSign*.32:0));
    }
    bez(g,'M123 211 Q136 200 158 206 Q185 201 201 210 L198 245 L171 247 L159 228 L153 250 L121 242Z',
      '#393640','#272834',4);
    line(g,'M158 218 L159 239','#958d91',2);
    line(g,'M127 239 Q139 248 150 242','#8f858b',2);
    line(g,'M171 242 Q188 249 198 238','#716c79',2);
    // Skin-colored exposed forearms and open hands.
    const arms=glide?[[-1,-58,-1], [1,58,1]]:fold?[[-1,-33,-1],[1,33,1]]:
      fast?[[-1,-20,-1],[1,20,1]]:
      kick?[[-1,-55,-1],[1,42,1]]:[[-1,-47,-1],[1,45,1]];
    for(const [sign,dist] of arms){
      const sx=160+sign*42, ex=160+dist, y0=167,y1=glide?147+flap*.27:fold?210:fast?224:kick?149:229;
      limb(g,sx,y0,ex,y1,20,'#f4c49d','#7c5345');
      ellipse(g,ex,y1,9,11,'#f3c29a','#865845',2,sign*.23);
    }
    // Simple cream T-shirt over the moving arms, with sculpted folds.
    const shirt=g.createLinearGradient(117,145,204,226);
    shirt.addColorStop(0,'#fff8e8');shirt.addColorStop(.5,'#ede2ce');shirt.addColorStop(1,'#c9bca8');
    bez(g,'M129 141 Q152 134 190 140 Q207 149 207 181 L202 216 Q181 226 160 218 Q135 225 118 213 L115 176 Q114 151 129 141Z',shirt,'#89796b',3.6);
    fill(g,'M123 151 Q110 148 106 163 Q107 180 126 184 L139 162Z','#f2e5ce','#9e8b73',2.6);
    fill(g,'M199 151 Q216 150 218 166 Q217 181 198 185 L186 162Z','#f5e6d3','#9e8b73',2.6);
    line(g,'M130 195 Q146 191 156 199','#d8c7b2',2);
    line(g,'M174 195 Q186 201 197 195','#c9b9a2',2);
    line(g,'M127 211 Q161 217 198 212','#b6a89b',2.4);
    // Tied boja-gi knot above the top, no premium gold emblem.
    fill(g,'M147 143 Q131 137 138 148 Q146 163 157 153 Q164 159 175 152 Q188 136 173 139 L160 148Z',
      '#c99363','#714d36',2.5);
    ellipse(g,160,151,6,6,'#b57d52','#744a31',2);
    fill(g,'M160 155 L164 178 L154 172Z','#c49264','#7d5338',2);
    // Protect the user's EXACT original face and hairstyle.
    drawHead(g,face,who,pose,frame);
    if(fast){
      line(g,'M66 115 L53 93','#b8e8ff',2.5);
      line(g,'M254 130 L269 104','#b8e8ff',2.5);
    }
    if(hit){
      for(const dx of [-62,57]){
        ellipse(g,160+dx,76,5,5,'#ffe7a6');
      }
    }
    g.restore();
    return c;
  }
  function frameOf(who,pose,number,face){
    const key=who+':'+pose+':'+number;
    const cached=caches.get(key);if(cached)return cached;
    const made=makeFrame(who,pose,number,face);
    caches.set(key,made);return made;
  }
  function draw(opts){
    const {ctx,x,y,u,who,fold,elapsed,speed,dead,hopping,hopFrom,hopVisual,images}=opts;
    const face=who==='uiji'?images.uiji:images.braking;
    if(!face||!srcSize(face).w)return false;
    const pose=dead?'hit':hopping?(hopFrom==='L'?'kickR':'kickL'):
      fold>.78?(speed>800?'fast':'fold'):fold>.28?'fold':'glide';
    const phase=pose==='kickR'||pose==='kickL'?
      clamp(Math.floor(hopVisual*FRAMES),0,FRAMES-1):
      Math.floor(elapsed*(pose==='fast'?15:pose==='fold'?12:10))%FRAMES;
    const sprite=frameOf(who,pose,phase,face);
    const size=178*u,rot=hopping?(hopFrom==='L'?-1:1)*(-.15+.25*hopVisual):0;
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);
    ctx.drawImage(sprite,-size*.50,-size*.52,size,size);
    ctx.restore();return true;
  }
  window.HellStarterPoses={draw,poses,frames:FRAMES,getCachedCount:()=>caches.size};
})();