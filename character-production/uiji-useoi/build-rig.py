from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageEnhance
import json, math, zipfile, subprocess

OUT = Path(__file__).parent
ART = Image.open(OUT / 'neutral-art.png').convert('RGBA').resize((960, 640), Image.Resampling.LANCZOS)
OX, OY = 263, 311
bones, slots, textures, origins, order = [], [], {}, {}, []
skins = {name: {} for name in ('default', 'Useoi', 'Uiji Helmet', 'Useoi Helmet', 'Uiji Frog', 'Useoi Frog')}

def bone(name, parent, x, y, length=20):
    origins[name] = (x, y)
    px, py = origins[parent] if parent else (OX, OY)
    item = dict(name=name, x=x-px, y=py-y, length=length)
    if parent:
        item['parent'] = parent
    bones.append(item)

bone('root', None, OX, OY, 0)
bone('pelvis', 'root', 263, 316, 28)
bone('chest', 'pelvis', 263, 251, 54)
bone('neck', 'chest', 263, 183)
bone('head', 'neck', 263, 171, 60)
bone('hair_base', 'head', 263, 93)
bone('hair_mid', 'hair_base', 263, 151)
bone('hair_tip', 'hair_mid', 263, 198)
for side, s in [('L', -1), ('R', 1)]:
    def joint(name, parent, dx, y, length):
        bone(f'{name}_{side}', parent, OX+s*dx, y, length)
    joint('shoulder','chest',43,220,20)
    joint('upper',f'shoulder_{side}',53,226,48)
    joint('elbow',f'upper_{side}',90,266,43)
    joint('forearm',f'elbow_{side}',90,266,38)
    joint('wrist',f'forearm_{side}',127,305,22)
    joint('hand',f'wrist_{side}',135,315,24)
    joint('hip','pelvis',29,334,25)
    joint('thigh',f'hip_{side}',31,340,91)
    joint('knee',f'thigh_{side}',46,429,38)
    joint('shin',f'knee_{side}',46,429,105)
    joint('ankle',f'shin_{side}',58,554,23)
    joint('foot',f'ankle_{side}',59,565,30)
    joint('cape_root','chest',28,190,35)
    joint('cape_mid',f'cape_root_{side}',82,218,50)
    joint('cape_tip',f'cape_mid_{side}',133,255,55)

def mix(a, b, t):
    t = max(0,min(1,t))
    return [(a,1-t),(b,t)]

def limb_weight(x, y, side, arm):
    dx = abs(x-OX)
    if arm:
        # The shoulder blend ends before the elbow blend begins.
        if dx < 70:
            return mix('chest', f'upper_{side}', (dx-36)/34)
        return mix(f'upper_{side}', f'forearm_{side}', (dx+y-337)/37)
    if y < 372:
        return mix('pelvis', f'thigh_{side}', (y-323)/49)
    return mix(f'thigh_{side}', f'shin_{side}', (y-401)/59)

def upper_weight(x,y):
    dx=abs(x-OX)
    if y < 203 and dx<28:
        return mix('chest','neck',(203-y)/21)
    body=mix('pelvis','chest',(321-y)/59)
    edge=40+max(0,y-219)*.50
    arm_mix=max(0,min(1,(dx-edge)/18))
    arm=limb_weight(x,y,'L' if x<OX else 'R',True)
    return [(name,w*(1-arm_mix)) for name,w in body]+[(name,w*arm_mix) for name,w in arm]

def lower_weight(x,y):
    return limb_weight(x,y,'L' if x<OX else 'R',False)

def fixed(name):
    return lambda x,y:[(name,1)]

def piece(image, poly):
    mask = Image.new('L',image.size)
    ImageDraw.Draw(mask).polygon(poly,fill=255)
    result = image.copy()
    result.putalpha(ImageChops.multiply(mask,image.getchannel('A')))
    return result

