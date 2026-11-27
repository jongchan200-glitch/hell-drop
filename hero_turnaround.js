'use strict';
/* Single portrait node; all front artwork comes from the skin catalog.
   Preload first, then commit only the newest request. No old fallback layer. */
(function(){
  function mount(actor,opts={}){
    const img=actor.querySelector('#lobbyHero'),tip=document.querySelector('.character-turn-tip');
    const isHome=opts.isHome||(()=>true);
    let character=null,side='front',generation=0,held=null,ready=false,startX=0,startY=0;
    const skin=()=>window.HellSystems.SKIN_CATALOG.find(c=>c.id===character);
    const back=()=>character==='useoi'?'assets/hero_back_fixed.webp':null;
    function show(request){
      const c=skin();if(!c)return;
      const token=++generation;
      const next=request==='back'&&back()?'back':'front';
      const url=next==='back'?back():c.front;
      ready=false;img.hidden=true;actor.dataset.characterSide=next;
      const preload=new Image();
      preload.onload=()=>{
        if(token!==generation)return;
        img.src=url;img.hidden=false;side=next;ready=true;
        actor.setAttribute('aria-label',c.name+' '+(side==='front'?'정면':'뒷모습'));
        actor.setAttribute('aria-pressed',String(side==='back'));
      };
      preload.onerror=()=>{if(token===generation){ready=false;img.hidden=true;actor.setAttribute('aria-label','캐릭터 이미지 로딩 실패');}};
      preload.src=url;
    }
    function setCharacter(id){
      if(!window.HellSystems.SKIN_CATALOG.some(c=>c.id===id))return;
      if(id===character&&ready&&side==='front')return;
      character=id;held=null;
      if(tip)tip.textContent=back()?'‹ 좌우로 밀어 앞·뒷모습 바꾸기 ›':skin().starter?'✦ 기본 복장 · 원형 참고':'✦ 정면 미리보기 · 뒷모습 준비 중';
      show('front');
    }
    function finish(e,commit){
      if(held!==e.pointerId)return;
      const dx=e.clientX-startX,dy=e.clientY-startY;held=null;
      if(actor.hasPointerCapture?.(e.pointerId))actor.releasePointerCapture(e.pointerId);
      if(commit&&back()&&Math.abs(dx)>=32&&Math.abs(dx)>Math.abs(dy)*1.15)show(side==='front'?'back':'front');
    }
    actor.addEventListener('pointerdown',e=>{
      if(!ready||!isHome()||!back()||(e.pointerType==='mouse'&&e.button!==0))return;
      held=e.pointerId;startX=e.clientX;startY=e.clientY;actor.setPointerCapture?.(e.pointerId);
    });
    actor.addEventListener('pointerup',e=>finish(e,true));
    actor.addEventListener('pointercancel',e=>finish(e,false));
    actor.addEventListener('keydown',e=>{
      if(!ready||!isHome()||!back())return;
      if(['ArrowLeft','ArrowRight','Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();show(side==='front'?'back':'front');}
      else if(e.key==='Home'){e.preventDefault();show('front');}
    });
    setCharacter(opts.initial||'starter_boy');
    return {setCharacter};
  }
  window.HellLobbyPortrait={mount};
})();