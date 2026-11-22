'use strict';
(function(){
const core=window.HellSimCore;if(!core)throw Error('sim-core.js missing');
const $=id=>document.getElementById(id);
const canvas=$('scene'),ctx=canvas.getContext('2d');
canvas.width=800;canvas.height=1336;ctx.setTransform(2,0,0,2,0,0);
const palettes=[
 {sky:'#0b1521',wall:'#55454b',glow:'#e49a64',accent:'#d6a57d',rock:'#80666b'},
 {sky:'#0b2234',wall:'#365269',glow:'#70dcf2',accent:'#82c9d9',rock:'#537791'},
 {sky:'#351b25',wall:'#693340',glow:'#ff9858',accent:'#ee744c',rock:'#895250'},
 {sky:'#301528',wall:'#82394e',glow:'#ffc266',accent:'#e78b59',rock:'#af526a'},
 {sky:'#211926',wall:'#7e5645',glow:'#fae0a3',accent:'#e7bc78',rock:'#9d7762'},
 {sky:'#2c2737',wall:'#967b69',glow:'#ffefbf',accent:'#cfc5ae',rock:'#a39b92'},
 {sky:'#160f2c',wall:'#4b2e68',glow:'#d289f7',accent:'#e0b8ff',rock:'#70508b'}
];
const hero={},assets={cape:'hero_cape',left:'hero_jump_left',right:'hero_jump_right'};
for(const [key,filename] of Object.entries(assets)){const img=new Image();img.onload=()=>draw();img.src='assets/'+filename+'.webp';hero[key]=img;}
const cached={};let selected='perfect',sim=null,idx=0,playing=false,rate=4,raf=0,realLast=0,playTime=0;
const fmt=t=>{t=Math.floor(t);return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;};
const depthFmt=d=>Math.floor(d/10).toLocaleString('ko-KR');
function updatePlayButton(){const b=$('toggle');b.textContent=playing?'Ⅱ 일시정지':'▶ 재생';}
function seekToTime(t){const fs=sim.frames;let lo=0,hi=fs.length-1;t=Math.max(0,Math.min(fs[hi].t,t));while(lo<hi){let mid=(lo+hi+1)>>1;if(fs[mid].t<=t)lo=mid;else hi=mid-1;}idx=lo;playTime=t;update();}
function jumpDepth(depth){const frames=sim.frames;if(depth>sim.endDepth){return;}let lo=0,hi=frames.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(frames[mid].depth<depth)lo=mid+1;else hi=mid;}idx=lo;playTime=frames[idx].t;update();}
function load(profile){selected=profile;sim=cached[profile]||(cached[profile]=core.simulate(profile));idx=0;playTime=0;playing=false;realLast=0;
 $('scenario').value=selected;$('scenarioDesc').textContent=sim.info.description;
 $('timeline').max=sim.frames.length-1;$('result').textContent=sim.won?'🏆 클리어 가능':'⚠ '+sim.reason;
 $('result').style.color=sim.won?'#7debd4':'#ffc08d';
 document.querySelectorAll('#zones button').forEach((b,i)=>{b.disabled=core.BOUNDS[i]>sim.endDepth;});
 updatePlayButton();update();
}
function update(){if(!sim)return;const f=sim.frames[idx],total=sim.frames.at(-1).t;
 $('status').textContent=idx>=sim.frames.length-1?(sim.won?'최종 클리어!':'자동 플레이 실패'):(playing?'AI 자동 플레이 중':'재생 일시정지');
 $('zoneTitle').textContent=String(f.zone+1).padStart(2,'0')+' / 07 · '+core.ZONES[f.zone];
 $('depth').textContent=depthFmt(f.depth);
 $('remain').innerHTML=f.time.toFixed(1)+'<small>초</small>'; $('remain').style.color=f.time<3?'#ff8881':'#a9f0e3';
 $('speed').textContent='속도 '+Math.round(f.speed).toLocaleString('ko-KR')+' m/s';
 $('coinCount').textContent=f.coins.toLocaleString('ko-KR'); $('clockCount').textContent=f.clocks;
 $('missed').textContent=f.missed;
 $('taps').innerHTML=sim.info.rates[f.zone].toFixed(1)+' <small>회/초</small>';
 $('played').innerHTML=fmt(f.t)+' <small>/ '+fmt(total)+'</small>';
 $('clock').textContent=fmt(f.t)+' / '+fmt(total);
 $('timeline').value=idx;
 $('event').textContent=f.event;
 $('event').style.color=f.eventKind==='crash'||f.eventKind==='time'?'#ff8a86':'#f0c892';
 $('endBanner').classList.toggle('hidden',idx!==sim.frames.length-1);
 $('endTitle').textContent=sim.won?'🏆 최종 클리어!':'도전 실패';
 $('endText').textContent=sim.won?'총 '+fmt(total)+' · 최고속도여도 8분 이상 소요':sim.reason+' · 심도 '+depthFmt(f.depth);
 document.querySelectorAll('#zones button').forEach((b,i)=>b.classList.toggle('active',f.zone===i));
 $('zoneProgress').innerHTML=Array.from({length:7},(_,z)=>{const a=core.BOUNDS[z],b=core.BOUNDS[z+1],percent=Math.max(0,Math.min(100,100*(f.depth-a)/(b-a)));return `<div title="${z+1}구역 진행률 ${percent.toFixed(0)}%"><span style="width:${percent}%"></span></div>`;}).join('');
 draw();}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function disk(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function poly(points,color){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();}
function text(t,x,y,font,color,align='center'){ctx.font=font;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(t,x,y);}
function lowerBound(array,d){let lo=0,hi=array.length;while(lo<hi){let m=(lo+hi)>>1;if(array[m].depth<d)lo=m+1;else hi=m;}return lo;}
function drawWorld(f){const p=palettes[f.zone],W=400,H=668, scroll=f.depth;
 const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,p.sky);grad.addColorStop(.6,'#111d2b');grad.addColorStop(1,p.sky);rect(0,0,W,H,grad);
 const halo=ctx.createRadialGradient(200,320,10,200,330,260);halo.addColorStop(0,p.glow+'32');halo.addColorStop(1,p.glow+'00');rect(0,0,W,H,halo);
 const units=Math.max(2200,f.speed*3.3),ppm=650/units;
 const shift=(scroll*ppm*.32)%120;
 for(let side=0;side<2;side++){
  ctx.save();if(side)ctx.translate(400,0),ctx.scale(-1,1);
  poly([[0,0],[84,0],...Array.from({length:17},(_,i)=>[77+Math.sin(i*1.71+scroll*.00003)*12,i*48-25]),[90,H],[0,H]],p.wall);
  for(let i=-3;i<19;i++){let y=i*56-(shift%56),x=60+Math.sin(i*.7+scroll*.0001)*12;
   poly([[5,y+8],[x,y-8],[73,y+13],[18,y+41]],i%3===0?p.rock:'#24304280');
   ctx.strokeStyle=p.accent+'72';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(8,y+8);ctx.lineTo(x,y-8);ctx.lineTo(72,y+13);ctx.stroke();
  }
  ctx.restore();
 }
 // Sparse parallax debris; deterministic for arbitrary timeline seeks.
 for(let i=0;i<40;i++){const worldY=i*191+((i*41)%97),y=((worldY-scroll*.18)%780+780)%780-65;
  const x=94+((i*73)%213);disk(x,y,1.2+(i%4),p.glow+(i%3===0?'66':'28'));
 }
 // Spatial items. Draw in travel order with actual simulation depths.
 const center=254,minD=scroll-(center+90)/ppm,maxD=scroll+(H-center+90)/ppm;
 const drawObjects=(arr,fun)=>{for(let j=lowerBound(arr,minD);j<arr.length&&arr[j].depth<=maxD;j++){let obj=arr[j];if(obj.depth<scroll)continue;fun(obj,center+(obj.depth-scroll)*ppm);}};
 drawObjects(core.WORLD.hazards,(o,y)=>drawHazard(o,y,p));
 drawObjects(core.WORLD.clocks,(o,y)=>drawClock(o,y));
 drawObjects(core.WORLD.coins,(o,y)=>drawCoin(o,y,f.t));
 // Rushing air stays separate from the independent storm gauge.
 if(f.boost>.18){ctx.strokeStyle='rgba(160,220,247,'+(.06+.25*f.boost)+')';ctx.lineWidth=1.7;for(let i=0;i<8;i++){
  const side=i%2?-1:1,x=200+side*(83+i*2),y=190+i*22;
  ctx.beginPath();ctx.moveTo(x,y+75);ctx.quadraticCurveTo(x+side*18,y+20,x+side*8,y-30);ctx.stroke();}}
 drawHero(f);drawStorm(f);
 // Horizon depth line at each section boundary.
 for(let j=1;j<7;j++){const d=core.BOUNDS[j];if(d<minD||d>maxD)continue;const y=center+(d-scroll)*ppm;
  ctx.strokeStyle='#d7f9f988';ctx.setLineDash([8,6]);ctx.beginPath();ctx.moveTo(83,y);ctx.lineTo(315,y);ctx.stroke();ctx.setLineDash([]);text('▼ '+(j+1)+'구역',200,y-15,'700 13px sans-serif','#e4fdf4');}
}
function drawClock(o,y){const x=o.wall==='L'?115:285;
 disk(x,y,28,'#5ceadd18');disk(x,y,21,'#aafbec44');disk(x,y,15,'#c3f7e8');disk(x,y,12,'#1a675f');
 ctx.strokeStyle='#edfff5';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-7);ctx.moveTo(x,y);ctx.lineTo(x+6,y+3);ctx.stroke();
}
function drawCoin(o,y,t){const x=o.wall==='L'?115:285,w=10+Math.abs(Math.sin(t*3+o.id))*.9;
 disk(x,y,20,'#ffc75822');ctx.fillStyle='#d88b25';ctx.beginPath();ctx.ellipse(x,y,w+3,13,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffd977';ctx.beginPath();ctx.ellipse(x,y,w,11,0,0,Math.PI*2);ctx.fill();text('★',x,y+1,'900 13px sans-serif','#9f5512');}
function drawHazard(o,y,p){const left=o.wall==='L',x=left?81:319,dir=left?1:-1;
 poly([[x,y-33],[x+dir*26,y-24],[x+dir*38,y],[x+dir*58,y+5],[x+dir*22,y+27],[x,y+35]],'#1c1622');
 poly([[x,y-28],[x+dir*20,y-18],[x+dir*49,y+3],[x+dir*23,y+17],[x,y+28]],p.rock);
 ctx.strokeStyle=p.glow;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-28);ctx.lineTo(x+dir*19,y-16);ctx.lineTo(x+dir*50,y+3);ctx.stroke();}
function drawHero(f){const x=400*(f.wall==='L'?.29:.71),y=254+Math.sin(f.t*11)*2.2;
 ctx.save();ctx.shadowColor='#070c15';ctx.shadowBlur=20;
 const hopping=f.hopProgress<1,im=hopping?hero[f.fromWall==='L'?'left':'right']:hero.cape;
 if(im?.complete&&im.naturalWidth){
  if(hopping){ctx.drawImage(im,x-76,y-77,152,152);}else{
    const iw=im.naturalWidth,ih=im.naturalHeight,fold=f.boost;
    const sideNom=iw*.28,side=sideNom*(1-.62*fold),center=iw*.44,total=side*2+center,scale=169/iw;
    ctx.translate(x-total*scale/2,y-86);
    ctx.drawImage(im,0,0,sideNom,ih,0,0,side*scale,169);
    ctx.drawImage(im,sideNom,0,center,ih,side*scale,0,center*scale,169);
    ctx.drawImage(im,iw-sideNom,0,sideNom,ih,(side+center)*scale,0,side*scale,169);
  }
 }else{disk(x,y,40,'#d5a0e7');disk(x,y-20,26,'#ffd3a3');}
 ctx.restore();
}
function drawStorm(f){const x=364,by=550,h=220,g=f.boost;
 text('STORM',x,by-h-17,'700 10px sans-serif','#c4e0f0');
 ctx.strokeStyle='#83d7ef55';ctx.strokeRect(x-17,by-h,34,h);
 // Tornado bottom tip stays fixed; top rises continuously with boost.
 const height=10+g*(h-19),head=by-height;
 ctx.save();ctx.beginPath();ctx.rect(x-15,by-h+1,30,h-2);ctx.clip();
 for(let k=0;k<14;k++){const v=k/13,y=by-v*height,wide=2+g*12*Math.pow(v,.75);
  const angle=f.t*(5+g*15)+v*21,dx=Math.cos(angle)*wide;
  ctx.strokeStyle=`rgba(112,228,242,${.25+g*.6})`;ctx.lineWidth=1.2+g*.6;
  ctx.beginPath();ctx.ellipse(x+dx*.17,y,Math.max(2,wide),Math.max(1.5,wide*.35),angle*.07,0,Math.PI*2);ctx.stroke();
 }
 disk(x,by,3.6,'#9aeeed');ctx.restore();
 text(Math.round(g*100)+'%',x,by+15,'700 10px sans-serif','#e0f7f2');
}
function draw(){if(!sim)return;ctx.setTransform(2,0,0,2,0,0);drawWorld(sim.frames[idx]);}
function frame(now){if(!playing)return;if(!realLast)realLast=now;const dt=Math.min(100,(now-realLast))/1000;realLast=now;playTime+=dt*rate;
 if(playTime>=sim.frames.at(-1).t){playTime=sim.frames.at(-1).t;playing=false;updatePlayButton();}
 seekToTime(playTime);if(playing)raf=requestAnimationFrame(frame);}
function pause(){playing=false;cancelAnimationFrame(raf);realLast=0;updatePlayButton();}
function toggle(){if(playing){pause();return;}if(idx>=sim.frames.length-1)seekToTime(0);playing=true;realLast=0;updatePlayButton();raf=requestAnimationFrame(frame);}
function makeZones(){const div=$('zones');core.ZONES.forEach((name,i)=>{let b=document.createElement('button');b.type='button';b.innerHTML=`<strong>${i+1}구역</strong><span>${depthFmt(core.BOUNDS[i])}부터</span>`;
 b.title=name;b.addEventListener('click',()=>{pause();jumpDepth(core.BOUNDS[i]);});div.append(b);});}
makeZones();$('scenario').addEventListener('change',e=>{pause();load(e.target.value);});$('toggle').addEventListener('click',toggle);
$('timeline').addEventListener('input',e=>{pause();idx=+e.target.value;playTime=sim.frames[idx].t;update();});
$('jumpStart').addEventListener('click',()=>{pause();seekToTime(0);});
$('back').addEventListener('click',()=>{pause();seekToTime(playTime-10);});
$('forward').addEventListener('click',()=>{pause();seekToTime(playTime+10);});
$('rate').addEventListener('change',e=>{rate=+e.target.value;});
window.addEventListener('keydown',e=>{if(e.code==='Space'&&document.activeElement?.tagName!=='SELECT'){e.preventDefault();toggle();}else if(e.code==='ArrowLeft'){pause();seekToTime(playTime-10);}else if(e.code==='ArrowRight'){pause();seekToTime(playTime+10);}});
load('perfect');
window.HellSimDebug={current:()=>sim,seek:seekToTime,setScenario:load,play:toggle};
})();