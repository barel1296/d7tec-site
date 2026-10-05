// d7tec / PRESS START · Data / monitoring module ("Every dollar. Every cohort. Every decision.")
// Sample data for a fictional game, Stackopolis. dashboard.html ships the 30D · All view pre-rendered
// (every number is real HTML text); this module enhances it: range + network filters, chart (re)drawing,
// draw-in / morph animation, tooltips (pointer, touch, keyboard) and table sorting.
//
//   import { init } from './assets/dashboard.js';
//   init(document.querySelector('.db-root'));      // idempotent; returns { update, destroy }
//
// The data below is generated deterministically (seeded), then normalised so the 30-day view matches the
// hero control room exactly: Spend $1.24M · CPI $1.81 (▼22%) · D7 ROAS 31.8% · D30 ROAS 74.2% ·
// creative winner #142 scaling +35%. Every view (7D/30D/90D × network) is a slice of the same daily
// cohorts, so channel splits always sum to the total and the creative table reconciles to the KPIs.

/* =============================== data model =============================== */

const N = 180;                                 // daily install cohorts, Mar 9 – Sep 4, 2026
const END = N - 1;                             // Sep 4 — every cohort has matured to D30 by Oct 4
const DAY0 = Date.UTC(2026, 2, 9);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TARGET = { spend: 1239870, cpi: 1.81, roas: [0.061, 0.114, 0.196, 0.318, 0.742], ret: [0.41, 0.18, 0.07] };
const ROAS_DAYS = [0, 1, 3, 7, 30];
const RET_DAYS = [1, 7, 30];
const GOAL = { day: 60, roas: [0.05, 0.09, 0.17, 0.28, 0.66] };   // ROAS targets for payback by D60
const BENCH = [0.34, 0.12, 0.045];                                 // genre median retention D1 / D7 / D30
const DAMP = 0.94;                                                 // payback projection: damped power law
const RANGES = [7, 30, 90];

export const CHANNELS = [
  { id: 'meta', name: 'Meta', share: [[0, 0.31], [179, 0.26]], cpi: 1.13, ipm: 6.8, roas: [0.98, 1.02, 1.04, 1.04, 1.05], ret: [1.04, 1.06, 1.08] },
  { id: 'google', name: 'Google', share: [[0, 0.21], [179, 0.18]], cpi: 0.89, ipm: 7.4, roas: [0.95, 0.94, 0.93, 0.93, 0.93], ret: [1, 0.99, 0.98] },
  { id: 'tiktok', name: 'TikTok', share: [[0, 0.14], [179, 0.12]], cpi: 0.63, ipm: 8.6, roas: [0.8, 0.78, 0.77, 0.76, 0.76], ret: [0.93, 0.88, 0.84] },
  { id: 'applovin', name: 'AppLovin', share: [[0, 0.24], [179, 0.34]], cpi: 1.27, ipm: 9.5, roas: [1.25, 1.18, 1.14, 1.13, 1.12], ret: [1.02, 1.04, 1.06] },
  { id: 'unity', name: 'Unity', share: [[0, 0.1], [179, 0.1]], cpi: 0.87, ipm: 10.2, roas: [1.02, 0.95, 0.9, 0.88, 0.86], ret: [0.97, 0.95, 0.92] },
];
const HOOK_CH = { meta: 1, tiktok: 1.08, google: 0.9 };            // hook rate (3-second views) is a feed metric

// w = share of the day's total spend; net = split across networks; cpi/ipm/roas = multipliers vs the network
const CREATIVES = [
  { id: 142, name: 'Tower almost falls', fmt: 'Gameplay video', th: 'tower', from: 164, status: 'scale', note: '+35% budget',
    w: [[164, 0.05], [166, 0.14], [170, 0.22], [171, 0.23], [172, 0.31], [179, 0.34]], net: { applovin: 0.34, meta: 0.3, tiktok: 0.14, google: 0.12, unity: 0.1 }, cpi: 0.85, ipm: 1.15, hook: 0.38, roas: 1.2 },
  { id: 151, name: 'Stack 5 floors', fmt: 'Playable', th: 'play', from: 168, status: 'scale', note: '+20% budget',
    w: [[168, 0.02], [171, 0.06], [176, 0.1], [177, 0.13], [179, 0.14]], net: { applovin: 0.55, unity: 0.35, google: 0.1 }, cpi: 0.9, ipm: 1.55, hook: 0, roas: 1.1 },
  { id: 138, name: 'Perfect streak ×10', fmt: 'Gameplay video', th: 'streak', from: 141, status: 'scale', note: 'Holding budget',
    w: [[141, 0.03], [146, 0.1], [160, 0.15], [171, 0.12], [179, 0.09]], net: { meta: 0.36, applovin: 0.3, google: 0.2, tiktok: 0.14 }, cpi: 0.95, ipm: 1.05, hook: 0.31, roas: 1.05 },
  { id: 147, name: 'City from above', fmt: 'AI video', th: 'ai', from: 162, status: 'test', note: 'Budget capped',
    w: [[162, 0.02], [166, 0.045], [179, 0.05]], net: { meta: 0.45, tiktok: 0.3, google: 0.25 }, cpi: 1.02, ipm: 0.95, hook: 0.27, roas: 0.97 },
  { id: 129, name: 'Day 80 of my city', fmt: 'UGC video', th: 'ugc', from: 123, status: 'test', note: 'New hook in test',
    w: [[123, 0.02], [135, 0.06], [160, 0.06], [179, 0.05]], net: { tiktok: 0.6, meta: 0.4 }, cpi: 0.97, ipm: 0.88, hook: 0.33, roas: 0.84 },
  { id: 155, name: 'Wrong block!', fmt: 'Gameplay video', th: 'oops', from: 176, status: 'test', note: 'Iteration of #142',
    w: [[176, 0.02], [179, 0.06]], net: { applovin: 0.35, meta: 0.35, tiktok: 0.3 }, cpi: 0.9, ipm: 1.1, hook: 0.41, roas: 1.0 },
  { id: 121, name: 'Skyscraper fail', fmt: 'Fake gameplay', th: 'fake', from: 108, to: 158, status: 'kill', note: 'Paused Aug 14',
    w: [[108, 0.03], [125, 0.11], [150, 0.1], [158, 0.07]], net: { tiktok: 0.4, applovin: 0.32, unity: 0.28 }, cpi: 0.7, ipm: 1.45, hook: 0.36, roas: 0.46 },
  { id: 133, name: 'Satisfying slices', fmt: 'Static', th: 'static', from: 133, to: 166, status: 'kill', note: 'Paused Aug 22',
    w: [[133, 0.015], [145, 0.035], [160, 0.03], [166, 0.015]], net: { meta: 0.55, google: 0.45 }, cpi: 1.22, ipm: 0.62, hook: 0, roas: 0.66 },
  { id: 96, name: 'Crane cam', fmt: 'Gameplay video', th: 'crane', from: 30, to: 152, status: 'kill', note: 'Fatigued Aug 8',
    w: [[30, 0.08], [80, 0.28], [120, 0.24], [145, 0.1], [152, 0.03]], net: { applovin: 0.34, meta: 0.36, google: 0.3 }, cpi: 0.95, ipm: 1.04, hook: 0.29, roas: 1.02 },
  { id: 104, name: 'Night skyline', fmt: 'Gameplay video', th: 'night', from: 60, to: 137, status: 'kill', note: 'Paused Jul 24',
    w: [[60, 0.03], [85, 0.12], [120, 0.1], [137, 0.04]], net: { meta: 0.4, tiktok: 0.3, applovin: 0.3 }, cpi: 0.9, ipm: 1.08, hook: 0.3, roas: 0.96 },
];
const CREATIVE_COUNT = { 7: 46, 30: 142, 90: 377 };
const CREATIVE_NET_SHARE = { meta: 0.64, google: 0.45, tiktok: 0.41, applovin: 0.58, unity: 0.36 };
const SHOWN = 8;

// decisions on the timeline. p = label priority (1 = always labelled when there is room)
const DECISIONS = [
  { i: 115, kind: 'scale', short: 'AppLovin +25%', text: 'AppLovin budget +25%: D7 ROAS held above target', p: 2, nets: ['applovin'] },
  { i: 137, kind: 'kill', short: '#104 paused', text: '#104 paused: creative fatigue', p: 3, cr: [104] },
  { i: 141, kind: 'launch', short: '#138 live', text: '#138 “Perfect streak ×10” launched', p: 3, cr: [138] },
  { i: 152, kind: 'kill', short: '#96 retired', text: '#96 retired: CTR down 40% in 3 weeks', p: 3, cr: [96] },
  { i: 158, kind: 'kill', short: '#121 paused', text: '#121 paused: cheap installs, weak D7 ROAS', p: 2, cr: [121] },
  { i: 164, kind: 'launch', short: '#142 live', text: '#142 “Tower almost falls” launched', p: 2, cr: [142] },
  { i: 166, kind: 'kill', short: '#133 paused', text: '#133 paused: IPM under 5', p: 3, cr: [133] },
  { i: 171, kind: 'scale', short: '#142 +35%', text: '#142 budget +35%: D7 ROAS above the 28% target', p: 1, cr: [142] },
  { i: 176, kind: 'scale', short: '#151 scaled', text: '#151 playable moved to Scale; #155 iteration live', p: 2, cr: [151, 155] },
];
const KIND_LABEL = { scale: 'Scaled', launch: 'Launched', kill: 'Paused' };

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pl(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let k = 1; k < pts.length; k++) {
    const [x1, y1] = pts[k];
    if (x <= x1) { const [x0, y0] = pts[k - 1]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  }
  return pts[pts.length - 1][1];
}

