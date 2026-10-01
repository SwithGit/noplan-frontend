from pathlib import Path
from io import BytesIO
import json
from PIL import Image, ImageCms
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DictionaryObject, NameObject, NumberObject, TextStringObject, ArrayObject, DecodedStreamObject, RectangleObject

WORK=Path(__file__).resolve().parent
ROOT=WORK.parents[2]
OUT=ROOT/'output/pdf/noplan-a4-trifold'
ASSETS=ROOT/'output/imagegen'
OUT.mkdir(parents=True,exist_ok=True)
PROFILE=Path('C:/Program Files (x86)/Common Files/Adobe/Color/Profiles/Recommended/JapanColor2001Coated.icc')
SRGB=ImageCms.createProfile('sRGB')
CMYK=ImageCms.getOpenProfile(str(PROFILE))
TRANSFORM=ImageCms.buildTransformFromOpenProfiles(SRGB,CMYK,'RGB','CMYK',renderingIntent=1,flags=ImageCms.Flags.BLACKPOINTCOMPENSATION)
pdfmetrics.registerFont(TTFont('Malgun','C:/Windows/Fonts/malgun.ttf'))
pdfmetrics.registerFont(TTFont('MalgunBold','C:/Windows/Fonts/malgunbd.ttf'))
W,H=303*mm,216*mm
CACHE={}

def converted(image):
    if isinstance(image,(str,Path)): image=Image.open(image)
    if image.mode=='RGBA':
        bg=Image.new('RGB',image.size,'white');bg.paste(image,mask=image.getchannel('A'));image=bg
    return ImageCms.applyTransform(image.convert('RGB'),TRANSFORM)

def color(c,hexvalue,stroke=False):
    if hexvalue not in CACHE:
        rgb=tuple(int(hexvalue.lstrip('#')[i:i+2],16) for i in (0,2,4))
        CACHE[hexvalue]=tuple(v/255 for v in converted(Image.new('RGB',(1,1),rgb)).getpixel((0,0)))
    (c.setStrokeColorCMYK if stroke else c.setFillColorCMYK)(*CACHE[hexvalue])

def X(x):return (x+3)*mm
def Y(y):return (213-y)*mm
def rect(c,x,y,w,h,fill,stroke=None,r=0):
    color(c,fill)
    if stroke:color(c,stroke,True);c.setLineWidth(.18*mm)
    if r:c.roundRect(X(x),Y(y+h),w*mm,h*mm,r*mm,stroke=bool(stroke),fill=1)
    else:c.rect(X(x),Y(y+h),w*mm,h*mm,stroke=bool(stroke),fill=1)
def text(c,x,y,value,size=8,bold=False,fill='#605178',width=None):
    font='MalgunBold' if bold else 'Malgun'
    if width:
        size=min(size,width*mm/pdfmetrics.stringWidth(value,font,1))
    c.setFont(font,size);color(c,fill);c.drawString(X(x),Y(y),value)
def image(c,img,x,y,w,h):
    c.drawImage(ImageReader(converted(img)),X(x),Y(y+h),w*mm,h*mm)

raw=WORK/'print-unboxed.pdf'
c=canvas.Canvas(str(raw),pagesize=(W,H),pageCompression=1,pdfVersion=(1,4))
c.setTitle('NoPlan Expo - A4 6-panel roll-fold - Outside / Inside')
c.setAuthor('NoPlan / 앤오피')
c.setSubject('A4 297x210 mm, 3 mm bleed, outside 97/100/100 mm, inside 100/100/97 mm')

# PAGE 1: outside. Left + middle are one continuous game image.
rect(c,-3,-3,203,216,'#fbf9ff')
rect(c,-3,-3,203,30,'#ffffff')
text(c,7,7.5,'NOPLAN / FIND NOPI',6.8,True,'#8058d4')
text(c,7,16.7,'숨은 노피 5마리를 찾아라!',16.2,True,'#24194e',width=85)
text(c,7,23.0,'그림 속에서 찾고, 행사장에서 만나보세요.',7.3,False,'#7b6d92',width=85)
text(c,105,15.7,'다섯 노피, 다섯 스탬프',10.3,True,'#7556bf')
text(c,105,22.6,'모두 모았다면 노플랜 부스로!',7.5,False,'#89769f')
mapimg=Image.open(ASSETS/'noplan-festival-hidden-nopi.png').convert('RGB')
map_y=28.5;map_h=197*mapimg.height/mapimg.width
image(c,mapimg,0,map_y,197,map_h)
image(c,mapimg.crop((0,0,1,mapimg.height)),-3,map_y,3,map_h)
text(c,7,167.5,'그림에서 찾고, 현장에서 만나요',9.0,True,'#48356f',width=85)
text(c,104,167.5,'스탬프를 모아 굿즈를 받아요',9.0,True,'#48356f',width=87)
steps=[
 (7,40,'01','그림에서 찾기',['행사 부스 속 노피','5마리를 찾아요.']),
 (51,40,'02','현장 스팟 찾기',['각 노피마다 QR코드를','갖고 있어요!','직접 찍어보아요.']),
 (104,41,'03','스탬프 찍기',['노피를 찍을 때마다','스탬프를 찍을 수 있어요.']),
 (149,41,'04','부스에서 인증',['5개의 스탬프를 모두 모아','부스에서 굿즈를','받아주세요.']),
]
for x,w,num,title,body in steps:
    rect(c,x,172.0,w,31.5,'#ffffff','#e6dcf6',r=2.5)
    color(c,'#855ae0');c.circle(X(x+5.1),Y(178.1),2.35*mm,stroke=0,fill=1)
    c.setFont('MalgunBold',5.7);c.setFillColorCMYK(0,0,0,0)
    c.drawCentredString(X(x+5.1),Y(178.8),num)
    text(c,x+9.1,179.0,title,7.6,True,'#392759',width=w-12)
    for j,line in enumerate(body):text(c,x+3.0,186.2+j*4.45,line,7.0,False,'#736183',width=w-6)

