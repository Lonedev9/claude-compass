"""Score, sound design and mix for "Msheireb, 2010-2020" -> out/mix.wav (48 kHz stereo) + out/stems/.

Everything is synthesised here (no sample libraries) and placed from events.json, which the page exports,
so every sound sits on its frame. 96 bpm; A minor, turning to A major at the colour return.

  dry palette   FM pings (the lock-on key), ticks on the grid, falling noise scans, servo, ratchet,
                pulse bass with 2nd/3rd harmonics, detuned-saw pad under a low-pass, synthetic timpani,
                bass drum and a low-brass stab
  wet timbre    bowed metal (inharmonic partials, long room): only at the turn and into the climb
  beds          orbit hum, radio hiss, data chatter, city wind (J/L-cut around the measuring shot)
  voice         Kokoro bm_george, compressed; music ducked under it

usage: $LIB/.venv/bin/python mix.py
"""
import json, os, sys
import numpy as np
import soundfile as sf
import soxr
from scipy.signal import butter, sosfilt, fftconvolve

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB', '/root/lemo-opuscar')
sys.path.insert(0, LIB)
from core.audio import sfx as X

SR = X.SR
EVJ = json.load(open(os.path.join(HERE, 'events.json')))
EV, DUR = EVJ['ev'], EVJ['dur']
N = int((DUR + 0.5) * SR)
BEAT = 60 / 96
rng = np.random.default_rng(31)

MUS, PUL, HIT, FX, BED, VOX = (np.zeros((N, 2)) for _ in range(6))
first = lambda typ: next(e for e in EV if e['type'] == typ)
evs = lambda typ: [e for e in EV if e['type'] == typ]

# ------------------------------------------------------------------ dsp
def sos(kind, f, o=2): return butter(o, f, kind, fs=SR, output='sos')
def lpf(x, f, o=2): return sosfilt(sos('low', min(f, SR * .45), o), x, axis=0)
def hpf(x, f, o=2): return sosfilt(sos('high', f, o), x, axis=0)
def bpf(x, a, b, o=2): return sosfilt(sos('band', [a, min(b, SR * .45)], o), x, axis=0)
def tv(d): return np.arange(int(round(d * SR))) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def put(buf, x, at, g=1.0, pan=0.0):
    x = np.asarray(x, np.float64)
    s = int(round(at * SR))
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l, x * r], 1) * np.sqrt(2)
    if s < 0: x = x[-s:]; s = 0
    if s >= len(buf): return
    e = min(len(buf), s + len(x)); buf[s:e] += x[:e - s] * g
def fade(x, a=.005, r=.05):
    n = len(x); e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return x * e
def room(x, dur=2.4, wet=.35, lo=300, hi=7000, seed=0):
    """Mono -> stereo convolution reverb from decaying filtered noise."""
    r = np.random.default_rng(seed); t = tv(dur)
    ir = np.stack([bpf(r.standard_normal(len(t)), lo, hi) * np.exp(-t * 6.9 / dur) for _ in range(2)], 1)
    ir /= np.abs(ir).sum(0).max() / 6
    y = np.stack([fftconvolve(x, ir[:, c])[:len(x) + len(t)] for c in range(2)], 1)
    d = np.zeros_like(y); d[:len(x)] = x[:, None]
    return d * (1 - wet) + y * wet

# ------------------------------------------------------------------ instruments
def ping(f, d=1.4, v=1.0, ratio=2.01, idx=2.2):
    """FM ping: the lock-on key."""
    t = tv(d); env = np.exp(-t / (d * .28)); ienv = np.exp(-t / .07)
    return fade(v * env * np.sin(2 * np.pi * f * t + idx * ienv * np.sin(2 * np.pi * f * ratio * t)), .002, .05)
def tick(v=1.0, f=3200):
    t = tv(.03); return v * np.exp(-t / .004) * np.sin(2 * np.pi * f * t) + v * .3 * hpf(rng.standard_normal(len(t)) * np.exp(-t / .002), 3000)
