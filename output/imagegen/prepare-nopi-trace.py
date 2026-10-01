from pathlib import Path
from PIL import Image
import numpy as np
from collections import deque

root = Path(__file__).parent
arr = np.array(Image.open(root/'nopi-hello-trace-source.png').convert('RGBA'))
rgb=arr[:,:,:3].astype(float)
alpha=arr[:,:,3]
dark=(rgb.mean(axis=2)<185)&(alpha>100)
def components(mask):
    seen=np.zeros(mask.shape,bool); found=[]
    for y,x in zip(*np.where(mask)):
        if seen[y,x]:continue
        q=deque([(y,x)]);seen[y,x]=True; coords=[]
        while q:
            py,px=q.popleft();coords.append((py,px))
            for dy,dx in [(0,1),(0,-1),(1,0),(-1,0)]:
                ny,nx=py+dy,px+dx
                if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=True;q.append((ny,nx))
        found.append(coords)
    return sorted(found,key=len,reverse=True)
for c in components(dark)[:20]:
    pts=np.array(c);print(len(c),pts.min(axis=0).tolist(),pts.max(axis=0).tolist())
shadow=(rgb[:,:,2]>rgb[:,:,0]+7)&(rgb.mean(axis=2)>160)
for name,mask in [('outline',dark),('silhouette',(alpha>128)&~shadow)]:
    comps=components(mask)
    selected=comps[:1] if name=='silhouette' else [c for c in comps if len(c)>3]
    cleaned=np.zeros(mask.shape,bool)
    for c in selected:
        pts=np.array(c);cleaned[pts[:,0],pts[:,1]]=True
    img=np.where(cleaned,0,255).astype('uint8')
    Image.fromarray(img).save(root/f'nopi-trace-{name}.png')
pink=(rgb[:,:,0]>rgb[:,:,1]+12)&(rgb[:,:,0]>rgb[:,:,2]+4)&(alpha>128)
for c in components(pink)[:4]:
    pts=np.array(c);print('pink',len(c),pts.mean(axis=0).tolist(),pts.min(axis=0).tolist(),pts.max(axis=0).tolist())
