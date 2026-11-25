'use strict';
/* Starter Outfit V1: clean, inexpensive beginning gear painted in the
   coordinate space of each original Work key-pose. No tears or sewn patches.
   This is a non-destructive, opt-in cosmetic test; physical helmet/bubble
   mechanics and existing wardrobe saves remain unchanged. */
(()=>{
  const qs=new URLSearchParams(location.search);
  if(qs.get('keypose')!=='1'||qs.get('starter')!=='1')return;
  const gear={cape:true,top:true,bottom:true,shoes:true,helmet:true};
  const kit={revision:0,gear,paint};
  window.HellStarterKit=kit;
  // Values are normalized to the cropped 8-key-pose atlas frames. Face and
  // original exposed limbs are retained; costume sections are separate layers.
  const POSES=[
    {h:[.49,.29,0],t:[.49,.51,0],b:[.49,.68,0],f:[[.27,.92,-.14],[.72,.93,.12]],s:1},
    {h:[.50,.29,-.06],t:[.50,.51,-.10],b:[.49,.69,-.12],f:[[.30,.93,-.14],[.70,.95,.14]],s:.57},
    {h:[.50,.28,-.12],t:[.50,.50,-.16],b:[.50,.68,-.15],f:[[.30,.92,-.20],[.71,.92,.18]],s:.42},
    {h:[.60,.28,.12],t:[.55,.51,.33],b:[.52,.67,.22],f:[[.31,.78,.47],[.73,.91,-.48]],s:.57},
    {h:[.51,.29,0],t:[.50,.51,0],b:[.50,.68,0],f:[[.27,.92,-.13],[.73,.93,.12]],s:1},
    {h:[.51,.29,.04],t:[.50,.51,.08],b:[.50,.69,.06],f:[[.29,.92,-.14],[.71,.94,.16]],s:.50},
    {h:[.29,.25,-.27],t:[.48,.50,-.37],b:[.49,.65,-.29],f:[[.08,.54,-.65],[.81,.94,.30]],s:.60},
    {h:[.40,.26,.24],t:[.49,.52,.38],b:[.47,.68,.24],f:[[.27,.73,.76],[.19,.94,-.38]],s:.58}
  ];
  const clamp=v=>Math.max(0,Math.min(1,v));
  function grad(c,x0,y0,x1,y1,stops){
    const g=c.createLinearGradient(x0,y0,x1,y1);
    for(const [at,color] of stops)g.addColorStop(at,color);
    return g;
  }
  function fill(c,color,edge='#5b4b41',width=.006){
    c.fillStyle=color;c.fill();
    if(edge){c.strokeStyle=edge;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();}
  }
  function fold(c,points,col,width=.006){
    c.beginPath();c.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);
    c.strokeStyle=col;c.lineWidth=width;c.lineCap='round';c.stroke();
  }
  function drawCape(c,p){
    const [cx,cy,angle]=p.t;
    c.save();c.translate(cx,cy);c.rotate(angle);
    const spread=p.s;
    // Two soft, continuous cotton drapes; deliberately NO tears or patches.
    for(const side of [-1,1]){
      c.save();c.scale(side,1);
      const g=grad(c,.07,-.1,.28,.30,[[0,'#f0ddbc'],[.48,'#c6ad8d'],[1,'#9a8069']]);
      c.beginPath();
      c.moveTo(.066,-.132);
      c.bezierCurveTo(.19,-.12,.18+spread*.14,.035,.24+spread*.16,.25);
      c.quadraticCurveTo(.18+spread*.07,.34,.125+spread*.13,.295);
      c.quadraticCurveTo(.17,.12,.055,.035);
      c.closePath();fill(c,g,'#665345',.009);
      fold(c,[[.14,-.05],[.19+spread*.07,.085],[.24+spread*.09,.25]],'#f8e8cd88',.008);
      fold(c,[[.12,-.06],[.135,.105],[.19+spread*.03,.285]],'#78604a66',.007);
      c.restore();
    }
    // Simple cloth gathers and a knot, not a dramatic superhero cape clasp.
    c.beginPath();c.moveTo(-.13,-.128);c.quadraticCurveTo(0,-.09,.13,-.128);
    c.lineTo(.09,-.075);c.quadraticCurveTo(0,-.041,-.09,-.075);c.closePath();
    fill(c,'#e6d3b3','#77614f',.007);
    c.beginPath();c.ellipse(0,-.096,.038,.029,0,0,Math.PI*2);
    fill(c,'#dcc49f','#796550',.006);
    c.restore();
  }
  function drawShorts(c,p){
    const [x,y,a]=p.b;
    c.save();c.translate(x,y);c.rotate(a);
    c.beginPath();
    c.moveTo(-.205,-.081);
    c.quadraticCurveTo(0,-.113,.205,-.081);
    c.lineTo(.214,.039);
    c.quadraticCurveTo(.210,.117,.152,.128);
    c.lineTo(.030,.127);
    c.lineTo(0,.064);
    c.lineTo(-.034,.128);
    c.lineTo(-.164,.125);
    c.quadraticCurveTo(-.219,.111,-.221,.046);
    c.closePath();
    fill(c,grad(c,-.22,-.07,.22,.10,[[0,'#526378'],[.38,'#313c56'],[1,'#27334b']]),'#212836',.008);
    fold(c,[[-.204,-.060],[0,-.067],[.206,-.060]],'#a1a9bb55',.006);
    fold(c,[[0,-.057],[.004,.035],[.035,.118]],'#141c31a0',.007);
    fold(c,[[-.208,.103],[-.155,.112],[-.044,.115]],'#b1b4c066',.005);
    fold(c,[[.041,.114],[.150,.113],[.207,.094]],'#b1b4c066',.005);
    fold(c,[[-.023,-.067],[-.035,-.011]],'#ece1cc',.006);
    fold(c,[[.019,-.067],[.035,-.017]],'#ece1cc',.006);
    c.restore();
  }
  function drawShirt(c,p){
    const [x,y,a]=p.t;
    c.save();c.translate(x,y);c.rotate(a);
    c.beginPath();
    c.moveTo(-.105,-.145);
    c.quadraticCurveTo(-.155,-.133,-.222,-.105);
    c.lineTo(-.264,-.035);
    c.lineTo(-.204,.005);
    c.lineTo(-.183,.163);
    c.quadraticCurveTo(-.050,.188,.006,.166);
    c.quadraticCurveTo(.107,.190,.199,.151);
    c.lineTo(.204,.002);
    c.lineTo(.264,-.036);
    c.lineTo(.218,-.110);
    c.quadraticCurveTo(.156,-.136,.105,-.145);
    c.quadraticCurveTo(0,-.075,-.105,-.145);
    c.closePath();
    fill(c,grad(c,-.25,-.12,.24,.16,[[0,'#ece8df'],[.50,'#d9d5cd'],[1,'#b2aea9']]),'#776e67',.007);
    // Relaxed, slightly stretched neckline; no exposed damage.
    c.beginPath();c.moveTo(-.103,-.145);c.quadraticCurveTo(0,-.039,.104,-.145);
    c.strokeStyle='#aaa19a';c.lineWidth=.012;c.stroke();
    c.beginPath();c.moveTo(-.095,-.140);c.quadraticCurveTo(0,-.050,.094,-.140);
    c.strokeStyle='#f9f7ee';c.lineWidth=.006;c.stroke();
    fold(c,[[-.182,.019],[-.156,.067],[-.183,.141]],'#a8a3a083',.008);
    fold(c,[[.151,-.015],[.127,.049],[.166,.133]],'#f6f2ec97',.009);
    fold(c,[[-.072,.113],[.012,.138],[.138,.122]],'#b2aea080',.007);
    fold(c,[[-.245,-.029],[-.208,-.010]],'#f9f5ecb0',.006);
    fold(c,[[.243,-.031],[.202,-.010]],'#f9f5ecb0',.006);
    c.restore();
  }
  function drawSlipper(c,foot){
    const [x,y,rotation]=foot;
    c.save();c.translate(x,y);c.rotate(rotation);
    // Sole, exposed toes and a single broad blue rubber strap.
    c.beginPath();c.ellipse(0,0,.142,.050,-.08,0,Math.PI*2);
    fill(c,'#26364c','#1a2635',.007);
    c.beginPath();c.ellipse(-.006,-.014,.130,.046,-.08,0,Math.PI*2);
    fill(c,'#63718e','#3e4963',.006);
    c.beginPath();c.ellipse(-.043,-.015,.076,.032,-.06,0,Math.PI*2);
    fill(c,'#eec49f','#b78471',.005);
    for(let k=0;k<3;k++){
      c.beginPath();c.ellipse(-.089+k*.028,-.025,.014,.011,.1,0,Math.PI*2);
      c.fillStyle='#f2d0ac';c.fill();
    }
    c.beginPath();
    c.moveTo(-.015,-.061);
    c.quadraticCurveTo(.086,-.073,.120,-.019);
    c.lineTo(.081,.017);
    c.quadraticCurveTo(.035,-.013,-.023,-.009);
    c.closePath();
    fill(c,grad(c,-.02,-.06,.10,.03,[[0,'#8491b0'],[.55,'#526483'],[1,'#374765']]),'#38445d',.006);
    fold(c,[[.002,-.051],[.080,-.040]],'#c2ccdf75',.004);
    c.restore();
  }
  function drawHelmet(c,p){
    const [x,noseY,angle]=p.h;
    c.save();c.translate(x,noseY-.122);c.rotate(angle);
    c.beginPath();c.moveTo(-.165,.026);
    c.bezierCurveTo(-.168,-.085,-.104,-.180,0,-.190);
    c.bezierCurveTo(.110,-.188,.173,-.093,.166,.025);
    c.closePath();
    fill(c,grad(c,-.12,-.16,.17,.04,[[0,'#fff4a0'],[.28,'#f5d35b'],[.65,'#e8a828'],[1,'#bd7d17']]),'#75521e',.010);
    // Distinct construction-hat crown rib.
    c.beginPath();c.moveTo(-.037,-.185);c.quadraticCurveTo(-.010,-.230,.035,-.184);
    c.lineTo(.052,-.010);c.quadraticCurveTo(.001,.003,-.051,-.010);c.closePath();
    fill(c,'#f8d560','#9d7526',.006);
    c.beginPath();c.ellipse(0,.025,.197,.034,0,0,Math.PI*2);
    fill(c,grad(c,-.10,-.015,.12,.065,[[0,'#ffdf60'],[.65,'#e6a72e'],[1,'#bc8121']]),'#7d5b23',.008);
    fold(c,[[-.112,-.107],[-.083,-.140],[-.048,-.156]],'#fff9b7a1',.010);
    fold(c,[[.084,-.115],[.125,-.066]],'#916c274f',.007);
    // Small leather/cloth strap only at the temples; face stays unobstructed.
    fold(c,[[-.143,.047],[-.131,.108]],'#634c39',.012);
    fold(c,[[.145,.047],[.131,.108]],'#634c39',.012);
    c.restore();
  }
  function paint(ctx,idx,w,h){
    if(!kit||idx<0||idx>7||!w||!h)return;
    const p=POSES[idx];
    ctx.save();ctx.scale(w,h);
    if(gear.cape)drawCape(ctx,p);
    if(gear.bottom)drawShorts(ctx,p);
    if(gear.top)drawShirt(ctx,p);
    if(gear.shoes)for(const f of p.f)drawSlipper(ctx,f);
    if(gear.helmet)drawHelmet(ctx,p);
    ctx.restore();
  }
  function createControls(){
    const wrap=document.createElement('aside');
    wrap.id='starterGearPanel';
    wrap.style.cssText='position:fixed;right:8px;top:calc(94px + env(safe-area-inset-top));z-index:9999;max-width:min(245px,70vw);font:12px system-ui;color:#f2f6fb;text-align:left;pointer-events:auto';
    const button=document.createElement('button');
    button.type='button';button.textContent='🧰 초보 장비 5종';
    button.style.cssText='width:100%;min-height:36px;background:#253b4beb;border:1px solid #e1cf8b;color:#fff2cf;border-radius:12px;font-weight:800;padding:7px 10px;box-shadow:0 2px 9px #0006';
    const field=document.createElement('div');field.hidden=true;
    field.style.cssText='padding:9px;margin-top:4px;background:#1c2937f5;border:1px solid #80715b;border-radius:12px;box-shadow:0 5px 20px #0009';
    const title=document.createElement('div');title.textContent='각 장비를 꺼서 원래 모습과 비교';title.style.cssText='margin:0 0 6px;font-size:11px;color:#d7e2ed';
    field.appendChild(title);
    const names=[['helmet','노란 공사장 헬멧'],['top','늘어난 기본 티셔츠'],['bottom','평범한 반바지'],['shoes','발가락 보이는 슬리퍼'],['cape','보자기 망토']];
    for(const [id,label] of names){
      const line=document.createElement('label');
      line.style.cssText='display:flex;align-items:center;gap:8px;min-height:35px;border-top:1px solid #ffffff18';
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=true;
      checkbox.style.cssText='width:18px;height:18px;accent-color:#eac66e';
      checkbox.addEventListener('change',()=>{gear[id]=checkbox.checked;kit.revision++;});
      const span=document.createElement('span');span.textContent=label;
      line.append(checkbox,span);field.appendChild(line);
    }
    const sub=document.createElement('div');
    sub.textContent='시험용 외형 장착 · 구매/저장/방어력 변경 없음';
    sub.style.cssText='margin-top:6px;font-size:10px;line-height:1.4;color:#cfbe98';
    field.appendChild(sub);
    button.addEventListener('click',()=>{field.hidden=!field.hidden;button.setAttribute('aria-expanded',String(!field.hidden));});
    button.setAttribute('aria-expanded','false');
    wrap.append(button,field);document.body.appendChild(wrap);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',createControls,{once:true});
  else createControls();
})();