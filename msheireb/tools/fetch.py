"""Fetch Landsat windows around Msheireb from the Google Cloud public Landsat archive.
Writes cache/<scene>.npz with pan (15 m) and RGB (30 m resampled to 15 m) on one shared UTM 39N grid.
Every request is logged to cache/requests.log."""
import os, sys, numpy as np, rasterio
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_origin
os.environ.setdefault('CPL_VSIL_CURL_ALLOWED_EXTENSIONS', '.TIF,.tif')
os.environ.setdefault('GDAL_HTTP_MULTIRANGE', 'YES')
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(HERE, 'cache')
G = 'https://storage.googleapis.com/gcp-public-data-landsat'
# shared grid: UTM 39N, 15 m, 12 km square centred on Msheireb (51.5262E 25.2866N)
CX, CY, HALF, RES = 552850.0, 2797480.0, 6000.0, 15.0
N = int(2 * HALF / RES)
DST = from_origin(CX - HALF, CY + HALF, RES, RES)

def bands(scene):
    s = scene.split('_')[0]
    return ('B8', ['B3', 'B2', 'B1']) if s == 'LE07' else ('B8', ['B4', 'B3', 'B2'])

def read(url, res=RES):
    out = np.zeros((N, N), np.float32)
    with rasterio.open('/vsicurl/' + url) as d:
        reproject(rasterio.band(d, 1), out, src_transform=d.transform, src_crs=d.crs,
                  dst_transform=DST, dst_crs='EPSG:32639', resampling=Resampling.nearest if res == 15 else Resampling.bilinear,
                  src_nodata=0, dst_nodata=0)
    return out

def fetch(scene):
    f = os.path.join(CACHE, scene + '.npz')
    if os.path.exists(f): return f
    sat, path, row = scene[:4], scene[10:13], scene[13:16]
    base = f'{G}/{sat}/01/{path}/{row}/{scene}/{scene}_'
    pan, rgb = bands(scene)
    arr = {'pan': read(base + pan + '.TIF')}
    for k, b in zip('rgb', rgb): arr[k] = read(base + b + '.TIF', 30)
    with open(os.path.join(CACHE, 'requests.log'), 'a') as log:
        log.write(base + '{' + ','.join([pan] + rgb) + '}.TIF\n')
    np.savez_compressed(f, **arr)
    return f

if __name__ == '__main__':
    for s in sys.argv[1:]:
        print(fetch(s), flush=True)
