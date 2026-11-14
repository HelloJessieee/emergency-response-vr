from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path(__file__).parent / 'SecondChance' / 'Assets' / 'Diagrams'
OUT.mkdir(parents=True, exist_ok=True)
S = 3
W = 512
FONT = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
WHITE = (245, 250, 250, 255)
TEAL = (72, 235, 205, 255)
AMBER = (255, 190, 83, 255)
MUTED = (128, 167, 171, 255)
DARK = (8, 23, 30, 236)

def p(v): return round(v * S)

def canvas():
    im = Image.new('RGBA', (p(W), p(W)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    return im, d

def ln(d, pts, c=WHITE, w=8):
    d.line([(p(x), p(y)) for x, y in pts], fill=c, width=p(w), joint='curve')

def ell(d, box, c=WHITE, w=8, fill=None):
    d.ellipse(tuple(p(x) for x in box), outline=c, width=p(w), fill=fill)

def rr(d, box, c=WHITE, w=8, rad=12, fill=None):
    d.rounded_rectangle(tuple(p(x) for x in box), radius=p(rad), outline=c, width=p(w), fill=fill)

def tx(d, xy, txt, size, color=WHITE):
    font = ImageFont.truetype(FONT, p(size))
    d.text(tuple(p(x) for x in xy), txt, font=font, fill=color, anchor='mm')

def manikin(d, highlight=False, hands=False, press=False):
    ell(d, (231, 165, 281, 215), WHITE, 7)
    rr(d, (194, 226, 318, 313), WHITE, 7, 25)
    ln(d, [(194, 240), (170, 265), (164, 296)], MUTED, 7)
    ln(d, [(318, 240), (342, 265), (348, 296)], MUTED, 7)
    ell(d, (210, 234, 232, 256), TEAL if highlight else MUTED, 5, TEAL if highlight else None)
    ell(d, (280, 234, 302, 256), TEAL if highlight else MUTED, 5, TEAL if highlight else None)
    if hands:
        ell(d, (239, 256, 273, 290), TEAL, 5)
        ln(d, [(211, 272 + (8 if press else 0)), (256, 272 + (8 if press else 0)), (300, 272 + (8 if press else 0))], TEAL, 11)
        ln(d, [(224, 260 + (8 if press else 0)), (256, 260 + (8 if press else 0)), (288, 260 + (8 if press else 0))], WHITE, 10)

# 1: check and highlighted shoulders
im,d = canvas()
manikin(d, highlight=True)
ln(d, [(104, 216), (153, 216), (197, 243)], TEAL, 5)
ln(d, [(408, 216), (359, 216), (315, 243)], TEAL, 5)
for x in (99, 406): ell(d, (x-8,208,x+8,224), TEAL, 3, TEAL)
im.resize((W,W), Image.Resampling.LANCZOS).save(OUT/'check.png')

# 2a: phone; 2b: AED arrives
im,d = canvas()
rr(d, (179,166,333,316), TEAL, 8, 22)
rr(d, (194,183,318,287), MUTED, 3, 7)
tx(d,(256,235),'911',57,WHITE)
ell(d,(246,296,266,310),TEAL,3,TEAL)
im.resize((W,W), Image.Resampling.LANCZOS).save(OUT/'call.png')

im,d = canvas()
rr(d,(157,177,355,302),TEAL,8,21)
ell(d,(181,193,221,233),TEAL,5)
ln(d,[(201,188),(201,209)],TEAL,5)
tx(d,(270,220),'AED',42,WHITE)
rr(d,(183,247,232,280),MUTED,4,7)
rr(d,(280,247,329,280),MUTED,4,7)
im.resize((W,W), Image.Resampling.LANCZOS).save(OUT/'call_aed.png')

# 3: close-up hands and chest target
im,d = canvas()
rr(d,(143,169,369,318),WHITE,7,38)
ell(d,(229,217,283,271),TEAL,5)
ln(d,[(168,245),(232,245),(292,245),(344,245)],TEAL,15)
ln(d,[(186,225),(252,225),(326,225)],WHITE,14)
ln(d,[(256,189),(256,208)],AMBER,5)
im.resize((W,W), Image.Resampling.LANCZOS).save(OUT/'hands.png')

# 4: compress, two animation frames
for press in (False,True):
    im,d = canvas()
    manikin(d,hands=True,press=press)
    y=238 if press else 214
    ln(d,[(365,y),(365,y+52)],AMBER,7)
    ln(d,[(350,y+39),(365,y+54),(380,y+39)],AMBER,7)
    im.resize((W,W), Image.Resampling.LANCZOS).save(OUT/('compress_down.png' if press else 'compress_up.png'))

# 5: AED power, pads, and CPR continuation
im,d = canvas()
rr(d,(88,180,247,307),TEAL,8,20)
ell(d,(108,198,149,239),TEAL,5)
ln(d,[(129,190),(129,219)],TEAL,5)
tx(d,(176,272),'AED',34,WHITE)
rr(d,(290,194,340,236),WHITE,5,9)
rr(d,(355,245,405,287),WHITE,5,9)
ln(d,[(248,248),(280,216)],MUTED,4)
ln(d,[(247,274),(348,266)],MUTED,4)
ln(d,[(306,309),(356,309)],AMBER,5)
ln(d,[(344,299),(357,309),(344,319)],AMBER,5)
im.resize((W,W), Image.Resampling.LANCZOS).save(OUT/'aed.png')
print('Created',len(list(OUT.glob('*.png'))),'instructional illustrations in',OUT)
