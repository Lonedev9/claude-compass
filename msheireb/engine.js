// Msheireb 2010–2020 engine: a perspective camera around a spherical Earth (camera math from the
// Satellite Briefing style), Landsat plates sampled by lon/lat in a WebGL2 shader, and the same camera
// in JS for the annotation layer: one world -> screen function for every mark.
export const R = 6371.0088;          // Earth radius, km
const D2R = Math.PI / 180;

// ------------------------------------------------------------------ vectors (double precision, JS)
const v = (x, y, z) => [x, y, z];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => mul(a, 1 / Math.hypot(a[0], a[1], a[2]));

export function ecef(lat, lon, h = 0) {
  const p = lat * D2R, l = lon * D2R, r = R + h;
  return v(r * Math.cos(p) * Math.cos(l), r * Math.cos(p) * Math.sin(l), r * Math.sin(p));
}
function enu(lat, lon) {
  const p = lat * D2R, l = lon * D2R;
  const up = v(Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p));
  const east = v(-Math.sin(l), Math.cos(l), 0);
  const north = cross(up, east);
  return { up, east, north };
}

// camera: look at ground point (lat, lon) from distance d (km), tilt (deg from straight down),
// heading (deg, direction the camera faces, clockwise from north), roll (deg), vertical fov (deg),
// and a lens shift so the target can sit off-centre: (sx, sy) in pixels from the frame centre.
export function makeCamera({ lat, lon, d, tilt = 0, heading = 0, roll = 0, fov = 30, sx = 0, sy = 0 }, W = 1920, H = 1080) {
  const T = ecef(lat, lon, 0);
  const { up, east, north } = enu(lat, lon);
  const hd = heading * D2R, tl = tilt * D2R;
  const Hdir = add(mul(north, Math.cos(hd)), mul(east, Math.sin(hd)));
  const C = add(T, mul(add(mul(up, Math.cos(tl)), mul(Hdir, -Math.sin(tl))), d));
  const f = norm(sub(T, C));
  let u = norm(sub(add(mul(Hdir, Math.cos(tl)), mul(up, Math.sin(tl))), mul(f, 0)));   // screen-up before roll
  u = norm(sub(u, mul(f, dot(u, f))));
  let r = norm(cross(f, u));
  if (roll) { const rr = roll * D2R; const r2 = add(mul(r, Math.cos(rr)), mul(u, Math.sin(rr))); u = norm(cross(r2, f)); r = r2; }
  const F = (H / 2) / Math.tan(fov * D2R / 2);
  const Cc = mul(C, -1);                        // camera -> Earth centre
  const h = Math.hypot(C[0], C[1], C[2]) - R;   // altitude above the sphere
  return { C, f, u, r, F, W, H, sx, sy, Cc, c2: h * (2 * R + h), alt: h, tgt: { lat, lon } };
}

// world -> screen. Returns [x, y, visible] (visible = in front and on the camera's side of the globe)
export function project(cam, lat, lon, hgt = 0) {
  const P = ecef(lat, lon, hgt);
  const q = sub(P, cam.C);
  const z = dot(q, cam.f);
  const x = cam.W / 2 + cam.sx + cam.F * dot(q, cam.r) / z;
  const y = cam.H / 2 + cam.sy - cam.F * dot(q, cam.u) / z;
  const facing = dot(P, mul(q, -1)) > 0;      // surface normal points towards the camera
  return [x, y, z > 0 && facing];
}
// screen -> ground (lat, lon) or null
export function unproject(cam, x, y) {
  const nx = (x - cam.W / 2 - cam.sx) / cam.F, ny = -(y - cam.H / 2 - cam.sy) / cam.F;
  const d = norm(add(cam.f, add(mul(cam.r, nx), mul(cam.u, ny))));
  const b = dot(d, cam.Cc), disc = b * b - cam.c2;
  if (disc < 0) return null;
  const t = b - Math.sqrt(disc);
  const Q = sub(mul(d, t), cam.Cc);
  return [Math.asin(Q[2] / R) / D2R, Math.atan2(Q[1], Q[0]) / D2R];
}
// km per pixel at the target (for scale bars)
export function kmPerPx(cam) { return (cam.alt / Math.max(1e-6, Math.cos(0))) / cam.F; }

