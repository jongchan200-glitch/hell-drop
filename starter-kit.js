'use strict';
/* Starter Outfit V2 — paint-accurate non-destructive art test.
   Original Work key-pose pixels remain the face, hair, hands, silhouette,
   lighting, motion and footwear shape. Clothing colors replace existing
   cloth pixels instead of drawing flat polygons across a 3D figure.
   Backcloth painted UNDER original art, helmet on its real head anchor.
   This prototype does not grant cosmetic shop ownership or stat changes. */
(()=>{
  const q=new URLSearchParams(location.search);
  if(q.get('keypose')!=='1'||q.get('starter')!=='1')return;
  const gear={cape:true,top:true,bottom:true,shoes:true,helmet:true};
  const kit={gear,revision:0,paintUnder,paintOver};
  window.HellStarterKit=kit;
  const shapes=[
    // Positions estimated from each actual Work 8-pose PNG cell, not guessed
    // from the in-game actor's canvas bounds.
    {shirt:[.50,.53,.20,.135],shorts:[.50,.68,.22,.095],legs:[[.32,.785,.13,.10],[.67,.78,.13,.10]],feet:[[.265,.785,.145,.12],[.725,.79,.155,.12]],head:[.50,.195,0],shoulder:[.50,.435],spread:1},
    {shirt:[.50,.525,.18,.137],shorts:[.50,.665,.21,.10],legs:[[.425,.755,.10,.115],[.58,.765,.10,.115]],feet:[[.465,.91,.075,.11],[.565,.91,.075,.11]],head:[.50,.20,0],shoulder:[.50,.43],spread:.42},
    {shirt:[.52,.49,.195,.12],shorts:[.515,.62,.18,.09],legs:[[.43,.76,.10,.15],[.64,.79,.10,.17]],feet:[[.44,.915,.08,.09],[.62,.925,.08,.09]],head:[.53,.245,-.13],shoulder:[.515,.43],spread:.3},
    {shirt:[.525,.535,.18,.135],shorts:[.52,.66,.19,.10],legs:[[.36,.70,.13,.12],[.675,.75,.13,.14]],feet:[[.30,.785,.14,.08],[.795,.89,.115,.085]],head:[.60,.225,.10],shoulder:[.52,.455],spread:.48},
    {shirt:[.50,.55,.16,.13],shorts:[.50,.69,.175,.085],legs:[[.44,.79,.09,.12],[.59,.83,.075,.12]],feet:[[.45,.942,.065,.075],[.59,.943,.066,.075]],head:[.50,.19,0],shoulder:[.50,.447],spread:.88},
    {shirt:[.50,.55,.16,.13],shorts:[.50,.68,.18,.09],legs:[[.445,.78,.085,.12],[.57,.79,.085,.13]],feet:[[.46,.925,.065,.075],[.565,.935,.065,.075]],head:[.50,.195,0],shoulder:[.50,.445],spread:.38},
    {shirt:[.455,.525,.17,.13],shorts:[.44,.635,.145,.085],legs:[[.22,.635,.20,.05],[.64,.81,.095,.16]],feet:[[.087,.62,.105,.10],[.74,.944,.095,.075]],head:[.37,.245,-.08],shoulder:[.45,.425],spread:.55},
    {shirt:[.46,.54,.17,.13],shorts:[.47,.665,.16,.09],legs:[[.40,.706,.12,.12],[.625,.81,.095,.13]],feet:[[.36,.715,.10,.095],[.65,.943,.075,.075]],head:[.40,.235,-.06],shoulder:[.45,.445],spread:.52}
  ];
  const clamp=v=>Math.max(0,Math.min(1,v));
  const ellipse=(x,y,e)=>{
    const dx=(x-e[0])/e[2],dy=(y-e[1])/e[3];
    return clamp((1-dx*dx-dy*dy)*22);
  };
  function textileColor(src,kind){
    // Use the source sprite's actual cloth highlights and folds: no invented
    // flat geometric T-shirt/short polygons and no visible triangle grid.
    const bright=(src[0]*.3+src[1]*.58+src[2]*.12);
    const d=Math.max(-27,Math.min(30,(bright-64)*.53));
    switch(kind){
      case 'top':return [207+d,199+d,185+d];
      case 'bottom':return [66+d*.70,81+d*.7,110+d*.9];
      case 'legs':return [213+d*.58,155+d*.6,128+d*.55];
      case 'shoes':return [78+d*.85,103+d*.88,145+d];
    }
  }
  function dressPixelArt(ctx,i,w,h){
    const p=shapes[i],im=ctx.getImageData(0,0,w,h),d=im.data;
    for(let py=0;py<h;py++){
      const y=(py+.5)/h;
      for(let px=0;px<w;px++){
        const x=(px+.5)/w,n=(py*w+px)*4,a=d[n+3];
        if(a<35)continue;
        const r=d[n],g=d[n+1],b=d[n+2];
        const bright=.3*r+.59*g+.11*b;
        const chroma=Math.max(r,g,b)-Math.min(r,g,b);
        // Hair and skin are never recolored; material is gray-charcoal.
        const fabric=bright<156&&chroma<42;
        const shoeMaterial=bright>92&&chroma<34;
        let type='',strength=0;
        const foot=Math.max(...p.feet.map(e=>ellipse(x,y,e)));
        const leg=Math.max(...p.legs.map(e=>ellipse(x,y,e)));
        if(gear.shoes&&foot>.02&&shoeMaterial){type='shoes';strength=foot;}
        if(gear.bottom&&leg>.03&&fabric&&(!type||strength<.4)){type='legs';strength=leg;}
        const pant=ellipse(x,y,p.shorts);
        if(gear.bottom&&pant>.03&&fabric){type='bottom';strength=pant;}
        const shirt=ellipse(x,y,p.shirt);
        if(gear.top&&shirt>.03&&fabric){type='top';strength=shirt;}
        if(!type)continue;
        const col=textileColor([r,g,b],type);
        // Subtle alpha feather suppresses hard mask outlines at shoulders.
        const fac=strength*.98;
        d[n]=Math.max(0,Math.min(255,r*(1-fac)+col[0]*fac));
        d[n+1]=Math.max(0,Math.min(255,g*(1-fac)+col[1]*fac));
        d[n+2]=Math.max(0,Math.min(255,b*(1-fac)+col[2]*fac));
      }
    }
    ctx.putImageData(im,0,0);
  }
  function capePanel(c,p,side){
    const [sx,sy]=p.shoulder,wide=p.spread,dx=side*(.21+.21*wide);
    const x=sx+side*.105;
    c.beginPath();
    c.moveTo(x,sy-.037);
    c.bezierCurveTo(x+side*.12,sy-.06,x+dx,sy-.09,x+dx*1.10,sy+.025);
    c.bezierCurveTo(x+dx*1.14,sy+.11,x+dx*.86,sy+.28,x+dx*.83,sy+.34);
    c.quadraticCurveTo(x+dx*.46,sy+.30,x+side*.15,sy+.20);
    c.quadraticCurveTo(x+side*.14,sy+.055,x,sy-.037);
    const color=c.createLinearGradient(x,sy,x+dx,sy+.32);
    color.addColorStop(0,'#e5ceb0');color.addColorStop(.52,'#b99d79');color.addColorStop(1,'#927d67');
    c.fillStyle=color;c.fill();
    c.strokeStyle='#8e775e';c.lineWidth=.006;c.stroke();
    c.beginPath();c.moveTo(x+side*.04,sy);
    c.bezierCurveTo(x+dx*.70,sy+.12,x+dx*.64,sy+.22,x+dx*.83,sy+.32);
    c.strokeStyle='#efe0cd66';c.lineWidth=.010;c.stroke();
  }
  function paintUnder(ctx,i,w,h){
    if(!gear.cape)return;
    const p=shapes[i];
    ctx.save();ctx.scale(w,h);
    // Airflow pulls a plain cotton tablecloth backwards; stays BEHIND arms,
    // silhouette and hair, so it cannot become two dangling side bags.
    capePanel(ctx,p,-1);capePanel(ctx,p,1);
    ctx.restore();
  }
  function roundCap(c,x,y,w,h){
    const g=c.createLinearGradient(x-w/2,y,x+w/2,y+h);
    g.addColorStop(0,'#ffeaa7');g.addColorStop(.32,'#f6cd57');g.addColorStop(.73,'#d7a033');g.addColorStop(1,'#a16c23');
    c.beginPath();
    c.moveTo(x-w*.46,y+h*.73);
    c.bezierCurveTo(x-w*.44,y+h*.34,x-w*.28,y+h*.035,x,y);
    c.bezierCurveTo(x+w*.28,y+h*.035,x+w*.45,y+h*.34,x+w*.46,y+h*.73);
    c.closePath();c.fillStyle=g;c.fill();c.strokeStyle='#8a622d';c.lineWidth=.008;c.stroke();
    c.beginPath();c.moveTo(x-w*.075,y+.003);
    c.quadraticCurveTo(x,y-h*.055,x+w*.075,y+.003);
    c.lineTo(x+w*.09,y+h*.67);c.quadraticCurveTo(x,y+h*.70,x-w*.09,y+h*.67);
    c.closePath();c.fillStyle='#efc654';c.fill();c.strokeStyle='#c18d2c';c.lineWidth=.005;c.stroke();
    c.beginPath();c.ellipse(x,y+h*.73,w*.52,h*.125,0,0,Math.PI*2);
    c.fillStyle='#e0ad3b';c.fill();c.strokeStyle='#92652a';c.lineWidth=.007;c.stroke();
    c.beginPath();c.moveTo(x-w*.32,y+h*.4);c.quadraticCurveTo(x-w*.23,y+h*.1,x-w*.09,y+h*.09);
    c.strokeStyle='#fff2b29c';c.lineWidth=.008;c.stroke();
    // The cheek/eyes belong entirely to the original Work sprite.
  }
  function paintOver(ctx,i,w,h){
    const p=shapes[i];
    if(gear.top||gear.bottom||gear.shoes)dressPixelArt(ctx,i,w,h);
    ctx.save();ctx.scale(w,h);
    if(gear.cape){
      // Very small, inconspicuous knot in front of the collar.
      const x=p.shoulder[0],y=p.shoulder[1]+.018;
      ctx.beginPath();ctx.ellipse(x,y,.021,.014,0,0,Math.PI*2);
      ctx.fillStyle='#c4a584';ctx.fill();ctx.strokeStyle='#8a735c';ctx.lineWidth=.004;ctx.stroke();
    }
    if(gear.helmet){
      const [x,y,a]=p.head;
      ctx.save();ctx.translate(x,y);ctx.rotate(a);
      roundCap(ctx,0,-.118,.355,.205);
      ctx.restore();
    }
    ctx.restore();
  }
  function createControls(){
    const panel=document.createElement('aside');panel.id='starterGearPanel';
    panel.style.cssText='position:fixed;right:8px;top:calc(94px + env(safe-area-inset-top));z-index:9999;max-width:min(240px,70vw);font:12px system-ui;color:#f2f6fb;text-align:left;pointer-events:auto';
    const toggle=document.createElement('button');toggle.type='button';
    toggle.textContent='🧰 초보 장비 5종';
    toggle.style.cssText='width:100%;min-height:36px;background:#263a43ed;border:1px solid #e1cf8b;color:#fff2cf;border-radius:12px;font-weight:800;padding:7px 10px;box-shadow:0 2px 9px #0006';
    const fields=document.createElement('div');fields.hidden=true;
    fields.style.cssText='padding:9px;margin-top:4px;background:#1c2937f5;border:1px solid #80715b;border-radius:12px;box-shadow:0 5px 20px #0009';
    const title=document.createElement('div');title.textContent='장비를 하나씩 벗겨서 비교';title.style.cssText='margin:0 0 6px;font-size:11px;color:#d7e2ed';fields.appendChild(title);
    const names=[['helmet','노란 공사장 헬멧'],['top','늘어난 기본 티셔츠'],['bottom','편안한 반바지'],['shoes','파란 슬리퍼'],['cape','보자기 망토']];
    for(const [key,label] of names){
      const row=document.createElement('label');row.style.cssText='display:flex;align-items:center;gap:8px;min-height:35px;border-top:1px solid #ffffff18';
      const check=document.createElement('input');check.type='checkbox';check.checked=true;
      check.style.cssText='width:18px;height:18px;accent-color:#eac66e';
      check.addEventListener('change',()=>{gear[key]=check.checked;kit.revision++;});
      const span=document.createElement('span');span.textContent=label;
      row.append(check,span);fields.appendChild(row);
    }
    const info=document.createElement('div');
    info.textContent='외형 시험용 · 코인/방어력/장비 저장은 변경 없음';
    info.style.cssText='margin-top:6px;font-size:10px;line-height:1.4;color:#cfbe98';fields.appendChild(info);
    toggle.addEventListener('click',()=>{fields.hidden=!fields.hidden;toggle.setAttribute('aria-expanded',String(!fields.hidden));});
    toggle.setAttribute('aria-expanded','false');panel.append(toggle,fields);document.body.appendChild(panel);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',createControls,{once:true});
  else createControls();
})();