def mesh(path, image, weights, step):
    box = image.getchannel('A').getbbox()
    if not box:
        raise ValueError(path)
    l,t,r,b = box
    crop = image.crop(box)
    textures[path] = crop
    w,h = crop.size
    nx,ny = max(1,math.ceil(w/step)),max(1,math.ceil(h/step))
    uvs,vertices,triangles = [],[],[]
    present = {}
    alpha = crop.getchannel('A')
    index = {item['name']:i for i,item in enumerate(bones)}
    def vertex(i,j):
        if (i,j) not in present:
            u,v=i/nx,j/ny
            x,y=l+w*u,t+h*v
            pairs=[(name,weight) for name,weight in weights(x,y) if weight>1e-6]
            present[i,j]=len(uvs)//2
            uvs.extend([round(u,6),round(v,6)])
            vertices.append(len(pairs))
            for name,weight in pairs:
                px,py=origins[name]
                vertices.extend([index[name],round(x-px,4),round(py-y,4),round(weight,6)])
        return present[i,j]
    for j in range(ny):
        for i in range(nx):
            sample=(math.floor(i*w/nx),math.floor(j*h/ny),math.ceil((i+1)*w/nx),math.ceil((j+1)*h/ny))
            if alpha.crop(sample).getbbox():
                a,c,d,e=vertex(i,j),vertex(i+1,j),vertex(i,j+1),vertex(i+1,j+1)
                triangles.extend([a,d,c,c,d,e])
    return dict(type='mesh',path=path,uvs=uvs,vertices=vertices,triangles=triangles,width=w,height=h)

def region(path,image,anchor):
    box=image.getchannel('A').getbbox()
    l,t,r,b=box
    textures[path]=image.crop(box)
    bx,by=origins[anchor]
    return dict(path=path,x=(l+r)/2-bx,y=by-(t+b)/2,width=r-l,height=b-t)

def slot(name, anchor, attachment='base'):
    slots.append(dict(name=name,bone=anchor,attachment=attachment))

def attach(skin, key, data, name='base'):
    skins[skin].setdefault(key,{})[name]=data

def layer():
    return Image.new('RGBA',(530,640))

for side in ('L','R'):
    slot(f'cape_{side}',f'cape_root_{side}')
slot('hair_back','hair_base')
slot('pants','pelvis')
for side in ('L','R'):
    slot(f'shoe_{side}',f'foot_{side}')
slot('shirt','chest')
for side in ('L','R'):
    slot(f'glove_{side}',f'hand_{side}')
    slot(f'bracelet_{side}',f'wrist_{side}')
slot('face','head')
slot('hair_sides','head')
slot('hair_front','head')
slot('helmet','head')

clear=layer()
clear.putpixel((263,170),(255,255,255,1))
empty=region('empty',clear,'head')
for key in ('helmet','hair_back','hair_sides','bracelet_L','bracelet_R'):
    attach('default',key,empty)

