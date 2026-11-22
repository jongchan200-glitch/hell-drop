/* Hell Fall WEB 1.1 — original heroine, FRONT/BACK ONLY.
   No 3D sculpt, no 4-view replacement, and no synthetic side profiles.
   Gameplay, storage, BGM and the original character art remain unchanged. */
(function(){
  'use strict';
  const SOURCES={
    front:'assets/hero_intro.webp?v=11-frontback',
    back:'assets/hero_back_fixed.webp?v=12-backfix'
  };
  function mount(actor,opts={}){
    if(!actor)return null;
    const isHome=opts.isHome||(()=>true);
    const stage=document.createElement('div');
    stage.className='turnaround-stage';stage.setAttribute('aria-hidden','true');
    const images={};
    for(const [side,src] of Object.entries(SOURCES)){
      const img=document.createElement('img');
      img.className='turnaround-pose';
      img.src=src;img.alt='';img.draggable=false;
      stage.appendChild(img);images[side]=img;
    }
    const old=actor.querySelector('#lobbyTurn');
    const canvas=actor.querySelector('#lobby3dCanvas');
    if(canvas)canvas.hidden=true;
    actor.insertBefore(stage,old||null);
    let side='front',active=false,held=null,startX=0,startY=0,disposed=false;
    function show(next){
      side=next==='back'?'back':'front';
      images.front.classList.toggle('is-selected',side==='front');
      images.back.classList.toggle('is-selected',side==='back');
      actor.setAttribute('aria-label','우서이 '+(side==='front'?'정면':'뒷모습')+'. 좌우로 밀어 앞뒷모습 전환');
      actor.setAttribute('aria-pressed',String(side==='back'));
      actor.dataset.characterSide=side;
    }
    function finish(e,commit){
      if(held!==e.pointerId)return;
      const dx=e.clientX-startX,dy=e.clientY-startY;
      held=null;
      actor.classList.remove('is-dragging');
      if(actor.hasPointerCapture?.(e.pointerId))actor.releasePointerCapture(e.pointerId);
      if(commit&&Math.abs(dx)>=32&&Math.abs(dx)>Math.abs(dy)*1.15){
        show(side==='front'?'back':'front');
      }
    }
    actor.addEventListener('pointerdown',e=>{
      if(disposed||!active||!isHome()||(e.pointerType==='mouse'&&e.button!==0))return;
      held=e.pointerId;startX=e.clientX;startY=e.clientY;
      actor.classList.add('is-dragging');
      actor.setPointerCapture?.(e.pointerId);
    });
    actor.addEventListener('pointerup',e=>finish(e,true));
    actor.addEventListener('pointercancel',e=>finish(e,false));
    actor.addEventListener('keydown',e=>{
      if(disposed||!active||!isHome())return;
      if(['ArrowLeft','ArrowRight','Enter',' '].includes(e.key)){
        e.preventDefault();e.stopPropagation();show(side==='front'?'back':'front');
      }else if(e.key==='Home'){
        e.preventDefault();show('front');
      }
    });
    show('front');
    Promise.all(Object.values(SOURCES).map(src=>new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve();
      image.onerror=()=>reject(Error('Cannot load original character '+src));
      image.src=src;
    }))).then(()=>{
      if(disposed)return;
      active=true;
      actor.classList.add('is-turnaround-ready');
      show('front');
      window.HellFall3DStatus={ready:true,true3D:false,model:'original-front-back',views:2,rotation:'swipe toggle'};
    }).catch(err=>{
      console.warn('Original character back artwork not loaded; preserve original front.',err);
      window.HellFall3DStatus={ready:false,true3D:false,model:'original-front-back',error:String(err)};
    });
    return {
      setYaw(deg){if(active)show(((Number(deg)%360+360)%360)>=90&&((Number(deg)%360+360)%360)<270?'back':'front');},
      getYaw:()=>side==='back'?Math.PI:0,
      dispose(){disposed=true;held=null;stage.remove();}
    };
  }
  window.HellFallLobby3D={mount};
})();
