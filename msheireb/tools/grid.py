import sys, numpy as np
from PIL import Image, ImageDraw
from pyproj import Transformer
sys.path.insert(0, 'tools'); from fetch import CX, CY, HALF, RES
f = sys.argv[1]; d = np.load(f); p = d['pan']
h, z = 60, 9
T0 = Transformer.from_crs('EPSG:4326', 'EPSG:32639', always_xy=True)
_x, _y = T0.transform(51.5262, 25.2858)
cc, rr = int((_x-(CX-HALF))/RES), int(((CY+HALF)-_y)/RES)
a = p[rr-h:rr+h, cc-h:cc+h]; lo, hi = np.percentile(a[a > 0], [1, 99.5])
im = Image.fromarray(np.clip((a-lo)/(hi-lo)*255, 0, 255).astype(np.uint8)).resize((2*h*z,)*2, Image.BICUBIC).convert('RGB')
dr = ImageDraw.Draw(im); T = Transformer.from_crs('EPSG:4326', 'EPSG:32639', always_xy=True)
def px(lon, lat):
    x, y = T.transform(lon, lat); return ((x-(CX-HALF))/RES-(cc-h))*z, (((CY+HALF)-y)/RES-(rr-h))*z
for lon in np.arange(51.518, 51.536, 0.002):
    x0, y0 = px(lon, 25.278); x1, y1 = px(lon, 25.296); dr.line([x0, y0, x1, y1], fill=(255, 190, 0)); dr.text((x0+3, 1060), f'{lon:.3f}', fill=(255, 190, 0))
for lat in np.arange(25.280, 25.296, 0.002):
    x0, y0 = px(51.516, lat); x1, y1 = px(51.538, lat); dr.line([x0, y0, x1, y1], fill=(0, 200, 255)); dr.text((4, y0+3), f'{lat:.3f}', fill=(0, 200, 255))
if len(sys.argv) > 3:
    pts = [tuple(map(float, q.split(','))) for q in sys.argv[2].split(';')]
    dr.line([px(*q) for q in pts + pts[:1]], fill=(255, 40, 40), width=3)
im.save(sys.argv[-1] if sys.argv[-1].endswith('.jpg') else 'qa/grid.jpg', quality=88)