// ------------------------------------------------------------------ WebGL
const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float; precision highp sampler2D;
out vec4 o;
uniform vec2 uRes; uniform vec2 uShift; uniform float uF;
uniform vec3 uR, uU, uFw, uCc; uniform float uC2;
uniform sampler2D tReg, tA, tB, tMask;
uniform vec4 bReg, bSite;                // plate bboxes (w, s, e, n), degrees
uniform float uScan, uGlow;              // year scan: latitude of the soft front (north -> south: B north of it)
uniform float uPaint;                    // opening: ground north of this latitude is painted in, black south of it
uniform float uGrey, uSiteCol;           // analyst grey 0..1; true colour back inside the outline 0..1
uniform float uDimOut;                   // dim everything outside the outline
uniform float uDetail, uClarity, uContrast, uExpo;
const float RE = 6371.0088;

float lum(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
vec2 uvOf(vec4 b, vec2 ll){ return vec2((ll.y - b.x) / (b.z - b.x), (b.w - ll.x) / (b.w - b.y)); }
float inside(vec2 uv, float f){ vec2 e = smoothstep(vec2(0.), vec2(f), uv) * smoothstep(vec2(0.), vec2(f), 1. - uv); return e.x * e.y; }
vec4 samp(sampler2D t, vec2 uv){
  vec3 c = texture(t, uv).rgb;
  float l = lum(c);
  float m1 = lum(texture(t, uv, 1.3).rgb), m2 = lum(texture(t, uv, 3.0).rgb), m3 = lum(texture(t, uv, 5.5).rgb);
  float d = l + uDetail * (0.6 * (l - m1) + 0.45 * (m1 - m2));
  d = m3 + (d - m3) * (1. + uClarity);
  return vec4(c, d);
}
vec3 grade(vec4 c){
  // plates sit around 0.5: a black point, a gentle shoulder and a mid-tone pull keep the ground at 3-65 % grey
  float d = clamp((c.a - 0.10) / 0.82, 0., 1.);
  d = (1. - exp(-1.2 * d)) / (1. - exp(-1.2));
  d = pow(d, 1.55);
  d = clamp((d - .42) * uContrast + .42, 0., 1.);
  vec3 grey = mix(vec3(.026, .036, .044), vec3(.63, .655, .665), d);
  return grey + (c.rgb - lum(c.rgb)) * 0.2;
}
vec3 shade(vec2 frag){
  vec2 n = (frag - uRes * .5 - uShift * vec2(1., -1.)) / uF;
  vec3 dir = normalize(uFw + n.x * uR + n.y * uU);
  float b = dot(dir, uCc), disc = b * b - uC2;
  vec3 space = vec3(.012, .018, .024);
  if (disc < 0.) return space;
  float t = b - sqrt(disc);
  vec3 Q = t * dir - uCc;
  vec2 ll = vec2(degrees(asin(clamp(Q.z / RE, -1., 1.))), degrees(atan(Q.y, Q.x)));
  // region (Qatar) under the site plates; outside the region: dark sea tone fading to space
  vec2 ur = uvOf(bReg, ll); float wr = inside(ur, .04);
  vec4 c = mix(vec4(space, .02), samp(tReg, ur), wr);
  vec2 us = uvOf(bSite, ll); float ws = inside(us, .05);
  float inOut = 0.;
  if (ws > 0.) {
    vec4 A = samp(tA, us), B = samp(tB, us);
    float s = ll.x - uScan;                                  // > 0: north of the front, already the new year
    float fw = fwidth(ll.x);
    float k = smoothstep(-fw * 30., fw * 30., s);
    c = mix(c, mix(A, B, k), ws);
    inOut = texture(tMask, us).r * ws;
  }
  vec3 col = mix(c.rgb, grade(c), uGrey);
  // colour returns inside the outline only, slightly lifted so it reads against the grey
  vec3 tc = mix(vec3(lum(c.rgb)), c.rgb, 1.45) * 1.06 + .01;
  col = mix(col, tc, uSiteCol * inOut);
  col *= 1. - uDimOut * (1. - inOut) * .55;
  // the satellite pass: a soft bright swath just behind the scan front
  if (ws > 0.) { float s = ll.x - uScan, fw = fwidth(ll.x);
    col += uGlow * ws * .12 * exp(-max(s, 0.) / (fw * 70.)) * smoothstep(0., fw * 25., s) * vec3(.85, .92, 1.); }
  // opening paint-in: north of uPaint is lit, a soft front, a light swath at the front
  float pf = fwidth(ll.x), sp = ll.x - uPaint;
  col *= smoothstep(-pf * 18., pf * 18., sp);
  col += .16 * exp(-max(sp, 0.) / (pf * 60.)) * smoothstep(-pf * 4., pf * 20., sp) * step(uPaint, 89.) * vec3(.85, .92, 1.);
  return col;
}
void main(){
  vec2 frag = gl_FragCoord.xy;
  vec3 col = shade(frag) * uExpo;
  vec2 q = frag / uRes - .5; col *= 1. - .42 * dot(q, q);
  o = vec4(max(col, 0.), 1.);
}`;

export class Engine {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 not available');
    this.gl = gl;
    this.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    this.p = p; gl.useProgram(p);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.U = {}; this.tex = {};
    ['tReg', 'tA', 'tB', 'tMask'].forEach((n, i) => gl.uniform1i(gl.getUniformLocation(p, n), i));
  }
  u(name) { return this.U[name] ?? (this.U[name] = this.gl.getUniformLocation(this.p, name)); }
  upload(name, img) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    this.tex[name] = t;
  }
  // S: { cam, reg, site, A, B, mask, scan, glow, paint, grey, siteCol, dimOut, detail, clarity, contrast, expo }
  draw(S) {
    const gl = this.gl, c = S.cam;
    gl.viewport(0, 0, c.W, c.H);
    gl.uniform2f(this.u('uRes'), c.W, c.H); gl.uniform2f(this.u('uShift'), c.sx, c.sy); gl.uniform1f(this.u('uF'), c.F);
    gl.uniform3f(this.u('uR'), ...c.r); gl.uniform3f(this.u('uU'), ...c.u); gl.uniform3f(this.u('uFw'), ...c.f);
    gl.uniform3f(this.u('uCc'), ...c.Cc); gl.uniform1f(this.u('uC2'), c.c2);
    ['reg', 'A', 'B', 'mask'].forEach((k, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, this.tex[S[k]]); });
    gl.uniform4f(this.u('bReg'), ...S.regBox); gl.uniform4f(this.u('bSite'), ...S.siteBox);
    gl.uniform1f(this.u('uScan'), S.scan ?? -90); gl.uniform1f(this.u('uGlow'), S.glow ?? 0); gl.uniform1f(this.u('uPaint'), S.paint ?? -90);
    gl.uniform1f(this.u('uGrey'), S.grey ?? 1); gl.uniform1f(this.u('uSiteCol'), S.siteCol ?? 0); gl.uniform1f(this.u('uDimOut'), S.dimOut ?? 0);
    gl.uniform1f(this.u('uDetail'), S.detail ?? .8); gl.uniform1f(this.u('uClarity'), S.clarity ?? .4);
    gl.uniform1f(this.u('uContrast'), S.contrast ?? 1); gl.uniform1f(this.u('uExpo'), S.expo ?? 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
