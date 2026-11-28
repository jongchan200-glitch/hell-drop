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
  const B=window.HellBalance,T=B.T;
  const {CHECKPOINT_GAPS,CHECKPOINT_BONUS,CLOCK_GAPS,CLOCK_BONUS}=B;
  const dm=B.distance,meters=d=>dm(d).toLocaleString('ko-KR');
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
  const statOf=(id)=>sys.characterStats(id);
  const currentActor=()=>sys.CHARACTER_CATALOG.find(c=>c.id===s.runCharacter)?.actor||'useoi';
  const runSkin=()=>sys.SKIN_CATALOG.find(c=>c.id===s.runCharacter);
  const skinLabel=c=>c.starter?'기본 복장':c.id.startsWith('wingsuit_')?'윙슈트':c.id.startsWith('pajama_')?'잠옷 스킨':'탐험가 스킨';
  function effectiveStats(){
    return sys.loadoutStats(s.runCharacter,s.pet,s.mods||{},s.runLevel);
  }
  const rewardTime=(n,line=false)=>B.reward(n,line?effectiveStats().lineBonus:effectiveStats().timeBonus);
  const ranking=window.HellRanking.provider, itemTools=window.HellItems;
  const petAtlases=new Map();
  for(const {visual:v} of sys.PET_CATALOG){
    if(!petAtlases.has(v.atlas)){const image=new Image();image.src=v.atlas;petAtlases.set(v.atlas,image);}
  }
  // Only the original V4.2 reference family; no generated replacement faces.
  const IMAGE_FILES={braking:'hero_cape',jumpLeft:'hero_jump_left',jumpRight:'hero_jump_right',dizzy:'hero_hit',uiji:'uiji_intro',uijiMotion:'uiji_motion_atlas'};
  Object.entries(IMAGE_FILES).forEach(([key,file])=>{
    const img=new Image(); img.onload=()=>{
      images[key]=img;
      if(key==='braking'){
        prepareCapeRig(img,capeRig);
        // Starter characters have their own pre-drawn animation frames.
        // Do not process their huge premium textures on the main UI thread.
      }
    };
    img.onerror=()=>{}; img.src='assets/'+file+'.webp';
  });
  function prepareCapeRig(original,target=capeRig){
    // Create an articulated 3-layer puppet directly from the single original
    // 512px hero_cape image. No generated poses, no new character images.
    // Source pixels are never redrawn and the central face/body stays unchanged.
    // Image source may be a Canvas 2D costume recolor (no naturalWidth).
    const width=original.naturalWidth||original.width;
    const height=original.naturalHeight||original.height;
    if(!width||!height)return;
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
      pc.drawImage(original,0,0);pc.restore();target[name]=piece;
      cc.globalCompositeOperation='destination-out';cc.fillStyle='#fff';shape(cc,masks[name]);cc.fill();
    }
    cc.globalCompositeOperation='source-over';target.core=core;target.ready=true;
  }
  function readRecord(){return Number(window.HellPlatform.storage.read('hell_fall_web_v42_best')||0)||0;}
  function saveRecord(value){window.HellPlatform.storage.write('hell_fall_web_v42_best',String(value));}
  const zoneOf=B.zoneOf;
  const tierOf=B.tierOf;
  function wallX(w){return w==='L'?.29:.71;}
  function otherWall(w){return w==='L'?'R':'L';}
  function smooth(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
  function posX(g,p=g.hopProgress){return wallX(g.hopFrom)*(1-smooth(p))+wallX(g.wall)*smooth(p);}
  function rngSeed(seed){let x=(seed>>>0)||1;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function makeGame(stage='READY'){return{seed:(Math.random()*1000000000)|0,stage,depth:0,speed:T.START,timeLeft:T.LIMIT,elapsed:0,boost:0,fold:0,lastTapAt:-1,tapPulse:0,tapCount:0,tapIntervals:[],cadence:0,wall:'L',hopFrom:'L',hopProgress:1,hopVisual:1,obstacles:[],timeGates:[],checkpointGates:[],coinGates:[],runCoins:0,nextObstacle:370,nextTimeGate:B.FIRST_CLOCK,nextCheckpoint:B.FIRST_LINE,nextCoin:210,coinNumber:0,obstacleNumber:0,gateNumber:0,checkpointNumber:0,gateFlash:0,checkpointFlash:0,zoneFlash:0,lastBonus:0,lastCheckpointBonus:0,failure:'',bubbleCharges:0,bubbleColor:null,bubbleName:'',invuln:0,shieldFlash:0,runCharacter:'starter_boy',runLevel:sys.profile.level,drinks:{speed:{bonus:0},brake:{bonus:0},time:{bonus:0}},pet:null,petX:null,runItems:[],mods:{},won:false};}
  function start(){
    if(!sys.profile.identityChosen){openPanel('chooseActor');return;}
    if(!ranking.nickname()){openPanel('nickname');return;}
    if(s.stage==='PLAYING')return;
    const loadout=sys.startLoadout();
    if(!loadout.ok){openPanel('character',loadout.reason);return;}
    applyControlSide();s=makeGame('PLAYING');
    s.runCharacter=sys.profile.selectedCharacter;s.pet=loadout.pet;s.runLevel=sys.profile.level;
    s.runItems=loadout.items.map(i=>i.id);s.mods=itemTools.modifiers(loadout.items);
    for(const item of loadout.items){
      if(item.kind==='bubble'){s.bubbleCharges=item.hits;s.bubbleColor=item.color;s.bubbleName=item.name;}
      else if(s.drinks[item.stat])s.drinks[item.stat].bonus=item.bonus;
    }
    const wing=runSkin()?.kind==='wingsuit';
    boostBtn.querySelector('strong').textContent=wing?'급강하':'망토 접기';
    boostBtn.setAttribute('aria-label',wing?'윙슈트 급강하 연타 가속':'망토 접기 연타 가속');
    closePanel();$('homePrepNotice').textContent='한 판용 · 시작 시 차감';
    lastReward={distance:0,foundCoins:0,bonus:0,levelUps:0,level:sys.profile.level,newBalance:sys.profile.coins};
    heldKeys.clear();sys.audio.unlock();sys.audio.startGamePlaylist();
    sys.audio.effect('start');updateUI();
  }
  function finish(msg){if(s.stage==='OVER')return;s.stage='OVER';s.failure=msg;if(s.depth>best){best=s.depth;saveRecord(best);}const rewards=itemTools.rewards(s.runCoins,s.depth,s.mods);lastReward=sys.awardRun(s.depth,rewards.coins,rewards.growth);sys.audio.effect(lastReward.levelUps>0?'level':'hit');heldKeys.clear();boostBtn.classList.remove('active');updateUI();}
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
    const stats=effectiveStats();
    // Recent inter-tap rhythm controls the gauge. Slow tapping holds a low
    // storm, and successive higher levels demand increasingly faster rhythms.
    // Max boost requires a sustained ~5 thumb-taps/second (V0.7 design).
    // Allow one thumb-tap interval of grace before fading, not auto-repeat on hold.
    const interval=s.tapIntervals.length?s.tapIntervals.reduce((a,b)=>a+b,0)/s.tapIntervals.length:0;
    const rawRate=interval>0?Math.min(13,1/interval):0;
    const silence=s.lastTapAt<0?999:s.elapsed-s.lastTapAt;
    const anticipation=interval>0?Math.min(.43,Math.max(.23,interval*1.13)):.12;
    const rate=rawRate*Math.exp(-Math.max(0,silence-anticipation)*5.2);
    const {boost,speed:nextSpeed}=B.speedStep(old,s.speed,s.boost,rate,stats,dt);
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
      s.nextTimeGate+=CLOCK_GAPS[z];s.gateNumber++;
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
      checkpointBonus=rewardTime(g.bonus,true);remain=Math.min(T.LIMIT,remain+checkpointBonus);
      checkpointGlow=1.25;g.collected=true;sys.audio.effect('checkpoint');
    }
    for(const g of s.timeGates){
      if(g.collected||!(old<g.depth&&depth>=g.depth))continue;
      const along=Math.max(0,Math.min(1,(g.depth-old)/traveled));
      if(s.timeLeft<=dt*along)continue;
      const p=Math.min(1,s.hopProgress+dt*along/T.HOP_SECONDS);
      if(s.mods.magnet||Math.abs(posX(s,p)-wallX(g.wall))<=.12){
        bonus=rewardTime(g.bonus);remain=Math.min(T.LIMIT,remain+bonus);
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
    let crashed=false,bubbleCharges=s.bubbleCharges;
    let invuln=Math.max(0,s.invuln-dt);
    let shieldFlash=Math.max(0,s.shieldFlash-dt);
    for(const o of s.obstacles){
      if(!(old<=o.depth+15&&depth>=o.depth-15))continue;
      const along=Math.max(0,Math.min(1,(o.depth-15-old)/traveled));
      const p=Math.min(1,s.hopProgress+dt*along/T.HOP_SECONDS);
      if(Math.abs(posX(s,p)-wallX(o.wall))>=.18)continue;
      // Do not alter collision geometry: only intercept a fatal collision when
      // an active purchased defense is present.
      if(invuln>0){shieldFlash=Math.max(shieldFlash,.24);continue;}
      if(bubbleCharges>0){
        bubbleCharges--;invuln=.75;shieldFlash=.64;sys.audio.effect('hit');continue;
      }
      crashed=true;break;
    }
    Object.assign(s,{boost,fold,cadence:rate,tapPulse:Math.max(0,s.tapPulse-dt*3.3),speed:nextSpeed,depth:Math.min(B.CLEAR_DEPTH,depth),timeLeft:remain,elapsed:s.elapsed+dt,hopProgress:hop,hopVisual,gateFlash:glow,checkpointFlash:checkpointGlow,zoneFlash,lastBonus:bonus,lastCheckpointBonus:checkpointBonus,bubbleCharges,invuln,shieldFlash});
    if(hop>=1)jumpBtn.classList.remove('active');
    const rescue=itemTools.rescue(crashed,remain,s.mods);s.timeLeft=Math.min(T.LIMIT,rescue.remain);
    if(rescue.revived){s.invuln=.75;s.shieldFlash=.64;sys.audio.effect('hit');}
    if(rescue.timed){s.gateFlash=1.2;s.lastBonus=rescue.remain;sys.audio.effect('clock');}
    if(rescue.crashed)finish('지층 장애물에 부딪혔어!');else if(s.timeLeft<=0)finish('시간이 다 됐어!');else if(s.depth>=B.CLEAR_DEPTH){s.won=true;finish('지옥의 심연 정복!');}
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
    if(playing&&s.bubbleCharges>0)protection.push('🫧 '+s.bubbleCharges+'회');
    if(playing&&s.pet)protection.push((s.pet.icon||'🐉')+' '+s.pet.name);
    if(playing&&s.drinks.speed.bonus>0)protection.push('⚡ +'+s.drinks.speed.bonus+'%p');
    if(playing&&s.drinks.brake.bonus>0)protection.push('❄ +'+s.drinks.brake.bonus+'%p');
    if(playing&&s.drinks.time.bonus>0)protection.push('⏳ +'+s.drinks.time.bonus+'%');
    if(playing&&s.mods.life)protection.push('♡ +'+s.mods.life+'%');if(playing&&s.mods.accel)protection.push('↟ +'+s.mods.accel+'%');if(playing&&s.mods.revive)protection.push('🪶');if(playing&&s.mods.hourglass)protection.push('⌛');if(playing&&s.mods.magnet)protection.push('🧲');
    $('protectionBadge').textContent=protection.join(' · ');
    $('protectionBadge').classList.toggle('hidden',protection.length===0);
    $('runCoinLabel').textContent=String(s.runCoins);
    const progress=sys.levelProgress(sys.profile.totalDepth);
    if(ready){
      $('homeLevel').textContent=sys.profile.level;
      $('homeCoin').textContent=sys.profile.coins.toLocaleString('ko-KR');
      $('homeBest').textContent=meters(best);
      $('homeTotal').textContent=meters(sys.profile.totalDepth);renderHomePrep();
      $('homeProgressFill').style.width=(progress.ratio*100).toFixed(1)+'%';
    }
    if(over){
      $('menuTitle').textContent=s.won?'최종 클리어!':'추락 종료!';$('failure').textContent=s.failure;
      $('finalDepth').innerHTML=meters(s.depth)+' <small>m</small>';
      $('finalBest').textContent='최고 기록 '+meters(best)+' m';
      $('earnedCoin').textContent='+'+lastReward.foundCoins;
      $('earnedLevel').textContent='+'+lastReward.bonus;
      $('totalTravel').textContent='누적 '+meters(sys.profile.totalDepth)+'m · Lv.'+sys.profile.level;
    }
    $('zoneLabel').textContent=(zoneOf(s.depth)+1)+'구역 · '+ZONES[zoneOf(s.depth)];
    $('depthLabel').innerHTML=meters(s.depth)+' <small>m</small>';
    $('recordLabel').textContent='최고 '+meters(Math.max(best,s.depth))+' m';
    $('timeLabel').textContent=s.timeLeft.toFixed(1);
    $('timeLabel').style.color=s.timeLeft<8?COLORS.red:'white';
    $('timeCaption').classList.toggle('alert',s.timeLeft<6);
    const currentStats=effectiveStats();
    $('speedLabel').textContent='속도 '+(s.speed/B.SCALE).toFixed(1)+' m/s · 최고 '+currentStats.speed+'% · 감속 '+currentStats.brake+'%';
    $('timeFill').style.width=(100*s.timeLeft/T.LIMIT)+'%';
    $('timeFill').classList.toggle('danger',s.timeLeft<6);
    boostBtn.classList.toggle('active',s.tapPulse>.6);
    $('boostHint').textContent=s.boost>.84?'🌪️ 폭풍 유지!':s.boost>.39?'더 빠르게!':'빠르게 연타!';
    $('vortexState').textContent=s.boost>.93?'폭풍 최고!':s.boost>.65?'격렬한 돌개':s.boost>.26?'회오리 성장':s.boost>.045?'바람 발생':'바람 대기';
    toast.classList.add('hidden');toast.classList.remove('mint');
    if(playing && s.zoneFlash>0){toast.textContent=ZONES[zoneOf(s.depth)]+' 진입!';toast.style.opacity=String(Math.min(1,s.zoneFlash/1.5));toast.classList.remove('hidden');}
    if(playing && s.checkpointFlash>0){toast.textContent='⏱ 타임 라인 +'+s.lastCheckpointBonus+'초!';toast.style.opacity=String(Math.min(1,s.checkpointFlash));toast.classList.remove('hidden');toast.classList.add('mint');}
    if(playing && s.gateFlash>0){toast.textContent='⏱ 아이템 +'+String(s.lastBonus)+'초!';toast.style.opacity=String(Math.min(1,s.gateFlash/1.1));toast.classList.remove('hidden');toast.classList.add('mint');}
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
    // One approved renderer; physics position stays unchanged.
    drawDrinkAura(posX(s)*W,charY-arc,u);
    drawHero(posX(s)*W,charY-arc,u,s.fold,s.elapsed,s.speed,s.stage==='OVER',s.hopVisual<1,s.hopFrom);
    drawBubble(posX(s)*W,charY-arc,u);
    drawPet(posX(s)*W,charY-arc,u);
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
    txt('TIME LINE  +'+rewardTime(g.bonus,true)+'s',W*.5,y-7*u,12*u,'#e3fff6');
    if(t>.5){ctx.strokeStyle='#b1fff43b';ctx.lineWidth=2*u;ctx.strokeRect(x0,y-19*u,x1-x0,38*u);}
  }
  function drawGate(g,y,u){const x=wallX(g.wall)*W,p=(Math.sin(s.elapsed*8)+1)/2;
    disk(x,y,43*u,`rgba(107,225,205,${.10+p*.08})`);disk(x,y,27*u,'#6be1cd35');disk(x,y,20*u,'#1a4d4b');
    ctx.beginPath();ctx.arc(x,y,18*u,0,Math.PI*2);ctx.strokeStyle=COLORS.mint;ctx.lineWidth=4*u;ctx.stroke();
    line([[x,y-10*u],[x,y],[x+9*u,y+5*u]],COLORS.cream,3.3*u);disk(x,y,3*u,COLORS.cream);txt('+'+rewardTime(g.bonus)+'s',x,y-37*u,11*u,COLORS.mint);
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
    if(!(img?.naturalWidth||img?.width) || alpha<=0)return false;
    ctx.save();ctx.globalAlpha*=alpha;
    ctx.drawImage(img,x-width/2,y-height*.52,width,height);
    ctx.restore();return true;
  }
  // V0.5 rig: THREE pixel-exact layers cut from the ORIGINAL hero_cape artwork.
  // The face, hair and body live in the stationary core. Each arm and cape wing
  // has a separate shoulder pivot and moves continuously on every animation frame.
  // Unlike swapping generated poses, no interpolated frame can change the face.
  function drawLockedCapeSprite(img,x,y,u,fold,tilt,elapsed=0,opacity=1){
    const rig=capeRig;
    const {core,left,right}=rig;
    if(!rig.ready){
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
    if(!(img?.naturalWidth||img?.width)||opacity<=0)return false;
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
    const fittedAtlas=atlas;
    if(!atlas?.naturalWidth){
      // No regression when image has not yet downloaded.
      paintSprite(images.uiji,x,y,116*u,170*u,1);
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
      drawUijiAtlasPose(fittedAtlas,0,frameTime,opacity*weights.open,u,elapsed);
      drawUijiAtlasPose(fittedAtlas,1,frameTime*1.09+2,opacity*weights.folded,u,elapsed);
      drawUijiAtlasPose(fittedAtlas,2,frameTime*1.23+5,opacity*weights.frantic,u,elapsed);
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
  // A single independent pet sprite follows the hero; no attachment to body pixels.
  function drawPet(x,y,u){
    if(!s.pet)return;
    const v=s.pet.visual,atlas=petAtlases.get(v.atlas),cols=v.cols;
    if(!atlas?.naturalWidth)return;
    const cat=v.mode==='cat';
    const dest=x+(x<W*.5?103:-103)*u;
    s.petX=s.petX===null?dest:s.petX+(dest-s.petX)*.18;
    const pad=(cat?42:34)*u,xx=Math.max(pad,Math.min(W-pad,s.petX));
    const fast=s.boost>.52,flap=Math.sin(s.elapsed*17)>0;
    // Cat tucks during a wall transfer or the short deceleration transition, never flaps.
    const tuck=cat&&(s.hopVisual<.75||(!fast&&s.fold>.10&&s.lastTapAt>=0&&s.elapsed-s.lastTapAt>.22));
    const frame=cat?(tuck?v.tuck:fast?v.dive:v.glide):(fast?v.dive:flap?v.glide:v.alternate);
    s.petPose=cat?(tuck?'tuck':fast?'dive':'glide'):(fast?'dive':flap?'flap-up':'flap-down');
    const size=(cat?(tuck?70:fast?76:82):(fast?58:67))*u;
    ctx.save();ctx.translate(xx,y+(cat?-64:fast?-77:-70)*u+Math.sin(s.elapsed*(cat?5:9))*(cat?2:5)*u);
    if(xx>x)ctx.scale(-1,1);
    // The cat's authored head points down-left; tilt the extended pose toward the fall.
    ctx.rotate(cat?(tuck?Math.sin(s.elapsed*7)*.08:fast?-.48:-.20+Math.sin(s.elapsed*5)*.06):(fast?.25:Math.sin(s.elapsed*8)*.06));
    ctx.drawImage(atlas,(frame%cols)*256,Math.floor(frame/cols)*256,256,256,-size/2,-size/2,size,size);ctx.restore();
  }
  function drawDrinkAura(x,y,u){
    const drinks=s.runItems.map(id=>sys.ITEM_CATALOG.find(i=>i.id===id)).filter(i=>i?.kind==='drink');
    if(!drinks.length)return;
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let j=0;j<drinks.length;j++){const i=drinks[j],g=itemTools.grade(i),dx=(j-(drinks.length-1)/2)*17*u;const grad=ctx.createRadialGradient(x+dx,y-8*u,3*u,x+dx,y-8*u,(76+g*7)*u);grad.addColorStop(0,i.color+['24','37','4d'][g-1]);grad.addColorStop(.55,i.color+['18','24','35'][g-1]);grad.addColorStop(1,i.color+'00');ctx.fillStyle=grad;ctx.fillRect(x-150*u,y-150*u,300*u,300*u);}
    ctx.restore();
  }
  function drawBubble(x,y,u){
    if(s.bubbleCharges<=0&&s.shieldFlash<=0)return;
    const color=s.bubbleCharges>0?(s.bubbleColor||'#ffe579'):'#b5eaff';
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
    // Free actors: three complete full-body source illustrations per character.
    // No procedural vector body, no face collage, no alteration of paid art.
    if(runSkin()?.actions){
      window.HellStarterPoses.draw({
        ctx,x,y,u,who:s.runCharacter,fold,elapsed,speed,dead,hopping,
        hopFrom,hopVisual:s.hopVisual,boost:s.boost
      });
      return;
    }
    if(currentActor()==='uiji'){
      drawUiji(x,y,u,fold,elapsed,speed,dead,hopping,hopFrom);return;
    }
    if(dead){
      if(!paintSprite(images.dizzy,x,y,139*u,139*u,1))
        paintSprite(images.braking,x,y,139*u,139*u,1);
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
      // A single opaque full-body frame at a time: no ghost / double character.
      if(landing<.5){
        if(!drawKickSprite(kick,x,y,u,tilt,squash,1))
          drawLockedCapeSprite(images.braking,x,y,u,fold,tilt,elapsed,1);
      }else drawLockedCapeSprite(images.braking,x,y,u,fold,side*.08*(1-landing),elapsed,1);
      if(p>.65){
        const t=(p-.65)/.35;
        // Brief wall contact glow on arrival (not a new gameplay obstacle).
        ctx.save();ctx.globalAlpha*=(1-t)*.33;
        ctx.strokeStyle='#b9ecff';ctx.lineWidth=2*u;
        ctx.beginPath();ctx.arc(x,y+12*u,(24+19*t)*u,0,2*Math.PI);ctx.stroke();ctx.restore();
      }
    }else{
      drawLockedCapeSprite(images.braking,x,y,u,fold,Math.sin(elapsed*5)*fold*.02,elapsed);
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
    if(s.stage==='READY'){
      ctx.fillStyle='#0f0d19';ctx.fillRect(0,0,W,H);
    }
    else cave();
  }
  function frame(now){
    let dt=lastFrame?Math.min(.05,Math.max(0,(now-lastFrame)/1000)):0;
    lastFrame=now;clock+=dt;
    if(s.stage==='PLAYING'&&!window.HellPlatform.isPaused())advance(dt);
    sys.audio.fade(dt);
    draw();drawVortex();updateUI();requestAnimationFrame(frame);
  }
  function applyControlSide(){
    controls.classList.toggle('boost-right',sys.profile.settings.boostSide==='right');
  }
  $('start').addEventListener('click',()=>start());
  $('restart').addEventListener('click',()=>start());
  $('backHome').addEventListener('click',()=>{sys.audio.stop();s=makeGame('READY');$('drawer').classList.add('hidden');updateUI();});
  // Pointerdown for immediate mobile response; click and legacy touch
  // fallbacks for Galaxy/Samsung Internet configurations. A synthesized
  // click after pointerdown must not jump a second time.
  function bindGamePress(button,handler){
    let lastPointer=-Infinity;
    function press(e){
      if(s.stage!=='PLAYING')return;
      if(e.type==='pointerdown' && e.pointerType==='mouse'&&e.button!==0)return;
      const now=performance.now();
      if(e.type==='click'&&now-lastPointer<450)return;
      if(e.type==='pointerdown'||e.type==='touchstart')lastPointer=now;
      if(e.cancelable)e.preventDefault();
      handler();
    }
    button.addEventListener('pointerdown',press,{passive:false});
    button.addEventListener('click',press);
    if(!window.PointerEvent)button.addEventListener('touchstart',press,{passive:false});
  }
  bindGamePress(boostBtn,tapAccelerate);
  bindGamePress(jumpBtn,jump);
  document.addEventListener('keydown',e=>{if(e.target?.matches?.('input,textarea,[contenteditable]'))return;if(['Space','ArrowRight','Enter'].includes(e.code)){e.preventDefault();if(e.repeat||heldKeys.has(e.code))return;heldKeys.add(e.code);
    if(e.code==='Space')tapAccelerate();else if(e.code==='ArrowRight')jump();else if(e.code==='Enter'&&(s.stage==='READY'||s.stage==='OVER')&&document.activeElement?.tagName!=='BUTTON')start();}});
  document.addEventListener('keyup',e=>heldKeys.delete(e.code));
  window.addEventListener('blur',()=>{heldKeys.clear();});
  window.HellPlatform.onPauseChange(paused=>{sys.audio.visibility(paused);heldKeys.clear();lastFrame=0;});
  window.addEventListener('resize',fit);if(window.ResizeObserver)new ResizeObserver(fit).observe(gameRoot);
  function esc(t){return String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}

  // Gameplay level/coin history is global; visuals are freely interchangeable.
  let lobbyCtrl=null;
  function syncLobbyCharacter(){
    const character=sys.CHARACTER_CATALOG.find(c=>c.id===sys.profile.selectedCharacter)||sys.CHARACTER_CATALOG[0];
    $('homeCharacterName').textContent=ranking.nickname()||'모험가';
    $('homeAvatar').src=sys.SKIN_CATALOG.find(c=>c.actor===character.actor&&c.starter).front;
    $('characterIdentityName').textContent=sys.actorName(character.actor);
    $('characterIdentitySubtitle').textContent=character.starter?'기본 복장 · 무료':skinLabel(character);
    $('lobbyClassTag').textContent=character.starter?'무료 기본 복장':skinLabel(character);
    const pet=sys.petOf(character.id);
    syncPreparedStats();
    const homePet=$('homePet');
    homePet.classList.toggle('hidden',!pet);
    homePet.classList.toggle('pet-art',!!pet);
    for(const {visual:v} of sys.PET_CATALOG)homePet.classList.toggle(v.css,pet?.visual===v);
    if(pet){const [atlas,size,pos]=petArtValues(pet);homePet.style.setProperty('--pet-atlas',atlas);homePet.style.setProperty('--pet-size',size);homePet.style.setProperty('--pet-pos',pos);}
    else for(const key of ['--pet-atlas','--pet-size','--pet-pos'])homePet.style.removeProperty(key);
    $('lobbyTraits').classList.toggle('is-premium',!character.starter);
    $('lobbyCharacter').setAttribute('aria-label',character.name+' 캐릭터');
    lobbyCtrl?.setCharacter(character.id);
  }
  // WEB 3.3: the wearer and item art have separate roles.
  let wardrobeTab='skins',previewMode=0,previewSerial=0,pendingSlot=null,slotOrigin='home',lastPrep='';
  const SKIN_ART={starter_boy:0,uiji:1,wingsuit_boy:2,starter_girl:3,useoi:4,wingsuit_girl:5};
  function atlasArt(i,extra=''){return '<span class="rpg-atlas '+extra+'" style="--atlas-x:'+((i%3)*50)+'%;--atlas-y:'+(Math.floor(i/3)*50)+'%" aria-hidden="true"></span>';}
  function skinArt(c){return c.iconArt?'<span class="rpg-atlas skin-icon" style="background-image:url(\''+esc(c.iconArt)+'\')" aria-hidden="true"></span>':atlasArt(SKIN_ART[c.id]??0);}
  function petArtValues(p){const v=p.visual,step=100/(v.cols-1);return ["url('"+v.atlas+"')",(v.cols*100)+'% '+(v.cols*100)+'%',(v.representative%v.cols)*step+'% '+Math.floor(v.representative/v.cols)*step+'%'];}
  function petArt(p){const [atlas,size,pos]=petArtValues(p);return '<span class="rpg-atlas pet-art '+p.visual.css+'" style="--pet-atlas:'+esc(atlas)+';--pet-size:'+size+';--pet-pos:'+pos+'" aria-hidden="true"></span>';}
  const petStats=p=>[p.speedBonus?'최고속 +'+p.speedBonus+'%p':'',p.brakeBonus?'감속 +'+p.brakeBonus+'%p':'',p.timeBonus?'시간 획득 +'+p.timeBonus+'%':''].filter(Boolean).join(' · ');
  function prepSlotsHTML(prof,origin){
    const slots=sys.wardrobeOf(prof.selectedCharacter)?.quickSlots||[];
    return Array.from({length:4},(_,i)=>{
      const id=slots[i],item=sys.ITEM_CATALOG.find(x=>x.id===id),locked=i>=prof.slotCount;
      const title=locked?'잠금 · '+sys.SLOT_PRICES[i]+'코인':item?item.name:'빈 슬롯 '+(i+1);
      return '<button type="button" class="prep-slot '+(locked?'is-locked':item?'is-filled':'is-empty')+'" data-prep-slot="'+i+'" data-prep-origin="'+origin+'" aria-label="'+esc(title)+'"><span class="prep-icon">'+(locked?'🔒':item?marketArt(item):'+')+'</span><span class="prep-name">'+(locked?sys.SLOT_PRICES[i]+'🪙':item?esc(item.name.replace(' 드링크 · ',' ').replace(' 보호막','')):'슬롯 '+(i+1))+'</span></button>';
    }).join('');
  }
  function syncPreparedStats(){
    const stats=sys.preparedStats(sys.profile.selectedCharacter);
    $('lobbySpeedStat').textContent=stats.speed+'%';
    $('lobbySpeedStat').title='기본 60% · 레벨 성장 +'+sys.levelSpeedBonus(sys.profile.level)+'%p · 장착 스킨/펫/출전 아이템 포함';
    $('lobbyBrakeStat').textContent=stats.brake+'%';
    const sharedTime=stats.timeBonus>0&&stats.timeBonus===stats.lineBonus;
    $('lobbyTimeStat').textContent=stats.timeBonus?(sharedTime?'시간 획득 +':'시계 +')+stats.timeBonus+'%':'';
    $('lobbyTimeStat').classList.toggle('hidden',!stats.timeBonus);
    $('lobbyLifeStat').textContent=stats.lineBonus?'타임라인 +'+stats.lineBonus+'%':'';$('lobbyLifeStat').classList.toggle('hidden',!stats.lineBonus||sharedTime);
    $('lobbyAccelStat').textContent=stats.accel?'가속 +'+stats.accel+'%':'';$('lobbyAccelStat').classList.toggle('hidden',!stats.accel);
    const equipped=(sys.wardrobeOf(sys.profile.selectedCharacter)?.quickSlots||[]).map(id=>sys.ITEM_CATALOG.find(i=>i.id===id)).filter(Boolean),chosen=equipped.filter(i=>i.kind==='drink');
    const shield=equipped.find(i=>i.kind==='bubble'),bubble=$('lobbyShield');bubble.classList.toggle('hidden',!shield);if(shield)bubble.style.setProperty('--shield-color',shield.color);
    $('lobbyAura').style.background=chosen.map((i,j)=>'radial-gradient(ellipse at '+(50+(j-(chosen.length-1)/2)*15)+'% 52%, '+i.color+['2a','3b','50'][itemTools.grade(i)-1]+' 0%, '+i.color+'08 45%, transparent 72%)').join(',');
  }
  function renderHomePrep(){
    const prof=sys.profile,w=sys.wardrobeOf(prof.selectedCharacter);if(!w)return;
    const key=JSON.stringify([prof.activeActor,prof.selectedCharacter,prof.level,sys.petOf()?.id,prof.slotCount,w.quickSlots,prof.coins]);
    if(key===lastPrep)return;lastPrep=key;
    $('homePrepSlots').innerHTML=prepSlotsHTML(prof,'home');syncPreparedStats();
  }
  function returnToPrep(notice=''){
    pendingSlot=null;marketSelected=null;marketCharacter=null;marketGroup=null;lastPrep='';
    if(slotOrigin==='character'){wardrobeTab='items';renderHomePrep();openPanel('character',notice);}
    else{closePanel();renderHomePrep();if(notice){$('homePrepNotice').textContent=notice;}}
  }
  function openPrepSlot(index,origin){
    const prof=sys.profile,w=sys.wardrobeOf(prof.selectedCharacter);if(!w||!prof.identityChosen)return;
    slotOrigin=origin;pendingSlot=index;marketSelected=null;marketCharacter=null;marketGroup=null;
    if(index>=prof.slotCount){pendingSlot=prof.slotCount;openPanel('slotUnlock');return;}
    if(w.quickSlots[index]){if(sys.setCharacterSlot(prof.selectedCharacter,index,null))returnToPrep('장착 해제 · 수량 유지');return;}
    openPanel('loadout');
  }
  function loadoutHTML(prof){
    const w=sys.wardrobeOf(prof.selectedCharacter),type=itemTools.type;
    const used=new Set(w.quickSlots.map(id=>sys.ITEM_CATALOG.find(i=>i.id===id)).filter(Boolean).map(type));
    const owned=sys.ITEM_CATALOG.filter(i=>(prof.consumables[i.id]||0)>0);
    return '<div class="rpg-picker"><p class="market-guide">슬롯 '+(pendingSlot+1)+'에 장착할 보유 아이템을 선택하세요. 출전 전에는 차감되지 않습니다.</p><div class="rpg-grid">'+(owned.map(i=>'<button class="rpg-card" type="button" data-loadout-item="'+i.id+'" '+(used.has(type(i))?'disabled':'')+'><span class="rpg-art">'+marketArt(i)+'</span><b>'+esc(i.name)+'</b><small>×'+prof.consumables[i.id]+(used.has(type(i))?' · 같은 능력 장착 중':'')+'</small></button>').join('')||'<p class="market-guide">보유한 소모품이 없어요. 상점에서 구매할 수 있어요.</p>')+'</div><button class="rpg-secondary" data-prep-back type="button">취소</button></div>';
  }
  function slotUnlockHTML(prof){
    const i=prof.slotCount,price=sys.SLOT_PRICES[i];
    return '<div class="info-card"><strong>출전 슬롯 '+(i+1)+' 영구 확장</strong><p>한 번 구매하면 모든 스킨과 캐릭터에서 계속 사용할 수 있습니다.</p><p>판매가 '+price+'코인 · 보유 '+prof.coins+'코인</p><button class="start-button" data-buy-slot="'+i+'" type="button" '+(prof.coins<price?'disabled':'')+'>구매하기</button><button class="rpg-secondary" data-prep-back type="button">취소</button></div>';
  }
  function characterPanelHTML(prof,prog,fmt){
    const active=sys.SKIN_CATALOG.find(c=>c.id===prof.selectedCharacter)||sys.SKIN_CATALOG[0],pet=sys.petOf(active.id),stats=sys.preparedStats(active.id);
    const actorButtons=sys.TEST_MODE?'<div class="actor-choice-row">'+sys.ACTOR_CATALOG.map(a=>'<button type="button" data-test-actor="'+a.id+'" aria-pressed="'+(a.id===prof.activeActor)+'">'+a.name+'</button>').join('')+'</div>':'';
    const skinTiles=sys.skinsFor(prof.activeActor).filter(c=>sys.ownsSkin(c.id)).map(c=>'<button type="button" class="rpg-card '+(c.id===active.id?'is-selected':'')+'" data-character-pick="'+c.id+'" aria-pressed="'+(c.id===active.id)+'"><span class="rpg-art">'+skinArt(c)+'</span><b>'+esc(skinLabel(c))+'</b><small>'+(c.id===active.id?'장착 중':'보유')+'</small></button>').join('');
    const petTiles=sys.PET_CATALOG.filter(p=>prof.ownedPets.includes(p.id)).map(p=>'<button type="button" class="rpg-card '+(pet?.id===p.id?'is-selected':'')+'" data-equip-pet="'+p.id+'"><span class="rpg-art">'+petArt(p)+'</span><b>'+esc(p.name)+'</b><small>'+(pet?.id===p.id?'장착 중 · 터치 해제':petStats(p))+'</small></button>').join('');
    const inventory=sys.ITEM_CATALOG.filter(i=>(prof.consumables[i.id]||0)>0).map(i=>'<div class="rpg-card"><span class="rpg-art">'+marketArt(i)+'</span><b>'+esc(i.name)+'</b><small>×'+prof.consumables[i.id]+'</small></div>').join('');
    const tabs=[['skins','스킨'],['pets','펫'],['items','아이템']].map(([id,label])=>'<button type="button" data-wardrobe-tab="'+id+'" aria-pressed="'+(id===wardrobeTab)+'">'+label+'</button>').join('');
    const contents=wardrobeTab==='skins'?'<div class="rpg-grid">'+skinTiles+'</div>':wardrobeTab==='pets'?'<div class="rpg-grid">'+(petTiles||'<p class="market-guide">보유한 펫이 없어요.</p>')+'</div>':'<div class="prep-grid">'+prepSlotsHTML(prof,'character')+'</div><p class="market-guide">빈 슬롯을 터치해 장착, 다시 터치해 해제 · 한 판용</p><div class="rpg-grid">'+(inventory||'<p class="market-guide">보유한 소모품이 없어요.</p>')+'</div>';
    return '<div class="wardrobe-root"><div class="actor-test-box"><div class="starter-pick-heading"><b>내 캐릭터 · '+sys.actorName(prof.activeActor)+'</b><span>'+(sys.TEST_MODE?'TEST':'')+'</span></div>'+actorButtons+'</div>'+
      '<div class="rpg-preview"><div class="rpg-preview-hero">'+(previewMode?'<canvas data-preview-canvas width="256" height="280" aria-label="스킨 동작 미리보기"></canvas>':'<img src="'+active.front+'" alt="'+esc(active.name)+'">')+(pet?'<span class="preview-dragon '+(pet.visual.mode==='cat'?'preview-ground':'')+'">'+petArt(pet)+'</span>':'')+'</div><strong>'+esc(active.name)+'</strong><div class="starter-active-stats"><span>⚡ '+stats.speed+'%</span><span>❄ '+stats.brake+'%</span>'+(stats.timeBonus?'<span>'+(stats.timeBonus===stats.lineBonus?'시간':'시계')+' +'+stats.timeBonus+'%</span>':'')+(stats.lineBonus&&stats.lineBonus!==stats.timeBonus?'<span>타임라인 +'+stats.lineBonus+'%</span>':'')+(stats.accel?'<span>가속 +'+stats.accel+'%</span>':'')+'</div><button class="rpg-secondary rpg-motion" type="button" data-preview-motion>'+['동작 보기','낙하 · 다음','급강하 · 다음','벽점프 · 정면'][previewMode]+'</button></div>'+
      '<nav class="rpg-tabs" aria-label="내 보관함">'+tabs+'</nav>'+contents+'</div>';
  }
  function mountPreview(){
    const canvas=$('drawerBody').querySelector('[data-preview-canvas]'),token=++previewSerial;
    if(!canvas)return;const c=canvas.getContext('2d'),skin=sys.SKIN_CATALOG.find(x=>x.id===sys.profile.selectedCharacter),mode=previewMode;
    const start=performance.now();
    function render(now){
      if(token!==previewSerial||!canvas.isConnected||$('drawer').classList.contains('hidden'))return;
      const t=(now-start)/1000;c.clearRect(0,0,256,280);
      if(skin.actions){
        window.HellStarterPoses.draw({ctx:c,x:128,y:140,u:1.02,who:skin.id,fold:mode===2?.9:0,elapsed:t,speed:mode===2?650:112,dead:false,hopping:mode===3,hopFrom:'R',hopVisual:(t%0.9)/.9,boost:mode===2?.9:0});
      }else if(skin.id==='uiji'&&images.uijiMotion?.naturalWidth){
        const i=(mode-1)*12+Math.floor(t*10)%12;c.drawImage(images.uijiMotion,(i%6)*384,Math.floor(i/6)*384,384,384,30,34,196,196);
      }else{
        const img=mode===3?images.jumpRight:images.braking;
        if(img?.naturalWidth){c.save();c.translate(128,140+Math.sin(t*8)*3);c.rotate(mode===2?-.19:mode===3?.14:0);c.drawImage(img,-106,-106,212,212);c.restore();}
      }
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }
  function marketArt(item,full=false){
  if(item.kind==='drink'||item.kind==='special')return itemTools.art(item);
  const id="mark-"+item.id+(full?"-big":"-small");
  if(item.kind==="bubble"){
    const color={bubble_10:["#fff9c2","#ffb932","#a85424"],bubble_20:["#c5ffe9","#20d69a","#116f55"],bubble_30:["#ffe0d8","#f3437b","#8d295f"]}[item.id]||["#fff","#9ae","#457"];
    return `<svg viewBox="0 0 100 100" class="market-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="${id}" cx="32%" cy="23%" r="80%"><stop stop-color="${color[0]}" stop-opacity=".12"/><stop offset=".68" stop-color="${color[1]}" stop-opacity=".21"/><stop offset="1" stop-color="${color[2]}" stop-opacity=".85"/></radialGradient></defs><circle cx="50" cy="50" r="38" fill="${color[1]}" opacity=".12"/><circle cx="50" cy="50" r="34" fill="url(#${id})" stroke="${color[0]}" stroke-width="2.8"/><path d="M27 45Q30 25 53 23" fill="none" stroke="#fff" stroke-width="5" opacity=".7" stroke-linecap="round"/><path d="m78 8 3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="${color[0]}" opacity=".9"/><path d="M42 76q17 5 28-9" fill="none" stroke="${color[2]}" stroke-width="3" opacity=".6"/></svg>`;
  }
  return '<span class="rpg-slot-art">🔓</span>';
}
  let marketTab='items',marketGroup=null,marketSelected=null,marketCharacter=null;
  function shopPanelHTML(prof,fmt){
    const sections=[['skins','스킨','✧'],['pets','펫','🐉'],['items','아이템','✳']];
    const menu=sections.map(([id,label,icon])=>'<button type="button" data-market-tab="'+id+'" class="market-main-tab '+(marketTab===id?'active':'')+'" aria-pressed="'+(marketTab===id)+'"><b>'+icon+'</b><span>'+label+'</span></button>').join('');
    const skins=sys.skinsFor(prof.activeActor).filter(c=>!c.starter).map(c=>({...c,kind:'skin'}));
    const pets=sys.PET_CATALOG.map(p=>({...p,kind:'pet'}));
    const slot=prof.slotCount<4?{id:'slot_'+prof.slotCount,kind:'slot',name:'출전 슬롯 '+(prof.slotCount+1)+' 확장',price:sys.SLOT_PRICES[prof.slotCount],description:'영구 슬롯 확장 · 모든 캐릭터 공용'}:null;
    const items=sys.ITEM_CATALOG;
    const products=marketTab==='skins'?skins:marketTab==='pets'?pets:marketGroup==='slots'?(slot?[slot]:[]):items.filter(i=>i.kind===marketGroup);
    const chosen=products.find(x=>x.id===(marketSelected||marketCharacter));
    const owned=i=>i.kind==='skin'?sys.ownsSkin(i.id):i.kind==='pet'?prof.ownedPets.includes(i.id):false;
    const art=i=>i.kind==='skin'?skinArt(i):i.kind==='pet'?petArt(i):marketArt(i);
    const stats=i=>i.kind==='skin'?'최고속 '+statOf(i.id).speed+'% · 감속 '+statOf(i.id).brake+'%':i.kind==='pet'?petStats(i):i.description;
    const coin=n=>'<span class="market-coin" aria-hidden="true"></span>'+fmt(n);
    const tiles=products.map(i=>'<button type="button" class="rpg-card market-rpg-card '+(owned(i)?'is-owned':'')+'" '+(i.kind==='skin'?'data-market-character':'data-market-item')+'="'+i.id+'"><span class="rpg-art">'+art(i)+'</span><b>'+esc(i.kind==='skin'?skinLabel(i):i.name)+'</b><small class="market-price">'+(owned(i)?'보유 중':coin(i.price))+'</small>'+((prof.consumables[i.id]||0)>0?'<small>보유 '+prof.consumables[i.id]+'개</small>':'')+'</button>').join('');
    const groups=[['bubble','보호 버블','🫧'],['drink','드링크','🧪'],['special','특수 아이템','✦'],['slots','슬롯 확장','🔓']];
    const folders=groups.map(([id,label,icon])=>'<button type="button" class="market-folder" data-market-group="'+id+'"><span class="market-folder-icon">'+icon+'</span><strong>'+label+'</strong><small>'+(id==='slots'?'기본 2 · 최대 4':items.filter(i=>i.kind===id).length+'종')+'</small><span class="market-folder-caret">›</span></button>').join('');
    let detail='';
    if(chosen){
      const permanent=owned(chosen),attr=chosen.kind==='skin'?'data-market-buy-character':chosen.kind==='pet'?'data-market-buy-pet':chosen.kind==='slot'?'data-market-buy-slot':'data-market-buy';
      const value=chosen.kind==='slot'?prof.slotCount:chosen.id;
      const guide=chosen.kind==='skin'?(chosen.id.startsWith('wingsuit')?'날개를 펼쳐 낙하하고 급강하하는 윙슈트. ':chosen.id.startsWith('pajama_')?'귀여운 기하학 무늬 잠옷과 편안한 슬리퍼. ':'탐험가 전용 복장. ')+'구매 후 내 캐릭터에서 장착하세요.':chosen.kind==='pet'?(chosen.guide||'캐릭터와 함께 낙하하는 영구 펫.')+' 내 캐릭터에서 장착하세요.':chosen.kind==='slot'?'한 번 구매하면 모든 캐릭터에서 영구적으로 사용할 수 있어요.':'출전 전에 장착하면 시작 시 1개 소모되며, 한 판 동안 적용됩니다.';
      detail='<div class="market-overlay"><button type="button" class="market-shade" data-market-close aria-label="닫기"></button><section class="market-detail" role="dialog" aria-modal="true"><span class="market-handle"></span><button type="button" class="market-close" data-market-close aria-label="닫기">✕</button><div class="market-detail-head"><span class="market-large-art">'+art(chosen)+'</span><div class="market-detail-title"><small>'+({skin:'스킨',pet:'영구 펫',slot:'영구 확장',bubble:'한 판용 보호막',drink:'한 판용 드링크',special:'한 판용 특수 아이템'}[chosen.kind])+'</small><strong>'+esc(chosen.name)+'</strong><b>'+esc(stats(chosen))+'</b></div></div><p class="market-guide">'+esc(guide)+'</p><div class="market-detail-bottom"><div><small>판매가</small><strong>'+coin(chosen.price)+'</strong></div><button type="button" '+attr+'="'+value+'" '+(permanent?'disabled':'')+'>'+(permanent?'보유 중':'구매하기')+'</button></div><button type="button" class="rpg-secondary" data-market-close>취소 / 닫기</button></section></div>';
    }
    const browsing=marketTab==='items'&&!marketGroup?'<div class="market-category-grid">'+folders+'</div>':(marketTab==='items'?'<button type="button" class="market-back" data-market-back>‹ 아이템 목록</button>':'')+'<div class="rpg-grid">'+(tiles||'<p class="market-guide">모든 슬롯을 열었어요.</p>')+'</div>';
    return '<div class="market-root"><p class="market-eyebrow">HELL DROP · MARKET</p><div class="market-wallet"><span>보유 코인'+(sys.TEST_MODE?' · TEST':'')+'</span><strong>'+coin(prof.coins)+'</strong></div><nav class="market-main-tabs" aria-label="상점 대분류">'+menu+'</nav>'+browsing+'<div class="market-footer">구매 후 캐릭터 보관함에서 장착할 수 있어요.</div>'+detail+'</div>';
  }
  function mountWardrobeControls(){
    const body=$('drawerBody');
    body.querySelectorAll('[data-test-actor]').forEach(b=>b.addEventListener('click',()=>{if(sys.selectActor(b.dataset.testActor)){previewMode=0;syncLobbyCharacter();updateUI();openPanel('character');}}));
    body.querySelectorAll('[data-character-pick]').forEach(b=>b.addEventListener('click',()=>{if(sys.equipSkin(b.dataset.characterPick)){syncLobbyCharacter();openPanel('character');}}));
    body.querySelectorAll('[data-equip-pet]').forEach(b=>b.addEventListener('click',()=>{if(sys.equipPet(sys.petOf()?.id===b.dataset.equipPet?null:b.dataset.equipPet)){syncLobbyCharacter();openPanel('character');}}));
    body.querySelectorAll('[data-wardrobe-tab]').forEach(b=>b.addEventListener('click',()=>{wardrobeTab=b.dataset.wardrobeTab;openPanel('character');}));
    body.querySelector('[data-preview-motion]')?.addEventListener('click',()=>{previewMode=(previewMode+1)%4;openPanel('character');});
    mountPreview();
  }
  let rankSelected=null,rankView=null;
  const rankDelta=r=>r.newEntry?'<span class="rank-new">NEW</span>':r.change==null||r.change===0?'<span class="rank-same">—</span>':r.change>0?'<span class="rank-up">▲ '+r.change+'</span>':'<span class="rank-down">▼ '+Math.abs(r.change)+'</span>';
  function rankingHTML(){const p=sys.profile;rankView=ranking.getSnapshot({depth:dm(best),skin:p.selectedCharacter,pet:sys.petOf()?.id,level:p.level});const top=rankView.rows.slice(0,20),me=rankView.rows.find(r=>r.id==='local-me');
    const row=r=>'<button type="button" class="rank-row" data-rank-id="'+esc(r.id)+'"><b>'+r.rank+'</b><span>'+esc(r.nickname)+'</span><strong>'+r.depth.toLocaleString('ko-KR')+'m</strong>'+rankDelta(r)+'</button>';
    return '<div class="rank-root"><header class="rank-header"><small>'+esc(rankView.day.replaceAll('-','.'))+'</small><strong>오늘의 랭킹</strong><span>TEST · 가상 순위 / 서버 미연결</span><small>하루 1회 갱신 · KST 기준(테스트)</small></header><div class="rank-list">'+top.map(row).join('')+'</div><section class="rank-own"><small>나의 순위 · 테스트</small>'+row(me)+'<small>기기에 저장된 최고 기록 '+meters(best)+'m</small></section><div id="rankDetail" class="rank-detail hidden"></div></div>';}
  function mountRanking(){const root=$('drawerBody');root.querySelectorAll('[data-rank-id]').forEach(b=>b.addEventListener('click',()=>{const r=rankView.rows.find(x=>x.id===b.dataset.rankId);if(!r)return;rankSelected=r.id;const c=sys.SKIN_CATALOG.find(x=>x.id===r.skin)||sys.SKIN_CATALOG[0],face=sys.SKIN_CATALOG.find(x=>x.actor===c.actor&&x.starter),pet=sys.PET_CATALOG.find(x=>x.id===r.pet);const detail=$('rankDetail');detail.innerHTML='<button type="button" class="rank-shade" aria-label="닫기"></button><section class="rank-profile"><button type="button" class="rank-close" aria-label="닫기">✕</button><div class="rank-profile-head"><div class="rank-face"><img src="'+esc(face.front)+'" alt="캐릭터 얼굴"></div><div><strong>'+esc(r.nickname)+'</strong><small>Lv. '+r.level+'</small></div></div><div class="rank-profile-item"><span>스킨</span><b>'+esc(skinLabel(c))+'</b></div><div class="rank-profile-item"><span>펫</span><b>'+esc(pet?.name||'없음')+'</b></div></section>';detail.classList.remove('hidden');detail.querySelectorAll('button').forEach(x=>x.addEventListener('click',()=>{detail.classList.add('hidden');rankSelected=null;}));}));}
  const titles={nickname:'닉네임 등록',ranking:'오늘의 랭킹',chooseActor:'캐릭터 선택',character:'캐릭터 · 보관함',loadout:'출전 아이템 선택',slotUnlock:'슬롯 확장',shop:'상점',earn:'코인 획득소',records:'내 기록',settings:'설정'};
  function openPanel(type,notice=''){if(!titles[type])return;sys.audio.unlock();$('drawerTitle').textContent=titles[type];$('drawer').querySelector('.drawer-card').classList.toggle('is-market',type==='shop');$('drawer').querySelector('.drawer-card').classList.toggle('is-ranking',type==='ranking');
    const prof=sys.profile,prog=sys.levelProgress(prof.totalDepth),fmt=n=>Number(n).toLocaleString('ko-KR');
    let html='';
    if(type==='nickname')html='<form id="nicknameForm" class="rank-nickname"><strong>나만의 닉네임</strong><p>2~16자 · 나중에 랭킹에 표시됩니다. 현재는 기기 안에만 저장돼요.</p><input id="nicknameInput" maxlength="32" autocomplete="off" placeholder="닉네임 입력" required><button type="submit" class="start-button">등록하기</button><small id="nicknameError" role="alert"></small></form>';
    else if(type==='ranking')html=rankingHTML();
    else if(type==='chooseActor')html=`<div class="actor-onboarding"><p>함께 지옥을 탐험할 캐릭터를 선택하세요.</p><div class="starter-pick-grid">${sys.ACTOR_CATALOG.map(a=>{const c=sys.SKIN_CATALOG.find(x=>x.id===a.base);return '<button class="actor-onboard-card" type="button" data-initial-actor="'+a.id+'"><img src="'+c.front+'" alt=""><strong>'+a.name+'</strong><small>무료 기본 복장</small></button>'}).join('')}</div><p class="muted">${sys.TEST_MODE?'테스트용: 이후 캐릭터 메뉴에서 남녀 전환 가능 · 코인 1,000개로 구매 시험':'최초 선택한 캐릭터로 계속 성장합니다.'}</p></div>`;
    else if(type==='character')html=characterPanelHTML(prof,prog,fmt);
    else if(type==='shop')html=shopPanelHTML(prof,fmt);
    else if(type==='loadout')html=loadoutHTML(prof);
    else if(type==='slotUnlock')html=slotUnlockHTML(prof);
    else if(type==='earn')html=`<div class="banner">🪙 현재 코인 <b>${fmt(prof.coins)}</b><br><small>게임 중 수집 · 누적 레벨업 · 선택형 광고 · 코인 구매</small></div><div class="info-card"><strong>무료로 얻기</strong>게임에서 코인 줍기 / 누적 낙하로 레벨업</div><div class="info-card"><strong>▶ 보상형 광고</strong><span class="muted">광고 서비스 연동 전이어서 현재 시청·코인 지급을 사용할 수 없어.</span></div><div class="info-card"><strong>코인 구매</strong><span class="muted">현금 결제는 추후 설계·심사 후 연결할 예정이야. 현재 결제 기능 없음.</span></div>`;
    else if(type==='records')html=`<div class="banner">🏆 최고 낙하 <b>${meters(best)}m</b></div><div class="info-card"><strong>누적 낙하</strong>${meters(prof.totalDepth)}m · Lv.${prof.level}<br><span class="muted">다음 레벨까지 ${meters(prog.next-prog.within)}m</span></div><div class="info-card"><strong>플레이 횟수</strong>${fmt(prof.runs)}판 완료</div><div class="info-card"><strong>획득 코인 기록</strong>게임에서 수집 ${fmt(prof.worldCoins)}코인 · 현재 보유 ${fmt(prof.coins)}코인</div>`;
    else if(type==='settings')html=`<div class="info-card"><strong>🎮 가속·벽점프 버튼 위치</strong><span class="muted">휴대폰을 잡고 연타하기 편한 손으로 가속 버튼을 옮길 수 있어. 선택은 자동 저장돼.</span><div class="control-layout-choices" role="group" aria-label="가속 버튼 방향"><button type="button" class="control-layout-choice" data-boost-side="left" aria-pressed="${prof.settings.boostSide!=='right'}">🌪️ 가속 왼쪽<br><small>점프 오른쪽</small></button><button type="button" class="control-layout-choice" data-boost-side="right" aria-pressed="${prof.settings.boostSide==='right'}">🌪️ 가속 오른쪽<br><small>점프 왼쪽</small></button></div></div><div class="info-card"><strong>🔊 음량 설정</strong><span class="muted">BGM은 배경음악이야. 홈은 무음이니까 아래 음악의 ▶ 미리듣기를 켜고 슬라이더를 움직이면 바로 확인할 수 있어.</span><label for="musicRange">BGM (배경음악) <span id="musicValue">${Math.round(prof.settings.music*100)}%</span><input id="musicRange" type="range" min="0" max="100" value="${Math.round(prof.settings.music*100)}"></label><label for="sfxRange">효과음 <span id="sfxValue">${Math.round(prof.settings.sfx*100)}%</span><input id="sfxRange" type="range" min="0" max="100" value="${Math.round(prof.settings.sfx*100)}"></label></div><div class="info-card"><strong>🎵 게임 음악 미리듣기</strong><span class="muted">게임에서 7곡이 순서대로 이어져. 홈은 무음이며 ▶는 선택한 곡의 미리듣기야.</span><ul class="slot-list music-preview-list">${sys.MUSIC_SLOTS.slice(1).map((v,i)=>`<li><span>${(i+1)+'번 곡'} · ${esc(v.title||v.name)}</span><button type="button" data-music-preview="${i+1}" aria-label="${esc(v.title||v.name)} 미리듣기">▶</button></li>`).join('')}</ul></div>`;
    $('drawerBody').innerHTML=(notice?'<div class="shop-notice" role="status">'+esc(notice)+'</div>':'')+html;
    $('drawer').classList.remove('hidden');
    $('drawerClose').disabled=(type==='chooseActor'&&!prof.identityChosen)||(type==='nickname'&&!ranking.nickname());
    if(type==='nickname')$('nicknameForm').addEventListener('submit',e=>{e.preventDefault();if(!ranking.register($('nicknameInput').value)){$('nicknameError').textContent='2~16자 닉네임을 입력해 주세요. 저장이 실패하면 다시 시도하세요.';return;}syncLobbyCharacter();closePanel();});
    if(type==='ranking')mountRanking();
    if(type==='chooseActor')$('drawerBody').querySelectorAll('[data-initial-actor]').forEach(b=>b.addEventListener('click',()=>{
      if(sys.selectActor(b.dataset.initialActor)){syncLobbyCharacter();updateUI();if(!ranking.nickname())openPanel('nickname');else closePanel();}
      else openPanel('chooseActor','저장 실패 · 다시 선택해 주세요.');
    }));
    if(type==='character')mountWardrobeControls();
    else previewSerial++;
    if(type==='loadout'||type==='slotUnlock'){
      $('drawerBody').querySelectorAll('[data-prep-back]').forEach(b=>b.addEventListener('click',()=>returnToPrep()));
      $('drawerBody').querySelectorAll('[data-loadout-item]').forEach(b=>b.addEventListener('click',()=>{if(sys.setCharacterSlot(prof.selectedCharacter,pendingSlot,b.dataset.loadoutItem))returnToPrep('장착 완료 · 출전 시 차감');else openPanel('loadout','장착할 수 없는 아이템입니다.');}));
      $('drawerBody').querySelectorAll('[data-buy-slot]').forEach(b=>b.addEventListener('click',()=>{const r=sys.purchaseSlot(Number(b.dataset.buySlot));if(r.ok){updateUI();returnToPrep('슬롯 영구 확장 완료');}else openPanel('slotUnlock',r.reason);}));
    }
    if(type==='shop'){
      const redraw=(noticeText='')=>{
        const panel=$('drawer').querySelector('.drawer-card'),offset=panel.scrollTop;
        openPanel('shop',noticeText);
        panel.scrollTop=offset;
      };
      $('drawerBody').querySelectorAll('[data-market-tab]').forEach(b=>b.addEventListener('click',()=>{
        marketTab=b.dataset.marketTab;marketGroup=null;marketSelected=null;marketCharacter=null;redraw();
      }));
      $('drawerBody').querySelectorAll('[data-market-group]').forEach(b=>b.addEventListener('click',()=>{
        marketGroup=b.dataset.marketGroup;marketSelected=null;marketCharacter=null;redraw();
      }));
      $('drawerBody').querySelectorAll('[data-market-back]').forEach(b=>b.addEventListener('click',()=>{
        marketGroup=null;marketSelected=null;marketCharacter=null;redraw();
      }));
      $('drawerBody').querySelectorAll('[data-market-character]').forEach(b=>b.addEventListener('click',()=>{
        marketCharacter=b.dataset.marketCharacter;marketSelected=null;redraw();
      }));
      $('drawerBody').querySelectorAll('[data-market-item]').forEach(b=>b.addEventListener('click',()=>{
        marketSelected=b.dataset.marketItem;marketCharacter=null;redraw();
      }));
      $('drawerBody').querySelectorAll('[data-market-close]').forEach(b=>b.addEventListener('click',()=>{
        marketSelected=null;marketCharacter=null;redraw();
      }));
      $('drawerBody').querySelectorAll('[data-market-buy-character]').forEach(b=>b.addEventListener('click',()=>{
        const result=sys.purchaseCharacter(b.dataset.marketBuyCharacter);
        if(result.ok)marketCharacter=null;redraw(result.ok?result.character.name+' 구매 완료 · 보관함에서 장착':result.reason);updateUI();
      }));
      $('drawerBody').querySelectorAll('[data-market-buy-pet]').forEach(b=>b.addEventListener('click',()=>{const r=sys.purchasePet(b.dataset.marketBuyPet);if(r.ok)marketSelected=null;redraw(r.ok?'펫 구매 완료 · 보관함에서 장착':r.reason);updateUI();}));
      $('drawerBody').querySelectorAll('[data-market-buy-slot]').forEach(b=>b.addEventListener('click',()=>{const r=sys.purchaseSlot(Number(b.dataset.marketBuySlot));if(r.ok)marketSelected=null;redraw(r.ok?'슬롯 영구 확장 완료':r.reason);updateUI();}));
      $('drawerBody').querySelectorAll('[data-market-buy]').forEach(b=>b.addEventListener('click',()=>{
        const result=sys.purchase(b.dataset.marketBuy);
        if(result.ok)marketSelected=null;redraw(result.ok?result.item.name+' 구매 완료':result.reason);
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
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-prep-slot]');if(b&&s.stage!=='PLAYING')openPrepSlot(Number(b.dataset.prepSlot),b.dataset.prepOrigin);});
  document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.panel==='shop'){marketTab='items';marketGroup=null;marketSelected=null;marketCharacter=null;}openPanel(button.dataset.panel);}));
  function closePanel(){
    previewSerial++;pendingSlot=null;marketSelected=null;marketCharacter=null;marketGroup=null;
    if(!sys.profile.identityChosen){openPanel('chooseActor');return;}
    if(!ranking.nickname()){openPanel('nickname');return;}
    $('drawerClose').disabled=false;
    $('drawer').classList.add('hidden');
    sys.audio.stopPreview();
  }
  $('drawerClose').addEventListener('click',closePanel);
  $('drawer').addEventListener('click',e=>{if(e.target===$('drawer'))closePanel()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('drawer').classList.contains('hidden')){if(marketSelected||marketCharacter){marketSelected=null;marketCharacter=null;openPanel('shop');}else if(marketGroup){marketGroup=null;openPanel('shop');}else closePanel();}});
  // WEB 0.9: Home-only WebGL sculpt; BGM / audio, gameplay and records unchanged.
  (function setupLobbyCharacter(){
    const actor=$('lobbyCharacter'), embers=$('lobbyEmbers');
    lobbyCtrl=window.HellLobbyPortrait.mount(actor,{isHome:()=>s.stage==='READY',initial:sys.profile.selectedCharacter});
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
  if(!sys.profile.identityChosen)openPanel('chooseActor');else if(!ranking.nickname())openPanel('nickname');
  // Expose read-only simple debug state for local test harnesses, never gameplay rewards.
  if(sys.TEST_MODE)window.HellFallTest={snapshot:()=>({stage:s.stage,depth:s.depth,speed:s.speed,timeLeft:s.timeLeft,wall:s.wall,hopProgress:s.hopProgress,hopVisual:s.hopVisual,boost:s.boost,fold:s.fold,cadence:s.cadence,tapCount:s.tapCount,runCoins:s.runCoins,hazards:s.obstacles.length,gates:s.timeGates.length,checkpoints:s.checkpointGates.length,checkpointFlash:s.checkpointFlash,lastCheckpointBonus:s.lastCheckpointBonus,boostSide:sys.profile.settings.boostSide,bubbleCharges:s.bubbleCharges,pet:s.pet?.id||null,petX:s.petX,petPose:s.petPose||null,shieldFlash:s.shieldFlash,runItems:s.runItems.slice(),mods:{...s.mods},won:s.won,poseFrames:window.HellStarterPoses?.getCachedCount()||0,drinks:{speed:{...s.drinks.speed},brake:{...s.drinks.brake},time:{...s.drinks.time}},displayDepth:dm(s.depth),stats:effectiveStats(),character:sys.profile.selectedCharacter,profile:{...sys.profile}}),start:()=>start(false)};
})();