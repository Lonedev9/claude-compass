"""Per-year composites on the shared 15 m grid: same-year L7 dates fill each other's scan-line gaps (median of valid
pixels), Landsat 8 years use one date. Pan-sharpened (Brovey), gain-matched to 2020 on land outside the site,
written as 8-bit PNGs plus a measurement file."""
import os, sys, json, numpy as np
from PIL import Image, ImageDraw
from pyproj import Transformer
sys.path.insert(0, os.path.dirname(__file__))
from fetch import CX, CY, HALF, RES, N
from aoi import OUTLINE
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = lambda s: os.path.join(HERE, 'cache', s + '.npz')
YEARS = {
  2010: ['LE07_L1TP_163042_20100213_20161215_01_T1', 'LE07_L1TP_163042_20100301_20161216_01_T1',
         'LE07_L1TP_163042_20100317_20161216_01_T1', 'LE07_L1TP_163042_20100402_20161216_01_T1'],
  2011: ['LE07_L1TP_163042_20110216_20161210_01_T1', 'LE07_L1TP_163042_20110304_20161209_01_T1',
         'LE07_L1TP_163042_20101230_20161211_01_T1'],
  2012: ['LE07_L1TP_163042_20120102_20161203_01_T1', 'LE07_L1TP_163042_20120118_20161203_01_T1',
         'LE07_L1TP_163042_20120219_20161202_01_T1', 'LE07_L1TP_163042_20120306_20161202_01_T1'],
  2013: ['LC08_L1TP_163042_20131128_20170428_01_T1'],
  2014: ['LC08_L1TP_163042_20140216_20170425_01_T1'],
  2015: ['LC08_L1TP_163042_20150219_20170412_01_T1'],
  2016: ['LC08_L1TP_163042_20160222_20170329_01_T1'],
  2017: ['LC08_L1TP_163042_20170224_20170301_01_T1'],
  2018: ['LC08_L1TP_163042_20180126_20180207_01_T1'],
  2019: ['LC08_L1TP_163042_20190214_20190222_01_T1'],
  2020: ['LC08_L1TP_163042_20200217_20200225_01_T1'],
}
T = Transformer.from_crs('EPSG:4326', 'EPSG:32639', always_xy=True)
def to_px(lon, lat):
    x, y = T.transform(lon, lat); return (x - (CX - HALF)) / RES, ((CY + HALF) - y) / RES
mask = Image.new('L', (N, N)); ImageDraw.Draw(mask).polygon([to_px(*p) for p in OUTLINE], fill=255)
SITE = np.array(mask) > 0

def composite(scenes):
    out = {}
    for k in ('pan', 'r', 'g', 'b'):
        st = np.stack([np.load(C(s))[k] for s in scenes]).astype(np.float32)
        st[st <= 0] = np.nan
        # scale each date to the first on pixels they share (stable gain), then median
        ref = st[0]
        for i in range(1, len(st)):
            m = np.isfinite(ref) & np.isfinite(st[i]) & ~SITE
            if m.sum() > 1000: st[i] *= np.nanmedian(ref[m]) / np.nanmedian(st[i][m])
        out[k] = np.nanmedian(st, 0) if len(st) > 1 else st[0]
    return out

def fill(a):
    """Holes left after compositing: nearest valid neighbour (same year only)."""
    from scipy import ndimage
    bad = ~np.isfinite(a)
    if not bad.any(): return a, 0.0
    idx = ndimage.distance_transform_edt(bad, return_distances=False, return_indices=True)
    return a[tuple(idx)], float(bad[SITE].mean())

def match(a, ref):
    """Histogram-match a to ref on land outside the site (quantile mapping)."""
    m = ~SITE
    q = np.linspace(0.5, 99.5, 200)
    return np.interp(a, np.percentile(a[m], q), np.percentile(ref[m], q))

if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'plates'), exist_ok=True)
    comps = {y: composite(s) for y, s in YEARS.items()}
    info = {}
    ref = {}
    for y in sorted(comps, reverse=True):
        c = comps[y]; holes = {}
        for k in c: c[k], holes[k] = fill(c[k])
        # Brovey pan-sharpen
        rgb = np.stack([c['r'], c['g'], c['b']], -1)
        inten = rgb.mean(-1); rgb = rgb * (c['pan'] / np.maximum(inten, 1e-3))[..., None]
        if y == 2020: ref = {i: rgb[..., i] for i in range(3)}
        else: rgb = np.stack([match(rgb[..., i], ref[i]) for i in range(3)], -1)
        if y == 2020: lo, hi = np.percentile(rgb[~SITE], [0.5, 99.7])
        im = np.clip((rgb - lo) / (hi - lo), 0, 1) ** 0.85
        Image.fromarray((im * 255).astype(np.uint8)).save(os.path.join(HERE, 'plates', f'site_{y}.png'))
        info[y] = {'scenes': YEARS[y], 'site_holes_filled_pct': round(100 * holes['pan'], 1)}
    json.dump({'grid': {'crs': 'EPSG:32639', 'x0': CX - HALF, 'y0': CY + HALF, 'res': RES, 'n': N}, 'years': info},
              open(os.path.join(HERE, 'plates', 'plates.json'), 'w'), indent=1)
    print(json.dumps(info, indent=1))