let DATA = null;
function data() {
  if (DATA) return DATA;
  const A = END - 29;
  const SPEND_K = [[0, 12.5], [60, 18], [90, 24], [120, 29.8], [149, 33.2], [150, 34.2], [164, 37.6], [171, 40.5], [172, 45], [179, 50.5]];
  const CPI_K = [[0, 2.7], [90, 2.56], [120, 2.44], [149, 2.3], [150, 2.26], [164, 2.02], [171, 1.7], [179, 1.58]];
  const Q_K = [[0, 0.8], [120, 0.84], [149, 0.865], [150, 0.9], [164, 0.95], [171, 1.05], [179, 1.1]];
  const R_K = [[0, 1.035], [120, 1.03], [150, 1.01], [179, 0.975]];
  const NC = CHANNELS.length;
  const r = mulberry32(0x5eed2026);
  const spend = [], cpi = [], q = [], rq = [];
  for (let i = 0; i < N; i++) {
    const wd = (1 + i) % 7, we = wd === 6 || wd === 0;
    spend[i] = pl(SPEND_K, i) * 1000 * (we ? 1.06 : wd === 1 ? 0.97 : 1) * (1 + (r() - 0.5) * 0.07);
    cpi[i] = pl(CPI_K, i) * (we ? 1.03 : 1) * (1 + (r() - 0.5) * 0.08);
    q[i] = pl(Q_K, i) * (1 + (r() - 0.5) * 0.07);
    rq[i] = pl(R_K, i) * (1 + (r() - 0.5) * 0.04);
  }
  // spend: normalise the 30-day window to the hero total, integer dollars
  let s = 0; for (let i = A; i <= END; i++) s += spend[i];
  const fs = TARGET.spend / s;
  for (let i = 0; i < N; i++) spend[i] = Math.round(spend[i] * fs);
  s = 0; for (let i = A; i <= END; i++) s += spend[i];
  spend[END] += TARGET.spend - s;
  // installs: CPI normalised so the 30-day window lands on $1.81
  const targetInst = Math.round(TARGET.spend / TARGET.cpi);
  let inst = spend.map((v, i) => v / cpi[i]);
  let si = 0; for (let i = A; i <= END; i++) si += inst[i];
  inst = inst.map(v => Math.round(v * targetInst / si));
  si = 0; for (let i = A; i <= END; i++) si += inst[i];
  inst[END] += targetInst - si;

  const cs = CHANNELS.map(() => new Array(N)), ci = CHANNELS.map(() => new Array(N)), cimp = CHANNELS.map(() => new Array(N));
  const crev = CHANNELS.map(() => ROAS_DAYS.map(() => new Array(N)));
  const cret = CHANNELS.map(() => RET_DAYS.map(() => new Array(N)));
  for (let i = 0; i < N; i++) {
    const sh = CHANNELS.map(c => pl(c.share, i) * (1 + (r() - 0.5) * 0.12));
    const sum = sh.reduce((a, b) => a + b, 0);
    let acc = 0;
    CHANNELS.forEach((c, k) => { const v = k < NC - 1 ? Math.round(spend[i] * sh[k] / sum) : spend[i] - acc; cs[k][i] = v; acc += v; });
    const K = CHANNELS.reduce((a, c, k) => a + cs[k][i] / c.cpi, 0);
    acc = 0;
    CHANNELS.forEach((c, k) => { const v = k < NC - 1 ? Math.round(inst[i] * (cs[k][i] / c.cpi) / K) : inst[i] - acc; ci[k][i] = v; acc += v; });
    CHANNELS.forEach((c, k) => { cimp[k][i] = ci[k][i] * 1000 / (c.ipm * (1 + (r() - 0.5) * 0.08)); });
    const nz = CHANNELS.map(() => 1 + (r() - 0.5) * 0.08);
    ROAS_DAYS.forEach((_, d) => {
      const all = spend[i] * TARGET.roas[d] * q[i];
      const w = CHANNELS.map((c, k) => cs[k][i] * c.roas[d] * nz[k]); const ws = w.reduce((a, b) => a + b, 0);
      CHANNELS.forEach((c, k) => { crev[k][d][i] = all * w[k] / ws; });
    });
    const nr = CHANNELS.map(() => 1 + (r() - 0.5) * 0.06);
    RET_DAYS.forEach((_, d) => {
      const all = inst[i] * TARGET.ret[d] * rq[i];
      const w = CHANNELS.map((c, k) => ci[k][i] * c.ret[d] * nr[k]); const ws = w.reduce((a, b) => a + b, 0);
      CHANNELS.forEach((c, k) => { cret[k][d][i] = all * w[k] / ws; });
    });
  }
  // normalise cohort revenue + retention so the 30-day window hits the hero values exactly
  ROAS_DAYS.forEach((_, d) => {
    let v = 0; for (let i = A; i <= END; i++) for (let k = 0; k < NC; k++) v += crev[k][d][i];
    const f = TARGET.roas[d] * TARGET.spend / v;
    for (let i = 0; i < N; i++) for (let k = 0; k < NC; k++) crev[k][d][i] *= f;
  });
  RET_DAYS.forEach((_, d) => {
    let v = 0; for (let i = A; i <= END; i++) for (let k = 0; k < NC; k++) v += cret[k][d][i];
    const f = TARGET.ret[d] * targetInst / v;
    for (let i = 0; i < N; i++) for (let k = 0; k < NC; k++) cret[k][d][i] *= f;
  });
  // creative spend per network per day, capped so the long tail ("other creatives") always keeps ≥ 15%
  const crs = CREATIVES.map(() => CHANNELS.map(() => new Float64Array(N)));
  for (let i = 0; i < N; i++) {
    CHANNELS.forEach((ch, k) => {
      let tot = 0;
      CREATIVES.forEach((c, j) => {
        if (i < c.from || (c.to != null && i > c.to) || !c.net[ch.id]) return;
        const v = spend[i] * pl(c.w, i) * c.net[ch.id];
        crs[j][k][i] = v; tot += v;
      });
      const cap = cs[k][i] * 0.85;
      if (tot > cap) CREATIVES.forEach((c, j) => { crs[j][k][i] *= cap / tot; });
    });
  }
  DATA = { cs, ci, cimp, crev, cret, crs };
  return DATA;
}

/* ================================ views ================================ */

const roundTo = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

function agg(a, b, ks) {
  const D = data();
  let spend = 0, installs = 0, imp = 0;
  const rev = ROAS_DAYS.map(() => 0), ret = RET_DAYS.map(() => 0);
  for (let i = a; i <= b; i++) for (const k of ks) {
    spend += D.cs[k][i]; installs += D.ci[k][i]; imp += D.cimp[k][i];
    for (let d = 0; d < rev.length; d++) rev[d] += D.crev[k][d][i];
    for (let d = 0; d < ret.length; d++) ret[d] += D.cret[k][d][i];
  }
  const roas = rev.map(v => v / spend);
  const r = ret.map(v => v / installs);
  return { spend, installs, imp, cpi: spend / installs, ipm: installs * 1000 / imp, roas, rev30: rev[4], rev7: rev[3], ltv: rev[4] / installs, ret: r, retUsers: ret, payback: payback(roas[3], roas[4]) };
}

export function payback(r7, r30) {
  if (r30 >= 1) { const k0 = Math.log(r30 / r7) / Math.log(30 / 7); return 7 * Math.pow(1 / r7, 1 / k0); }
  const k = DAMP * Math.log(r30 / r7) / Math.log(30 / 7);
  return 30 * Math.pow(1 / r30, 1 / k);
}

// smooth retention curve through D1 / D7 / D30 (quadratic in log-log space)
function retCurve(r1, r7, r30) {
  const a = Math.log(r1), x7 = Math.log(7), x30 = Math.log(30);
  const y7 = Math.log(r7) - a, y30 = Math.log(r30) - a;
  const det = x7 * x30 * x30 - x30 * x7 * x7;
  const b = (y7 * x30 * x30 - y30 * x7 * x7) / det;
  const c = (x7 * y30 - x30 * y7) / det;
  return t => { const x = Math.log(t); return Math.exp(a + b * x + c * x * x); };
}

