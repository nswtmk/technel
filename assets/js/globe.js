// technel.world — dot-matrix Earth in raw WebGL (no dependencies).
// Land = Natural Earth 1:50m sampled on a Fibonacci sphere (see land.js).

import { LAND } from './land.js';

const DEG = Math.PI / 180;
export const AXIAL_TILT = 23.44;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/* ---------- land point cloud (decoded once, shared) ---------- */
const cache = {};
function landPoints(key) {
  if (cache[key]) return cache[key];
  const { n, bits } = LAND[key];
  const raw = atob(bits);
  const out = [];
  for (let i = 0; i < n; i++) {
    if (!(raw.charCodeAt(i >> 3) & (1 << (i & 7)))) continue;
    const y = 1 - ((i + 0.5) / n) * 2;
    const r = Math.sqrt(1 - y * y);
    const lon = (i * GOLDEN) % (Math.PI * 2);
    // x = cos(lat) sin(lon), z = cos(lat) cos(lon)  → lon 0 faces the camera
    const h = Math.sin(i * 12.9898) * 43758.5453;
    out.push(r * Math.sin(lon), y, r * Math.cos(lon), h - Math.floor(h));
  }
  return (cache[key] = new Float32Array(out));
}

export function latLonToVec(lat, lon) {
  const a = lat * DEG, b = lon * DEG;
  return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
}

/* ---------- tiny mat4 (column-major) ---------- */
const M = {
  persp(fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f);
    return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]);
  },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  },
  rx(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); },
  ry(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); },
  rz(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
  tz(z) { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, z, 1]); },
  apply(m, v) {
    return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]];
  },
};

/* ---------- shaders ---------- */
const HEAD = 'precision highp float;\n';
const COMMON_VS = `
uniform mat4 uProj, uView, uModel;
uniform vec2 uOffset;
vec4 project(vec4 vp){ vec4 p = uProj * vp; p.xy += uOffset * p.w; return p; }
`;

const GLOW = {
  vs: HEAD + COMMON_VS + `
attribute vec2 aQuad; uniform float uSize, uDist; varying vec2 vQ;
void main(){ vQ = aQuad * uSize; gl_Position = project(vec4(aQuad * uSize, -uDist, 1.0)); }`,
  fs: HEAD + `
varying vec2 vQ; uniform float uSil, uAlpha; uniform vec3 uGlow;
void main(){
  float r = length(vQ) / uSil;
  float g = r < 1.0 ? smoothstep(0.86, 1.0, r) : pow(max(0.0, 1.0 - (r - 1.0) / 0.42), 3.0);
  gl_FragColor = vec4(uGlow * g * uAlpha, 0.0);
}`,
};

const SPHERE = {
  vs: HEAD + COMMON_VS + `
attribute vec3 aPos; varying vec3 vN, vV; varying float vLat;
void main(){
  vec4 vp = uView * uModel * vec4(aPos, 1.0);
  vN = mat3(uView * uModel) * aPos; vV = -vp.xyz; vLat = aPos.y;
  gl_Position = project(vp);
}`,
  fs: HEAD + `
varying vec3 vN, vV; varying float vLat;
uniform vec3 uOcean, uRim, uLight; uniform float uAlpha;
void main(){
  vec3 n = normalize(vN), v = normalize(vV);
  float ndv = max(dot(n, v), 0.0);
  float lit = smoothstep(-0.35, 0.9, dot(n, uLight));
  float rim = pow(1.0 - ndv, 3.2);
  vec3 c = uOcean * (0.45 + 0.75 * lit) + uRim * rim * (0.25 + 0.75 * lit);
  gl_FragColor = vec4(c * uAlpha, uAlpha);
}`,
};

const DOTS = {
  vs: HEAD + COMMON_VS + `
attribute vec4 aPos; uniform float uSize, uPx, uTime, uDpr;
varying float vFace, vLit, vRnd, vScan;
uniform vec3 uLight;
void main(){
  vec4 vp = uView * uModel * vec4(aPos.xyz * 1.0025, 1.0);
  vec3 n = normalize(mat3(uView * uModel) * aPos.xyz);
  vFace = dot(n, normalize(-vp.xyz));
  vLit = smoothstep(-0.25, 0.85, dot(n, uLight));
  vRnd = aPos.w;
  float lon = atan(aPos.x, aPos.z);
  float s = fract(lon / 6.2831853 + 0.5 - uTime * 0.018);
  vScan = smoothstep(0.035, 0.0, s);
  gl_Position = project(vp);
  gl_PointSize = max(1.0 * uDpr, uSize * uPx / -vp.z * mix(0.55, 1.0, smoothstep(0.0, 0.45, vFace)));
}`,
  fs: HEAD + `
varying float vFace, vLit, vRnd, vScan;
uniform vec3 uDot, uDotDim, uAccent; uniform float uAlpha;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  float a = smoothstep(1.0, 0.55, d);
  vec3 c = mix(uDotDim, uDot, vLit * (0.72 + 0.28 * vRnd));
  c = mix(c, uAccent, vScan * 0.85);
  a *= smoothstep(-0.02, 0.22, vFace) * uAlpha;
  gl_FragColor = vec4(c * a, a);
}`,
};

