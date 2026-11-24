'use strict';
/* Work Rig mobile play-test adapter. Uses exported weighted meshes/bones, never slices complete poses. */
(() => {
  const query=new URLSearchParams(location.search);
  if(query.get('workrig')!=='1')return;
  const root=document.getElementById('game');
  if(!root)return;
  const canvas=document.createElement('canvas');
  canvas.id='workRigOverlay';
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'2',pointerEvents:'none',background:'transparent'});
  root.insertBefore(canvas,document.getElementById('hud'));
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
  const rig={enabled:true,ready:false,update:null,paint:null,look:{hero:'auto',head:'',outfit:'',glove:'base',shoe:'base',bracelet:false,cape:true,mode:'auto'},state:null};
  window.HellWorkRig=rig;
  const panel=document.createElement('aside');
  panel.id='workRigTools';
  panel.style.cssText='position:absolute;z-index:8;top:calc(140px + env(safe-area-inset-top));left:7px;max-width:calc(100% - 14px);font:12px system-ui;pointer-events:auto;color:#fff';
  panel.innerHTML='<button id="workRigToggle" type="button" style="min-height:38px;border-radius:14px;background:#153744ed;color:white;border:1px solid #8ce9df;padding:8px 13px;font-weight:900">🧩 캐릭터 장비</button><div id="workRigFields" hidden style="margin-top:6px;max-height:52svh;overflow:auto;background:#111925f5;padding:10px;border:1px solid #8ce9df;border-radius:13px;box-shadow:0 5px 25px #0009"><strong style="display:block;margin-bottom:7px">실제 게임 중 시범 장착</strong><label>캐릭터 <select data-workrig="hero"><option value="auto">게임 선택</option><option value="Uiji">우이지</option><option value="Useoi">우서이</option></select></label><label>동작 <select data-workrig="mode"><option value="auto">게임 조작대로</option><option value="glide">망토 펼친 낙하</option><option value="fast">고속 낙하</option><option value="kickL">왼쪽 벽점프 반복</option><option value="kickR">오른쪽 벽점프 반복</option></select></label><label>머리 장비 <select data-workrig="head"><option value="">기본 머리</option><option value="Helmet">탐험 헬멧</option><option value="Frog">개구리 탈</option></select></label><label>옷 <select data-workrig="outfit"><option value="">기본</option><option value="other">교체</option></select></label><label>장갑 <select data-workrig="glove"><option value="base">기본</option><option value="silver">은색</option></select></label><label>신발 <select data-workrig="shoe"><option value="base">기본</option><option value="silver">은색</option></select></label><label><input data-workrig="bracelet" type="checkbox"> 팔찌</label><label><input data-workrig="cape" type="checkbox" checked> 망토</label><p id="workRigStatus" style="color:#96eddc;margin:7px 0 0">관절 원본을 읽는 중…</p><a href="character-lab.html?v=workrig-nov25" style="display:block;margin-top:8px;color:#ffdc9e">일시정지·느린 재생·자세 비교 →</a></div>';
  root.appendChild(panel);
  panel.querySelectorAll('label').forEach(el=>{el.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:10px;margin:7px 0;'});
  panel.querySelectorAll('select').forEach(el=>el.style.cssText='max-width:148px;background:#263444;color:white;border-radius:8px;border:1px solid #536d7c;min-height:32px;');
  panel.querySelector('#workRigToggle').onclick=()=>{const fields=panel.querySelector('#workRigFields');fields.hidden=!fields.hidden;};
  panel.querySelectorAll('[data-workrig]').forEach(el=>el.addEventListener('change',()=>{
    rig.look[el.dataset.workrig]=el.type==='checkbox'?el.checked:el.value;
  }));
  if(!gl){rig.enabled=false;panel.querySelector('#workRigStatus').textContent='이 휴대폰에서 WebGL을 시작하지 못해 원본으로 돌아갑니다.';return;}
  let skeleton,atlas,bitmap,skins,idx,assets;
  function shader(type,source){
    const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
    return s;
  }
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 p;attribute vec2 uv;varying vec2 t;void main(){t=uv;gl_Position=vec4(p,0.,1.);}'));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 t;uniform sampler2D tex;void main(){gl_FragColor=texture2D(tex,t);}'));
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [name,offset] of [['p',0],['uv',8]]){
    const a=gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,16,offset);
  }
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const base='character-production/uiji-useoi/';
  function parseAtlas(txt){
    const obj={};let name='';
    for(const line of txt.replace(/\r/g,'').split('\n')){
      if(line&&!line.startsWith(' ')&&!line.includes(':')&&!line.endsWith('.png'))name=line.trim();
      const match=line.match(/^\s+bounds:\s*(\d+),(\d+),(\d+),(\d+)/);
      if(match&&name)obj[name]=match.slice(1).map(Number);
    }
    return obj;
  }
  const val=(keys,time,field,fallback)=>{
    if(!keys||!keys.length)return fallback;
    const next=keys.findIndex(k=>k.time>time);
    if(next<0)return keys[keys.length-1][field];
    if(next===0)return keys[0][field];
    const a=keys[next-1],b=keys[next],p=(time-a.time)/(b.time-a.time);
    return a[field]+(b[field]-a[field])*p;
  };
  function boneWorld(clip,time){
    const poses=[];
    for(const bone of skeleton.bones){
      const keys=clip?.bones?.[bone.name];
      const theta=val(keys?.rotate,time,'value',0)*Math.PI/180;
      const sx=val(keys?.scale,time,'x',1),sy=val(keys?.scale,time,'y',1);
      const x=bone.x+val(keys?.translate,time,'x',0),y=bone.y+val(keys?.translate,time,'y',0);
      const a=Math.cos(theta)*sx,b=Math.sin(theta)*sx,c=-Math.sin(theta)*sy,d=Math.cos(theta)*sy;
      const p=poses[idx[bone.parent]];
      poses.push(p?[p[0]*a+p[2]*b,p[1]*a+p[3]*b,p[0]*c+p[2]*d,p[1]*c+p[3]*d,
       p[0]*x+p[2]*y+p[4],p[1]*x+p[3]*y+p[5]]:[a,b,c,d,x,y]);
    }
    return poses;
  }
  function resize(){
    const r=root.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
    return dpr;
  }
  function render(){
    const state=rig.state,dpr=resize();
    panel.style.display=state?.active?'block':'none';
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    if(!rig.ready||!state?.active)return;
    const l=rig.look;
    const hero=l.hero==='auto'?(state.character==='uiji'?'Uiji':'Useoi'):l.hero;
    const basic=hero==='Uiji'?'default':hero;
    const worn=l.head?hero+' '+l.head:basic;
    let mode=l.mode;
    if(mode==='auto'){
      mode=state.hopping?(state.hopFrom==='R'?'kickR':'kickL'):state.fold>.40?'fast':'glide';
    }
    const clipName=({glide:'01_Cape_Glide',fast:'02_Fast_Drop',kickL:'03_Wall_Kick_Left',kickR:'04_Wall_Kick_Right'})[mode];
    const clip=skeleton.animations[clipName];
    const duration=clip?.bones?.root?.rotate?.at(-1)?.time||1;
    const elapsed=state.elapsed||0;
    let t=(elapsed*(mode==='fast'?1.6:1))%duration;
    if(l.mode==='auto'&&state.hopping)t=Math.min(duration,state.hopVisual*duration);
    if(l.mode!=='auto'&&mode.startsWith('kick'))t=(elapsed%1.3)/1.3*duration;
    const poses=boneWorld(clip,t),vertices=[];
    const scale=.285*state.u*dpr,originX=state.x*dpr,originY=(state.y+5*state.u)*dpr;
    const transpose=([x,y])=>[(originX+x*scale)*2/canvas.width-1,1-(originY-y*scale)*2/canvas.height];
    for(const slot of skeleton.slots){
      const key=slot.name,group=key.split('_')[0];
      if(group==='cape'&&!l.cape)continue;
      if(group==='bracelet'&&!l.bracelet)continue;
      const skin=l.outfit==='other'&&(key==='shirt'||key==='pants')?(hero==='Uiji'?'Useoi':'default'):worn;
      let choice=slot.attachment;
      if(group==='shoe'||group==='glove')choice=l[group];
      if(group==='bracelet')choice='gold';
      const part=skins[skin]?.[key]?.[choice]??skins.default?.[key]?.[choice];
      if(!part||part.path==='empty')continue;
      const region=atlas[part.path];if(!region)continue;
      const [ax,ay,w,h]=region;
      let points,uvs,triangles;
      if(part.type==='mesh'){
        const weights=assets[part.path];if(!weights)continue;
        points=weights.map(entries=>{
          let x=0,y=0;
          for(let i=0;i<entries.length;i+=4){
            const mat=poses[entries[i]],px=entries[i+1],py=entries[i+2],gain=entries[i+3];
            if(!mat)continue;
            x+=(mat[0]*px+mat[2]*py+mat[4])*gain;
            y+=(mat[1]*px+mat[3]*py+mat[5])*gain;
          }
          return [x,y];
        });
        uvs=part.uvs;triangles=part.triangles;
      }else{
        const mat=poses[idx[slot.bone]];if(!mat)continue;
        points=[[-w/2,h/2],[w/2,h/2],[-w/2,-h/2],[w/2,-h/2]].map(([x,y])=>{
          x+=part.x||0;y+=part.y||0;
          return [mat[0]*x+mat[2]*y+mat[4],mat[1]*x+mat[3]*y+mat[5]];
        });
        uvs=[0,0,1,0,0,1,1,1];triangles=[0,2,1,1,2,3];
      }
      for(const i of triangles){
        const [nx,ny]=transpose(points[i]);
        vertices.push(nx,ny,(ax+w*uvs[i*2])/2048,(ay+h*uvs[i*2+1])/2048);
      }
    }
    gl.useProgram(program);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES,0,vertices.length/4);
  }
  rig.update=data=>{rig.state=data;};
  rig.paint=render;
  Promise.all([
    fetch(base+'hell-drop.json').then(r=>{if(!r.ok)throw Error('JSON '+r.status);return r.json();}),
    fetch(base+'hell-drop.atlas').then(r=>{if(!r.ok)throw Error('Atlas '+r.status);return r.text();}),
    new Promise((resolve,reject)=>{
      const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('PNG 로드 실패'));i.src=base+'hell-drop.png';
    })
  ]).then(([data,text,img])=>{
    skeleton=data;atlas=parseAtlas(text);bitmap=img;
    skins=Object.fromEntries(skeleton.skins.map(s=>[s.name,s.attachments]));
    idx=Object.fromEntries(skeleton.bones.map((b,i)=>[b.name,i]));
    assets={};
    for(const skin of skeleton.skins)for(const entries of Object.values(skin.attachments))for(const part of Object.values(entries)){
      if(part.type!=='mesh'||assets[part.path])continue;
      const pts=[];
      for(let i=0;i<part.vertices.length;){
        const count=part.vertices[i++];pts.push(part.vertices.slice(i,i+count*4));i+=count*4;
      }
      assets[part.path]=pts;
    }
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
    rig.ready=true;
    panel.querySelector('#workRigStatus').textContent='관절 38개 · 장비 교체 · 실시간 게임 적용';
  }).catch(err=>{
    console.error('Work rig load error',err);
    rig.enabled=false;
    panel.querySelector('#workRigStatus').textContent='로드 오류: '+err.message+' · 기존 캐릭터 자동 복귀';
  });
})();