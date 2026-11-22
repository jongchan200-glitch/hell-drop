'use strict';
/*
 * HELL FALL WEB RESTORE 0.1 — playable browser translation of V4.2 Kotlin game.
 * Original V4.2 mechanics: hold cape to brake, press to switch walls.
 * Future proposed rapid-tap acceleration is NOT included here yet.
 * Restored build now uses the original V4.2 character art sprites and intro profile.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $('scene'), ctx = canvas.getContext('2d', { alpha: false });
  const gameRoot = $('game'), hud = $('hud'), controls = $('controls'), overlay = $('overlay');
  const brakeBtn = $('brake'), jumpBtn = $('jump'), toast = $('toast');
  const T = { LIMIT:10, MIN:92, MAX:1560, START:132, GRAVITY:152, CAPE_DECEL:570, CAPE_TAP_BRAKE:38, HOP_SECONDS:.155, ZONE_LENGTH:5000 };
  const ZONES=['지표면 · 지하 동굴','깊은 암반층','마그마 지대','맨틀 지대','외핵','내핵','지옥의 심연'];
  const PALETTES=[
    {shadow:'#14151c',wall:'#352d32',facet:'#61504c',glow:'#ff974e',sky:'#0c101a'},
    {shadow:'#111d2a',wall:'#30455a',facet:'#6887a4',glow:'#70d3e7',sky:'#101b2e'},
    {shadow:'#24121d',wall:'#523039',facet:'#9e5244',glow:'#ff883c',sky:'#220c17'},
    {shadow:'#300e22',wall:'#67283e',facet:'#ae3b51',glow:'#ffc05c',sky:'#27091b'},
    {shadow:'#291c21',wall:'#6a4d43',facet:'#c59a60',glow:'#ffde91',sky:'#291b28'},
    {shadow:'#423528',wall:'#8d745d',facet:'#e5cd96',glow:'#fff3c2',sky:'#312a35'},
    {shadow:'#160d28',wall:'#3b1e53',facet:'#86529a',glow:'#c973ff',sky:'#0c071a'}
  ];
  const COLORS={mint:'#6be1cd',gold:'#f8cc78',cream:'#ffe9d2',red:'#ff4f61',orange:'#f6924f'};
  const TYPE_BY_ZONE=[['ROOT','ROCK','TIMBER','ROOT'],['ROCK','CRYSTAL','ROCK','CRYSTAL'],['LAVA','ROCK','LAVA'],['PRESSURE','LAVA','CRYSTAL'],['METAL','PRESSURE','METAL'],['CORE','METAL','CRYSTAL'],['CHAIN','CORE','CHAIN']];
  let W=400,H=800,clock=0,lastFrame=0,s=makeGame(),best=readRecord(),heldKeys=new Set(),brakeTouches=new Set();
  const images={};
  const IMAGE_FILES={falling:'hero_fall',braking:'hero_cape',jumpLeft:'hero_jump_left',jumpRight:'hero_jump_right',intro:'hero_intro',dizzy:'hero_hit'};
  Object.entries(IMAGE_FILES).forEach(([key,file])=>{
    const img=new Image(); img.onload=()=>{images[key]=img;if(key==='intro')showPortrait(img);};
    img.onerror=()=>{}; img.src='assets/'+file+'.webp';
  });
  function showPortrait(img){ if(!img?.naturalWidth)return;const p=$('portrait');p.querySelector('img')?.remove();
    const node=new Image();node.src=img.src;node.alt='';p.append(node);$('portraitFallback').classList.add('hidden'); }
  function readRecord(){try{return Number(localStorage.getItem('hell_fall_web_v42_best')||0)||0;}catch(_){return 0;}}
  function saveRecord(value){try{localStorage.setItem('hell_fall_web_v42_best',String(value));}catch(_){/*local file private mode*/}}
  function zoneOf(depth){return Math.min(6,Math.floor(depth/5000));}
  function tierOf(depth){return Math.min(17,Math.floor(depth/2000));}
  function wallX(w){return w==='L'?.29:.71;}
  function otherWall(w){return w==='L'?'R':'L';}
  function smooth(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
  function posX(g,p=g.hopProgress){return wallX(g.hopFrom)*(1-smooth(p))+wallX(g.wall)*smooth(p);}
  function rngSeed(seed){let x=(seed>>>0)||1;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function makeGame(stage='READY'){return{seed:(Math.random()*1000000000)|0,stage,depth:0,speed:T.START,timeLeft:T.LIMIT,elapsed:0,introElapsed:0,capeOpen:false,wall:'L',hopFrom:'L',hopProgress:1,obstacles:[],timeGates:[],nextObstacle:370,nextTimeGate:1400,obstacleNumber:0,gateNumber:0,gateFlash:0,zoneFlash:0,lastBonus:0,failure:''};}
  function start(intro){s=makeGame(intro?'INTRO':'PLAYING');brakeTouches.clear();heldKeys.clear();updateUI();}
  function finish(msg){s.stage='OVER';s.failure=msg;if(s.depth>best){best=s.depth;saveRecord(best);}brakeTouches.clear();heldKeys.clear();brakeBtn.classList.remove('active');updateUI();}
  function isBraking(){return brakeTouches.size>0||heldKeys.has('Space');}
  function jump(){if(s.stage!=='PLAYING'||s.hopProgress<1)return;s.hopFrom=s.wall;s.wall=otherWall(s.wall);s.hopProgress=0;jumpBtn.classList.add('active');}
  function advance(dt){
    const old=s.depth,tier=tierOf(old),cap=Math.min(T.MAX,312+tier*76),capeHeld=isBraking();
    const brakeKick=capeHeld&&!s.capeOpen?T.CAPE_TAP_BRAKE:0;
    const nextSpeed=capeHeld?Math.max(T.MIN,s.speed-brakeKick-T.CAPE_DECEL*dt):Math.min(cap,s.speed+(T.GRAVITY+tier*11.2)*dt);
    const depth=old+(s.speed+nextSpeed)*.5*dt,hop=Math.min(1,s.hopProgress+dt/T.HOP_SECONDS);
    let remain=Math.max(0,s.timeLeft-dt),glow=Math.max(0,s.gateFlash-dt),bonus=s.lastBonus;
    const zoneFlash=zoneOf(depth)>zoneOf(old)?2.1:Math.max(0,s.zoneFlash-dt);
    s.timeGates=s.timeGates.filter(g=>g.depth>=old-80);
    while(s.nextTimeGate<depth+2500){
      const r=rngSeed(s.seed+8099+s.gateNumber*97),wall=r()<.5?'L':'R';
      s.timeGates.push({depth:s.nextTimeGate,wall});
      const localTier=tierOf(s.nextTimeGate);
      s.nextTimeGate+=1260+Math.min(450,localTier*38)+r()*220;s.gateNumber++;
    }
    const traveled=Math.max(.001,depth-old);
    for(const g of s.timeGates){
      if(!(old<g.depth&&depth>=g.depth))continue;
      const along=Math.max(0,Math.min(1,(g.depth-old)/traveled));
      const p=Math.min(1,s.hopProgress+dt*along/T.HOP_SECONDS);
      if(Math.abs(posX(s,p)-wallX(g.wall))<=.12){
        bonus=3.25-Math.min(.65,tier*.04);remain=Math.min(T.LIMIT,remain+bonus);glow=1.2;g.collected=true;
      }
    }
    s.obstacles=s.obstacles.filter(o=>o.depth>=old-90);
    while(s.nextObstacle<depth+2600){
      const r=rngSeed(s.seed+1823+s.obstacleNumber*901),oDepth=s.nextObstacle;
      const wall=r()<.5?'L':'R';
      const kinds=TYPE_BY_ZONE[zoneOf(oDepth)],type=kinds[Math.floor(r()*kinds.length)],variant=Math.floor(r()*5);
      if(!s.timeGates.some(g=>Math.abs(g.depth-oDepth)<95))s.obstacles.push({depth:oDepth,wall,type,variant});
      const dangerTier=tierOf(oDepth),localTop=Math.min(T.MAX,312+dangerTier*76);
      const minSpacing=localTop*(.47-Math.min(7,dangerTier)*.013);
      s.nextObstacle+=minSpacing+35+r()*(88-Math.min(55,dangerTier*3));s.obstacleNumber++;
    }
    let crashed=false;
    for(const o of s.obstacles){
      if(!(old<=o.depth+15&&depth>=o.depth-15))continue;
      const along=Math.max(0,Math.min(1,(o.depth-15-old)/traveled));
      const p=Math.min(1,s.hopProgress+dt*along/T.HOP_SECONDS);
      if(Math.abs(posX(s,p)-wallX(o.wall))<.18){crashed=true;break;}
    }
    Object.assign(s,{capeOpen:capeHeld,speed:nextSpeed,depth,timeLeft:remain,elapsed:s.elapsed+dt,hopProgress:hop,gateFlash:glow,zoneFlash,lastBonus:bonus});
    if(hop>=1)jumpBtn.classList.remove('active');
    if(crashed)finish('지층 장애물에 부딪혔어!');else if(remain<=0)finish('시간이 다 됐어!');
  }
  function updateUI(){
    const playing=s.stage==='PLAYING',over=s.stage==='OVER';
    hud.classList.toggle('hidden',!playing&&!over);controls.classList.toggle('hidden',!playing);overlay.classList.toggle('hidden',s.stage!=='READY'&&!over);
    if(s.stage==='READY'||over){
      $('menuTitle').textContent=over?'추락 종료!':'지옥 낙하';
      $('menuTitle').style.color=over?COLORS.red:COLORS.gold;
      $('menuSubtitle').classList.toggle('hidden',over);$('portrait').classList.toggle('hidden',over);$('readyCopy').classList.toggle('hidden',over);$('overCopy').classList.toggle('hidden',!over);
      $('start').textContent=over?'다시 도전하기':'지옥으로 뛰어들기!';
      if(over){$('failure').textContent=s.failure;$('finalDepth').innerHTML=Math.floor(s.depth)+' <small>m</small>';$('finalBest').textContent='최고 기록 '+Math.floor(best)+' m';}
    }
    $('zoneLabel').textContent=(zoneOf(s.depth)+1)+'구역 · '+ZONES[zoneOf(s.depth)];
    $('depthLabel').innerHTML=Math.floor(s.depth)+' <small>m</small>';
    $('recordLabel').textContent='최고 '+Math.floor(Math.max(best,s.depth))+' m';
    $('timeLabel').textContent=s.timeLeft.toFixed(1);$('timeLabel').style.color=s.timeLeft<5?COLORS.red:'white';
    $('timeCaption').classList.toggle('alert',s.timeLeft<3);
    $('speedLabel').textContent='속도 '+Math.floor(s.speed)+' m/s · 난이도 '+(tierOf(s.depth)+1);
    $('timeFill').style.width=(100*s.timeLeft/T.LIMIT)+'%';$('timeFill').classList.toggle('danger',s.timeLeft<3);
    brakeBtn.classList.toggle('active',isBraking());$('brakeHint').textContent=isBraking()?'제동 중':'짧게 탁 / 길게 꾹';
    toast.classList.add('hidden');toast.classList.remove('mint');
    if(playing && s.zoneFlash>0){toast.textContent=ZONES[zoneOf(s.depth)]+' 진입!';toast.style.opacity=String(Math.min(1,s.zoneFlash/1.5));toast.classList.remove('hidden');}
    if(playing && s.gateFlash>0){toast.textContent='⏱ +'+s.lastBonus.toFixed(1)+'초!';toast.style.opacity=String(Math.min(1,s.gateFlash/1.1));toast.classList.remove('hidden');toast.classList.add('mint');}
  }
  function fit(){const bounds=gameRoot.getBoundingClientRect();if(!bounds.width||!bounds.height)return;W=bounds.width;H=bounds.height;const dpr=Math.min(window.devicePixelRatio||1,2.5);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  function gradient(x0,y0,x1,y1,stops){const g=ctx.createLinearGradient(x0,y0,x1,y1);stops.forEach(([t,c])=>g.addColorStop(t,c));return g;}
  function disk(x,y,r,fill){ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
  function line(points,color,width=2){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
  function polygon(points,fill,outline,width=1){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(outline){ctx.strokeStyle=outline;ctx.lineWidth=width;ctx.stroke();}}
  function txt(str,x,y,size,color,align='center'){ctx.font='900 '+Math.max(7,size)+'px system-ui,sans-serif';ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(str,x,y);}
  function rndHalf(i){return((i*37+i*i*17)%100)/100;}
  function cave(){
    const u=W/400,z=zoneOf(s.depth),p=PALETTES[z],charY=H*.35,ppm=W*.0063;
    ctx.fillStyle=gradient(0,0,0,H,[[0,p.sky],[.52,p.shadow],[1,p.sky]]);ctx.fillRect(0,0,W,H);
    const g=ctx.createRadialGradient(W*.5,H*.65,6,W*.5,H*.68,H*.7);g.addColorStop(0,p.glow+'25');g.addColorStop(1,'#00000000');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#00000055';ctx.beginPath();ctx.roundRect(W*.255,-20*u,W*.49,H+40*u,110*u);ctx.fill();
    for(let side=0;side<2;side++){
      const left=side===0,boundary=W*(left?.231:.769);
      ctx.fillStyle=gradient(left?0:W*.76,0,left?W*.24:W,0,[[0,left?p.shadow:p.facet],[.5,p.wall],[1,left?p.facet:p.shadow]]);
      ctx.fillRect(left?0:W*.76,0,W*.24,H);
      line([[boundary,0],[boundary,H]],p.shadow,9*u);
      line([[boundary+(left?-4:4)*u,0],[boundary+(left?-4:4)*u,H]],p.glow,2*u);
    }
    const step=94*u,scroll=(s.depth*ppm*.64)%step,layers=Math.ceil(H/step)+4;
    for(let i=-2;i<=layers;i++){
      const y=i*step-scroll,k=((i%4)+4)%4;
      for(let side=0;side<2;side++){
        const left=side===0,outer=left?7*u:W-7*u,inner=W*(left?.197:.803),mid=W*(left?.115:.885);
        polygon([[outer,y+(7+k*3)*u],[mid,y-(10+k*4)*u],[inner,y+(5+k*9)*u],[mid,y+(45+k*6)*u],[outer,y+(66+k*2)*u]],p.facet+'65',p.shadow,2*u);
        line([[left?9*u:W-9*u,y+65*u],[mid,y+41*u],[inner,y+63*u]],p.glow+'8e',3*u);
      }
      const sy=y+79*u;
      if(z===0){
        ctx.beginPath();ctx.moveTo(W*.04,sy-43*u);ctx.bezierCurveTo(W*.11,sy-15*u,W*.10,sy+15*u,W*.245,sy+28*u);ctx.strokeStyle='#ae774d';ctx.lineWidth=5*u;ctx.stroke();
        if(k===1)line([[W*.77,sy-23*u],[W,sy-9*u]],'#bc8654',4*u);
      }else if(z===1){for(const side of [0,1]){const x=W*(side?.87:.13);polygon([[x-12*u,sy+20*u],[x,sy-22*u],[x+13*u,sy+19*u]],'#79d8f245',p.glow,1.5*u);}}
      else if(z<4){for(const side of [0,1]){const x=W*(side?.87:.13);disk(x,sy,21*u,p.glow+'24');disk(x,sy,4.7*u,p.glow);}}
      else if(z===4){line([[W*.03,sy],[W*.18,sy+19*u]],'#ffe4a0',4*u);disk(W*.87,sy,8*u,'#dd9d50');}
      else if(z===5){for(const side of [0,1]){const x=W*(side?.87:.13);polygon([[x,sy-27*u],[x+18*u,sy],[x,sy+26*u],[x-18*u,sy]],'#fae9af88','#fff9d1aa',1.6*u);}}
      else{disk(W*.085,sy,16*u,p.glow+'48');line([[W*.9,sy-38*u],[W*.84,sy+43*u]],'#ba8fd2',4*u);}
    }
    for(let i=0;i<18+z*3;i++){
      const x=W*(.265+rndHalf(i)*.47),y=(i*103+s.depth*ppm*(.3+(i%3)*.13))%(H+90*u)-45*u,r=(1.4+i%3)*u;
      const c=z===0?'#d5a56c':z===1?'#86c8e1':p.glow;disk(x,y,r*2.6,c+'18');disk(x,y,r,c+'b0');
    }
    for(let i=0;i<Math.min(35,5+Math.floor(s.speed/62));i++){
      const x=W*(.27+((i*41%100)/100)*.46),y=(i*131+s.depth*ppm*(1+i%4*.14))%(H+200*u)-90*u;
      line([[x,y],[x,y-(30+s.speed*.15+(i%4)*9)*u]],p.glow+'78',Math.max(1,u)*(1+i%3));
    }
    for(const g of s.timeGates){if(g.collected)continue;const y=charY+(g.depth-s.depth)*ppm;if(y>-85*u&&y<H+100*u)drawGate(g,y,u);}
    for(const o of s.obstacles){const y=charY+(o.depth-s.depth)*ppm;if(y>-100*u&&y<H+105*u)drawHazard(o,y,u);}
    const arc=Math.sin(Math.min(1,s.hopProgress)*Math.PI)*15*u;
    drawHero(posX(s)*W,charY-arc,u,s.capeOpen,s.elapsed,s.speed,s.stage==='OVER',s.hopProgress<1,s.hopFrom);
    if(s.speed>670){ctx.fillStyle='#ff4f6115';ctx.fillRect(0,0,W,H);}
    if(s.gateFlash>.72){ctx.fillStyle='#6be1cd20';ctx.fillRect(0,0,W,H);}
  }
  function drawGate(g,y,u){const x=wallX(g.wall)*W,p=(Math.sin(s.elapsed*8)+1)/2;
    disk(x,y,43*u,`rgba(107,225,205,${.10+p*.08})`);disk(x,y,27*u,'#6be1cd35');disk(x,y,20*u,'#1a4d4b');
    ctx.beginPath();ctx.arc(x,y,18*u,0,Math.PI*2);ctx.strokeStyle=COLORS.mint;ctx.lineWidth=4*u;ctx.stroke();
    line([[x,y-10*u],[x,y],[x+9*u,y+5*u]],COLORS.cream,3.3*u);disk(x,y,3*u,COLORS.cream);txt('+TIME',x,y-37*u,11*u,COLORS.mint);
  }
  function drawHazard(o,y,u){const dir=o.wall==='L'?1:-1,base=W*(dir>0?.206:.794),z=zoneOf(o.depth),p=PALETTES[z];
    const X=v=>base+dir*v*u,Y=v=>y+v*u;
    let glow='#ff8a31';if(['CRYSTAL'].includes(o.type))glow='#74e8ff';if(o.type==='CORE')glow='#fff4a3';if(o.type==='CHAIN')glow='#db83ff';if(o.type==='METAL')glow='#ffd083';
    disk(X(36),y,60*u,glow+'20');
    if(o.type==='ROOT'){
      ctx.beginPath();ctx.moveTo(X(-15),Y(-32));ctx.bezierCurveTo(X(28),Y(-40),X(63),Y(0),X(92),Y(-12));ctx.bezierCurveTo(X(51),Y(13),X(70),Y(48),X(15),Y(29));ctx.strokeStyle='#090e16';ctx.lineWidth=20*u;ctx.stroke();ctx.strokeStyle='#b76c3b';ctx.lineWidth=11*u;ctx.stroke();ctx.strokeStyle='#ff9e42';ctx.lineWidth=4*u;ctx.stroke();disk(X(45),Y(-11),5*u,'#ffcf75');
    } else if(o.type==='TIMBER'){
      polygon([[X(-10),Y(-39)],[X(85),Y(-30)],[X(90),Y(28)],[X(-12),Y(32)]],gradient(0,y-40*u,0,y+40*u,[[0,'#9a4835'],[1,'#261d26']]),'#080e16',7*u);
      for(let i=0;i<3;i++)line([[X(10+i*28),Y(-27)],[X(17+i*27),Y(25)]],glow,3*u);
    } else if(['ROCK','PRESSURE'].includes(o.type)){
      polygon([[X(-13),Y(-35)],[X(27),Y(-49)],[X(83),Y(-15)],[X(96),Y(13)],[X(37),Y(41)],[X(-14),Y(29)]],'#2c2429','#0a1018',9*u);
      polygon([[X(-13),Y(-35)],[X(27),Y(-49)],[X(83),Y(-15)],[X(96),Y(13)],[X(37),Y(41)],[X(-14),Y(29)]],'#2c2429',glow,3*u);
      polygon([[X(9),Y(-31)],[X(65),Y(-17)],[X(36),Y(17)]],p.facet);
      line([[X(18),Y(-6)],[X(57),Y(29)],[X(62),Y(1)]],glow,4*u);disk(X(66),Y(-18),4*u,glow);
    } else if(['CRYSTAL','CORE','METAL'].includes(o.type)){
      const col=o.type==='CRYSTAL'?'#78e1f0':o.type==='METAL'?'#ffc581':'#ffe3a0';
      for(let i=-1;i<=1;i++){const cy=i*22,reach=o.type==='METAL'?95-Math.abs(i)*10:75+((i+2)%2)*18;
        polygon([[X(-10),Y(cy-16)],[X(reach),Y(cy-5)],[X(-7),Y(cy+17)]],col,'#fffbe6',1.5*u);line([[X(8),Y(cy)],[X(reach*.65),Y(cy-5)]],p.shadow+'ad',2*u);}
    } else if(o.type==='LAVA'){
      disk(X(29),y,39*u,'#6e2628');disk(X(56),y,62*u,'#ff72362e');
      polygon([[X(-8),Y(-38)],[X(40),Y(-42)],[X(91),Y(-8)],[X(88),Y(16)],[X(47),Y(43)],[X(-8),Y(37)]],'#f34f30','#ffd071',2*u);
      polygon([[X(13),Y(-24)],[X(77),Y(0)],[X(51),Y(29)],[X(18),Y(29)]],'#ffdc79');
    } else if(o.type==='CHAIN'){
      for(let i=-2;i<=2;i++){ctx.beginPath();ctx.ellipse(X(9+i%2*10),y+i*22*u,10*u,12*u,0,0,2*Math.PI);ctx.strokeStyle='#b280c6';ctx.lineWidth=4*u;ctx.stroke();}
      polygon([[X(21),Y(-28)],[X(96),Y(-5)],[X(62),Y(34)],[X(33),Y(17)]],'#352442','#c48ced',3*u);
    }
  }
  function drawFallbackHero(x,y,u,braking,elapsed,dead,hopping,hopFrom){
    ctx.save();ctx.translate(x,y+Math.sin(elapsed*13)*2*u);const flip=hopping?(hopFrom==='L'?1:-1):1;ctx.scale(flip,1);
    if(braking){polygon([[-65*u,-20*u],[-38*u,-45*u],[0,-56*u],[38*u,-45*u],[65*u,-20*u],[40*u,13*u],[0,1*u],[-40*u,13*u]],'#33c4c3','#e5fff3',3*u);}
    else{polygon([[-32*u,-24*u],[-40*u,39*u],[0,25*u],[40*u,39*u],[32*u,-24*u]],'#da6a4a','#ffb86f',3*u);}
    ctx.fillStyle='#35273f';ctx.beginPath();ctx.ellipse(0,-28*u,28*u,29*u,0,0,Math.PI*2);ctx.fill();
    disk(0,-29*u,23*u,'#f4c2a1');disk(-18*u,-40*u,8*u,'#322333');disk(12*u,-53*u,14*u,'#322333');
    if(dead){txt('×   ×',0,-24*u,13*u,'#38252d');}else{disk(-8*u,-28*u,2.1*u,'#28223a');disk(8*u,-28*u,2.1*u,'#28223a');line([[-4*u,-18*u],[0,-16*u],[4*u,-18*u]],'#a65e63',1.8*u);}
    polygon([[-20*u,0],[20*u,0],[18*u,35*u],[-18*u,35*u]],'#8c6baa','#d7b3ea',2*u);
    line([[-18*u,10*u],[-33*u,24*u]],'#f4c2a1',9*u);line([[18*u,10*u],[31*u,24*u]],'#f4c2a1',9*u);
    line([[-11*u,35*u],[-19*u,54*u]],'#493447',10*u);line([[12*u,35*u],[23*u,53*u]],'#493447',10*u);
    ctx.restore();
  }
  function drawHero(x,y,u,braking,elapsed,speed,dead,hopping,hopFrom){
    const key=dead?'dizzy':hopping?(hopFrom==='L'?'jumpLeft':'jumpRight'):braking?'braking':'falling';
    const img=images[key],size=(braking?166:hopping?142:dead?139:127)*u;
    if(img?.naturalWidth){ctx.drawImage(img,x-size/2,y-size*.53+Math.sin(elapsed*15)*2*u,size,size);}else drawFallbackHero(x,y,u,braking,elapsed,dead,hopping,hopFrom);
    if(hopping&&!dead){const trail=hopFrom==='L'?-1:1;line([[x+37*u*trail,y+12*u],[x+71*u*trail,y+24*u]],'#ffffff77',3*u);}
    if(!braking&&speed>600&&!dead)line([[x+18*u,y-66*u],[x+23*u,y-91*u]],'#f9bb65aa',2.4*u);
  }
  function introScene(seconds){
    const u=W/400,groundY=H*.58;ctx.fillStyle=gradient(0,0,0,H,[[0,'#241937'],[.58,'#693c4d'],[1,'#a55e50']]);ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#6b3f38';ctx.fillRect(0,groundY,W,H-groundY);
    for(let i=0;i<10;i++){const x=i*53%W,y=groundY+42*u+(i*57%Math.max(1,H-groundY));disk(x,y,(10+i%4*5)*u,'#432b36');}
    ctx.beginPath();ctx.moveTo(W*.17,groundY+26*u);ctx.bezierCurveTo(W*.19,groundY-16*u,W*.79,groundY-19*u,W*.83,groundY+26*u);ctx.bezierCurveTo(W*.84,groundY+110*u,W*.14,groundY+110*u,W*.17,groundY+26*u);ctx.closePath();ctx.strokeStyle='#ff8550';ctx.lineWidth=15*u;ctx.stroke();ctx.fillStyle='#090e1b';ctx.fill();
    if(seconds<0)return;
    if(seconds<.55){const img=images.intro;if(img?.naturalWidth){const ph=240*u,pw=ph*img.naturalWidth/img.naturalHeight;ctx.drawImage(img,W*.27-pw/2,groundY-ph*.98,pw,ph);}else drawFallbackHero(W*.27,groundY-62*u,u,false,seconds,false,false,'L');return;}
    const fall=seconds<.95?-33*Math.sin((seconds-.55)/.4*Math.PI):(seconds-.95)**2*390;
    const heroY=groundY-58*u+fall*u,heroX=W*(.105+.395*Math.min(1,(seconds-.55)/.92));
    drawHero(heroX,heroY,u,false,seconds,45,false,false,'L');
    if(seconds>.75)txt('으아아아악!',W*.5,groundY-138*u,19*u,'white');
  }
  function draw(){if(s.stage==='READY')introScene(-1);else if(s.stage==='INTRO'){if(s.introElapsed<1.62)introScene(s.introElapsed);else{const depth=s.depth;s.depth=(s.introElapsed-1.62)*120;cave();s.depth=depth;}}else cave();}
  function frame(now){let dt=lastFrame?Math.min(.05,Math.max(0,(now-lastFrame)/1000)):0;lastFrame=now;clock+=dt;
    if(s.stage==='INTRO'){s.introElapsed+=dt;if(s.introElapsed>=2.45){s=makeGame('PLAYING');}}
    else if(s.stage==='PLAYING')advance(dt);
    draw();updateUI();requestAnimationFrame(frame);
  }
  $('start').addEventListener('click',()=>start(s.stage==='READY'));
  brakeBtn.addEventListener('pointerdown',e=>{if(s.stage!=='PLAYING')return;e.preventDefault();brakeTouches.add(e.pointerId);brakeBtn.setPointerCapture(e.pointerId);});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])brakeBtn.addEventListener(ev,e=>{brakeTouches.delete(e.pointerId);});
  jumpBtn.addEventListener('pointerdown',e=>{if(s.stage!=='PLAYING')return;e.preventDefault();jump();jumpBtn.setPointerCapture(e.pointerId);});
  jumpBtn.addEventListener('pointerup',e=>{if(jumpBtn.hasPointerCapture(e.pointerId))jumpBtn.releasePointerCapture(e.pointerId);});
  document.addEventListener('keydown',e=>{if(['Space','ArrowRight','Enter'].includes(e.code)){e.preventDefault();if(e.repeat||heldKeys.has(e.code))return;heldKeys.add(e.code);
    if(e.code==='ArrowRight')jump();else if(e.code==='Enter'&&(s.stage==='READY'||s.stage==='OVER'))start(s.stage==='READY');}});
  document.addEventListener('keyup',e=>heldKeys.delete(e.code));
  window.addEventListener('blur',()=>{heldKeys.clear();brakeTouches.clear();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){heldKeys.clear();brakeTouches.clear();lastFrame=0;}});
  window.addEventListener('resize',fit);if(window.ResizeObserver)new ResizeObserver(fit).observe(gameRoot);
  fit();updateUI();requestAnimationFrame(frame);
  // Expose read-only simple debug state for local test harnesses, never gameplay rewards.
  window.HellFallTest={snapshot:()=>({stage:s.stage,depth:s.depth,speed:s.speed,timeLeft:s.timeLeft,wall:s.wall,hopProgress:s.hopProgress,hazards:s.obstacles.length,gates:s.timeGates.length}),start:()=>start(false)};
})();