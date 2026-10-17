import rasterio, numpy as np, sys
from rasterio.warp import transform
from rasterio.windows import from_bounds
lon,lat=51.5262,25.2866
def win(url,half=900):
    with rasterio.open(url) as d:
        x,y=transform('EPSG:4326',d.crs,[lon],[lat]); x,y=x[0],y[0]
        w=from_bounds(x-half,y-half,x+half,y+half,d.transform)
        a=d.read(1,window=w,boundless=True,fill_value=0)
        return d.crs, d.bounds, a
for u in sys.argv[1:]:
    crs,b,a=win('/vsicurl/'+u)
    print(u.split('/')[-1], crs, a.shape, 'zero%%=%.1f'%(100*(a==0).mean()), a.min(), a.max())
