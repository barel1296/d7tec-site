/* Creative Lab · d7tec / PRESS START v3 · section 7
   export function init(root, { icons } = {})
   Enhances the static .cl-root markup: ARIA tabs (arrows, Home/End), the 142-tile test board, and the ads,
   each a 9:16 frame drawn in Canvas 2D (no images, no video). One rAF loop for the whole module: it runs only
   while a frame of the active tab is on screen and the page is visible. prefers-reduced-motion → still
   poster frames plus a "Play ads" control; the playable still plays on tap (user-started motion).
   Idempotent: calling init() twice on the same root returns the same instance. instance.destroy() unbinds.
   Icons: the tab/kicker glyphs upgrade to the 3D PNGs in ./icons/ (next to this file) when they load;
   override with init(root, { icons: 'path/' }) or data-icons="path/" on .cl-root, or "none" to keep the SVGs. */

const INSTANCES = new WeakMap();

export function init(root, opts = {}) {
  if (!root || typeof root.querySelector !== 'function') return null;
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const lab = new Lab(root, opts || {});
  INSTANCES.set(root, lab);
  return lab;
}

/* ================================================================== helpers */
const TAU = Math.PI * 2, C30 = Math.cos(Math.PI / 6), S30 = 0.5, SQ2 = Math.SQRT2, HR = 16 / 9;
const DISPLAY = '"Unbounded", "Figtree", system-ui, sans-serif';
const UI = '"Figtree", system-ui, sans-serif';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const eOut = t => 1 - (1 - t) ** 3;
const eOut2 = t => 1 - (1 - t) ** 2;
const eIO = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const eBack = t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const RGB = {};
const rgb = c => RGB[c] || (RGB[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`; };
const rgba = (c, a) => { const A = rgb(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; };

function lg(ctx, x0, y0, x1, y1, st) { const g = ctx.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
function rg(ctx, x, y, r, st) { const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.01, r)); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
function rgf(ctx, fx, fy, x, y, r, st) { const g = ctx.createRadialGradient(fx, fy, 0, x, y, Math.max(0.01, r)); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); }
function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU); }
function font(ctx, w, size, fam = DISPLAY) { ctx.font = `${w} ${Math.max(1, size).toFixed(1)}px ${fam}`; }

/* soft 4-point sparkle */
function sparkle(ctx, x, y, r, a, col = '#FFFFFF') {
  if (a <= 0 || r <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y); ctx.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y); ctx.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r); ctx.fill(); ctx.restore();
}

/* text pop that rises and fades, gold-white like the page's .pop */
function popText(ctx, str, x, y, size, p, warm = true) {
  if (p < 0 || p > 1) return;
  const a = p < 0.12 ? p / 0.12 : 1 - seg(p, 0.55, 1);
  const sc = p < 0.18 ? lerp(0.72, 1.06, p / 0.18) : lerp(1.06, 1, seg(p, 0.18, 0.32));
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y - eOut(p) * size * 1.1); ctx.scale(sc, sc);
  font(ctx, 800, size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.16; ctx.strokeStyle = 'rgba(14,21,48,.28)';
  ctx.shadowColor = 'rgba(10,14,40,.55)'; ctx.shadowBlur = size * 0.5; ctx.shadowOffsetY = size * 0.12;
  ctx.strokeText(str, 0, 0); ctx.shadowColor = 'transparent';
  ctx.fillStyle = lg(ctx, 0, -size * 0.5, 0, size * 0.5, [0, '#FFFFFF', 1, warm ? '#FFD66E' : '#BFF5E3']);
  ctx.fillText(str, 0, 0); ctx.restore();
}

function vignette(ctx, W, H, a = 0.28) {
  ctx.fillStyle = rg(ctx, W / 2, H * 0.48, Math.hypot(W, H) * 0.62, [0, 'rgba(8,10,30,0)', 0.62, 'rgba(8,10,30,0)', 1, `rgba(8,10,30,${a})`]);
  ctx.fillRect(0, 0, W, H);
}

/* the tutorial / cursor hand (same path as the #cl-u-hand symbol, 48×48 box, fingertip ≈ (18.6, 5.2)) */
const HAND_D = 'M18.6 5.2c2.1 0 3.8 1.7 3.8 3.8v11.2l1.6-.3c1.9-.3 3.6.8 4.1 2.5 1.9-.6 3.9.4 4.5 2.2 1.9-.4 3.8.7 4.3 2.6l.9 3.8c.8 3.5.2 7.2-1.6 10.3l-1.6 2.7c-.7 1.2-2 1.9-3.4 1.9h-9.7c-1.4 0-2.7-.7-3.4-1.9L11.2 33c-1-1.6-.6-3.7 1-4.7 1.4-.9 3.3-.6 4.3.7l.3.4V9c0-2.1 1.7-3.8 3.8-3.8z';
let HAND_P = null;
function hand(ctx, x, y, size, a = 1, press = 0) {
  if (a <= 0) return;
  if (!HAND_P && typeof Path2D === 'function') HAND_P = new Path2D(HAND_D);
  if (!HAND_P) return;
  const k = size / 48;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(k * (1 - press * 0.08), k * (1 - press * 0.08)); ctx.translate(-18.6, -5.2 + press * 2);
  ctx.shadowColor = 'rgba(10,14,40,.4)'; ctx.shadowBlur = 8 / k; ctx.shadowOffsetY = 3 / k;
  ctx.fillStyle = '#FFFFFF'; ctx.fill(HAND_P);
  ctx.shadowColor = 'transparent'; ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(14,21,48,.22)'; ctx.stroke(HAND_P);
  ctx.restore();
}

/* ================================================================== iso blocks (Stackopolis) */
const BH = 0.5;
const PAL = {
  porcelain: ['#FFFFFF', '#F1EDE8', '#ECE7E1', '#D8D1C9', '#CBC3BA', '#ACA49A'],
  tomato: ['#FFA48E', '#FF7C61', '#F76A4F', '#E24A31', '#CF4129', '#A93220'],
  sun: ['#FFE3A1', '#FFCD5C', '#FFBF3A', '#F2A41C', '#DE9416', '#B9760C'],
  mint: ['#B4F7E2', '#7DEBCB', '#4ADDB2', '#2CC497', '#24A882', '#1A8466'],
  cobalt: ['#B3C3FF', '#8098FF', '#4D6BF2', '#3655DE', '#2E47C2', '#22369A'],
  graphite: ['#6B7396', '#4C5475', '#363E5E', '#2A3150', '#20263F', '#171B2E'],
  gold: ['#FFF0B8', '#FFD66E', '#FFC74A', '#F2A516', '#D88E0E', '#AE6F06'],
};
const DARK_FACE = { cobalt: 1, graphite: 1 };
const RAMP = ['porcelain', 'tomato', 'sun', 'mint', 'cobalt'];
const HUE = ['porcelain', 'sun', 'tomato', 'cobalt', 'mint'];
const PCACHE = new Map();
/* palette for floor k: a smooth walk through the block materials, 4 floors per step */
function hueAt(k, per = 4) {
  const key = Math.round(k * 8) / 8;
  if (PCACHE.has(key)) return PCACHE.get(key);
  const f = (((key / per) % HUE.length) + HUE.length) % HUE.length, i = Math.floor(f), u = eIO(f - i);
  const A = PAL[HUE[i]], B = PAL[HUE[(i + 1) % HUE.length]], P = A.map((c, j) => mix(c, B[j], u));
  const lum = rgb2l(P[2]); P.dark = lum < 0.42;
  PCACHE.set(key, P); return P;
}
function rgb2l(c) { const m = c.match(/\d+/g); return m ? (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 : 0.5; }
const isx = (cam, X, Z) => cam.ox + (X - Z) * C30 * cam.s;
const isy = (cam, X, Y, Z) => cam.oy + (X + Z) * S30 * cam.s - Y * cam.s;

function isoBlock(ctx, cam, b) {
  const P = b.pal || PAL[b.c] || PAL.porcelain, s = cam.s, h = b.h ?? BH;
  const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2, yT = b.y + h;
  const A = [isx(cam, x0, z0), isy(cam, x0, yT, z0)], B = [isx(cam, x1, z0), isy(cam, x1, yT, z0)];
  const C = [isx(cam, x1, z1), isy(cam, x1, yT, z1)], D = [isx(cam, x0, z1), isy(cam, x0, yT, z1)];
  const hb = h * s, Bb = [B[0], B[1] + hb], Cb = [C[0], C[1] + hb], Db = [D[0], D[1] + hb];
  ctx.save();
  if (b.a != null) ctx.globalAlpha *= b.a;
  if (b.rot) { const cx = (D[0] + B[0]) / 2, cy = (A[1] + Cb[1]) / 2; ctx.translate(cx, cy); ctx.rotate(b.rot); ctx.translate(-cx, -cy); }
  ctx.fillStyle = P[5]; poly(ctx, [A, B, Bb, Cb, Db, D]); ctx.fill();
  ctx.fillStyle = lg(ctx, 0, D[1], 0, Db[1], [0, P[2], 1, P[3]]); poly(ctx, [D, C, Cb, Db]); ctx.fill();
  ctx.fillStyle = lg(ctx, 0, B[1], 0, Bb[1], [0, P[4], 1, P[5]]); poly(ctx, [C, B, Bb, Cb]); ctx.fill();
  ctx.fillStyle = lg(ctx, D[0], 0, C[0], 0, [0, 'rgba(255,255,255,0)', 0.2, 'rgba(255,255,255,.13)', 0.48, 'rgba(255,255,255,0)']); poly(ctx, [D, C, Cb, Db]); ctx.fill();
  if (b.win !== false && s * 0.2 > 3) isoWindows(ctx, cam, b, x0, x1, z0, z1, h, P.dark ?? DARK_FACE[b.c]);
  ctx.fillStyle = lg(ctx, 0, Cb[1] - hb * 0.55, 0, Cb[1], [0, 'rgba(6,10,34,0)', 1, 'rgba(6,10,34,.2)']); poly(ctx, [D, C, B, Bb, Cb, Db]); ctx.fill();
  ctx.fillStyle = lg(ctx, A[0], A[1], C[0], C[1], [0, P[0], 1, P[1]]); poly(ctx, [A, B, C, D]); ctx.fill();
  ctx.fillStyle = rg(ctx, lerp(A[0], C[0], 0.3), lerp(A[1], C[1], 0.3), Math.hypot(C[0] - A[0], C[1] - A[1]) * 0.55, [0, 'rgba(255,255,255,.36)', 1, 'rgba(255,255,255,0)']);
  poly(ctx, [A, B, C, D]); ctx.fill();
  if (b.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${b.flash})`; poly(ctx, [A, B, C, D]); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${b.flash * 0.45})`; poly(ctx, [D, C, B, Bb, Cb, Db]); ctx.fill();
  }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, s * 0.024); ctx.strokeStyle = 'rgba(255,255,255,.62)';
  ctx.beginPath(); ctx.moveTo(D[0], D[1]); ctx.lineTo(C[0], C[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
  ctx.lineWidth = Math.max(0.75, s * 0.014); ctx.strokeStyle = 'rgba(255,255,255,.2)';
  ctx.beginPath(); ctx.moveTo(C[0], C[1] + 1); ctx.lineTo(Cb[0], Cb[1] - 1); ctx.stroke();
  ctx.restore();
}

function isoWindows(ctx, cam, b, x0, x1, z0, z1, h, dark) {
  const sp = 0.6, ww = 0.2, ya = b.y + h * 0.3, yb = b.y + h * 0.68;
  const seed = b.seed || 0, lit = b.lit || 0;
  const gl = dark ? 'rgba(214,226,255,.16)' : 'rgba(20,28,68,.13)', gr = dark ? 'rgba(214,226,255,.1)' : 'rgba(20,28,68,.16)';
  const on = 'rgba(255,232,170,.92)';
  for (let k = Math.ceil((x0 + 0.1 + ww / 2) / sp); k * sp + ww / 2 <= x1 - 0.1; k++) {
    const a = k * sp - ww / 2, c = k * sp + ww / 2;
    ctx.fillStyle = hash(k * 3.1 + seed) < lit ? on : gl;
    poly(ctx, [[isx(cam, a, z1), isy(cam, a, yb, z1)], [isx(cam, c, z1), isy(cam, c, yb, z1)], [isx(cam, c, z1), isy(cam, c, ya, z1)], [isx(cam, a, z1), isy(cam, a, ya, z1)]]); ctx.fill();
  }
  for (let k = Math.ceil((z0 + 0.1 + ww / 2) / sp); k * sp + ww / 2 <= z1 - 0.1; k++) {
    const a = k * sp - ww / 2, c = k * sp + ww / 2;
    ctx.fillStyle = hash(k * 5.7 + seed + 9) < lit ? on : gr;
    poly(ctx, [[isx(cam, x1, a), isy(cam, x1, yb, a)], [isx(cam, x1, c), isy(cam, x1, yb, c)], [isx(cam, x1, c), isy(cam, x1, ya, c)], [isx(cam, x1, a), isy(cam, x1, ya, a)]]); ctx.fill();
  }
}

function isoRing(ctx, cam, b, p) {
  if (p < 0 || p > 1) return;
  const k = 1 + eOut(p) * 0.55, hw = (b.w / 2) * k, hd = (b.d / 2) * k, y = b.y + BH;
  const pts = [[b.x - hw, b.z - hd], [b.x + hw, b.z - hd], [b.x + hw, b.z + hd], [b.x - hw, b.z + hd]].map(([X, Z]) => [isx(cam, X, Z), isy(cam, X, y, Z)]);
  ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - p)})`; ctx.lineWidth = Math.max(1.2, cam.s * 0.06 * (1 - p)); ctx.lineJoin = 'round';
  poly(ctx, pts); ctx.stroke(); ctx.restore();
}

function isoDisc(ctx, cam, r, y0, h, top, side) {
  const cx = cam.ox, yT = cam.oy - (y0 + h) * cam.s, yB = cam.oy - y0 * cam.s;
  const rx = r * C30 * SQ2 * cam.s, ry = r * S30 * SQ2 * cam.s;
  ctx.fillStyle = lg(ctx, cx - rx, 0, cx + rx, 0, [0, side[0], 0.42, side[0], 1, side[1]]);
  ctx.beginPath(); ctx.moveTo(cx - rx, yT); ctx.lineTo(cx - rx, yB); ctx.ellipse(cx, yB, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + rx, yT); ctx.closePath(); ctx.fill();
  ctx.fillStyle = lg(ctx, cx, yT - ry, cx, yT + ry, [0, top[0], 1, top[1]]); ell(ctx, cx, yT, rx, ry); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, yT, Math.max(0, rx - 0.5), Math.max(0, ry - 0.5), 0, 0.12, Math.PI - 0.12); ctx.stroke();
}

function isoPlinth(ctx, cam, r) {
  const y = cam.oy, s = cam.s;
  if (y - 0.4 * s > cam.H + 40 || y + 2.6 * r * s < -40) return;
  isoDisc(ctx, cam, r * 1.09, -0.66, 0.3, ['#5A628A', '#2D3455'], ['#3A4266', '#141829']);
  isoDisc(ctx, cam, r, -0.36, 0.36, ['#FFFFFF', '#E6E0D9'], ['#EEE9E3', '#B8AFA5']);
  ctx.save(); ctx.translate(isx(cam, 0.35, -0.25), isy(cam, 0.35, 0, -0.25)); ctx.scale(1, 0.5);
  ctx.fillStyle = rg(ctx, 0, 0, 1.75 * s * C30 * SQ2, [0, 'rgba(14,18,46,.32)', 1, 'rgba(14,18,46,0)']); circ(ctx, 0, 0, 1.75 * s * C30 * SQ2); ctx.fill();
  ctx.restore();
}