def scan(d, v=1.0, f0=7000, f1=600):
    """Falling noise scan: a satellite pass, band sweeping down."""
    t = tv(d + .25); n = rng.standard_normal(len(t)); out = np.zeros_like(n)
    blk = 512; fs = np.geomspace(f0, f1, len(t) // blk + 1)
    for i, f in enumerate(fs):
        a, b = i * blk, min(len(t), (i + 1) * blk)
        if a >= len(t): break
        seg = bpf(n[max(0, a - 2048):b], f * .7, f * 1.4)[-(b - a):]
        out[a:b] = seg
    env = np.minimum(1, t / .06) * np.exp(-np.maximum(0, t - d) / .08)
    return v * out * env
def servo(d, f0=520, f1=860, v=1.0):
    t = tv(d); f = f0 + (f1 - f0) * (t / d) ** .7 + 6 * np.sin(2 * np.pi * 9 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return fade(v * (np.sin(ph) + .25 * np.sin(2 * ph) + .1 * np.sin(3 * ph)), .03, .08)
def timp(f, v=1.0, d=2.8):
    """Synthetic timpani: membrane modes (1, 1.5, 1.98, 2.44), pitch drop, mallet noise."""
    t = tv(d); x = np.zeros_like(t)
    for r, a, tau in ((1, 1, .9), (1.5, .5, .55), (1.98, .3, .4), (2.44, .18, .3)):
        fr = f * r * (1 + .03 * np.exp(-t / .05))
        x += a * np.exp(-t / tau) * np.sin(2 * np.pi * np.cumsum(fr) / SR)
    x += .5 * lpf(rng.standard_normal(len(t)), 900) * np.exp(-t / .015)
    return fade(v * x / 1.6, .001, .2)
def kick(v=1.0, f=52):
    t = tv(1.0); fr = f + 90 * np.exp(-t / .03)
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / .35) + .3 * lpf(rng.standard_normal(len(t)), 2000) * np.exp(-t / .006)
    return v * x
def brass(ms, d=1.8, v=1.0, bright=1.0):
    """Low-brass stab: stacked saws per note, filter envelope that blooms then closes."""
    t = tv(d); x = np.zeros_like(t)
    for m in ms:
        for det in (-.07, 0, .06):
            f = hz(m + det); ph = (np.cumsum(np.full(len(t), f)) / SR) % 1
            x += (2 * ph - 1)
    fc = 180 + bright * 2400 * np.exp(-t / .22) + 300
    y = np.zeros_like(x); blk = 256; zi = None
    for i in range(0, len(x), blk):
        b_ = butter(2, min(fc[i], SR * .45), 'low', fs=SR, output='sos')
        y[i:i + blk] = sosfilt(b_, x[i:i + blk])
    env = np.minimum(1, t / .025) * (0.6 + .4 * np.exp(-t / .3)) * np.exp(-np.maximum(0, t - d * .45) / (d * .2))
    return fade(v * y * env / (len(ms) * 2.5), .003, .1)
def bowed_metal(f, d=7.0, v=1.0):
    """The one wet timbre: inharmonic partials, slow bowed attack, beating."""
    t = tv(d); x = np.zeros_like(t)
    for r, a in ((1, 1), (2.76, .55), (5.40, .35), (8.93, .2), (1.003, .6), (2.765, .3)):
        x += a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * (1 + .15 * np.sin(2 * np.pi * (.7 + r * .1) * t))
    env = (1 - np.exp(-t / .45)) * np.exp(-t / (d * .38))
    return fade(v * x * env / 2.5, .01, .6)
def cym_rev(d=1.2, v=1.0):
    t = tv(d); x = hpf(rng.standard_normal(len(t)), 4000) * np.exp(-(d - t) / (d * .35))
    return fade(v * x, .2, .01)
def pulse_bass(m, d, v=1.0, cut=900):
    """Pulse wave (25 %) with audible 2nd/3rd harmonics, plucked envelope per note."""
    t = tv(d); f = hz(m); ph = (f * t) % 1
    x = np.where(ph < .25, 1., -.33) + .35 * np.sin(4 * np.pi * f * t) + .25 * np.sin(6 * np.pi * f * t)
    x = lpf(x, cut, 2) * np.exp(-t / (d * .55))
    return fade(v * x, .003, .03)
def pad(ms, d, v=1.0, c0=300, c1=1400):
    t = tv(d); x = np.zeros_like(t)
    for m in ms:
        if m < 48: continue
        for det in (-.11, .09):
            ph = (hz(m + det) * t) % 1; x += 2 * ph - 1
    fc = np.geomspace(c0, c1, len(t)); y = np.zeros_like(x)
    for i in range(0, len(x), 1024):
        y[i:i + 1024] = sosfilt(butter(2, fc[i], 'low', fs=SR, output='sos'), x[i:i + 1024])
    return fade(v * y / (2 * len(ms)), min(1.0, d * .3), min(1.2, d * .3))

# ------------------------------------------------------------------ beds
def hum(d):
    t = tv(d); x = sum(a * np.sin(2 * np.pi * f * t + p) for f, a, p in ((110, 1, 0), (165.4, .45, 1), (220.6, .25, 2), (331.2, .1, 3)))
    return x * (1 + .1 * np.sin(2 * np.pi * .13 * t))
L = DUR + .4
hb = hum(L); put(BED, hb, 0, .05)
hiss = bpf(rng.standard_normal(len(tv(L))), 2500, 9000) * .5; put(BED, hiss, 0, .035)
# data chatter: sparse FM blips, denser through the construction years
for k in range(420):
    at = rng.uniform(13.5, 39.4)
    dens = .25 + .75 * (at - 13.5) / 26
    if rng.random() > dens: continue
    put(BED, ping(rng.choice([1320, 1760, 2093, 2637, 3136]), d=.08, v=.5, idx=1.2), at, .05, rng.uniform(-.8, .8))
# city wind: J-cut under the end of the opening, L-cut out over the first scans
wind = lpf(bpf(rng.standard_normal(len(tv(12))), 180, 1600), 1200)
we = np.minimum(1, tv(12) / 2.0) * np.minimum(1, (12 - tv(12)) / 3.0)
put(BED, np.stack([wind * we, np.roll(wind, 4000) * we], 1), 4.2, .06)

# ------------------------------------------------------------------ foley from the page's events
for e in EV:
    t, typ = e['t'], e['type']
    if typ == 'paint': put(FX, scan(e['dur'], 1, 8000, 900), t, .22)
    elif typ == 'search':
        put(FX, servo(T_ := first('lock')['t'] - t, 500, 880), t, .05, .3)
        for k in range(5): put(FX, tick(.7, 2600), t + k * BEAT / 2, .12, .2)
    elif typ == 'lock': put(FX, ping(1760, 1.6, 1.0), t, .30); put(FX, ping(880, 1.2, .6, 3.0, 1.4), t, .12, -.2)
    elif typ == 'print': put(FX, scan(e['dur'], .8, 5000, 1500), t, .10)
    elif typ == 'range':
        n = 6
        for k in range(n + 1): put(FX, tick(1.0, 1900 + 140 * k), t + e['dur'] * (k / n) ** .9, .16, -.3 + .1 * k)   # ratchet: one per 100 m
        for k in range(int(e['dur'] / .045)): put(FX, tick(.35, 4200), t + k * .045, .05, .1)
    elif typ == 'land': put(HIT, timp(hz(45), .8, 2.0), t, .32); put(FX, ping(1318.5, 1.0, .8), t, .14, .3)
    elif typ == 'scan':
        g = .17 if e['year'] in (2013, 2020) else .12
        put(FX, scan(e['dur'], 1, 6500, 700), t, g, .1)
        put(FX, tick(1, 2400), t + e['dur'], .13)
    elif typ == 'dig':
        put(HIT, timp(hz(45), 1.0, 3.2), t, .55); put(HIT, kick(1.0, 62), t, .55)
        put(HIT, brass([45, 52, 57, 60], 2.2, 1.0, 1.0), t, .55)
        put(FX, cym_rev(1.0, 1), t - 1.0, .05)
    elif typ == 'read': put(FX, ping(2637, .5, .5, 1.5, .8), t, .06, .4); put(FX, ping(1975.5, .5, .4, 1.5, .8), t + BEAT / 2, .05, .45)
    elif typ == 'push':
        r = bpf(rng.standard_normal(len(tv(5.7))), 400, 3000) * np.linspace(0, 1, len(tv(5.7))) ** 2
        put(FX, r, t, .045)
    elif typ == 'turn':
        put(HIT, timp(hz(45), 1.0, 3.5), t, .55); put(HIT, kick(1.0, 60), t, .5)
        put(HIT, brass([45, 52, 57, 61, 64], 2.6, 1.0, 1.2), t, .62)
        bm = room(bowed_metal(hz(69), 9.0, 1.0), 4.0, .55, 300, 8000, 3)   # rings on into the climb (L-cut)
        put(MUS, bm, t, .22)
    elif typ == 'climb':
        d = e['dur']; tt = tv(d); r = bpf(rng.standard_normal(len(tt)), 300, 5000) * (tt / d) ** 1.5 * np.exp(-np.maximum(0, tt - d * .8) / .5)
        put(FX, r, t, .05)
        tam = room(bowed_metal(hz(45), 8.0, 1.0), 4.0, .6, 120, 3000, 7)
        put(MUS, tam, t + d * .55, .2)
    elif typ == 'name': put(FX, ping(1318.5, 1.2, .6), t, .1, .3)
    elif typ == 'close': put(FX, room(ping(1760, 2.2, 1.0), 2.5, .45, 500, 9000, 9), t, .26)   # the lock-on key, answered

# ------------------------------------------------------------------ music on the grid
LOCK = first('lock')['t']; DIG = first('dig')['t']; TURN = first('turn')['t']
S1, S2 = [e for e in EV if e['type'] == 'suck']
b = lambda n: n * BEAT
# pulse bass in eighths: A (measure, clearing) -> F (dig) -> G (rise) -> C, E (2019) ; silent in the suck-outs
BASS = [(b(9.6), DIG, 45), (DIG, b(38), 41), (b(38), b(47), 43), (b(47), b(54), 48), (b(54), S2['t'], 40)]
for t0, t1, m in BASS:
    k = 0; t = t0
    while t < t1 - 1e-6:
        if S1['t'] <= t < DIG: t += BEAT / 2; continue
        acc = 1.0 if k % 2 == 0 else .62
        put(PUL, pulse_bass(m + (12 if k % 8 == 6 else 0), BEAT / 2 * .95, acc, 700 + 500 * min(1, (t - t0) / 6)), t, .20)
        t += BEAT / 2; k += 1
# ticks: quarters (measuring) -> eighths (dig years) -> sixteenths (construction run)
for t0, t1, div, g in ((b(9.6), b(22), 1, .07), (b(22), b(47), 2, .06), (b(47), S2['t'], 4, .05)):
    t = t0; k = 0
    while t < t1 - 1e-6:
        if not (S1['t'] <= t < DIG):
            put(PUL, tick(1 if k % div == 0 else .55, 3400 if k % div == 0 else 5200), t, g, .25 if k % 2 else -.25)
        t += BEAT / div; k += 1
# pad: chords under the low-pass, opening through the rise
CH = [(DIG, b(38), [53, 57, 60], 300, 700), (b(38), b(47), [55, 59, 62], 350, 900), (b(47), b(54), [52, 55, 60], 400, 1400), (b(54), S2['t'], [52, 56, 59, 64], 600, 2200)]
for t0, t1, ms, c0, c1 in CH: put(MUS, pad(ms, t1 - t0 + .3, 1, c0, c1), t0, .16)
# after the turn: A major, opening with the climb, decaying to the hum
put(MUS, pad([57, 61, 64, 69], DUR - TURN, 1, 500, 2600), TURN + .2, .13)
put(PUL, pulse_bass(45, 3.0, .7, 500), TURN, .18)
for k in range(8): put(PUL, pulse_bass(45, BEAT * .95, .6, 600), TURN + b(4) + k * BEAT * 2, .12)   # bass halves into the climb

# ------------------------------------------------------------------ voice
DV = json.load(open(os.path.join(HERE, 'voice/out/dur.json')))
for e in evs('vo'):
    x, sr = sf.read(os.path.join(HERE, 'voice/out', e['id'] + '.wav'))
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR)
    x = hpf(x, 90); x = X.compress(x / (np.abs(x).max() + 1e-9) * .8, .22, 3.0)
    put(VOX, x, e['t'], 1.3)