const LINES = {
  vs: HEAD + COMMON_VS + `
attribute vec4 aPos; varying float vFace, vK;
void main(){
  vec4 vp = uView * uModel * vec4(aPos.xyz, 1.0);
  vec3 n = normalize(mat3(uView * uModel) * aPos.xyz);
  vFace = dot(n, normalize(-vp.xyz)); vK = aPos.w;
  gl_Position = project(vp);
}`,
  fs: HEAD + `
varying float vFace, vK; uniform vec3 uCol, uAccent; uniform float uAlpha, uTime;
void main(){
  // vK: 0 graticule, 1 equator, 2 axis, 3 orbit (dashed)
  float a = vK < 0.5 ? 0.10 : vK < 1.5 ? 0.22 : vK < 2.5 ? 0.55 : 0.32;
  if (vK < 1.5) a *= smoothstep(0.0, 0.35, vFace);
  vec3 c = vK > 0.5 && vK < 1.5 ? uAccent : uCol;
  gl_FragColor = vec4(c * a * uAlpha, a * uAlpha);
}`,
};

const MARKS = {
  vs: HEAD + COMMON_VS + `
attribute vec4 aPos; uniform float uPx, uDpr; varying float vFace, vPh;
void main(){
  vec4 vp = uView * uModel * vec4(aPos.xyz * 1.004, 1.0);
  vec3 n = normalize(mat3(uView * uModel) * aPos.xyz);
  vFace = dot(n, normalize(-vp.xyz)); vPh = aPos.w;
  gl_Position = project(vp);
  gl_PointSize = 26.0 * uDpr;
}`,
  fs: HEAD + `
varying float vFace, vPh; uniform vec3 uAccent; uniform float uTime, uAlpha;
void main(){
  float d = length(gl_PointCoord * 2.0 - 1.0);
  float t = fract(uTime * 0.55 + vPh);
  float ring = smoothstep(0.09, 0.0, abs(d - t)) * (1.0 - t);
  float core = smoothstep(0.24, 0.16, d);
  float a = max(ring * 0.9, core) * smoothstep(0.05, 0.3, vFace) * uAlpha;
  gl_FragColor = vec4(uAccent * a, a);
}`,
};

function compile(gl, src) {
  const p = gl.createProgram();
  for (const [type, code] of [[gl.VERTEX_SHADER, src.vs], [gl.FRAGMENT_SHADER, src.fs]]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, code); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const { name } = gl.getActiveUniform(p, i); u[name] = gl.getUniformLocation(p, name); }
  return { p, u, a: (name) => gl.getAttribLocation(p, name) };
}

function hex(h) { const v = parseInt(h.slice(1), 16); return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255]; }

export const THEMES = {
  night: { ocean: '#0f1112', rim: '#7f97a3', glow: '#5d7a8a', dot: '#efece4', dotDim: '#4a4944', line: '#d8d5cc', accent: '#ff5226' },
  day:   { ocean: '#cfccc3', rim: '#ffffff', glow: '#ffffff', dot: '#121212', dotDim: '#8c8a83', line: '#121212', accent: '#f0410f' },
};