function creativeStats(a, b, ks, range, chId) {
  const D = data();
  const rows = CREATIVES.map((c, j) => ({ c, j, spend: 0, inst: 0, imp: 0, rev7: 0, hv: 0, himp: 0 }));
  const tot = { spend: 0, inst: 0, imp: 0, rev7: 0, hv: 0, himp: 0 };
  for (let i = a; i <= b; i++) for (const k of ks) {
    const ch = CHANNELS[k], hook = HOOK_CH[ch.id] || 0;
    const sp = D.cs[k][i], ins = D.ci[k][i], imp = D.cimp[k][i], rv7 = D.crev[k][3][i];
    tot.spend += sp; tot.inst += ins; tot.imp += imp; tot.rev7 += rv7;
    const cpi = sp / ins, ipm = ins * 1000 / imp, roas7 = rv7 / sp;
    let oImp = imp;
    for (const row of rows) {
      const s = D.crs[row.j][k][i];
      if (!s) continue;
      const n = s / (cpi * row.c.cpi), im = n * 1000 / (ipm * row.c.ipm);
      row.spend += s; row.inst += n; row.imp += im; row.rev7 += s * roas7 * row.c.roas; oImp -= im;
      if (hook && row.c.hook) { row.hv += im * row.c.hook * hook; row.himp += im; tot.hv += im * row.c.hook * hook; tot.himp += im; }
    }
    if (hook) { tot.hv += oImp * 0.75 * 0.26 * hook; tot.himp += oImp * 0.75; }   // long tail: ~75% video, 26% hook
  }
  const fin = x => ({ spend: x.spend, cpi: x.inst ? x.spend / x.inst : 0, ipm: x.imp ? x.inst * 1000 / x.imp : 0, hook: x.himp ? x.hv / x.himp : null, roas7: x.spend ? x.rev7 / x.spend : 0 });
  const live = rows.filter(x => x.spend > 1).sort((p, q) => q.spend - p.spend);
  const shown = live.slice(0, SHOWN);
  const other = { spend: tot.spend, inst: tot.inst, imp: tot.imp, rev7: tot.rev7, hv: tot.hv, himp: tot.himp };
  for (const x of shown) { other.spend -= x.spend; other.inst -= x.inst; other.imp -= x.imp; other.rev7 -= x.rev7; other.hv -= x.hv; other.himp -= x.himp; }
  const count = chId === 'all' ? CREATIVE_COUNT[range] : Math.round(CREATIVE_COUNT[range] * CREATIVE_NET_SHARE[chId]);
  return {
    rows: shown.map(x => ({ id: x.c.id, name: x.c.name, fmt: x.c.fmt, th: x.c.th, status: x.c.status, note: x.c.note, ...fin(x) })),
    other: { count: count - shown.length, ...fin(other) },
    total: { count, ...fin(tot) },
    hookable: ks.some(k => HOOK_CH[CHANNELS[k].id]),
  };
}

const decisionNets = d => d.nets || [...new Set(d.cr.flatMap(id => Object.keys(CREATIVES.find(c => c.id === id).net)))];
const VIEWS = new Map();
export function getView(range = 30, ch = 'all') {
  const key = range + ':' + ch;
  if (VIEWS.has(key)) return VIEWS.get(key);
  const D = data();
  const b = END, a = END - range + 1;
  const ks = ch === 'all' ? CHANNELS.map((_, k) => k) : [CHANNELS.findIndex(c => c.id === ch)];
  const cur = agg(a, b, ks), prev = agg(a - range, a - 1, ks);
  const days = [];
  for (let i = a; i <= b; i++) {
    let s = 0, n = 0, r7 = 0, r30 = 0;
    for (const k of ks) { s += D.cs[k][i]; n += D.ci[k][i]; r7 += D.crev[k][3][i]; r30 += D.crev[k][4][i]; }
    days.push({ i, spend: s, installs: n, cpi: s / n, roas7: r7 / s, roas30: r30 / s, rev30: r30, ltv: r30 / n });
  }
  const curve = retCurve(...cur.ret), bench = retCurve(...BENCH);
  const ret = [], benchArr = [];
  for (let t = 1; t <= 30; t++) { ret.push(t === 1 ? cur.ret[0] : t === 7 ? cur.ret[1] : t === 30 ? cur.ret[2] : curve(t)); benchArr.push(bench(t)); }
  const all = agg(a, b, CHANNELS.map((_, k) => k));
  const nets = CHANNELS.map((c, k) => { const x = agg(a, b, [k]); return { id: c.id, name: c.name, spend: x.spend, share: x.spend / all.spend, installs: x.installs, cpi: x.cpi, roas7: x.roas[3], roas30: x.roas[4] }; })
    .sort((p, q) => q.spend - p.spend);
  const v = {
    range, ch, a, b, cur, prev, days, ret, bench: benchArr, nets, all,
    chName: ch === 'all' ? 'All networks' : CHANNELS[ks[0]].name,
    cre: creativeStats(a, b, ks, range, ch),
    decisions: DECISIONS.filter(d => d.i >= a && d.i <= b && (ch === 'all' || decisionNets(d).includes(ch))),
  };
  VIEWS.set(key, v);
  return v;
}

/* ============================== formatting ============================== */

const dateOf = i => new Date(DAY0 + i * 864e5);
export const fmtDay = i => { const d = dateOf(i); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const fmtDayLong = i => { const d = dateOf(i); return `${WDAY[d.getUTCDay()]}, ${MON[d.getUTCMonth()]} ${d.getUTCDate()}`; };
export const fmtWindow = v => `${fmtDay(v.a)} – ${fmtDay(v.b)}, 2026`;
function compact(n, pre = '') {
  const a = Math.abs(n);
  if (a >= 999500) return pre + (n / 1e6).toFixed(2) + 'M';
  if (a >= 99950) return pre + Math.round(n / 1e3) + 'K';
  if (a >= 999.5) return pre + (n / 1e3).toFixed(1) + 'K';
  return pre + Math.round(n);
}
export const fmt = {
  money: n => compact(n, '$'),
  count: n => compact(n),
  int: n => Math.round(n).toLocaleString('en-US'),
  usd2: n => '$' + n.toFixed(2),
  pct: n => (n * 100).toFixed(1) + '%',
  pct0: n => Math.round(n * 100) + '%',
  ipm: n => n.toFixed(1),
  day: n => n > 180 ? 'Day 180+' : 'Day ' + Math.round(n),
};
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// KPI tiles: value + delta vs the previous period of the same length
export function kpis(v) {
  const c = v.cur, p = v.prev, per = `prev. ${v.range}D`;
  const rel = (x, y, goodUp) => {
    const d = Math.round((x / y - 1) * 100);
    return { text: d === 0 ? '0%' : `${Math.abs(d)}%`, dir: d > 0 ? 'up' : d < 0 ? 'down' : 'flat', tone: d === 0 || goodUp == null ? 'flat' : (d > 0) === goodUp ? 'good' : 'bad' };
  };
  const pts = (x, y) => {
    const d = roundTo((x - y) * 100, 1);
    return { text: `${Math.abs(d).toFixed(1)} pts`, dir: d > 0 ? 'up' : d < 0 ? 'down' : 'flat', tone: d > 0 ? 'good' : d < 0 ? 'bad' : 'flat' };
  };
  const pb = Math.round(c.payback), ppb = Math.round(p.payback), dd = ppb - pb;
  return [
    { key: 'spend', label: 'Spend', value: fmt.money(c.spend), delta: rel(c.spend, p.spend, null), prev: fmt.money(p.spend), spark: v.days.map(d => d.spend) },
    { key: 'installs', label: 'Installs', value: fmt.count(c.installs), delta: rel(c.installs, p.installs, true), prev: fmt.count(p.installs), spark: v.days.map(d => d.installs) },
    { key: 'cpi', label: 'CPI', value: fmt.usd2(c.cpi), delta: rel(c.cpi, p.cpi, false), prev: fmt.usd2(p.cpi), spark: v.days.map(d => d.cpi) },
    { key: 'roas7', label: 'D7 ROAS', value: fmt.pct(c.roas[3]), delta: pts(c.roas[3], p.roas[3]), prev: fmt.pct(p.roas[3]), spark: v.days.map(d => d.roas7) },
    { key: 'roas30', label: 'D30 ROAS', value: fmt.pct(c.roas[4]), delta: pts(c.roas[4], p.roas[4]), prev: fmt.pct(p.roas[4]), spark: v.days.map(d => d.roas30) },
    { key: 'rev', label: 'Revenue', sub: 'D30', value: fmt.money(c.rev30), delta: rel(c.rev30, p.rev30, true), prev: fmt.money(p.rev30), spark: v.days.map(d => d.rev30) },
    { key: 'ltv', label: 'LTV', sub: 'D30', value: fmt.usd2(c.ltv), delta: rel(c.ltv, p.ltv, true), prev: fmt.usd2(p.ltv), spark: v.days.map(d => d.ltv) },
    { key: 'payback', label: 'Payback', sub: 'projected', value: fmt.day(pb),
      delta: { text: dd === 0 ? 'same day' : `${Math.abs(dd)} days ${dd > 0 ? 'sooner' : 'later'}`, dir: 'none', tone: dd > 0 ? 'good' : dd < 0 ? 'bad' : 'flat' },
      prev: fmt.day(ppb), recovered: c.roas[4] },
  ].map(k => ({ ...k, per }));
}

/* ============================== SVG renderers ============================== */

const r1 = n => Math.round(n * 10) / 10;
function niceScale(max, count) {
  const raw = Math.max(max, 1e-9) / count, mag = 10 ** Math.floor(Math.log10(raw)), n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step - 1e-9) * step;
  const ticks = []; for (let t = 0; t <= top + step / 2; t += step) ticks.push(roundTo(t, 10));
  return { max: top, ticks };
}
function barPath(x, y, w, h, rad) {
  if (h <= 0.05) return '';
  const rr = Math.min(rad, w / 2, h);
  return `M${r1(x)} ${r1(y + h)}V${r1(y + rr)}Q${r1(x)} ${r1(y)} ${r1(x + rr)} ${r1(y)}H${r1(x + w - rr)}Q${r1(x + w)} ${r1(y)} ${r1(x + w)} ${r1(y + rr)}V${r1(y + h)}Z`;
}
const linePath = pts => pts.map((p, k) => (k ? 'L' : 'M') + r1(p[0]) + ' ' + r1(p[1])).join('');
const tickMoney = t => t === 0 ? '0' : t >= 1e6 ? '$' + roundTo(t / 1e6, 2) + 'M' : t >= 1000 ? '$' + roundTo(t / 1000, 1) + 'K' : '$' + t;
const tickCount = t => t === 0 ? '0' : t >= 1e6 ? roundTo(t / 1e6, 2) + 'M' : t >= 1000 ? roundTo(t / 1000, 1) + 'K' : String(t);
const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = t => 1 - Math.pow(1 - t, 3);

