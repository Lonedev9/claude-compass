// Msheireb, 2010–2020 — Satellite Briefing. render(t) is a pure function of t: the camera from keyframes,
// the plates and scans from timeline.js, every mark through the one camera (engine.project).
import { clamp, lerp, seg, ss, eio, eo, back } from '/core/lib.js';
import { Engine, makeCamera, project } from './engine.js';
import { C, text, measure, hair, pathLL, brackets, tick, readout, subtitle, SUB, beginTexts, endTexts } from './overlay.js';
import { T, B, b, YEARS, VO, READ, G } from './timeline.js';

const W = 1920, H = 1080;
const gl = new Engine(document.getElementById('gl'));
const cv = document.getElementById('ov'), ctx = cv.getContext('2d');
const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('image ' + src)); i.src = src; });
const json = src => fetch(src).then(r => { if (!r.ok) throw new Error(src); return r.json(); });
let P, V, LINES, DUR, CUES = [];

// ------------------------------------------------------------------ camera keys: t, target, distance (km, log), tilt, heading, lens shift
const KEYS = [
  { t: 0.0, ll: [51.5290, 25.2868], d: 5.4, tilt: 0, hd: 0, sx: 0, sy: 0 },
  { t: 5.6, ll: [51.5285, 25.2866], d: 4.9, tilt: 0, hd: 0, sx: 0, sy: 0, e: 'lin' },           // 3 % creep while it paints in and locks
  { t: 8.0, ll: G.site, d: 3.3, tilt: 0, hd: 0, sx: -230, sy: -10, e: 'io' },                    // push: the site to the left, reading on the right
  { t: T.push0, ll: G.site, d: 3.05, tilt: 0, hd: -3, sx: -230, sy: -10, e: 'lin' },             // locked frame, slow creep and turn
  { t: T.turn, ll: G.site, d: 2.15, tilt: 0, hd: -4, sx: -250, sy: -20, e: 'io' },               // push-in through 2019
  { t: T.climb0, ll: G.site, d: 1.95, tilt: 0, hd: -4.5, sx: -250, sy: -20, e: 'lin' },
  { t: T.climb1, ll: G.site, d: 170, tilt: 26, hd: 8, sx: 260, sy: 60, e: 'climb' },       // climb to the peninsula
  { t: T.dur, ll: G.site, d: 188, tilt: 28, hd: 10, sx: 270, sy: 60, e: 'lin' },
];
const EASE = { io: eio, lin: t => t, climb: t => ss(Math.pow(t, 0.8)) };
function camAt(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[i], k = KEYS[i + 1];
  const u = (EASE[k.e] || eio)(seg(t, a.t, k.t));
  const d = Math.exp(lerp(Math.log(a.d), Math.log(k.d), u));
  const f = u;
  return { lon: lerp(a.ll[0], k.ll[0], f), lat: lerp(a.ll[1], k.ll[1], f), d, tilt: lerp(a.tilt, k.tilt, u),
           heading: lerp(a.hd, k.hd, u), sx: lerp(a.sx, k.sx, u), sy: lerp(a.sy, k.sy, u), fov: 30 };
}

// ------------------------------------------------------------------ which years are on the ground
const N0 = 25.3015, S0 = 25.2715;   // the scan front crosses this band of latitude (the whole frame at the site's altitude)
function plateAt(t) {
  if (t < YEARS[1].t0) return { A: 2010, B: 2010, scan: -90, glow: 0 };
  for (let i = 1; i < YEARS.length; i++) {
    const y = YEARS[i];
    if (t < y.t0) return { A: YEARS[i - 1].y, B: YEARS[i - 1].y, scan: -90, glow: 0 };
    if (t < y.t1) return { A: YEARS[i - 1].y, B: y.y, scan: lerp(N0, S0, seg(t, y.t0, y.t1)), glow: 1, year: y };
  }
  return { A: 2020, B: 2020, scan: -90, glow: 0 };
}
// the year shown at the frame centre (for the date stamp): switches when the front passes the site
function yearShown(t) {
  let cur = YEARS[0];
  for (const y of YEARS) if (t >= lerp(y.t0, y.t1, 0.5)) cur = y;
  return cur;
}

