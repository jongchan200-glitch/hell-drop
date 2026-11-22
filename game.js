'use strict';
/*
 * HELL FALL WEB 0.7 — five-tap cadence, premium lobby and original character preview,
 * future commerce / reward / zone music infrastructure. V4.2 game world preserved.
 * All character states use the curated original V4.2 sprite set only.
 * Original high-score key stays unchanged for continuity.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $('scene'), ctx = canvas.getContext('2d', { alpha: false });
  const gameRoot = $('game'), hud = $('hud'), controls = $('controls'), overlay = $('overlay');
  const boostBtn = $('boost'), jumpBtn = $('jump'), toast = $('toast');
  const sys=window.HellSystems; if(!sys)throw new Error('Missing systems.js');
  const vortexCanvas=$('vortexCanvas'), vortexCtx=vortexCanvas.getContext('2d');
  let lastReward={distance:0,foundCoins:0,bonus:0,levelUps:0,level:sys.profile.level,newBalance:sys.profile.coins};
  const T = {
    LIMIT:10, MAX:1560, START:124, GLIDE:112, GLIDE_TIER:8, BOOST_SPEED:510,
    BOOST_TIER:35, MIN_TAP_INTERVAL:.055, TAP_RATE_BASE:.8, TAP_RATE_RANGE:4.0,
    RISE_RESPONSE:1.2, FALL_RESPONSE:6.7, HOP_SECONDS:.155, ZONE_LENGTH:5000
  };
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
  let W=400,H=800,clock=0,lastFrame=0,s=makeGame(),best=readRecord(),heldKeys=new Set();
  const images={};
  const capeRig={core:null,left:null,right:null,ready:false};
  // Only the original V4.2 reference family; no generated replacement faces.
  const IMAGE_FILES={falling:'hero_fall',braking:'hero_cape',jumpLeft:'hero_jump_left',jumpRight:'hero_jump_right',intro:'hero_intro',dizzy:'hero_hit'};
  Object.entries(IMAGE_FILES).forEach(([key,file])=>{
    const img=new Image(); img.onload=()=>{images[key]=img;if(key==='braking')prepareCapeRig(img);};
    img.onerror=()=>{}; img.src='assets/'+file+'.webp';
  });
  function prepareCapeRig(original){
    // Create an articulated 3-layer puppet directly from the single original
    // 512px hero_cape image. No generated poses, no new character images.
    // Source pixels are never redrawn and the central face/body stays unchanged.
    const width=original.naturalWidth,height=original.naturalHeight;
    const masks={
      left:[[0,151],[45,148],[86,156],[125,171],[154,191],[184,222],[210,255],[208,311],[188,350],[132,364],[64,349],[15,317]],
      right:[[511,139],[468,143],[420,158],[384,180],[359,206],[328,224],[303,255],[306,310],[333,350],[395,361],[462,335],[506,302]]
    };
    const shape=(context,points)=>{context.beginPath();context.moveTo(points[0][0],points[0][1]);
      for(let i=1;i<points.length;i++)context.lineTo(points[i][0],points[i][1]);context.closePath();};
    const canvas=()=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c;};
    const core=canvas(),cc=core.getContext('2d');cc.drawImage(original,0,0);
    for(const name of ['left','right']){
      const piece=canvas(),pc=piece.getContext('2d');pc.save();shape(pc,masks[name]);pc.clip();
      pc.drawImage(original,0,0);pc.restore();capeRig[name]=piece;
      cc.globalCompositeOperation='destination-out';cc.fillStyle='#fff';shape(cc,masks[name]);cc.fill();
    }
    cc.globalCompositeOperation='source-over';capeRig.core=core;capeRig.ready=true;
  }
  function readRecord(){try{return Number(localStorage.getItem('hell_fall_web_v42_best')||0)||0;}catch(_){return 0;}}
  function saveRecord(value){try{localStorage.setItem('hell_fall_web_v42_best',String(value));}catch(_){/*local file private mode*/}}
  function zoneOf(depth){return Math.min(6,Math.floor(depth/5000));}
  function tierOf(depth){return Math.min(17,Math.floor(depth/2000));}
  function wallX(w){return w==='L'?.29:.71;}
  function otherWall(w){return w==='L'?'R':'L';}
  function smooth(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
  function posX(g,p=g.hopProgress){return wallX(g.hopFrom)*(1-smooth(p))+wallX(g.wall)*smooth(p);}
  function rngSeed(seed){let x=(seed>>>0)||1;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function makeGame(stage='READY'){return{seed:(Math.random()*1000000000)|0,stage,depth:0,speed:T.START,timeLeft:T.LIMIT,elapsed:0,introElapsed:0,boost:0,fold:0,lastTapAt:-1,tapPulse:0,tapCount:0,tapIntervals:[],cadence:0,wall:'L',hopFrom:'L',hopProgress:1,hopVisual:1,obstacles:[],timeGates:[],coinGates:[],runCoins:0,nextObstacle:370,nextTimeGate:1400,nextCoin:210,coinNumber:0,obstacleNumber:0,gateNumber:0,gateFlash:0,zoneFlash:0,lastBonus:0,failure:''};}
  function start(){applyControlSide();s=makeGame('PLAYING');lastReward={distance:0,foundCoins:0,bonus:0,levelUps:0,level:sys.profile.level,newBalance:sys.profile.coins};heldKeys.clear();sys.audio.unlock();sys.audio.playZone(0);sys.audio.effect('start');updateUI();}
  function finish(msg){if(s.stage==='OVER')return;s.stage='OVER';s.failure=msg;if(s.depth>best){best=s.depth;saveRecord(best);}lastReward=sys.awardRun(s.depth,s.runCoins);sys.audio.effect(lastReward.levelUps>0?'level':'hit');sys.audio.playZone(-1);heldKeys.clear();boostBtn.classList.remove('active');updateUI();}
  function tapAccelerate(){
    if(s.stage!=='PLAYING')return;
    // Cadence—not lifetime tap count—controls the continuously moving storm.
    // A press-and-hold counts once; no repeated pointerdown while held.
    const gap=s.lastTapAt<0?-1:s.elapsed-s.lastTapAt;
    if(gap>=0&&gap<T.MIN_TAP_INTERVAL)return;
    if(gap>.07&&gap<1.55){s.tapIntervals.push(gap);if(s.tapIntervals.length>5)s.tapIntervals.shift()}
    else if(gap>=1.55)s.tapIntervals.length=0;
    s.lastTapAt=s.elapsed;
    s.tapPulse=1;
    s.tapCount++;
    sys.audio.effect('tap');
    boostBtn.classList.remove('tap-burst');void boostBtn.offsetWidth;boostBtn.classList.add('tap-burst');
  }
  function jump(){if(s.stage!=='PLAYING'||s.hopProgress<1)return;s.hopFrom=s.wall;s.wall=otherWall(s.wall);s.hopProgress=0;s.hopVisual=0;jumpBtn.classList.add('active');sys.audio.effect('jump');}
  function advance(dt){
    const old=s.depth,tier=tierOf(old);
    // Recent inter-tap rhythm controls the gauge. Slow tapping holds a low
    // storm, and successive higher levels demand increasingly faster rhythms.
    // Max boost requires a sustained ~5 thumb-taps/second (V0.7 design).
    // Allow one thumb-tap interval of grace before fading, not auto-repeat on hold.
    const interval=s.tapIntervals.length?s.tapIntervals.reduce((a,b)=>a+b,0)/s.tapIntervals.length:0;
    const rawRate=interval>0?Math.min(13,1/interval):0;
    const silence=s.lastTapAt<0?999:s.elapsed-s.lastTapAt;
    const anticipation=interval>0?Math.min(.43,Math.max(.23,interval*1.13)):.12;
    const rate=rawRate*Math.exp(-Math.max(0,silence-anticipation)*5.2);
    const demand=Math.max(0,Math.min(1,(rate-T.TAP_RATE_BASE)/T.TAP_RATE_RANGE));
    const targetBoost=Math.pow(demand,1.55);
    const responseBoost=targetBoost>s.boost?T.RISE_RESPONSE:T.FALL_RESPONSE;
    const boost=s.boost+(targetBoost-s.boost)*(1-Math.exp(-responseBoost*dt));
    const target=Math.min(T.MAX,T.GLIDE+tier*T.GLIDE_TIER+(T.BOOST_SPEED+tier*T.BOOST_TIER)*Math.pow(boost,1.15));
    const response=target>s.speed?4.25:2.6;
    const nextSpeed=s.speed+(target-s.speed)*(1-Math.exp(-response*dt));
    const fold=s.fold+(boost-s.fold)*(1-Math.exp(-(boost>s.fold?9.5:3.9)*dt));
    const depth=old+(s.speed+nextSpeed)*.5*dt,hop=Math.min(1,s.hopProgress+dt/T.HOP_SECONDS);
    // Visual kick has ~24 rendered frames at 60 FPS; physics collision timing stays unchanged.
    const hopVisual=Math.min(1,s.hopVisual+dt/.40);
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
        bonus=3.25-Math.min(.65,tier*.04);remain=Math.min(T.LIMIT,remain+bonus);glow=1.2;g.collected=true;sys.audio.effect('clock');
      }
    }
    // Optional in-run collectible coins. Earned coins commit once on game-over.
    s.coinGates=s.coinGates.filter(c=>c.depth>=old-100);
    while(s.nextCoin<depth+2350){
      const r=rngSeed(s.seed+52617+s.coinNumber*383);const wall=s.coinNumber===0?'L':(r()<.5?'L':'R');
      if(!s.timeGates.some(g=>Math.abs(g.depth-s.nextCoin)<125) &&
         !s.obstacles.some(o=>Math.abs(o.depth-s.nextCoin)<105)){
        s.coinGates.push({depth:s.nextCoin,wall,value:s.coinNumber===0?2:1+Math.floor(r()*3)});
      }
      s.nextCoin+=790+r()*470;s.coinNumber++;
    }
    for(const coin of s.coinGates){
      if(coin.collected||!(old<coin.depth&&depth>=coin.depth))continue;
      const at=Math.max(0,Math.min(1,(coin.depth-old)/traveled));
      const p=Math.min(1,s.hopProgress+dt*at/T.HOP_SECONDS);
      if(Math.abs(posX(s,p)-wallX(coin.wall))<.14){coin.collected=true;s.runCoins+=coin.value;sys.audio.effect('coin')}
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
    Object.assign(s,{boost,fold,cadence:rate,tapPulse:Math.max(0,s.tapPulse-dt*3.3),speed:nextSpeed,depth,timeLeft:remain,elapsed:s.elapsed+dt,hopProgress:hop,hopVisual,gateFlash:glow,zoneFlash,lastBonus:bonus});
    if(hop>=1)jumpBtn.classList.remove('active');
    if(crashed)finish('지층 장애물에 부딪혔어!');else if(remain<=0)finish('시간이 다 됐어!');
  }
  function updateUI(){
    const playing=s.stage==='PLAYING',over=s.stage==='OVER',ready=s.stage==='READY';
    hud.classList.toggle('hidden',!playing&&!over);
    controls.classList.toggle('hidden',!playing);
    overlay.classList.toggle('hidden',!over);
    $('lobby').classList.toggle('hidden',!ready);
    $('vortexGauge').classList.toggle('hidden',!playing);
    $('runBadge').classList.toggle('hidden',!playing);
    $('runCoinLabel').textContent=String(s.runCoins);
    const progress=sys.levelProgress(sys.profile.totalDepth);
    if(ready){
      $('homeLevel').textContent=sys.profile.level;
      $('homeCoin').textContent=sys.profile.coins.toLocaleString('ko-KR');
      $('homeBest').textContent=Math.floor(best).toLocaleString('ko-KR');
      $('homeTotal').textContent=sys.profile.totalDepth.toLocaleString('ko-KR');
      $('homeProgressFill').style.width=(progress.ratio*100).toFixed(1)+'%';
    }
    if(over){
      $('failure').textContent=s.failure;
      $('finalDepth').innerHTML=Math.floor(s.depth)+' <small>m</small>';
      $('finalBest').textContent='최고 기록 '+Math.floor(best).toLocaleString('ko-KR')+' m';
      $('earnedCoin').textContent='+'+lastReward.foundCoins;
      $('earnedLevel').textContent='+'+lastReward.bonus;
      $('totalTravel').textContent='누적 '+sys.profile.totalDepth.toLocaleString('ko-KR')+'m · Lv.'+sys.profile.level;
    }
    $('zoneLabel').textContent=(zoneOf(s.depth)+1)+'구역 · '+ZONES[zoneOf(s.depth)];
    $('depthLabel').innerHTML=Math.floor(s.depth)+' <small>m</small>';
    $('recordLabel').textContent='최고 '+Math.floor(Math.max(best,s.depth))+' m';
    $('timeLabel').textContent=s.timeLeft.toFixed(1);
    $('timeLabel').style.color=s.timeLeft<5?COLORS.red:'white';
    $('timeCaption').classList.toggle('alert',s.timeLeft<3);
    $('speedLabel').textContent='속도 '+Math.floor(s.speed)+' m/s · 난이도 '+(tierOf(s.depth)+1);
    $('timeFill').style.width=(100*s.timeLeft/T.LIMIT)+'%';
    $('timeFill').classList.toggle('danger',s.timeLeft<3);
    boostBtn.classList.toggle('active',s.tapPulse>.6);
    $('boostHint').textContent=s.boost>.84?'🌪️ 폭풍 유지!':s.boost>.39?'더 빠르게!':'빠르게 연타!';
    $('vortexState').textContent=s.boost>.93?'폭풍 최고!':s.boost>.65?'격렬한 돌개':s.boost>.26?'회오리 성장':s.boost>.045?'바람 발생':'바람 대기';
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
    for(let i=0;i<Math.min(45,Math.floor(3+s.boost*28+s.speed/130));i++){
      const x=W*(.27+((i*41%100)/100)*.46),y=(i*131+s.depth*ppm*(1+i%4*.14))%(H+200*u)-90*u;
      line([[x,y],[x,y-(24+s.speed*.16+(i%4)*9)*u]],s.boost>.7?'#b9ecff9a':p.glow+'78',Math.max(1,u)*(1+i%3));
    }
    for(const g of s.timeGates){if(g.collected)continue;const y=charY+(g.depth-s.depth)*ppm;if(y>-85*u&&y<H+100*u)drawGate(g,y,u);}
    for(const o of s.obstacles){const y=charY+(o.depth-s.depth)*ppm;if(y>-100*u&&y<H+105*u)drawHazard(o,y,u);}
    for(const coin of s.coinGates){if(coin.collected)continue;const y=charY+(coin.depth-s.depth)*ppm;if(y>-80*u&&y<H+90*u)drawCoin(coin,y,u);}
    const arc=Math.sin(Math.min(1,s.hopProgress)*Math.PI)*15*u;
    drawSpeedWind(posX(s)*W,charY-arc,u);
    drawHero(posX(s)*W,charY-arc,u,s.fold,s.elapsed,s.speed,s.stage==='OVER',s.hopVisual<1,s.hopFrom);
    if(s.speed>670){ctx.fillStyle='#ff4f6115';ctx.fillRect(0,0,W,H);}
    if(s.gateFlash>.72){ctx.fillStyle='#6be1cd20';ctx.fillRect(0,0,W,H);}
  }
  function drawGate(g,y,u){const x=wallX(g.wall)*W,p=(Math.sin(s.elapsed*8)+1)/2;
    disk(x,y,43*u,`rgba(107,225,205,${.10+p*.08})`);disk(x,y,27*u,'#6be1cd35');disk(x,y,20*u,'#1a4d4b');
    ctx.beginPath();ctx.arc(x,y,18*u,0,Math.PI*2);ctx.strokeStyle=COLORS.mint;ctx.lineWidth=4*u;ctx.stroke();
    line([[x,y-10*u],[x,y],[x+9*u,y+5*u]],COLORS.cream,3.3*u);disk(x,y,3*u,COLORS.cream);txt('+TIME',x,y-37*u,11*u,COLORS.mint);
  }
  function drawCoin(coin,y,u){
    const x=wallX(coin.wall)*W;
    ctx.save();ctx.translate(x,y);ctx.rotate(clock*1.8);
    disk(0,0,27*u,'#ffd46d28');disk(0,0,17*u,'#ffd46d');disk(0,0,13*u,'#a75b20');
    disk(0,0,9*u,'#ffe6a6');txt('✦',0,5*u,15*u,'#b67827');ctx.restore();
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
  function drawSpeedWind(x,y,u){
    const strength=s.boost;
    if(strength<.13)return;
    ctx.save();ctx.translate(x,y);
    // Air flows UP relative to a fast-descending character: curved speed wakes.
    const count=Math.round(2+strength*6);
    for(let i=0;i<count;i++){
      const side=i%2===0?-1:1, spread=(50+(i%4)*15)*u, raise=(65+(i%3)*27)*u;
      ctx.beginPath();
      ctx.moveTo(side*spread,50*u);
      ctx.bezierCurveTo(side*(spread+13*u),8*u,side*(spread-17*u),-raise,side*(spread+6*u),-raise-22*u);
      ctx.strokeStyle=`rgba(156,226,255,${.13+strength*(.24+(i%3)*.08)})`;
      ctx.lineWidth=(1.2+strength*.9)*u;ctx.stroke();
    }
    if(strength>.67){
      ctx.beginPath();ctx.ellipse(0,0,(80+strength*12)*u,94*u,0,0,Math.PI*2);
      ctx.strokeStyle=`rgba(138,236,255,${(strength-.67)*.35})`;ctx.lineWidth=2.5*u;ctx.stroke();
    }
    ctx.restore();
  }
  function paintSprite(img,x,y,width,height,alpha){
    if(!img?.naturalWidth || alpha<=0)return false;
    ctx.save();ctx.globalAlpha*=alpha;
    ctx.drawImage(img,x-width/2,y-height*.52,width,height);
    ctx.restore();return true;
  }
  // V0.5 rig: THREE pixel-exact layers cut from the ORIGINAL hero_cape artwork.
  // The face, hair and body live in the stationary core. Each arm and cape wing
  // has a separate shoulder pivot and moves continuously on every animation frame.
  // Unlike swapping generated poses, no interpolated frame can change the face.
  function drawLockedCapeSprite(img,x,y,u,fold,tilt,elapsed=0,opacity=1){
    const {core,left,right}=capeRig;
    if(!capeRig.ready){
      return paintSprite(img,x,y,165*u,165*u,opacity);
    }
    // This deliberately reveals a clear fold even at moderate thumb-tapping
    // speeds; it DOES NOT change the actual falling physics/boost.
    const raw=Math.max(0,Math.min(1,fold));
    const amt=Math.pow(raw,.57);
    const size=170*u, scale=size/512;
    const flap=Math.sin(elapsed*(6+raw*6))*.021*(1-raw);
    ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.globalAlpha*=opacity;
    ctx.translate(-size/2,-size*.52);ctx.scale(scale,scale);
    const wings=[{img:left,px:181,py:230,sign:-1},{img:right,px:331,py:228,sign:1}];
    for(const wing of wings){
      ctx.save();ctx.translate(wing.px,wing.py);
      ctx.rotate(wing.sign*(amt*1.64+flap));
      ctx.scale(1-.32*amt,1-.1*amt);
      ctx.translate(-wing.px,-wing.py);
      ctx.drawImage(wing.img,0,0,512,512);ctx.restore();
    }
    // Always paint the ORIGINAL central face/body on top of the flexible cloak.
    ctx.drawImage(core,0,0,512,512);
    ctx.restore();return true;
  }
  function drawKickSprite(img,x,y,u,rot,scale,opacity){
    if(!img?.naturalWidth||opacity<=0)return false;
    const size=151*u*scale;
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha*=opacity;
    ctx.drawImage(img,-size/2,-size*.52,size,size);
    ctx.restore();return true;
  }
  function drawWallKickImpact(u,side,phase,y){
    // Small kick contact sparks originate at the ACTUAL wall, not the character.
    const strength=Math.max(0,1-phase/.34);
    if(strength<=0)return;
    const wx=wallX(s.hopFrom)*W;
    const sy=y+19*u;
    ctx.save();ctx.globalAlpha*=strength;
    const direction=side;
    ctx.strokeStyle='#ffdf9a';ctx.lineWidth=2.7*u;ctx.lineCap='round';
    for(let i=0;i<5;i++){
      const a=(-.8+i*.38)*direction;
      const v=(20+i%3*7)*(1-phase*.45)*u;
      ctx.beginPath();ctx.moveTo(wx,sy);
      ctx.lineTo(wx+Math.cos(a)*v*direction,sy+Math.sin(a)*v);ctx.stroke();
    }
    ctx.strokeStyle='#ffe7ae';ctx.lineWidth=1.7*u;
    ctx.beginPath();ctx.arc(wx,sy,(14+phase*45)*u,-Math.PI*.64,Math.PI*.68);ctx.stroke();
    ctx.restore();
  }
  function drawHero(x,y,u,fold,elapsed,speed,dead,hopping,hopFrom){
    y+=Math.sin(elapsed*(10+fold*10))*(1.2+fold*1.5)*u;
    if(dead){
      if(!paintSprite(images.dizzy,x,y,139*u,139*u,1))drawFallbackHero(x,y,u,false,elapsed,true,false,hopFrom);
    }else if(hopping){
      const p=Math.min(1,Math.max(0,s.hopVisual));
      const side=hopFrom==='L'?1:-1;
      const key=hopFrom==='L'?'jumpLeft':'jumpRight';
      const kick=images[key];
      // 0..15%: foot drives against wall; 15..65%: torso turns in flight;
      // 65..100%: cape catches the air and the feet settle at the other wall.
      const impact=Math.max(0,1-p/.20);
      const travel=smooth(Math.min(1,Math.max(0,(p-.10)/.62)));
      const landing=smooth(Math.min(1,Math.max(0,(p-.65)/.35)));
      const tilt=side*((-.20+travel*.46)*(1-landing));
      const squash=1+impact*.09-Math.sin(Math.PI*p)*.045;
      drawWallKickImpact(u,side,p,y);
      if(p>.11&&p<.69){
        // Lightweight motion echo; frames are continuous (not discrete images).
        const echo=.13*Math.sin(Math.PI*Math.min(1,(p-.11)/.58));
        drawKickSprite(kick,x-side*(15+speed*.014)*u,y+4*u,u,tilt-.09*side,squash*.94,echo);
      }
      const faceOut=1-landing;
      if(!drawKickSprite(kick,x,y,u,tilt,squash,faceOut))
        drawLockedCapeSprite(images.braking,x,y,u,fold,tilt,elapsed,faceOut);
      if(landing>0)drawLockedCapeSprite(images.braking,x,y,u,fold,side*.08*(1-landing),elapsed,landing);
      if(p>.65){
        const t=(p-.65)/.35;
        // Brief wall contact glow on arrival (not a new gameplay obstacle).
        ctx.save();ctx.globalAlpha*=(1-t)*.33;
        ctx.strokeStyle='#b9ecff';ctx.lineWidth=2*u;
        ctx.beginPath();ctx.arc(x,y+12*u,(24+19*t)*u,0,2*Math.PI);ctx.stroke();ctx.restore();
      }
    }else{
      if(!drawLockedCapeSprite(images.braking,x,y,u,fold,Math.sin(elapsed*5)*fold*.02,elapsed)){
        drawFallbackHero(x,y,u,fold<.55,elapsed,false,false,hopFrom);
      }
      if(s.tapPulse>.04){
        ctx.save();ctx.globalAlpha=s.tapPulse*.26;
        ctx.beginPath();ctx.arc(x,y-25*u,(85+20*(1-s.tapPulse))*u,Math.PI*.23,Math.PI*.82);
        ctx.strokeStyle='#ffbf7d';ctx.lineWidth=2.5*u;ctx.stroke();ctx.restore();
      }
    }
  }
  // A single parametric vortex: fixed small tip, rising top, continuous curves.
  // It is a UI gauge and never appears around or behind the hero.
  function drawVortex(){
    if(s.stage!=='PLAYING')return;
    const dw=vortexCanvas.clientWidth,dh=vortexCanvas.clientHeight;
    if(!dw||!dh)return;
    const dpr=Math.min(window.devicePixelRatio||1,2.25);
    if(vortexCanvas.width!==Math.round(dw*dpr)||vortexCanvas.height!==Math.round(dh*dpr)){
      vortexCanvas.width=Math.round(dw*dpr);vortexCanvas.height=Math.round(dh*dpr);
    }
    vortexCtx.setTransform(dpr,0,0,dpr,0,0);vortexCtx.clearRect(0,0,dw,dh);
    const c=vortexCtx,g=s.boost,bottom=dh-10,baseR=4.8,baseY=bottom-4;
    const height=7+(dh-25)*Math.pow(g,.83);
    const spin=clock*(2.5+g*21),topY=baseY-height;
    c.save();
    // Bottom cyclone seed stays fixed across every speed and frame.
    c.beginPath();c.ellipse(dw/2,baseY,baseR,2.6,0,0,Math.PI*2);
    c.strokeStyle='#84cfe4';c.lineWidth=2.2;c.stroke();
    c.beginPath();c.ellipse(dw/2,baseY+2,8,2.5,0,0,Math.PI*2);
    c.strokeStyle='#69d9d9aa';c.lineWidth=1.3;c.stroke();
    const count=Math.max(1,Math.ceil(2+g*17));
    for(let i=0;i<count;i++){
      const t=(i+.35)/count,y=baseY-height*t;
      const r=baseR+(Math.max(0,t)*Math.pow(g,.64))*dw*.41;
      const phase=spin-i*.48;
      const ox=Math.sin(phase)*r*.22;
      c.beginPath();c.ellipse(dw/2+ox,y,Math.max(3,r),Math.max(2.3,2.4+r*.22),Math.sin(phase)*.19,0,Math.PI*2);
      const a=Math.min(.95,.40+g*.45+t*.08);
      c.strokeStyle=g>.76?`rgba(255,${Math.floor(187-(g-.76)*290)},126,${a})`:g>.34?`rgba(254,${Math.floor(205-g*48)},125,${a})`:`rgba(109,225,229,${a})`;
      c.lineWidth=1.6+g*1.5;c.stroke();
      // Bright front spiral: continuously sweeps through every ring.
      c.beginPath();c.arc(dw/2+ox,y,Math.max(3,r),phase,phase+Math.PI*.83);
      c.strokeStyle='rgba(250,252,246,'+(.33+g*.56)+')';c.lineWidth=1.2+g*1.6;c.stroke();
    }
    if(g>.17){
      const trails=Math.floor(2+g*6);
      for(let i=0;i<trails;i++){
        const t=(i+.6)/(trails+1),y=baseY-height*t,sign=i%2?-1:1;
        const r=baseR+(dw*.38)*g*t;
        c.beginPath();c.moveTo(dw/2+sign*r,y+7);c.quadraticCurveTo(dw/2+sign*(r+10),y-12,dw/2+sign*(r+4),y-20);
        c.strokeStyle=g>.74?'#ffb97299':'#a3e8ec88';c.lineWidth=1+g;c.stroke();
      }
    }
    if(g>.8){c.beginPath();c.ellipse(dw/2,topY,baseR+dw*.35*g,6+g*3,0,0,Math.PI*2);c.strokeStyle='#ffb780ab';c.lineWidth=2.3;c.stroke();}
    c.restore();
  }
  // No artificial hole-jump intro. Home is a dedicated living character lobby,
  // and pressing PLAY enters the existing falling gameplay immediately.
  function draw(){
    if(s.stage==='READY'){ctx.fillStyle='#0f0d19';ctx.fillRect(0,0,W,H);}
    else cave();
  }
  function frame(now){
    let dt=lastFrame?Math.min(.05,Math.max(0,(now-lastFrame)/1000)):0;
    lastFrame=now;clock+=dt;
    if(s.stage==='PLAYING')advance(dt);
    if(s.stage==='PLAYING')sys.audio.playZone(zoneOf(s.depth));
    sys.audio.fade(dt);
    draw();drawVortex();updateUI();requestAnimationFrame(frame);
  }
  function applyControlSide(){
    controls.classList.toggle('boost-right',sys.profile.settings.boostSide==='right');
  }
  // On mobile, the first tap unlocks lobby audio. Starting PLAY goes directly to
  // the zone track; touching the character or menus starts the calm lobby theme.
  document.addEventListener('pointerdown',e=>{
    if(s.stage!=='READY'||e.target.closest('#start'))return;
    sys.audio.unlock();sys.audio.playZone(-1);
  },{capture:true,passive:true,once:true});
  $('start').addEventListener('click',()=>start());
  $('restart').addEventListener('click',()=>start());
  $('backHome').addEventListener('click',()=>{s=makeGame('READY');sys.audio.playZone(-1);$('drawer').classList.add('hidden');updateUI();});
  boostBtn.addEventListener('pointerdown',e=>{if(s.stage!=='PLAYING')return;e.preventDefault();tapAccelerate();});
  // No pointerup/hold listener: holding does not generate additional acceleration.
  jumpBtn.addEventListener('pointerdown',e=>{if(s.stage!=='PLAYING')return;e.preventDefault();jump();jumpBtn.setPointerCapture(e.pointerId);});
  jumpBtn.addEventListener('pointerup',e=>{if(jumpBtn.hasPointerCapture(e.pointerId))jumpBtn.releasePointerCapture(e.pointerId);});
  document.addEventListener('keydown',e=>{if(['Space','ArrowRight','Enter'].includes(e.code)){e.preventDefault();if(e.repeat||heldKeys.has(e.code))return;heldKeys.add(e.code);
    if(e.code==='Space')tapAccelerate();else if(e.code==='ArrowRight')jump();else if(e.code==='Enter'&&(s.stage==='READY'||s.stage==='OVER')&&document.activeElement?.tagName!=='BUTTON')start();}});
  document.addEventListener('keyup',e=>heldKeys.delete(e.code));
  window.addEventListener('blur',()=>{heldKeys.clear();});
  document.addEventListener('visibilitychange',()=>{sys.audio.visibility(document.hidden);if(document.hidden){heldKeys.clear();lastFrame=0;}});
  window.addEventListener('resize',fit);if(window.ResizeObserver)new ResizeObserver(fit).observe(gameRoot);
  function esc(t){return String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  const titles={character:'캐릭터',shop:'상점',earn:'코인 획득소',records:'내 기록',settings:'설정'};
  function openPanel(type){if(!titles[type])return;sys.audio.unlock();$('drawerTitle').textContent=titles[type];
    const prof=sys.profile,prog=sys.levelProgress(prof.totalDepth),fmt=n=>Number(n).toLocaleString('ko-KR');
    let html='';
    if(type==='character')html=`<div class="character-owned"><div class="owned-frame"><img src="assets/hero_intro.webp" alt="우서이 캐릭터"></div><div class="owned-details"><span class="owned-kicker">EQUIPPED · 01</span><strong>우서이</strong><p>Lv.${prof.level} · 현재 캐릭터</p><span class="equipped-tag">✓ 장착 중</span></div></div><div class="info-card"><strong>캐릭터 성장</strong>누적 낙하 ${fmt(prof.totalDepth)}m<br><span class="muted">다음 레벨까지 ${fmt(prog.next-prog.within)}m</span></div><div class="info-card"><strong>캐릭터 보관함</strong><div class="future-characters"><span class="future-slot">✦<small>다음 캐릭터</small></span><span class="future-slot">✦<small>추가 예정</small></span><span class="future-slot">✦<small>추가 예정</small></span></div><span class="muted">현재 선택 가능한 캐릭터는 우서이 한 명이야. 새 캐릭터는 추후 추가돼.</span></div>`;
    else if(type==='shop')html=`<div class="banner">🪙 내 코인 <b>${fmt(prof.coins)}</b></div><div class="info-card"><strong>가속 장비</strong>돌개 강화·속도 유지 등 장비 슬롯<br><span class="muted">효과·가격·판매 여부는 아직 결정 전이야.</span></div><div class="info-card"><strong>꾸미기 · 새 캐릭터</strong>구매한 물품은 보관함에 저장하는 구조가 준비돼 있어.<br><span class="muted">아직 실제 판매 아이템은 없어.</span></div>`;
    else if(type==='earn')html=`<div class="banner">🪙 현재 코인 <b>${fmt(prof.coins)}</b><br><small>게임 중 수집 · 누적 레벨업 · 선택형 광고 · 코인 구매</small></div><div class="info-card"><strong>무료로 얻기</strong>게임에서 코인 줍기 / 누적 낙하로 레벨업</div><div class="info-card"><strong>▶ 보상형 광고</strong><span class="muted">광고 서비스 연동 전이어서 현재 시청·코인 지급을 사용할 수 없어.</span></div><div class="info-card"><strong>코인 구매</strong><span class="muted">현금 결제는 추후 설계·심사 후 연결할 예정이야. 현재 결제 기능 없음.</span></div>`;
    else if(type==='records')html=`<div class="banner">🏆 최고 낙하 <b>${fmt(Math.floor(best))}m</b></div><div class="info-card"><strong>누적 낙하</strong>${fmt(prof.totalDepth)}m · Lv.${prof.level}<br><span class="muted">다음 레벨까지 ${fmt(prog.next-prog.within)}m</span></div><div class="info-card"><strong>플레이 횟수</strong>${fmt(prof.runs)}판 완료</div><div class="info-card"><strong>획득 코인 기록</strong>게임에서 수집 ${fmt(prof.worldCoins)}코인 · 현재 보유 ${fmt(prof.coins)}코인</div>`;
    else if(type==='settings')html=`<div class="info-card"><strong>🎮 가속·벽점프 버튼 위치</strong><span class="muted">휴대폰을 잡고 연타하기 편한 손으로 가속 버튼을 옮길 수 있어. 선택은 자동 저장돼.</span><div class="control-layout-choices" role="group" aria-label="가속 버튼 방향"><button type="button" class="control-layout-choice" data-boost-side="left" aria-pressed="${prof.settings.boostSide!=='right'}">🌪️ 가속 왼쪽<br><small>점프 오른쪽</small></button><button type="button" class="control-layout-choice" data-boost-side="right" aria-pressed="${prof.settings.boostSide==='right'}">🌪️ 가속 오른쪽<br><small>점프 왼쪽</small></button></div></div><div class="info-card"><strong>🔊 음악 음량</strong><label for="musicRange">BGM <span id="musicValue">${Math.round(prof.settings.music*100)}%</span><input id="musicRange" type="range" min="0" max="100" value="${Math.round(prof.settings.music*100)}"></label><label for="sfxRange">효과음 <span id="sfxValue">${Math.round(prof.settings.sfx*100)}%</span><input id="sfxRange" type="range" min="0" max="100" value="${Math.round(prof.settings.sfx*100)}"></label></div><div class="info-card"><strong>🎵 지층별 클래식 편곡 미리듣기</strong><span class="muted">리듬게임에서 만든 음악 8곡을 연결했어. 아래 ▶ 버튼을 누르면 해당 곡이 재생되고, 닫으면 홈 음악으로 돌아가.</span><ul class="slot-list music-preview-list">${sys.MUSIC_SLOTS.map((v,i)=>`<li><span>${i===0?'홈':i+'구역'} · ${esc(v.title||v.name)}</span><button type="button" data-music-preview="${i}" aria-label="${esc(v.title||v.name)} 미리듣기">▶</button></li>`).join('')}</ul></div>`;
    $('drawerBody').innerHTML=html;$('drawer').classList.remove('hidden');
    if(type==='settings'){
      for(const [key,id] of [['music','musicRange'],['sfx','sfxRange']]){
        $(id).addEventListener('input',e=>{sys.setting(key,Number(e.target.value)/100);$(key+'Value').textContent=e.target.value+'%';});
      }
      $('drawerBody').querySelectorAll('[data-boost-side]').forEach(button=>{
        button.addEventListener('click',()=>{
          sys.setting('boostSide',button.dataset.boostSide);applyControlSide();
          $('drawerBody').querySelectorAll('[data-boost-side]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.boostSide===sys.profile.settings.boostSide)));
        });
      });
      $('drawerBody').querySelectorAll('[data-music-preview]').forEach(button=>{
        button.addEventListener('click',()=>{
          const idx=Number(button.dataset.musicPreview);
          const target=idx-1;
          const playingSame=sys.audio.activeTrack===idx;
          sys.audio.unlock();sys.audio.playZone(playingSame?-1:target);
          $('drawerBody').querySelectorAll('[data-music-preview]').forEach(b=>{
            const selected=!playingSame&&Number(b.dataset.musicPreview)===idx;
            b.textContent=selected?'■':'▶';
            b.setAttribute('aria-pressed',String(selected));
          });
        });
      });
    }
  }
  document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>openPanel(button.dataset.panel)));
  function closePanel(){
    $('drawer').classList.add('hidden');
    sys.audio.playZone(s.stage==='PLAYING'?zoneOf(s.depth):-1);
  }
  $('drawerClose').addEventListener('click',closePanel);
  $('drawer').addEventListener('click',e=>{if(e.target===$('drawer'))closePanel()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('drawer').classList.contains('hidden'))closePanel()});
  // WEB 0.9: Home-only WebGL sculpt; BGM / audio, gameplay and records unchanged.
  (function setupLobbyCharacter(){
    const actor=$('lobbyCharacter'), embers=$('lobbyEmbers');
    if(window.HellFallLobby3D)window.HellFallLobby3D.mount(actor,{isHome:()=>s.stage==='READY'});
    const frag=document.createDocumentFragment();
    for(let i=0;i<22;i++){
      const dot=document.createElement('i'),x=6+(i*37+31)%88,y=22+(i*23+17)%77;
      dot.style.cssText=`--x:${x}%;--y:${y}%;--size:${1+i%3}px;--dur:${4.2+(i%6)*.83}s;--delay:-${(i*17)%41/4}s;--drift:${(i%2?1:-1)*(14+i%5*11)}px`;
      frag.appendChild(dot);
    }
    embers.appendChild(frag);
  })();
  applyControlSide();fit();updateUI();requestAnimationFrame(frame);
  // Expose read-only simple debug state for local test harnesses, never gameplay rewards.
  window.HellFallTest={snapshot:()=>({stage:s.stage,depth:s.depth,speed:s.speed,timeLeft:s.timeLeft,wall:s.wall,hopProgress:s.hopProgress,hopVisual:s.hopVisual,boost:s.boost,fold:s.fold,cadence:s.cadence,tapCount:s.tapCount,runCoins:s.runCoins,hazards:s.obstacles.length,gates:s.timeGates.length,boostSide:sys.profile.settings.boostSide,profile:{...sys.profile}}),start:()=>start(false)};
})();