/* Stackopolis sky: golden hour at the street, deep blue at altitude */
function skyStack(ctx, W, H, alt) {
  ctx.fillStyle = lg(ctx, 0, 0, 0, H, [0, mix('#5E7CFF', '#131A55', alt), 0.46, mix('#A98BE2', '#2C3790', alt), 0.8, mix('#FFB48E', '#6563BE', alt), 1, mix('#FFE1B0', '#A296DC', alt)]);
  ctx.fillRect(0, 0, W, H);
  const a = 0.52 * (1 - alt);
  if (a > 0.01) { ctx.fillStyle = rg(ctx, W * 0.24, H * 0.2, W * 1.05, [0, `rgba(255,238,205,${a})`, 0.4, `rgba(255,238,205,${a * 0.32})`, 1, 'rgba(255,238,205,0)']); ctx.fillRect(0, 0, W, H); }
}
const CITY = Array.from({ length: 16 }, (_, i) => ({ x: (i + hash(i) * 0.5) / 15.5, w: 0.07 + hash(i + 3) * 0.06, h: 0.05 + hash(i + 7) ** 1.6 * 0.2 }));
function skyline(ctx, W, H, baseY, alt, seed = 0) {
  if (baseY > H + 4) return;
  const far = mix('#B49BE0', '#4D4FA6', alt), near = mix('#8E82D6', '#363C8C', alt);
  for (let L = 0; L < 2; L++) {
    ctx.fillStyle = L ? near : far;
    const sc = L ? 1 : 0.72, off = L ? 0.37 + seed : 0.11 + seed, by = baseY + (L ? H * 0.02 : 0);
    for (const b of CITY) {
      const x = (((b.x + off) % 1.08) - 0.04) * W, w = b.w * W * sc, h = b.h * H * sc * (L ? 1 : 1.25);
      rr(ctx, x, by - h, w, h + H, Math.min(w * 0.16, 5)); ctx.fill();
    }
  }
  ctx.fillStyle = lg(ctx, 0, baseY - H * 0.1, 0, baseY + H * 0.05, [0, 'rgba(255,240,220,0)', 1, `rgba(255,232,210,${0.35 * (1 - alt)})`]);
  ctx.fillRect(0, baseY - H * 0.1, W, H * 0.3);
}
function cloudBand(ctx, W, y, t, a, seed = 0) {
  if (y < -W || y > ctx.canvas.height + W) return;
  ctx.save(); ctx.translate(0, y); ctx.scale(1, 0.3);
  for (let i = 0; i < 7; i++) {
    const r = W * (0.3 + hash(i + 5 + seed) * 0.24);
    const x = ((((i * 0.19 + hash(i + seed) * 0.3 + t * 0.012 * (i % 2 ? 1 : -1)) % 1.3) + 1.3) % 1.3 - 0.15) * W;
    const yy = (hash(i + 2 + seed) - 0.5) * W * 0.5;
    ctx.fillStyle = rg(ctx, x, yy, r, [0, `rgba(255,255,255,${a})`, 0.55, `rgba(255,255,255,${a * 0.42})`, 1, 'rgba(255,255,255,0)']);
    ctx.fillRect(x - r, yy - r, r * 2, r * 2);
  }
  ctx.restore();
}

/* floors from a script: [{t, off, c}] → positions after trimming, landing spots and slices */
function stackScript(spec, w0 = 2.4) {
  const F = []; let x = 0, z = 0, w = w0, d = w0;
  spec.forEach((sp, i) => {
    const axis = i % 2 ? 'x' : 'z', off = sp.off || 0, mw = w, md = d;
    if (sp.dx) x += sp.dx;
    let lx = x, lz = z, slice = null;
    if (axis === 'x') lx = x + off; else lz = z + off;
    if (off) {
      if (axis === 'x') { slice = { x: x + (Math.sign(off) * w) / 2 + off / 2, z, w: Math.abs(off), d }; x += off / 2; w -= Math.abs(off); }
      else { slice = { x, z: z + (Math.sign(off) * d) / 2 + off / 2, w, d: Math.abs(off) }; z += off / 2; d -= Math.abs(off); }
    }
    F.push({ i, t: sp.t, axis, x, z, w, d, lx, lz, mw, md, off, slice, c: sp.c || RAMP[i % RAMP.length], pal: sp.c ? null : hueAt(i + (sp.h0 || 0)), seed: i * 1.37 + 0.4, lit: sp.lit ?? 0.14 });
  });
  return F;
}
const placedCount = (F, t) => { let n = 0; for (const f of F) if (f.t <= t) n++; return n; };
function camTop(F, t, n, dur = 0.3) {
  const last = n ? F[n - 1].t : -1;
  return BH * (n - 1 + (last < 0 ? 1 : eOut(seg(t, last, last + dur))));
}
function drawFloors(ctx, cam, F, n, t, H, flashFor = 0.32) {
  for (let i = 0; i < n; i++) {
    const f = F[i], y = i * BH, sy = cam.oy - y * cam.s;
    if (sy < -cam.s * 1.5 || sy - cam.s * 3 > H) continue;
    const fl = f.t >= 0 && !f.off ? (1 - seg(t, f.t, f.t + flashFor)) * 0.55 : 0;
    isoBlock(ctx, cam, { x: f.x, z: f.z, y, w: f.w, d: f.d, c: f.c, pal: f.pal, seed: f.seed, lit: f.lit, flash: fl });
  }
}
/* the block that slides in for floor n; lands at (lx, lz) at F[n].t */
function movingFloor(ctx, cam, F, n, t, approach = 1.4, ease = null, range = 3.2) {
  if (n >= F.length || n < 1) return null;
  const f = F[n], p = F[n - 1], t0 = Math.max(p.t, f.t - approach);
  let u = seg(t, t0, f.t); if (ease) u = ease(u);
  const dist = range * (1 - u), dir = -1;
  const b = { x: f.lx + (f.axis === 'x' ? dir * dist : 0), z: f.lz + (f.axis === 'z' ? dir * dist : 0), y: n * BH, w: f.mw, d: f.md, c: f.c, pal: f.pal, seed: f.seed, lit: f.lit };
  isoBlock(ctx, cam, b);
  return b;
}