# Cover is the approved artwork, with the event QR updated. Preserve aspect ratio.
cover=Image.open(WORK/'cover-event.png').convert('RGB')
cover_w=210*600/1273
cover_x=197+(100-cover_w)/2
image(c,cover,cover_x,0,cover_w,210)
image(c,cover.crop((0,0,1,cover.height)),197,0,cover_x-197,210)
image(c,cover.crop((cover.width-1,0,cover.width,cover.height)),cover_x+cover_w,0,300-(cover_x+cover_w),210)
image(c,cover.crop((0,0,cover.width,1)),197,-3,103,3)
image(c,cover.crop((0,cover.height-1,cover.width,cover.height)),197,210,103,3)

# Replace raster QR modules with sharp 100K vector modules and a full quiet zone.
qr=json.loads((WORK/'event-qr.json').read_text('utf8'))
scale=210/1273
qx,qy,qsize=cover_x+62*scale,988*scale,122*scale
rect(c,qx,qy,qsize,qsize,'#ffffff')
n=len(qr['modules'])+8;unit=qsize/n
c.setFillColorCMYK(0,0,0,1)
for row,values in enumerate(qr['modules']):
    for col,on in enumerate(values):
        if on:c.rect(X(qx+(col+4)*unit),Y(qy+(row+5)*unit),unit*mm,unit*mm,fill=1,stroke=0)
c.showPage()

# PAGE 2: inside. Reflow only the panel widths to the printer's fold dimensions.
inside=Image.open(WORK/'inside-clean.png').convert('RGB')
for i,(x,w) in enumerate([(0,100),(100,100),(200,97)]):
    panel=inside.crop((i*497,0,(i+1)*497,1055))
    image(c,panel,x,0,w,210)
    image(c,panel.crop((0,0,497,1)),x,-3,w,3)
    image(c,panel.crop((0,1054,497,1055)),x,210,w,3)
image(c,inside.crop((0,0,1,1055)),-3,0,3,210)
image(c,inside.crop((1490,0,1491,1055)),297,0,3,210)
rect(c,-3,-3,3,3,'#ffffff');rect(c,297,-3,3,3,'#ffffff')
image(c,inside.crop((0,1054,1,1055)),-3,210,3,3)
image(c,inside.crop((1490,1054,1491,1055)),297,210,3,3)
c.showPage();c.save()

# Set physical trim/bleed boxes and embed the actual CMYK output profile.
reader=PdfReader(str(raw));writer=PdfWriter()
for page in reader.pages:
    page.trimbox=RectangleObject([3*mm,3*mm,300*mm,213*mm])
    page.bleedbox=RectangleObject([0,0,W,H])
    page.cropbox=RectangleObject([0,0,W,H])
    writer.add_page(page)
icc=DecodedStreamObject();icc.set_data(PROFILE.read_bytes());icc[NameObject('/N')]=NumberObject(4)
icc_ref=writer._add_object(icc)
intent=DictionaryObject({NameObject('/Type'):NameObject('/OutputIntent'),NameObject('/S'):NameObject('/GTS_PDFX'),NameObject('/OutputConditionIdentifier'):TextStringObject('Japan Color 2001 Coated'),NameObject('/Info'):TextStringObject('Japan Color 2001 Coated - CMYK production artwork'),NameObject('/DestOutputProfile'):icc_ref})
writer._root_object[NameObject('/OutputIntents')]=ArrayObject([writer._add_object(intent)])
writer.add_metadata({'/Title':'NoPlan A4 3단 접지 - 1 바깥면 / 2 안쪽면','/Author':'앤오피','/Subject':'Trim 297x210 mm; bleed 3 mm; outside 97/100/100 mm; inside 100/100/97 mm; event QR https://noplan.live/event'})
final=OUT/'noplan-a4-trifold-print.pdf'
with final.open('wb') as f:writer.write(f)
(WORK/'layout.json').write_text(json.dumps({'trim_mm':[297,210],'media_mm':[303,216],'bleed_mm':3,'outside_folds_mm':[97,197],'inside_folds_mm':[100,200],'qr_url':qr['url'],'qr_top_left_mm':[qx,qy],'qr_size_mm':qsize,'map_source_ppi':mapimg.width/(197/25.4),'inside_source_ppi':inside.width/(297/25.4),'cmyk_profile':'Japan Color 2001 Coated'},ensure_ascii=False,indent=2),encoding='utf8')
print(final)
print('Two CMYK pages, embedded Korean fonts, vector event QR, TrimBox/BleedBox and output ICC profile.')
