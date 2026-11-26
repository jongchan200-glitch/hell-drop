'use strict';
/* WEB 2.9: the free characters now have complete-body hand-drawn artwork.
 * Do NOT recolor any premium artwork or paste original faces onto vector bodies.
 */
(function(){
  const portraits={
    uiji:'assets/starter_boy_portrait_v29.webp?v=29-full-body',
    useoi:'assets/starter_girl_portrait_v29.webp?v=29-full-body'
  };
  function preview(src,who,done){
    const path=portraits[who]||src;
    if(typeof done==='function')done(path);
    return path;
  }
  function refreshPreviews(root=document){
    root.querySelectorAll('img[data-starter-face]').forEach(img=>{
      const portrait=img.dataset.starterFace==='starter_boy'?portraits.uiji:portraits.useoi;
      if(!img.src.includes('starter_')||!img.src.includes('_portrait_v29.webp')){
        img.src=portrait;
      }
    });
  }
  window.HellStarterSkin={
    preview,refreshPreviews,
    getSprite:image=>image,
    portraitSprite:image=>image
  };
})();