// ------------------------------------------------------------------ helpers
const P2 = (cam, ll) => project(cam, ll[1], ll[0]);
function siteBox(cam) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [lo, la] of V.outline) { const [x, y] = project(cam, la, lo); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}
function label(ll, s, cam, alpha, { dx = 60, dy = -70, id, font = '500 28px PS', align = 'left' } = {}) {
  if (alpha <= 0.003) return;
  const [x, y] = P2(cam, ll);
  const lx = x + dx, ly = y + dy;
  const grow = ss(seg(alpha, 0, 0.6));
  hair(ctx, () => { ctx.moveTo(x, y); ctx.lineTo(lerp(x, lx, grow), lerp(y, ly + 8, grow)); }, { w: 1.2, alpha });
  hair(ctx, () => { ctx.arc(x, y, 4, 0, Math.PI * 2); }, { w: 1.4, alpha });
  text(ctx, s, lx + (align === 'left' ? 6 : -6), ly, { font, alpha: ss(seg(alpha, 0.35, 1)), id, align });
}
const fade = (t, t0, t1, fi = 0.35, fo = 0.35) => Math.min(ss(seg(t, t0, t0 + fi)), 1 - ss(seg(t, t1 - fo, t1)));

// ------------------------------------------------------------------ the frame
function render(t) {
  t = clamp(t, 0, T.dur - 1e-4);
  beginTexts();
  const cp = camAt(t), cam = makeCamera(cp, W, H), alt = cam.alt;
  const ps = plateAt(t);
  const paint = t < T.paint0 ? 90 : t < T.paint1 ? lerp(25.3045, 25.2685, eio(seg(t, T.paint0, T.paint1))) : -90;
  const climbU = ss(seg(t, T.climb0, T.climb1));
  gl.draw({
    cam, reg: 'region', A: 'y' + ps.A, B: 'y' + ps.B, mask: 'mask',
    regBox: P.region.bbox, siteBox: P.site.bbox,
    scan: ps.scan, glow: ps.glow, paint: t < T.paint0 ? 89.9 : paint,
    grey: 1 - 0.55 * ss(seg(t, T.climb0 + 3, T.dur - 1)),
    siteCol: ss(seg(t, T.turn, T.turn + 0.9)),
    dimOut: 0.16 * ss(seg(t, 13.0, 15.0)) * (1 - climbU) + 0.14 * ss(seg(t, T.push0, T.turn)) * (1 - climbU),
    contrast: 1.35 + 0.15 * ss(seg(t, 10, 14)) - 0.3 * climbU, clarity: 0.22 - 0.1 * climbU, detail: 1.3 - 0.5 * climbU, expo: 1.06,
  });

  ctx.clearRect(0, 0, W, H);
  drawMarks(t, cam);
  drawReadings(t);
  drawInstruments(t, cam, alt);
  drawSubs(t);
  window.__texts = endTexts();
}

