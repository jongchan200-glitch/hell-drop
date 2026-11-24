from pathlib import Path

root=Path(__file__).parent
base=(root/'review-template.html').read_text(encoding='utf8')
base=base.replace('<canvas width="800" height="500" aria-label="관절 애니메이션 시연"></canvas>',"""<div class="panels">
  <section><h2>본편 원본 · rig=0</h2><canvas id="original" width="390" height="300"></canvas></section>
  <section><h2>관절형 비교본</h2><canvas id="rig" width="390" height="300"></canvas></section>
</div>""")
base=base.replace('</style>','''.panels{display:grid;grid-template-columns:1fr 1fr;gap:10px}h2{font-size:15px;margin:0 0 6px}.timeline button{min-width:40px}.timeline{flex-wrap:wrap}'''+ '</style>')
base=base.replace('<option value="01_Cape_Glide">망토 펼친 낙하</option><option value="02_Fast_Drop">고속 낙하</option><option value="03_Wall_Kick_Left">왼쪽 벽점프</option><option value="04_Wall_Kick_Right">오른쪽 벽점프</option><option value="">중립 자세</option>',
                  '<option value="glide">망토 펼친 낙하</option><option value="folded">망토 접힌 낙하</option><option value="fast">고속 낙하</option><option value="left">왼쪽 벽 출발</option><option value="right">오른쪽 벽 출발</option>')
base=base.replace('<input id="time"', '<button id="prev" aria-label="이전 프레임">‹</button><button id="next" aria-label="다음 프레임">›</button><input id="time"')
base=base.replace('</main>','<button id="sheet">프레임 표 만들기</button><div id="sheet-output"></div></main>')
base=base.replace('const {skeleton, atlas, image}', 'const {skeleton, atlas, image, specs, original}')
base=base.replace("const canvas = document.querySelector('canvas');", """const canvas = $('rig');
const ref = $('original');
const ctx = ref.getContext('2d');
const W = ref.width;
const images = {};
const capeRig = {};
let s;
const sys = {profile:{}};
const clamp = x => Math.min(1,Math.max(0,x));
const smooth = x => {const t=clamp(x); return t*t*(3-2*t);};
const wallX = wall => wall==='L'?.29:.71;
const drawFallbackHero = () => {};
/* ORIGINAL_DRAW */

function position(spec,time) {
  if (!spec.wall) return {x:W/2,y:ref.height/2};
  const q=clamp(time/.155);
  const start=wallX(spec.wall);
  return {x:W*(start+(1-2*start)*smooth(q)),
          y:ref.height/2-Math.sin(Math.PI*q)*15*(W/400)};
}

function drawReference(spec,time) {
  ctx.clearRect(0,0,ref.width,ref.height);
  const {x,y}=position(spec,time);
  s={hopVisual:spec.wall?clamp(time/.4):1,hopFrom:spec.wall,stage:'PLAYING',tapPulse:0};
  sys.profile.selectedCharacter=$('hero').value.toLowerCase();
  const shrink=$('small').checked?.62:1;
  drawHero(x,y,W/400*shrink,spec.fold,time,spec.speed,false,!!spec.wall&&time<.4,spec.wall);
}""")
base=base.replace("function render(clip,time) {","function render(clip,time,spec) {")
base=base.replace("const scale=$('small').checked?.22:.68;",
                  "const scale=$('small').checked?.1922:.31;\n  const anchor=position(spec,time);")
base=base.replace("x*scale*2/canvas.width,y*scale*2/canvas.height,",
                  "(x*scale+anchor.x)*2/canvas.width-1,1-(anchor.y-y*scale)*2/canvas.height,")
base=base.replace("$('clip').onchange=()=>{time=0;};", """$('clip').onchange=$('hero').onchange=()=>{time=0;};
function step(dir) {
  const spec=specs[$('hero').value+'_'+$('clip').value];
  const stride=spec.duration/spec.count;
  time=Math.max(0,Math.min(spec.duration,(Math.round(time/stride)+dir)*stride));
  playing=false;
  $('play').textContent='재생';
}
$('prev').onclick=()=>step(-1);
$('next').onclick=()=>step(1);""")
base=base.replace("function frame(now) {", """$('sheet').onclick=()=>{
  const name=$('hero').value+'_'+$('clip').value;
  const clip=skeleton.animations[name], spec=specs[name];
  const count=spec.wall?25:12;
  const sheet=document.createElement('canvas');
  sheet.width=1040;
  sheet.height=Math.ceil(count/4)*103;
  sheet.setAttribute('aria-label','원본과 관절형의 시간별 비교표');
  const ink=sheet.getContext('2d');
  ink.fillStyle='#171520'; ink.fillRect(0,0,sheet.width,sheet.height);
  ink.font='14px system-ui';
  for(let i=0;i<count;i++){
    const t=spec.duration*i/(spec.wall?count-1:count);
    const x=(i%4)*260,y=Math.floor(i/4)*103;
    drawReference(spec,t);
    render(clip,t,spec);
    ink.fillStyle='#f4e7d6';
    ink.fillText(Math.round(t*1000)+' ms  원본 / 관절형',x+8,y+15);
    ink.drawImage(ref,x,y+18,126,82);
    ink.drawImage(canvas,x+130,y+18,126,82);
  }
  $('sheet-output').replaceChildren(sheet);
};
function frame(now) {""")
base=base.replace("const clip=skeleton.animations[$('clip').value];\n  const duration=clip?.bones.root.rotate.at(-1).time??0;",
                  "const key=$('hero').value+'_'+$('clip').value;\n  const clip=skeleton.animations[key], spec=specs[key];\n  const {duration}=spec;")
base=base.replace("$('seconds').textContent=time.toFixed(2)+'초';\n  render(clip,time);",
                  "$('seconds').textContent=Math.round(time*1000)+' ms · '+Math.round(time/duration*spec.count)+' / '+spec.count;\n  drawReference(spec,time);\n  render(clip,time,spec);")
base=base.replace("bitmap.onload=()=>{","bitmap.onload=async()=>{")
base=base.replace("  $('status').textContent='타임라인을 움직여 연결부와 장비 위치를 확인할 수 있습니다.';",
                  """  try {
    await Promise.all(Object.entries(original).map(async ([key,url])=>{
      const img=new Image();
      img.src=url;
      await img.decode();
      images[key]=img;
    }));
    prepareCapeRig(images.braking);
  } catch(error) {
    $('status').textContent='원본 파일을 불러오지 못했습니다.';
    throw error;
  }
  $('status').textContent='좌우 화면은 같은 시간과 속도로 재생합니다. 벽점프는 0–400 ms에서 한 프레임씩 확인할 수 있습니다.';""")
(root/'motion-comparison-template.html').write_text(base,encoding='utf8')
