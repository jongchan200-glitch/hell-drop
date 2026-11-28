'use strict';
// Provisional WEB 3.7 tuning. All consumables are one-run, never cash purchases here.
(function(){
 const extra=[
  ...[10,20,30].map((bonus,i)=>({id:'life_'+bonus,name:'생명의 드링크 · '+['소','중','대'][i],kind:'drink',stat:'life',bonus,price:[45,85,150][i],color:['#ffc2df','#f58bb9','#e85499'][i],icon:'♡',description:'한 판 동안 타임라인 획득 시간 +'+bonus+'%'})),
  ...[10,20,30].map((bonus,i)=>({id:'accel_'+bonus,name:'가속 드링크 · '+['소','중','대'][i],kind:'drink',stat:'accel',bonus,price:[35,65,115][i],color:['#ffb8ad','#f77968','#e94742'][i],icon:'↟',description:'한 판 동안 가속 응답 속도 +'+bonus+'% (최고속은 그대로)'})),
  {id:'revive_feather',name:'부활의 깃털',kind:'special',stat:'revive',bonus:1,price:120,color:'#f7dfac',icon:'🪶',description:'충돌로 사망할 때 한 번 자동 부활 · 짧은 무적'},
  {id:'hourglass',name:'모래시계',kind:'special',stat:'hourglass',bonus:5,price:90,color:'#c5a3f4',icon:'⌛',description:'시간 소진 시 한 번 5초 추가'},
  {id:'clock_magnet',name:'시계 자석',kind:'special',stat:'magnet',bonus:1,price:160,color:'#63dccb',icon:'🧲',description:'한 판 동안 양쪽 벽의 시계 자동 획득 · 코인은 제외'},
  {id:'gold_charm',name:'황금 부적',kind:'special',stat:'coin',bonus:30,price:30,color:'#f4c76a',icon:'✦',description:'한 판 동안 사냥 중 주운 코인 보상 +30%'},
  {id:'growth_gem',name:'성장의 보석',kind:'special',stat:'growth',bonus:30,price:40,color:'#75d49b',icon:'◆',description:'한 판의 레벨 성장 거리 +30% · 실제 낙하 기록은 그대로'},
  {id:'lucky_bag',name:'행운의 주머니',kind:'special',stat:'luck',bonus:1,price:15,color:'#e6b98b',icon:'🎁',description:'판 종료 시 추가 랜덤 코인 5~20개'}
 ];
 const type=i=>i.kind==='bubble'?'bubble':i.stat;
 const grade=i=>i.name.endsWith('대')?3:i.name.endsWith('중')?2:1;
 const modifiers=items=>Object.fromEntries(items.filter(i=>i.kind!=='bubble').map(i=>[i.stat,i.bonus]));
 const rewards=(rawCoins,depth,mods,random=Math.random)=>({coins:Math.floor(rawCoins*(1+(mods.coin||0)/100))+(mods.luck?5+Math.min(15,Math.floor(Math.max(0,random())*16)):0),growth:Math.floor(depth*(mods.growth||0)/100)});
 function rescue(crashed,remain,mods){let revived=false,timed=false;
  if(crashed&&mods.revive){mods.revive=0;crashed=false;revived=true;}
  if(!crashed&&remain<=0&&mods.hourglass){remain=mods.hourglass;mods.hourglass=0;timed=true;}
  return {crashed,remain,revived,timed};
 }
 let serial=0;
 function art(i){const id='potion-art-'+(++serial),c=i.color;
 const defs='<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff7e6"/><stop offset=".32" stop-color="'+c+'"/><stop offset="1" stop-color="#26344d"/></linearGradient></defs>',fill='url(#'+id+')';
 if(i.kind==='drink'){const g=grade(i),mark={speed:'M54 34 38 54H48L44 70 65 47H54Z',brake:'M50 35V66M35 43L65 59M35 59L65 43',time:'M38 36H62L58 46 50 51 58 57 62 67H38L42 57 50 51 42 46Z',life:'M50 64C19 45 38 30 50 44 62 30 81 45 50 64Z',accel:'M32 58 50 40 68 58M32 45 50 27 68 45'}[i.stat]||'M50 35V65M35 50H65';
 return '<svg viewBox="0 0 100 100" aria-hidden="true">'+defs+'<ellipse cx="50" cy="88" rx="28" ry="5" fill="#070c18" opacity=".55"/><path d="M38 10H62L65 19 61 25H39L35 19Z" fill="#bea373" stroke="#f6e0b0" stroke-width="2"/><path d="M41 24H59V34Q78 43 80 61V74Q78 90 50 90 22 90 20 74V61Q22 43 41 34Z" fill="'+fill+'" stroke="#f7e5d0" stroke-opacity=".8" stroke-width="2.2"/><path d="M24 56Q50 '+(48-g*3)+' 76 56V73Q72 84 50 84 28 84 24 73Z" fill="'+c+'" opacity="'+(.48+g*.12)+'"/><path d="M35 41Q25 48 26 63" stroke="#fff" stroke-opacity=".7" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M39 29H61" stroke="#e5d2a4" stroke-width="4"/><path d="'+mark+'" stroke="#fff8e9" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" fill="none"/>'+Array.from({length:g},(_,j)=>'<circle cx="'+(44+j*6)+'" cy="79" r="2" fill="#fff4cd"/>').join('')+'</svg>';}
 const shape={revive:'<path d="M23 83Q68 4 87 15 83 60 48 77L30 73Z" fill="'+fill+'" stroke="#f9edd2" stroke-width="2"/><path d="M19 91 76 25M37 66 56 62M51 49 72 43" fill="none" stroke="#fff2d0" stroke-width="3"/>',hourglass:'<path d="M24 15H76M24 85H76" stroke="#e8c47d" stroke-width="8" stroke-linecap="round"/><path d="M30 20H70Q69 39 50 50 69 61 70 80H30Q31 61 50 50 31 39 30 20Z" fill="'+fill+'" stroke="#fff0d5" stroke-width="2"/><path d="M36 28H64L50 43ZM36 72 50 60 64 72Z" fill="#f1cc8b"/>',magnet:'<path d="M24 20V56A26 26 0 0 0 76 56V20" fill="none" stroke="'+c+'" stroke-width="20"/><path d="M24 20V39M76 20V39" stroke="#eaf7f6" stroke-width="20"/><path d="M35 12 42 5M60 5 66 12" stroke="#fff2a9" stroke-width="3"/>',coin:'<circle cx="50" cy="52" r="34" fill="'+fill+'" stroke="#ffe9a4" stroke-width="5"/><path d="M50 31 56 44 70 50 56 56 50 71 44 56 30 50 44 44Z" fill="#fff3b6"/>',growth:'<path d="M27 22H73L87 44 50 85 13 44Z" fill="'+fill+'" stroke="#e5ffdc" stroke-width="3"/><path d="M13 44H87M27 22 38 44 50 85 62 44 73 22" fill="none" stroke="#d4ffdb" stroke-width="2"/>',luck:'<path d="M32 14 68 14 62 33Q86 51 80 73 73 89 50 89 27 89 20 73 14 51 38 33Z" fill="'+fill+'" stroke="#f4d5a6" stroke-width="3"/><path d="M33 34H67M50 45 55 56 67 60 55 65 50 77 45 65 33 60 45 56Z" fill="#f7e1a0" stroke="#aa7749" stroke-width="2"/>'}[i.stat]||'';
 return '<svg viewBox="0 0 100 100" aria-hidden="true">'+defs+shape+'</svg>';
 }
 window.HellItems=Object.freeze({extra,type,grade,modifiers,rewards,rescue,art});
})();