function drawMarks(t, cam) {
  const climbU = ss(seg(t, T.climb0, T.climb1));
  // ---- reticle: searches, snaps with overshoot, holds the site; at the end it closes onto one point
  const [bx0, by0, bx1, by1] = siteBox(cam);
  const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
  if (t > 2.4) {
    const pad = 46;
    let x0 = bx0 - pad, y0 = by0 - pad, x1 = bx1 + pad, y1 = by1 + pad;
    if (t < T.lock) {   // searching: drifts in from the north-east, larger
      const u = seg(t, 2.4, T.lock), wob = 1 - eo(u);
      const ox = 260 * wob * Math.cos(u * 5), oy = -160 * wob * Math.sin(u * 4), s = 1 + 0.7 * wob;
      const hw = (x1 - x0) / 2 * s, hh = (y1 - y0) / 2 * s;
      x0 = cx + ox - hw; x1 = cx + ox + hw; y0 = cy + oy - hh; y1 = cy + oy + hh;
    } else {
      const k = back(seg(t, T.lock, T.lock + 0.35), 2.4), s = lerp(0.82, 1, k);
      const hw = (x1 - x0) / 2 * s, hh = (y1 - y0) / 2 * s;
      x0 = cx - hw; x1 = cx + hw; y0 = cy - hh; y1 = cy + hh;
    }
    // at the climb the brackets keep a minimum size, then close to a point
    const minS = lerp(120, 26, ss(seg(t, T.climb1 - 2, T.climb1 + 1)));
    if (x1 - x0 < minS) { x0 = cx - minS / 2; x1 = cx + minS / 2; }
    if (y1 - y0 < minS) { y0 = cy - minS / 2; y1 = cy + minS / 2; }
    const a = fade(t, 2.4, T.dur + 1, 0.3) * (t < T.print1 + 0.6 || t > T.climb0 + 1.5 ? 1 : 1 - 0.75 * ss(seg(t, T.print1, T.print1 + 0.6)));
    brackets(ctx, x0, y0, x1, y1, { len: 28, alpha: a, w: 1.8 });
    if (t >= T.lock && t < T.lock + 0.25) tick(ctx, cx, cy, 10, { alpha: 1 - seg(t, T.lock, T.lock + 0.25) });
  }
  // ---- the outline: printed behind a north -> south scan, then held; a dashed ghost through the dig
  if (t > T.print0) {
    const sl = lerp(25.2900, 25.2826, ss(seg(t, T.print0, T.print1)));
    const line = [...V.outline, V.outline[0]];
    const a = (1 - 0.4 * climbU) * (t > T.climb1 ? 1 - ss(seg(t, T.climb1, T.climb1 + 1.2)) : 1);
    const dashed = t > T.dig - 0.2 && t < b(38);
    hair(ctx, () => pathLL(ctx, cam, line, { keep: t < T.print1 ? (lo, la) => la > sl : null }),
      { w: t > T.turn ? 2.2 : 1.8, alpha: a, dash: dashed ? [10, 7] : null, off: -t * 30 });
  }
  // ---- range line along the north edge: grows, ticks every 100 m, counter at the tip, lands on 625 m
  if (t > T.range0 && t < 13.8) {
    const u = eio(seg(t, T.range0, T.rangeLand)), a = fade(t, T.range0, 13.8, 0.2, 0.5);
    const [ax, ay] = P2(cam, G.rangeA), [bx, by] = P2(cam, G.rangeB);
    const ex = lerp(ax, bx, u), ey = lerp(ay, by, u);
    const nx = -(by - ay), ny = bx - ax, nl = Math.hypot(nx, ny), ox = nx / nl * 26, oy = ny / nl * 26;   // offset north of the edge
    hair(ctx, () => { ctx.moveTo(ax - ox, ay - oy); ctx.lineTo(ex - ox, ey - oy); }, { w: 2.2, alpha: a });
    hair(ctx, () => {
      for (let m = 0; m <= 625 * u + 0.1; m += 100) { const k = m / 625, x = lerp(ax, bx, k) - ox, y = lerp(ay, by, k) - oy; ctx.moveTo(x - ox * .35, y - oy * .35); ctx.lineTo(x + ox * .35, y + oy * .35); }
      ctx.moveTo(ex - ox * 1.6, ey - oy * 1.6); ctx.lineTo(ex + ox * 0.4, ey + oy * 0.4);
    }, { w: 1.4, alpha: a });
    const val = Math.round(625 * u), land = t >= T.rangeLand;
    const pop = land ? 1 + 0.18 * (1 - eo(seg(t, T.rangeLand, T.rangeLand + 0.3))) : 1;
    text(ctx, `${val} m`, ex - ox * 2.2, ey - oy * 2.2 - 6, { font: `400 ${Math.round(36 * pop)}px BC`, col: land ? C.amber : C.ink, align: 'center', alpha: a, id: 'range', rep: '625 m' });
  }
  // ---- ground labels
  label(G.souq, 'Souq Waqif', cam, fade(t, 4.4, 13.6, 0.6, 0.5), { dx: 40, dy: 150, id: 'l-souq' });
  label(G.rayyan, 'Al Rayyan Road', cam, fade(t, T.range0 + 0.3, 13.6, 0.6, 0.5), { dx: -30, dy: 80, id: 'l-rayyan', align: 'right' });
  // ---- at the climb: the place name and coordinates beside the closing reticle
  const la = fade(t, 47.4, T.dur + 1, 0.6);
  if (la > 0) {
    const [x, y] = P2(cam, G.site);
    hair(ctx, () => { ctx.moveTo(x + 18, y - 18); ctx.lineTo(x + 120, y - 120); ctx.lineTo(x + 150, y - 120); }, { w: 1.2, alpha: la });
    text(ctx, 'Msheireb, Doha', x + 158, y - 112, { font: '500 34px PS', alpha: la, id: 'l-name' });
    text(ctx, '25.286° N  51.527° E', x + 160, y - 74, { font: '400 24px PM', alpha: la * 0.9, id: 'l-coord' });
  }
}

