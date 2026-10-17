import glob, os, numpy as np
from PIL import Image, ImageDraw
fs = sorted(glob.glob('cache/L*.npz'), key=lambda f: f.split('_')[3])
tiles = []
for f in fs:
    d = np.load(f); p = d['pan']; c = 400; h = 80
    a = p[c-h:c+h, c-h:c+h]
    v = a[a > 0]; lo, hi = np.percentile(v, [1, 99.5]) if v.size else (0, 1)
    im = np.clip((a - lo) / (hi - lo + 1e-6) * 255, 0, 255).astype(np.uint8)
    im = Image.fromarray(im).resize((320, 320), Image.NEAREST).convert('RGB')
    ImageDraw.Draw(im).text((5, 5), os.path.basename(f)[17:25], fill=(255, 200, 0))
    tiles.append(im)
cols = 7; rows = (len(tiles) + cols - 1) // cols
S = Image.new('RGB', (cols * 320, rows * 320))
for i, t in enumerate(tiles): S.paste(t, ((i % cols) * 320, (i // cols) * 320))
S.save('qa/scenes.jpg', quality=85)
