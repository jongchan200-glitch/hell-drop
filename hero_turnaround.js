/* Hell Fall WEB 1.0 test: original character rebuilt as four clean illustrated
   directions. This is a temporary multi-view preview, NOT a rigged 3D model.
   Old WEB 0.9 WebGL sculpt remains safely in Git history.
   The game, account, coins, settings and audio are not changed by this viewer. */
(function () {
  'use strict';
  const SOURCES = {
    front: 'assets/turn_front.webp?v=10a',
    threequarter: 'assets/turn_threequarter.webp?v=10a',
    side: 'assets/turn_side.webp?v=10a',
    back: 'assets/turn_back.webp?v=10a'
  };
  const VIEWS = [
    {at:0,src:'front',flip:false,title:'정면'},
    {at:45,src:'threequarter',flip:false,title:'오른쪽 사선'},
    {at:90,src:'side',flip:false,title:'오른쪽 옆모습'},
    {at:180,src:'back',flip:false,title:'뒷모습'},
    {at:270,src:'side',flip:true,title:'왼쪽 옆모습(반전)'},
    {at:315,src:'threequarter',flip:true,title:'왼쪽 사선(반전)'}
  ];
  function mount(actor,opts={}) {
    if (!actor) return null;
    const isHome = opts.isHome || (()=>true);
    let target=45, actual=45, dragging=null, lastX=0, totalMove=0;
    let currentView=-1, raf=0, disposed=false, active=false;
    const stage=document.createElement('div');
    stage.className='turnaround-stage'; stage.setAttribute('aria-hidden','true');
    const sprites=VIEWS.map(v=>{
      const img=document.createElement('img'); img.className='turnaround-pose';
      img.src=SOURCES[v.src]; img.alt=''; img.draggable=false;
      if(v.flip)img.classList.add('turnaround-mirror');
      stage.appendChild(img); return img;
    });
    const keep=actor.querySelector('#lobbyTurn');
    const canvas=actor.querySelector('#lobby3dCanvas');
    if(canvas)canvas.hidden=true;
    actor.insertBefore(stage,keep||null);

    function wrap(d){return ((d%360)+360)%360;}
    function closestView(deg){
      let best=0,bestDist=Infinity;
      for(let i=0;i<VIEWS.length;i++){
        const diff=Math.abs(wrap(deg-VIEWS[i].at+180)-180);
        if(diff<bestDist){bestDist=diff;best=i;}
      }
      return best;
    }
    function show(i){
      if(i===currentView)return;
      currentView=i;
      sprites.forEach((img,n)=>img.classList.toggle('is-selected',n===i));
    }
    function label(){
      const d=Math.round(wrap(target));
      actor.setAttribute('aria-valuenow',String(d));
      actor.setAttribute('aria-valuetext',VIEWS[closestView(d)].title);
    }
    function frame(){
      if(disposed)return;
      if(isHome()&&active){
        if(dragging===null)actual+=(target-actual)*0.27;
        else actual=target;
        show(closestView(actual));
      }
      raf=requestAnimationFrame(frame);
    }
    const end=e=>{
      if(dragging!==e.pointerId)return;
      dragging=null;actor.classList.remove('is-dragging');
      if(actor.hasPointerCapture?.(e.pointerId))actor.releasePointerCapture(e.pointerId);
      if(totalMove<7)target+=22.5;
      label();
    };
    actor.addEventListener('pointerdown',e=>{
      if(!active||!isHome()||(e.pointerType==='mouse'&&e.button!==0))return;
      dragging=e.pointerId;lastX=e.clientX;totalMove=0;
      actor.classList.add('is-dragging');
      actor.setPointerCapture?.(e.pointerId);
    });
    actor.addEventListener('pointermove',e=>{
      if(dragging!==e.pointerId)return;
      let dx=e.clientX-lastX;lastX=e.clientX;
      totalMove+=Math.abs(dx);target+=dx*180/165;
      if(totalMove>2&&e.cancelable)e.preventDefault();
      actual=target;show(closestView(actual));label();
    });
    actor.addEventListener('pointerup',end);
    actor.addEventListener('pointercancel',end);
    actor.addEventListener('keydown',e=>{
      if(!isHome()||!active)return;
      if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){
        e.preventDefault();
        target=e.key==='Home'?45:target+(e.key==='ArrowLeft'?-15:15);
        label();
      }
    });
    Promise.all(Object.values(SOURCES).map(src=>new Promise((resolve,reject)=>{
      const img=new Image();img.onload=resolve;img.onerror=()=>reject(Error(src));img.src=src;
    }))).then(()=>{
      if(disposed)return;
      active=true;
      actor.classList.add('is-turnaround-ready');
      show(1);label();
      window.HellFall3DStatus={ready:true,model:'four-view-illustration',true3D:false,rotation:'360-degree direction preview',views:4};
    }).catch(err=>{
      console.warn('Character art unavailable. Original portrait remains.',err);
      if(canvas)canvas.hidden=true;
      window.HellFall3DStatus={ready:false,model:'four-view-illustration',error:String(err)};
    });
    label();raf=requestAnimationFrame(frame);
    return {setYaw(deg){target=Number(deg)||0;label();},getYaw:()=>actual*Math.PI/180,dispose(){disposed=true;cancelAnimationFrame(raf);}};
  }
  window.HellFallLobby3D={mount};
})();
