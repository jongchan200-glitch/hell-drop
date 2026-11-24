"""Build synchronized reference and weighted-mesh animations from the pinned game."""
from pathlib import Path
from PIL import Image
from math import sin, pi, degrees
import base64, json, subprocess, zipfile

ROOT=Path(__file__).parent
REF=ROOT/'references'
BASE='0f4505a5a556697af7de49e5d59a589f96cbdc26'
raw=ROOT/'hell-drop.json'
rig=json.loads(raw.read_text(encoding='utf8'))
source=(REF/'game-source.js').read_text(encoding='utf8')
assert 'HOP_SECONDS:.155' in source and 's.hopVisual+dt/.40' in source
atlas=Image.open(REF/'uiji_motion_atlas.webp').convert('RGBA')
assert atlas.size==(2304,2304)

def clamp(x): return min(1,max(0,x))
def smooth(x):
    x=clamp(x)
    return x*x*(3-2*x)

def silhouette(index):
    x,y=index%6*384,index//6*384
    alpha=atlas.crop((x,y,x+384,y+384)).getchannel('A')
    box=alpha.point(lambda a: 255 if a>=140 else 0).getbbox()
    return [box[2]-box[0],box[3]-box[1]]

def tracks(samples):
    result={}
    for time,pose in samples:
        for bone,channels in pose.items():
            for name,values in channels.items():
                result.setdefault(bone,{}).setdefault(name,[]).append(dict(time=round(time,6),**values))
    return {'bones':result}

def set_pose(rot, scale=None, move=None):
    out={k:{'rotate':{'value':round(v,4)}} for k,v in rot.items()}
    for k,(x,y) in (scale or {}).items():
        out.setdefault(k,{})['scale']={'x':round(x,5),'y':round(y,5)}
    for k,(x,y) in (move or {}).items():
        out.setdefault(k,{})['translate']={'x':round(x,5),'y':round(y,5)}
    return out

def pose(hero,mode,t,from_wall,speed,fold):
    kick=from_wall in ('L','R')
    p=clamp(t/.4) if kick else 1
    side=1 if from_wall=='L' else -1
    landing=smooth((p-.65)/.35) if kick else 1
    impact=max(0,1-p/.20)
    travel=smooth((p-.10)/.62)
    wind=clamp((speed-112)/650)
    amt=fold**.57
    bob=-sin(t*(10+fold*10))*(1.2+fold*1.5)/.27
    if hero=='Uiji':
        mult,shift=[(1,0),(1.09,2),(1.23,5)][mode]
        index=int((t*(9.5+wind*5.5)*mult+shift)%12+.5)%12
        width,height=silhouette(mode*12+index)
        mw,mh=silhouette(mode*12)
        pulse=max(-1,min(1,(height-mh)/90))
        roll=sin(t*(4.1+wind*6))*(.012+wind*.018)-clamp(fold*1.08)*.22
        if kick:
            roll+=side*(-.27+.48*smooth(p))*(1-smooth((p-.72)/.28))
        # Targets trace the atlas silhouettes: fists lift above shoulders, then
        # tuck beside chest; knees angle outward with the soles drawn forward.
        arm,elbow,thigh,knee=[(77,23,25,13),(-12,60,17,14),(-7,54,19,15)][mode]
        cape=[2,72,80][mode]
        head=[2,-12,-4][mode]
        bias=(width-mw)/13
        sy=[.80,.88,.86][mode]+pulse*.06
        sx=[1.0,.89,.90][mode]+bias*.012
        bob-=sin(t*(6.2+wind*5.5))*(.75+wind*.6)/.27
        if kick:
            bulge=1+(.095*(1-smooth(p/.20)))-.07*sin(pi*p)
            sx*=bulge
            sy/=bulge
    else:
        # The live game's core is stationary. hero_fall.webp is a reference
        # sheet only: drawHero keeps the cape core even at full boost.
        flap=sin(t*(6+fold*6))*.021*(1-fold)
        cape=degrees(amt*1.64+flap)
        roll=sin(t*5)*fold*.02
        arm,elbow,thigh,knee,head,bias=82-61*amt,24+29*amt,4,8,0,0
        sx,sy=1,.84
        if kick:
            roll=side*((-.20+travel*.46)*(1-landing))
            sx*=1+impact*.09-sin(pi*p)*.045
            sy*=1+impact*.09-sin(pi*p)*.045
    rotations={'root':-degrees(roll),'neck':head*.42,'head':head*.58}
    scales={'root':(sx,sy)}
    moves={'root':(0,bob)}
    for end,s in [('L',-1),('R',1)]:
        rotations[f'upper_{end}']=s*(arm+bias)
        rotations[f'elbow_{end}']=-s*elbow
        rotations[f'thigh_{end}']=s*thigh
        rotations[f'knee_{end}']=-s*knee
        rotations[f'wrist_{end}']=s*min(10,elbow*.2)
        rotations[f'ankle_{end}']=s*min(12,knee*.45)
        rotations[f'cape_root_{end}']=-s*cape
        rotations[f'cape_mid_{end}']=-s*cape*.16
        scales[f'cape_root_{end}']=(max(.45,1-amt*.32),1-amt*.1)
        # Leg length projected toward screen; shoe/ankle stay under this chain.
        scales[f'thigh_{end}']=(1,.79 if hero=='Uiji' else .77)
        if kick and hero=='Useoi':
            # The source holds ONE side-specific kick image until the crossfade.
            # Preserve the opening silhouette through the fade, with no full spin.
            drive=1-landing
            wall=(end==from_wall)
            rotations[f'upper_{end}']+=(s*((133 if wall else 36)-arm))*drive
            rotations[f'elbow_{end}']+=(-s*((37 if wall else 17)-elbow))*drive
            rotations[f'thigh_{end}']+=((s*(105 if wall else 24))-s*thigh)*drive
            rotations[f'knee_{end}']+=(-s*((23 if wall else 11)-knee))*drive
            rotations[f'ankle_{end}']+=s*(8 if wall else 0)*drive
            rotations[f'cape_root_{end}']+=(-side*(44 if wall else 25)+s*cape)*drive
            rotations[f'cape_mid_{end}']+=-side*10*drive
            scales[f'cape_root_{end}']=((.34 if wall else 1.05)*drive+(1-drive),1)
    if hero=='Useoi' and kick:
        # Hair is baked into the original kick image and stays swept during its hold.
        rotations['hair_base']=side*34*(1-landing)
        rotations['hair_mid']=side*30*(1-landing)
        rotations['hair_tip']=side*13*(1-landing)
        scales['head']=(1-.20*(1-landing),1)
        rotations['neck']=side*7*(1-landing)
        rotations['head']=side*4*(1-landing)
    return set_pose(rotations,scales,moves)

