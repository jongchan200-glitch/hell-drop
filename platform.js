'use strict';
/* Shared browser / packaged Android WebView boundary. Keep persisted keys stable.
   No native JavaScript bridge or remote network dependency in the game. */
(function(){
  let nativePaused=false,last=document.hidden;
  const listeners=new Set();
  const isPaused=()=>nativePaused||document.hidden;
  function notify(){const p=isPaused();if(p===last)return;last=p;for(const fn of listeners)fn(p);}
  const storage={
    read(key){try{return localStorage.getItem(key)}catch(_){return null}},
    write(key,value){try{localStorage.setItem(key,value);return true}catch(_){return false}}
  };
  document.addEventListener('visibilitychange',notify);
  window.HellPlatform={storage,isPaused,onPauseChange(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    setNativePaused(value){nativePaused=!!value;notify();}};
})();