/* ================================================================== Kraken Kitchen merge board */
const MC = 5, MR = 6;
function seaBg(ctx, W, H, t, dim = 0) {
  ctx.fillStyle = lg(ctx, 0, 0, 0, H, [0, '#2BB6CB', 0.42, '#1B6E9A', 1, '#142A5A']); ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.09;
  for (let i = 0; i < 4; i++) {
    const x = W * (0.15 + i * 0.26) + Math.sin(t * 0.6 + i) * W * 0.04;
    ctx.fillStyle = lg(ctx, x, 0, x + W * 0.25, H, [0, '#FFFFFF', 1, 'rgba(255,255,255,0)']);
    ctx.beginPath(); ctx.moveTo(x - W * 0.05, 0); ctx.lineTo(x + W * 0.09, 0); ctx.lineTo(x + W * 0.32, H); ctx.lineTo(x + W * 0.12, H); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < 9; i++) {
    const r = W * (0.006 + hash(i + 3) * 0.012), x = W * hash(i + 11), y = H - (((t * (0.04 + hash(i) * 0.05) + hash(i + 7)) % 1) * H * 1.1);
    ctx.fillStyle = 'rgba(220,250,255,.28)'; circ(ctx, x + Math.sin(t * 2 + i) * W * 0.01, y, r); ctx.fill();
  }
  if (dim) { ctx.fillStyle = `rgba(4,10,26,${dim})`; ctx.fillRect(0, 0, W, H); }
}
function pearl(ctx, s) {
  const r = s * 0.24, cy = -s * 0.03;
  ctx.fillStyle = rgf(ctx, -r * 0.38, cy - r * 0.42, 0, cy, r * 1.08, [0, '#FFFFFF', 0.45, '#F2ECF7', 1, '#ADA2CB']); circ(ctx, 0, cy, r); ctx.fill();
  ctx.fillStyle = 'rgba(255,186,214,.32)'; ell(ctx, r * 0.24, cy + r * 0.38, r * 0.56, r * 0.32, -0.4); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.96)'; ell(ctx, -r * 0.38, cy - r * 0.42, r * 0.24, r * 0.14, -0.6); ctx.fill();
}
function shell(ctx, s) {
  const r = s * 0.36, hy = s * 0.2, a0 = Math.PI * 1.1, a1 = Math.PI * 1.9, n = 6;
  ctx.beginPath(); ctx.moveTo(-r * 0.2, hy); ctx.lineTo(Math.cos(a0) * r, hy + Math.sin(a0) * r * 0.95);
  for (let i = 1; i <= n; i++) {
    const a = lerp(a0, a1, i / n), am = lerp(a0, a1, (i - 0.5) / n);
    ctx.quadraticCurveTo(Math.cos(am) * r * 1.16, hy + Math.sin(am) * r * 1.1, Math.cos(a) * r, hy + Math.sin(a) * r * 0.95);
  }
  ctx.lineTo(r * 0.2, hy); ctx.closePath();
  ctx.fillStyle = lg(ctx, 0, hy - r, 0, hy, [0, '#FFE9AE', 0.6, '#FFC25A', 1, '#E8961B']); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(0.8, s * 0.022); ctx.lineCap = 'round';
  for (let i = 1; i < n; i++) { const a = lerp(a0, a1, i / n); ctx.beginPath(); ctx.moveTo(0, hy - s * 0.03); ctx.lineTo(Math.cos(a) * r * 0.9, hy + Math.sin(a) * r * 0.86); ctx.stroke(); }
  ctx.fillStyle = '#DD8F20'; rr(ctx, -r * 0.32, hy - s * 0.02, r * 0.64, s * 0.09, s * 0.03); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.42)'; ell(ctx, -r * 0.36, hy - r * 0.64, r * 0.2, r * 0.1, -0.5); ctx.fill();
}
function starfish(ctx, s) {
  const R = s * 0.37, r = s * 0.16, pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R; pts.push([Math.cos(a) * q, Math.sin(a) * q]); }
  ctx.beginPath(); ctx.moveTo((pts[9][0] + pts[0][0]) / 2, (pts[9][1] + pts[0][1]) / 2);
  for (let i = 0; i < 10; i++) { const p = pts[i], q = pts[(i + 1) % 10]; ctx.arcTo(p[0], p[1], q[0], q[1], i % 2 ? s * 0.07 : s * 0.075); }
  ctx.closePath();
  ctx.fillStyle = rgf(ctx, -s * 0.12, -s * 0.16, 0, 0, R * 1.1, [0, '#FFB59F', 0.5, '#FF7759', 1, '#C9402A']); ctx.fill();
  ctx.fillStyle = 'rgba(255,236,220,.75)';
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * TAU) / 5; circ(ctx, Math.cos(a) * R * 0.52, Math.sin(a) * R * 0.52, s * 0.03); ctx.fill(); }
  circ(ctx, 0, 0, s * 0.035); ctx.fill();
}
function fish(ctx, s) {
  const L = s * 0.3, Hh = s * 0.19;
  ctx.fillStyle = '#2E55C8'; ctx.beginPath(); ctx.moveTo(-L * 0.7, 0); ctx.quadraticCurveTo(-L * 1.2, -Hh * 1.2, -L * 1.32, -Hh * 0.95); ctx.quadraticCurveTo(-L * 1.06, 0, -L * 1.32, Hh * 0.95); ctx.quadraticCurveTo(-L * 1.2, Hh * 1.2, -L * 0.7, 0); ctx.fill();
  ctx.fillStyle = '#3A6BD6'; ctx.beginPath(); ctx.moveTo(-L * 0.25, -Hh * 0.8); ctx.quadraticCurveTo(L * 0.02, -Hh * 1.65, L * 0.32, -Hh * 0.78); ctx.fill();
  ctx.fillStyle = lg(ctx, 0, -Hh, 0, Hh, [0, '#A5C6FF', 0.5, '#4E86F5', 1, '#2D55B0']); ell(ctx, 0, 0, L, Hh); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.24)'; ell(ctx, L * 0.05, Hh * 0.45, L * 0.68, Hh * 0.34); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; circ(ctx, L * 0.5, -Hh * 0.16, Hh * 0.27); ctx.fill();
  ctx.fillStyle = '#0E1530'; circ(ctx, L * 0.56, -Hh * 0.14, Hh * 0.14); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ell(ctx, -L * 0.12, -Hh * 0.52, L * 0.34, Hh * 0.15, -0.08); ctx.fill();
}
function octo(ctx, s) {
  const r = s * 0.22, cy = -s * 0.07;
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass ? '#9C84FF' : '#5A3FC0'; ctx.lineWidth = s * (pass ? 0.06 : 0.09);
    for (let i = 0; i < 4; i++) {
      const sx = (i - 1.5) * r * 0.5, dir = i < 2 ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(sx, cy + r * 0.6); ctx.quadraticCurveTo(sx + dir * r * 0.15, cy + r * 1.35, sx + dir * r * 0.55, cy + r * 1.25); ctx.stroke();
    }
  }
  ctx.fillStyle = rgf(ctx, -r * 0.35, cy - r * 0.45, 0, cy, r * 1.15, [0, '#D9CCFF', 0.5, '#8C6CFF', 1, '#4E33B0']); ell(ctx, 0, cy, r, r * 1.04); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; circ(ctx, -r * 0.36, cy + r * 0.12, r * 0.24); ctx.fill(); circ(ctx, r * 0.36, cy + r * 0.12, r * 0.24); ctx.fill();
  ctx.fillStyle = '#1A1F38'; circ(ctx, -r * 0.31, cy + r * 0.16, r * 0.12); ctx.fill(); circ(ctx, r * 0.41, cy + r * 0.16, r * 0.12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ell(ctx, -r * 0.3, cy - r * 0.55, r * 0.28, r * 0.15, -0.4); ctx.fill();
}
function dish(ctx, s) {
  const r = s * 0.36;
  ctx.fillStyle = lg(ctx, 0, s * 0.1, 0, s * 0.26, [0, '#FFFFFF', 1, '#CFC6BB']); ell(ctx, 0, s * 0.17, r, r * 0.3); ctx.fill();
  ctx.fillStyle = lg(ctx, -r, 0, r, 0, [0, '#FFF0B8', 0.45, '#FFC74A', 1, '#C98510']);
  ctx.beginPath(); ctx.moveTo(-r * 0.82, s * 0.15); ctx.bezierCurveTo(-r * 0.82, -s * 0.3, r * 0.82, -s * 0.3, r * 0.82, s * 0.15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#E6A21C'; circ(ctx, 0, -s * 0.2, s * 0.05); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ell(ctx, -r * 0.35, -s * 0.06, r * 0.18, s * 0.08, -0.5); ctx.fill();
}
const SEA = [null, pearl, shell, starfish, fish, octo, dish];
function seaItem(ctx, v, x, y, s, sc = 1, a = 1) {
  if (!v || sc <= 0.01 || a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(12,40,70,.16)'; ell(ctx, 0, s * 0.3, s * 0.3, s * 0.065); ctx.fill();
  SEA[Math.min(6, v)](ctx, s); ctx.restore();
}

/* deterministic merge plan: greedy adjacent pairs, fixed cadence */
function planMerges(init, n, t0, dt, seed) {
  const g = init.map(r => r.slice()), moves = [], used = new Map();
  for (let k = 0; k < n; k++) {
    let best = null;
    for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) {
      const v = g[r][c]; if (!v || v >= 5) continue;
      for (const [dc, dr] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const c2 = c + dc, r2 = r + dr; if (c2 < 0 || r2 < 0 || c2 >= MC || r2 >= MR || g[r2][c2] !== v) continue;
        const cool = (used.get(r * 9 + c) ?? -9) > k - 2 || (used.get(r2 * 9 + c2) ?? -9) > k - 2;
        const sc = hash(k * 13.1 + r * 5.3 + c * 1.7 + seed) + v * 0.35 - (cool ? 5 : 0);
        if (!best || sc > best.sc) best = { a: [c, r], b: [c2, r2], v, sc };
      }
    }
    if (!best || best.sc < -2) break;
    const spawn = hash(k * 7.7 + seed) > 0.62 ? 2 : 1;
    moves.push({ t: t0 + k * dt, a: best.a, b: best.b, v: best.v, spawn });
    g[best.b[1]][best.b[0]] = best.v + 1; g[best.a[1]][best.a[0]] = spawn;
    used.set(best.a[1] * 9 + best.a[0], k); used.set(best.b[1] * 9 + best.b[0], k);
  }
  return moves;
}
function mergeState(init, moves, t) {
  const g = init.map(r => r.slice()), an = [];
  for (const m of moves) {
    if (t < m.t) break;
    const dt = t - m.t, [ac, ar] = m.a, [bc, br] = m.b;
    if (dt < 0.24) { g[ar][ac] = 0; an.push({ k: 'slide', a: m.a, b: m.b, v: m.v, p: dt / 0.24 }); continue; }
    g[ar][ac] = 0;
    if (dt < 0.64) { g[br][bc] = 0; an.push({ k: 'pop', b: m.b, v: m.v + 1, p: (dt - 0.24) / 0.4 }); } else g[br][bc] = m.v + 1;
    if (dt >= 0.5) { if (dt < 0.86) an.push({ k: 'drop', a: m.a, v: m.spawn, p: (dt - 0.5) / 0.36 }); else g[ar][ac] = m.spawn; }
  }
  return { g, an };
}
function drawBoard(ctx, x, y, w, h, init, moves, t, o = {}) {
  const ts = Math.min(w / (MC + 0.36), h / (MR + 0.36)), bw = ts * MC, bh = ts * MR, bx = x + (w - bw) / 2, by = y + (h - bh) / 2, pad = ts * 0.18;
  ctx.fillStyle = 'rgba(4,22,48,.32)'; rr(ctx, bx - pad, by - pad + ts * 0.16, bw + pad * 2, bh + pad * 2, ts * 0.42); ctx.fill();
  ctx.fillStyle = lg(ctx, 0, by - pad, 0, by + bh + pad, [0, '#FCFAF6', 1, '#DCD2C6']); rr(ctx, bx - pad, by - pad, bw + pad * 2, bh + pad * 2, ts * 0.42); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(1, ts * 0.03); rr(ctx, bx - pad + 1, by - pad + 1, bw + pad * 2 - 2, bh + pad * 2 - 2, ts * 0.4); ctx.stroke();
  for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) {
    ctx.fillStyle = (r + c) % 2 ? 'rgba(30,70,100,.075)' : 'rgba(30,70,100,.12)';
    rr(ctx, bx + c * ts + ts * 0.05, by + r * ts + ts * 0.05, ts * 0.9, ts * 0.9, ts * 0.2); ctx.fill();
  }
  if (o.hot) {
    const a = 0.45 + 0.4 * Math.sin(t * 9);
    for (const [hc, hr] of o.hot) {
      ctx.fillStyle = `rgba(255,214,110,${a * 0.55})`; rr(ctx, bx + hc * ts + ts * 0.05, by + hr * ts + ts * 0.05, ts * 0.9, ts * 0.9, ts * 0.2); ctx.fill();
      ctx.strokeStyle = `rgba(255,236,170,${a})`; ctx.lineWidth = Math.max(1.5, ts * 0.06); rr(ctx, bx + hc * ts + ts * 0.07, by + hr * ts + ts * 0.07, ts * 0.86, ts * 0.86, ts * 0.18); ctx.stroke();
    }
  }
  const { g, an } = mergeState(init, moves, t);
  const cx = c => bx + (c + 0.5) * ts, cy = r => by + (r + 0.5) * ts;
  for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) if (g[r][c] && !(o.hide && o.hide[0] === c && o.hide[1] === r)) seaItem(ctx, g[r][c], cx(c), cy(r), ts);
  let touch = null;
  for (const a of an) {
    if (a.k === 'slide') {
      const e = eIO(a.p), px = lerp(cx(a.a[0]), cx(a.b[0]), e), py = lerp(cy(a.a[1]), cy(a.b[1]), e);
      seaItem(ctx, a.v, px, py, ts, 1.08); touch = [px, py];
    } else if (a.k === 'pop') {
      const px = cx(a.b[0]), py = cy(a.b[1]);
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * (1 - a.p)})`; ctx.lineWidth = Math.max(1, ts * 0.06 * (1 - a.p)); circ(ctx, px, py, ts * (0.3 + 0.45 * eOut(a.p))); ctx.stroke();
      seaItem(ctx, a.v, px, py, ts, eBack(Math.min(1, a.p * 1.7)));
      for (let i = 0; i < 5; i++) { const ang = (i / 5) * TAU + 0.4, d = ts * (0.3 + 0.5 * eOut(a.p)); sparkle(ctx, px + Math.cos(ang) * d, py + Math.sin(ang) * d, ts * 0.09 * (1 - a.p), 1 - a.p, '#FFF6D8'); }
    } else if (a.k === 'drop') {
      const p = a.p, px = cx(a.a[0]), py = cy(a.a[1]) - ts * 0.9 * (1 - eOut2(p)) ** 2;
      seaItem(ctx, a.v, px, py, ts, 1, Math.min(1, p * 3));
    }
  }
  if (touch && o.touch !== false) { ctx.fillStyle = 'rgba(255,255,255,.3)'; circ(ctx, touch[0], touch[1], ts * 0.34); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.75)'; circ(ctx, touch[0], touch[1], ts * 0.1); ctx.fill(); }
  return { bx, by, ts, cx, cy };
}
function gameHud(ctx, x, y, w, s, lvl = 12, coins = '1,240') {
  const h = s * 0.62;
  ctx.fillStyle = 'rgba(6,30,60,.4)'; rr(ctx, x, y, s * 2.1, h, h / 2); ctx.fill();
  ctx.fillStyle = rgf(ctx, x + h * 0.42, y + h * 0.38, x + h * 0.5, y + h * 0.5, h * 0.4, [0, '#FFF4C8', 0.5, '#FFD25E', 1, '#D48A0C']); circ(ctx, x + h * 0.5, y + h / 2, h * 0.34); ctx.fill();
  font(ctx, 700, h * 0.42, UI); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(coins, x + h * 0.98, y + h * 0.53);
  const lw = s * 1.5; ctx.fillStyle = 'rgba(6,30,60,.4)'; rr(ctx, x + w - lw, y, lw, h, h / 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.fillText(`Lv ${lvl}`, x + w - lw / 2, y + h * 0.53);
}

/* the kraken's tentacle reaching in from the right */
function tentacle(ctx, W, H, t, reach, holdItem, ts, gx, gy) {
  const er0 = W * 0.022, bx = W * 1.12, by = gy + H * 0.2;
  const tx = lerp(W * 1.2, gx + er0 * 1.4, reach), ty = lerp(gy - H * 0.04, gy - er0 * 1.4, reach) + Math.sin(t * 2.6) * H * 0.008;
  const cx = (bx + tx) / 2 + W * 0.04, cy = Math.min(by, ty) - H * 0.17;
  const N = 30, pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, x = (1 - u) ** 2 * bx + 2 * (1 - u) * u * cx + u * u * tx, y = (1 - u) ** 2 * by + 2 * (1 - u) * u * cy + u * u * ty + Math.sin(u * 8 - t * 5) * H * 0.012 * u;
    pts.push([x, y, lerp(W * 0.13, W * 0.024, u ** 0.8)]);
  }
  for (let i = N; i >= 0; i--) {
    const [x, y, r] = pts[i];
    ctx.fillStyle = rgf(ctx, x - r * 0.35, y - r * 0.5, x, y, r * 1.25, [0, '#FFAE97', 0.5, '#EB5A3E', 1, '#9E2D1C']); circ(ctx, x, y, r); ctx.fill();
  }
  for (let i = 2; i < N - 1; i += 2) {
    const [x, y, r] = pts[i], [x2, y2] = pts[i + 1], nx = -(y2 - y), ny = x2 - x, l = Math.hypot(nx, ny) || 1, sx = x + (nx / l) * r * 0.6, sy = y + (ny / l) * r * 0.6;
    ctx.fillStyle = 'rgba(150,40,30,.35)'; ell(ctx, sx, sy + r * 0.04, r * 0.36, r * 0.26, Math.atan2(ny, nx)); ctx.fill();
    ctx.fillStyle = '#FFE3D4'; ell(ctx, sx, sy, r * 0.32, r * 0.22, Math.atan2(ny, nx)); ctx.fill();
    ctx.fillStyle = 'rgba(214,110,90,.6)'; ell(ctx, sx, sy, r * 0.13, r * 0.09, Math.atan2(ny, nx)); ctx.fill();
  }
  const [ex, ey, er] = pts[N];
  ctx.strokeStyle = '#D24D33'; ctx.lineWidth = er * 1.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(ex - er * 1.2, ey + er * 0.2, er * 1.3, -0.3, 2.2); ctx.stroke();
  if (holdItem) seaItem(ctx, holdItem, ex - er * 1.4, ey + er * 1.4, ts, 1.35);
  return [ex, ey];
}

/* ================================================================== Lab: tabs, board, loop */
class Lab {
  constructor(root, opts) {
    this.root = root; this.opts = opts;
    this.mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    this.paused = !!this.mq.matches;
    this.scenes = []; this.active = []; this.byFig = new Map();
    this.running = false; this.raf = 0; this.last = 0; this.n = 0; this.idx = -1;
    this.tick = this.tick.bind(this);
    this.off = [];
    root.classList.add('cl-js');
    this.initTabs();
    this.initScenes();
    this.initBoard();
    this.initPause();
    this.initObservers();
    this.initIcons(opts.icons ?? root.dataset.icons);
    const fromHash = this.panels.findIndex(p => p && '#' + p.id === location.hash);
    this.activate(fromHash >= 0 ? fromHash : 0, false);
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load(`800 40px ${DISPLAY}`), document.fonts.load(`700 20px ${UI}`)]).then(() => this.redraw(), () => {});
    }
  }
  on(el, ev, fn, o) { el.addEventListener(ev, fn, o); this.off.push(() => el.removeEventListener(ev, fn, o)); }

  initTabs() {
    this.nav = this.root.querySelector('.cl-nav');
    this.list = this.root.querySelector('.cl-tabs');
    this.tabs = [...this.root.querySelectorAll('.cl-tab')];
    this.panels = this.tabs.map(t => this.root.querySelector(t.getAttribute('href')));
    this.legendF = this.root.querySelector('.cl-legend-f');
    if (!this.list) return;
    this.list.setAttribute('role', 'tablist');
    this.list.setAttribute('aria-label', 'Ad formats');
    this.list.querySelectorAll('li').forEach(li => li.setAttribute('role', 'presentation'));
    this.tabs.forEach((tab, i) => {
      const p = this.panels[i]; if (!p) return;
      tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', p.id); tab.setAttribute('aria-selected', 'false'); tab.tabIndex = -1;
      p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', tab.id); p.tabIndex = 0; p.hidden = true;
      this.on(tab, 'click', e => { e.preventDefault(); this.activate(i, true); });
      this.on(tab, 'keydown', e => this.tabKey(e, i));
    });
    this.on(this.list, 'scroll', () => this.fades(), { passive: true });
  }
  tabKey(e, i) {
    const n = this.tabs.length; let j = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = n - 1;
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.activate(i, true); return; }
    if (j === null) return;
    e.preventDefault(); this.activate(j, true); this.tabs[j].focus({ preventScroll: true });
  }
  activate(i, user) {
    if (i === this.idx || !this.panels[i]) return;
    this.idx = i;
    this.tabs.forEach((t, k) => { const on = k === i; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
    this.panels.forEach((p, k) => { if (!p) return; const on = k === i; p.hidden = !on; p.classList.toggle('is-in', on && !!user); });
    this.root.dataset.f = this.tabs[i].dataset.f || '';
    if (this.legendF && this.tabs[i].dataset.sum) this.legendF.textContent = this.tabs[i].dataset.sum;
    this.active = this.scenes.filter(s => this.panels[i].contains(s.fig));
    for (const s of this.active) { s.reset(this.paused); if (s.resize()) s.draw0(); }
    this.reveal(i, user);
    this.fades();
    this.update();
  }
  reveal(i, user) {
    const l = this.list, t = this.tabs[i]; if (!l || !t || l.scrollWidth <= l.clientWidth + 1) return;
    const a = t.offsetLeft, b = a + t.offsetWidth, pad = 40;
    let x = null;
    if (a < l.scrollLeft + pad) x = a - pad; else if (b > l.scrollLeft + l.clientWidth - pad) x = b - l.clientWidth + pad;
    if (x !== null) l.scrollTo({ left: Math.max(0, x), behavior: user && !this.mq.matches ? 'smooth' : 'auto' });
  }
  fades() {
    const l = this.list; if (!l || !this.nav) return;
    const max = l.scrollWidth - l.clientWidth;
    this.nav.classList.toggle('is-l', max > 1 && l.scrollLeft > 2);
    this.nav.classList.toggle('is-r', max > 1 && l.scrollLeft < max - 2);
  }

  initScenes() {
    const K = { video: StackVideo, playable: StackPlayable, hook: StackHook, ugc: UgcAd, pinpull: PinPull, slots: SlotsAd, merge: MergeAd };
    for (const fig of this.root.querySelectorAll('.cl-ad[data-scene]')) {
      const C = K[fig.dataset.scene], cv = fig.querySelector('canvas.cl-cv');
      if (!C || !cv || !cv.getContext) continue;
      const ctx = cv.getContext('2d'); if (!ctx) continue;
      const s = new C(this, fig, cv, ctx);
      this.scenes.push(s); this.byFig.set(fig, s);
    }
  }

  initBoard() {
    const tiles = this.root.querySelector('.cl-tiles'); if (!tiles) return;
    let w = 0;
    [...tiles.children].forEach((el, i) => el.style.setProperty('--i', el.classList.contains('w') ? 150 + (w++) * 9 : i));
    if (this.mq.matches || !('IntersectionObserver' in window)) return;
    tiles.classList.add('cl-pre');
    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      io.disconnect();
      requestAnimationFrame(() => {
        tiles.classList.add('cl-in'); tiles.classList.remove('cl-pre');
        this.tilesT = setTimeout(() => tiles.classList.remove('cl-in'), 1900);
      });
    }, { threshold: 0.3 });
    io.observe(tiles); this.tilesIO = io;
  }

  initPause() {
    const b = this.root.querySelector('.cl-pause'); if (!b) return;
    this.pauseBtn = b; this.pauseL = b.querySelector('.cl-pause-l'); this.pauseU = b.querySelector('use');
    b.hidden = false;
    this.on(b, 'click', () => { this.paused = !this.paused; this.syncPause(); if (!this.paused) this.active.forEach(s => (s.full = false)); this.update(); });
    this.syncPause();
  }
  syncPause() {
    if (!this.pauseBtn) return;
    const label = this.paused ? 'Play ads' : 'Pause ads';
    if (this.pauseL) this.pauseL.textContent = label;
    this.pauseBtn.setAttribute('aria-label', label);
    if (this.pauseU) this.pauseU.setAttribute('href', this.paused ? '#cl-u-play' : '#cl-u-pause');
    this.root.classList.toggle('is-paused', this.paused);
  }

  initObservers() {
    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(es => {
        for (const e of es) { const s = this.byFig.get(e.target); if (s) s.visible = e.isIntersecting; }
        this.update();
      }, { rootMargin: '120px 0px' });
      this.scenes.forEach(s => this.io.observe(s.fig));
    } else this.scenes.forEach(s => (s.visible = true));
    if ('ResizeObserver' in window) {
      this.ro = new ResizeObserver(es => {
        for (const e of es) { const s = this.byFig.get(e.target); if (s && s.resize() && !this.running && this.active.includes(s)) s.draw0(); }
        this.fades();
      });
      this.scenes.forEach(s => this.ro.observe(s.fig));
      if (this.list) this.ro.observe(this.list);
    } else this.on(window, 'resize', () => { this.scenes.forEach(s => s.resize()); this.redraw(); this.fades(); });
    this.on(document, 'visibilitychange', () => this.update());
    const mqf = () => { this.paused = !!this.mq.matches; this.syncPause(); this.active.forEach(s => { s.reset(this.paused); }); this.update(); };
    if (this.mq.addEventListener) { this.mq.addEventListener('change', mqf); this.off.push(() => this.mq.removeEventListener('change', mqf)); }
    this.on(window, 'hashchange', () => { const i = this.panels.findIndex(p => p && '#' + p.id === location.hash); if (i >= 0) this.activate(i, true); });
  }

  /* 3D icons (assets/icons/<name>.png) replace the SVG glyphs once each one has loaded; data-icons="none" opts out */
  initIcons(base) {
    if (base === 'none' || base === false) return;
    let dir;
    try { dir = base ? new URL(base, document.baseURI) : new URL('./icons/', import.meta.url); } catch (e) { return; }
    for (const el of this.root.querySelectorAll('.cl-ic[data-ic]')) {
      const url = new URL(`${el.dataset.ic}.png`, dir).href;
      const img = new Image(); img.decoding = 'async';
      img.onload = () => { el.style.backgroundImage = `url("${url}")`; el.classList.add('cl-ic--png'); };
      img.src = url;
    }
  }

  live() { return !document.hidden && this.active.some(s => s.visible && (!this.paused || s.force)); }
  update() { if (this.live()) this.start(); else { this.stop(); if (!document.hidden) this.redraw(); } }
  redraw() { for (const s of this.active) if (s.W || s.resize()) s.draw0(); }
  kick(s) { if (!this.running && (s.W || s.resize())) s.draw0(); }
  start() { if (this.running) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
  stop() { this.running = false; if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
  tick(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)); this.last = now; this.n++;
    let any = false;
    for (const s of this.active) {
      if (!s.visible || (this.paused && !s.force)) continue;
      any = true; s.advance(dt);
      if (!s.small || this.n % 2 === 0) s.draw0();
    }
    if (!any) { this.stop(); return; }
    this.raf = requestAnimationFrame(this.tick);
  }
  destroy() {
    this.stop(); this.io?.disconnect(); this.ro?.disconnect(); this.tilesIO?.disconnect(); clearTimeout(this.tilesT);
    this.off.forEach(f => f()); this.off = []; this.scenes.forEach(s => s.destroy?.());
    INSTANCES.delete(this.root);
  }
}

/* ================================================================== scene base */
class Scene {
  constructor(lab, fig, cv, ctx) {
    this.lab = lab; this.fig = fig; this.cv = cv; this.ctx = ctx;
    this.small = fig.classList.contains('cl-ad--sm');
    this.bar = fig.querySelector('.cl-prog i');
    this.ovs = [...fig.querySelectorAll('.cl-o')].map(el => ({ el, on: (el.dataset.on || '').split(/\s+/), s: null }));
    this.t = 0; this.loop = 10; this.posterT = 0; this.beats = [[0, 'run']]; this.beat = null;
    this.W = 0; this.H = 0; this.dpr = 1; this.visible = false; this.force = false; this.full = false;
    this.setup();
  }
  setup() {}
  resize() {
    const W = this.cv.clientWidth, H = this.cv.clientHeight; if (!W || !H) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), pw = Math.round(W * dpr), ph = Math.round(H * dpr);
    if (this.cv.width !== pw || this.cv.height !== ph) { this.cv.width = pw; this.cv.height = ph; }
    this.W = W; this.H = H; this.dpr = pw / W; return true;
  }
  reset(paused) { this.t = paused ? this.posterT : 0; this.beat = null; this.full = !!paused; }
  advance(dt) { this.t += dt; if (this.t >= this.loop) { this.t %= this.loop; this.onLoop?.(); } }
  draw0() {
    if (!this.W && !this.resize()) return;
    const c = this.ctx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0; c.filter = 'none';
    this.draw(c, this.t, this.W, this.H);
    this.setBeat(this.beatAt(this.t));
    if (this.bar) this.bar.style.transform = `scaleX(${clamp(this.progress(), 0, 1).toFixed(4)})`;
    this.after?.(this.t);
  }
  progress() { return this.t / this.loop; }
  beatAt(t) { let b = this.beats[0][1]; for (const [s, n] of this.beats) { if (t >= s) b = n; else break; } return b; }
  setBeat(b) {
    if (b === this.beat) return;
    this.beat = b; this.fig.dataset.beat = b;
    for (const o of this.ovs) { const on = o.on.includes(b); if (on !== o.s) { o.s = on; o.el.classList.toggle('is-on', on); } }
  }
  draw() {}
}

/* ================================================================== VIDEO: Stackopolis montage */
class StackVideo extends Scene {
  setup() {
    this.loop = 12; this.posterT = 4.45;
    this.beats = [[0, 'hook'], [2.2, 'montage'], [6.9, 'near'], [8.7, 'pay'], [10, 'end']];
    const spec = [];
    for (let i = 0; i < 6; i++) spec.push({ t: -1 });
    [0.55, 1.25, 1.95].forEach(t => spec.push({ t }));
    for (let k = 0; k < 14; k++) spec.push({ t: 2.5 + k * 0.315 });
    spec.push({ t: 8.1, off: 0.62 });
    spec.push({ t: 9.25 });
    spec[0].c = 'graphite';
    this.F = stackScript(spec);
    this.near = this.F.find(f => f.off);
    const panel = this.fig.closest('.cl-panel');
    this.btns = panel ? [...panel.querySelectorAll('.cl-beat')] : [];
    this.btns.forEach(b => this.lab.on(b, 'click', () => { this.t = (+b.dataset.t || 0) + 0.001; this.beat = null; this.lab.kick(this); }));
    this.bi = -2;
  }
  shot(t) {
    if (t < 2.2) return { z: lerp(1.5, 1.66, t / 2.2), ty: 0.58 };
    if (t < 6.9) return { z: 1, ty: 0.47 };
    if (t < 8.7) return { z: lerp(1.38, 1.48, seg(t, 6.9, 8.7)), ty: 0.52 };
    const p = eIO(seg(t, 8.7, 9.95));
    return { z: lerp(1, 0.5, p) - Math.max(0, t - 10) * 0.012, ty: lerp(0.44, 0.36, p) };
  }
  draw(ctx, t, W, H) {
    const F = this.F, T = Math.min(t, 9.999), sh = this.shot(t);
    const n = placedCount(F, T), top = camTop(F, T, n, 0.3);
    const s = W * 0.115 * sh.z, cam = { ox: W / 2, oy: sh.ty * H + top * s, s, H };
    const alt = clamp((top - 3) / 9, 0, 1) * 0.88;
    skyStack(ctx, W, H, alt);
    skyline(ctx, W, H, H * 0.93 + (cam.oy + s - H * 0.93) * 0.3, alt);
    const pay = seg(t, 8.75, 9.5);
    cloudBand(ctx, W, cam.oy - 7.6 * s, t, 0.3 + 0.3 * pay);
    isoPlinth(ctx, cam, 2.15);
    drawFloors(ctx, cam, F, n, T, H);
    for (let i = 6; i < n; i++) { const f = F[i]; if (f.t >= 0 && !f.off) isoRing(ctx, cam, { x: f.x, z: f.z, y: i * BH, w: f.w, d: f.d }, seg(T, f.t, f.t + 0.45) || -1); }
    if (T < 10) movingFloor(ctx, cam, F, n, T, 1.4);
    const nf = this.near;
    if (nf && T >= nf.t) {
      const tau = (Math.min(T, 8.7) - nf.t) * 0.55 + Math.max(0, T - 8.7) * 1.6, sl = nf.slice, k = F.indexOf(nf);
      if (tau < 1.1) isoBlock(ctx, cam, { x: sl.x + tau * 0.5, z: sl.z, y: k * BH - 7 * tau * tau, w: sl.w, d: sl.d, c: nf.c, pal: nf.pal, seed: nf.seed, lit: nf.lit, rot: tau * 1.6, a: 1 - seg(tau, 0.7, 1.1) });
    }
    if (t >= 2.2 && t < 6.9) {
      if (n - 1 >= 9) { const i = n - 1, f = F[i], p = (T - f.t) / 0.5; popText(ctx, i === 9 ? 'Perfect' : `Perfect ×${i - 5}`, W / 2, sh.ty * H - H * 0.075, W * 0.064, p); }
      const cnt = n - 1, last = F[n - 1].t, bump = last >= 0 ? 1 + 0.14 * (1 - seg(T, last, last + 0.18)) : 1;
      ctx.save(); ctx.translate(W / 2, H * 0.205); ctx.scale(bump, bump);
      font(ctx, 800, W * 0.15); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(14,21,48,.35)'; ctx.shadowBlur = W * 0.04; ctx.shadowOffsetY = W * 0.008;
      ctx.fillStyle = '#FFFFFF'; ctx.fillText(String(cnt), 0, 0); ctx.restore();
    }
    if (t >= 8.7) {
      for (let i = 0; i < 16; i++) {
        const ph = (t * (0.18 + hash(i) * 0.12) + hash(i + 4)) % 1, x = W * (0.12 + hash(i + 9) * 0.76), y = H * (0.62 - ph * 0.5);
        sparkle(ctx, x, y, W * (0.008 + hash(i + 2) * 0.011), Math.sin(ph * Math.PI) * 0.75 * seg(t, 8.7, 9.3), i % 3 ? '#FFE7A3' : '#FFFFFF');
      }
      cloudBand(ctx, W, cam.oy - 6.9 * s, t + 3, 0.5 * seg(t, 8.9, 9.6), 3);
    }
    for (const tb of [2.2, 6.9, 8.7]) { const p = seg(t, tb, tb + 0.14); if (t >= tb && p < 1) { ctx.fillStyle = `rgba(255,255,255,${0.42 * (1 - p)})`; ctx.fillRect(0, 0, W, H); } }
    vignette(ctx, W, H, 0.26);
  }
  after(t) {
    let bi = -1;
    for (let i = 0; i < this.btns.length; i++) {
      const b = this.btns[i], a = +b.dataset.t, z = +b.dataset.t2, on = t >= a && t < z;
      if (on) bi = i;
      b.style.setProperty('--bp', on ? ((t - a) / (z - a)).toFixed(3) : t >= z ? '1' : '0');
    }
    if (bi !== this.bi) { this.btns.forEach((b, i) => b.classList.toggle('is-on', i === bi)); this.bi = bi; }
  }
}

/* ================================================================== PLAYABLE: tap-to-stack */
const P_RANGE = 2.75, P_TOL = 0.15, P_GOAL = 10;
class StackPlayable extends Scene {
  setup() {
    const f = this.fig;
    this.loop = 1e9; this.beats = [[0, 'play']];
    this.surface = f.querySelector('.cl-pl-surface'); this.hudEl = f.querySelector('.cl-pl-hud'); this.floorEl = f.querySelector('.cl-pl-floor');
    this.hintT = f.querySelector('.cl-pl-hint-t'); this.handEl = f.querySelector('.cl-hand');
    this.endEl = f.querySelector('.cl-pl-end'); this.endK = f.querySelector('.cl-pl-end-k'); this.endT = f.querySelector('.cl-pl-end-t');
    this.endF = f.querySelector('.cl-pl-ef'); this.endP = f.querySelector('.cl-pl-ep'); this.reBtn = f.querySelector('.cl-pl-re');
    this.status = f.querySelector('.cl-pl-status');
    this.seed = 0;
    const L = this.lab;
    if (this.surface) {
      L.on(this.surface, 'pointerdown', e => {
        if (e.button !== 0) return;
        if (e.pointerType !== 'touch') { this.tap(); return; }
        this.pd = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      });
      L.on(this.surface, 'pointerup', e => {
        const p = this.pd; this.pd = null;
        if (p && p.id === e.pointerId && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 12 && performance.now() - p.t < 450) this.tap();
      });
      L.on(this.surface, 'pointercancel', () => (this.pd = null));
      L.on(this.surface, 'keydown', e => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') { e.preventDefault(); if (!e.repeat) this.tap(); } });
    }
    if (this.reBtn) L.on(this.reBtn, 'click', () => { this.newGame('play'); this.go(); this.surface?.focus({ preventScroll: true }); });
    this.newGame('demo');
  }
  reset() { this.force = false; this.newGame('demo'); }
  advance(dt) { this.gt += dt; this.step(dt); }
  go() { this.force = true; this.lab.update(); }
  tap() {
    if (this.mode !== 'play') { this.newGame('play'); this.go(); this.say('Game started. Drop each floor with Space or Enter.'); return; }
    this.go(); this.drop();
  }
  newGame(mode) {
    this.mode = mode; this.fig.dataset.state = mode; this.seed += 1;
    this.B = [{ x: 0, z: 0, w: 2.4, d: 2.4, y: 0, c: 'graphite', t: -9 }, { x: 0, z: 0, w: 2.4, d: 2.4, y: BH, pal: hueAt(1.5), t: -9 }, { x: 0, z: 0, w: 2.4, d: 2.4, y: BH * 2, pal: hueAt(3), t: -9 }];
    this.fall = []; this.fx = []; this.perf = 0; this.combo = 0; this.drops = 0; this.gt = 0; this.endShown = false; this.restartAt = 0;
    this.cam = this.B.length * BH;
    if (this.endEl) { this.endEl.hidden = true; this.endEl.classList.remove('is-fail'); }
    this.fig.dataset.hint = mode === 'play' ? 'on' : 'off';
    if (this.hintT) this.hintT.textContent = mode === 'play' ? 'Tap to drop' : 'Tap to play';
    this.spawn(); this.hud(false);
  }
  spawn() {
    const top = this.B[this.B.length - 1], i = this.B.length, axis = i % 2 ? 'x' : 'z', from = (i >> 1) % 2 ? 1 : -1;
    this.mov = { axis, pos: from * (this.drops ? P_RANGE : 1.35), dir: -from, y: i * BH, pal: hueAt(i * 1.5), speed: 2.55 + (i - 3) * 0.17, top };
    this.prev = this.mov.pos; this.ready = this.gt + 0.2;
    this.target = this.mode === 'demo' && hash(i * 3.3 + this.seed * 1.7) < 0.24 ? (hash(i + this.seed) - 0.5) * 0.7 : 0;
  }
  movBlock() {
    const m = this.mov, t = m.top;
    return { x: t.x + (m.axis === 'x' ? m.pos : 0), z: t.z + (m.axis === 'z' ? m.pos : 0), y: m.y, w: t.w, d: t.d, pal: m.pal, seed: m.y * 7, lit: 0.14 };
  }
  drop() {
    const m = this.mov; if (!m || this.mode === 'end') return;
    const top = m.top, size = m.axis === 'x' ? top.w : top.d;
    let off = m.pos; const perfect = Math.abs(off) < P_TOL; if (perfect) off = 0;
    const over = size - Math.abs(off);
    if (over <= 0.04) {
      const b = this.movBlock(); this.fall.push({ ...b, t0: this.gt, vx: m.axis === 'x' ? Math.sign(off) * 1.4 : 0, vz: m.axis === 'z' ? Math.sign(off) * 1.4 : 0, spin: Math.sign(off) * 1.8 });
      this.mov = null; this.finish(false); return;
    }
    let nb, sl = null;
    if (m.axis === 'x') { nb = { x: top.x + off / 2, z: top.z, w: over, d: top.d }; if (off) sl = { x: top.x + (Math.sign(off) * top.w) / 2 + off / 2, z: top.z, w: Math.abs(off), d: top.d }; }
    else { nb = { x: top.x, z: top.z + off / 2, w: top.w, d: over }; if (off) sl = { x: top.x, z: top.z + (Math.sign(off) * top.d) / 2 + off / 2, w: top.w, d: Math.abs(off) }; }
    Object.assign(nb, { y: m.y, pal: m.pal, t: this.gt, perfect, seed: m.y * 7, lit: 0.14 });
    this.B.push(nb); this.drops++;
    if (sl) this.fall.push({ ...sl, y: m.y, pal: m.pal, seed: m.y * 7, lit: 0.14, t0: this.gt, vx: m.axis === 'x' ? Math.sign(off) * 0.9 : 0, vz: m.axis === 'z' ? Math.sign(off) * 0.9 : 0, spin: Math.sign(off) * (m.axis === 'x' ? 1.5 : -1.5) });
    if (perfect) { this.perf++; this.combo++; this.fx.push({ k: 'ring', b: nb, t0: this.gt }, { k: 'pop', txt: this.combo > 1 ? `Perfect ×${this.combo}` : 'Perfect', t0: this.gt }); }
    else this.combo = 0;
    this.hud(true);
    if (this.mode === 'play') {
      if (this.drops >= 2) this.fig.dataset.hint = 'off';
      this.say(`${perfect ? 'Perfect. ' : ''}Floor ${this.drops} of ${P_GOAL}.`);
    }
    if (this.drops >= P_GOAL) { this.mov = null; this.finish(true); } else this.spawn();
  }
  finish(win) {
    if (this.mode === 'demo') { this.restartAt = this.gt + 1.1; this.mode = 'demo-end'; return; }
    this.mode = 'end'; this.win = win; this.endAt = this.gt; this.fig.dataset.state = 'end';
  }
  showEnd() {
    this.endShown = true;
    if (!this.endEl) return;
    this.endEl.hidden = false; this.endEl.classList.toggle('is-fail', !this.win);
    if (this.endK) this.endK.textContent = this.win ? 'Level clear' : 'Game over';
    if (this.endT) this.endT.textContent = this.win ? 'Tower complete!' : 'So close!';
    if (this.endF) this.endF.textContent = String(this.drops);
    if (this.endP) this.endP.textContent = String(this.perf);
    const stars = this.win ? (this.perf >= 6 ? 3 : 2) : this.drops >= 4 ? 1 : 0;
    this.endEl.querySelectorAll('.cl-pl-stars svg').forEach((el, i) => el.classList.toggle('on', i < stars));
    this.endEl.querySelector('.cl-pl-stars')?.setAttribute('aria-label', `${stars} of 3 stars`);
    this.say(this.win ? `Tower complete: ${this.drops} floors, ${this.perf} perfect. Install or replay.` : `Missed. The tower reached floor ${this.drops}. Install or replay.`);
  }
  say(msg) { if (this.status && this.mode !== 'demo') this.status.textContent = msg; }
  hud(bump) {
    if (this.floorEl) this.floorEl.textContent = String(this.drops);
    if (bump && this.hudEl) { this.hudEl.classList.remove('is-bump'); void this.hudEl.offsetWidth; this.hudEl.classList.add('is-bump'); }
  }
  tapHand() { const h = this.handEl; if (!h) return; h.classList.remove('is-tap'); void h.getBoundingClientRect(); h.classList.add('is-tap'); }
  step(dt) {
    const m = this.mov;
    if (m) {
      m.pos += m.dir * m.speed * dt;
      if (m.pos > P_RANGE) { m.pos = P_RANGE; m.dir = -1; } else if (m.pos < -P_RANGE) { m.pos = -P_RANGE; m.dir = 1; }
      if (this.mode === 'demo' && this.gt > this.ready && (this.prev - this.target) * (m.pos - this.target) <= 0) { this.tapHand(); this.drop(); }
      else this.prev = m.pos;
    }
    this.fall = this.fall.filter(f => this.gt - f.t0 < 1.5);
    this.fx = this.fx.filter(f => this.gt - f.t0 < 0.8);
    const tgt = this.B.length * BH; this.cam += (tgt - this.cam) * Math.min(1, dt * 7);
    if (this.mode === 'demo' && this.drops >= 6 && !this.restartAt) this.restartAt = this.gt + 1.3;
    if (this.restartAt && this.gt > this.restartAt) this.newGame('demo');
    if (this.mode === 'end') {
      if (!this.endShown && this.gt - this.endAt > (this.win ? 0.45 : 0.85)) this.showEnd();
      if (this.force && this.gt - this.endAt > 2.2) { this.force = false; this.lab.update(); }
    }
  }
  draw(ctx, t, W, H) {
    const s = W * 0.118, cam = { ox: W / 2, oy: H * 0.56 + this.cam * s, s, H };
    const alt = clamp((this.cam - 1) / 7, 0, 0.75);
    skyStack(ctx, W, H, alt);
    skyline(ctx, W, H, H * 0.93 + (cam.oy + s - H * 0.93) * 0.3, alt, 0.2);
    isoPlinth(ctx, cam, 2.15);
    this.B.forEach((b, i) => {
      const sy = cam.oy - b.y * s; if (sy < -s * 1.5 || sy - s * 3 > H) return;
      const fl = b.t >= 0 && b.perfect ? (1 - seg(this.gt, b.t, b.t + 0.3)) * 0.6 : 0;
      isoBlock(ctx, cam, { ...b, flash: fl, a: i ? 1 : 1 });
    });
    for (const f of this.fx) if (f.k === 'ring') isoRing(ctx, cam, f.b, (this.gt - f.t0) / 0.5);
    if (this.mov) isoBlock(ctx, cam, this.movBlock());
    for (const f of this.fall) {
      const tau = this.gt - f.t0;
      isoBlock(ctx, cam, { ...f, x: f.x + f.vx * tau, z: f.z + f.vz * tau, y: f.y - 7.5 * tau * tau, rot: f.spin * tau, a: 1 - seg(tau, 0.8, 1.4) });
    }
    for (const f of this.fx) if (f.k === 'pop') popText(ctx, f.txt, W / 2, H * 0.42, W * 0.066, (this.gt - f.t0) / 0.75);
    vignette(ctx, W, H, 0.22);
  }
}

/* ================================================================== HOOKS: first three seconds */
class StackHook extends Scene {
  setup() {
    this.v = this.fig.dataset.v || 'a'; this.loop = 3.4; this.posterT = { a: 1.42, b: 1.15, c: 2.55 }[this.v] ?? 1;
    this.beats = [[0, 'run']];
    if (this.v === 'a') {
      const spec = []; for (let i = 0; i < 7; i++) spec.push({ t: -1 }); spec.push({ t: 1.35 }, { t: 2.85 }); spec[0].c = 'graphite';
      this.F = stackScript(spec);
    } else if (this.v === 'b') {
      const spec = []; for (let i = 0; i < 6; i++) spec.push({ t: -1 });
      for (let i = 0; i < 5; i++) spec.push({ t: -1, dx: 0.17 });
      spec.push({ t: 0.62, dx: 0.62 }); spec[0].c = 'graphite';
      this.F = stackScript(spec, 2.1);
    } else {
      const spec = []; for (let i = 0; i < 13; i++) spec.push({ t: -1, dx: (hash(i) - 0.5) * 0.08, h0: 9 });
      spec.push({ t: 0.85, h0: 9 }, { t: 1.85, h0: 9 });
      this.F = stackScript(spec, 1.25);
    }
  }
  progress() { return Math.min(1, this.t / 3); }
  draw(ctx, t, W, H) { if (this.v === 'a') this.drawA(ctx, t, W, H); else if (this.v === 'b') this.drawB(ctx, t, W, H); else this.drawC(ctx, t, W, H); }
  drawA(ctx, t, W, H) {
    const F = this.F, n = placedCount(F, t), top = camTop(F, t, n, 0.45);
    const s = W * 0.2, cam = { ox: W / 2, oy: H * 0.62 + top * s, s, H };
    skyStack(ctx, W, H, 0.1);
    for (let i = 0; i < 7; i++) { const x = W * hash(i + 21), y = H * (0.18 + hash(i + 31) * 0.4), r = W * (0.05 + hash(i + 41) * 0.08); ctx.fillStyle = rg(ctx, x, y, r, [0, 'rgba(255,240,215,.35)', 1, 'rgba(255,240,215,0)']); circ(ctx, x, y, r); ctx.fill(); }
    for (let i = 0; i < n; i++) {
      const f = F[i], y = i * BH; if (cam.oy - y * s > H + s * 3) continue;
      const land = f.t >= 0 ? seg(t, f.t, f.t + 0.28) : 1, sq = f.t >= 0 && land < 1 ? 0.84 + 0.16 * eBack(land) : 1;
      isoBlock(ctx, cam, { x: f.x, z: f.z, y, w: f.w, d: f.d, h: BH * sq, c: f.c, pal: f.pal, seed: f.seed, lit: 0.15, flash: f.t >= 0 ? (1 - seg(t, f.t, f.t + 0.4)) * 0.6 : 0 });
    }
    for (let i = 7; i < n; i++) {
      const f = F[i], p = (t - f.t) / 0.6; if (p < 0 || p > 1) continue;
      isoRing(ctx, cam, { x: f.x, z: f.z, y: i * BH, w: f.w, d: f.d }, p);
      const cx = isx(cam, f.x, f.z), cy = isy(cam, f.x, i * BH + BH, f.z);
      for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU - 0.3, d = W * (0.12 + 0.2 * eOut(p)); sparkle(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.6, W * 0.028 * (1 - p), 1 - p, k % 2 ? '#FFFFFF' : '#FFE6A0'); }
    }
    movingFloor(ctx, cam, F, n, t, 1.45, eOut);
    vignette(ctx, W, H, 0.3);
  }
  drawB(ctx, t, W, H) {
    const F = this.F, N = F.length, landed = t >= F[N - 1].t;
    const shake = t > 0.72 && t < 1.5 ? (1 - seg(t, 0.72, 1.5)) * W * 0.014 : 0;
    const s = W * 0.122, top = (N - 1) * BH, cam = { ox: W / 2 - W * 0.05 + Math.sin(t * 70) * shake, oy: H * 0.5 + top * s + Math.cos(t * 55) * shake * 0.6, s, H };
    skyStack(ctx, W, H, 0.3);
    skyline(ctx, W, H, H * 0.93 + (cam.oy + s - H * 0.93) * 0.3, 0.3, 0.5);
    isoPlinth(ctx, cam, 1.9);
    const fallers = [];
    for (let i = 0; i < N; i++) {
      const f = F[i]; if (i === N - 1 && !landed) continue;
      const k = i - 7;
      if (k >= 0 && t > 0.78) {
        const tau = t - (0.78 + (N - 1 - i) * 0.05); if (tau > 0) { fallers.push({ f, i, tau, k }); continue; }
      }
      isoBlock(ctx, cam, { x: f.x, z: f.z, y: i * BH, w: f.w, d: f.d, c: f.c, pal: f.pal, seed: f.seed, lit: 0.2 });
    }
    if (!landed) movingFloor(ctx, cam, F, N - 1, t, 0.62);
    for (const { f, i, tau, k } of fallers) {
      isoBlock(ctx, cam, { x: f.x + tau * (0.9 + k * 0.25), z: f.z - tau * 0.3, y: i * BH - 6 * Math.max(0, tau - 0.08) ** 2, w: f.w, d: f.d, c: f.c, pal: f.pal, seed: f.seed, lit: 0.2, rot: (0.9 + k * 0.28) * tau * (1 + tau), a: 1 - seg(tau, 1.2, 1.7) });
    }
    if (t > 0.72 && t < 1.1) { ctx.fillStyle = `rgba(242,88,62,${0.22 * (1 - seg(t, 0.72, 1.1))})`; ctx.fillRect(0, 0, W, H); }
    vignette(ctx, W, H, 0.3);
  }
  drawC(ctx, t, W, H) {
    const F = this.F, n = placedCount(F, t), top = camTop(F, t, n, 0.35);
    const s = W * 0.15, cam = { ox: W / 2, oy: H * 0.66 + top * s, s, H };
    skyStack(ctx, W, H, 1);
    cloudBand(ctx, W, H * 0.9, t, 0.55, 5); cloudBand(ctx, W, H * 1.02, t + 2, 0.7, 8);
    for (let i = 0; i < 18; i++) { const x = W * hash(i + 3), y = H * hash(i + 13) * 0.6; ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.25 * hash(i + 23)})`; circ(ctx, x, y, W * 0.004); ctx.fill(); }
    drawFloors(ctx, cam, F, n, t, H, 0.3);
    for (let i = 13; i < n; i++) { const f = F[i]; isoRing(ctx, cam, { x: f.x, z: f.z, y: i * BH, w: f.w, d: f.d }, (t - f.t) / 0.45); }
    if (n < F.length) movingFloor(ctx, cam, F, n, t, 1, null, 2.6);
    else {
      const tf = F[F.length - 1], i = F.length, osc = Math.sin((t - 1.85) * 6.5 - Math.PI / 2) * 1.5;
      isoBlock(ctx, cam, { x: tf.x + osc, z: tf.z, y: i * BH, w: tf.w, d: tf.d, pal: hueAt(i + 9), seed: 77, lit: 0.2 });
    }
    const num = 97 + Math.max(0, n - 13), last = n > 13 ? F[n - 1].t : -9, bump = 1 + 0.18 * (1 - seg(t, last, last + 0.22));
    ctx.save(); ctx.translate(W / 2, H * 0.4); ctx.scale(bump, bump);
    font(ctx, 800, W * 0.25); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,190,70,.55)'; ctx.shadowBlur = W * 0.08;
    ctx.fillStyle = lg(ctx, 0, -W * 0.12, 0, W * 0.12, [0, '#FFFFFF', 0.45, '#FFF0B8', 1, '#FFC74A']); ctx.fillText(String(num), 0, 0);
    ctx.restore();
    font(ctx, 700, W * 0.05, UI); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText('Floor', W / 2, H * 0.4 - W * 0.17);
    vignette(ctx, W, H, 0.3);
  }
}

