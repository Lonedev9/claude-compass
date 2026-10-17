"""Plates for the page, all on lon/lat grids (the shader samples by lon/lat):
assets/site_<year>.jpg (12 km window, ~15 m), assets/site_mask.png (the traced outline, feathered),
assets/region.jpg (Qatar, 2020, ~130 m, colour-matched to site_2020 where they overlap), assets/plates.json."""
import os, sys, json, glob, numpy as np, rasterio
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.transform import from_origin
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from fetch import CX, CY, HALF, RES, N, DST as UTM
from aoi import OUTLINE
import fetch_region as FR
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(HERE, 'assets'); os.makedirs(A, exist_ok=True)
w, s, e, n = transform_bounds('EPSG:32639', 'EPSG:4326', CX - HALF, CY - HALF, CX + HALF, CY + HALF)
w, s, e, n = w + .002, s + .002, e - .002, n - .002            # stay inside the UTM square
DLAT = 0.000135; DLON = DLAT
NX, NY = round((e - w) / DLON), round((n - s) / DLAT)
LL = from_origin(w, n, DLON, DLAT)

def warp(a, src_t, src_crs, dst_t, shape, rs=Resampling.cubic):
    out = np.zeros(shape, np.float32)
    reproject(a.astype(np.float32), out, src_transform=src_t, src_crs=src_crs, dst_transform=dst_t, dst_crs='EPSG:4326', resampling=rs)
    return out

meta = {'site': {'bbox': [w, s, e, n], 'W': NX, 'H': NY}, 'years': []}
for f in sorted(glob.glob(os.path.join(HERE, 'plates', 'site_*.png'))):
    y = int(f[-8:-4]); im = np.asarray(Image.open(f)).astype(np.float32)
    out = np.stack([warp(im[..., c], UTM, 'EPSG:32639', LL, (NY, NX)) for c in range(3)], -1)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(os.path.join(A, f'site_{y}.jpg'), quality=93)
    meta['years'].append(y)
# outline mask on the site grid, feathered by ~2 px
m = Image.new('L', (NX, NY)); px = [((lo - w) / DLON, (n - la) / DLAT) for lo, la in OUTLINE]
ImageDraw.Draw(m).polygon(px, fill=255); m.filter(ImageFilter.GaussianBlur(1.6)).save(os.path.join(A, 'site_mask.png'))

# region mosaic: later scenes fill zeros of earlier ones; path 164 gain-matched to path 163 on the overlap
fs = sorted(glob.glob(os.path.join(HERE, 'cache', 'region_*.npz')))
paths = {p: [np.load(f) for f in fs if f'_{p}0' in f] for p in ('163', '164', '162')}
def mos(L):
    o = {k: np.zeros_like(L[0][k]) for k in 'rgb'}
    for d in L:
        for k in 'rgb': o[k] = np.where(o[k] > 0, o[k], d[k])
    return o
a = mos(paths['163'])
for p in ('164', '162'):
    b = mos(paths[p])
    for k in 'rgb':
        ov = (a[k] > 0) & (b[k] > 0)
        b[k] *= np.median(a[k][ov]) / np.median(b[k][ov])
    # feathered seam: inside the overlap, fade from b to a over ~60 px from a's edge
    from scipy import ndimage
    wa = np.clip(ndimage.distance_transform_edt(a['r'] > 0) / 60., 0, 1)
    for k in 'rgb':
        a[k] = np.where(b[k] > 0, np.where(a[k] > 0, wa * a[k] + (1 - wa) * b[k], b[k]), a[k])
rgb = np.stack([a[k] for k in 'rgb'], -1)
# colour-match to site_2020 over the site window
s20 = np.asarray(Image.open(os.path.join(A, 'site_2020.jpg'))).astype(np.float32)
rw, rs_, re, rn = FR.BOX
xi = ((np.linspace(w, e, 60) - rw) / FR.RES).astype(int); yi = ((rn - np.linspace(n, s, 60)) / FR.RES).astype(int)
sub = rgb[np.ix_(yi, xi)].reshape(-1, 3); ref = s20[np.ix_(np.linspace(0, NY - 1, 60).astype(int), np.linspace(0, NX - 1, 60).astype(int))].reshape(-1, 3)
ok = (sub.min(1) > 0) & (ref.min(1) > 8)
out = np.zeros_like(rgb)
for c in range(3):
    A_ = np.stack([sub[ok, c], np.ones(ok.sum())], 1); g, o = np.linalg.lstsq(A_, ref[ok, c], rcond=None)[0]
    out[..., c] = np.where(rgb[..., c] > 0, rgb[..., c] * g + o, 0)
# no data (outside every scene) -> deep sea tone, feathered
nod = rgb.min(-1) <= 0
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(os.path.join(A, 'region.jpg'), quality=92)
meta['region'] = {'bbox': list(FR.BOX), 'W': FR.NX, 'H': FR.NY, 'nodata_pct': round(100 * nod.mean(), 1)}
json.dump(meta, open(os.path.join(A, 'plates.json'), 'w'), indent=1)
print(json.dumps(meta))