function drawReadings(t) {
  const x = 1250;
  for (const r of READ) {
    const a = fade(t, r.t0, r.t1, 0.4, 0.45);
    if (a <= 0) continue;
    const k = eo(seg(t, r.t0, r.t0 + 0.5));
    readout(ctx, x + (1 - k) * 30, r.y ?? 560, { label: r.label, value: r.value, unit: r.unit || '', note: r.note, alpha: a, id: r.id, size: r.value.length > 8 ? 100 : 118 });
  }
}

function drawInstruments(t, cam, alt) {
  const a = fade(t, 0.6, T.dur + 1, 0.6);
  // date stamp, top left: the year as a counter (reports the year it lands on), the sensor and date below
  const ys = yearShown(t);
  const run = [[YEARS[6].t0 - 0.1, YEARS[9].t1 + 0.6, '2019']];   // the fast run 2016 -> 2019 reports its landing year
  const rep = (run.find(([a0, a1]) => t >= a0 && t < a1) || [])[2] ?? String(ys.y);
  text(ctx, String(ys.y), 96, 132, { font: '300 84px BC', alpha: a, id: 'date-year', rep, track: 1 });
  text(ctx, ys.sensor, 100, 172, { font: '400 24px PM', alpha: a * 0.92, id: 'date-sensor' });
  // once the climb leaves the 12 km site plates, the ground is the 2020 Qatar mosaic (three dates)
  const mosaic = alt > 14;
  text(ctx, mosaic ? 'JAN–MAR 2020 MOSAIC' : ys.when, 100, 204, { font: '400 22px PM', alpha: a * 0.75, rep: null });
  // altitude, top right
  const km = alt;
  const s = km < 10 ? `ALT ${km.toFixed(1)} km` : `ALT ${Math.round(km)} km`;
  text(ctx, s, 1824, 96, { font: '400 24px PM', align: 'right', alpha: a });
  // scale bar, bottom right, from the same camera: metres per pixel at the target
  const mpp = 1000 * alt / cam.F;
  const opts = [100, 200, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000];
  const len = opts.find(m => m / mpp > 150) || 50000, px = len / mpp;
  const x1 = 1824, x0 = x1 - px, yb = 960;
  hair(ctx, () => { ctx.moveTo(x0, yb - 8); ctx.lineTo(x0, yb); ctx.lineTo(x1, yb); ctx.lineTo(x1, yb - 8); }, { w: 1.6, alpha: a });
  text(ctx, len >= 1000 ? `${len / 1000} km` : `${len} m`, x1, yb - 16, { font: '400 22px PM', align: 'right', alpha: a });
  text(ctx, 'Imagery: Landsat 7 / Landsat 8, USGS / NASA', x1, 1012, { font: '400 20px PM', align: 'right', alpha: a * 0.85, col: 'rgba(242,245,246,.85)' });
}