# ------------------------------------------------------------------ mix
def envelope_db(sig, att=.01, rel=.25):
    a = np.abs(sig).max(1); out = np.zeros_like(a); g = 0.0
    ka, kr = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    for i in range(0, len(a), 64):
        v = a[i:i + 64].max(); k = ka if v > g else kr
        g = v + (g - v) * k ** 64; out[i:i + 64] = g
    return out
vg = envelope_db(VOX, .02, .35); duck = 1 - .65 * np.clip(vg / .05, 0, 1)        # about -9 dB under speech
# suck-outs: music, pulse and foley down ~25 dB, beds thinned
sk = np.ones(N)
for s in (S1, S2):
    a, b_ = int(s['t'] * SR), int((s['t'] + s['dur']) * SR)
    ramp = int(.04 * SR); sk[a:b_] = .056; sk[a - ramp:a] = np.linspace(1, .056, ramp); sk[b_ - 8:b_] = .056
bedk = np.where(sk < 1, .18, 1.0)
bus = (MUS * duck[:, None] + PUL * duck[:, None] + FX * .9 * (.5 + .5 * duck[:, None])) * sk[:, None]
bus = np.stack([X.compress(bus[:, c], .35, 2.5) for c in range(2)], 1)
mix = bus + HIT * sk[:, None] ** .2 + BED * bedk[:, None] * (.6 + .4 * duck[:, None]) + VOX
# low end: high-pass ~38 Hz everywhere but the voice, then a soft shelf below ~60 Hz on the non-voice part
nv = mix - VOX
nv = hpf(nv, 40, 4); low = lpf(nv, 62, 4); nv = nv - .8 * low
mix = nv + VOX
mix = mix / (np.abs(mix).max() + 1e-9) * .89
os.makedirs(os.path.join(HERE, 'out/stems'), exist_ok=True)
sf.write(os.path.join(HERE, 'out/mix.wav'), mix[:int(DUR * SR)], SR, subtype='PCM_24')
for n, s in (('music', MUS + PUL), ('hits', HIT), ('fx', FX), ('beds', BED), ('voice', VOX)):
    sf.write(os.path.join(HERE, f'out/stems/{n}.wav'), (s / (np.abs(s).max() + 1e-9) * .8)[:int(DUR * SR)], SR, subtype='PCM_16')
print('mix.wav', round(DUR, 2), 's')
# report: voice over everything else while the narrator speaks (target about +10 dB)
act = vg > .02
r = lambda a: 20 * np.log10(np.sqrt(np.mean(a[act] ** 2)) + 1e-12)
print('voice over the rest while speaking: %.1f dB' % (r(VOX) - r(nv)))