for character, offset, end, wrist, neckline in [('Uiji',0,480,302,179),('Useoi',443,960,308,180)]:
    skin='default' if character=='Uiji' else 'Useoi'
    src=layer()
    start=0 if not offset else 480
    src.alpha_composite(ART.crop((start,0,end,640)),(start-offset,0))
    alpha=src.getchannel('A')
    alpha=alpha.point(lambda v: 0 if v<42 else v)
    src.putalpha(alpha)
    # The sheet's hair, hairline and chin are traced independently of the clothes.
    face_poly=[(190,125),(205,97),(224,75),(246,59),(268,53),(288,62),(306,79),(328,116),
               (329,149),(311,167),(283,178),(263,178),(236,175),(207,163),(191,151)]
    if not offset:
        face_poly=[(193,129),(202,106),(220,92),(250,86),(285,83),(313,99),(329,124),
                   (328,153),(309,164),(284,175),(263,177),(243,175),(214,164),(194,148)]
    head_shape=[(150,0),(370,0),(370,155),(326,neckline),(291,174),(263,178),(227,174),(191,161),(150,147)]
    face=piece(src,face_poly)
    front=piece(src,head_shape)
    if offset:
        front.putalpha(ImageChops.subtract(front.getchannel('A'),face.getchannel('A')))
    else:
        # Keep the original irregular hairline and preserve the eyes in the face attachment.
        front=piece(src,[(140,0),(370,0),(370,130),(326,131),(314,116),(303,119),
                         (293,111),(281,121),(271,115),(261,129),(251,123),(242,126),(229,117),
                         (214,130),(208,148),(189,149),(140,133)])
    tag=character.lower()
    attach(skin,'face',region(tag+'_face',face,'head'))
    attach(skin,'hair_front',region(tag+'_fringe',front,'head'))
    if offset:
        back=piece(src,[(169,44),(343,44),(369,239),(329,224),(299,185),(287,162),
                        (237,160),(223,186),(179,243),(163,239)])
        back.putalpha(ImageChops.subtract(back.getchannel('A'),piece(src,head_shape).getchannel('A')))
        # Remove the blue overshirt and light collar picked up by the hair silhouette.
        red,green,blue,hair_alpha=back.split()
        warm=ImageChops.subtract(red,blue).point(lambda v:255 if v>=9 else 0)
        dark=green.point(lambda v:255 if v<147 else 0)
        back.putalpha(ImageChops.multiply(hair_alpha,ImageChops.multiply(warm,dark)))
        sides=piece(back,[(164,136),(201,136),(222,172),(208,194),(170,216),(169,172)])
        sides.alpha_composite(piece(back,[(314,137),(355,137),(362,217),(327,195),(309,165)]))
        back.putalpha(ImageChops.subtract(back.getchannel('A'),sides.getchannel('A')))
        hair_weight=lambda x,y: mix('hair_base','hair_mid',(y-120)/48) if y<168 else mix('hair_mid','hair_tip',(y-168)/65)
        attach(skin,'hair_back',mesh(tag+'_backhair',back,hair_weight,16))
        attach(skin,'hair_sides',mesh(tag+'_sidehair',sides,hair_weight,16))
    shirt_poly=[(224,neckline-6),(302,neckline-6),(324,195),(371,250),(416,wrist+3),(395,wrist+32),
                (373,wrist+1),(331,265),(333,333 if offset else 309),(291,357 if offset else 309),
                (235,353 if offset else 309),(197,332 if offset else 309),(198,268),
                (146,wrist+17),(111,wrist-2),(150,263),(203,204)]
    shirt=piece(src,shirt_poly)
    pants=piece(src,[(194,298),(331,298),(367,558),(291,572),(264,392),(230,571),(164,558)])
    attach(skin,'shirt',mesh(tag+'_shirt',shirt,upper_weight,15))
    attach(skin,'pants',mesh(tag+'_pants',pants,lower_weight,14))
    for side in ('L','R'):
        left=side=='L'
        shoe=piece(src,[(154,543),(239,543),(243,633),(151,633)] if left else [(281,543),(373,543),(373,633),(281,633)])
        glove=piece(src,[(112,wrist-11),(147,wrist+9),(117,366),(74,370),(73,338)] if left else
                         [(415,wrist-11),(379,wrist+10),(408,369),(455,371),(456,336)])
        attach(skin,f'shoe_{side}',mesh(f'{tag}_shoe_{side}',shoe,fixed(f'foot_{side}'),100))
        attach(skin,f'glove_{side}',mesh(f'{tag}_glove_{side}',glove,fixed(f'hand_{side}'),100))
        for key, item in [('shoe',shoe),('glove',glove)]:
            recolor=ImageEnhance.Color(item).enhance(.15)
            recolor=ImageEnhance.Brightness(recolor).enhance(1.25)
            anchor=f'foot_{side}' if key=='shoe' else f'hand_{side}'
            attach(skin,f'{key}_{side}',region(f'{tag}_{key}_{side}_silver',recolor,anchor),'silver')

for side,s in [('L',-1),('R',1)]:
    bracelet=layer()
    bx,by=origins[f'wrist_{side}']
    d=ImageDraw.Draw(bracelet)
    d.ellipse((bx-10,by-6,bx+10,by+6),fill='#512f24',outline='#f6cd7b',width=2)
    d.polygon([(bx,by-8),(bx+5,by),(bx,by+5),(bx-5,by)],fill='#76dcca',outline='#e9ffeb')
    attach('default',f'bracelet_{side}',region('bracelet_'+side,bracelet,f'wrist_{side}'),'gold')

def bezier(a,b,c,d,n=22):
    return [tuple(round((1-u)**3*a[k]+3*(1-u)**2*u*b[k]+3*(1-u)*u*u*c[k]+u**3*d[k],2)
                  for k in (0,1)) for u in [i/n for i in range(n+1)]]

