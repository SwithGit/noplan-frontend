from pathlib import Path
from PIL import Image, ImageCms, ImageDraw, ImageFont
from pypdf import PdfReader
import json,zipfile

WORK=Path(__file__).resolve().parent
ROOT=WORK.parents[2]
OUT=ROOT/'output/pdf/noplan-a4-trifold'
profile=Path('C:/Program Files (x86)/Common Files/Adobe/Color/Profiles/Recommended/JapanColor2001Coated.icc')
srgb=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB'))
cmyk=ImageCms.getOpenProfile(str(profile))
transform=ImageCms.buildTransformFromOpenProfiles(srgb,cmyk,'RGB','CMYK',renderingIntent=1,flags=ImageCms.Flags.BLACKPOINTCOMPENSATION)
trimmed=[]
for i,name in [(1,'outside'),(2,'inside')]:
    rendered=Image.open(WORK/f'print300-{i}.png').convert('RGB')
    bleed=rendered.resize((3579,2551),Image.Resampling.LANCZOS)
    crop=(round(3/303*3579),round(3/216*2551),round(300/303*3579),round(213/216*2551))
    trim=bleed.crop(crop).resize((3508,2480),Image.Resampling.LANCZOS)
    trim.save(OUT/f'{i:02d}-{name}-A4-300ppi.png',dpi=(300,300),icc_profile=srgb.tobytes())
    ImageCms.applyTransform(bleed,transform).save(OUT/f'{i:02d}-{name}-bleed3mm-CMYK.tif',compression='tiff_lzw',dpi=(300,300),icc_profile=profile.read_bytes())
    trimmed.append(trim)

# Non-printing fold guide. Each dashed line is measured from the trimmed edge.
guide=Image.new('RGB',(1400,2180),'#f5f2fb');d=ImageDraw.Draw(guide)
font=lambda n,b=False:ImageFont.truetype('C:/Windows/Fonts/malgunbd.ttf' if b else 'C:/Windows/Fonts/malgun.ttf',n)
d.text((45,22),'노플랜 A4 3단 접지 · 배치 확인용',font=font(35,True),fill='#2b2051')
d.text((47,74),'이 안내 이미지는 인쇄하지 마세요. 실제 인쇄는 동봉된 2페이지 PDF를 사용하세요.',font=font(21),fill='#75628e')
for idx,(title,folds,widths) in enumerate([
    ('1페이지 바깥면 — 찾기 그림 왼쪽 / 찾기 그림 오른쪽 / 표지',[97,197],[97,100,100]),
    ('2페이지 안쪽면 — 취향 선택 / 코스 플래닝 / 문화·행사',[100,200],[100,100,97]),
]):
    top=146+idx*995
    d.text((47,top),title,font=font(25,True),fill='#4b3479')
    thumb=trimmed[idx].resize((1300,919),Image.Resampling.LANCZOS)
    guide.paste(thumb,(50,top+43))
    prev=0
    for j,w in enumerate(widths):
        mid=50+(prev+w/2)/297*1300
        label=f'{w}mm'
        d.text((mid-d.textlength(label,font=font(17))/2,top+23),label,font=font(17),fill='#a34d72')
        prev+=w
    for fold in folds:
        xx=50+round(fold/297*1300)
        for yy in range(top+43,top+962,18):d.line((xx,yy,xx,min(yy+10,top+962)),fill='#d85185',width=2)
guide.save(OUT/'fold-layout-guide-NOT-FOR-PRINT.png')

# Validate the actual production PDF rather than just the working layout.
pdf=PdfReader(OUT/'noplan-a4-trifold-print.pdf')
assert len(pdf.pages)==2
image_modes=[]
for page in pdf.pages:
    assert abs(float(page.trimbox.width)*25.4/72-297)<.01
    assert abs(float(page.trimbox.height)*25.4/72-210)<.01
    assert abs(float(page.mediabox.width)*25.4/72-303)<.01
    assert abs(float(page.mediabox.height)*25.4/72-216)<.01
    for name,obj in page['/Resources'].get('/XObject',{}).items():
        obj=obj.get_object()
        if obj.get('/Subtype')=='/Image':image_modes.append(str(obj.get('/ColorSpace')))