/* ---------- Globe ---------- */
export class Globe {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} o  size: globe radius as fraction of min(w,h)/2; offset: [x,y] NDC shift;
   *                    markers: [{lat,lon}]; spin: rad/s; interactive; focus: {lat,lon}; tilt: bool
   */
  constructor(canvas, o = {}) {
    this.c = canvas;
    this.o = Object.assign({ size: 0.8, offset: [0, 0], markers: [], spin: 0.045, interactive: false, tilt: true, fov: 28, glow: 1, orbit: false, sizeRef: 'min', dotScale: 1 }, o);
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('webgl');
    this.gl = gl;
    this.theme = THEMES.night;
    this.spin = o.focus ? -o.focus.lon * DEG : (o.startLon != null ? -o.startLon * DEG : 2.2);
    this.yaw = 0; this.pitch = o.focus ? o.focus.lat * DEG * 0.85 : 0;
    this.tYaw = 0; this.tPitch = this.pitch; this.vel = 0; this.scroll = 0; this.alpha = 0; this.tAlpha = 1;
    this.zoom = 1; this.tZoom = 1; this.time = 0; this.running = false; this.reduced = false;
    this.onFrame = null; this.cursor = null;
    this._build();
    this.resize();
    if (this.o.interactive) this._bind();
  }

  _build() {
    const gl = this.gl;
    this.pg = { glow: compile(gl, GLOW), sphere: compile(gl, SPHERE), dots: compile(gl, DOTS), lines: compile(gl, LINES), marks: compile(gl, MARKS) };
    const buf = (data, target = gl.ARRAY_BUFFER) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; };

    // sphere mesh
    const SEG = 72, RING = 36, pos = [], idx = [];
    for (let r = 0; r <= RING; r++) {
      const v = r / RING, lat = Math.PI / 2 - v * Math.PI;
      for (let s = 0; s <= SEG; s++) {
        const lon = (s / SEG) * Math.PI * 2;
        pos.push(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
      }
    }
    for (let r = 0; r < RING; r++) for (let s = 0; s < SEG; s++) {
      const a = r * (SEG + 1) + s, b = a + SEG + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    this.sphere = { v: buf(new Float32Array(pos)), i: buf(new Uint16Array(idx), gl.ELEMENT_ARRAY_BUFFER), n: idx.length };
    this.quad = buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));

    // lines: graticule (30°), equator, axis, orbit
    const L = [];
    const seg = (a, b, k) => L.push(...a, k, ...b, k);
    const R = 1.0015;
    for (let lat = -60; lat <= 60; lat += 30) {
      const k = lat === 0 ? 1 : 0;
      for (let lon = 0; lon < 360; lon += 3) {
        seg(latLonToVec(lat, lon).map((x) => x * R), latLonToVec(lat, lon + 3).map((x) => x * R), k);
      }
    }
    for (let lon = 0; lon < 360; lon += 30) for (let lat = -84; lat < 84; lat += 3) {
      seg(latLonToVec(lat, lon).map((x) => x * R), latLonToVec(lat + 3, lon).map((x) => x * R), 0);
    }
    this.lineCount = L.length / 4;
    seg([0, -1.42, 0], [0, -1.0, 0], 2); seg([0, 1.0, 0], [0, 1.42, 0], 2);
    this.axisCount = 4;
    // orbit ring (dashed), inclined, drawn in its own frame
    const OR = 1.34;
    for (let i = 0; i < 180; i += 2) {
      const a0 = (i / 180) * Math.PI * 2, a1 = ((i + 1.1) / 180) * Math.PI * 2;
      seg([Math.cos(a0) * OR, 0, Math.sin(a0) * OR], [Math.cos(a1) * OR, 0, Math.sin(a1) * OR], 3);
    }
    this.orbitCount = L.length / 4 - this.lineCount - this.axisCount;
    this.lines = buf(new Float32Array(L));

    // markers
    this.setMarkers(this.o.markers);
  }

  setMarkers(markers) {
    const gl = this.gl;
    this.o.markers = markers;
    const m = [];
    markers.forEach((k, i) => m.push(...latLonToVec(k.lat, k.lon), i * 0.37));
    if (!this.marks) this.marks = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.marks);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.length ? m : [0, 0, 0, 0]), gl.STATIC_DRAW);
  }

  _setDots(key) {
    if (this.dotKey === key) return;
    const gl = this.gl, data = landPoints(key);
    if (!this.dots) this.dots = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dots);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    this.dotN = data.length / 4; this.dotKey = key;
    this.dotSize = key === 'hi' ? 0.0078 : 0.0118;
  }

  setTheme(name) { this.theme = THEMES[name] || THEMES.night; this._col = null; }
  setFocus(lat, lon) { this.spin = -lon * DEG; this.tPitch = this.pitch = lat * DEG * 0.85; }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.c.clientWidth, h = this.c.clientHeight;
    if (!w || !h) return;
    this.dpr = dpr; this.w = w; this.h = h;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    this.gl.viewport(0, 0, this.c.width, this.c.height);
    this.fov = this.o.fov * DEG;
    const ref = this.o.sizeRef === 'width' ? w : Math.min(w, h);
    const f = this.o.size * ref / h; // silhouette radius as fraction of half-height
    this.dist = 1 / Math.sin(Math.atan(f * Math.tan(this.fov / 2)));
    this.radiusPx = this.o.size * ref / 2;
    this._setDots(this.radiusPx > 230 ? 'hi' : 'lo');
    this.proj = M.persp(this.fov, w / h, 0.1, 100);
  }

  _bind() {
    this._onMove = (e) => {
      if (this.reduced) return;
      this.tYaw = (e.clientX / window.innerWidth - 0.5) * 0.32;
      this.tPitch = (e.clientY / window.innerHeight - 0.5) * 0.2;
      const r = this.c.getBoundingClientRect();
      this.cursor = [e.clientX - r.left, e.clientY - r.top];
    };
    window.addEventListener('pointermove', this._onMove, { passive: true });
    let drag = null;
    this.c.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, t: performance.now() }; this.c.setPointerCapture(e.pointerId); });
    this.c.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, now = performance.now();
      this.spin += dx * 0.005;
      this.vel = (dx * 0.005) / Math.max(16, now - drag.t) * 1000;
      drag.x = e.clientX; drag.t = now;
    });
    const end = () => { drag = null; };
    this.c.addEventListener('pointerup', end); this.c.addEventListener('pointercancel', end);
    this.c.addEventListener('pointerleave', () => { this.cursor = null; });
  }

  kick(v) { if (!this.reduced) this.vel += v; }

  start() {
    if (this.running) return;
    this.running = true; this.last = performance.now();
    const loop = (t) => { if (!this.running) return; this.frame(t); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  orbitModel() { return M.mul(M.rx(this.pitch + 0.32), M.mul(M.ry(this.yaw), M.rz(-0.38))); }

  model() {
    let m = M.ry(this.spin);
    if (this.o.tilt) m = M.mul(M.rz(-AXIAL_TILT * DEG), m);
    return M.mul(M.rx(this.pitch), M.mul(M.ry(this.yaw), m));
  }

  frame(now = performance.now()) {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now; this.time += dt;
    const k = 1 - Math.pow(0.0025, dt);
    if (!this.reduced) this.spin += (this.o.spin + this.vel) * dt;
    this.vel *= Math.pow(0.06, dt);
    this.yaw += (this.tYaw - this.yaw) * k;
    this.pitch += (this.tPitch - this.pitch) * k;
    this.alpha += (this.tAlpha - this.alpha) * (1 - Math.pow(0.02, dt));
    this.zoom += (this.tZoom - this.zoom) * k;
    this.draw();
  }

  draw() {
    const gl = this.gl, T = this.theme, P = this.pg;
    if (!this.dist) return;
    const dist = this.dist / this.zoom;
    const view = M.tz(-dist), model = this.model(), mv = M.mul(view, model);
    const off = this.o.offset;
    const light = [-0.5, 0.42, 0.76];
    const col = this._col || (this._col = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, hex(v)])));
    const pxScale = (this.c.height / 2) / Math.tan(this.fov / 2);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);

    const common = (p) => {
      gl.useProgram(p.p);
      gl.uniformMatrix4fv(p.u.uProj, false, this.proj);
      if (p.u.uView) gl.uniformMatrix4fv(p.u.uView, false, view);
      if (p.u.uModel) gl.uniformMatrix4fv(p.u.uModel, false, model);
      gl.uniform2f(p.u.uOffset, off[0], off[1]);
      if (p.u.uAlpha) gl.uniform1f(p.u.uAlpha, this.alpha);
      if (p.u.uTime) gl.uniform1f(p.u.uTime, this.time);
      if (p.u.uDpr) gl.uniform1f(p.u.uDpr, this.dpr);
      if (p.u.uLight) gl.uniform3fv(p.u.uLight, normalize(light));
      if (p.u.uAccent) gl.uniform3fv(p.u.uAccent, col.accent);
    };
    const attr = (p, name, b, size) => { const l = p.a(name); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); return l; };

    // 1. atmosphere halo (additive, behind)
    gl.disable(gl.DEPTH_TEST);
    gl.blendFunc(gl.ONE, gl.ONE);
    common(P.glow);
    const sil = 1 * dist / Math.sqrt(dist * dist - 1);
    gl.uniform1f(P.glow.u.uSize, sil * 1.6);
    gl.uniform1f(P.glow.u.uDist, dist);
    gl.uniform1f(P.glow.u.uSil, sil);
    gl.uniform3fv(P.glow.u.uGlow, col.glow.map((x) => x * 0.42 * this.o.glow));
    let l = attr(P.glow, 'aQuad', this.quad, 2);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(l);

    // 2. ocean sphere (writes depth)
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    common(P.sphere);
    gl.uniform3fv(P.sphere.u.uOcean, col.ocean);
    gl.uniform3fv(P.sphere.u.uRim, col.rim);
    l = attr(P.sphere, 'aPos', this.sphere.v, 3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.sphere.i);
    gl.drawElements(gl.TRIANGLES, this.sphere.n, gl.UNSIGNED_SHORT, 0);
    gl.disableVertexAttribArray(l);

    // 3. graticule + axis (depth-tested, no depth write)
    gl.depthMask(false);
    common(P.lines);
    gl.uniform3fv(P.lines.u.uCol, col.line);
    l = attr(P.lines, 'aPos', this.lines, 4);
    gl.drawArrays(gl.LINES, 0, this.lineCount + this.axisCount);
    if (this.o.orbit) {
      // a fixed, inclined orbit ring — independent of Earth's spin
      gl.uniformMatrix4fv(P.lines.u.uModel, false, this.orbitModel());
      gl.drawArrays(gl.LINES, this.lineCount + this.axisCount, this.orbitCount);
    }
    gl.disableVertexAttribArray(l);

    // 4. land dots
    common(P.dots);
    gl.uniform1f(P.dots.u.uSize, this.dotSize * this.o.dotScale * (this.dpr > 1 ? 1 : 1.12));
    gl.uniform1f(P.dots.u.uPx, pxScale);
    gl.uniform3fv(P.dots.u.uDot, col.dot);
    gl.uniform3fv(P.dots.u.uDotDim, col.dotDim);
    l = attr(P.dots, 'aPos', this.dots, 4);
    gl.drawArrays(gl.POINTS, 0, this.dotN);
    gl.disableVertexAttribArray(l);

    // 5. markers
    if (this.o.markers.length) {
      common(P.marks);
      gl.uniform1f(P.marks.u.uPx, pxScale);
      l = attr(P.marks, 'aPos', this.marks, 4);
      gl.drawArrays(gl.POINTS, 0, this.o.markers.length);
      gl.disableVertexAttribArray(l);
    }
    gl.depthMask(true);

    if (this.onFrame) this.onFrame(this._screen(mv, dist));
  }

  // marker screen positions + cursor geo-coordinates, for HTML overlays
  _screen(mv, dist) {
    const out = { markers: [], cursor: null, center: null };
    const toScreen = (v) => {
      const p = M.apply(mv, v); const z = p[2] - dist;
      const t = 1 / Math.tan(this.fov / 2);
      const x = (p[0] * t / (this.w / this.h)) / -z + this.o.offset[0];
      const y = (p[1] * t) / -z + this.o.offset[1];
      return { x: (x * 0.5 + 0.5) * this.w, y: (0.5 - y * 0.5) * this.h };
    };
    for (const m of this.o.markers) {
      const v = latLonToVec(m.lat, m.lon);
      const s = toScreen(v);
      s.facing = M.apply(mv, v)[2]; // >0 → on the visible hemisphere (approx.)
      out.markers.push(s);
    }
    if (this.cursor) {
      // ray–sphere in view space
      const t = Math.tan(this.fov / 2), asp = this.w / this.h;
      const nx = ((this.cursor[0] / this.w) * 2 - 1 - this.o.offset[0]) * t * asp;
      const ny = ((1 - this.cursor[1] / this.h) * 2 - 1 - this.o.offset[1]) * t;
      const d = normalize([nx, ny, -1]), o = [0, 0, dist];
      const b = o[0] * d[0] + o[1] * d[1] + o[2] * d[2], c = dist * dist - 1, disc = b * b - c;
      if (disc > 0) {
        const s = -b - Math.sqrt(disc);
        const hit = [o[0] + d[0] * s, o[1] + d[1] * s, o[2] + d[2] * s];
        // inverse rotation = transpose
        const m = this.model();
        const lp = [m[0] * hit[0] + m[1] * hit[1] + m[2] * hit[2], m[4] * hit[0] + m[5] * hit[1] + m[6] * hit[2], m[8] * hit[0] + m[9] * hit[1] + m[10] * hit[2]];
        out.cursor = { lat: Math.asin(Math.max(-1, Math.min(1, lp[1]))) / DEG, lon: Math.atan2(lp[0], lp[2]) / DEG };
      }
    }
    return out;
  }
}

function normalize(v) { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