for character, palette in [('Uiji',('#2c1731','#8d3154','#e6b96d')),('Useoi',('#441b27','#c44634','#f7b75d'))]:
    for side,s in [('L',-1),('R',1)]:
        cape=layer()
        d=ImageDraw.Draw(cape)
        def mirror(points):
            return [(OX+s*x,y) for x,y in points]
        shape=bezier((15,194),(53,193),(106,181),(156,151))+bezier((156,151),(139,190),(184,241),(202,288))+bezier((202,288),(148,279),(118,335),(47,316))+bezier((47,316),(30,273),(33,229),(15,194))
        d.polygon(mirror(shape),fill=palette[0])
        d.line(mirror(shape+[shape[0]]),fill=palette[2],width=3,joint='curve')
        panels=[[(31,198),(150,156),(165,237),(100,271)],[(40,213),(100,271),(75,323),(48,311)],[(164,240),(197,284),(153,290),(103,305)]]
        for points in panels:
            d.polygon(mirror(points),fill=palette[1])
        for tip in [(93,313),(149,289),(192,283)]:
            d.line(mirror(bezier((48,195),(79,216),(tip[0]-23,tip[1]-28),tip)),fill=palette[2],width=1)
        weight=lambda x,y: mix(f'cape_root_{side}',f'cape_mid_{side}',(abs(x-OX)-34)/50) if abs(x-OX)<84 else mix(f'cape_mid_{side}',f'cape_tip_{side}',(abs(x-OX)-84)/63)
        data=mesh(f'{character.lower()}_cape_{side}',cape,weight,16)
        attach('default' if character=='Uiji' else character,f'cape_{side}',data)
        attach('default',f'cape_{side}',empty,'none')

helmet=layer()
d=ImageDraw.Draw(helmet)
for shape,fill,edge in [((184,24,342,149),'#242d42','#ddae61'),((190,23,336,110),'#795945','#ecc67e'),
                        ((190,65,335,121),'#342b38','#d4af70')]:
    d.rounded_rectangle(shape, radius=32, fill=fill, outline=edge,width=4)
d.rounded_rectangle((205,101,321,158),radius=18,fill=(0,0,0,0))
d.line([(205,141),(205,115),(215,101),(310,101),(321,114),(321,141)],fill='#edc67c',width=3)
for x in (195,328):
    d.ellipse((x-6,114,x+6,128),fill='#47394b',outline='#ecc878',width=2)
frog=layer()
d=ImageDraw.Draw(frog)
d.rounded_rectangle((186,43,340,176),radius=46,fill='#385e47',outline='#162e32',width=5)
for x in (218,307):
    d.ellipse((x-26,37,x+26,91),fill='#679b50',outline='#183b34',width=4)
    d.ellipse((x-11,51,x+11,73),fill='#f6dfa0')
    d.ellipse((x-5,54,x+6,71),fill='#222832')
d.rounded_rectangle((199,85,328,161),radius=25,fill='#273d42',outline='#95c45d',width=4)
d.arc((225,106,305,141),5,175,fill='#b6df98',width=3)
for x in (214,311):
    d.ellipse((x-4,124,x+4,129),fill='#e1ad83')
helmet_data=region('explorer_helmet',helmet,'head')
frog_data=region('frog_mask',frog,'head')
for c in ('Uiji','Useoi'):
    for mode in ('Helmet','Frog'):
        skin=f'{c} {mode}'
        base='default' if c=='Uiji' else c
        skins[skin]={key:dict(values) for key,values in skins[base].items()}
        attach(skin,'helmet',helmet_data if mode=='Helmet' else frog_data)
        attach(skin,'hair_front',empty)
        if mode=='Frog':
            for key in ('face','hair_sides','hair_back'):
                attach(skin,key,empty)

animations={}
def clip(name, duration, poses, flip=1):
    data={}
    def track(bone_name,values):
        data.setdefault(bone_name,{})['rotate']=[
            dict(time=round(duration*t,4),value=round(v,3))
            for (t,*_),v in zip(poses,values)]
    # Pose columns: roll, arm spread, elbow flex, leg spread, knee flex, cape fold, lift.
    for side,sign in [('L',-1),('R',1)]:
        track(f'upper_{side}',[sign*p[2] - flip*abs(p[1])*.22 for p in poses])
        track(f'elbow_{side}',[-sign*p[3] for p in poses])
        track(f'wrist_{side}',[sign*min(11,p[3]*.22) for p in poses])
        track(f'thigh_{side}',[sign*p[4] - flip*abs(p[1])*.52 for p in poses])
        track(f'knee_{side}',[-sign*min(p[5],28) for p in poses])
        track(f'ankle_{side}',[sign*min(13,p[5]*.22) for p in poses])
        track(f'cape_root_{side}',[-sign*p[6] for p in poses])
        track(f'cape_mid_{side}',[-sign*p[6]*.35 + 4*math.sin(math.tau*p[0]) for p in poses])
        data[f'cape_root_{side}']['scale']=[dict(time=round(duration*p[0],4),x=round(1-p[6]/104,4),y=1)
                                            for p in poses]
    track('root',[flip*p[1] for p in poses])
    track('chest',[-flip*p[1]*.14 for p in poses])
    track('neck',[-flip*p[1]*.23 for p in poses])
    track('head',[-flip*p[1]*.10 for p in poses])
    track('hair_mid',[flip*p[1]*-.35+7*math.sin(math.tau*p[0]) for p in poses])
    track('hair_tip',[flip*p[1]*-.23+8*math.sin(math.tau*p[0]-.5) for p in poses])
    data['root']['translate']=[dict(time=round(duration*p[0],4),x=round(flip*p[8],2),y=p[7]) for p in poses]
    animations[name]={'bones':data}

