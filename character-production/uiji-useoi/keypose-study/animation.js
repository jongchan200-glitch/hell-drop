const paint=canvas.getContext('2d');
const layers=Array.from({length:8},()=>document.createElement('canvas'));
function artwork(i){
  const layer=layers[i];
  if (!layer.dataset.ready){
    const [x,y,w,h]=boxes[i];
    layer.width=w;layer.height=h;
    layer.getContext('2d').drawImage(bitmap,x,y,w,h,0,0,w,h);
    layer.dataset.ready='1';
  }
  return layer;
}
// Triangulated pose surfaces. Head, shoulder line, hips and soles have
// different follow-through. Each triangle maps texture space to pose space.
const controls={
  // nose, wall-side fist, trailing fist, pelvis, leading toe, trailing toe
  6:[[.28,.26],[.13,.28],[.68,.53],[.48,.59],[.02,.51],[.82,.96]],
  7:[[.40,.27],[.13,.35],[.70,.56],[.45,.62],[.27,.72],[.16,.95]],
  4:[[.52,.31],[.18,.36],[.81,.35],[.52,.65],[.47,.89],[.42,.98]],
  3:[[.61,.28],[.10,.33],[.90,.40],[.56,.59],[.30,.78],[.70,.96]],
  0:[[.49,.32],[.12,.42],[.87,.42],[.49,.67],[.25,.94],[.72,.95]]
};
function surface(i,phase,wind,turn,peer,amount){
  const img=artwork(i),w=img.width,h=img.height;
  const xs=Array.from({length:9},(_,j)=>j/8),ys=xs;
  const point=(u,v)=>{
    const edge=(u-.5)*2, hair=(1-smooth(v/.5))*Math.abs(edge);
    const lag=Math.sin(phase-v*2);
    let dx=0,dy=0,total=0; if(amount && controls[peer]){controls[i].forEach(([x,y],n)=>{const weight=1/((u-x)**2+(v-y)**2+.006)**2;total+=weight;dx+=(controls[peer][n][0]-x)*weight;dy+=(controls[peer][n][1]-y)*weight;});dx*=amount/total;dy*=amount/total;} return [(u+dx-.5)*w*(1-.045*Math.abs(turn))+w*(hair*lag*.027*wind+turn*(.5-v)*.043),
      (v+dy-.52)*h+h*(.017*wind*lag*hair+.013*Math.sin(phase+edge)*smooth((v-.57)/.43))];
  };
  for(let j=1;j<ys.length;j++) for(let k=1;k<xs.length;k++){
    const u=xs[k-1],v=ys[j-1],du=xs[k]-u,dv=ys[j]-v;
    for(const [a,b,c] of [[[u,v],[u+du,v],[u,v+dv]],[[u+du,v+dv],[u,v+dv],[u+du,v]]]){
      const A=point(...a),B=point(...b),C=point(...c);
      const sx=(b[0]-a[0])*w,sy=(c[1]-a[1])*h;
      paint.save();paint.beginPath();paint.moveTo(...A);paint.lineTo(...B);paint.lineTo(...C);paint.closePath();paint.clip();
      const xx=(B[0]-A[0])/sx,xy=(B[1]-A[1])/sx,yx=(C[0]-A[0])/sy,yy=(C[1]-A[1])/sy;
      paint.transform(xx,xy,yx,yy,A[0]-xx*a[0]*w-yx*a[1]*h,A[1]-xy*a[0]*w-yy*a[1]*h);
      paint.drawImage(img,0,0);paint.restore();
    }
  }
}
function render(_,time,spec){
  const girl=$('hero').value==='Useoi', wall=spec.wall, p=clamp(time/.4);
  const side=wall==='L'?1:-1,fold=spec.fold, pos=position(spec,time);
  const phase=2*Math.PI*time/spec.duration, wind=.5+fold;
  let parts,roll=0,turn=0;
  if(wall){
    const land=smooth((p-.65)/.35), travel=smooth((p-.1)/.62);
    roll=side*(girl?(-.20+.46*travel)*(1-land):(-.27+.48*smooth(p))*(1-smooth((p-.72)/.28)));
    turn=side*Math.sin(Math.PI*p);
    const release=smooth((p-.62)/.15), settle=smooth((p-.79)/.21);
    parts=girl?[[6,1-release],[7,release*(1-settle)],[4,settle]]:[[3,1-land],[0,land]];
  }else{
    parts=[[girl?(fold?5:4):(fold>.95?2:fold?1:0),1]];
    roll=girl?Math.sin(time*5)*fold*.02:Math.sin(phase)*.022-fold*.22;
  }
  paint.clearRect(0,0,canvas.width,canvas.height);
  for(const [i,alpha] of parts){
    if(alpha<=0)continue;
    const size=(girl?150:168)*($('small').checked?.62:1);
    const scale=size/Math.max(boxes[i][2],boxes[i][3]);
    paint.save();paint.translate(pos.x,pos.y+Math.sin(phase)*1.3);
    if(!girl){
      const mode=fold>.95?2:fold?1:0, speed=clamp((spec.speed-112)/650);
      const f=(time*(9.5+speed*5.5)*[1,1.09,1.23][mode]+[0,2,5][mode])%12;
      const row=curves[mode], a=row[Math.floor(f)], b=row[(Math.floor(f)+1)%12];
      const bounds=a.map((v,j)=>v+(b[j]-v)*(f%1)),base=row[0];
      paint.scale((bounds[2]-bounds[0])/(base[2]-base[0]),(bounds[3]-bounds[1])/(base[3]-base[1]));
    }
    paint.rotate(roll);paint.scale(scale*(wall==='R'&&i!==4&&i!==0?-1:1),scale);
    paint.globalAlpha=alpha;const next=parts.find(([id,a])=>id!==i && a>0);surface(i,phase,wind,turn,next?.[0],next?.[1]||0);paint.restore();
  }
}