/* ================================================================== UGC: creator POV */
class UgcAd extends Scene {
  setup() {
    this.loop = 9.6; this.posterT = 3.95;
    this.beats = [[0, 'talk'], [4.55, 'push'], [5.25, 'game'], [8.2, 'end']];
    this.cap = this.fig.querySelector('.cl-ugc-cap');
    this.pages = [...this.fig.querySelectorAll('.cl-pg')];
    this.words = [...this.fig.querySelectorAll('.cl-ugc-cap [data-w]')].map(el => ({ el, t: +el.dataset.w, pg: this.pages.indexOf(el.closest('.cl-pg')), s: '' }));
    this.pageT = this.pages.map((_, i) => Math.min(...this.words.filter(w => w.pg === i).map(w => w.t)));
    this.init = [[1, 2, 1, 3, 2], [3, 1, 4, 2, 2], [2, 4, 1, 3, 1], [1, 3, 2, 1, 4], [2, 1, 3, 2, 1], [4, 2, 1, 3, 2]];
    this.moves = planMerges(this.init, 12, 0.7, 0.72, 3);
    this.pg = -2;
  }
  phone(W, H, t) {
    const sw = W * 0.4, sh = sw * 2.06;
    return { x: W * 0.57 + Math.sin(t * 1.3) * W * 0.006, y: H * 0.7 + Math.cos(t * 1.7) * H * 0.004, sw, sh, rot: -0.1 + Math.sin(t * 0.9) * 0.012 };
  }
  draw(ctx, t, W, H) {
    if (t >= 5.25) { this.drawGame(ctx, t, W, H); return; }
    const push = eIO(seg(t, 4.55, 5.25)), ph = this.phone(W, H, t);
    ctx.save();
    const k = Math.pow((W / ph.sw) * 1.04, push), cx = lerp(W / 2, ph.x, push), cy = lerp(H / 2, ph.y, push);
    const jx = Math.sin(t * 1.9) * W * 0.005 + Math.sin(t * 5.1) * W * 0.002, jy = Math.cos(t * 1.4) * H * 0.004;
    ctx.translate(W / 2 + jx * (1 - push), H / 2 + jy * (1 - push)); ctx.rotate(-ph.rot * push + Math.sin(t * 1.1) * 0.006 * (1 - push)); ctx.scale(k, k); ctx.translate(-cx, -cy);
    this.cache(W, H);
    ctx.drawImage(this.roomC, -W * 0.1, -H * 0.1, W * 1.2, H * 1.2);
    const bob = Math.sin(t * 3.1) * H * 0.003 + Math.sin(t * 1.3) * H * 0.002, tilt = Math.sin(t * 1.6) * 0.012;
    ctx.save(); ctx.translate(W * 0.36, H * 0.6 + bob); ctx.rotate(tilt); ctx.translate(-W * 0.36, -H * 0.6);
    ctx.drawImage(this.silC, -W * 0.1, -H * 0.1, W * 1.2, H * 1.2); ctx.restore();
    this.handPhone(ctx, W, H, t, ph);
    ctx.restore();
    vignette(ctx, W, H, 0.3 * (1 - push));
    if (t < 0.25) { ctx.fillStyle = `rgba(255,255,255,${0.3 * (1 - t / 0.25)})`; ctx.fillRect(0, 0, W, H); }
  }
  cache(W, H) {
    const d = Math.min(2, this.dpr || 1), key = `${W}x${H}x${d}`;
    if (this.cacheKey === key) return;
    this.cacheKey = key;
    const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(W * 1.2 * d); c.height = Math.round(H * 1.2 * d); const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, W * 0.1 * d, H * 0.1 * d); return [c, g]; };
    let g; [this.roomC, g] = mk(); this.room(g, W, H);
    [this.silC, g] = mk(); this.creator(g, W, H);
  }
  room(ctx, W, H) {
    ctx.fillStyle = lg(ctx, 0, 0, 0, H, [0, '#836094', 0.45, '#4F3C70', 1, '#1D1A38']); ctx.fillRect(-W, -H, W * 3, H * 3);
    ctx.fillStyle = rg(ctx, W * 0.86, H * 0.16, W * 0.95, [0, 'rgba(255,224,176,.95)', 0.25, 'rgba(255,206,150,.55)', 1, 'rgba(255,206,150,0)']); ctx.fillRect(-W, -H, W * 3, H * 3);
    ctx.save(); ctx.filter = 'blur(6px)';
    ctx.fillStyle = 'rgba(255,238,210,.6)'; rr(ctx, W * 0.66, H * 0.02, W * 0.42, H * 0.26, W * 0.03); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,240,.7)'; ctx.fillRect(W * 0.86, H * 0.02, W * 0.02, H * 0.26); ctx.fillRect(W * 0.66, H * 0.14, W * 0.42, H * 0.012);
    ctx.restore();
    const bok = [[0.1, 0.12, 0.07, '#FFB92E'], [0.2, 0.3, 0.05, '#F2583E'], [0.06, 0.42, 0.06, '#3ED6A8'], [0.3, 0.06, 0.04, '#FFD66E'], [0.48, 0.2, 0.035, '#8098FF'], [0.14, 0.58, 0.05, '#FF8A6B'], [0.9, 0.46, 0.05, '#FFD66E']];
    for (const [x, y, r, c] of bok) { ctx.fillStyle = rg(ctx, x * W, y * H, r * W * 1.6, [0, rgba(c, 0.55), 0.55, rgba(c, 0.32), 1, rgba(c, 0)]); circ(ctx, x * W, y * H, r * W * 1.6); ctx.fill(); }
    ctx.fillStyle = rg(ctx, W * 0.12, H * 0.2, W * 0.3, [0, 'rgba(255,200,120,.5)', 1, 'rgba(255,200,120,0)']); circ(ctx, W * 0.12, H * 0.2, W * 0.3); ctx.fill();
  }
  creator(ctx, W, H) {
    const hx = W * 0.36, hy = H * 0.31, hr = W * 0.17;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(-W * 0.12, H * 1.05);
      ctx.lineTo(-W * 0.12, H * 0.6);
      ctx.bezierCurveTo(-W * 0.05, H * 0.5, W * 0.12, H * 0.47, W * 0.25, H * 0.46);
      ctx.lineTo(W * 0.3, H * 0.4);
      ctx.arc(hx, hy, hr, Math.PI * 0.62, Math.PI * 0.38 + TAU, false);
      ctx.lineTo(W * 0.47, H * 0.46);
      ctx.bezierCurveTo(W * 0.62, H * 0.47, W * 0.82, H * 0.52, W * 0.9, H * 0.62);
      ctx.lineTo(W * 0.95, H * 1.05); ctx.closePath();
    };
    ctx.save(); ctx.filter = 'blur(3px)';
    ctx.fillStyle = 'rgba(255,196,140,.95)'; ctx.translate(W * 0.012, -H * 0.006); path(); ctx.fill();
    ctx.fillStyle = 'rgba(255,196,140,.9)'; circ(ctx, hx - hr * 0.55, hy - hr * 0.95, hr * 0.44); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.filter = 'blur(1.4px)';
    ctx.fillStyle = lg(ctx, 0, H * 0.12, 0, H, [0, '#2A2448', 0.5, '#1B1934', 1, '#110F24']); path(); ctx.fill();
    ctx.fillStyle = '#211D3D'; circ(ctx, hx - hr * 0.55, hy - hr * 0.95, hr * 0.42); ctx.fill();
    ctx.fillStyle = 'rgba(58,91,234,.6)'; rr(ctx, hx + hr * 0.78, hy - hr * 0.2, hr * 0.32, hr * 0.62, hr * 0.14); ctx.fill();
    ctx.strokeStyle = 'rgba(58,91,234,.5)'; ctx.lineWidth = hr * 0.12; ctx.beginPath(); ctx.arc(hx, hy, hr * 1.02, Math.PI * 1.05, Math.PI * 1.98); ctx.stroke();
    ctx.restore();
  }
  handPhone(ctx, W, H, t, ph) {
    const { sw, sh } = ph, bw = sw + W * 0.034, bh = sh + W * 0.034, R = W * 0.072;
    const skin = (y0, y1) => lg(ctx, 0, y0, 0, y1, [0, '#F3C9A6', 0.55, '#DFA17A', 1, '#BF7C57']);
    ctx.save(); ctx.translate(ph.x, ph.y); ctx.rotate(ph.rot);
    /* palm + wrist behind the phone: only the heel of the hand shows below it */
    ctx.fillStyle = skin(bh * 0.1, bh * 1.1);
    ctx.beginPath(); ctx.moveTo(-bw * 0.56, bh * 0.2);
    ctx.bezierCurveTo(-bw * 0.66, bh * 0.42, -bw * 0.5, bh * 0.62, -bw * 0.34, bh * 0.74);
    ctx.lineTo(-bw * 0.3, bh * 1.2); ctx.lineTo(bw * 0.55, bh * 1.2); ctx.lineTo(bw * 0.5, bh * 0.62);
    ctx.bezierCurveTo(bw * 0.56, bh * 0.4, bw * 0.4, bh * 0.2, 0, bh * 0.18); ctx.closePath(); ctx.fill();
    /* four fingertips curl round the right edge, behind the phone */
    for (let i = 0; i < 4; i++) {
      const fy = -bh * 0.04 + i * bh * 0.112, fl = bw * (0.2 - Math.abs(i - 1.3) * 0.025);
      ctx.fillStyle = skin(fy, fy + bh * 0.1); rr(ctx, bw / 2 - fl * 0.62, fy, fl, bh * 0.098, bh * 0.049); ctx.fill();
      ctx.fillStyle = 'rgba(120,60,40,.18)'; rr(ctx, bw / 2 - fl * 0.62, fy + bh * 0.074, fl, bh * 0.024, bh * 0.012); ctx.fill();
    }
    /* phone */
    ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, -bw / 2 + 3, -bh / 2 + 7, bw, bh, R); ctx.fill();
    ctx.fillStyle = lg(ctx, -bw / 2, 0, bw / 2, 0, [0, '#454D70', 0.5, '#1B2036', 1, '#2C3252']); rr(ctx, -bw / 2, -bh / 2, bw, bh, R); ctx.fill();
    ctx.save(); rr(ctx, -sw / 2, -sh / 2, sw, sh, R * 0.78); ctx.clip();
    ctx.translate(-sw / 2, -sh / 2); this.screen(ctx, sw, sh, t); ctx.restore();
    ctx.fillStyle = lg(ctx, -sw / 2, -sh / 2, sw / 2, sh * 0.1, [0, 'rgba(255,255,255,.2)', 0.5, 'rgba(255,255,255,0)']); rr(ctx, -sw / 2, -sh / 2, sw, sh, R * 0.78); ctx.fill();
    ctx.fillStyle = '#0B0E1C'; rr(ctx, -sw * 0.16, -sh / 2 + sh * 0.018, sw * 0.32, sh * 0.034, sh * 0.017); ctx.fill();
    /* thumb in front, over the left edge */
    ctx.save(); ctx.translate(-bw * 0.47, bh * 0.2); ctx.rotate(-0.55);
    ctx.fillStyle = 'rgba(40,20,20,.22)'; rr(ctx, -bw * 0.085, -bh * 0.02, bw * 0.19, bh * 0.25, bw * 0.095); ctx.fill();
    ctx.fillStyle = lg(ctx, -bw * 0.1, 0, bw * 0.1, 0, [0, '#C98763', 0.45, '#F1C3A0', 1, '#D99A73']); rr(ctx, -bw * 0.095, -bh * 0.04, bw * 0.19, bh * 0.25, bw * 0.095); ctx.fill();
    ctx.fillStyle = 'rgba(255,236,224,.75)'; rr(ctx, -bw * 0.055, -bh * 0.03, bw * 0.11, bh * 0.06, bw * 0.05); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  screen(ctx, w, h, t) {
    seaBg(ctx, w, h, t);
    gameHud(ctx, w * 0.06, h * 0.06, w * 0.88, w * 0.2);
    drawBoard(ctx, w * 0.05, h * 0.2, w * 0.9, h * 0.66, this.init, this.moves, t);
  }
  drawGame(ctx, t, W, H) {
    seaBg(ctx, W, H, t);
    gameHud(ctx, W * 0.06, H * 0.25, W * 0.88, W * 0.16);
    drawBoard(ctx, W * 0.05, H * 0.32, W * 0.9, H * 0.53, this.init, this.moves, t);
    if (t < 5.4) { ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - seg(t, 5.25, 5.4))})`; ctx.fillRect(0, 0, W, H); }
    vignette(ctx, W, H, 0.22);
  }
  after(t) {
    if (!this.cap) return;
    const full = this.full && this.lab.paused;
    this.cap.classList.toggle('is-gone', !full && t >= 4.55);
    let pg = -1; for (let i = 0; i < this.pageT.length; i++) if (t >= this.pageT[i] - 0.05) pg = i;
    if (full) pg = -3;
    if (pg !== this.pg) { this.pages.forEach((p, i) => p.classList.toggle('is-pg', full || i === pg)); this.pg = pg; }
    let hot = -1; if (!full) this.words.forEach((w, i) => { if (t >= w.t) hot = i; });
    for (let i = 0; i < this.words.length; i++) {
      const w = this.words[i], st = full ? 'in' : t >= w.t ? (i === hot ? 'hot' : 'in') : '';
      if (st !== w.s) { w.s = st; w.el.classList.toggle('is-in', !!st); w.el.classList.toggle('is-hot', st === 'hot'); }
    }
  }
}

/* ================================================================== ITERATIONS: Kraken Kitchen v1 → v4 */
class MergeAd extends Scene {
  setup() {
    this.v = this.fig.dataset.v || 'v2';
    this.loop = { v1: 4.8, v2: 4.8, v3: 4.4, v4: 4.6 }[this.v] || 4.8;
    this.posterT = { v1: 2.2, v2: 2.2, v3: 0.9, v4: 1.7 }[this.v] ?? 1;
    if (this.v === 'v3') {
      this.init = [[2, 1, 3, 2, 4], [1, 3, 2, 4, 1], [3, 2, 4, 1, 2], [2, 4, 1, 3, 3], [4, 1, 2, 2, 1], [1, 3, 4, 1, 0]];
      this.moves = [{ t: 1.5, a: [3, 3], b: [4, 3], v: 3, spawn: 1 }, { t: 2.2, a: [4, 3], b: [4, 2], v: 4, spawn: 2 }, { t: 2.9, a: [2, 4], b: [3, 4], v: 2, spawn: 1 }, { t: 3.55, a: [2, 3], b: [3, 3], v: 1, spawn: 2 }];
      this.init[2][4] = 4; this.init[3][4] = 3;
    } else if (this.v === 'v4') {
      this.init = [[1, 2, 1, 3, 2], [3, 1, 2, 2, 1], [2, 6, 1, 3, 1], [1, 3, 2, 1, 4], [2, 1, 3, 2, 1], [4, 2, 1, 3, 2]];
      this.moves = [{ t: 2.5, a: [2, 1], b: [3, 1], v: 2, spawn: 1 }];
    } else {
      this.init = [[1, 2, 1, 3, 2], [3, 1, 4, 2, 2], [2, 4, 1, 3, 1], [1, 3, 2, 1, 4], [2, 1, 3, 2, 1], [4, 2, 1, 3, 2]];
      this.moves = planMerges(this.init, 6, 0.6, 0.72, this.v === 'v1' ? 5 : 9);
    }
  }
  draw(ctx, t, W, H) {
    const v = this.v;
    if (v === 'v1') {
      ctx.fillStyle = '#05070F'; ctx.fillRect(0, 0, W, H);
      const lh = W * 9 / 16, ly = (H - lh) / 2;
      ctx.save(); ctx.beginPath(); ctx.rect(0, ly, W, lh); ctx.clip(); ctx.translate(0, ly);
      seaBg(ctx, W, lh, t);
      ctx.fillStyle = 'rgba(6,30,60,.45)'; rr(ctx, W * 0.03, lh * 0.08, W * 0.22, lh * 0.84, W * 0.02); ctx.fill(); rr(ctx, W * 0.75, lh * 0.08, W * 0.22, lh * 0.84, W * 0.02); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 4; i++) { rr(ctx, W * 0.05, lh * (0.16 + i * 0.18), W * 0.18, lh * 0.1, W * 0.01); ctx.fill(); rr(ctx, W * 0.77, lh * (0.16 + i * 0.18), W * 0.18, lh * 0.1, W * 0.01); ctx.fill(); }
      drawBoard(ctx, W * 0.27, lh * 0.04, W * 0.46, lh * 0.92, this.init, this.moves, t);
      ctx.restore();
      font(ctx, 600, W * 0.045, UI); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('kraken_kitchen_gameplay_v1.mp4', W / 2, ly + lh + W * 0.08);
      return;
    }
    seaBg(ctx, W, H, t);
    if (v === 'v2') {
      gameHud(ctx, W * 0.07, H * 0.1, W * 0.86, W * 0.17);
      drawBoard(ctx, W * 0.04, H * 0.2, W * 0.92, H * 0.66, this.init, this.moves, t);
    } else if (v === 'v3') {
      const bd = drawBoard(ctx, W * 0.04, H * 0.33, W * 0.92, H * 0.6, this.init, this.moves, t, { hot: t < 1.5 ? [[3, 3], [4, 3]] : null });
      if (t < 1.5) { const p = (t % 0.7) / 0.7; hand(ctx, bd.cx(3), bd.cy(3) - Math.sin(p * Math.PI) * W * 0.03, W * 0.22, seg(t, 0.35, 0.6), p > 0.8 ? 1 : 0); }
    } else {
      gameHud(ctx, W * 0.07, H * 0.3, W * 0.86, W * 0.16);
      const reach = t < 0.3 ? 0 : t < 1.3 ? eIO(seg(t, 0.3, 1.3)) : t < 1.5 ? 1 : t < 2.6 ? lerp(1, 0.55, eIO(seg(t, 1.5, 2.6))) : lerp(0.55, 0, eIO(seg(t, 2.75, 3.6)));
      const grab = t >= 1.4 && t < 2.75;
      const bd = drawBoard(ctx, W * 0.04, H * 0.38, W * 0.92, H * 0.5, this.init, this.moves, t, { hide: grab ? [1, 2] : null });
      if (t >= 2.75 && t < 3.3) { const p = seg(t, 2.75, 3.3); seaItem(ctx, 6, bd.cx(1), bd.cy(2) - bd.ts * 1.6 * (1 - eOut2(p)) ** 2, bd.ts); }
      tentacle(ctx, W, H, t, reach, grab ? 6 : 0, bd.ts, bd.cx(1), bd.cy(2));
      if (t > 2.55 && t < 3.2) { const p = seg(t, 2.55, 3.2); ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - p)})`; ctx.fillRect(0, 0, W, H); }
    }
    vignette(ctx, W, H, 0.25);
  }
}

