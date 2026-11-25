from pathlib import Path
import json,base64,re
from PIL import Image
p=Path(__file__).parent
r=p.parent
old=(r/'motion-reproduction/compare.html').read_text('utf8')
payload=json.loads(old.split('const {skeleton, atlas, image, specs, original} = ',1)[1].split(';\nconst $',1)[0])
a=Image.open(p/'poses.png')
boxes=[]
for i in range(8):
    x,y=i%4*a.width//4,i//4*a.height//2
    cell=a.crop((x,y,(i%4+1)*a.width//4,(i//4+1)*a.height//2))
    b=cell.getchannel('A').point(lambda v:255 if v>100 else 0).getbbox()
    boxes.append([x+b[0],y+b[1],b[2]-b[0],b[3]-b[1]])
atlas=Image.open(r/'references/uiji_motion_atlas.webp').convert('RGBA')
curves=[]
for row in range(3):
    samples=[]
    for j in range(12):
        n=row*12+j
        x,y=n%6*384,n//6*384
        alpha=atlas.crop((x,y,x+384,y+384)).getchannel('A')
        samples.append(alpha.point(lambda v:255 if v>120 else 0).getbbox())
    curves.append(samples)
original=old[old.index("const $ = id"):old.index("const gl = canvas")]
ui=old[:old.index('  <label>머리 장비')].replace('관절형 비교본','장비 없는 핵심 자세').replace('지옥 낙하 캐릭터 검수','지옥 낙하 · 기본 몸체 동작 비교')
ui+=old[old.index('  <label><input type="checkbox" id="small"'):old.index('const {skeleton')]
js=(p/'animation.js').read_text('utf8')
end=old[old.index("let playing="):] if 'let playing=' in old else old[old.index('let playing'): ]
end=end.replace("const clip=skeleton.animations[name], spec=specs[name];","const clip=null, spec=specs[name];").replace("const clip=skeleton.animations[key], spec=specs[key];","const clip=null, spec=specs[key];")
end=re.sub(r'  gl.texImage2D\([^\n]+\n','',end)
img='data:image/png;base64,'+base64.b64encode((p/'poses.png').read_bytes()).decode()
(p/'compare.html').write_text(ui+'const {original,specs,boxes,image,curves}='+json.dumps(dict(original=payload['original'],specs=payload['specs'],boxes=boxes,image=img,curves=curves))+';\n'+original+js+'\n'+end,'utf8')
