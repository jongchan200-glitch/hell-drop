'use strict';
(()=>{
const $=id=>document.getElementById(id),canvas=$('preview'),ctx=canvas.getContext('2d');
const settings=[
 {id:'head',name:'캐릭터 머리 · 탈',options:[['boy','우이지','기본',0],['girl','우서이','기본',1],['frog','개구리 탈','교체',2],['cat','고양이 탈','교체',3]]},
 {id:'outfit',name:'의상',options:[['rogue','붉은 모험복','상의',4],['teal','청록 탐험복','상의',5]]},
 {id:'cape',name:'망토',options:[['red','별빛 망토','교체',10],['blue','바람 망토','교체',11],['none','착용 안 함','해제',null]]},
 {id:'bracelet',name:'손목 액세서리',options:[['gold','황금 팔찌','장착',null],['crystal','수정 팔찌','장착',null],['none','착용 안 함','해제',null]]},
 {id:'boots',name:'신발 · 부츠',options:[['gold','황금 장화','장착',8],['black','검은 장화','색상',9],['teal','청록 장화','색상',8]]},
 {id:'brooch',name:'가슴 장식',options:[['star','별 장식','장착',null],['crystal','수정 장식','장착',null],['none','착용 안 함','해제',null]]}
];
const defaults={head:'boy',outfit:'rogue',cape:'red',bracelet:'gold',boots:'gold',brooch:'star'};
const loadout={...defaults};let mode='normal',paused=false,direction='L',progress=0,elapsed=0,last=null,totalFrames=0;
function setText(){const head=settings[0].options.find(o=>o[0]===loadout.head)?.[1],out=settings[1].options.find(o=>o[0]===loadout.outfit)?.[1];$('outfitName').textContent=head+' · '+out;}
function buildUI(){const host=$('categories');host.innerHTML='';for(const group of settings){
 const section=document.createElement('section');section.className='category';
 section.innerHTML=`<div class="category-head"><b>${group.name}</b><small>${group.options.length}가지 선택</small></div>`;
 const grid=document.createElement('div');grid.className='choices';
 for(const [id,label,type,tile] of group.options){
 const button=document.createElement('button');button.type='button';button.dataset.group=group.id;button.dataset.item=id;
 button.className='choice'+(loadout[group.id]===id?' active':'');button.setAttribute('aria-pressed',loadout[group.id]===id?'true':'false');
 const pic=document.createElement('span');pic.className='mini'+(tile===null?' no-image':'');
 if(tile!==null){pic.style.backgroundPosition=`${(tile%4)/3*100}% ${Math.floor(tile/4)/2*100}%`}
 else pic.textContent=id==='none'?'×':id==='crystal'?'◆':'✦';
 button.append(pic);
 const strong=document.createElement('strong');strong.textContent=label;button.append(strong);
 const sm=document.createElement('small');sm.textContent=type;button.append(sm);
 button.addEventListener('click',()=>{loadout[group.id]=id;buildUI();setText()});grid.append(button);
 }section.append(grid);host.append(section);
 }
}
function resize(){const d=Math.min(2,window.devicePixelRatio||1),r=canvas.getBoundingClientRect();const w=Math.max(300,Math.round(r.width*d)),h=Math.max(350,Math.round(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(w/r.width,0,0,h/r.height,0,0)}
function bg(w,h,t){const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#241b30');g.addColorStop(.55,'#25243a');g.addColorStop(1,'#121825');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 const center=ctx.createRadialGradient(w*.52,h*.40,12,w*.52,h*.48,w*.45);center.addColorStop(0,'#d18a6242');center.addColorStop(.56,'#76495e18');center.addColorStop(1,'#00000000');ctx.fillStyle=center;ctx.fillRect(0,0,w,h);
 for(const side of [-1,1]){const edge=side<0?0:w;ctx.fillStyle='#423445';ctx.beginPath();ctx.moveTo(edge,0);for(let j=0;j<=10;j++){const yy=j/10*h;const xx=side<0?36+Math.sin(j*2.14)*9:w-36-Math.sin(j*2.14)*9;ctx.lineTo(xx,yy)}ctx.lineTo(edge,h);ctx.closePath();ctx.fill();
 ctx.beginPath();ctx.moveTo(side<0?36:w-36,0);for(let j=1;j<=12;j++){let yy=h*j/12;let x=(side<0?30:w-30)+side*11*Math.sin(j*2.7);ctx.lineTo(x,yy)}ctx.strokeStyle='#c68d776e';ctx.lineWidth=4;ctx.stroke()}
 ctx.save();ctx.strokeStyle='#f6ba7b30';ctx.lineCap='round';for(let i=0;i<24;i++){const x=(i*89+17)%(w-44)+22,y=(i*97+(t*85)%(h+90))%(h+100)-50;ctx.globalAlpha=.18+(i%4)*.11;ctx.lineWidth=1.5+i%3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,y-10);ctx.stroke()}ctx.restore();}
function frame(ts){if(last===null)last=ts;const dt=Math.min(.07,(ts-last)/1000);last=ts;if(!paused){elapsed+=dt;totalFrames++;if(mode==='jump'){progress=(elapsed*.43)%1}else{progress=0}}
resize();const r=canvas.getBoundingClientRect(),w=r.width,h=r.height;ctx.clearRect(0,0,w,h);bg(w,h,elapsed);
 const size=Math.min(.79,w/480,h/560),jump=mode==='jump',fromLeft=direction==='L';
 const eased=jump?((progress<.20?0:progress>.81?1:(p=>p*p*(3-2*p))((progress-.20)/.61))):0;
 const cx=jump?(fromLeft?lerp(w*.29,w*.71,eased):lerp(w*.71,w*.29,eased)):w*.50;
 const cy=h*.60-(jump?Math.sin(progress*Math.PI)*26:0);
 const pose=window.HellRigV4?.draw(ctx,{x:cx,y:cy,scale:size,mode,progress,time:elapsed,from:direction,wallX:fromLeft?w*.11:w*.89,look:loadout});
 if(jump&&progress>.16&&progress<.34){ctx.save();ctx.globalAlpha=Math.max(0,1-Math.abs(progress-.24)/.1);ctx.strokeStyle='#ffe4a7';ctx.lineWidth=3;const wx=fromLeft?w*.11:w*.89;const cy0=cy+size*55;ctx.beginPath();ctx.arc(wx,cy0,14+(progress-.16)*75,0,Math.PI*2);ctx.stroke();ctx.restore()}
 $('stageStatus').textContent=pose?.label||'그림 불러오는 중';$('frames').textContent=jump?Math.round(progress*100)+'% 진행 · 공통 관절 모션':'모든 장착 조합 · 같은 애니메이션';
 if(!paused&&mode==='jump'){$('stepRange').value=Math.round(progress*100);$('stepText').textContent=Math.round(progress*100)+'%'}
 requestAnimationFrame(frame)}
function selectMode(next){mode=next;elapsed=0;progress=0;paused=false;$('playPause').textContent='일시정지';document.querySelectorAll('[data-motion]').forEach(b=>b.classList.toggle('active',b.dataset.motion===mode));}
document.querySelectorAll('[data-motion]').forEach(b=>b.addEventListener('click',()=>selectMode(b.dataset.motion)));
$('stepRange').addEventListener('input',e=>{if(mode!=='jump')selectMode('jump');paused=true;$('playPause').textContent='재생';progress=Number(e.target.value)/100;$('stepText').textContent=e.target.value+'%'});
$('playPause').addEventListener('click',()=>{paused=!paused;$('playPause').textContent=paused?'재생':'일시정지'});
$('flipDir').addEventListener('click',()=>{direction=direction==='L'?'R':'L';$('flipDir').textContent=direction==='L'?'왼쪽 벽에서 점프':'오른쪽 벽에서 점프'});
$('resetLook').addEventListener('click',()=>{Object.assign(loadout,defaults);setText();buildUI()});
function lerp(a,b,t){return a+(b-a)*t}
$('comboCount').textContent=settings.reduce((v,g)=>v*g.options.length,1).toLocaleString('ko-KR')+' 조합';buildUI();setText();requestAnimationFrame(frame);
window.RigV4Test={state:()=>({look:{...loadout},mode,progress,paused,atlasReady:!!window.HellRigV4?.atlas?.naturalWidth,rendered:totalFrames}),setLook:(cat,value)=>{if(settings.find(g=>g.id===cat)?.options.some(o=>o[0]===value)){loadout[cat]=value;buildUI();setText();return true}return false},setMode:selectMode,seek:(q)=>{selectMode('jump');paused=true;progress=q},getPose:()=>window.HellRigV4?.getPose(mode,elapsed,progress,direction)};
})();
