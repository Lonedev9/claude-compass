"""Region plate (Qatar peninsula) for the climb: Landsat 8, path 163 rows 41-43 on 2020-03-04 (02-17 cloudy in the north), path 162 rows 41-43 on 2020-03-13, and path 164 rows 41-43
on 2020-01-07 (02-24 was cloudy in the north-west), bands 4/3/2 reprojected onto a lon/lat grid. Writes cache/region_<scene>.npz; logs requests."""
import os, sys, numpy as np, rasterio
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_origin
os.environ.setdefault('CPL_VSIL_CURL_ALLOWED_EXTENSIONS', '.TIF,.tif')
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = 'https://storage.googleapis.com/gcp-public-data-landsat'
BOX = (50.3, 24.2, 52.9, 26.5)   # w, s, e, n
RES = 0.0012
NX, NY = round((BOX[2] - BOX[0]) / RES), round((BOX[3] - BOX[1]) / RES)
DST = from_origin(BOX[0], BOX[3], RES, RES)

def fetch(scene):
    f = os.path.join(HERE, 'cache', 'region_' + scene + '.npz')
    if os.path.exists(f): return f
    base = f'{G}/LC08/01/{scene[10:13]}/{scene[13:16]}/{scene}/{scene}_'
    arr = {}
    for k, b in zip('rgb', ('B4', 'B3', 'B2')):
        out = np.zeros((NY, NX), np.float32)
        with rasterio.open('/vsicurl/' + base + b + '.TIF') as d:
            reproject(rasterio.band(d, 1), out, src_transform=d.transform, src_crs=d.crs, dst_transform=DST,
                      dst_crs='EPSG:4326', resampling=Resampling.average, src_nodata=0, dst_nodata=0)
        arr[k] = out
    with open(os.path.join(HERE, 'cache', 'requests.log'), 'a') as log: log.write(base + '{B4,B3,B2}.TIF (region)\n')
    np.savez_compressed(f, **arr)
    return f

if __name__ == '__main__':
    for s in sys.argv[1:]: print(fetch(s), flush=True)