assert image_modes and all(mode=='/DeviceCMYK' for mode in image_modes)
qr=json.loads((WORK/'qr-check.json').read_text('utf8'))
assert qr['passed'] and qr['decoded']==['https://noplan.live/event']
outside_text=pdf.pages[0].extract_text()
for phrase in ['그림에서 찾기','현장 스팟 찾기','스탬프 찍기','부스에서 인증','5마리를 찾아요.','직접 찍어보아요.','스탬프를 찍을 수 있어요.','5개의 스탬프를 모두 모아','받아주세요.']:
    assert phrase in outside_text,phrase
readme='''노플랜 엑스포 A4 3단 접지 — 인쇄소 전달 안내

■ 인쇄할 파일
noplan-a4-trifold-print.pdf
2페이지 양면 원고입니다. 1페이지 바깥면, 2페이지 안쪽면입니다.
접지선/재단선 안내는 실제 인쇄 영역에 그리지 않았습니다.
PDF에 TrimBox(완성 크기)와 BleedBox(도련)가 설정되어 있습니다.

■ 규격
완성 펼침 크기: A4 가로 297 × 210mm
접지: 안으로 접는 3단 접지(6면), 2번 접음
바깥면 왼쪽부터: 97 / 100 / 100mm
안쪽면 왼쪽부터: 100 / 100 / 97mm
도련: 사방 3mm, PDF 페이지 전체 303 × 216mm
인쇄 배율: 100%, 페이지에 맞춤/자동 축소 사용 안 함
컬러: CMYK, Japan Color 2001 Coated 프로파일 포함
인쇄소의 용지/장비 프로파일이 따로 있으면 인쇄소에서 최종 색상 변환해 주세요.

■ 면 배치
바깥면 왼쪽·가운데: 숨은 노피 찾기 그림 하나가 두 면에 이어집니다.
각 면 아래에 참여 안내 2단계씩, 총 4단계를 배치했습니다.
바깥면 오른쪽: 승인된 표지. QR은 표지에만 있습니다.
안쪽면: 취향 선택 → 코스 플래닝 → 문화·행사
접힌 완성본에서 표지가 바깥에 오도록 앞뒤 방향을 확인해 주세요.

■ QR
https://noplan.live/event
인쇄 PDF를 300ppi로 렌더링한 결과에서 이 주소가 실제 판독되는 것을 확인했습니다.
현장 노피별 스탬프 QR 5종이나 이벤트 웹페이지 구현은 이 인쇄 작업에 포함되지 않습니다.

■ 포토샵용 파일
01-outside-A4-300ppi.png / 02-inside-A4-300ppi.png
  - 재단 완료 크기 3508 × 2480px, 300ppi, sRGB
01-outside-bleed3mm-CMYK.tif / 02-inside-bleed3mm-CMYK.tif
  - 도련 포함 3579 × 2551px, 300ppi, CMYK 프로파일 포함
  - PDF를 렌더링한 평면 이미지입니다. 원본 인쇄에는 PDF 사용을 권장합니다.
fold-layout-guide-NOT-FOR-PRINT.png
  - 접히는 선과 면 배치를 확인하는 안내용이며 인쇄하지 않습니다.

■ 원본 이미지 해상도
숨은 노피 지도: 배치 크기 기준 약 198ppi
안쪽 모바일 UI 이미지: A4 배치 기준 약 128ppi
원본 이미지는 승인된 내용 그대로 유지했습니다. 300ppi 파일 출력으로 원본의 세부 정보가 복원되지는 않습니다.
특히 안쪽 휴대폰 화면의 작은 글자/사진은 원본 이미지 해상도에 따른 선명도 한계가 있습니다.
새로 넣은 바깥면 참여 안내는 PDF 글자, 표지 QR은 벡터로 제작했습니다.
'''
(OUT/'인쇄소_전달안내.txt').write_text(readme,encoding='utf-8-sig')
report={'pdf_pages':2,'trim_mm':[297,210],'bleed_mm':3,'CMYK_images':len(image_modes),'qr_decoded':qr['decoded'],'required_instruction_text':'passed','visual_check':'Outside and inside PDF raster proofs inspected','source_resolution_ppi':{'map':198,'inside':128}}
(WORK/'preflight.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
archive=OUT.parent/'noplan-a4-trifold-print-package.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in sorted(OUT.iterdir()):
        if p.is_file():z.write(p,arcname=f'noplan-a4-trifold/{p.name}')
print(json.dumps(report,ensure_ascii=False))
print(archive)