// Daily spend (columns) over daily installs (line): two panels sharing one x-axis — never a dual axis.
export function renderDaily(v, W, H, o = {}) {
  const g = o.grow ?? 1, n = v.days.length, narrow = W < 480;
  const L = narrow ? 38 : 46, R = 8;
  const flags = v.decisions;
  const top = 26, axisH = 22, gap = 30;
  const avail = H - top - axisH - gap;
  const h1 = Math.round(avail * 0.6), h2 = avail - h1;
  const y1 = top, y2 = top + h1 + gap, pw = W - L - R, band = pw / n;
  const bw = Math.max(2, Math.min(n <= 7 ? 28 : n <= 30 ? 15 : 7, band * 0.56));
  const sS = o.sScale || niceScale(Math.max(...v.days.map(d => d.spend)), 3);
  const iS = o.iScale || niceScale(Math.max(...v.days.map(d => d.installs)), 2);
  const sMax = o.sMax ?? sS.max, iMax = o.iMax ?? iS.max;
  const xc = k => L + band * (k + 0.5);
  const ys = val => y1 + h1 - (val / sMax) * h1;
  const yi = val => y2 + h2 - (val / iMax) * h2;
  let s = '';
  // grid + y labels
  s += '<g class="db-grid">';
  for (const t of sS.ticks) { if (t > sMax * 1.001) continue; const y = r1(ys(t)) + 0.5; s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"${t === 0 ? ' class="db-base"' : ''}/>`; }
  for (const t of iS.ticks) { if (t > iMax * 1.001) continue; const y = r1(yi(t)) + 0.5; s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"${t === 0 ? ' class="db-base"' : ''}/>`; }
  s += '</g><g class="db-ylab">';
  for (const t of sS.ticks) { if (t > sMax * 1.001) continue; s += `<text x="${L - 8}" y="${r1(ys(t)) + 4}" text-anchor="end">${tickMoney(t)}</text>`; }
  for (const t of iS.ticks) { if (t > iMax * 1.001) continue; s += `<text x="${L - 8}" y="${r1(yi(t)) + 4}" text-anchor="end">${tickCount(t)}</text>`; }
  s += `<text class="db-ptitle" x="0" y="${y1 - 11}">Spend</text><text class="db-ptitle" x="0" y="${y2 - 11}">Installs</text>`;
  s += '</g>';
  // decision flags (behind the bars: hairline + marker); labels only where they clear every marker and label
  const geoFlags = [];
  if (flags.length) {
    s += `<g class="db-flags" style="opacity:${r1(clamp01(g * 1.4 - 0.4))}">`;
    const order = flags.map(f => ({ f, k: f.i - v.a })).sort((p, q) => p.f.p - q.f.p || p.k - q.k);
    const labelled = new Map();
    const marks = flags.map(f => xc(f.i - v.a));
    const placed = [];
    const fits = (x, l, rr) => l >= L - 4 && rr <= W - R && !marks.some(mx => mx !== x && mx + 6 > l - 3 && mx - 6 < rr + 3) && !placed.some(([pl, pr]) => l < pr + 8 && rr > pl - 8);
    for (const { f, k } of order) {
      if (narrow) break;
      const x = xc(k), est = f.short.length * 5.9 + 4;
      if (fits(x, x + 8, x + 9 + est)) { placed.push([x + 8, x + 9 + est]); labelled.set(f.i, 'r'); }
      else if (fits(x, x - 9 - est, x - 8)) { placed.push([x - 9 - est, x - 8]); labelled.set(f.i, 'l'); }
    }
    for (const f of flags) {
      const k = f.i - v.a, x = r1(xc(k));
      s += `<line class="db-flag-l" x1="${x}" x2="${x}" y1="${top - 12}" y2="${y1 + h1}"/>`;
      s += `<circle class="db-flag db-flag--${f.kind}" cx="${x}" cy="${top - 13}" r="4.5"/>`;
      if (labelled.has(f.i)) s += labelled.get(f.i) === 'r' ? `<text class="db-flag-t" x="${r1(x + 9)}" y="${top - 9}">${esc(f.short)}</text>` : `<text class="db-flag-t" x="${r1(x - 9)}" y="${top - 9}" text-anchor="end">${esc(f.short)}</text>`;
      geoFlags.push({ k, x });
    }
    s += '</g>';
  }
  // spend columns
  let bp = '';
  const bars = v.days.map((d, k) => {
    const h = Math.max(0, (d.spend / sMax) * h1 * g), x = xc(k) - bw / 2, y = y1 + h1 - h;
    bp += barPath(x, y, bw, h, Math.min(3, bw / 2));
    return { x, y, w: bw, h };
  });
  s += `<path class="db-spend" d="${bp}"/>`;
  // installs line + wash (revealed left → right during draw-in)
  const pts = v.days.map((d, k) => [xc(k), yi(d.installs)]);
  const clipW = r1(L + pw * g + 2);
  const cid = (o.idp || 'db') + '-dclip';
  s += `<clipPath id="${cid}"><rect x="0" y="0" width="${clipW}" height="${H}"/></clipPath>`;
  s += `<g clip-path="url(#${cid})"><path class="db-wash db-wash--users" d="${linePath(pts)}L${r1(pts[n - 1][0])} ${r1(y2 + h2)}L${r1(pts[0][0])} ${r1(y2 + h2)}Z"/>`;
  s += `<path class="db-line db-line--users" d="${linePath(pts)}"/></g>`;
  // x labels
  const every = n <= 7 ? (narrow ? 2 : 1) : n <= 30 ? (narrow ? 14 : 7) : (narrow ? 28 : 14);
  s += '<g class="db-xlab">';
  for (let k = 0; k < n; k += every) {
    const x = xc(k), anchor = k === 0 && x - L < 22 ? 'start' : 'middle';
    s += `<text x="${r1(anchor === 'start' ? x - bw / 2 : x)}" y="${H - 6}" text-anchor="${anchor}">${fmtDay(v.days[k].i)}</text>`;
  }
  s += '</g>';
  // hover layer (driven by JS)
  s += `<g class="db-hover" aria-hidden="true"><line class="db-xh" x1="0" x2="0" y1="${y1}" y2="${y2 + h2}"/><path class="db-hl db-hl--spend" d=""/><circle class="db-hd db-hd--users" r="4.5" cx="-20" cy="-20"/></g>`;
  return { svg: s, geo: { kind: 'daily', n, L, R, band, top, y1, h1, y2, h2, bw, bars, pts, xc: v.days.map((_, k) => xc(k)), flags: geoFlags } };
}

// ROAS ladder: cumulative cohort ROAS at D0 → D30 vs target, plus the projected payback day.
export function renderLadder(v, W, H, o = {}) {
  const g = o.grow ?? 1, narrow = W < 420;
  const L = narrow ? 36 : 44, R = 8, top = 26, axisH = narrow ? 36 : 34;
  const ph = H - top - axisH, pw = W - L - R;
  const vals = v.cur.roas;
  const pb = Math.round(v.cur.payback);
  const cats = [...ROAS_DAYS.map((d, k) => ({ lab: 'D' + d, v: vals[k], t: GOAL.roas[k], k })), { lab: pb > 180 ? 'D180+' : 'D' + pb, v: 1, proj: true, k: 5 }];
  const n = cats.length, band = pw / n;
  const bw = Math.min(narrow ? 26 : 34, band * 0.5);
  const yMax = Math.max(1, ...vals) * 1.0;
  const y = val => top + ph - (val / yMax) * ph;
  const xc = k => L + band * (k + 0.5);
  let s = '<g class="db-grid">';
  for (const t of [0, 0.25, 0.5, 0.75, 1]) { const yy = r1(y(t)) + 0.5; s += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"${t === 0 ? ' class="db-base"' : t === 1 ? ' class="db-even"' : ''}/>`; }
  s += '</g><g class="db-ylab">';
  for (const t of [0, 0.25, 0.5, 0.75, 1]) s += `<text x="${L - 8}" y="${r1(y(t)) + 4}" text-anchor="end">${Math.round(t * 100)}%</text>`;
  s += `</g><text class="db-even-t" x="${L + 6}" y="${r1(y(1)) - 7}">Break-even</text>`;
  const bars = [];
  // columns
  cats.forEach((c, k) => {
    const gk = ease(clamp01((g - k * 0.09) / 0.55));
    const h = (c.v / yMax) * ph * gk, x = xc(k) - bw / 2, yy = top + ph - h;
    bars.push({ x, y: top + ph - (c.v / yMax) * ph, w: bw, h: (c.v / yMax) * ph });
    if (c.proj) {
      s += `<path class="db-proj" d="${barPath(x + 0.75, yy + 0.75, bw - 1.5, Math.max(0, h - 0.75), 4)}" style="opacity:${r1(gk)}"/>`;
    } else {
      s += `<path class="db-rung db-rung--${k}" d="${barPath(x, yy, bw, h, 4)}"/>`;
    }
    if (!c.proj) s += `<text class="db-val db-val--ko" x="${r1(xc(k))}" y="${r1(yy - 8)}" text-anchor="middle" style="opacity:${r1(gk)}">${fmt.pct(c.v)}</text>`;
  });
  // target staircase
  let tp = '';
  const steps = cats.filter(c => !c.proj);
  steps.forEach((c, k) => {
    const yy = r1(y(c.t));
    const x0 = k === 0 ? r1(xc(k) - bw / 2 - 8) : r1(L + band * k);
    const x1 = k === steps.length - 1 ? r1(xc(k) + bw / 2 + 8) : r1(L + band * (k + 1));
    tp += (k ? `V${yy}` : `M${x0} ${yy}`) + `H${x1}`;
  });
  s += `<path class="db-target" d="${tp}" style="opacity:${r1(clamp01(g * 1.6 - 0.6))}"/>`;
  // x labels
  s += '<g class="db-xlab">';
  cats.forEach((c, k) => {
    s += `<text x="${r1(xc(k))}" y="${top + ph + 17}" text-anchor="middle"${c.proj ? ' class="db-xlab-proj"' : ''}>${c.lab}</text>`;
    if (c.proj) s += `<text class="db-xlab-sub" x="${r1(xc(k))}" y="${top + ph + 30}" text-anchor="middle">payback</text>`;
  });
  s += '</g>';
  s += `<g class="db-hover" aria-hidden="true"><path class="db-hl db-hl--rung" d=""/></g>`;
  return { svg: s, geo: { kind: 'ladder', n, band, L, top, ph, cats, bars, xc: cats.map((_, k) => xc(k)) } };
}

// Retention: share of installs active on day N (D1 → D30) against the genre median.
export function renderRetention(v, W, H, o = {}) {
  const g = o.grow ?? 1, narrow = W < 420;
  const L = narrow ? 34 : 42, R = 14, top = 18, axisH = 24;
  const ph = H - top - axisH, pw = W - L - R;
  const yMax = o.yMax ?? (Math.max(v.ret[0], v.bench[0]) > 0.45 ? 0.6 : 0.5);
  const x = t => L + ((t - 1) / 29) * pw;
  const y = val => top + ph - (val / yMax) * ph;
  let s = '<g class="db-grid">';
  const ticks = []; for (let t = 0; t <= yMax + 1e-9; t += 0.1) ticks.push(roundTo(t, 2));
  for (const t of ticks) { const yy = r1(y(t)) + 0.5; s += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"${t === 0 ? ' class="db-base"' : ''}/>`; }
  s += '</g><g class="db-ylab">';
  for (const t of ticks) s += `<text x="${L - 8}" y="${r1(y(t)) + 4}" text-anchor="end">${Math.round(t * 100)}%</text>`;
  s += '</g>';
  const pts = v.ret.map((r, k) => [x(k + 1), y(r)]);
  const bpts = v.bench.map((r, k) => [x(k + 1), y(r)]);
  const cid = (o.idp || 'db') + '-rclip';
  s += `<clipPath id="${cid}"><rect x="0" y="0" width="${r1(L + pw * g + 6)}" height="${H}"/></clipPath><g clip-path="url(#${cid})">`;
  s += `<path class="db-line db-line--bench" d="${linePath(bpts)}"/>`;
  s += `<path class="db-wash db-wash--users" d="${linePath(pts)}L${r1(pts[29][0])} ${r1(top + ph)}L${r1(pts[0][0])} ${r1(top + ph)}Z"/>`;
  s += `<path class="db-line db-line--users" d="${linePath(pts)}"/>`;
  // labelled checkpoints D1 / D7 / D30
  [[1, 0], [7, 1], [30, 2]].forEach(([t, k]) => {
    const px = x(t), py = y(v.cur.ret[k]);
    s += `<circle class="db-mark" cx="${r1(px)}" cy="${r1(py)}" r="4.5"/>`;
    const anchor = t === 30 ? 'end' : 'start';
    const tx = t === 30 ? px - 2 : px + 9, ty = t === 30 ? py - 12 : py - 9;
    s += `<text class="db-val" x="${r1(tx)}" y="${r1(ty)}" text-anchor="${anchor}">${fmt.pct(v.cur.ret[k])}</text>`;
  });
  s += '</g><g class="db-xlab">';
  for (const t of [1, 7, 14, 21, 30]) s += `<text x="${r1(x(t))}" y="${H - 6}" text-anchor="${t === 1 ? 'start' : t === 30 ? 'end' : 'middle'}">${'D' + t}</text>`;
  s += '</g>';
  s += `<g class="db-hover" aria-hidden="true"><line class="db-xh" x1="0" x2="0" y1="${top}" y2="${top + ph}"/><circle class="db-hd db-hd--bench" r="3.5" cx="-20" cy="-20"/><circle class="db-hd db-hd--users" r="4.5" cx="-20" cy="-20"/></g>`;
  return { svg: s, geo: { kind: 'ret', n: 30, L, pw, top, ph, pts, bpts, xc: pts.map(p => p[0]) } };
}

export function renderSpark(arr, W = 120, H = 26) {
  const n = arr.length, min = Math.min(...arr), max = Math.max(...arr), pad = 3;
  const x = k => pad + (k / (n - 1)) * (W - pad * 2);
  const y = val => max === min ? H / 2 : pad + (1 - (val - min) / (max - min)) * (H - pad * 2);
  const pts = arr.map((val, k) => [x(k), y(val)]);
  const last = pts[n - 1];
  return `<path class="db-spk-w" d="${linePath(pts)}L${r1(last[0])} ${H}L${r1(pts[0][0])} ${H}Z"/><path class="db-spk-l" d="${linePath(pts)}"/><circle class="db-spk-d" cx="${r1(last[0])}" cy="${r1(last[1])}" r="2.5"/>`;
}

/* ============================ HTML fragments ============================ */

const ARROW = { up: '▲', down: '▼', flat: '–', none: '' };
export function kpiInner(k, sw = 120) {
  const sub = k.sub ? ` <span class="db-kpi-sub">${esc(k.sub)}</span>` : '';
  const visual = k.key === 'payback'
    ? `<span class="db-meter" aria-hidden="true"><span class="db-meter-f" style="width:${(Math.min(1, k.recovered) * 100).toFixed(1)}%"></span></span><span class="db-meter-t">${fmt.pct0(k.recovered)} recovered by D30</span>`
    : `<svg class="db-spk" viewBox="0 0 ${sw} 26" preserveAspectRatio="none" aria-hidden="true" focusable="false">${renderSpark(k.spark, sw, 26)}</svg>`;
  return `<dt class="db-kpi-l">${esc(k.label)}${sub}</dt>`
    + `<dd class="db-kpi-v">${esc(k.value)}</dd>`
    + `<dd class="db-kpi-d"><span class="db-delta db-delta--${k.delta.tone}">${k.delta.dir === 'none' ? '' : `<span aria-hidden="true">${ARROW[k.delta.dir]}</span> <span class="db-sr">${k.delta.dir === 'up' ? 'up' : k.delta.dir === 'down' ? 'down' : 'unchanged'} </span>`}${esc(k.delta.text)}</span> <span class="db-kpi-p">vs ${esc(k.prev)}</span></dd>`
    + `<dd class="db-kpi-x">${visual}</dd>`;
}

export function netRows(v) {
  const maxShare = Math.max(...v.nets.map(x => x.share));
  return v.nets.map(x => `<tr data-net="${x.id}"${v.ch === x.id ? ' class="is-on"' : v.ch !== 'all' ? ' class="is-dim"' : ''}>`
    + `<th scope="row">${esc(x.name)}</th>`
    + `<td class="db-num db-net-sp"><span class="db-net-bar" aria-hidden="true"><span style="width:${(x.share / maxShare * 100).toFixed(1)}%"></span></span>${fmt.money(x.spend)}</td>`
    + `<td class="db-num">${fmt.pct0(x.share)}</td>`
    + `<td class="db-num db-w">${fmt.count(x.installs)}</td>`
    + `<td class="db-num">${fmt.usd2(x.cpi)}</td>`
    + `<td class="db-num">${fmt.pct(x.roas7)}</td>`
    + `<td class="db-num db-w">${fmt.pct(x.roas30)}</td></tr>`).join('');
}
export function netFoot(v) {
  const a = v.all;
  return `<tr><th scope="row">Total</th><td class="db-num">${fmt.money(a.spend)}</td><td class="db-num">100%</td><td class="db-num db-w">${fmt.count(a.installs)}</td><td class="db-num">${fmt.usd2(a.cpi)}</td><td class="db-num">${fmt.pct(a.roas[3])}</td><td class="db-num db-w">${fmt.pct(a.roas[4])}</td></tr>`;
}

const STATUS = { scale: 'Scale', test: 'Test', kill: 'Kill' };
const STATUS_ICON = {
  scale: '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M6 2.2 10 8.6H2z" fill="currentColor"/></svg>',
  test: '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="3.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 2.4a3.6 3.6 0 0 1 0 7.2z" fill="currentColor"/></svg>',
  kill: '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
export function creRows(v, sort = { key: 'spend', dir: 'desc' }) {
  const rows = [...v.cre.rows];
  const val = x => sort.key === 'hook' ? (x.hook ?? -1) : x[sort.key];
  rows.sort((p, q) => (sort.dir === 'asc' ? 1 : -1) * (val(p) - val(q)) || q.spend - p.spend);
  const tgt = GOAL.roas[3];
  const na = '<span class="db-na" title="Not measured for this format or network">—</span>';
  return rows.map(x => `<tr role="row" data-id="${x.id}">`
    + `<th scope="row" role="rowheader"><span class="db-cr"><span class="db-th db-th--${x.th}" aria-hidden="true"></span><span class="db-cr-t"><span class="db-cr-id">#${x.id}</span><span class="db-cr-n">${esc(x.name)}</span><span class="db-cr-f">${esc(x.fmt)}</span></span></span></th>`
    + `<td role="cell" class="db-fmt">${esc(x.fmt)}</td>`
    + `<td role="cell" class="db-num db-c-sp" data-label="Spend">${fmt.money(x.spend)}</td>`
    + `<td role="cell" class="db-num db-c-cp" data-label="CPI">${fmt.usd2(x.cpi)}</td>`
    + `<td role="cell" class="db-num db-c-ip" data-label="IPM">${fmt.ipm(x.ipm)}</td>`
    + `<td role="cell" class="db-num db-c-hk" data-label="Hook rate">${x.hook == null ? na : fmt.pct0(x.hook)}</td>`
    + `<td role="cell" class="db-num db-c-ro" data-label="D7 ROAS"><span class="db-roas-v">${fmt.pct(x.roas7)}</span><span class="db-bullet" aria-hidden="true"><span class="db-bullet-f${x.roas7 >= tgt ? ' is-hit' : ''}" style="width:${Math.min(100, x.roas7 / 0.5 * 100).toFixed(1)}%"></span><span class="db-bullet-t" style="left:${(tgt / 0.5 * 100).toFixed(1)}%"></span></span></td>`
    + `<td role="cell" class="db-c-st"><span class="db-st db-st--${x.status}">${STATUS_ICON[x.status]}${STATUS[x.status]}</span><span class="db-st-n">${esc(x.note)}</span></td></tr>`).join('');
}
export function creFoot(v) {
  const o = v.cre.other, t = v.cre.total;
  const hook = x => x.hook == null ? '<span class="db-na">—</span>' : fmt.pct0(x.hook);
  const cells = x => `<td role="cell" class="db-num db-c-sp" data-label="Spend">${fmt.money(x.spend)}</td><td role="cell" class="db-num db-c-cp" data-label="CPI">${fmt.usd2(x.cpi)}</td><td role="cell" class="db-num db-c-ip" data-label="IPM">${fmt.ipm(x.ipm)}</td><td role="cell" class="db-num db-c-hk" data-label="Hook rate">${hook(x)}</td><td role="cell" class="db-num db-c-ro" data-label="D7 ROAS">${fmt.pct(x.roas7)}</td><td role="cell" class="db-c-st"></td>`;
  return `<tr role="row" class="db-other"><th scope="row" role="rowheader"><span class="db-cr"><span class="db-th db-th--stack" aria-hidden="true"></span><span class="db-cr-t"><span class="db-cr-n">Other creatives</span><span class="db-cr-sub">${fmt.int(o.count)} more in this view</span></span></span></th><td role="cell" class="db-fmt">Mixed</td>${cells(o)}</tr>`
    + `<tr role="row" class="db-total"><th scope="row" role="rowheader">Total <span class="db-tot-n">${fmt.int(t.count)} creatives</span></th><td role="cell" class="db-fmt"></td>${cells(t)}</tr>`;
}

// screen-reader / crawler twins of the three charts
export function srDaily(v) {
  const dec = new Map(v.decisions.map(d => [d.i, d]));
  return v.days.map(d => `<tr><th scope="row">${fmtDay(d.i)}</th><td>${fmt.money(d.spend)}</td><td>${fmt.int(d.installs)}</td><td>${fmt.usd2(d.cpi)}</td><td>${dec.has(d.i) ? esc(dec.get(d.i).text) : ''}</td></tr>`).join('');
}
export function srLadder(v) {
  return ROAS_DAYS.map((d, k) => `<tr><th scope="row">D${d}</th><td>${fmt.pct(v.cur.roas[k])}</td><td>${fmt.pct(GOAL.roas[k])}</td></tr>`).join('')
    + `<tr><th scope="row">${fmt.day(v.cur.payback)} (projected)</th><td>100% (payback)</td><td>Payback by day ${GOAL.day}</td></tr>`;
}
export function srRetention(v) {
  return [1, 3, 7, 14, 30].map(t => `<tr><th scope="row">D${t}</th><td>${fmt.pct(v.ret[t - 1])}</td><td>${fmt.pct(v.bench[t - 1])}</td></tr>`).join('');
}
export function summary(v) {
  const c = v.cur;
  return `${v.range} days, ${v.chName.toLowerCase() === 'all networks' ? 'all networks' : v.chName}: spend ${fmt.money(c.spend)}, ${fmt.count(c.installs)} installs, CPI ${fmt.usd2(c.cpi)}, D7 ROAS ${fmt.pct(c.roas[3])}, D30 ROAS ${fmt.pct(c.roas[4])}, payback ${fmt.day(c.payback).toLowerCase()} projected.`;
}
export const goal = GOAL;

/* ================================ runtime ================================ */

const SIZES = {
  daily: w => (w < 480 ? 226 : 262),
  ladder: w => (w < 420 ? 232 : 250),
  ret: w => (w < 420 ? 214 : 250),
};
const INSTANCES = new WeakMap();

export function init(root) {
  if (root && !root.classList?.contains('db-root')) root = root.querySelector?.('.db-root');
  if (!root) return null;
  if (INSTANCES.has(root)) return INSTANCES.get(root);

  const $ = (sel, el = root) => el.querySelector(sel);
  const $$ = (sel, el = root) => [...el.querySelectorAll(sel)];
  const app = $('.db-app');
  const tip = $('.db-tip');
  const live = $('[data-db-live]');
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = mqReduce.matches;
  const state = { range: 30, ch: 'all', sort: { key: 'spend', dir: 'desc' } };
  let view = getView(state.range, state.ch);
  let visible = false, drawn = false, anim = 0, destroyed = false, lastPointer = 'mouse';
  const charts = {
    daily: { el: $('[data-db-chart="daily"]'), render: renderDaily, geo: null, idx: -1 },
    ladder: { el: $('[data-db-chart="ladder"]'), render: renderLadder, geo: null, idx: -1 },
    ret: { el: $('[data-db-chart="ret"]'), render: renderRetention, geo: null, idx: -1 },
  };
  const svgOf = c => c.el.querySelector('svg');

  function draw(name, v, o = {}) {
    const c = charts[name]; if (!c.el) return;
    const svg = svgOf(c), W = Math.max(240, Math.round(c.el.clientWidth || 600)), H = SIZES[name](W);
    const out = c.render(v, W, H, { idp: 'db-' + name, ...o });
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    c.el.style.height = H + 'px';
    svg.innerHTML = out.svg;
    c.geo = out.geo; c.W = W; c.H = H;
    if (c.idx >= 0) hover(name, c.idx, true);
  }
  const drawAll = (v, o) => { for (const n of Object.keys(charts)) draw(n, v, o); };
  function syncScroller() {
    const sc = $('.db-tw--x'); if (!sc) return;
    if (sc.scrollWidth > sc.clientWidth + 2) { sc.setAttribute('tabindex', '0'); sc.setAttribute('role', 'region'); sc.setAttribute('aria-label', 'Creative performance table, scrolls sideways'); }
    else { sc.removeAttribute('tabindex'); sc.removeAttribute('role'); sc.removeAttribute('aria-label'); }
  }

  function setText(sel, text) { const el = $(sel); if (el && el.textContent !== text) el.textContent = text; }
  function updateText(v, flash) {
    setText('[data-db-window]', fmtWindow(v));
    setText('[data-db-scope]', v.ch === 'all' ? 'All networks' : v.chName);
    $$('[data-db-per]').forEach(el => { el.textContent = `vs prev. ${v.range}D`; });
    const ks = kpis(v), sw = Math.max(60, Math.round($('.db-kpi-x')?.clientWidth || 120));
    ks.forEach(k => {
      const el = $(`[data-db-kpi="${k.key}"]`); if (!el) return;
      el.innerHTML = kpiInner(k, sw);
      if (flash && !reduced) { el.classList.remove('is-swap'); void el.offsetWidth; el.classList.add('is-swap'); }
    });
    const nb = $('[data-db-net-body]'); if (nb) nb.innerHTML = netRows(v);
    const nf = $('[data-db-net-foot]'); if (nf) nf.innerHTML = netFoot(v);
    renderCre(v);
    const sd = $('[data-db-sr="daily"]'); if (sd) sd.innerHTML = srDaily(v);
    const sl = $('[data-db-sr="ladder"]'); if (sl) sl.innerHTML = srLadder(v);
    const sr = $('[data-db-sr="ret"]'); if (sr) sr.innerHTML = srRetention(v);
    setText('[data-db-pay]', fmt.day(v.cur.payback).replace('Day', 'day'));
    setText('[data-db-hooknote]', v.cre.hookable ? 'Hook rate = 3-second views ÷ impressions on Meta, TikTok and YouTube.' : `Hook rate isn’t reported on ${v.chName}: full-screen in-app video has no feed scroll to stop.`);
  }
  function renderCre(v) {
    const b = $('[data-db-cre-body]'); if (b) b.innerHTML = creRows(v, state.sort);
    const f = $('[data-db-cre-foot]'); if (f) f.innerHTML = creFoot(v);
    $$('[data-db-sort]').forEach(btn => {
      const th = btn.closest('th'), on = btn.dataset.dbSort === state.sort.key;
      th.setAttribute('aria-sort', on ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
    });
  }

  // ---- animation: draw-in (grow) and morph (same range, new network) ----
  function stop() { if (anim) cancelAnimationFrame(anim); anim = 0; }
  function run(dur, frame, done) {
    stop();
    if (reduced || !visible) { frame(1); done && done(); return; }
    const t0 = performance.now();
    const step = now => {
      const t = Math.min(1, (now - t0) / dur);
      frame(t);
      if (t < 1) anim = requestAnimationFrame(step); else { anim = 0; done && done(); }
    };
    anim = requestAnimationFrame(step);
  }
  function growIn() { drawn = true; run(900, t => drawAll(view, { grow: t }), () => drawAll(view)); }
  function morph(from, to) {
    const ds = niceScale(Math.max(...to.days.map(d => d.spend)), 3), di = niceScale(Math.max(...to.days.map(d => d.installs)), 2);
    const fs = niceScale(Math.max(...from.days.map(d => d.spend)), 3), fi = niceScale(Math.max(...from.days.map(d => d.installs)), 2);
    const lerp = (p, q, t) => p + (q - p) * t;
    run(520, t => {
      const e = ease(t);
      const mix = {
        ...to,
        days: to.days.map((d, k) => ({ ...d, spend: lerp(from.days[k].spend, d.spend, e), installs: lerp(from.days[k].installs, d.installs, e) })),
        cur: { ...to.cur, roas: to.cur.roas.map((r, k) => lerp(from.cur.roas[k], r, e)), ret: to.cur.ret.map((r, k) => lerp(from.cur.ret[k], r, e)), payback: t < 0.5 ? from.cur.payback : to.cur.payback },
        ret: to.ret.map((r, k) => lerp(from.ret[k], r, e)),
      };
      draw('daily', mix, { sScale: ds, iScale: di, sMax: lerp(fs.max, ds.max, e), iMax: lerp(fi.max, di.max, e) });
      draw('ladder', mix);
      draw('ret', mix);
    }, () => drawAll(to));
  }

  function setState(next) {
    const prev = view;
    Object.assign(state, next);
    view = getView(state.range, state.ch);
    $$('[data-db-range]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.dbRange === state.range)));
    $$('[data-db-ch]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dbCh === state.ch)));
    hideTip();
    updateText(view, true);
    syncScroller();
    app.classList.toggle('is-filtered', state.ch !== 'all');
    if (!drawn) { drawAll(view, visible || reduced ? {} : { grow: 0 }); }
    else if (prev.range === view.range) morph(prev, view);
    else run(620, t => drawAll(view, { grow: 0.18 + 0.82 * t }), () => drawAll(view));
    if (live) live.textContent = 'Showing ' + summary(view);
  }

  // ---- tooltips ----
  function hideTip() {
    if (tip) { tip.hidden = true; tip.classList.remove('is-on'); }
    for (const c of Object.values(charts)) { c.idx = -1; const hv = c.el && svgOf(c).querySelector('.db-hover'); if (hv) hv.classList.remove('is-on'); }
  }
  function row(key, label, value) {
    const r = document.createElement('div'); r.className = 'db-tip-r';
    const i = document.createElement('i'); i.className = 'db-key db-key--' + (key || 'none'); r.append(i);
    const b = document.createElement('b'); b.textContent = value;
    const s = document.createElement('span'); s.textContent = label;
    r.append(b, s); return r;
  }
  function tipContent(name, k) {
    const v = view, out = [];
    const head = document.createElement('p'); head.className = 'db-tip-h';
    if (name === 'daily') {
      const d = v.days[k];
      head.textContent = fmtDayLong(d.i) + ' · install cohort';
      out.push(head, row('spend', 'Spend', fmt.money(d.spend)), row('users', 'Installs', fmt.int(d.installs)), row('', 'CPI', fmt.usd2(d.cpi)), row('', 'D7 ROAS', fmt.pct(d.roas7)));
      const dec = v.decisions.find(x => x.i === d.i);
      if (dec) { const p = document.createElement('p'); p.className = 'db-tip-dec db-tip-dec--' + dec.kind; p.textContent = KIND_LABEL[dec.kind] + ': ' + dec.text; out.push(p); }
    } else if (name === 'ladder') {
      const c = charts.ladder.geo.cats[k];
      if (c.proj) {
        head.textContent = 'Payback, projected';
        out.push(head, row('proj', 'Cohort ROAS reaches 100%', fmt.day(v.cur.payback)), row('', `Goal`, `Day ${GOAL.day}`));
        const p = document.createElement('p'); p.className = 'db-tip-note'; p.textContent = 'Damped power-law fit on D7 → D30 cohort ROAS.'; out.push(p);
      } else {
        head.textContent = `${c.lab} cohort ROAS`;
        const diff = (c.v - c.t) * 100;
        out.push(head, row('rung', 'Actual', fmt.pct(c.v)), row('target', 'Target', fmt.pct(c.t)), row('', diff >= 0 ? 'Above target' : 'Below target', (diff >= 0 ? '+' : '−') + Math.abs(diff).toFixed(1) + ' pts'),
          row('', 'Revenue so far', fmt.money(c.v * v.cur.spend)));
      }
    } else {
      const t = k + 1;
      head.textContent = `Day ${t} retention`;
      out.push(head, row('users', 'Stackopolis', fmt.pct(v.ret[k])), row('bench', 'Genre median', fmt.pct(v.bench[k])), row('', 'Players still active', fmt.int(v.ret[k] * v.cur.installs)));
    }
    return out;
  }
  function hover(name, k, quiet) {
    const c = charts[name], geo = c.geo; if (!geo) return;
    k = Math.max(0, Math.min(geo.n - 1, k));
    c.idx = k;
    const svg = svgOf(c), hv = svg.querySelector('.db-hover'); if (!hv) return;
    hv.classList.add('is-on');
    const x = geo.xc[k];
    if (name === 'daily') {
      const b = geo.bars[k], xh = hv.querySelector('.db-xh');
      xh.setAttribute('x1', r1(x) + 0.5); xh.setAttribute('x2', r1(x) + 0.5);
      hv.querySelector('.db-hl').setAttribute('d', barPath(b.x, b.y, b.w, b.h, Math.min(3, b.w / 2)));
      const p = geo.pts[k], d = hv.querySelector('.db-hd'); d.setAttribute('cx', r1(p[0])); d.setAttribute('cy', r1(p[1]));
    } else if (name === 'ladder') {
      const b = geo.bars[k];
      hv.querySelector('.db-hl').setAttribute('d', geo.cats[k].proj ? '' : barPath(b.x, b.y, b.w, b.h, 4));
      hv.querySelector('.db-hl').setAttribute('class', 'db-hl db-hl--rung db-hl--' + k);
    } else {
      const xh = hv.querySelector('.db-xh'); xh.setAttribute('x1', r1(x) + 0.5); xh.setAttribute('x2', r1(x) + 0.5);
      const p = geo.pts[k], bp = geo.bpts[k];
      const d = hv.querySelector('.db-hd--users'); d.setAttribute('cx', r1(p[0])); d.setAttribute('cy', r1(p[1]));
      const e = hv.querySelector('.db-hd--bench'); e.setAttribute('cx', r1(bp[0])); e.setAttribute('cy', r1(bp[1]));
    }
    if (quiet || !tip) return;
    tip.replaceChildren(...tipContent(name, k));
    tip.hidden = false;
    const ar = app.getBoundingClientRect(), er = c.el.getBoundingClientRect();
    const sx = er.width / c.W, sy = er.height / c.H;
    const px = er.left - ar.left + x * sx;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left, top;
    if (lastPointer === 'touch' || ar.width < 560) {
      // phones: dock above the plot (over the card header) so the finger and the data stay visible
      const card = c.el.closest('.db-card').getBoundingClientRect();
      const cl = card.left - ar.left, cr = card.right - ar.left;
      left = px > (cl + cr) / 2 ? cl + 8 : cr - tw - 8;
      top = card.top - ar.top + 8;
    } else if (name === 'ladder') {
      // early-day ROAS is always low, so the plot's upper-left corner is free space: anchor there
      left = er.left - ar.left + (geo.L + 10) * sx; top = er.top - ar.top + (geo.top + 6) * sy;
    } else {
      left = px + 16; if (left + tw > ar.width - 10) left = px - 16 - tw;
      top = er.top - ar.top + 6;
    }
    left = Math.max(10, Math.min(left, ar.width - tw - 10));
    top = Math.max(10, Math.min(top, ar.height - th - 10));
    tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    tip.classList.add('is-on');
  }
  function indexAt(name, clientX) {
    const c = charts[name], geo = c.geo; if (!geo) return -1;
    const er = c.el.getBoundingClientRect();
    const x = (clientX - er.left) * (c.W / er.width);
    let best = 0, bd = Infinity;
    geo.xc.forEach((cx, k) => { const dd = Math.abs(cx - x); if (dd < bd) { bd = dd; best = k; } });
    return best;
  }
  const announce = (name, k) => {
    if (!live) return;
    const parts = tipContent(name, k).map(el => el.classList.contains('db-tip-r') ? `${el.querySelector('span').textContent} ${el.querySelector('b').textContent}` : el.textContent);
    live.textContent = parts.join(', ');
  };

  const off = [];
  const on = (el, ev, fn, opt) => { if (!el) return; el.addEventListener(ev, fn, opt); off.push(() => el.removeEventListener(ev, fn, opt)); };

  for (const [name, c] of Object.entries(charts)) {
    if (!c.el) continue;
    on(c.el, 'pointermove', e => { lastPointer = e.pointerType; if (e.pointerType === 'touch' && !c.touching) return; hover(name, indexAt(name, e.clientX)); });
    on(c.el, 'pointerdown', e => { lastPointer = e.pointerType; if (e.pointerType === 'touch') { c.touching = true; hover(name, indexAt(name, e.clientX)); } });
    on(c.el, 'pointerup', () => { c.touching = false; });
    on(c.el, 'pointercancel', () => { c.touching = false; hideTip(); });
    on(c.el, 'pointerleave', e => { if (e.pointerType !== 'touch') hideTip(); });
    on(c.el, 'focus', () => { if (!c.geo) return; lastPointer = 'keyboard'; hover(name, c.idx >= 0 ? c.idx : name === 'daily' ? c.geo.n - 1 : name === 'ladder' ? 3 : 6); announce(name, c.idx); });
    on(c.el, 'blur', hideTip);
    on(c.el, 'keydown', e => {
      const n = c.geo?.n || 0; let k = c.idx;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') k++;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') k--;
      else if (e.key === 'Home') k = 0;
      else if (e.key === 'End') k = n - 1;
      else if (e.key === 'PageUp') k -= 7;
      else if (e.key === 'PageDown') k += 7;
      else if (e.key === 'Escape') { hideTip(); return; }
      else return;
      e.preventDefault();
      k = Math.max(0, Math.min(n - 1, k));
      hover(name, k); announce(name, k);
    });
  }
  on(document, 'pointerdown', e => { if (!e.target.closest || !e.target.closest('[data-db-chart]')) hideTip(); }, { passive: true });

  // ---- filters + sorting ----
  $$('[data-db-range]').forEach(b => on(b, 'click', () => { const r = +b.dataset.dbRange; if (r !== state.range && RANGES.includes(r)) setState({ range: r }); }));
  $$('[data-db-ch]').forEach(b => on(b, 'click', () => { const ch = b.dataset.dbCh; if (ch !== state.ch) setState({ ch }); }));
  $$('[data-db-sort]').forEach(b => on(b, 'click', () => {
    const key = b.dataset.dbSort;
    state.sort = state.sort.key === key ? { key, dir: state.sort.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' };
    renderCre(view);
    if (live) live.textContent = `Creatives sorted by ${b.textContent.trim()}, ${state.sort.dir === 'desc' ? 'highest' : 'lowest'} first.`;
  }));

  // ---- visibility (pause offscreen) + resize ----
  let io = null, ro = null, rz = 0;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (en.target === app) {
          const was = visible;
          visible = en.isIntersecting;
          root.classList.toggle('db-off', !visible);
          if (!visible && anim) { stop(); drawAll(view); }
          if (visible && !was && !drawn) { if (reduced) { drawn = true; drawAll(view); } else growIn(); }
          if (!visible) hideTip();
        }
      }
    }, { threshold: [0, 0.15] });
    io.observe(app);
  } else { visible = true; }
  if ('ResizeObserver' in window) {
    let lastW = 0;
    ro = new ResizeObserver(() => {
      const w = app.clientWidth; if (w === lastW) return; lastW = w;
      cancelAnimationFrame(rz);
      rz = requestAnimationFrame(() => { updateText(view, false); syncScroller(); if (!anim) drawAll(view, drawn || reduced ? {} : { grow: 0 }); });
    });
    ro.observe(app);
  }
  const onReduce = () => { reduced = mqReduce.matches; if (reduced) { stop(); drawn = true; drawAll(view); } };
  mqReduce.addEventListener?.('change', onReduce);
  off.push(() => mqReduce.removeEventListener?.('change', onReduce));

  // first paint: real-size charts; hold them at 0 until the module scrolls into view (unless reduced motion)
  root.classList.add('db-ready');
  updateText(view, false);
  syncScroller();
  if (reduced || !io) { drawn = true; drawAll(view); }
  else drawAll(view, { grow: 0 });

  const api = {
    update: next => setState(next),
    getState: () => ({ range: state.range, ch: state.ch }),
    destroy() {
      if (destroyed) return; destroyed = true;
      stop(); io?.disconnect(); ro?.disconnect(); off.forEach(f => f());
      root.classList.remove('db-ready', 'db-off'); INSTANCES.delete(root);
    },
  };
  INSTANCES.set(root, api);
  return api;
}