clips={}
specs={}
for hero in ('Uiji','Useoi'):
    for label,mode,speed,fold,wall in [('glide',0,112,0,''),('folded',1,550,.85,''),('fast',2,900,1,''),
                                       ('left',0,112,0,'L'),('right',0,112,0,'R')]:
        name=f'{hero}_{label}'
        # Male cycles cover each original cell at the game's sample rate.
        wind=clamp((speed-112)/650)
        duration=.4 if wall else 12/((9.5+wind*5.5)*[1,1.09,1.23][mode]) if hero=='Uiji' else 2*pi/(6+fold*6)
        count=24 if wall else round(duration*60)
        times=[duration*i/count for i in range(count+1)]
        clips[name]=tracks([(t,pose(hero,mode,t,wall,speed,fold)) for t in times])
        specs[name]=dict(duration=duration,speed=speed,fold=fold,wall=wall,count=count)

rig['animations']=clips
dest=ROOT/'motion-reproduction'
dest.mkdir(exist_ok=True)
encoded=json.dumps(rig,separators=(',',':'))
(dest/'hell-drop.json').write_text(encoded,encoding='utf8')
for file in ('hell-drop.atlas','hell-drop.png'):
    (dest/file).write_bytes((ROOT/file).read_bytes())

def segment(first,last):
    return source[source.index(first):source.index(last)]

original=segment('  function prepareCapeRig','  function readRecord')
original+=segment('  function paintSprite','  function drawHelmet')
start=source.index('  function drawHero(')
stop=source.index('\n  }',start)+len('\n  }')
original+=source[start:stop]
assert 'drawLockedCapeSprite' in original and 'if(s.tapPulse' in original
files={'uijiMotion':'uiji_motion_atlas','braking':'hero_cape','falling':'hero_fall','jumpLeft':'hero_jump_left','jumpRight':'hero_jump_right'}
def data(path,mime):
    return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode('ascii')
payload=dict(skeleton=rig, atlas=json.loads((ROOT/'layout.json').read_text()),
             image=data(ROOT/'hell-drop.png','image/png'), specs=specs,
             original={k:data(REF/(n+'.webp'),'image/webp') for k,n in files.items()})
page=(ROOT/'motion-comparison-template.html').read_text(encoding='utf8')
page=page.replace('/* RIG_DATA */',json.dumps(payload,separators=(',',':'))).replace('/* ORIGINAL_DRAW */',original)
(dest/'compare.html').write_text(page,encoding='utf8')

converter="""
import fs from 'node:fs';
import {readSkeletonJson} from './.rigby-tools/interop.js';
const r=readSkeletonJson(JSON.parse(fs.readFileSync('motion-reproduction/hell-drop.json')),'Hell Drop Motion Study');
if(r.warnings.length) throw Error(r.warnings.join(' | '));
fs.writeFileSync('motion-reproduction/project.json',r.skeleton.toJson());
"""
subprocess.run(['node','--input-type=module','-e',converter],cwd=ROOT,check=True)
with zipfile.ZipFile(ROOT/'hell-drop.rigby') as old, zipfile.ZipFile(dest/'hell-drop.rigby','w',zipfile.ZIP_DEFLATED) as new:
    new.writestr('project.json',(dest/'project.json').read_bytes())
    for name in old.namelist():
        if name.startswith('images/'): new.writestr(name,old.read(name))
(dest/'project.json').unlink()