function drawSubs(t) {
  for (const c of CUES) {
    if (t < c.t0 - 0.2 || t > c.t1 + 0.2) continue;
    subtitle(ctx, c.text, Math.min(ss(seg(t, c.t0 - 0.12, c.t0 + 0.12)), 1 - ss(seg(t, c.t1 - 0.15, c.t1))), c.id);
  }
}

// ------------------------------------------------------------------ subtitles: the same intervals as the .srt
function cues() {
  return VO.map(v => {
    const L = LINES.find(l => l.id === v.id), d = DUR[v.id];
    const next = VO[VO.indexOf(v) + 1], t1 = v.t + Math.max(1.8, d + 0.6);
    if (next && t1 > next.t - 0.05) throw new Error('subtitle ' + v.id + ' overlaps ' + next.id);
    return { id: v.id, t0: v.t, t1: +t1.toFixed(3), text: L.sub };
  });
}

// ------------------------------------------------------------------ sound events for mix.py
function events() {
  const ev = [];
  ev.push({ t: 0, type: 'bed' }, { t: T.paint0, type: 'paint', dur: T.paint1 - T.paint0 });
  ev.push({ t: 2.4, type: 'search' }, { t: T.lock, type: 'lock' });
  ev.push({ t: T.print0, type: 'print', dur: T.print1 - T.print0 });
  ev.push({ t: T.range0, type: 'range', dur: T.rangeLand - T.range0 }, { t: T.rangeLand, type: 'land' });
  for (const y of YEARS.slice(1)) ev.push({ t: y.t0, type: 'scan', year: y.y, dur: +(y.t1 - y.t0).toFixed(3) });
  ev.push({ t: T.suck1, type: 'suck', dur: T.dig - T.suck1 }, { t: T.dig, type: 'dig' });
  for (const r of READ) ev.push({ t: r.t0, type: 'read', id: r.id });
  ev.push({ t: T.push0, type: 'push' });
  ev.push({ t: T.suck2, type: 'suck', dur: T.turn - T.suck2 }, { t: T.turn, type: 'turn' });
  ev.push({ t: T.climb0, type: 'climb', dur: T.climb1 - T.climb0 }, { t: 47.4, type: 'name' }, { t: T.climb1, type: 'close' });
  for (const v of VO) ev.push({ t: v.t, type: 'vo', id: v.id, dur: DUR[v.id] });
  return ev.sort((a, b) => a.t - b.t);
}

async function init() {
  [P, V, LINES, DUR] = await Promise.all([json('assets/plates.json'), json('assets/vectors.json'), json('voice/lines.json'), json('voice/out/dur.json')]);
  const names = P.years.map(y => ['y' + y, `assets/site_${y}.jpg`]).concat([['region', 'assets/region.jpg'], ['mask', 'assets/site_mask.png']]);
  const imgs = await Promise.all(names.map(([, src]) => load(src)));
  names.forEach(([n], i) => gl.upload(n, imgs[i]));
  await Promise.all(['300 84px BC', '400 36px BC', '300 118px BC', '400 24px PM', '500 26px PS', '400 34px PS'].map(f => document.fonts.load(f, '2010 → Msheireb')));
  CUES = cues();
  const wide = CUES.map(c => ({ id: c.id, w: Math.round(measure(ctx, c.text, SUB.font, SUB.track)) })).filter(c => c.w > SUB.safe);
  if (wide.length) throw new Error('subtitle line too wide: ' + JSON.stringify(wide));
  window.CUES = CUES;
  window.EV = events();
  window.READY = true;
}

window.DUR = T.dur;
window.render = render;
window.TEXTS = t => { render(t); return window.__texts; };
init().catch(e => { console.error(e); throw e; });
