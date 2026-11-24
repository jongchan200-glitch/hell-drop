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
    LIMIT:42, MAX:1560, START:124, GLIDE:112, GLIDE_TIER:8, BOOST_SPEED:510,
    BOOST_TIER:35, MIN_TAP_INTERVAL:.055, TAP_RATE_BASE:.8, TAP_RATE_RANGE:4.0,
    RISE_RESPONSE:1.2, FALL_RESPONSE:6.7, HOP_SECONDS:.155, ZONE_LENGTH:5000
  };
  const CHECKPOINT_GAPS=[1450,1600,1800,2000,2250,2500,2800];
  const CHECKPOINT_BONUS=[5,4,2.5,2,1.5,1,1];
  const CLOCK_GAPS=[900,1050,1160,1260,1400,1510,1670];
  const CLOCK_BONUS=[5,5,5,4,4,3,3];
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
  const IMAGE_FILES={falling:'hero_fall',braking:'hero_cape',jumpLeft:'hero_jump_left',jumpRight:'hero_jump_right',intro:'hero_intro',dizzy:'hero_hit',uiji:'uiji_intro',uijiMotion:'uiji_motion_atlas'};
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
  function makeGame(stage='READY'){return{seed:(Math.random()*1000000000)|0,stage,depth:0,speed:T.START,timeLeft:T.LIMIT,elapsed:0,introElapsed:0,boost:0,fold:0,lastTapAt:-1,tapPulse:0,tapCount:0,tapIntervals:[],cadence:0,wall:'L',hopFrom:'L',hopProgress:1,hopVisual:1,obstacles:[],timeGates:[],checkpointGates:[],coinGates:[],runCoins:0,nextObstacle:370,nextTimeGate:900,nextCheckpoint:1450,nextCoin:210,coinNumber:0,obstacleNumber:0,gateNumber:0,checkpointNumber:0,gateFlash:0,checkpointFlash:0,zoneFlash:0,lastBonus:0,lastCheckpointBonus:0,failure:'',bubbleLeft:0,bubbleColor:null,bubbleName:'',helmetId:null,helmetCharges:0,invuln:0,shieldFlash:0,runCharacter:'useoi',quickSlots:[null,null]};}
  function start(){
    applyControlSide();s=makeGame('PLAYING');
    // A bubble is a single-use purchase. Helmets are persistent owned equipment,
    // recharged to 1 or 2 collision blocks for every new run.
    const loadout=sys.startLoadout();
    s.runCharacter=sys.profile.selectedCharacter;
    s.quickSlots=loadout.quickSlots.slice();
    s.bubbleLeft=0;s.bubbleColor=null;s.bubbleName='';
    s.helmetId=loadout.helmetId;s.helmetCharges=loadout.helmetHits;
    lastReward={distance:0,foundCoins:0,bonus:0,levelUps:0,level:sys.profile.level,newBalance:sys.profile.coins};
    heldKeys.clear();sys.audio.unlock();sys.audio.startGamePlaylist();
    sys.audio.effect('start');updateUI();
  }
  function finish(msg){if(s.stage==='OVER')return;s.stage='OVER';s.failure=msg;if(s.depth>best){best=s.depth;saveRecord(best);}lastReward=sys.awardRun(s.depth,s.runCoins);sys.audio.effect(lastReward.levelUps>0?'level':'hit');heldKeys.clear();boostBtn.classList.remove('active');updateUI();}
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
  function useQuickItem(index){
    if(s.stage!=='PLAYING')return;
    if(s.bubbleLeft>0){
      s.shieldFlash=.25;return; // one protective bubble at a time
    }
    const result=sys.consumeCharacterSlot(s.runCharacter,index);
    if(!result.ok)return;
    s.bubbleLeft=result.item.seconds;s.bubbleColor=result.item.color;
    s.bubbleName=result.item.name;s.shieldFlash=.5;
    s.quickSlots=sys.wardrobeOf(s.runCharacter).quickSlots.slice();
    sys.audio.effect('coin');updateUI();
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
    let checkpointGlow=Math.max(0,s.checkpointFlash-dt),checkpointBonus=s.lastCheckpointBonus;
    const zoneFlash=zoneOf(depth)>zoneOf(old)?2.1:Math.max(0,s.zoneFlash-dt);
    const traveled=Math.max(.001,depth-old);
    // Automatic, full-width TIME LINES: every player receives a checkpoint bonus.
    // Generate well ahead of hazards so no lethal obstacle can overlap the line.
    s.checkpointGates=s.checkpointGates.filter(g=>g.depth>=old-100);
    while(s.nextCheckpoint<depth+3650){
      const z=zoneOf(s.nextCheckpoint);
      s.checkpointGates.push({depth:s.nextCheckpoint,bonus:CHECKPOINT_BONUS[z],collected:false});
      s.nextCheckpoint+=CHECKPOINT_GAPS[z];s.checkpointNumber++;
    }
    // Round clocks are OPTIONAL +3/+4/+5-second collectibles, not checkpoints.
    // Generate before hazards and reject slots too close to automatic time lines.
    s.timeGates=s.timeGates.filter(g=>g.depth>=old-100);
    while(s.nextTimeGate<depth+3350){
      const r=rngSeed(s.seed+8099+s.gateNumber*97),wall=r()<.5?'L':'R';
      const d=s.nextTimeGate,z=zoneOf(d);
      if(!s.checkpointGates.some(g=>Math.abs(g.depth-d)<200)){
        s.timeGates.push({depth:d,wall,bonus:CLOCK_BONUS[z],collected:false});
      }
      s.nextTimeGate+=CLOCK_GAPS[z]+r()*200;s.gateNumber++;
    }
    // Hazards avoid BOTH types of time reward. Their collision rules are unchanged.
    s.obstacles=s.obstacles.filter(o=>o.depth>=old-100);
    while(s.nextObstacle<depth+2850){
      const r=rngSeed(s.seed+1823+s.obstacleNumber*901),oDepth=s.nextObstacle;
      const wall=r()<.5?'L':'R';
      const kinds=TYPE_BY_ZONE[zoneOf(oDepth)],type=kinds[Math.floor(r()*kinds.length)],variant=Math.floor(r()*5);
      const clearOfTime=s.checkpointGates.every(g=>Math.abs(g.depth-oDepth)>=165)
        &&s.timeGates.every(g=>Math.abs(g.depth-oDepth)>=155);
      if(clearOfTime)s.obstacles.push({depth:oDepth,wall,type,variant});
      const dangerTier=tierOf(oDepth),localTop=Math.min(T.MAX,312+dangerTier*76);
      const minSpacing=localTop*(.47-Math.min(7,dangerTier)*.013);
      s.nextObstacle+=minSpacing+35+r()*(88-Math.min(55,dangerTier*3));s.obstacleNumber++;
    }
    // Collectible coins spawn last, where both hazards and time rewards are known.
    s.coinGates=s.coinGates.filter(c=>c.depth>=old-100);
    while(s.nextCoin<depth+2450){
      const r=rngSeed(s.seed+52617+s.coinNumber*383),d=s.nextCoin;
      const wall=s.coinNumber===0?'L':(r()<.5?'L':'R');
      const clear=s.checkpointGates.every(g=>Math.abs(g.depth-d)>=135)
        &&s.timeGates.every(g=>Math.abs(g.depth-d)>=145)
        &&s.obstacles.every(o=>Math.abs(o.depth-d)>=160);
      if(clear)s.coinGates.push({depth:d,wall,value:s.coinNumber===0?2:1+Math.floor(r()*3)});
      s.nextCoin+=790+r()*470;s.coinNumber++;
    }
    for(const g of s.checkpointGates){
      if(g.collected||!(old<g.depth&&depth>=g.depth))continue;
      const along=Math.max(0,Math.min(1,(g.depth-old)/traveled));
      if(s.timeLeft<=dt*along)continue; // no rescue after already running out
      checkpointBonus=g.bonus;remain=Math.min(T.LIMIT,remain+g.bonus);
      checkpointGlow=1.25;g.collected=true;sys.audio.effect('checkpoint');
    }
    for(const g of s.timeGates){
      if(g.collected||!(old<g.depth&&depth>=g.depth))continue;
      const along=Math.max(0,Math.min(1,(g.depth-old)/traveled));
      if(s.timeLeft<=dt*along)continue;
      const p=Math.min(1,s.hopProgress+dt*along/T.HOP_SECONDS);
      if(Math.abs(posX(s,p)-wallX(g.wall))<=.12){
        bonus=g.bonus;remain=Math.min(T.LIMIT,remain+bonus);
        glow=1.2;g.collected=true;sys.audio.effect('clock');
      }
    }
    for(const coin of s.coinGates){
      if(coin.collected||!(old<coin.depth&&depth>=coin.depth))continue;
      const at=Math.max(0,Math.min(1,(coin.depth-old)/traveled));
      const p=Math.min(1,s.hopProgress+dt*at/T.HOP_SECONDS);
      if(Math.abs(posX(s,p)-wallX(coin.wall))<.14){
        coin.collected=true;s.runCoins+=coin.value;sys.audio.effect('coin');
      }
    }
    let crashed=false,helmetCharges=s.helmetCharges;
    let invuln=Math.max(0,s.invuln-dt);
    let shieldFlash=Math.max(0,s.shieldFlash-dt);
    const bubbleLeft=Math.max(0,s.bubbleLeft-dt);
    for(const o of s.obstacles){
      if(!(old<=o.depth+15&&depth>=o.depth-15))continue;
      const along=Math.max(0,Math.min(1,(o.depth-15-old)/traveled));
      const p=Math.min(1,s.hopProgress+dt*along/T.HOP_SECONDS);
      if(Math.abs(posX(s,p)-wallX(o.wall))>=.18)continue;
      // Do not alter collision geometry: only intercept a fatal collision when
      // an active purchased defense is present.
      if(s.bubbleLeft-dt*along>0||invuln>0){
        shieldFlash=Math.max(shieldFlash,.24);
        continue;
      }
      if(helmetCharges>0){
        helmetCharges--;
        invuln=.75; // avoid an immediate second hit in the same obstacle cluster
        shieldFlash=.64;
        sys.audio.effect('hit');continue;
      }
      crashed=true;break;
    }
    Object.assign(s,{boost,fold,cadence:rate,tapPulse:Math.max(0,s.tapPulse-dt*3.3),speed:nextSpeed,depth,timeLeft:remain,elapsed:s.elapsed+dt,hopProgress:hop,hopVisual,gateFlash:glow,checkpointFlash:checkpointGlow,zoneFlash,lastBonus:bonus,lastCheckpointBonus:checkpointBonus,bubbleLeft,helmetCharges,invuln,shieldFlash});
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
    const protection=[];
    if(playing&&s.bubbleLeft>0)protection.push('🫧 '+s.bubbleLeft.toFixed(1)+'초');
    if(playing&&s.helmetCharges>0)protection.push((s.helmetId==='helmet_frog'?'🐸':'🪖')+' '+s.helmetCharges+'회');
    $('protectionBadge').textContent=protection.join('   ·   ');
    $('protectionBadge').classList.toggle('hidden',protection.length===0);
    for(let index=0;index<2;index++){
      const slot=$('quickItem'+index);
      const id=s.quickSlots[index];
      const item=sys.ITEM_CATALOG.find(x=>x.id===id);
      const quantity=id?(sys.profile.consumables[id]||0):0;
      const canUse=playing&&quantity>0&&s.bubbleLeft<=0;
      $('quickItemIcon'+index).textContent=item?.icon||'＋';
      $('quickItemCount'+index).textContent=quantity?String(quantity):'';
      slot.disabled=!canUse;
      slot.classList.toggle('is-empty',!quantity);
      slot.title=item?item.name+' · '+quantity+'개':'캐릭터 화면에서 장착';
      slot.setAttribute('aria-label',item?item.name+' 사용, 보유 '+quantity+'개':'빈 아이템 슬롯 '+(index+1));
    }
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
    $('timeLabel').style.color=s.timeLeft<8?COLORS.red:'white';
    $('timeCaption').classList.toggle('alert',s.timeLeft<6);
    $('speedLabel').textContent='속도 '+Math.floor(s.speed)+' m/s · 난이도 '+(tierOf(s.depth)+1);
    $('timeFill').style.width=(100*s.timeLeft/T.LIMIT)+'%';
    $('timeFill').classList.toggle('danger',s.timeLeft<6);
    boostBtn.classList.toggle('active',s.tapPulse>.6);
    $('boostHint').textContent=s.boost>.84?'🌪️ 폭풍 유지!':s.boost>.39?'더 빠르게!':'빠르게 연타!';
    $('vortexState').textContent=s.boost>.93?'폭풍 최고!':s.boost>.65?'격렬한 돌개':s.boost>.26?'회오리 성장':s.boost>.045?'바람 발생':'바람 대기';
    toast.classList.add('hidden');toast.classList.remove('mint');
    if(playing && s.zoneFlash>0){toast.textContent=ZONES[zoneOf(s.depth)]+' 진입!';toast.style.opacity=String(Math.min(1,s.zoneFlash/1.5));toast.classList.remove('hidden');}
    if(playing && s.checkpointFlash>0){toast.textContent='⏱ 타임 라인 +'+s.lastCheckpointBonus+'초!';toast.style.opacity=String(Math.min(1,s.checkpointFlash));toast.classList.remove('hidden');toast.classList.add('mint');}
    if(playing && s.gateFlash>0){toast.textContent='⏱ 아이템 +'+s.lastBonus.toFixed(0)+'초!';toast.style.opacity=String(Math.min(1,s.gateFlash/1.1));toast.classList.remove('hidden');toast.classList.add('mint');}
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
    // World-anchored craggy rock faces: visual-only, existing collision lanes unchanged.
    const reliefStep=42*u,reliefTravel=s.depth*ppm*.64;
    const reliefScroll=reliefTravel%reliefStep,reliefBase=Math.floor(reliefTravel/reliefStep);
    for(let side=0;side<2;side++){
      const left=side===0,edge=W*(left?.232:.768),sign=left?1:-1;
      const outer=left?0:W,points=[];
      for(let i=-2;i<=Math.ceil(H/reliefStep)+3;i++){
        const row=i+reliefBase,y=i*reliefStep-reliefScroll;
        const n=Math.sin(row*17.53+side*38.1)*.5+.5;
        const k=Math.sin(row*5.31+side*15.7)*.5+.5;
        points.push([edge+sign*(3+n*9)*u,y]);
        points.push([edge+sign*(1+k*10)*u,y+reliefStep*.52]);
      }
      ctx.beginPath();ctx.moveTo(outer,-reliefStep*3);
      for(const [x,y] of points)ctx.lineTo(x,y);
      ctx.lineTo(outer,H+reliefStep*3);ctx.closePath();
      ctx.fillStyle=gradient(left?0:W*.76,0,left?W*.24:W,0,
        [[0,left?p.shadow:p.facet],[.45,p.wall],[1,left?p.facet:p.shadow]]);
      ctx.fill();
      ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.strokeStyle='#0b0d17';ctx.lineWidth=5*u;ctx.stroke();
      ctx.strokeStyle=p.glow+'68';ctx.lineWidth=1.55*u;ctx.stroke();
      // Irregular angular stone planes, fissures, and mineral pinpoints.
      const textureStep=91*u,travel=reliefTravel*.84,offset=travel%textureStep;
      const baseRow=Math.floor(travel/textureStep);
      for(let i=-1;i<=Math.ceil(H/textureStep)+2;i++){
        const t=i+baseRow,y=i*textureStep-offset,wobble=Math.sin(t*4.73+side*7.9);
        const cx=W*(left?.113:.887)+wobble*8*u;
        polygon([[cx-19*u,y-17*u],[cx+12*u,y-27*u],[cx+26*u,y+5*u],
          [cx-4*u,y+35*u],[cx-21*u,y+18*u]],p.facet+'51',p.shadow+'a0',1.5*u);
        polygon([[cx-19*u,y-17*u],[cx+12*u,y-27*u],[cx+2*u,y+6*u]],p.facet+'67');
        line([[cx-9*u,y+2*u],[cx+4*u,y+10*u],[cx-2*u,y+27*u]],p.shadow+'ba',1.5*u);
        line([[cx-13*u,y-18*u],[cx+10*u,y-26*u]],p.glow+'39',1.1*u);
        if((t+side)%3===0)disk(cx+8*u,y+21*u,1.7*u,p.glow+'8a');
      }
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
    for(const g of s.checkpointGates){if(g.collected)continue;const y=charY+(g.depth-s.depth)*ppm;if(y>-65*u&&y<H+70*u)drawCheckpoint(g,y,u);}
    for(const g of s.timeGates){if(g.collected)continue;const y=charY+(g.depth-s.depth)*ppm;if(y>-85*u&&y<H+100*u)drawGate(g,y,u);}
    for(const o of s.obstacles){const y=charY+(o.depth-s.depth)*ppm;if(y>-100*u&&y<H+105*u)drawHazard(o,y,u);}
    for(const coin of s.coinGates){if(coin.collected)continue;const y=charY+(coin.depth-s.depth)*ppm;if(y>-80*u&&y<H+90*u)drawCoin(coin,y,u);}
    const arc=Math.sin(Math.min(1,s.hopProgress)*Math.PI)*15*u;
    drawSpeedWind(posX(s)*W,charY-arc,u);
    drawHero(posX(s)*W,charY-arc,u,s.fold,s.elapsed,s.speed,s.stage==='OVER',s.hopVisual<1,s.hopFrom);
    drawHelmet(posX(s)*W,charY-arc,u);
    drawBubble(posX(s)*W,charY-arc,u);
    if(s.speed>670){ctx.fillStyle='#ff4f6115';ctx.fillRect(0,0,W,H);}
    if(s.gateFlash>.72||s.checkpointFlash>.7){ctx.fillStyle='#6be1cd20';ctx.fillRect(0,0,W,H);}
  }
  function drawCheckpoint(g,y,u){
    const x0=W*.247,x1=W*.753,t=(Math.sin(s.elapsed*5)+1)/2;
    const beam=ctx.createLinearGradient(x0,y,x1,y);
    beam.addColorStop(0,'#6be1cd40');beam.addColorStop(.5,'#a7fff5ee');beam.addColorStop(1,'#6be1cd40');
    ctx.fillStyle='#092e31b0';ctx.fillRect(x0,y-17*u,x1-x0,34*u);
    ctx.fillStyle=beam;ctx.fillRect(x0,y-2.5*u,x1-x0,5*u);
    disk(x0,y,8*u,'#6be1cdbb');disk(x1,y,8*u,'#6be1cdbb');
    txt('TIME LINE  +'+g.bonus+'s',W*.5,y-7*u,12*u,'#e3fff6');
    if(t>.5){ctx.strokeStyle='#b1fff43b';ctx.lineWidth=2*u;ctx.strokeRect(x0,y-19*u,x1-x0,38*u);}
  }
  function drawGate(g,y,u){const x=wallX(g.wall)*W,p=(Math.sin(s.elapsed*8)+1)/2;
    disk(x,y,43*u,`rgba(107,225,205,${.10+p*.08})`);disk(x,y,27*u,'#6be1cd35');disk(x,y,20*u,'#1a4d4b');
    ctx.beginPath();ctx.arc(x,y,18*u,0,Math.PI*2);ctx.strokeStyle=COLORS.mint;ctx.lineWidth=4*u;ctx.stroke();
    line([[x,y-10*u],[x,y],[x+9*u,y+5*u]],COLORS.cream,3.3*u);disk(x,y,3*u,COLORS.cream);txt('+'+g.bonus+'s',x,y-37*u,11*u,COLORS.mint);
  }
  function drawCoin(coin,y,u){
    const x=wallX(coin.wall)*W;
    ctx.save();ctx.translate(x,y);ctx.rotate(clock*1.8);
    disk(0,0,27*u,'#ffd46d28');disk(0,0,17*u,'#ffd46d');disk(0,0,13*u,'#a75b20');
    disk(0,0,9*u,'#ffe6a6');txt('✦',0,5*u,15*u,'#b67827');ctx.restore();
  }
  function drawHazard(o,y,u){
    // All danger types keep existing depth, hit detection and reach. Only paint is changed.
    const dir=o.wall==='L'?1:-1,base=W*(dir>0?.206:.794),z=zoneOf(o.depth),p=PALETTES[z];
    const X=v=>base+dir*v*u,Y=v=>y+v*u;
    let glow='#ff8a31';
    if(o.type==='CRYSTAL')glow='#74e8ff';
    if(o.type==='CORE')glow='#fff4a3';
    if(o.type==='CHAIN')glow='#db83ff';
    if(o.type==='METAL')glow='#ffd083';
    disk(X(36),y,56*u,glow+'1c');
    if(o.type==='ROOT'){
      ctx.beginPath();ctx.moveTo(X(-15),Y(-32));
      ctx.bezierCurveTo(X(22),Y(-43),X(57),Y(-10),X(93),Y(-14));
      ctx.bezierCurveTo(X(55),Y(8),X(70),Y(42),X(14),Y(28));
      ctx.strokeStyle='#12151a';ctx.lineWidth=22*u;ctx.stroke();
      ctx.strokeStyle='#864e37';ctx.lineWidth=13*u;ctx.stroke();
      ctx.strokeStyle='#d78949';ctx.lineWidth=7*u;ctx.stroke();
      line([[X(3),Y(-33)],[X(37),Y(-13)],[X(64),Y(13)]],glow+'bd',2*u);
      line([[X(34),Y(-9)],[X(55),Y(-30)],[X(71),Y(-36)]],'#b76c3b',5*u);
      line([[X(43),Y(4)],[X(64),Y(23)],[X(81),Y(22)]],'#e49b57',4*u);
      disk(X(71),Y(-36),4*u,'#ffcf75');
    }else if(o.type==='TIMBER'){
      polygon([[X(-12),Y(-37)],[X(14),Y(-42)],[X(46),Y(-36)],[X(85),Y(-29)],
        [X(91),Y(24)],[X(70),Y(31)],[X(32),Y(26)],[X(-15),Y(33)]],
        gradient(0,y-42*u,0,y+34*u,[[0,'#9b603e'],[.55,'#54362f'],[1,'#271d24']]),'#080e16',6*u);
      for(let i=0;i<3;i++){
        const a=13+i*27;
        line([[X(a),Y(-32)],[X(a+6),Y(22)]],'#281d25',4*u);
        line([[X(a+3),Y(-30)],[X(a+9),Y(18)]],glow+'9e',1.5*u);
        disk(X(a+2),Y(-21),2.4*u,'#e7b081');
      }
      line([[X(-7),Y(-32)],[X(49),Y(-33)],[X(83),Y(-25)]],'#e6ae705b',2*u);
    }else if(o.type==='ROCK'||o.type==='PRESSURE'){
      const chips=[[X(-13),Y(-32)],[X(4),Y(-44)],[X(25),Y(-49)],[X(45),Y(-42)],
        [X(76),Y(-23)],[X(95),Y(1)],[X(89),Y(16)],[X(62),Y(36)],
        [X(34),Y(43)],[X(3),Y(29)],[X(-15),Y(25)]];
      polygon(chips,gradient(X(20),Y(-49),X(72),Y(39),
        [[0,p.facet],[.48,'#342a30'],[1,'#151923']]),'#0a1018',7*u);
      polygon([[X(-13),Y(-32)],[X(25),Y(-49)],[X(43),Y(-15)],[X(3),Y(11)]],p.facet+'b9');
      polygon([[X(43),Y(-15)],[X(76),Y(-23)],[X(95),Y(1)],[X(64),Y(22)]],p.wall);
      polygon([[X(3),Y(11)],[X(43),Y(-15)],[X(62),Y(36)],[X(34),Y(43)]],p.shadow);
      line([[X(2),Y(-30)],[X(43),Y(-15)],[X(64),Y(22)]],glow,2.4*u);
      line([[X(28),Y(35)],[X(42),Y(19)],[X(62),Y(22)]],p.facet,2*u);
      disk(X(77),Y(-15),3*u,glow);
    }else if(o.type==='CRYSTAL'||o.type==='CORE'||o.type==='METAL'){
      const col=o.type==='CRYSTAL'?'#78e1f0':o.type==='METAL'?'#ffc581':'#ffe3a0';
      for(let i=-1;i<=1;i++){
        const cy=i*22,reach=o.type==='METAL'?94-Math.abs(i)*9:75+((i+2)%2)*18;
        polygon([[X(-10),Y(cy-16)],[X(reach),Y(cy-5)],[X(-7),Y(cy+17)]],col,'#fffbe6',1.5*u);
        polygon([[X(-6),Y(cy-12)],[X(reach*.7),Y(cy-5)],[X(5),Y(cy-1)]],p.facet+'a5');
        line([[X(4),Y(cy-7)],[X(37),Y(cy-1)],[X(16),Y(cy+11)]],p.shadow+'c0',1.6*u);
      }
    }else if(o.type==='LAVA'){
      disk(X(44),y,59*u,'#ff723625');
      polygon([[X(-9),Y(-33)],[X(17),Y(-43)],[X(41),Y(-39)],[X(70),Y(-22)],
        [X(92),Y(-6)],[X(86),Y(18)],[X(52),Y(42)],[X(19),Y(33)],[X(-9),Y(36)]],
        '#3b2730','#0a1018',6*u);
      polygon([[X(2),Y(-28)],[X(35),Y(-32)],[X(71),Y(-4)],[X(61),Y(9)],
        [X(43),Y(0)],[X(18),Y(24)]],'#d54d32');
      line([[X(14),Y(-24)],[X(31),Y(-15)],[X(47),Y(5)],[X(65),Y(-2)]],'#ffca65',5*u);
      line([[X(31),Y(29)],[X(48),Y(20)],[X(63),Y(23)]],'#ff893a',3*u);
    }else if(o.type==='CHAIN'){
      for(let i=-2;i<=2;i++){
        ctx.beginPath();ctx.ellipse(X(9+i%2*10),y+i*22*u,10*u,12*u,0,0,2*Math.PI);
        ctx.strokeStyle='#b280c6';ctx.lineWidth=4*u;ctx.stroke();
      }
      polygon([[X(21),Y(-28)],[X(63),Y(-33)],[X(96),Y(-5)],[X(71),Y(20)],
        [X(62),Y(34)],[X(33),Y(17)]],'#352442','#c48ced',3*u);
      polygon([[X(29),Y(-22)],[X(65),Y(-28)],[X(71),Y(2)]],p.facet+'ad');
      line([[X(42),Y(16)],[X(66),Y(6)],[X(77),Y(13)]],glow,1.6*u);
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
  // WEB 1.7: 36 pre-rendered hand-approved chibi frames from the same visual
  // identity. 12 frames per pose, with subframe interpolation at the display's
  // actual refresh rate. The cape, hair and shoes move independently within
  // each baked frame, rather than wobbling an unchanged standing portrait.
  const UIJI_FRAME=384,UIJI_COLS=6,UIJI_FRAMES=12;
  const clamp01=v=>Math.max(0,Math.min(1,v));
  function uijiPoseState(fold,speed){
    // Respond from the first tap, not after an arbitrary early-speed threshold.
    // Keep only ONE full-opacity pose selected at a time; continuous tilt and
    // silhouette contraction happen before the late expression keyframe swap.
    const progress=clamp01(fold*1.08);
    const action=smooth(progress);
    const closed=progress>=.80,frantic=closed&&speed>=800;
    const mode=frantic?2:closed?1:0;
    const contract=mode===0?1-.18*action:mode===2?.96:(.97+.03*smooth(clamp01((progress-.80)/.20)));
    return {open:mode===0?1:0,folded:mode===1?1:0,frantic:mode===2?1:0,contract,progress};
  }
  function drawUijiAtlasPose(atlas,mode,phase,alpha,u,elapsed){
    if(alpha<=.003)return;
    const position=((phase%UIJI_FRAMES)+UIJI_FRAMES)%UIJI_FRAMES;
    const first=Math.floor(position),frac=smooth(position-first);
    // The cape-open silhouette is wider. Folding contracts the cape instead
    // of simply hiding it; the folded face is deliberately more determined.
    const w=(mode===0?175:mode===1?155:162)*u;
    const h=(mode===0?175:mode===1?171:173)*u;
    const bob=Math.sin(elapsed*(mode===2?13:7)+mode)*(.7+mode*.32)*u;
    function cell(i,opacity){
      if(opacity<.003)return;
      const index=mode*UIJI_FRAMES+i;
      const col=index%UIJI_COLS,row=Math.floor(index/UIJI_COLS);
      ctx.save();ctx.globalAlpha*=opacity;
      ctx.drawImage(atlas,col*UIJI_FRAME,row*UIJI_FRAME,UIJI_FRAME,UIJI_FRAME,
        -w/2,bob-h*.52,w,h);
      ctx.restore();
    }
    // Crisp 100%-opaque keyframe instead of translucent neighboring images.
    // Body/cape motion is interpolated by continuous transforms at screen FPS.
    cell(Math.floor(position+.5)%UIJI_FRAMES,alpha);
  }
  function drawUiji(x,y,u,fold,elapsed,speed,dead,hopping,hopFrom){
    const atlas=images.uijiMotion;
    if(!atlas?.naturalWidth){
      // No regression when image has not yet downloaded.
      const standby=images.uiji;
      if(!paintSprite(standby,x,y,116*u,170*u,1))
        drawFallbackHero(x,y,u,false,elapsed,dead,hopping,hopFrom);
      return;
    }
    const p=hopping?clamp01(s.hopVisual):1;
    const side=hopFrom==='L'?1:-1;
    const wind=clamp01((speed-112)/650);
    const weights=dead?{open:0,folded:0,frantic:1}:uijiPoseState(fold,speed);
    const jumpPulse=hopping?Math.sin(Math.PI*p):0;
    const kick=hopping?side*((-.27+.48*smooth(p))*(1-smooth(clamp01((p-.72)/.28)))):0;
    const tilt=dead?side*.88:(Math.sin(elapsed*(4.1+wind*6))*(.012+wind*.018)+kick-weights.progress*.22);
    const squash=hopping?1+(.095*(1-smooth(clamp01(p/.20))))-.07*jumpPulse:1;
    const shiver=0;
    const yBounce=Math.sin(elapsed*(6.2+wind*5.5))*(.75+wind*.6)*u;
    const frameTime=elapsed*(9.5+wind*5.5);
    function actorAt(dx=0,dy=0,opacity=1){
      ctx.save();ctx.translate(x+dx+shiver,y+dy+yBounce);ctx.rotate(tilt);
      if(hopping&&hopFrom==='R')ctx.scale(-1,1);
      ctx.scale(squash*(weights.contract||1)*(1+wind*.021*Math.sin(elapsed*11)),
        (1-.015*wind*Math.sin(elapsed*9))/squash);
      // Each mode has a 12-frame loop, interpolated at 60+ Hz.
      drawUijiAtlasPose(atlas,0,frameTime,opacity*weights.open,u,elapsed);
      drawUijiAtlasPose(atlas,1,frameTime*1.09+2,opacity*weights.folded,u,elapsed);
      drawUijiAtlasPose(atlas,2,frameTime*1.23+5,opacity*weights.frantic,u,elapsed);
      ctx.restore();
    }
    // Only one full-opacity character image. Previous ghost-frame echoes
    // obscured face details and looked translucent on Galaxy.
    actorAt(0,0,1);
    if(hopping){
      drawWallKickImpact(u,side,p,y);
      if(p>.64){
        const land=(p-.64)/.36;
        ctx.save();ctx.strokeStyle='rgba(251,220,151,'+((1-land)*.30)+')';
        ctx.lineWidth=2.3*u;ctx.beginPath();
        ctx.arc(x,y+18*u,(19+26*land)*u,0,Math.PI*2);
        ctx.stroke();ctx.restore();
      }
    }
    if(dead){
      // A little cartoon "seeing stars" reaction after a lethal fall.
      ctx.save();
      ctx.globalAlpha=.75;
      const t=clock*4.1;
      for(let i=0;i<3;i++){
        const a=t+i*Math.PI*2/3;
        const xx=x+Math.cos(a)*43*u, yy=y-55*u+Math.sin(a)*12*u;
        ctx.fillStyle=i===0?'#ffe7a2':'#b8d9ff';
        ctx.beginPath();ctx.arc(xx,yy,3.5*u,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }else if(weights.frantic>.18){
      // Exaggerated speed/panic accent, synced to the actual in-game speed.
      ctx.save();ctx.globalAlpha=weights.frantic*(.25+.15*Math.sin(elapsed*15)**2);
      ctx.strokeStyle='#9ceaff';ctx.lineWidth=2.1*u;
      for(let i=0;i<3;i++){
        const sideSign=i%2?1:-1;
        const xx=x+sideSign*(70+i*7)*u;
        ctx.beginPath();ctx.moveTo(xx,y-85*u+i*10*u);
        ctx.lineTo(xx+sideSign*9*u,y-104*u+i*10*u);ctx.stroke();
      }
      ctx.restore();
    }
  }
  // Helmet is an independent overlay shared by all character IDs.
  function drawHelmet(x,y,u){
    if(!s.helmetId||s.stage==='READY')return;
    const boy=sys.profile.selectedCharacter==='uiji';
    const cy=y-(boy?65:59)*u;
    ctx.save();ctx.translate(x,cy);
    if(s.helmetId==='helmet_frog'){
      ctx.fillStyle='#66b746';ctx.strokeStyle='#184f32';ctx.lineWidth=3*u;
      ctx.beginPath();ctx.ellipse(0,4*u,30*u,21*u,0,Math.PI,Math.PI*2);ctx.lineTo(30*u,8*u);
      ctx.quadraticCurveTo(0,13*u,-30*u,8*u);ctx.closePath();ctx.fill();ctx.stroke();
      for(const off of [-20,20]){
        disk(off*u,-14*u,12*u,'#7ae65a');disk(off*u,-16*u,7*u,'#e6fff3');
        disk((off+2)*u,-17*u,3*u,'#1d3945');
      }
      line([[-26*u,9*u],[26*u,9*u]],'#a1f079',2*u);
    }else{
      const steel=ctx.createLinearGradient(-27*u,-17*u,24*u,18*u);
      steel.addColorStop(0,'#bec7cc');steel.addColorStop(.5,'#677882');steel.addColorStop(1,'#232d38');
      ctx.beginPath();ctx.ellipse(0,2*u,30*u,22*u,0,Math.PI,Math.PI*2);
      ctx.lineTo(30*u,10*u);ctx.quadraticCurveTo(0,15*u,-30*u,10*u);ctx.closePath();
      ctx.fillStyle=steel;ctx.fill();ctx.strokeStyle='#1a2228';ctx.lineWidth=3*u;ctx.stroke();
      polygon([[-32*u,9*u],[32*u,9*u],[24*u,15*u],[-24*u,15*u]],'#cba86a','#36363c',2*u);
      disk(0,-6*u,5*u,'#f4cc7c');
    }
    if(s.helmetCharges===0){
      line([[-13*u,-9*u],[0,4*u],[-8*u,13*u]],'#2e253c',2*u);
    }
    ctx.restore();
  }
  function drawBubble(x,y,u){
    if(s.bubbleLeft<=0&&s.shieldFlash<=0)return;
    const color=s.bubbleLeft>0?(s.bubbleColor||'#ffe579'):'#b5eaff';
    const pulse=1+.024*Math.sin(s.elapsed*7);
    ctx.save();ctx.translate(x,y-5*u);ctx.scale(pulse,pulse);
    const g=ctx.createRadialGradient(-18*u,-31*u,8*u,0,0,110*u);
    g.addColorStop(0,color+'05');g.addColorStop(.68,color+'13');g.addColorStop(1,color+'40');
    ctx.beginPath();ctx.ellipse(0,0,77*u,93*u,0,0,Math.PI*2);
    ctx.fillStyle=g;ctx.fill();
    ctx.strokeStyle=color+(s.shieldFlash>0?'ee':'a3');
    ctx.lineWidth=(s.shieldFlash>0?4:2.7)*u;ctx.stroke();
    ctx.beginPath();ctx.ellipse(-19*u,-30*u,30*u,50*u,-.47,Math.PI*.9,Math.PI*1.47);
    ctx.strokeStyle='#ffffff73';ctx.lineWidth=3.5*u;ctx.stroke();
    disk(45*u,45*u,5*u,'#ffffff69');disk(-53*u,-22*u,2.5*u,'#ffffff7a');
    ctx.restore();
  }
  function drawHero(x,y,u,fold,elapsed,speed,dead,hopping,hopFrom){
    y+=Math.sin(elapsed*(10+fold*10))*(1.2+fold*1.5)*u;
    if(sys.profile.selectedCharacter==='uiji'){
      drawUiji(x,y,u,fold,elapsed,speed,dead,hopping,hopFrom);return;
    }
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
    sys.audio.fade(dt);
    draw();drawVortex();updateUI();requestAnimationFrame(frame);
  }
  function applyControlSide(){
    controls.classList.toggle('boost-right',sys.profile.settings.boostSide==='right');
  }
  $('start').addEventListener('click',()=>start());
  $('restart').addEventListener('click',()=>start());
  $('backHome').addEventListener('click',()=>{sys.audio.stop();s=makeGame('READY');$('drawer').classList.add('hidden');updateUI();});
  boostBtn.addEventListener('pointerdown',e=>{if(s.stage!=='PLAYING')return;e.preventDefault();tapAccelerate();});
  // No pointerup/hold listener: holding does not generate additional acceleration.
  jumpBtn.addEventListener('pointerdown',e=>{if(s.stage!=='PLAYING')return;e.preventDefault();jump();jumpBtn.setPointerCapture(e.pointerId);});
  for(let i=0;i<2;i++){
    $('quickItem'+i).addEventListener('pointerdown',e=>{
      if(s.stage!=='PLAYING')return;
      e.preventDefault();useQuickItem(i);
    });
  }
  jumpBtn.addEventListener('pointerup',e=>{if(jumpBtn.hasPointerCapture(e.pointerId))jumpBtn.releasePointerCapture(e.pointerId);});
  document.addEventListener('keydown',e=>{if(['Space','ArrowRight','Enter'].includes(e.code)){e.preventDefault();if(e.repeat||heldKeys.has(e.code))return;heldKeys.add(e.code);
    if(e.code==='Space')tapAccelerate();else if(e.code==='ArrowRight')jump();else if(e.code==='Enter'&&(s.stage==='READY'||s.stage==='OVER')&&document.activeElement?.tagName!=='BUTTON')start();}});
  document.addEventListener('keyup',e=>heldKeys.delete(e.code));
  window.addEventListener('blur',()=>{heldKeys.clear();});
  document.addEventListener('visibilitychange',()=>{sys.audio.visibility(document.hidden);if(document.hidden){heldKeys.clear();lastFrame=0;}});
  window.addEventListener('resize',fit);if(window.ResizeObserver)new ResizeObserver(fit).observe(gameRoot);
  function esc(t){return String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}

  // Gameplay level/coin history is global; visuals are freely interchangeable.
  let lobbyCtrl=null;
  function syncLobbyCharacter(){
    const character=sys.CHARACTER_CATALOG.find(c=>c.id===sys.profile.selectedCharacter)||sys.CHARACTER_CATALOG[0];
    $('homeCharacterName').textContent=character.name;
    $('homeAvatar').src=character.front;
    $('lobbyHero').src=character.front; // preserve correct selected image while sprite preloads
    $('characterIdentityName').textContent=character.name;
    $('characterIdentitySubtitle').textContent=character.description;
    $('lobbyCharacter').setAttribute('aria-label',character.name+' 캐릭터');
    lobbyCtrl?.setCharacter(character.id);
  }
  // Per-character wardrobes: two consumable quick slots plus persistent gear.
  // Swiping changes the selected hero; buying never consumes or equips items.
  let wardrobePending=null;
  const GEAR_SLOTS=[['helmet','🪖','헬멧'],['cape','🦸','망토'],['shoes','👟','신발'],['pants','👖','바지'],['top','👕','상의']];
  function helmetPreviewMarkup(helmetId,characterId){
    if(!helmetId)return '';
    const frog=helmetId==='helmet_frog';
    const art=frog?
      '<path d="M9 34Q8 11 30 9Q50 3 70 9Q91 13 90 34L86 41H13Z" fill="#68b850" stroke="#2d6239" stroke-width="4"/><circle cx="25" cy="13" r="12" fill="#83d96d" stroke="#2d6239" stroke-width="3"/><circle cx="74" cy="13" r="12" fill="#83d96d" stroke="#2d6239" stroke-width="3"/><circle cx="25" cy="13" r="6" fill="#f9ffeb"/><circle cx="74" cy="13" r="6" fill="#f9ffeb"/><circle cx="27" cy="13" r="3" fill="#263b31"/><circle cx="76" cy="13" r="3" fill="#263b31"/><path d="M13 35Q50 43 87 35" fill="none" stroke="#b6eaa2" stroke-width="3"/>':
      '<path d="M9 34Q8 13 31 7Q50 0 69 7Q91 14 90 34L86 40H14Z" fill="#667d86" stroke="#283b44" stroke-width="4"/><path d="M19 24Q45 0 73 21" fill="none" stroke="#bbd0cf" stroke-width="5"/><path d="M4 38H96L87 46H14Z" fill="#c5a473" stroke="#4e4843" stroke-width="3"/><circle cx="50" cy="18" r="6" fill="#f5d58a"/>';
    return '<svg class="wardrobe-helmet-art '+characterId+'" viewBox="0 0 100 54" role="img" aria-label="장착 중인 헬멧" xmlns="http://www.w3.org/2000/svg">'+art+'</svg>';
  }
  function characterPanelHTML(prof,prog,fmt){
    const characters=sys.CHARACTER_CATALOG;
    const selectedIndex=Math.max(0,characters.findIndex(c=>c.id===prof.selectedCharacter));
    const active=characters[selectedIndex],wardrobe=sys.wardrobeOf(active.id);
    const helmet=sys.ITEM_CATALOG.find(i=>i.id===wardrobe.gear.helmet);
    const dots=characters.map((c,index)=>
      `<button type="button" class="wardrobe-dot ${index===selectedIndex?'is-selected':''}"
        data-character-index="${index}" aria-label="${c.name} 선택" aria-pressed="${index===selectedIndex}"></button>`).join('');
    const slots=[0,1].map(index=>{
      const id=wardrobe.quickSlots[index];
      const item=sys.ITEM_CATALOG.find(x=>x.id===id);
      const count=item?(prof.consumables[item.id]||0):0;
      return `<div class="wardrobe-item-slot">
        <button type="button" class="wardrobe-target ${item?'is-equipped':'is-empty'}"
          data-character-slot="${index}" aria-label="소모품 ${index+1}번 슬롯 ${item?item.name:'비어 있음'}">
          <span class="wardrobe-slot-icon">${item?.icon||'+'}</span>
          <span class="wardrobe-slot-label">${item?item.name.replace(' 버블 보호막',' 버블'):'아이템 '+(index+1)}</span>
          <span class="wardrobe-slot-count">${item?'보유 '+count+'개':'아이템을 끌어오세요'}</span>
        </button>
        ${item?`<button type="button" class="wardrobe-remove" data-remove-slot="${index}" aria-label="슬롯 ${index+1} 장착 해제">×</button>`:''}
      </div>`;
    }).join('');
    const gear=GEAR_SLOTS.map(([key,icon,name])=>{
      const id=wardrobe.gear[key],item=sys.ITEM_CATALOG.find(x=>x.id===id);
      return `<div class="wardrobe-gear-cell">
       <button type="button" data-gear-slot="${key}" class="wardrobe-gear-target ${item?'is-equipped':''}"
         aria-label="${name} 장착 슬롯">
         <span>${item?.icon||icon}</span><strong>${name}</strong><small>${item?item.name:'비어 있음'}</small>
       </button>
       ${item?`<button type="button" class="wardrobe-remove" data-remove-gear="${key}" aria-label="${name} 벗기">×</button>`:''}
      </div>`;
    }).join('');
    const available=sys.ITEM_CATALOG.filter(item=>item.kind==='bubble'?
      (prof.consumables[item.id]||0)>0:prof.inventory.includes(item.id));
    const inventory=available.map(item=>{
      const count=item.kind==='bubble'?(prof.consumables[item.id]||0):1;
      return `<button type="button" class="wardrobe-inventory-item ${wardrobePending===item.id?'is-picked':''}"
          data-inventory-item="${item.id}" draggable="true" aria-pressed="${wardrobePending===item.id}">
        <span class="inventory-icon">${item.icon}</span><span class="inventory-name">${item.name}</span>
        <strong class="inventory-count">${item.kind==='bubble'?'×'+count:'보유'}</strong>
      </button>`;
    }).join('');
    const badge=helmet?`<span class="wardrobe-equipped-badge">${helmet.icon} ${helmet.name} 장착 중</span>`:
      '<span class="wardrobe-equipped-badge is-empty">헬멧 미착용</span>';
    return `<div class="wardrobe-root">
      <div class="wardrobe-carousel" id="wardrobeCarousel" role="group" aria-label="캐릭터 좌우 스와이프 선택" tabindex="0">
        <button type="button" data-char-direction="-1" class="wardrobe-arrow" aria-label="이전 캐릭터">❮</button>
        <div class="wardrobe-portrait">
          <div class="wardrobe-portrait-art">
            <img src="${active.front}" alt="${active.name} 캐릭터 일러스트" draggable="false">
            ${helmetPreviewMarkup(wardrobe.gear.helmet,active.id)}
          </div>
          <div class="wardrobe-portrait-footer"><strong>${active.name}</strong>
            <span class="wardrobe-active-tag">✓ 사용 중</span></div>
          ${badge}
        </div>
        <button type="button" data-char-direction="1" class="wardrobe-arrow" aria-label="다음 캐릭터">❯</button>
      </div>
      <div class="wardrobe-dots">${dots}</div>
      <p class="wardrobe-help">‹ 좌우로 밀어서 캐릭터 선택 · 장착 구성은 캐릭터마다 저장 ›</p>
      <div class="wardrobe-section">
        <div class="wardrobe-heading"><strong>🫧 출전 아이템</strong><small>2칸 · 플레이 중 버튼을 눌러 사용</small></div>
        <div class="wardrobe-quick-slots">${slots}</div>
      </div>
      <div class="wardrobe-section">
        <div class="wardrobe-heading"><strong>👕 캐릭터 꾸미기</strong><small>보관함에서 장착 · ×로 벗기기</small></div>
        <div class="wardrobe-gear-slots">${gear}</div>
      </div>
      <div class="wardrobe-section">
        <div class="wardrobe-heading"><strong>🎒 내 보관함</strong><small>드래그하거나 선택 후 슬롯 터치</small></div>
        <div class="wardrobe-inventory">${inventory||'<p class="wardrobe-empty-inventory">아직 보관한 아이템이 없어. 상점에서 구매하면 여기에 나타나.</p>'}</div>
        <p id="wardrobeHint" class="wardrobe-hint">${wardrobePending?'선택한 아이템을 장착 슬롯에 눌러 넣어 주세요.':'아이템을 누르고 슬롯을 터치하거나, 직접 끌어다 놓으세요.'}</p>
      </div>
    </div>`;
  }
  function marketArt(item,full=false){
  const id="mark-"+item.id+(full?"-big":"-small");
  if(item.kind==="bubble"){
    const color={bubble_10:["#fff9c2","#ffb932","#a85424"],bubble_20:["#c5ffe9","#20d69a","#116f55"],bubble_30:["#ffe0d8","#f3437b","#8d295f"]}[item.id]||["#fff","#9ae","#457"];
    return `<svg viewBox="0 0 100 100" class="market-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="${id}" cx="32%" cy="23%" r="80%"><stop stop-color="${color[0]}"/><stop offset=".44" stop-color="${color[1]}"/><stop offset="1" stop-color="${color[2]}"/></radialGradient></defs><circle cx="50" cy="50" r="38" fill="${color[1]}" opacity=".12"/><circle cx="50" cy="50" r="34" fill="url(#${id})" stroke="${color[0]}" stroke-width="2.8"/><path d="M27 45Q30 25 53 23" fill="none" stroke="#fff" stroke-width="5" opacity=".7" stroke-linecap="round"/><path d="m78 8 3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="${color[0]}" opacity=".9"/><path d="M42 76q17 5 28-9" fill="none" stroke="${color[2]}" stroke-width="3" opacity=".6"/></svg>`;
  }
  const frog=item.id==="helmet_frog",primary=frog?"#73c668":"#8aa5af",shadow=frog?"#285940":"#374a58",light=frog?"#ddffb9":"#f4ead8";
  return `<svg viewBox="0 0 100 100" class="market-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${light}"/><stop offset=".46" stop-color="${primary}"/><stop offset="1" stop-color="${shadow}"/></linearGradient></defs><ellipse cx="50" cy="82" rx="32" ry="6" fill="#000" opacity=".25"/>${frog?'<circle cx="28" cy="27" r="13" fill="#72b861" stroke="#285940" stroke-width="3"/><circle cx="72" cy="27" r="13" fill="#72b861" stroke="#285940" stroke-width="3"/><circle cx="29" cy="26" r="6" fill="#fff"/><circle cx="71" cy="26" r="6" fill="#fff"/><circle cx="31" cy="27" r="2.7" fill="#273a34"/><circle cx="73" cy="27" r="2.7" fill="#273a34"/>':''}<path d="M15 69V58C15 33 29 20 50 20S85 33 85 58v11l-9 10H24z" fill="url(#${id})" stroke="${shadow}" stroke-width="3"/><path d="M23 52Q27 31 52 28" fill="none" stroke="${light}" opacity=".65" stroke-width="5" stroke-linecap="round"/>${frog?'<path d="M36 56q14 10 28 0" fill="none" stroke="#316746" stroke-width="3"/>':'<path d="M47 25h6v47h-6z" fill="#d6b778"/>'}<path d="M12 68Q50 76 88 68l-5 11Q50 89 17 79z" fill="#ad824e" stroke="#62462f" stroke-width="2"/><path d="M25 73q25 7 50 0" fill="none" stroke="#ffe6ac" opacity=".75" stroke-width="2"/></svg>`;
}
  let marketTab='all',marketSelected=null;
  function shopPanelHTML(prof,fmt){
  const items=sys.ITEM_CATALOG;
  const shown=items.filter(i=>marketTab==="all"||i.kind===marketTab);
  const chosen=items.find(i=>i.id===marketSelected);
  const count=i=>i.kind==="bubble"?(prof.consumables[i.id]||0):(prof.inventory.includes(i.id)?1:0);
  const coin=n=>`<span class="market-coin" aria-hidden="true"></span>${fmt(n)}`;
  const tabHTML=[["all","전체"],["bubble","보호막"],["helmet","헬멧"]].map(([id,label])=>`<button type="button" data-market-tab="${id}" class="market-tab ${marketTab===id?'active':''}" role="tab" aria-selected="${marketTab===id}">${label}</button>`).join("");
  const tiles=shown.map(i=>{
    const owned=count(i),permanent=i.kind!=="bubble"&&owned;
    const short=i.kind==="bubble"?i.name.replace(" 버블 보호막"," 버블"):i.name;
    return `<button type="button" class="market-tile ${permanent?'is-owned':''}" data-market-item="${i.id}" aria-label="${esc(i.name)}, 상품 상세 보기"><span class="market-art">${marketArt(i)}</span>${owned?`<span class="market-stock">${i.kind==='bubble'?'×'+owned:'보유'}</span>`:''}<span class="market-name">${esc(short)}</span><span class="market-price">${permanent?'구매 완료':coin(i.price)}</span></button>`;
  }).join("");
  let details="";
  if(chosen){
    const have=count(chosen),permanent=chosen.kind!=="bubble"&&have;
    const guidance=chosen.kind==="bubble"?"캐릭터 화면에서 출전 슬롯에 장착하세요. 게임 중 직접 사용하면 1개가 소모되고 정해진 시간 동안 충돌을 방어해요.":"한 번 구매하면 영구 소유해요. 캐릭터 화면에서 장착하면 매 판 충돌 방어 횟수가 충전됩니다.";
    details=`<div class="market-overlay"><button type="button" class="market-shade" data-market-close aria-label="상품 설명 닫기"></button><section class="market-detail" role="dialog" aria-modal="true" aria-label="${esc(chosen.name)} 상세 정보"><span class="market-handle"></span><button type="button" class="market-close" data-market-close aria-label="닫기">✕</button><div class="market-detail-head"><span class="market-large-art">${marketArt(chosen,true)}</span><div class="market-detail-title"><small>${chosen.kind==='bubble'?'소모품 · 보호막':'영구 장비 · 헬멧'}</small><strong>${esc(chosen.name)}</strong><b>${chosen.kind==='bubble'?chosen.seconds+'초 충돌 방어':'매 판 충돌 '+chosen.hits+'회 방어'}</b><span>${chosen.kind==='bubble'?'보유 '+have+'개':have?'보유 중':'미구매'}</span></div></div><p class="market-guide">${guidance}</p><div class="market-detail-bottom"><div><small>구매 가격</small><strong>${coin(chosen.price)}</strong></div><button type="button" data-market-buy="${chosen.id}" ${permanent?'disabled':''}>${permanent?'보유 중':'구매하기'}</button></div></section></div>`;
  }
  return `<div class="market-root"><p class="market-eyebrow">ADVENTURER'S MARKET</p><h3 class="market-title">탐험을 위한 장비</h3><div class="market-wallet"><span>보유 코인</span><strong>${coin(prof.coins)}</strong></div><nav class="market-tabs" role="tablist" aria-label="상품 분류">${tabHTML}</nav><div class="market-count"><strong>${marketTab==='all'?'모든 아이템':marketTab==='bubble'?'버블 보호막':'탐험가 헬멧'}</strong><span>${shown.length}개 · 상품을 눌러 자세히 보기</span></div><div class="market-grid">${tiles}</div><div class="market-footer">구매 후 캐릭터 화면의 보관함에서 장착할 수 있어요.</div>${details}</div>`;
}
  function switchWardrobeCharacter(delta,indexOverride=null){
    const chars=sys.CHARACTER_CATALOG;
    const pos=chars.findIndex(c=>c.id===sys.profile.selectedCharacter);
    const next=indexOverride!==null?indexOverride:(pos+delta+chars.length)%chars.length;
    const target=chars[next];if(!target)return;
    wardrobePending=null;sys.selectCharacter(target.id);
    syncLobbyCharacter();openPanel('character');
  }
  function assignWardrobeItem(itemId,target){
    const item=sys.ITEM_CATALOG.find(x=>x.id===itemId);
    const character=sys.profile.selectedCharacter;
    let ok=false;
    if(target.hasAttribute('data-character-slot')&&item?.kind==='bubble'){
      ok=sys.setCharacterSlot(character,Number(target.dataset.characterSlot),itemId);
    }else if(target.hasAttribute('data-gear-slot')&&item){
      ok=sys.setCharacterGear(character,target.dataset.gearSlot,itemId);
    }
    wardrobePending=null;
    const notice=ok?item.name+' 장착 완료':'종류가 맞지 않거나 수량이 부족해. 슬롯을 확인해 줘.';
    openPanel('character',notice);
  }
  function mountWardrobeControls(){
    const body=$('drawerBody'),carousel=$('wardrobeCarousel');
    body.querySelectorAll('[data-char-direction]').forEach(button=>button.addEventListener('click',()=>{
      switchWardrobeCharacter(Number(button.dataset.charDirection));
    }));
    body.querySelectorAll('[data-character-index]').forEach(button=>button.addEventListener('click',()=>{
      switchWardrobeCharacter(0,Number(button.dataset.characterIndex));
    }));
    if(carousel){
      let begin=null;
      carousel.addEventListener('pointerdown',e=>{begin={id:e.pointerId,x:e.clientX,y:e.clientY};});
      carousel.addEventListener('pointerup',e=>{
        if(!begin||begin.id!==e.pointerId)return;
        const dx=e.clientX-begin.x,dy=e.clientY-begin.y;begin=null;
        if(Math.abs(dx)>=38&&Math.abs(dx)>Math.abs(dy)*1.2){
          e.preventDefault();switchWardrobeCharacter(dx<0?1:-1);
        }
      });
      carousel.addEventListener('pointercancel',()=>{begin=null;});
      carousel.addEventListener('keydown',e=>{
        if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
          e.preventDefault();switchWardrobeCharacter(e.key==='ArrowRight'?1:-1);
        }
      });
    }
    const active=sys.profile.selectedCharacter,wardrobe=sys.wardrobeOf(active);
    body.querySelectorAll('[data-character-slot],[data-gear-slot]').forEach(target=>{
      target.addEventListener('click',()=>{
        if(wardrobePending){assignWardrobeItem(wardrobePending,target);return;}
        const slot=target.dataset.characterSlot;
        if(slot!==undefined){
          const index=Number(slot);
          if(wardrobe.quickSlots[index]){
            sys.setCharacterSlot(active,index,null);openPanel('character','아이템 장착 해제 · 수량은 그대로 보관');
          }else{
            const hint=$('wardrobeHint');if(hint)hint.textContent='보관함에서 아이템을 먼저 선택해 줘.';
          }
        }else{
          const gearSlot=target.dataset.gearSlot;
          if(wardrobe.gear[gearSlot]){
            sys.setCharacterGear(active,gearSlot,null);
            openPanel('character','장비를 벗었어. 보관함에 그대로 남아 있어.');
          }else{
            const hint=$('wardrobeHint');if(hint)hint.textContent=gearSlot==='helmet'?
              '보관함에서 보유 중인 헬멧을 선택하고 이 칸을 눌러 줘.':
              '해당 종류의 장비가 상점에 추가되면 여기서 착용할 수 있어.';
          }
        }
      });
      target.addEventListener('dragover',e=>{e.preventDefault();target.classList.add('is-drop-target');});
      target.addEventListener('dragleave',()=>target.classList.remove('is-drop-target'));
      target.addEventListener('drop',e=>{
        e.preventDefault();
        const id=e.dataTransfer?.getData('text/plain')||wardrobePending;
        target.classList.remove('is-drop-target');
        if(id)assignWardrobeItem(id,target);
      });
    });
    body.querySelectorAll('[data-remove-slot]').forEach(button=>button.addEventListener('click',()=>{
      sys.setCharacterSlot(active,Number(button.dataset.removeSlot),null);
      openPanel('character','아이템을 보관함으로 돌려놨어. 수량은 그대로야.');
    }));
    body.querySelectorAll('[data-remove-gear]').forEach(button=>button.addEventListener('click',()=>{
      sys.setCharacterGear(active,button.dataset.removeGear,null);
      openPanel('character','장비를 벗었어. 보관함에 그대로 남아 있어.');
    }));
    body.querySelectorAll('[data-inventory-item]').forEach(tile=>{
      tile.addEventListener('click',()=>{
        wardrobePending=wardrobePending===tile.dataset.inventoryItem?null:tile.dataset.inventoryItem;
        body.querySelectorAll('[data-inventory-item]').forEach(b=>{
          b.classList.toggle('is-picked',b.dataset.inventoryItem===wardrobePending);
          b.setAttribute('aria-pressed',String(b.dataset.inventoryItem===wardrobePending));
        });
        const hint=$('wardrobeHint');
        if(hint)hint.textContent=wardrobePending?
          '선택한 '+(sys.ITEM_CATALOG.find(i=>i.id===wardrobePending)?.name||'아이템')+'을 위의 알맞은 슬롯에 터치해 줘.':
          '아이템을 터치하거나 슬롯으로 끌어서 장착할 수 있어.';
      });
      tile.addEventListener('dragstart',e=>{
        e.dataTransfer?.setData('text/plain',tile.dataset.inventoryItem);
        if(e.dataTransfer)e.dataTransfer.effectAllowed='copy';
      });
      // Touchscreen drag/drop without relying on Safari's HTML drag support.
      let drag=null;
      tile.addEventListener('pointerdown',e=>{
        if(e.pointerType==='mouse')return; // desktop uses native HTML drag
        drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,active:false,ghost:null};
        tile.setPointerCapture?.(e.pointerId);
      });
      tile.addEventListener('pointermove',e=>{
        if(!drag||drag.id!==e.pointerId)return;
        const distance=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY);
        if(!drag.active&&distance>12){
          drag.active=true;
          const ghost=document.createElement('div');
          ghost.className='wardrobe-drag-ghost';
          ghost.textContent=tile.textContent.trim();
          document.body.appendChild(ghost);drag.ghost=ghost;
        }
        if(drag.active){
          e.preventDefault();
          drag.ghost.style.left=e.clientX+'px';
          drag.ghost.style.top=e.clientY+'px';
        }
      });
      tile.addEventListener('pointerup',e=>{
        if(!drag||drag.id!==e.pointerId)return;
        const {active:dragged,ghost}=drag;drag=null;
        ghost?.remove();
        if(dragged){
          e.preventDefault();
          const target=document.elementFromPoint?.(e.clientX,e.clientY)?.closest?.('[data-character-slot],[data-gear-slot]');
          if(target)assignWardrobeItem(tile.dataset.inventoryItem,target);
        }
      });
      tile.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag=null;});
    });
  }
  const titles={character:'캐릭터',shop:'상점',earn:'코인 획득소',records:'내 기록',settings:'설정'};
  function openPanel(type,notice=''){if(!titles[type])return;sys.audio.unlock();$('drawerTitle').textContent=titles[type];$('drawer').querySelector('.drawer-card').classList.toggle('is-market',type==='shop');
    const prof=sys.profile,prog=sys.levelProgress(prof.totalDepth),fmt=n=>Number(n).toLocaleString('ko-KR');
    let html='';
    if(type==='character')html=characterPanelHTML(prof,prog,fmt);
    else if(type==='shop')html=shopPanelHTML(prof,fmt);
    else if(type==='earn')html=`<div class="banner">🪙 현재 코인 <b>${fmt(prof.coins)}</b><br><small>게임 중 수집 · 누적 레벨업 · 선택형 광고 · 코인 구매</small></div><div class="info-card"><strong>무료로 얻기</strong>게임에서 코인 줍기 / 누적 낙하로 레벨업</div><div class="info-card"><strong>▶ 보상형 광고</strong><span class="muted">광고 서비스 연동 전이어서 현재 시청·코인 지급을 사용할 수 없어.</span></div><div class="info-card"><strong>코인 구매</strong><span class="muted">현금 결제는 추후 설계·심사 후 연결할 예정이야. 현재 결제 기능 없음.</span></div>`;
    else if(type==='records')html=`<div class="banner">🏆 최고 낙하 <b>${fmt(Math.floor(best))}m</b></div><div class="info-card"><strong>누적 낙하</strong>${fmt(prof.totalDepth)}m · Lv.${prof.level}<br><span class="muted">다음 레벨까지 ${fmt(prog.next-prog.within)}m</span></div><div class="info-card"><strong>플레이 횟수</strong>${fmt(prof.runs)}판 완료</div><div class="info-card"><strong>획득 코인 기록</strong>게임에서 수집 ${fmt(prof.worldCoins)}코인 · 현재 보유 ${fmt(prof.coins)}코인</div>`;
    else if(type==='settings')html=`<div class="info-card"><strong>🎮 가속·벽점프 버튼 위치</strong><span class="muted">휴대폰을 잡고 연타하기 편한 손으로 가속 버튼을 옮길 수 있어. 선택은 자동 저장돼.</span><div class="control-layout-choices" role="group" aria-label="가속 버튼 방향"><button type="button" class="control-layout-choice" data-boost-side="left" aria-pressed="${prof.settings.boostSide!=='right'}">🌪️ 가속 왼쪽<br><small>점프 오른쪽</small></button><button type="button" class="control-layout-choice" data-boost-side="right" aria-pressed="${prof.settings.boostSide==='right'}">🌪️ 가속 오른쪽<br><small>점프 왼쪽</small></button></div></div><div class="info-card"><strong>🔊 음량 설정</strong><span class="muted">BGM은 배경음악이야. 홈은 무음이니까 아래 음악의 ▶ 미리듣기를 켜고 슬라이더를 움직이면 바로 확인할 수 있어.</span><label for="musicRange">BGM (배경음악) <span id="musicValue">${Math.round(prof.settings.music*100)}%</span><input id="musicRange" type="range" min="0" max="100" value="${Math.round(prof.settings.music*100)}"></label><label for="sfxRange">효과음 <span id="sfxValue">${Math.round(prof.settings.sfx*100)}%</span><input id="sfxRange" type="range" min="0" max="100" value="${Math.round(prof.settings.sfx*100)}"></label></div><div class="info-card"><strong>🎵 게임 음악 미리듣기</strong><span class="muted">게임에서 7곡이 순서대로 이어져. 홈은 무음이며 ▶는 선택한 곡의 미리듣기야.</span><ul class="slot-list music-preview-list">${sys.MUSIC_SLOTS.slice(1).map((v,i)=>`<li><span>${(i+1)+'번 곡'} · ${esc(v.title||v.name)}</span><button type="button" data-music-preview="${i+1}" aria-label="${esc(v.title||v.name)} 미리듣기">▶</button></li>`).join('')}</ul></div>`;
    $('drawerBody').innerHTML=(notice?'<div class="shop-notice" role="status">'+esc(notice)+'</div>':'')+html;
    $('drawer').classList.remove('hidden');
    if(type==='character')mountWardrobeControls();
    if(type==='shop'){
      const redraw=(noticeText='')=>{
        const panel=$('drawer').querySelector('.drawer-card'),offset=panel.scrollTop;
        openPanel('shop',noticeText);
        panel.scrollTop=offset;
      };
      $('drawerBody').querySelectorAll('[data-market-tab]').forEach(b=>b.addEventListener('click',()=>{
        marketTab=b.dataset.marketTab;marketSelected=null;redraw();
      }));
      $('drawerBody').querySelectorAll('[data-market-item]').forEach(b=>b.addEventListener('click',()=>{
        marketSelected=b.dataset.marketItem;redraw();
      }));
      $('drawerBody').querySelectorAll('[data-market-close]').forEach(b=>b.addEventListener('click',()=>{
        marketSelected=null;redraw();
      }));
      $('drawerBody').querySelectorAll('[data-market-buy]').forEach(b=>b.addEventListener('click',()=>{
        const result=sys.purchase(b.dataset.marketBuy);
        redraw(result.ok?result.item.name+' 구매 완료':result.reason);
        updateUI();
      }));
    }
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
          const playingSame=sys.audio.mode==='preview'&&sys.audio.previewIndex===idx;
          sys.audio.unlock();sys.audio.preview(playingSame?-1:idx);
          $('drawerBody').querySelectorAll('[data-music-preview]').forEach(b=>{
            const selected=!playingSame&&Number(b.dataset.musicPreview)===idx;
            b.textContent=selected?'■':'▶';
            b.setAttribute('aria-pressed',String(selected));
          });
        });
      });
    }
  }
  document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.panel==='shop'){marketTab='all';marketSelected=null;}openPanel(button.dataset.panel);}));
  function closePanel(){
    $('drawer').classList.add('hidden');
    sys.audio.stopPreview();
  }
  $('drawerClose').addEventListener('click',closePanel);
  $('drawer').addEventListener('click',e=>{if(e.target===$('drawer'))closePanel()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('drawer').classList.contains('hidden')){if(marketSelected){marketSelected=null;openPanel('shop');}else closePanel();}});
  // WEB 0.9: Home-only WebGL sculpt; BGM / audio, gameplay and records unchanged.
  (function setupLobbyCharacter(){
    const actor=$('lobbyCharacter'), embers=$('lobbyEmbers');
    if(window.HellFallLobby3D)lobbyCtrl=window.HellFallLobby3D.mount(actor,{isHome:()=>s.stage==='READY',initial:sys.profile.selectedCharacter});
    syncLobbyCharacter();
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
  window.HellFallTest={snapshot:()=>({stage:s.stage,depth:s.depth,speed:s.speed,timeLeft:s.timeLeft,wall:s.wall,hopProgress:s.hopProgress,hopVisual:s.hopVisual,boost:s.boost,fold:s.fold,cadence:s.cadence,tapCount:s.tapCount,runCoins:s.runCoins,hazards:s.obstacles.length,gates:s.timeGates.length,checkpoints:s.checkpointGates.length,checkpointFlash:s.checkpointFlash,lastCheckpointBonus:s.lastCheckpointBonus,boostSide:sys.profile.settings.boostSide,bubbleLeft:s.bubbleLeft,helmetCharges:s.helmetCharges,helmetId:s.helmetId,shieldFlash:s.shieldFlash,quickSlots:s.quickSlots.slice(),character:sys.profile.selectedCharacter,profile:{...sys.profile}}),start:()=>start(false)};
})();