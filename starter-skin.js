'use strict';
/*
 * Starter-only art (V2).
 * The FREE outfit is a hand-drawn neutral outfit, composited under the
 * EXACT original face-and-hair pixels. Original premium sprites are untouched.
 * The original animated atlas remains active in the level; recoloring keeps
 * 36 distinct hand-drawn motion frames rather than a static puppet.
 */
(function(){
  const spriteCache=new WeakMap();
  const previews=new Map(),pending=new Map();
  const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
  const imageSize=im=>({w:im?.naturalWidth||im?.width||0,h:im?.naturalHeight||im?.height||0});
  // Do not mistake the bright RED cape for skin. Real skin has a much
  // higher green/red and blue/green ratio than saturated cape fabric.
  const skin=(r,g,b)=>r>g*1.08&&g>b*1.05&&r>130&&g>92&&b>65&&g>r*.57&&b>g*.55;
  function recolor(im,who){
    if(!im)return im;
    const {w,h}=imageSize(im);
    if(!w||!h)return im;
    let map=spriteCache.get(im);
    if(!map){map=new Map();spriteCache.set(im,map);}
    if(map.has(who))return map.get(who);
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const x=c.getContext('2d',{willReadFrequently:true});
    try{
      x.drawImage(im,0,0,w,h);
      const id=x.getImageData(0,0,w,h),p=id.data;
      const atlas=w===2304&&h===2304;
      for(let y=0;y<h;y++){
        const fy=atlas?(y%384)/384:y/h;
        for(let xx=0;xx<w;xx++){
          const j=(y*w+xx)*4;
          if(p[j+3]<38)continue;
          const fx=atlas?(xx%384)/384:xx/w;
          const r=p[j],g=p[j+1],b=p[j+2];
          const central=fx>.265&&fx<.735;
          const head=central&&fy<.44;
          if(head||skin(r,g,b))continue; // original face, hair and bare hands
          const bright=r*.35+g*.5+b*.15;
          const dark=Math.max(.38,Math.min(1.30,bright/95));
          const violet=r>g*1.12&&b>g*1.11&&b>42&&r>52;
          const red=r>94&&r>g*1.29&&r>b*1.22&&g<173;
          const outer=!central;
          const upper=fy>.36&&fy<.68;
          const lower=fy>=.68;
          const cape=(who==='uiji'?violet:red) && (outer || fy<.56);
          if(cape){
            // Preserve the ink outlines and light/shadow of the original cape.
            p[j]=clamp(190*dark);
            p[j+1]=clamp(141*dark);
            p[j+2]=clamp(93*dark);
          }else if(upper&&central&&fy>.48 && r<163&&g<163&&b<170){
            // Simple off-white T-shirt, tint the source folds rather than fill
            // the figure with a block that would remove the moving arms.
            const shade=Math.max(.42,Math.min(1.09,(bright+38)/132));
            p[j]=clamp(242*shade);
            p[j+1]=clamp(231*shade);
            p[j+2]=clamp(207*shade);
          }else if(lower&&central&&fy<.80&&r>110&&g>70&&b<140){
            // Original tan trousers become graphite shorts where visible.
            p[j]=clamp(70*dark);p[j+1]=clamp(63*dark);p[j+2]=clamp(72*dark);
          }else if(lower&&fy>.81&&r<130&&g<135&&b<150){
            // Blue slides / soles. Keep the original motion silhouette.
            p[j]=clamp(41*dark);p[j+1]=clamp(93*dark);p[j+2]=clamp(179*dark);
          }
        }
      }
      x.putImageData(id,0,0);
      // HTMLCanvasElement has no naturalWidth, but can be accepted by
      // existing drawImage calls and the fitted-helmet composer.
      map.set(who,c);return c;
    }catch(e){
      console.warn('[Starter] Animated sprite preserved',e);
      map.set(who,im);return im;
    }
  }
  const path=(s)=>new Path2D(s);
  function drawBody(ctx,who){
    ctx.save();ctx.scale(ctx.canvas.width/1000,ctx.canvas.height/1500);
    const line='#49362d';
    const gradient=(top,bottom)=>{const g=ctx.createLinearGradient(0,480,0,1440);
      g.addColorStop(0,top);g.addColorStop(1,bottom);return g;};
    function fill(s,color,stroke=line,width=11){
      ctx.beginPath();const p=path(s);ctx.fillStyle=color;ctx.fill(p);
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke(p);}
    }
    function stroke(s,color,w=9){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(path(s));}
    const offset=who==='useoi'?25:0;
    ctx.translate(offset,0);
    // Beige hand-tied sheet cape: behind the body.
    fill('M460 525 C310 560 205 630 122 808 C90 893 61 1081 92 1190 C142 1155 179 1193 226 1165 C275 1147 306 1197 365 1161 L502 922 L629 1160 C693 1192 736 1147 791 1175 C835 1151 860 1147 899 1188 C935 1013 880 759 785 641 C719 579 606 532 540 524Z',
      gradient('#e8ba82','#b98150'),'#6c4a33',13);
    stroke('M446 548 C333 710 237 903 196 1136','#99603c',14);
    stroke('M552 553 C670 724 790 940 824 1144','#9c653e',13);
    stroke('M485 553 C459 787 410 1017 350 1156','#ffe4ab',9);
    stroke('M542 551 C554 792 610 1000 680 1154','#f8d39a',9);
    // Legs extend below short shorts and stop at open-toed sandals.
    fill('M354 1007 C342 1102 340 1255 343 1354 C344 1392 430 1406 448 1356 L477 1017Z',
      gradient('#f9c89d','#e1a47f'),'#774c3e',9);
    fill('M520 1017 L546 1358 C554 1394 651 1390 653 1353 C665 1217 646 1097 632 1007Z',
      gradient('#f9c89d','#dc9b75'),'#774c3e',9);
    stroke('M424 1091 C398 1199 394 1289 401 1335','#ffe3bd',9);
    stroke('M575 1090 C600 1170 597 1293 600 1329','#ffe0b1',9);
    // Dark plain knee-length shorts, not cargo trousers.
    fill('M340 873 C376 856 449 873 501 879 C552 855 606 862 660 880 L678 1065 C630 1108 564 1098 519 1081 L500 1002 L469 1088 C425 1106 357 1091 323 1066Z',
      gradient('#514b53','#2b2931'),'#25232c',13);
    stroke('M502 889 L501 1000','#aaa0a1',6);
    stroke('M356 1039 Q417 1062 462 1055','#979096',6);
    stroke('M537 1055 Q602 1078 655 1043','#77727b',6);
    // Blue slip-on sandals with open toes. Draw sole before the strap.
    fill('M307 1365 Q337 1334 429 1355 Q468 1371 468 1423 Q425 1456 325 1436 Q297 1423 307 1365Z',
      '#1d376b','#182e51',10);
    fill('M530 1354 Q608 1328 680 1357 Q703 1392 687 1434 Q597 1453 537 1428 Q521 1390 530 1354Z',
      '#20427d','#132a50',10);
    fill('M321 1363 Q348 1339 421 1353 L442 1385 Q398 1415 320 1398Z','#2c69c5','#153c7e',8);
    fill('M540 1355 Q606 1333 673 1362 L671 1394 Q612 1411 539 1393Z','#3169be','#153b76',8);
    stroke('M325 1417 Q387 1442 455 1417','#7ca6e4',6);
    stroke('M543 1414 Q617 1435 680 1414','#78a5e1',6);
    // Arms are short sleeves; hand shape remains a neutral cartoon pose.
    fill('M359 597 C303 587 258 617 244 673 L184 894 Q181 937 223 947 C259 943 277 903 286 864 L383 734Z',
      '#edb788','#704b43',11);
    fill('M635 602 Q715 585 753 654 L816 898 Q826 944 787 953 Q743 941 726 878 L613 728Z',
      '#edb788','#704b43',11);
    fill('M340 588 Q288 583 269 634 Q243 679 281 730 L360 745 L417 637Z',
      '#f1e5d1','#857566',12);
    fill('M652 589 Q699 591 726 635 Q749 686 708 735 L633 746 L594 633Z',
      '#f2e6d2','#857566',12);
    stroke('M290 637 Q302 665 325 681','#ffffff',7);
    stroke('M704 637 Q685 674 663 688','#ffffff',7);
    // Torso: oversized cream short-sleeve shirt.
    fill('M411 532 Q502 517 594 531 Q645 552 670 629 Q654 719 660 867 Q591 904 501 888 Q398 907 340 873 L345 678 Q352 584 411 532Z',
      gradient('#fbf6e8','#dacdb6'),'#766b60',12);
    fill('M419 526 Q499 572 588 526 L558 585 Q500 607 451 583Z',
      '#e7cbb1','#877264',9);
    stroke('M374 740 Q420 756 451 745','#e3d3bb',7);
    stroke('M556 776 Q599 762 626 794','#c8bda5',6);
    stroke('M383 841 Q504 863 625 842','#b9aa94',8);
    // Neckerchief and cape knot: plain fabric, no giant fantasy clasp.
    fill('M434 517 Q481 497 503 535 Q528 500 576 520 Q555 554 518 565 Q491 590 468 563Z',
      '#d5a270','#795338',10);
    fill('M488 543 Q510 529 529 551 L524 587 L495 594 Q475 571 488 543Z',
      '#bd8453','#76482d',8);
    fill('M518 577 L546 657 L503 638 L493 592Z','#c79562','#805535',7);
    ctx.restore();
  }
  function drawFaceOriginal(ctx,img,who){
    const {w,h}=imageSize(img);
    if(!w||!h)return;
    const female=who==='useoi';
    ctx.save();ctx.scale(ctx.canvas.width/1000,ctx.canvas.height/1500);
    // Original pixels come straight from the shipped premium file, never
    // regenerated. Mask follows hair and chin; the rest is new basic outfit.
    const outline=female?
      'M268 -12 L650 -12 Q764 64 823 190 Q872 322 829 491 Q796 576 751 637 L703 650 Q681 598 673 533 Q634 491 598 475 Q546 492 487 484 Q403 476 365 453 Q306 483 290 582 L218 638 Q151 576 142 481 Q108 341 171 217 Q182 89 268 -12Z':
      'M242 -13 L687 -13 Q773 76 785 184 Q819 312 756 427 Q695 478 617 489 Q516 518 406 483 Q334 472 293 423 Q198 365 187 266 Q173 130 242 -13Z';
    ctx.clip(path(outline));
    ctx.drawImage(img,0,0,1000,1500);
    ctx.restore();
  }
  function portraitSprite(img,who){
    const {w,h}=imageSize(img);
    if(!w||!h)return img;
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const ctx=c.getContext('2d');
    drawBody(ctx,who);
    drawFaceOriginal(ctx,img,who);
    return c;
  }
  function preview(src,who,done){
    // A complete approved-style beginner portrait already includes its own clothes.
    // Never run the legacy premium-art overlay on that file.
    if(src.includes('starter_boy_original_face.webp')){done(src);return;}
    const key=src+'|'+who+'|outfit-v2';
    if(previews.has(key)){done(previews.get(key));return;}
    if(pending.has(key)){pending.get(key).push(done);return;}
    pending.set(key,[done]);
    const end=url=>{
      previews.set(key,url);
      const all=pending.get(key)||[];pending.delete(key);
      all.forEach(cb=>cb(url));
    };
    const im=new Image();
    im.onload=()=>{
      try{end(portraitSprite(im,who).toDataURL('image/webp',.92));}
      catch(e){console.warn('[Starter] portrait fallback',e);end(src);}
    };
    im.onerror=()=>end(src);
    im.src=src;
  }
  function refreshPreviews(root=document){
    root.querySelectorAll('img[data-starter-face]').forEach(img=>{
      const id=img.dataset.starterFace;
      const who=id==='starter_boy'?'uiji':'useoi';
      const src=who==='uiji'?'assets/starter_boy_original_face.webp':'assets/hero_intro.webp';
      preview(src,who,url=>{if(img.isConnected&&img.dataset.starterFace===id)img.src=url;});
    });
  }
  window.HellStarterSkin={getSprite:recolor,preview,refreshPreviews,portraitSprite};
})();