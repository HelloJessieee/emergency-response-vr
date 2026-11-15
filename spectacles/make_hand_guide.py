"""Draw the screen 06 ghost-hands guide for the Spectacles Lens.

Writes three white-on-transparent layers into SecondChance/Assets/Diagrams:
  hand_guide_bottom.png  bottom (left) hand, palm down
  hand_guide_top.png     top (right) hand, palm down, fingers interlaced
  hand_guide_heel.png    ring that marks where the heel of the bottom hand goes

The Lens tints each layer at runtime (neutral, amber, green), so one white
image per layer covers every state and each hand can be highlighted alone.

Scale: 32 px per cm. The hand layers are 640 x 768 px = 20 x 24 cm and are
viewed from above with the fingers pointing away from the wearer (image top).
The heel of the bottom hand sits at HEEL_PX; SecondChanceDisplay.js uses
HEEL_OFFSET_CM to put that point on the virtual chest centre.
Kept separate from make_diagrams.py so regenerating the guide never rewrites
the lesson illustrations.
"""
import math
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT = Path(__file__).parent / 'SecondChance' / 'Assets' / 'Diagrams'
S = 2                         # supersampling factor
W, H = 640, 768               # final size in px (20 x 24 cm)
PX_PER_CM = 32
HEEL_PX = (320, 700)          # heel of the bottom hand, final px
HEEL_OFFSET_CM = (H / 2 - HEEL_PX[1]) / PX_PER_CM   # -9.875 cm from centre

def p(v):
    return round(v * S)

def capsule(d, start, angle_deg, length, width):
    """Fill a rounded finger on a mask: start is the base centre, angle 0 is up."""
    a = math.radians(angle_deg)
    end = (start[0] + math.sin(a) * length, start[1] - math.cos(a) * length)
    r = width / 2
    d.line([(p(start[0]), p(start[1])), (p(end[0]), p(end[1]))], fill=255, width=p(width))
    for c in (start, end):
        d.ellipse((p(c[0] - r), p(c[1] - r), p(c[0] + r), p(c[1] + r)), fill=255)

def hand(mirror, shift_x, outline_alpha, fill_alpha, line):
    """Palm-down hand seen from above, heel at HEEL_PX, fingers up.

    Drawn as one silhouette with a single outline, so overlapping shapes leave
    no internal lines. mirror=False is a left hand (thumb on the right when
    palm down); mirror=True is a right hand (thumb on the left).
    """
    mask = Image.new('L', (p(W), p(H)), 0)
    d = ImageDraw.Draw(mask)
    # HEEL_PX is the heel pad; the palm edge sits a little nearer the wearer.
    cx, heel_y = HEEL_PX[0] + shift_x, HEEL_PX[1] + 24
    sx = -1 if mirror else 1
    palm_w, palm_h = 260, 290
    top = heel_y - palm_h
    # Little finger to index finger, left to right for a left hand. The gaps
    # between finger capsules keep the four fingers readable.
    for dx, length, angle in [(-98, 160, -8), (-33, 212, -2), (32, 232, 2), (96, 206, 8)]:
        capsule(d, (cx + sx * dx, top + 30), sx * angle, length, 54)
    capsule(d, (cx + sx * 112, heel_y - 118), sx * 50, 160, 62)  # thumb
    d.rounded_rectangle((p(cx - palm_w / 2), p(top), p(cx + palm_w / 2), p(heel_y)),
                        radius=p(80), fill=255)
    edge = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(p(line) | 1)), mask)
    alpha = ImageChops.add(mask.point(lambda v: v * fill_alpha // 255),
                           edge.point(lambda v: v * outline_alpha // 255))
    im = Image.new('RGBA', mask.size, (255, 255, 255, 0))
    im.putalpha(alpha)
    return im

def save(im, name):
    im.resize((im.width // S, im.height // S), Image.Resampling.LANCZOS).save(OUT / name)

OUT.mkdir(parents=True, exist_ok=True)
# Bottom hand: dimmer, so the top hand reads as lying over it.
save(hand(False, 0, 200, 40, 9), 'hand_guide_bottom.png')
# Top hand: brighter, shifted half a finger so the fingers interlace.
save(hand(True, 32, 255, 70, 11), 'hand_guide_top.png')

# Heel ring: 256 px drawn at 5 cm in the Lens (about 51 px per cm).
R = 256
im = Image.new('RGBA', (p(R), p(R)), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.ellipse((p(18), p(18), p(R - 18), p(R - 18)), outline=(255, 255, 255, 255), width=p(16))
d.ellipse((p(R / 2 - 16), p(R / 2 - 16), p(R / 2 + 16), p(R / 2 + 16)), fill=(255, 255, 255, 255))
for a in range(0, 360, 90):  # short ticks so the spot reads as a target
    r1, r2 = R / 2 - 58, R / 2 - 36
    x, y = math.sin(math.radians(a)), -math.cos(math.radians(a))
    d.line([(p(R / 2 + x * r1), p(R / 2 + y * r1)), (p(R / 2 + x * r2), p(R / 2 + y * r2))],
           fill=(255, 255, 255, 255), width=p(10))
save(im, 'hand_guide_heel.png')
print(f'Created hand guide layers in {OUT}; heel offset {HEEL_OFFSET_CM:.3f} cm from centre')
