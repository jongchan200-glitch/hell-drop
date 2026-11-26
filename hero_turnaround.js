/* Hell Fall WEB 1.6 — selectable heroine/hero, keep original hero pose unchanged.
   Only the original heroine has an approved rear illustration. Do not fake
   the new boy's rear by mirroring his face or claiming a 3D rotation. */
(function(){
  'use strict';
  const VIEW_SETS={
    starter_boy:{name:'초보 탐험가 (남)',front:'assets/starter_boy_portrait.webp?v=28-full-body',back:null,actor:'uiji',starter:true},
    starter_girl:{name:'초보 탐험가 (여)',front:'assets/starter_girl_portrait.webp?v=28-full-body',back:null,actor:'useoi',starter:true},
    useoi:{name:'우서',front:'assets/hero_intro.webp?v=11-frontback',back:'assets/hero_back_fixed.webp?v=12-backfix'},
    uiji:{name:'우지',front:'assets/uiji_intro.webp?v=16-uiji',back:null}
  };
  function mount(actor,opts={}){
    if(!actor)return null;
    const isHome=opts.isHome||(()=>true);
    const stage=document.createElement('div');
    stage.className='turnaround-stage';stage.setAttribute('aria-hidden','true');
    const images={};
    for(const side of ['front','back']){
      const img=document.createElement('img');
      img.className='turnaround-pose';img.alt='';img.draggable=false;
      stage.appendChild(img);images[side]=img;
    }
    const old=actor.querySelector('#lobbyTurn');
    const canvas=actor.querySelector('#lobby3dCanvas');
    if(canvas)canvas.hidden=true;
    actor.insertBefore(stage,old||null);
    let character='starter_boy',side='front',active=false,held=null,startX=0,startY=0,disposed=false;
    const tip=document.querySelector('.character-turn-tip');
    function show(next){
      const v=VIEW_SETS[character];
      side=next==='back'&&v.back?'back':'front';
      images.front.classList.toggle('is-selected',side==='front');
      images.back.classList.toggle('is-selected',side==='back');
      actor.setAttribute('aria-label',v.back?
        v.name+' '+(side==='front'?'정면':'뒷모습')+'. 좌우로 밀어 앞뒷모습 전환':
        v.name+' 정면 일러스트. 뒷모습은 준비 중');
      actor.setAttribute('aria-pressed',String(side==='back'));
      actor.dataset.characterSide=side;
    }
    function setCharacter(id){
      if(disposed)return;
      character=VIEW_SETS[id]?id:'starter_boy';
      const v=VIEW_SETS[character];
      images.front.src=v.front;
      images.back.src=v.back||v.front;
      if(v.starter)window.HellStarterSkin?.preview(v.front,v.actor,url=>{
        if(!disposed&&character===id){images.front.src=url;images.back.src=url;}
      });
      if(tip)tip.textContent=v.back?'‹ 좌우로 밀어 앞·뒷모습 바꾸기 ›':v.starter?'✦ 기본 복장 · 원본 얼굴 유지':'✦ 정면 미리보기 · 뒷모습 준비 중';
      show('front');
      // Keep the original fallback visible while a new artwork is loading.
      const preload=new Image();
      preload.onload=()=>{
        if(disposed||VIEW_SETS[character].front!==v.front)return;
        active=true;actor.classList.add('is-turnaround-ready');show('front');
      };
      preload.onerror=()=>console.warn('Character artwork unavailable: '+v.front);
      preload.src=v.front;
    }
    function finish(e,commit){
      if(held!==e.pointerId)return;
      const dx=e.clientX-startX,dy=e.clientY-startY;
      held=null;actor.classList.remove('is-dragging');
      if(actor.hasPointerCapture?.(e.pointerId))actor.releasePointerCapture(e.pointerId);
      if(commit&&VIEW_SETS[character].back&&Math.abs(dx)>=32&&Math.abs(dx)>Math.abs(dy)*1.15)
        show(side==='front'?'back':'front');
    }
    actor.addEventListener('pointerdown',e=>{
      if(disposed||!active||!isHome()||!VIEW_SETS[character].back||(e.pointerType==='mouse'&&e.button!==0))return;
      held=e.pointerId;startX=e.clientX;startY=e.clientY;
      actor.classList.add('is-dragging');actor.setPointerCapture?.(e.pointerId);
    });
    actor.addEventListener('pointerup',e=>finish(e,true));
    actor.addEventListener('pointercancel',e=>finish(e,false));
    actor.addEventListener('keydown',e=>{
      if(disposed||!active||!isHome()||!VIEW_SETS[character].back)return;
      if(['ArrowLeft','ArrowRight','Enter',' '].includes(e.key)){
        e.preventDefault();e.stopPropagation();show(side==='front'?'back':'front');
      }else if(e.key==='Home'){e.preventDefault();show('front');}
    });
    setCharacter(opts.initial||'starter_boy');
    window.HellFall3DStatus={ready:true,true3D:false,model:'selectable-front-and-approved-back',rotation:'swipe toggle (useoi only)'};
    return {
      setCharacter,
      setYaw(deg){if(active&&VIEW_SETS[character].back)show(((Number(deg)%360+360)%360)>=90&&((Number(deg)%360+360)%360)<270?'back':'front');},
      getYaw:()=>side==='back'?Math.PI:0,
      getCharacter:()=>character,
      dispose(){disposed=true;held=null;stage.remove();}
    };
  }
  window.HellFallLobby3D={mount};
})();
