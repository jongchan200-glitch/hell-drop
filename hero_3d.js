/* Hell Fall · interactive home character · actual two-sided volumetric WebGL sculpt.
   Front appearance is sampled from the original locked character artwork;
   back is a reconstructed artist texture because the original has no rear reference.
   No third-party runtime / no external connection. */
(function(){
'use strict';
const MODEL_PATH='assets/hero_sculpt.bin.gz?v=09-3d';
const FRONT_PATH='assets/hero_intro.webp?v=09-3d';
const BACK_PATH='assets/hero_back.webp?v=09-3d';
const VERTEX_SOURCE=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUv;
layout(location=3) in float aFace;
layout(location=4) in float aCape;
uniform float uYaw;
uniform float uTime;
uniform vec2 uView;
out vec2 vUv;
out float vFace;
out vec3 vNormal;
void main(){
  vec3 p=aPos;
  // Delicate cloak movement, which changes actual vertices rather than a flat photo.
  p.z+=aCape*(sin(uTime*1.52+p.x*4.4+p.y*2.7)*0.050+cos(uTime*0.81+p.x*2.1)*0.029);
  p.x+=aCape*sin(uTime*1.06+p.y*2.4)*0.022;
  p.y+=sin(uTime*1.75)*0.019;
  // Yaw only. Deliberately no pitch / roll, to suit the phone lobby.
  float c=cos(uYaw),s=sin(uYaw);
  vec3 world=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);
  vNormal=normalize(vec3(c*aNormal.x+s*aNormal.z,aNormal.y,-s*aNormal.x+c*aNormal.z));
  vUv=aUv;
  vFace=aFace;
  gl_Position=vec4(world.x*2.0/uView.x,world.y*2.0/uView.y,-world.z/3.7,1.0);
}`;
const FRAGMENT_SOURCE=`#version 300 es
precision highp float;
uniform sampler2D uFront;
uniform sampler2D uBack;
in vec2 vUv;
in float vFace;
in vec3 vNormal;
out vec4 outColor;
void main(){
  vec4 tex = mix(texture(uBack,vUv),texture(uFront,vUv),smoothstep(.34,.66,vFace));
  if(tex.a<.06)discard;
  vec3 n=normalize(vNormal);
  vec3 light=normalize(vec3(-.37,.61,.83));
  float diffuse=max(dot(n,light),0.0);
  // Preserve the original face/skin palette; softly light sculpted sides & back.
  float lum=mix(.76+.24*diffuse,.96+.04*diffuse,smoothstep(.70,.99,vFace));
  float rim=pow(1.0-abs(n.z),3.0)*.10;
  outColor=vec4(min(vec3(1.0),tex.rgb*lum+vec3(.95,.55,.31)*rim),tex.a);
}`;
function shader(gl,type,source){
  const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));
  return sh;
}
function program(gl){
  const pr=gl.createProgram();const v=shader(gl,gl.VERTEX_SHADER,VERTEX_SOURCE),f=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT_SOURCE);
  gl.attachShader(pr,v);gl.attachShader(pr,f);gl.linkProgram(pr);
  gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pr));
  return pr;
}
function image(src){return new Promise((resolve,reject)=>{
  const im=new Image();im.decoding='async';im.onload=()=>resolve(im);im.onerror=()=>reject(Error('image failed: '+src));im.src=src;
});}
function texture(gl,im,slot){
  gl.activeTexture(gl.TEXTURE0+slot);let tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  return tex;
}
async function downloadModel(){
  const response=await fetch(MODEL_PATH,{cache:'force-cache'});
  if(!response.ok)throw Error('mesh HTTP '+response.status);
  let data=await response.arrayBuffer();
  if(new Uint8Array(data,0,2)[0]===0x1f && new Uint8Array(data,0,2)[1]===0x8b){
    if(typeof DecompressionStream==='undefined')throw Error('Browser needs gzip decompression');
    data=await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  const header=new DataView(data,0,24);
  const tag=String.fromCharCode(...new Uint8Array(data,0,8));
  if(tag!=='HFMESH09')throw Error('wrong model version');
  const vertexCount=header.getUint32(16,true),indexCount=header.getUint32(20,true);
  const verts=new Float32Array(data,24,vertexCount*10), indices=new Uint32Array(data,24+vertexCount*40,indexCount);
  return{verts,indices,vertexCount,indexCount};
}
function clamp(n,lo,hi){return Math.max(lo,Math.min(hi,n));}
function mount(actor,{isHome=()=>true}={}){
  const canvas=document.getElementById('lobby3dCanvas');
  if(!canvas||!actor)return;
  const fallback=document.getElementById('lobbyTurn');
  let gl=null,pr=null,vao=null,indices=0,ready=false,yaw=0,target=0,held=null,lastX=0,moved=0,lastTimestamp=0,raf=0;
  let width=0,height=0,uniformYaw=null,uniformTime=null,uniformView=null;
  let resizeWatcher=null;
  function label(){
    let angle=((Math.round(target*180/Math.PI)%360)+360)%360;
    actor.setAttribute('aria-valuenow',String(angle));
    actor.setAttribute('aria-valuetext',angle<20||angle>340?'정면':angle>160&&angle<200?'뒷모습':angle<180?'오른쪽 '+angle+'도':'왼쪽 '+(360-angle)+'도');
  }
  function resize(){
    if(!gl)return;
    const rect=actor.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
    const dpr=Math.min(window.devicePixelRatio||1,2.0);
    const dw=Math.max(1,Math.round(w*dpr)),dh=Math.max(1,Math.round(h*dpr));
    if(dw!==canvas.width||dh!==canvas.height){canvas.width=dw;canvas.height=dh;gl.viewport(0,0,dw,dh);}
    width=w;height=h;
  }
  function paint(now){
    raf=requestAnimationFrame(paint);
    if(!ready||document.hidden||!isHome())return;
    const dt=clamp((now-(lastTimestamp||now))/1000,0,.05);lastTimestamp=now;
    if(held===null) {yaw+=((target-yaw)*(1-Math.exp(-dt*11.5)));}
    else yaw=target;
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(pr);gl.bindVertexArray(vao);
    gl.uniform1f(uniformYaw,yaw+Math.sin(now*.00055)*.011);
    gl.uniform1f(uniformTime,now*.001);
    gl.uniform2f(uniformView,5.33*(width/Math.max(height,1)),5.33);
    gl.drawElements(gl.TRIANGLES,indices,gl.UNSIGNED_INT,0);
    gl.bindVertexArray(null);
  }
  const touchEnd=(e)=>{
    if(held!==e.pointerId)return;
    held=null;actor.classList.remove('is-dragging');
    if(actor.hasPointerCapture(e.pointerId))actor.releasePointerCapture(e.pointerId);
    if(moved<7){target+=Math.PI/9;label();}
  };
  actor.addEventListener('pointerdown',e=>{
    if(!isHome()||(e.pointerType==='mouse'&&e.button!==0))return;
    held=e.pointerId;lastX=e.clientX;moved=0;
    actor.classList.add('is-dragging');actor.setPointerCapture(e.pointerId);
  });
  actor.addEventListener('pointermove',e=>{
    if(held!==e.pointerId)return;
    const dx=e.clientX-lastX;lastX=e.clientX;moved+=Math.abs(dx);
    // 165 px of thumb movement produces 180 degrees; no pitch permitted.
    target+=dx*Math.PI/165;target=clamp(target,-Math.PI*16,Math.PI*16);
    if(moved>2&&e.cancelable)e.preventDefault();
    label();
  });
  actor.addEventListener('pointerup',touchEnd);
  actor.addEventListener('pointercancel',touchEnd);
  actor.addEventListener('keydown',e=>{
    if(!isHome())return;
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='Home'){
      e.preventDefault();
      target=e.key==='Home'?0:target+(e.key==='ArrowLeft'?-Math.PI/12:Math.PI/12);
      label();
    }
  });
  // Bypass the old flat CSS 'rotateY' implementation entirely.
  const start=async()=>{
    try{
      gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:true,depth:true,powerPreference:'low-power'});
      if(!gl)throw Error('WebGL2 not available');
      const [mesh,front,back]=await Promise.all([downloadModel(),image(FRONT_PATH),image(BACK_PATH)]);
      pr=program(gl);gl.useProgram(pr);
      vao=gl.createVertexArray();gl.bindVertexArray(vao);
      const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,mesh.verts,gl.STATIC_DRAW);
      const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);
      const stride=40;
      for(const [idx,n,offset] of [[0,3,0],[1,3,12],[2,2,24],[3,1,32],[4,1,36]]){
        gl.enableVertexAttribArray(idx);gl.vertexAttribPointer(idx,n,gl.FLOAT,false,stride,offset);
      }
      gl.bindVertexArray(null);
      texture(gl,front,0);texture(gl,back,1);
      uniformYaw=gl.getUniformLocation(pr,'uYaw');uniformTime=gl.getUniformLocation(pr,'uTime');uniformView=gl.getUniformLocation(pr,'uView');
      gl.uniform1i(gl.getUniformLocation(pr,'uFront'),0);
      gl.uniform1i(gl.getUniformLocation(pr,'uBack'),1);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.CULL_FACE);
      indices=mesh.indexCount;
      resize();resizeWatcher=new ResizeObserver(resize);resizeWatcher.observe(actor);
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;actor.classList.remove('is-3d-ready');});
      ready=true;actor.classList.add('is-3d-ready');canvas.setAttribute('aria-hidden','true');
      window.HellFall3DStatus={ready:true,vertices:mesh.vertexCount,triangles:mesh.indexCount/3,rotation:'horizontal-360',model:'volumetric'};
    }catch(err){
      console.warn('3D model not available; keep original static character.',err);
      window.HellFall3DStatus={ready:false,error:String(err)};
      // Never fall back to the paper-thin CSS rotating sprite.
      if(fallback)fallback.style.transform='none';
    }
    raf=requestAnimationFrame(paint);
  };
  start();label();
  return {setYaw(deg){target=Number(deg)*Math.PI/180;label();},getYaw:()=>yaw,dispose(){cancelAnimationFrame(raf);resizeWatcher?.disconnect();}};
}
window.HellFallLobby3D={mount};
})();