clip('01_Cape_Glide',1.24,[(0,-4,51,31,13,21,0,0,0),(.25,3,56,38,15,26,3,5,0),(.5,4,49,32,12,18,0,1,0),(.75,-3,53,34,15,23,3,-3,0),(1,-4,51,31,13,21,0,0,0)])
clip('02_Fast_Drop',.86,[(0,8,-17,45,10,12,54,0,0),(.3,10,-19,51,10,15,60,3,0),(.65,6,-15,47,10,11,56,-3,0),(1,8,-17,45,10,12,54,0,0)])
jump=[(0,-4,49,28,15,22,2,0,0),(.15,-19,16,50,19,52,16,-8,-30),(.30,-29,-7,67,29,62,35,-10,-54),
      (.43,25,35,27,34,24,25,11,-25),(.65,37,50,18,19,21,10,31,20),(.83,10,57,25,15,30,3,17,24),(1,-4,51,31,13,21,0,0,0)]
clip('03_Wall_Kick_Left',.72,jump)
clip('04_Wall_Kick_Right',.72,jump,-1)

atlas=Image.new('RGBA',(2048,2048))
lines=['hell-drop.png','size: 2048,2048','filter: Linear,Linear','pma: false']
layout={}
x=y=2
row=0
for name,im in textures.items():
    w,h=im.size
    if x+w+2>atlas.width:
        x,y,row=2,y+row+4,0
    assert y+h+2<=atlas.height
    atlas.alpha_composite(im,(x,y))
    lines.extend([name,f'  bounds: {x},{y},{w},{h}'])
    layout[name]=[x,y,w,h]
    x+=w+4
    row=max(row,h)

project=dict(skeleton=dict(spine='4.2.0',x=-210,y=-330,width=420,height=650,fps=30),
             bones=bones,slots=slots,skins=[dict(name=name,attachments=value) for name,value in skins.items()],
             animations=animations)
(OUT/'hell-drop.json').write_text(json.dumps(project,separators=(',',':')),encoding='utf-8')
(OUT/'hell-drop.atlas').write_text('\n'.join(lines)+'\n',encoding='utf-8')
atlas.save(OUT/'hell-drop.png')
(OUT/'layout.json').write_text(json.dumps(layout),encoding='utf-8')
with zipfile.ZipFile(OUT/'mesh-export.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in ('hell-drop.json','hell-drop.atlas','hell-drop.png'):
        z.write(OUT/name,name)

if (OUT/'.rigby-tools'/'interop.js').exists():
    from io import BytesIO
    converter = """
import fs from 'node:fs';
import {readSkeletonJson} from './.rigby-tools/interop.js';
const result=readSkeletonJson(JSON.parse(fs.readFileSync('hell-drop.json','utf8')),'Hell Drop');
if (result.warnings.length) throw Error(result.warnings.join(' | '));
fs.writeFileSync('project.json',result.skeleton.toJson());
"""
    subprocess.run(['node','--input-type=module','-e',converter],cwd=OUT,check=True)
    with zipfile.ZipFile(OUT/'hell-drop.rigby','w',zipfile.ZIP_DEFLATED) as z:
        z.write(OUT/'project.json','project.json')
        for name,image in textures.items():
            png=BytesIO()
            image.save(png,format='PNG')
            z.writestr(f'images/{name}.png',png.getvalue())

if (OUT/'review-template.html').exists():
    import base64
    data=dict(skeleton=project,atlas=layout,image='data:image/png;base64,'+
              base64.b64encode((OUT/'hell-drop.png').read_bytes()).decode('ascii'))
    html=(OUT/'review-template.html').read_text(encoding='utf-8')
    (OUT/'review.html').write_text(html.replace('/* RIG_DATA */',json.dumps(data,separators=(',',':'))),
                                   encoding='utf-8')