/* ================================================================== GAMEPLAY / FAKE GAMEPLAY: pin-pull */
const PP = { L: 0.17, R: 0.83, M0: 0.484, M1: 0.516, T: 0.31 * HR, P: 0.535 * HR, B: 0.86 * HR, PT: 0.028, F: 0.12, FW: 0.1 };
/* the lower chamber's floor is a shallow funnel: walls → (0.5 ± FW, B) */
const FLOOR = [[PP.L, PP.B - PP.F, 0.5 - PP.FW, PP.B], [0.5 - PP.FW, PP.B, 0.5 + PP.FW, PP.B], [0.5 + PP.FW, PP.B, PP.R, PP.B - PP.F]];
function pushSeg(p, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy, u = clamp(((p.x - x0) * dx + (p.y - y0) * dy) / l2, 0, 1);
  const cx = x0 + dx * u, cy = y0 + dy * u, ex = p.x - cx, ey = p.y - cy, d = Math.hypot(ex, ey);
  if (d < p.r && d > 1e-7) { p.x = cx + (ex / d) * p.r; p.y = cy + (ey / d) * p.r; return true; }
  if (d <= 1e-7 || p.y > cy + 1e-4 && Math.abs(dx) > Math.abs(dy)) { const nx = -dy, ny = dx, nl = Math.hypot(nx, ny), sg = ny > 0 ? -1 : 1; if (p.y > cy) { p.x = cx + (nx / nl) * p.r * sg; p.y = cy + (ny / nl) * p.r * sg; return true; } }
  return false;
}
class PinPull extends Scene {
  setup() {
    this.loop = 11.6; this.posterT = 1.85;
    this.beats = [[0, 'intro'], [0.9, 'aim1'], [2.0, 'pull1'], [2.4, 'pour1'], [4.3, 'fail'], [5.2, 'rewind'], [5.8, 'aim2'], [6.8, 'pull2'], [7.25, 'pour2'], [8.6, 'win'], [9.6, 'end']];
    this.makeParticles();
  }
  makeParticles() {
    const ps = [], { L, M0, M1, R, P } = PP;
    const pack = (x0, x1, rows, r, kind) => {
      for (let row = 0; row < rows; row++) {
        const y = P - r - row * r * 1.72, off = row % 2 ? r : 0;
        for (let x = x0 + r + off; x <= x1 - r + 1e-6; x += r * 2.02) ps.push({ x: x + (hash(ps.length) - 0.5) * 0.004, y, px: x, py: y, r, kind, a: hash(ps.length + 50) * TAU });
      }
    };
    pack(L, M0, 5, 0.03, 0);
    pack(M1, R, 6, 0.026, 1);
    for (const p of ps) { p.px = p.x; p.py = p.y; }
    this.ps = ps; this.acc = 0;
    for (let i = 0; i < 90; i++) this.sim(1 / 120, 0, 0);
    this.rest = ps.map(p => [p.x, p.y]); this.snaps = []; this.snapAcc = 0;
  }
  restore() { this.ps.forEach((p, i) => { p.x = p.px = this.rest[i][0]; p.y = p.py = this.rest[i][1]; }); }
  reset(paused) { super.reset(paused); this.restore(); this.snaps = []; this.acc = 0; this.wasT = this.t; }
  pullL(t) { return t < 2.0 ? 0 : t < 2.45 ? eIO(seg(t, 2.0, 2.45)) : t < 5.2 ? 1 : t < 5.8 ? 1 - eIO(seg(t, 5.2, 5.8)) : 0; }
  pullR(t) { return t < 6.8 ? 0 : eIO(seg(t, 6.8, 7.25)); }
  advance(dt) {
    const prev = this.t; super.advance(dt); const t = this.t;
    if (t < prev) { this.restore(); this.snaps = []; this.acc = 0; }
    if (prev < 5.8 && t >= 5.8) this.restore();
    if (t >= 5.2 && t < 5.8) { if (this.snaps.length) { const k = Math.round((1 - seg(t, 5.2, 5.8)) * (this.snaps.length - 1)), sn = this.snaps[k]; this.ps.forEach((p, i) => { p.x = p.px = sn[i * 2]; p.y = p.py = sn[i * 2 + 1]; }); } return; }
    const active = (t >= 2.0 && t < 5.2) || t >= 6.8;
    if (!active) return;
    this.acc += dt;
    const step = 1 / 120; let k = 0;
    while (this.acc >= step && k < 12) { this.acc -= step; this.sim(step, this.pullL(t), this.pullR(t)); k++; }
    if (this.acc > step) this.acc = 0;
    if (t >= 2.0 && t < 4.3) { this.snapAcc += dt; if (this.snapAcc > 1 / 30) { this.snapAcc = 0; const a = new Float32Array(this.ps.length * 2); this.ps.forEach((p, i) => { a[i * 2] = p.x; a[i * 2 + 1] = p.y; }); this.snaps.push(a); } }
  }
  sim(dt, pl, pr) {
    const ps = this.ps, n = ps.length, G = 5.2, { L, R, M0, M1, T, P, B } = PP;
    const endL = M0 - pl * (M0 - L + 0.03), endR = M1 + pr * (R - M1 + 0.03);
    for (const p of ps) { const vx = (p.x - p.px) * 0.996, vy = (p.y - p.py) * 0.996; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + G * dt * dt; }
    const hx = 0.5, hy0 = B - 0.2, hy1 = B - 0.06, hr = 0.074;
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < n; i++) {
        const a = ps[i];
        for (let j = i + 1; j < n; j++) {
          const b = ps[j], dx = b.x - a.x, dy = b.y - a.y, m = a.r + b.r, d2 = dx * dx + dy * dy;
          if (d2 < m * m && d2 > 1e-10) { const d = Math.sqrt(d2), push = ((m - d) / d) * 0.5 * 0.85; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push; }
        }
      }
      for (const p of ps) {
        const r = p.r;
        if (p.y < P) {
          if (p.x < 0.5) { p.x = clamp(p.x, L + r, M0 - r); if (p.x < endL + r * 0.3 && p.y > P - r) p.y = P - r; }
          else { p.x = clamp(p.x, M1 + r, R - r); if (p.x > endR - r * 0.3 && p.y > P - r) p.y = P - r; }
          if (p.y < T + r) p.y = T + r;
        } else {
          p.x = clamp(p.x, L + r, R - r);
          let hit = false; for (const f of FLOOR) hit = pushSeg(p, f[0], f[1], f[2], f[3]) || hit;
          if (p.y > B - r) { p.y = B - r; hit = true; }
          if (hit) p.px = lerp(p.px, p.x, 0.12);
          const cy = clamp(p.y, hy0, hy1), dx = p.x - hx, dy = p.y - cy, d = Math.hypot(dx, dy), m = hr + r;
          if (d < m && d > 1e-6) { p.x = hx + (dx / d) * m; p.y = cy + (dy / d) * m; }
        }
      }
    }
  }
  draw(ctx, t, W, H) {
    const u = W, { L, R, M0, M1, T, P, B, PT } = PP;
    const shake = t >= 4.3 && t < 4.65 ? (1 - seg(t, 4.3, 4.65)) * W * 0.012 : 0;
    ctx.save(); ctx.translate(Math.sin(t * 80) * shake, Math.cos(t * 63) * shake * 0.5);
    ctx.fillStyle = lg(ctx, 0, 0, 0, H, [0, '#284896', 0.5, '#142659', 1, '#0A1430']); ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.save(); ctx.globalAlpha = 0.08;
    for (let i = 0; i < 3; i++) { const x = W * (0.2 + i * 0.3); ctx.fillStyle = lg(ctx, 0, 0, 0, H, [0, '#FFFFFF', 1, 'rgba(255,255,255,0)']); ctx.beginPath(); ctx.moveTo(x - W * 0.06, 0); ctx.lineTo(x + W * 0.06, 0); ctx.lineTo(x + W * 0.25, H); ctx.lineTo(x + W * 0.02, H); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#0C1838'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H * 0.9); ctx.quadraticCurveTo(W * 0.2, H * 0.86, W * 0.4, H * 0.92); ctx.quadraticCurveTo(W * 0.7, H * 0.87, W, H * 0.91); ctx.lineTo(W, H); ctx.fill();
    const X = v => v * u, Y = v => v * u;
    const wall = W * 0.024, rad = W * 0.06;
    const vessel = (g, k) => {
      ctx.beginPath(); ctx.moveTo(X(L) - g + k, Y(T) - g);
      ctx.arcTo(X(R) + g, Y(T) - g, X(R) + g, Y(B - PP.F), k);
      ctx.arcTo(X(R) + g, Y(B - PP.F) + g * 0.4, X(0.5 + PP.FW), Y(B) + g, k * 0.8);
      ctx.arcTo(X(0.5 + PP.FW), Y(B) + g, X(0.5 - PP.FW), Y(B) + g, k * 0.8);
      ctx.arcTo(X(0.5 - PP.FW), Y(B) + g, X(L) - g, Y(B - PP.F) + g * 0.4, k * 0.8);
      ctx.arcTo(X(L) - g, Y(B - PP.F) + g * 0.4, X(L) - g, Y(T) - g, k * 0.8);
      ctx.arcTo(X(L) - g, Y(T) - g, X(R) + g, Y(T) - g, k); ctx.closePath();
    };
    ctx.fillStyle = 'rgba(130,180,255,.1)'; vessel(wall, rad); ctx.fill();
    ctx.fillStyle = 'rgba(6,12,34,.42)'; vessel(0, rad * 0.7); ctx.fill();
    const lavaPs = [], goldPs = [];
    for (const p of this.ps) (p.kind ? goldPs : lavaPs).push(p);
    if (lavaPs.length) {
      let mx = 0, my = 0; for (const p of lavaPs) { mx += p.x; my += p.y; } mx /= lavaPs.length; my /= lavaPs.length;
      ctx.fillStyle = rg(ctx, X(mx), Y(my), W * 0.32, [0, 'rgba(255,120,60,.35)', 1, 'rgba(255,120,60,0)']); circ(ctx, X(mx), Y(my), W * 0.32); ctx.fill();
    }
    const burnt = t >= 2.85 && t < 5.5, cheer = t >= 7.8 && t < 9.6;
    this.hero(ctx, X(0.5), Y(B), W, t, burnt, cheer);
    ctx.fillStyle = '#B8301C'; for (const p of lavaPs) { circ(ctx, X(p.x), Y(p.y + p.r * 0.18), X(p.r * 1.5)); ctx.fill(); }
    ctx.fillStyle = '#E8492C'; for (const p of lavaPs) { circ(ctx, X(p.x), Y(p.y), X(p.r * 1.42)); ctx.fill(); }
    ctx.fillStyle = '#FF7A3A'; for (const p of lavaPs) { circ(ctx, X(p.x - p.r * 0.12), Y(p.y - p.r * 0.2), X(p.r * 0.95)); ctx.fill(); }
    for (const p of lavaPs) { ctx.fillStyle = rg(ctx, X(p.x - p.r * 0.2), Y(p.y - p.r * 0.3), X(p.r * 0.75), [0, 'rgba(255,226,140,.9)', 1, 'rgba(255,170,80,0)']); circ(ctx, X(p.x - p.r * 0.2), Y(p.y - p.r * 0.3), X(p.r * 0.75)); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,250,225,.7)'; for (let i = 0; i < lavaPs.length; i += 3) { const p = lavaPs[i]; circ(ctx, X(p.x - p.r * 0.45), Y(p.y - p.r * 0.5), X(p.r * 0.2)); ctx.fill(); }
    for (const p of goldPs) {
      ctx.save(); ctx.translate(X(p.x), Y(p.y)); ctx.rotate(p.a + (p.x - p.px) * 30);
      ctx.fillStyle = '#B87A0A'; ell(ctx, 0, X(p.r * 0.16), X(p.r * 1.05), X(p.r * 0.78)); ctx.fill();
      ctx.fillStyle = rgf(ctx, -X(p.r * 0.35), -X(p.r * 0.3), 0, 0, X(p.r * 1.1), [0, '#FFF4C8', 0.45, '#FFD25E', 1, '#E3A21C']); ell(ctx, 0, 0, X(p.r * 1.05), X(p.r * 0.78)); ctx.fill();
      ctx.strokeStyle = 'rgba(190,120,10,.55)'; ctx.lineWidth = 1; ell(ctx, 0, 0, X(p.r * 0.66), X(p.r * 0.48)); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = lg(ctx, X(M0), 0, X(M1), 0, [0, '#FFFFFF', 1, '#C9C1B7']); rr(ctx, X(M0) - 1, Y(T) - wall * 0.5, X(M1 - M0) + 2, Y(P - T) + wall * 0.5, W * 0.012); ctx.fill();
    ctx.strokeStyle = 'rgba(210,230,255,.55)'; ctx.lineWidth = wall * 0.55; vessel(wall * 0.5, rad * 0.85); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(L) - wall * 0.1, Y(T) + rad); ctx.lineTo(X(L) - wall * 0.1, Y(B - PP.F) - rad * 0.4); ctx.stroke();
    const pl = this.pullL(t), pr = this.pullR(t);
    const lx1 = X(M0 - pl * (M0 - L + 0.03)), lx0 = lx1 - X(M0 - L + 0.09), py = Y(P + PT * 0.5);
    this.pin(ctx, lx0, lx1, py, W, -1);
    const rx0 = X(M1 + pr * (R - M1 + 0.03)), rx1 = rx0 + X(R - M1 + 0.09);
    this.pin(ctx, rx0, rx1, py, W, 1);
    const hp = this.handPos(t, lx0, rx1, py, W, H);
    if (hp) hand(ctx, hp[0], hp[1], W * 0.2, hp[2], hp[3]);
    if (t >= 4.3 && t < 5.2) { ctx.fillStyle = `rgba(242,70,40,${0.2 * (1 - seg(t, 4.3, 5.0))})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    if (t >= 5.2 && t < 5.8) {
      ctx.fillStyle = 'rgba(255,255,255,.06)'; for (let y = (t * 900) % 6; y < H; y += 6) ctx.fillRect(0, y, W, 2);
      ctx.fillStyle = 'rgba(120,170,255,.12)'; ctx.fillRect(0, 0, W, H);
    }
    if (cheer) for (let i = 0; i < 12; i++) { const ph = ((t - 7.8) * 0.9 + hash(i)) % 1; sparkle(ctx, X(0.5) + Math.cos(i * 2.1) * W * (0.08 + ph * 0.18), Y(B - 0.12) - ph * W * 0.25, W * 0.022 * (1 - ph), 1 - ph, i % 2 ? '#FFE7A3' : '#FFFFFF'); }
    ctx.restore();
    vignette(ctx, W, H, 0.3);
  }
  handPos(t, lknob, rknob, py, W, H) {
    const rest = [W * 0.52, H * 0.97];
    if (t >= 0.9 && t < 2.0) { const p = eIO(seg(t, 0.9, 1.9)); return [lerp(rest[0], lknob, p), lerp(rest[1], py, p), seg(t, 0.9, 1.15), t > 1.85 ? 1 : 0]; }
    if (t >= 2.0 && t < 2.8) return [lknob, py, 1 - seg(t, 2.45, 2.8), 1];
    if (t >= 5.8 && t < 6.8) { const p = eIO(seg(t, 5.8, 6.7)); return [lerp(rest[0], rknob, p), lerp(rest[1], py, p), seg(t, 5.8, 6.05), t > 6.65 ? 1 : 0]; }
    if (t >= 6.8 && t < 7.6) return [rknob, py, 1 - seg(t, 7.25, 7.6), 1];
    return null;
  }
  pin(ctx, x0, x1, y, W, side) {
    const th = W * 0.03;
    ctx.fillStyle = lg(ctx, 0, y - th / 2, 0, y + th / 2, [0, '#FFE7A0', 0.5, '#FFC74A', 1, '#C98510']); rr(ctx, x0, y - th / 2, x1 - x0, th, th / 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(ctx, x0 + th * 0.3, y - th * 0.36, x1 - x0 - th * 0.6, th * 0.18, th * 0.09); ctx.fill();
    const kx = side < 0 ? x0 : x1, kr = W * 0.047;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ell(ctx, kx + kr * 0.15, y + kr * 0.85, kr * 0.9, kr * 0.25); ctx.fill();
    ctx.fillStyle = rgf(ctx, kx - kr * 0.35, y - kr * 0.4, kx, y, kr * 1.1, [0, '#FFFFFF', 0.55, '#EEE9E3', 1, '#9F978C']); circ(ctx, kx, y, kr); ctx.fill();
    ctx.fillStyle = '#F2583E'; circ(ctx, kx, y, kr * 0.36); ctx.fill();
  }
  hero(ctx, x, y, W, t, burnt, cheer) {
    const j = cheer ? Math.abs(Math.sin((t - 7.8) * 7)) * W * 0.035 : 0, k = W / 340, Z = 1.2;
    ctx.save(); ctx.translate(x, y - j);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ell(ctx, 0, j + 2 * k, W * 0.07, W * 0.016); ctx.fill();
    const bw = W * 0.12 * Z, bh = W * 0.12 * Z;
    ctx.fillStyle = burnt ? '#2A2F44' : lg(ctx, -bw / 2, 0, bw / 2, 0, [0, '#6E8BFF', 0.5, '#3A5BEA', 1, '#22369A']); rr(ctx, -bw / 2, -bh, bw, bh, bw * 0.32); ctx.fill();
    ctx.fillStyle = burnt ? '#3A3F55' : '#FFC74A'; rr(ctx, -bw / 2, -bh * 0.45, bw, bh * 0.12, 2); ctx.fill();
    const arm = cheer ? -1 : 0;
    ctx.fillStyle = burnt ? '#2A2F44' : '#4D6BF2';
    for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * bw * 0.52, -bh * 0.78); ctx.rotate(sd * (0.25 + arm * -1.9 * 0.5) * (cheer ? 1.6 : 1)); rr(ctx, -bw * 0.11, 0, bw * 0.22, bh * 0.55, bw * 0.11); ctx.fill(); ctx.restore(); }
    const hr = W * 0.066 * Z, hy = -bh - hr * 0.72;
    ctx.fillStyle = burnt ? '#2F344A' : rgf(ctx, -hr * 0.35, hy - hr * 0.4, 0, hy, hr * 1.15, [0, '#FFFFFF', 0.55, '#EEE9E3', 1, '#A9A196']); circ(ctx, 0, hy, hr); ctx.fill();
    ctx.fillStyle = burnt ? '#14182A' : '#232838'; rr(ctx, -hr * 0.7, hy - hr * 0.14, hr * 1.4, hr * 0.36, hr * 0.18); ctx.fill();
    if (!burnt) { ctx.fillStyle = 'rgba(120,200,255,.6)'; rr(ctx, -hr * 0.55, hy - hr * 0.08, hr * 0.5, hr * 0.12, hr * 0.06); ctx.fill(); }
    ctx.fillStyle = burnt ? '#3A3F55' : '#F2583E'; ctx.beginPath(); ctx.ellipse(0, hy - hr * 0.95, hr * 0.22, hr * 0.42, 0, Math.PI, 0); ctx.fill();
    if (burnt) for (let i = 0; i < 5; i++) { const ph = ((t - 2.85) * 0.7 + i * 0.2) % 1; ctx.fillStyle = `rgba(200,205,220,${0.35 * (1 - ph)})`; circ(ctx, Math.sin(i * 2.3 + ph * 3) * W * 0.03, hy - hr - ph * W * 0.22, W * (0.02 + ph * 0.035)); ctx.fill(); }
    ctx.restore();
  }
}

/* ================================================================== AI VARIANTS: Lucky Lanes slots */
const SLOT_SETS = { classic: ['seven', 'gem', 'star', 'coin', 'crown', 'gem', 'star', 'coin'], lanes: ['pin', 'ball', 'star', 'seven', 'pin', 'crown', 'ball', 'star'] };
const SLOT_V = {
  a: { set: 'classic', win: 'seven', bg: ['#232C64', '#0A0F2E'], frame: 'gold', glow: '#FFC74A', phase: 0 },
  b: { set: 'lanes', win: 'ball', bg: ['#1F988A', '#0A3540'], frame: 'porcelain', glow: '#7DEBCB', phase: 1.05, lane: 1 },
  c: { set: 'lanes', win: 'pin', bg: ['#FF6A4E', '#86202E'], frame: 'gold', glow: '#FFD66E', phase: 2.1, lane: 1 },
  d: { set: 'classic', win: 'crown', bg: ['#4364F0', '#121C68'], frame: 'porcelain', glow: '#B3C3FF', phase: 3.15 },
};
const CROWN = 'M8 33L5.5 14.5l10.6 8.6L24 9.5l7.9 13.6 10.6-8.6L40 33z';
let CROWN_P = null;
function slotSymbol(ctx, k, x, y, s, blur = 0) {
  ctx.save(); ctx.translate(x, y);
  if (blur) { ctx.globalAlpha *= 0.7; ctx.scale(1, 1 + blur); }
  const r = s * 0.5;
  if (k === 'seven') {
    font(ctx, 800, s * 1.02); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#9C5A06'; ctx.fillText('7', s * 0.03, s * 0.08);
    ctx.fillStyle = lg(ctx, 0, -r, 0, r, [0, '#FFF4C8', 0.45, '#FFC74A', 1, '#E0820F']); ctx.fillText('7', 0, s * 0.04);
  } else if (k === 'gem') {
    ctx.fillStyle = lg(ctx, -r, -r, r, r, [0, '#FFB4A2', 0.5, '#F2583E', 1, '#A93220']);
    poly(ctx, [[-r * 0.8, -r * 0.3], [-r * 0.45, -r * 0.75], [r * 0.45, -r * 0.75], [r * 0.8, -r * 0.3], [0, r * 0.85]]); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; poly(ctx, [[-r * 0.45, -r * 0.75], [0, -r * 0.3], [-r * 0.8, -r * 0.3]]); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; poly(ctx, [[-r * 0.8, -r * 0.3], [r * 0.8, -r * 0.3], [0, r * 0.85]]); ctx.fill();
  } else if (k === 'star') {
    ctx.fillStyle = lg(ctx, 0, -r, 0, r, [0, '#FFF0B8', 0.55, '#FFC74A', 1, '#E0960F']);
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.42 : r * 0.9; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q + r * 0.05); } ctx.closePath();
    ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.06; ctx.strokeStyle = '#FFD25E'; ctx.stroke(); ctx.fill();
  } else if (k === 'coin') {
    ctx.fillStyle = '#B87A0A'; circ(ctx, 0, s * 0.05, r * 0.82); ctx.fill();
    ctx.fillStyle = rgf(ctx, -r * 0.3, -r * 0.35, 0, 0, r, [0, '#FFF4C8', 0.5, '#FFD25E', 1, '#E3A21C']); circ(ctx, 0, 0, r * 0.82); ctx.fill();
    font(ctx, 800, s * 0.48); ctx.fillStyle = '#C98510'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, s * 0.02);
  } else if (k === 'crown') {
    if (!CROWN_P && typeof Path2D === 'function') CROWN_P = new Path2D(CROWN);
    ctx.scale(s / 46, s / 46); ctx.translate(-24, -26);
    ctx.fillStyle = lg(ctx, 0, 9, 0, 33, [0, '#FFEDB3', 0.5, '#FFC74A', 1, '#E0960F']); if (CROWN_P) ctx.fill(CROWN_P);
    ctx.fillStyle = '#D18A0B'; rr(ctx, 8, 33, 32, 6.5, 2.4); ctx.fill();
    ctx.fillStyle = '#F2583E'; circ(ctx, 24, 26.5, 3.1); ctx.fill(); ctx.fillStyle = '#3ED6A8'; circ(ctx, 15.2, 28.6, 2.1); ctx.fill(); ctx.fillStyle = '#5B86FF'; circ(ctx, 32.8, 28.6, 2.1); ctx.fill();
  } else if (k === 'pin') {
    ctx.fillStyle = rgf(ctx, -r * 0.2, -r * 0.6, 0, 0, r * 1.2, [0, '#FFFFFF', 0.6, '#EEE9E3', 1, '#A9A196']);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.95);
    ctx.bezierCurveTo(r * 0.32, -r * 0.95, r * 0.36, -r * 0.55, r * 0.2, -r * 0.3); ctx.bezierCurveTo(r * 0.16, -r * 0.15, r * 0.5, 0, r * 0.5, r * 0.45);
    ctx.bezierCurveTo(r * 0.5, r * 0.8, r * 0.3, r * 0.95, 0, r * 0.95); ctx.bezierCurveTo(-r * 0.3, r * 0.95, -r * 0.5, r * 0.8, -r * 0.5, r * 0.45);
    ctx.bezierCurveTo(-r * 0.5, 0, -r * 0.16, -r * 0.15, -r * 0.2, -r * 0.3); ctx.bezierCurveTo(-r * 0.36, -r * 0.55, -r * 0.32, -r * 0.95, 0, -r * 0.95); ctx.fill();
    ctx.fillStyle = '#E2452B'; rr(ctx, -r * 0.2, -r * 0.4, r * 0.4, r * 0.08, r * 0.04); ctx.fill(); rr(ctx, -r * 0.18, -r * 0.27, r * 0.36, r * 0.07, r * 0.035); ctx.fill();
  } else if (k === 'ball') {
    ctx.fillStyle = rgf(ctx, -r * 0.3, -r * 0.35, 0, 0, r, [0, '#9FF5DA', 0.45, '#2FB7C9', 1, '#16546E']); circ(ctx, 0, 0, r * 0.8); ctx.fill();
    ctx.fillStyle = '#0B2A3A'; circ(ctx, -r * 0.18, -r * 0.3, r * 0.1); ctx.fill(); circ(ctx, r * 0.12, -r * 0.34, r * 0.1); ctx.fill(); circ(ctx, -r * 0.02, -r * 0.08, r * 0.11); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ell(ctx, -r * 0.38, -r * 0.42, r * 0.16, r * 0.09, -0.6); ctx.fill();
  }
  ctx.restore();
}
class SlotsAd extends Scene {
  setup() {
    this.cfg = SLOT_V[this.fig.dataset.v] || SLOT_V.a; this.loop = 4.2; this.posterT = 2.45;
    const set = SLOT_SETS[this.cfg.set];
    this.strips = [0, 1, 2].map(k => set.map((_, i) => set[(i + k * 3) % set.length]));
    this.target = this.strips.map(s => s.indexOf(this.cfg.win));
  }
  lt(t) { return (t + this.cfg.phase) % this.loop; }
  beatAt(t) { const u = this.lt(t); return u >= 2.15 && u < 3.95 ? 'win' : 'spin'; }
  reset(paused) { super.reset(paused); if (paused) this.t = (this.posterT - this.cfg.phase + this.loop * 2) % this.loop; }
  reel(k, u) {
    const S = 0.35, T = [1.25, 1.6, 1.95][k], tg = this.target[k], D = 24;
    if (u < S) return [tg, 0];
    if (u < T) { const v = (u - S) / (T - S); return [tg + D * (1 - (1 - v) ** 2.4), (D * 2.4 * (1 - v) ** 1.4) / (T - S)]; }
    const b = seg(u, T, T + 0.3); return [tg + D + 0.16 * Math.sin(b * Math.PI) * (1 - b), 0];
  }
  draw(ctx, t, W, H) {
    const c = this.cfg, u = this.lt(t), win = u >= 2.15 && u < 3.95, wp = seg(u, 2.15, 3.95);
    ctx.fillStyle = lg(ctx, 0, 0, 0, H, [0, c.bg[0], 1, c.bg[1]]); ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H * 0.48); ctx.rotate(t * 0.15);
    for (let i = 0; i < 10; i++) { ctx.rotate(TAU / 10); ctx.fillStyle = 'rgba(255,255,255,.045)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.14, -H); ctx.lineTo(-W * 0.14, -H); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = rg(ctx, W / 2, H * 0.48, W * 0.7, [0, rgba(c.glow, win ? 0.5 : 0.32), 1, rgba(c.glow, 0)]); ctx.fillRect(0, 0, W, H);
    if (c.lane) {
      ctx.fillStyle = lg(ctx, 0, H * 0.72, 0, H, [0, 'rgba(246,217,168,.0)', 0.3, 'rgba(246,217,168,.55)', 1, 'rgba(214,160,96,.9)']);
      ctx.beginPath(); ctx.moveTo(W * 0.4, H * 0.74); ctx.lineTo(W * 0.6, H * 0.74); ctx.lineTo(W * 1.05, H); ctx.lineTo(-W * 0.05, H); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(W * (0.4 + i * 0.033), H * 0.74); ctx.lineTo(W * (-0.05 + i * 0.183), H); ctx.stroke(); }
    }
    const bx = W * 0.08, by = H * 0.335, bw = W * 0.84, bh = H * 0.3, fr = W * 0.03;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, bx, by + W * 0.03, bw, bh, W * 0.07); ctx.fill();
    ctx.fillStyle = c.frame === 'gold' ? lg(ctx, 0, by, 0, by + bh, [0, '#FFF0B8', 0.35, '#FFC74A', 1, '#C98510']) : lg(ctx, 0, by, 0, by + bh, [0, '#FFFFFF', 0.5, '#EEE9E3', 1, '#B8AFA5']);
    rr(ctx, bx, by, bw, bh, W * 0.07); ctx.fill();
    const ix = bx + fr, iy = by + fr, iw = bw - fr * 2, ih = bh - fr * 2;
    ctx.fillStyle = lg(ctx, 0, iy, 0, iy + ih, [0, '#0B1030', 0.5, '#1B2252', 1, '#0B1030']); rr(ctx, ix, iy, iw, ih, W * 0.045); ctx.fill();
    const rw = iw / 3, rh = ih / 3, sz = Math.min(rw, rh) * 0.86;
    for (let k = 0; k < 3; k++) {
      const [pos, vel] = this.reel(k, u), x0 = ix + k * rw;
      ctx.save(); ctx.beginPath(); ctx.rect(x0 + 1, iy + 1, rw - 2, ih - 2); ctx.clip();
      ctx.fillStyle = lg(ctx, 0, iy, 0, iy + ih, [0, 'rgba(255,255,255,.02)', 0.5, 'rgba(255,255,255,.1)', 1, 'rgba(255,255,255,.02)']); ctx.fillRect(x0, iy, rw, ih);
      const blur = vel > 6 ? Math.min(0.9, vel * 0.03) : 0, base = Math.floor(pos);
      for (let nn = base - 2; nn <= base + 2; nn++) {
        const off = (pos - nn) * rh, cy = iy + ih / 2 + off; if (cy < iy - rh || cy > iy + ih + rh) continue;
        const sym = this.strips[k][((nn % 8) + 8) % 8];
        const pulse = win && Math.abs(off) < rh * 0.3 ? 1 + 0.1 * Math.sin(wp * Math.PI * 6) : 1;
        ctx.save(); ctx.translate(x0 + rw / 2, cy); ctx.scale(pulse, pulse); slotSymbol(ctx, sym, 0, 0, sz, blur); ctx.restore();
      }
      ctx.fillStyle = lg(ctx, 0, iy, 0, iy + ih, [0, 'rgba(11,16,48,.85)', 0.2, 'rgba(11,16,48,0)', 0.8, 'rgba(11,16,48,0)', 1, 'rgba(11,16,48,.85)']); ctx.fillRect(x0, iy, rw, ih);
      ctx.restore();
      if (k) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x0 - 0.5, iy + 4, 1, ih - 8); }
    }
    if (win) {
      const a = 0.55 + 0.35 * Math.sin(wp * Math.PI * 8);
      ctx.fillStyle = rgba(c.glow, 0.25 * a); rr(ctx, ix + 2, iy + rh + 2, iw - 4, rh - 4, W * 0.02); ctx.fill();
      ctx.strokeStyle = rgba('#FFFFFF', 0.8 * a); ctx.lineWidth = Math.max(1.5, W * 0.01); rr(ctx, ix + 2, iy + rh + 2, iw - 4, rh - 4, W * 0.02); ctx.stroke();
    }
    ctx.fillStyle = c.frame === 'gold' ? '#FFFFFF' : '#FFC74A';
    for (const sd of [-1, 1]) { const x = sd < 0 ? bx + fr * 0.15 : bx + bw - fr * 0.15; ctx.beginPath(); ctx.moveTo(x, iy + ih / 2 - fr * 0.55); ctx.lineTo(x + sd * -fr * 0.75, iy + ih / 2); ctx.lineTo(x, iy + ih / 2 + fr * 0.55); ctx.closePath(); ctx.fill(); }
    for (let i = 0; i < 14; i++) {
      const on = win ? (Math.floor(u * 10) + i) % 2 === 0 : i % 3 === Math.floor(u * 3) % 3;
      const x = bx + W * 0.05 + (i / 13) * (bw - W * 0.1);
      ctx.fillStyle = on ? '#FFFFFF' : 'rgba(255,255,255,.35)'; circ(ctx, x, by + fr * 0.5, W * 0.008); ctx.fill(); circ(ctx, x, by + bh - fr * 0.5, W * 0.008); ctx.fill();
    }
    const press = u > 0.1 && u < 0.34 ? Math.sin(seg(u, 0.1, 0.34) * Math.PI) : 0, br = W * 0.085, bcx = W / 2, bcy = H * 0.715;
    const ba = 1 - seg(u, 2.05, 2.25) + seg(u, 3.9, 4.15);
    ctx.save(); ctx.globalAlpha *= clamp(ba, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ell(ctx, bcx, bcy + br * 0.75, br * 1.05, br * 0.3); ctx.fill();
    ctx.fillStyle = '#B9760C'; circ(ctx, bcx, bcy + br * 0.14, br); ctx.fill();
    ctx.fillStyle = rgf(ctx, bcx - br * 0.3, bcy - br * 0.4 + press * 3, bcx, bcy + press * 3, br * 1.1, [0, '#FFF4C8', 0.5, '#FFD25E', 1, '#E3A21C']); circ(ctx, bcx, bcy + press * br * 0.1, br); ctx.fill();
    font(ctx, 800, br * 0.46); ctx.fillStyle = '#5A3300'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SPIN', bcx, bcy + press * br * 0.1 + br * 0.04);
    ctx.restore();
    if (u < 0.7) hand(ctx, bcx + br * 0.25, bcy + br * 0.35 + (1 - seg(u, 0, 0.12)) * W * 0.1, W * 0.2, 1 - seg(u, 0.4, 0.7), press);
    if (win) {
      for (let i = 0; i < 16; i++) {
        const a = -Math.PI / 2 + (hash(i + 3) - 0.5) * 2.6, v = W * (0.5 + hash(i + 7) * 0.5), tt = wp * 1.8;
        const x = W / 2 + Math.cos(a) * v * tt, y = H * 0.48 + Math.sin(a) * v * tt + W * 1.6 * tt * tt;
        if (y > H + 20) continue;
        ctx.save(); ctx.translate(x, y); ctx.rotate(tt * 6 + i); ctx.scale(1, 0.75 + 0.25 * Math.sin(tt * 10 + i));
        ctx.fillStyle = rgf(ctx, -W * 0.01, -W * 0.01, 0, 0, W * 0.03, [0, '#FFF4C8', 0.5, '#FFD25E', 1, '#E3A21C']); circ(ctx, 0, 0, W * 0.026); ctx.fill(); ctx.restore();
      }
    }
    vignette(ctx, W, H, 0.3);
  }
}
