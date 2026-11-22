/* PhyNik Quiz: timed tests in exam conditions (a whole past paper, or a test you build), with a full result report.
   One file, no build step. Loaded by teacher.js the first time the Quiz tab is opened. */
(function () {
'use strict';
if (window.AvantiQuiz) return;

const MAX_VIOL = 3;                         /* the 3rd violation submits the test */
const ACTIVE_KEY = 'phynik-quiz-active', HIST_KEY = 'phynik-quiz-history';
const KATEX = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js';
const MIN_PER_Q = 1.125;                    /* 45 minutes for 40 questions, like the real paper */
const MACROS = { '\\frac': '\\dfrac{#1}{#2}' };
const LV = ['L1', 'L2', 'L3'];
const VARIANT = { 1: 'Core multiple choice', 2: 'Extended multiple choice', 3: 'Core theory', 4: 'Extended theory' };

/* ---------- small helpers ---------- */
const $ = (s, r) => (r || document).querySelector(s);
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in (props || {})) {
    const v = props[k]; if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v; /* fixed icon strings only */
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
    else if (k === 'checked' || k === 'value' || k === 'disabled') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(Infinity).forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); });
  return e;
}
const svgIc = d => '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };
const pad = n => String(n).padStart(2, '0');
function clock(ms) { const s = Math.max(0, Math.round(ms / 1000)), hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60; return hh ? hh + ':' + pad(mm) + ':' + pad(ss) : pad(mm) + ':' + pad(ss); }
function dur(ms) { const s = Math.round(ms / 1000), m = Math.floor(s / 60); return m ? m + ' min ' + pad(s % 60) + ' s' : s + ' s'; }
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const MON = { 'F/M': 2, 'M/J': 5, 'O/N': 10 };
function paperRank(code, year) {
  const m = /^\w+\/(\d+)\/([A-Z])\/([A-Z])\/(\d\d)$/.exec(code);
  if (!m) return (year || 0) * 1e6;
  return (year || 2000 + +m[4]) * 1e6 + (MON[m[2] + '/' + m[3]] || 0) * 1e3 + (+m[1] || 0);
}
const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
async function enterFs() {
  const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!rq) return false;
  try { await rq.call(el, { navigationUI: 'hide' }); } catch (e) { /* refused */ }
  return isFs();
}
function exitFs() { try { if (isFs()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* ignore */ } }

/* ---------- data ---------- */
let DP = null, D = null, FIGP = null, KP = null, FGS = {};
function getJson(u) {
  let t = 0;
  const go = () => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); }).catch(e => { if (++t > 2) throw e; return new Promise(r => setTimeout(r, 700 * t)).then(go); });
  return go();
}
function loadData() {
  if (DP) return DP;
  return (DP = Promise.all([getJson('qb/data/pyq.json'), getJson('qb/data/chapters.json')]).then(([raw, chs]) => {
    const chMap = {}; chs.forEach(c => { chMap[c.chapter_code] = { code: c.chapter_code, name: c.chapter, order: c.order, classes: c.classes || [] }; });
    /* only multiple-choice questions with a key can be marked automatically */
    const qs = raw.filter(q => q.type === 'MCQ' && /^[A-D]$/.test(q.answer) && Array.isArray(q.options) && q.options.length >= 2)
      .sort((a, b) => ((chMap[a.chapter_code] || { order: 99 }).order - (chMap[b.chapter_code] || { order: 99 }).order) || (b.year - a.year) || (a.qno - b.qno));
    const byId = {}; qs.forEach(q => { byId[q.id] = q; });
    const papers = {}; qs.forEach(q => { (papers[q.paper] = papers[q.paper] || []).push(q); });
    const plist = Object.keys(papers).map(code => ({ code, qs: papers[code].slice().sort((a, b) => a.qno - b.qno) })).sort((a, b) => paperRank(b.code, b.qs[0].year) - paperRank(a.code, a.qs[0].year) || b.code.localeCompare(a.code));
    return (D = { qs, byId, chMap, papers: plist });
  }).catch(e => { DP = null; throw e; }));
}
function figs() { return window.__getFigs ? window.__getFigs() : (FIGP || (FIGP = getJson('qb/data/figures.json').catch(e => { FIGP = null; throw e; }))); }
function katexReady() {
  if (window.katex) return Promise.resolve();
  if (!KP) KP = (window.AvantiBoot && window.AvantiBoot.loadScript ? window.AvantiBoot.loadScript(KATEX) : Promise.reject(new Error('no loader'))).then(() => { if (!window.katex) throw new Error('katex'); }).catch(e => { KP = null; throw e; });
  if (!document.getElementById('kcss')) fetch('katex.css').then(r => r.text()).then(css => { if (!document.getElementById('kcss')) { const st = h('style'); st.id = 'kcss'; st.textContent = css; document.head.append(st); } }).catch(() => {});
  return KP;
}
/* everything a set of questions needs on screen: the maths library and, if any question has a diagram, the pictures */
async function prep(qs) {
  await katexReady();
  const need = qs.some(q => /\{\{figure\}\}/.test(q.question));
  if (need) FGS = await figs();
  return FGS;
}

/* ---------- drawing a question ---------- */
function mathNode(tex, display) {
  const s = h('span', { class: 'qz-m' });
  if (window.katex) { try { window.katex.render(tex, s, { throwOnError: false, displayMode: !!display, macros: MACROS }); return s; } catch (e) { /* fall through */ } }
  s.textContent = tex; return s;
}
function inline(parent, text) {
  const re = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g; let last = 0, m;
  while ((m = re.exec(text))) { if (m.index > last) parent.append(text.slice(last, m.index)); parent.append(mathNode(m[1] != null ? m[1] : m[2], m[2] != null)); last = re.lastIndex; }
  if (last < text.length) parent.append(text.slice(last));
  return parent;
}
function figImg(f) {
  return h('img', { class: 'qz-fig', alt: 'Diagram for this question', draggable: 'false', width: Math.round(f.w * 1.25), height: Math.round(f.h * 1.25), src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(f.svg) });
}
function stemNode(q, fg) {
  const box = h('div', { class: 'qz-stem' });
  String(q.question).split('\n').forEach(line => {
    const t = line.trim(); if (!t) return;
    if (t === '{{figure}}') { const f = fg && fg[q.id]; if (f && f.svg) box.append(figImg(f)); return; }
    const tm = /^\{\{tbl:([\s\S]*)\}\}$/.exec(t);
    if (tm) {
      const tb = h('table', { class: 'qz-tbl' });
      tm[1].split('\x1e').forEach((r, ri) => { const tr = h('tr'); r.split('\x1f').forEach(c => tr.append(inline(h(ri ? 'td' : 'th'), c))); tb.append(tr); });
      box.append(h('div', { class: 'qz-tblwrap' }, tb)); return;
    }
    box.append(inline(h('p', { class: 'qz-line' }), line));
  });
  return box;
}
const optText = o => inline(h('span', { class: 'qz-ot' }), String(o));

/* ---------- styles ---------- */
function css() {
  if (document.getElementById('qz-css')) return;
  const st = h('style'); st.id = 'qz-css';
  st.textContent = `
.qz{max-width:1040px;margin:0 auto;padding:22px clamp(12px,3vw,24px) 40px;color:var(--body)}
.qz h2,.qz h3,.qz-res h2,.qz-res h3,.qz-pal h3,.qz-md h3{font-family:var(--font-head)}
.qz h2{font-size:clamp(1.5rem,3.4vw,2rem);margin:0 0 4px;color:var(--head)}.qz h3{margin:0 0 6px;color:var(--head)}
.qz-sub{margin:0 0 20px;color:var(--muted)}
.qz-blocks{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px}
.qz-block{display:flex;flex-direction:column;gap:8px;text-align:left;padding:24px;border:1px solid var(--rule);border-radius:var(--r,14px);background:var(--panel);color:inherit;font:inherit;cursor:pointer;box-shadow:var(--shadow);transition:transform .15s,border-color .15s}
.qz-block:hover,.qz-block:focus-visible{transform:translateY(-2px);border-color:var(--accent);outline:none}
.qz-block .qz-ic{display:grid;place-items:center;width:52px;height:52px;border-radius:14px;background:var(--accent-soft);color:var(--accent)}
.qz-block b{font-family:var(--font-head);font-size:1.25rem;color:var(--head)}.qz-block span.d{color:var(--muted);line-height:1.45}.qz-block .go{margin-top:auto;color:var(--accent);font-weight:600}
.qz-back{display:inline-flex;align-items:center;gap:6px;margin:0 0 14px;padding:6px 12px;border:1px solid var(--rule);border-radius:999px;background:var(--panel);color:var(--body);font:inherit;cursor:pointer}
.qz-back:hover{border-color:var(--accent)}
.qz-papers{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:12px}
.qz-paper{display:flex;flex-direction:column;gap:4px;text-align:left;padding:16px;border:1px solid var(--rule);border-radius:12px;background:var(--panel);color:inherit;font:inherit;cursor:pointer}
.qz-paper:hover,.qz-paper:focus-visible{border-color:var(--accent);outline:none;box-shadow:var(--shadow)}
.qz-paper b{font-size:1.05rem;color:var(--head)}.qz-paper .s{color:var(--muted);font-size:.9rem}.qz-paper .mx{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.qz-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:.78rem;font-weight:600;background:var(--accent-soft);color:var(--accent)}
.qz-pill.L1,.qz-pill.ok{background:#e1f6ea;color:#17794a}.qz-pill.L2{background:#fdf0d8;color:#9a6208}.qz-pill.L3,.qz-pill.bad{background:#fde6dd;color:#b4471d}.qz-pill.skip{background:var(--field);color:var(--muted)}
.qz-card{padding:18px;border:1px solid var(--rule);border-radius:var(--r,14px);background:var(--panel);box-shadow:var(--shadow-sm,none);margin:0 0 14px}
.qz-fld{margin:0 0 16px}.qz-fld>label,.qz-fld>.l{display:block;margin:0 0 6px;font-weight:600;color:var(--head)}
.qz-chips{display:flex;flex-wrap:wrap;gap:8px}
.qz-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border:1px solid var(--rule);border-radius:999px;background:var(--field);color:var(--body);font:inherit;font-size:.92rem;cursor:pointer}
.qz-chip[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}.qz-chip:disabled{opacity:.4;cursor:not-allowed}
.qz-chip .cn{opacity:.7;font-size:.8rem}
.qz-chlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:6px 12px;max-height:280px;overflow:auto;padding:10px;border:1px solid var(--rule);border-radius:10px;background:var(--field)}
.qz-chlist label{display:flex;align-items:center;gap:8px;font-weight:400;cursor:pointer}.qz-chlist label.off{opacity:.4;cursor:not-allowed}.qz-chlist .cn{margin-left:auto;color:var(--muted);font-size:.85rem}
.qz-link{border:0;background:none;color:var(--accent);font:inherit;font-weight:600;cursor:pointer;padding:2px 6px}
.qz-num{width:92px;padding:8px 10px;border:1px solid var(--rule);border-radius:8px;background:var(--field);color:var(--ink);font:inherit}
.qz-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px}.qz-hint{color:var(--muted);font-size:.9rem}
.qz-btn{padding:11px 20px;border:1px solid var(--rule);border-radius:10px;background:var(--panel);color:var(--body);font:inherit;font-weight:600;cursor:pointer}
.qz-btn:hover:not(:disabled){border-color:var(--accent)}.qz-btn:disabled{opacity:.45;cursor:not-allowed}
.qz-btn.pri{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}.qz-btn.warn{background:var(--bad);border-color:var(--bad);color:#fff}
.qz-sum{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 16px}.qz-sum>div{flex:1 1 130px;padding:12px 14px;border:1px solid var(--rule);border-radius:12px;background:var(--panel)}.qz-sum b{display:block;font-size:1.4rem;color:var(--head)}.qz-sum span{color:var(--muted);font-size:.85rem}
.qz-rules{margin:0 0 14px;padding-left:20px;line-height:1.55}.qz-rules li{margin:0 0 6px}.qz-rules b{color:var(--head)}
.qz-note{padding:10px 14px;border-radius:10px;background:var(--accent-soft);color:var(--body);margin:0 0 14px}.qz-note.bad{background:#fde6dd;color:#7a2c0e}
.qz-agree{display:flex;align-items:center;gap:10px;margin:14px 0;font-weight:600;color:var(--head);cursor:pointer}
.qz-hist{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:10px 14px;border:1px solid var(--rule);border-radius:10px;background:var(--panel);margin:0 0 8px}.qz-hist b{color:var(--head)}.qz-hist .sp{flex:1}
.qz-m .katex{font-size:1.06em}.qz-fig{display:block;max-width:100%;height:auto;margin:10px 0;background:#fff;border:1px solid var(--rule);border-radius:6px;padding:6px}
.qz-tblwrap{overflow:auto;margin:8px 0}.qz-tbl{border-collapse:collapse}.qz-tbl th,.qz-tbl td{border:1px solid var(--rule);padding:6px 12px;text-align:left}.qz-tbl th{background:var(--field)}
.qz-line{margin:0 0 8px;line-height:1.6}
/* ---- the test itself: covers the whole screen ---- */
html.qz-lock,html.qz-lock body{overflow:hidden!important}
.qz-run,.qz-res{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;background:var(--bg);color:var(--body);font-family:var(--font-body)}
.qz-run,.qz-run *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.qz-bar{display:flex;align-items:center;gap:12px;padding:10px 16px;background:var(--navy,#0c3d3b);color:#fff}
.qz-bar .t{min-width:0;flex:1}.qz-bar .t b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qz-bar .t span{font-size:.85rem;opacity:.8}
.qz-timer{font:700 1.5rem/1 var(--font-body);font-variant-numeric:tabular-nums;padding:8px 14px;border-radius:10px;background:rgba(255,255,255,.12)}
.qz-timer.low{background:#b4471d}.qz-timer.crit{background:#c62828;animation:qzp 1s infinite}
@keyframes qzp{50%{opacity:.6}}
.qz-vbadge{padding:6px 10px;border-radius:8px;background:rgba(255,255,255,.12);font-size:.85rem;white-space:nowrap}.qz-vbadge.on{background:#c62828}
.qz-bar .qz-btn{padding:8px 14px}.qz-bar .qz-btn.pri{background:var(--gold,#f2b134);border-color:var(--gold,#f2b134);color:#0c3d3b}
.qz-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 270px}
.qz-q{overflow:auto;padding:20px clamp(14px,3vw,40px) 30px}.qz-qh{display:flex;align-items:center;gap:10px;margin:0 0 14px}.qz-qh b{font-size:1.1rem;color:var(--head)}
.qz-stem{font-size:1.06rem;margin:0 0 16px}
.qz-opts{display:grid;gap:10px;max-width:760px}
.qz-opt{display:flex;align-items:center;gap:12px;padding:13px 15px;border:2px solid var(--rule);border-radius:12px;background:var(--panel);cursor:pointer;line-height:1.45}
.qz-opt:hover{border-color:var(--accent)}.qz-opt.on{border-color:var(--accent);background:var(--accent-soft)}
.qz-opt input{position:absolute;opacity:0;pointer-events:none}.qz-opt:focus-within{outline:3px solid var(--accent);outline-offset:2px}
.qz-let{flex:0 0 30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:700;background:var(--field);border:1px solid var(--rule);color:var(--head)}
.qz-opt.on .qz-let{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.qz-pal{overflow:auto;padding:14px;border-left:1px solid var(--rule);background:var(--panel)}.qz-pal h3{font-size:1rem}
.qz-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin:10px 0 14px}
.qz-pb{position:relative;aspect-ratio:1;border:1px solid var(--rule);border-radius:9px;background:var(--field);color:var(--body);font:inherit;font-weight:600;cursor:pointer}
.qz-pb.vis{border-color:var(--bad);color:var(--bad)}.qz-pb.ans{background:var(--ok);border-color:var(--ok);color:#fff}
.qz-pb.mk::after{content:"";position:absolute;top:3px;right:3px;width:9px;height:9px;border-radius:50%;background:var(--gold,#f2b134);border:1px solid #0006}
.qz-pb.cur{outline:3px solid var(--accent);outline-offset:1px}
.qz-leg{display:grid;gap:5px;font-size:.82rem;color:var(--muted)}.qz-leg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px;border:1px solid var(--rule)}
.qz-nav{display:flex;flex-wrap:wrap;gap:8px;padding:10px 16px;border-top:1px solid var(--rule);background:var(--panel)}.qz-nav .sp{flex:1}
.qz-palbtn{display:none}
@media(max-width:760px){
  .qz-body{grid-template-columns:minmax(0,1fr)}
  .qz-pal{position:absolute;left:0;right:0;bottom:0;max-height:62%;z-index:3;border-left:0;border-top:2px solid var(--accent);box-shadow:0 -10px 30px rgba(0,0,0,.3);transform:translateY(105%);transition:transform .2s;visibility:hidden}
  .qz-pal.open{transform:none;visibility:visible}.qz-palbtn{display:inline-block}
  .qz-bar{flex-wrap:wrap;gap:6px 8px;padding:8px 12px}.qz-bar .t{flex:1 1 100%;order:-1}.qz-bar .t b{font-size:.85rem}.qz-bar .t span{display:none}
  .qz-timer{font-size:1.1rem;padding:6px 10px}.qz-vbadge{font-size:.75rem;padding:5px 8px}.qz-bar .qz-btn{padding:6px 10px;font-size:.82rem}
  .qz-bar .qz-btn.pri{margin-left:auto}.qz-q{padding-top:14px}
  .qz-nav{flex-wrap:nowrap;gap:6px;padding:8px 10px}.qz-nav .qz-btn{flex:1 1 0;min-width:0;padding:10px 4px;font-size:.8rem;line-height:1.15}.qz-nav .sp{display:none}
}
.qz-mb{position:absolute;inset:0;z-index:10;display:grid;place-items:center;padding:16px;background:rgba(5,20,19,.78)}
.qz-md{width:min(520px,100%);max-height:100%;overflow:auto;padding:22px;border-radius:16px;background:var(--panel);color:var(--body);box-shadow:0 20px 60px rgba(0,0,0,.5)}
.qz-md h3{margin:0 0 8px;font-size:1.25rem}.qz-md.warn{border-top:6px solid #c62828}.qz-md .qz-row{margin-top:16px;justify-content:flex-end}
.qz-toast{position:absolute;left:50%;bottom:76px;transform:translateX(-50%);z-index:11;max-width:90%;padding:10px 16px;border-radius:10px;background:#0c3d3b;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.qz-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
/* ---- result report ---- */
.qz-wait .qz-big{display:block;font:700 clamp(2.4rem,9vw,3.6rem)/1.1 var(--font-body);font-variant-numeric:tabular-nums;color:var(--head)}
.qz-res{overflow:auto;display:block}.qz-res .qz-in{max-width:1040px;margin:0 auto;padding:22px clamp(12px,3vw,24px) 60px}
.qz-rh{display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px;margin:0 0 16px}.qz-rh .t{flex:1 1 280px}.qz-rh h2{margin:0}
.qz-hero{display:flex;flex-wrap:wrap;align-items:center;gap:24px;padding:20px;border:1px solid var(--rule);border-radius:var(--r,14px);background:var(--panel);margin:0 0 14px}
.qz-ring{--p:0;--c:var(--ok);width:150px;height:150px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--c) calc(var(--p)*1%),var(--rule) 0)}
.qz-ring>div{width:118px;height:118px;border-radius:50%;background:var(--panel);display:grid;place-items:center;text-align:center;line-height:1.1}.qz-ring b{font-size:1.9rem;color:var(--head)}.qz-ring span{font-size:.85rem;color:var(--muted)}
.qz-stats{flex:1 1 320px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}.qz-stats>div{padding:10px 12px;border:1px solid var(--rule);border-radius:10px;background:var(--field)}.qz-stats b{display:block;font-size:1.25rem;color:var(--head)}.qz-stats span{font-size:.82rem;color:var(--muted)}
.qz-stats .ok b{color:var(--ok)}.qz-stats .bad b{color:var(--bad)}
.qz-res h3{margin:22px 0 8px;font-size:1.15rem}
.qz-tab{width:100%;border-collapse:collapse;font-size:.92rem}.qz-tab th,.qz-tab td{padding:8px 10px;border-bottom:1px solid var(--rule);text-align:right}.qz-tab th:first-child,.qz-tab td:first-child{text-align:left}.qz-tab th{color:var(--muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}
.qz-bars{display:inline-block;width:90px;height:8px;border-radius:99px;background:var(--rule);overflow:hidden;vertical-align:middle}.qz-bars i{display:block;height:100%;background:var(--ok)}
.qz-tabwrap{overflow:auto;border:1px solid var(--rule);border-radius:12px;background:var(--panel)}
.qz-agrid{display:flex;flex-wrap:wrap;gap:6px}.qz-agrid a{display:grid;place-items:center;width:38px;height:38px;border-radius:9px;font-weight:600;text-decoration:none;color:#fff;background:var(--muted)}.qz-agrid a.ok{background:var(--ok)}.qz-agrid a.bad{background:var(--bad)}
.qz-tc{display:flex;align-items:flex-end;gap:3px;height:130px;padding:8px 8px 0;border:1px solid var(--rule);border-radius:12px;background:var(--panel)}.qz-tc div{flex:1;min-width:4px;border-radius:3px 3px 0 0;background:var(--muted)}.qz-tc div.ok{background:var(--ok)}.qz-tc div.bad{background:var(--bad)}
.qz-tcl{display:flex;gap:3px;padding:2px 8px;font-size:.7rem;color:var(--muted)}.qz-tcl span{flex:1;min-width:4px;text-align:center;overflow:visible;white-space:nowrap}
.qz-rv{padding:16px;border:1px solid var(--rule);border-left-width:6px;border-radius:12px;background:var(--panel);margin:0 0 12px}.qz-rv.ok{border-left-color:var(--ok)}.qz-rv.bad{border-left-color:var(--bad)}.qz-rv.skip{border-left-color:var(--muted)}
.qz-rvh{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px}.qz-rvh b{color:var(--head)}.qz-rvh .sp{flex:1}.qz-rvh small{color:var(--muted)}
.qz-ro{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--rule);border-radius:10px;margin:0 0 6px;background:var(--field)}
.qz-ro.right{border-color:var(--ok);background:#e1f6ea;color:#0e4a2c}.qz-ro.wrong{border-color:var(--bad);background:#fde6dd;color:#6c2a0f}
.qz-ro .qz-let{width:26px;height:26px;flex-basis:26px}.qz-ro .tag{margin-left:auto;font-size:.8rem;font-weight:700;white-space:nowrap}
.qz-ans{margin:10px 0 0;font-size:.95rem}
@media print{
  #app,.qz-run,.qz-noprint,.qz-toast{display:none!important}
  html.qz-lock,html.qz-lock body{overflow:visible!important}
  .qz-res{position:static!important;inset:auto!important;overflow:visible!important;background:#fff!important;color:#000!important;display:block!important}
  .qz-rv{break-inside:avoid}
}`;
  document.head.append(st);
}

/* ---------- screens inside the Quiz tab ---------- */
const S = { root: null, run: null };
const show = (...kids) => { S.root.replaceChildren(h('section', { class: 'qz' }, kids)); window.scrollTo({ top: 0 }); };
const backBtn = (text, fn) => h('button', { type: 'button', class: 'qz-back', onclick: fn }, '← ' + text);

function mount(root) {
  S.root = root; css();
  if (S.run) return;
  root.replaceChildren(h('p', { class: 'hint qz', text: 'Loading…' }));
  loadData().then(() => {
    const a = lsGet(ACTIVE_KEY);
    if (a && a.ids) return resumeScreen(a);
    home();
  }, () => {
    root.replaceChildren(h('div', { class: 'qz' }, h('p', { class: 'qz-note bad', role: 'alert', text: 'The questions could not load. Check your connection and try again.' }),
      h('button', { type: 'button', class: 'qz-btn pri', onclick: () => mount(root), text: 'Try again' })));
  });
}

function block(icon, title, desc, go, meta) {
  return h('button', { type: 'button', class: 'qz-block', onclick: go },
    h('span', { class: 'qz-ic', html: icon }), h('b', { text: title }), h('span', { class: 'd', text: desc }), meta ? h('span', { class: 'qz-hint', text: meta }) : null, h('span', { class: 'go', text: 'Choose →' }));
}
function home() {
  const hist = (lsGet(HIST_KEY) || []).slice(0, 5);
  show(h('h2', { text: 'Quiz' }), h('p', { class: 'qz-sub', text: 'Take a timed test in exam conditions, then see a full report. Choose how you want to practise.' }),
    h('div', { class: 'qz-blocks' },
      block(svgIc('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>'), 'Paper Wise', 'Sit one complete past paper, with exactly the questions of that exam.', paperList, plural(D.papers.length, 'paper') + ' to choose from'),
      block(svgIc('<path d="M4 6h16M4 12h10M4 18h6"/><circle cx="18" cy="16" r="3"/><path d="M20.5 18.5L22 20"/>'), 'Create Your Own', 'Pick the time, the number of questions, the chapters, the level and more.', customForm, plural(D.qs.length, 'question') + ' in the bank')),
    hist.length ? h('div', null, h('h3', { text: 'Your recent tests', style: 'margin-top:26px' }), hist.map(a => h('div', { class: 'qz-hist' },
      h('b', { text: a.title }), h('span', { class: 'qz-hint', text: new Date(a.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }),
      Date.now() < a.endsAt ? h('span', { class: 'qz-pill', text: 'Result at ' + clockTime(a.endsAt) }) : h('span', { class: 'qz-pill ' + (a.summary && a.summary.pct >= 50 ? 'ok' : 'bad'), text: a.summary ? a.summary.score + '/' + a.summary.total + ' · ' + Math.round(a.summary.pct) + '%' : '' }),
      h('span', { class: 'sp' }), h('button', { type: 'button', class: 'qz-btn', onclick: () => showResult(a, { fresh: false }), text: 'View report' })))) : null);
}

function paperLabel(code, qs) {
  const m = /^\w+\/(\d+)\//.exec(code), v = m ? VARIANT[m[1][0]] : '';
  return { title: code, line: (qs[0].session || '') + ' ' + qs[0].year, sub: (m ? 'Paper ' + m[1] : '') + (v ? ' · ' + v : '') };
}
function minutesFor(n) { return Math.max(5, Math.min(300, Math.round(n * MIN_PER_Q))); }
function paperList() {
  show(backBtn('Quiz', home), h('h2', { text: 'Paper Wise' }), h('p', { class: 'qz-sub', text: 'Choose the paper you want to sit. The newest exams come first.' }),
    h('div', { class: 'qz-papers' }, D.papers.map(p => {
      const l = paperLabel(p.code, p.qs), c = { L1: 0, L2: 0, L3: 0 }; p.qs.forEach(q => { c[q.difficulty]++; });
      return h('button', { type: 'button', class: 'qz-paper', onclick: () => instructions({ mode: 'paper', title: p.code, subtitle: l.line + ' · ' + l.sub, qs: p.qs, minutes: minutesFor(p.qs.length), back: paperList }) },
        h('b', { text: l.title }), h('span', { class: 's', text: l.line }), h('span', { class: 's', text: l.sub }),
        h('span', { class: 'mx' }, h('span', { class: 'qz-pill', text: plural(p.qs.length, 'question') }), h('span', { class: 'qz-pill', text: minutesFor(p.qs.length) + ' min' })));
    })));
}

/* ---------- Create Your Own ---------- */
function customForm() {
  const F = S.form || (S.form = { src: new Set(), cls: new Set(), year: new Set(), sess: new Set(), type: new Set(), lvl: new Set(), ch: new Set(), n: 20, min: null, minAuto: true, shuffle: true });
  const val = { src: q => q.source || 'PYQ', cls: q => String(q.class), year: q => String(q.year), sess: q => q.session, type: q => q.type, lvl: q => q.difficulty, ch: q => q.chapter_code };
  const match = (q, skip) => Object.keys(val).every(g => g === skip || !F[g].size || F[g].has(val[g](q)));
  const uniq = (g, sort) => [...new Set(D.qs.map(val[g]))].sort(sort);
  const SESS = ['Feb/Mar', 'May/June', 'Oct/Nov'];
  const groups = [
    ['src', 'Source', uniq('src').map(v => [v, v === 'PYQ' ? 'PYQ (past papers)' : v])],
    ['cls', 'Class', uniq('cls').map(v => [v, v])],
    ['type', 'Question type', uniq('type').map(v => [v, v === 'MCQ' ? 'MCQ (multiple choice)' : v])],
    ['year', 'Year', uniq('year', (a, b) => b - a).map(v => [v, v])],
    ['sess', 'Session', uniq('sess', (a, b) => SESS.indexOf(a) - SESS.indexOf(b)).map(v => [v, v])],
    ['lvl', 'Question level', LV.filter(v => D.qs.some(q => q.difficulty === v)).map(v => [v, v + (v === 'L1' ? ' (easy)' : v === 'L2' ? ' (medium)' : ' (hard)')])]];
  const chips = {};   /* group -> [{v, btn, cn}] */
  const fld = (label, body, hint) => h('div', { class: 'qz-fld' }, h('span', { class: 'l', text: label }), body, hint ? h('p', { class: 'qz-hint', text: hint }) : null);
  const grpEls = groups.map(([g, label, opts]) => {
    chips[g] = opts.map(([v, t]) => {
      const cn = h('span', { class: 'cn' }), btn = h('button', { type: 'button', class: 'qz-chip', 'aria-pressed': 'false', onclick: () => { F[g].has(v) ? F[g].delete(v) : F[g].add(v); refresh(); } }, t, cn);
      return { v, btn, cn };
    });
    return fld(label, h('div', { class: 'qz-chips' }, chips[g].map(c => c.btn)), 'Pick none to include all.');
  });
  /* chapters */
  const chItems = Object.values(D.chMap).filter(c => D.qs.some(q => q.chapter_code === c.code)).sort((a, b) => a.order - b.order).map(c => {
    const cb = h('input', { type: 'checkbox', onchange: () => { cb.checked ? F.ch.add(c.code) : F.ch.delete(c.code); refresh(); } }), cn = h('span', { class: 'cn' });
    return { c, cb, cn, lab: h('label', null, cb, h('span', { text: c.code + '  ' + c.name }), cn) };
  });
  const nIn = h('input', { type: 'number', class: 'qz-num', min: '1', 'aria-label': 'Number of questions', oninput: () => { F.n = Math.max(0, Math.floor(+nIn.value || 0)); refresh(true); }, onchange: () => refresh() });
  const mIn = h('input', { type: 'number', class: 'qz-num', min: '1', max: '300', 'aria-label': 'Time in minutes', oninput: () => { F.min = Math.max(0, Math.floor(+mIn.value || 0)); F.minAuto = false; refresh(true); }, onchange: () => { F.min = Math.min(300, Math.max(1, F.min || 1)); refresh(); } });
  const poolEl = h('p', { class: 'qz-note', role: 'status' }), sugEl = h('span', { class: 'qz-hint' });
  const nChips = h('div', { class: 'qz-chips' }), mChips = h('div', { class: 'qz-chips' });
  [10, 20, 30, 40].forEach(n => nChips.append(h('button', { type: 'button', class: 'qz-chip', onclick: () => { F.n = n; refresh(); } }, String(n))));
  const allBtn = h('button', { type: 'button', class: 'qz-chip' }); nChips.append(allBtn);
  [15, 30, 45, 60, 90].forEach(m => mChips.append(h('button', { type: 'button', class: 'qz-chip', onclick: () => { F.min = m; F.minAuto = false; refresh(); } }, m + ' min')));
  const shuf = h('input', { type: 'checkbox', checked: true, onchange: () => { F.shuffle = shuf.checked; } });
  const start = h('button', { type: 'button', class: 'qz-btn pri', text: 'Continue to instructions', onclick: () => { const t = build(); if (t) instructions(t); } });
  const pool = () => D.qs.filter(q => match(q));
  function refresh(typing) {
    groups.forEach(([g]) => chips[g].forEach(c => { const k = D.qs.filter(q => match(q, g) && val[g](q) === c.v).length; c.cn.textContent = k; c.btn.setAttribute('aria-pressed', String(F[g].has(c.v))); c.btn.disabled = !k && !F[g].has(c.v); }));
    chItems.forEach(i => { const k = D.qs.filter(q => match(q, 'ch') && q.chapter_code === i.c.code).length; i.cn.textContent = k; i.cb.checked = F.ch.has(i.c.code); i.cb.disabled = !k && !F.ch.has(i.c.code); i.lab.className = i.cb.disabled ? 'off' : ''; });
    const total = pool().length;
    if (F.n > total) F.n = total; if (!typing && !F.n && total) F.n = Math.min(20, total);
    if (F.minAuto) F.min = minutesFor(F.n || 1);
    if (!typing || document.activeElement !== nIn) nIn.value = F.n || '';
    if (!typing || document.activeElement !== mIn) mIn.value = F.min || '';
    nIn.max = String(total);
    allBtn.textContent = 'All ' + total; allBtn.onclick = () => { F.n = total; refresh(); };
    nChips.querySelectorAll('.qz-chip').forEach(b => { const n = +b.textContent; if (n) b.disabled = n > total; });
    mChips.querySelectorAll('.qz-chip').forEach(b => { b.setAttribute('aria-pressed', String(F.min === parseInt(b.textContent, 10))); });
    nChips.querySelectorAll('.qz-chip').forEach(b => { const n = b.textContent.startsWith('All') ? total : +b.textContent; b.setAttribute('aria-pressed', String(!!n && F.n === n)); });
    poolEl.textContent = total ? plural(total, 'question') + ' match your choices.' : 'No question matches these choices. Remove a filter.';
    sugEl.textContent = 'Suggested: ' + minutesFor(F.n || 1) + ' min for ' + plural(F.n || 1, 'question') + '.';
    start.disabled = !total || !F.n || !F.min || F.min < 1;
  }
  function describe() {
    const bits = [];
    ['cls', 'type', 'lvl'].forEach(g => { if (F[g].size) bits.push([...F[g]].join(', ')); });
    if (F.year.size) bits.push([...F.year].sort().join(', ')); if (F.sess.size) bits.push([...F.sess].join(', '));
    if (F.ch.size) bits.push(F.ch.size <= 3 ? [...F.ch].map(c => D.chMap[c].name).join(', ') : plural(F.ch.size, 'chapter'));
    return bits.length ? bits.join(' · ') : 'All questions';
  }
  function build() {
    const p = pool(); if (!p.length || !F.n || !F.min) return null;
    const picked = F.shuffle ? shuffle(p).slice(0, F.n) : p.slice(0, F.n);
    return { mode: 'custom', title: 'Custom test', subtitle: describe(), qs: picked, minutes: F.min, back: customForm };
  }
  show(backBtn('Quiz', home), h('h2', { text: 'Create Your Own' }), h('p', { class: 'qz-sub', text: 'Tell us what you want to practise. You will see the instructions before the test starts.' }),
    h('div', { class: 'qz-card' }, grpEls),
    h('div', { class: 'qz-card' }, fld('Chapters', [h('div', { class: 'qz-row', style: 'margin:-2px 0 6px' }, h('button', { type: 'button', class: 'qz-link', onclick: () => { chItems.forEach(i => { if (!i.cb.disabled) F.ch.add(i.c.code); }); refresh(); } }, 'Select all'), h('button', { type: 'button', class: 'qz-link', onclick: () => { F.ch.clear(); refresh(); } }, 'Clear')), h('div', { class: 'qz-chlist' }, chItems.map(i => i.lab))], 'Pick none to include every chapter.')),
    h('div', { class: 'qz-card' }, fld('Number of questions', [h('div', { class: 'qz-row' }, nIn, nChips)]), fld('Time allowed (minutes)', [h('div', { class: 'qz-row' }, mIn, mChips), sugEl]),
      h('label', { class: 'qz-row', style: 'cursor:pointer' }, shuf, h('span', { text: 'Mix the questions in random order' }))),
    poolEl, h('div', { class: 'qz-row' }, start));
  refresh();
}

/* ---------- instructions ---------- */
function instructions(test) {
  const n = test.qs.length, agree = h('input', { type: 'checkbox', onchange: sync });
  const status = h('p', { class: 'qz-hint', role: 'status', text: 'Getting the questions ready…' });
  const start = h('button', { type: 'button', class: 'qz-btn pri', disabled: true, text: 'Start test', onclick: e => { if (S.starting) return; e.currentTarget.disabled = true; begin(test).then(() => { if (!S.run) sync(); }); } });
  const retry = h('button', { type: 'button', class: 'qz-btn', hidden: true, text: 'Try again', onclick: ready });
  let ok = false;
  function sync() { start.disabled = !(ok && agree.checked); }
  function ready() {
    ok = false; retry.hidden = true; status.className = 'qz-hint'; status.textContent = 'Getting the questions ready…'; sync();
    prep(test.qs).then(() => { ok = true; status.textContent = 'Ready.'; sync(); }, () => { status.className = 'qz-note bad'; status.textContent = 'The maths or diagrams could not load. Check your connection and try again.'; retry.hidden = false; });
  }
  const fsOk = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  show(backBtn('Back', test.back || home), h('h2', { text: test.title }), h('p', { class: 'qz-sub', text: test.subtitle }),
    h('div', { class: 'qz-sum' }, [[n, 'Questions'], [test.minutes + ' min', 'Time allowed'], [n + ' marks', '1 mark each'], ['None', 'Negative marking']].map(([b, s]) => h('div', null, h('b', { text: b }), h('span', { text: s })))),
    h('div', { class: 'qz-card' }, h('h3', { text: 'Instructions' }), h('ol', { class: 'qz-rules' },
      h('li', null, h('b', { text: 'Full screen. ' }), 'The test opens in full screen. Do not leave it, switch to another tab, window or app, or minimise the browser.'),
      h('li', null, h('b', { text: 'Violations. ' }), 'Every attempt to leave the test is recorded. You get ' + (MAX_VIOL - 1) + ' warnings. The ' + (MAX_VIOL === 3 ? '3rd' : MAX_VIOL + 'th') + ' violation submits your test automatically.'),
      h('li', null, h('b', { text: 'Timer. ' }), 'The ' + test.minutes + '-minute timer cannot be paused. The test is submitted automatically when time is up.'),
      h('li', null, h('b', { text: 'Disabled during the test. ' }), 'Right-click, copy, paste, select, print, screenshot and developer-tool keys, and the Back button.'),
      h('li', null, h('b', { text: 'Refreshing. ' }), 'If you refresh or close the page, you can resume from the Quiz tab, but it is recorded as a violation and the timer keeps running.'),
      h('li', null, h('b', { text: 'Answering. ' }), 'Pick one option per question. You can change an answer, clear it, mark a question for review, and move freely between questions with the question palette.'),
      h('li', null, h('b', { text: 'Marking. ' }), 'Each correct answer gets 1 mark. Wrong or unanswered questions get 0. There is no negative marking.'),
      h('li', null, h('b', { text: 'Result. ' }), 'Press Submit when you are done. To keep the answers from being shared with students who are still taking the test, your score, report and the correct answers stay hidden until the full ' + test.minutes + ' minutes of the test are over (if you finish early you wait for the rest of the time). Then you see your score, a chapter-wise and level-wise breakdown, time spent on each question, your violations, and every question with the correct answer.')),
      fsOk ? null : h('p', { class: 'qz-note', text: 'Full screen is not available in this browser or view. The test still runs, with every other protection switched on.' })),
    status, h('div', { class: 'qz-row' }, retry),
    h('label', { class: 'qz-agree' }, agree, h('span', { text: 'I have read and understood the instructions.' })),
    h('div', { class: 'qz-row' }, start, h('button', { type: 'button', class: 'qz-btn', onclick: test.back || home, text: 'Cancel' })));
  ready();
}

/* ---------- the running test ---------- */
async function begin(test) {
  if (S.starting || S.run) return; S.starting = true;     /* a double click must not start two tests */
  try { await begin2(test); } finally { S.starting = false; }
}
async function begin2(test) {
  const fs = await enterFs();    /* first thing, while the click still counts as a user action */
  const now = Date.now();
  const A = { v: 1, id: 'a' + now.toString(36), mode: test.mode, title: test.title, subtitle: test.subtitle, ids: test.qs.map(q => q.id), minutes: test.minutes,
    startedAt: now, endsAt: now + test.minutes * 60000, answers: {}, marked: {}, visited: {}, times: {}, cur: 0, violations: [], fs };
  lsSet(ACTIVE_KEY, A);
  run(A, false);
}
function closeGate() { if (S.gate) { S.gate.remove(); S.gate = null; } }
/* a test that is still open (the page was refreshed or closed) covers the whole site: the other tabs and their answers cannot be used until it is resumed or submitted */
function resumeScreen(A) {
  const left = A.endsAt - Date.now();
  if (left <= 0) { finishExpired(A); return; }
  if (S.gate) return;
  const have = new Set(A.ids.filter(id => D.byId[id])), ans = Object.keys(A.answers).filter(id => have.has(id)).length;
  let busy = false;
  const resume = h('button', { type: 'button', class: 'qz-btn pri', text: 'Resume test', onclick: async () => {
    if (busy) return; busy = true; resume.disabled = true;
    try { await prep(D.qs.filter(q => have.has(q.id))); } catch (e) { /* shown as raw text */ }
    A.fs = await enterFs(); closeGate(); run(A, true); } });
  const gate = S.gate = h('div', { class: 'qz-res qz-gate', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Test in progress' }, h('div', { class: 'qz-in' },
    h('h2', { text: 'You have a test in progress' }), h('p', { class: 'qz-sub', text: A.title + ' \u00b7 ' + A.subtitle }),
    h('div', { class: 'qz-sum' }, [[clock(left), 'Time left'], [ans + ' / ' + have.size, 'Answered'], [A.violations.length + ' / ' + MAX_VIOL, 'Violations so far']].map(([b, t]) => h('div', null, h('b', { text: b }), h('span', { text: t })))),
    h('p', { class: 'qz-note bad', text: 'The timer has been running since you left. Resuming counts as a violation. The test is submitted automatically if you reach ' + MAX_VIOL + '. The rest of the site stays locked until you resume or submit.' }),
    h('div', { class: 'qz-row' }, resume, h('button', { type: 'button', class: 'qz-btn', text: 'Submit now', onclick: () => { if (busy) return; busy = true; closeGate(); finishExpired(A, 'manual'); } }))));
  document.body.append(gate); document.documentElement.classList.add('qz-lock'); const app = $('#app'); if (app) app.inert = true;
  resume.focus();
}
function finishExpired(A, reason) {
  A.reason = reason || 'time'; A.endedAt = reason === 'manual' ? Date.now() : A.endsAt; lsDel(ACTIVE_KEY); saveHistory(A);
  prep(A.ids.map(i => D.byId[i]).filter(Boolean)).catch(() => ({})).then(() => showResult(A, { fresh: true }));
}

function run(A, resumed) {
  const qs = A.ids.map(id => D.byId[id]).filter(Boolean);
  if (!qs.length) { lsDel(ACTIVE_KEY); home(); return; }
  A.ids = qs.map(q => q.id);
  const R = S.run = { A, qs, el: null, timer: 0, done: false, lastV: 0, qStart: 0, off: [], fsFail: 0, said: {}, modal: null, tt: 0, lastSave: 0 };
  const el = R.el = h('div', { class: 'qz-run', role: 'application', 'aria-label': 'Test in progress' });
  const timer = h('div', { class: 'qz-timer', 'aria-hidden': 'true' }), live = h('div', { class: 'qz-sr', role: 'status', 'aria-live': 'polite' });
  const vbadge = h('span', { class: 'qz-vbadge' });
  const head = h('b'), qEl = h('main', { class: 'qz-q', tabindex: '-1' }), pal = h('aside', { class: 'qz-pal', 'aria-label': 'Question palette' });
  const prev = h('button', { type: 'button', class: 'qz-btn', text: 'Previous', onclick: () => go(A.cur - 1) });
  const next = h('button', { type: 'button', class: 'qz-btn pri', text: 'Next', onclick: () => { A.cur < qs.length - 1 ? go(A.cur + 1) : confirmSubmit(); } });
  const markB = h('button', { type: 'button', class: 'qz-btn', onclick: toggleMark });
  const clearB = h('button', { type: 'button', class: 'qz-btn', text: 'Clear response', onclick: clear });
  const grid = h('div', { class: 'qz-grid' }), pbs = qs.map((q, i) => h('button', { type: 'button', class: 'qz-pb', text: String(i + 1), onclick: () => { go(i); pal.classList.remove('open'); } }));
  grid.append(...pbs);
  pal.append(h('h3', { text: 'Questions' }), grid, h('div', { class: 'qz-leg' },
    h('span', null, h('i', { style: 'background:var(--ok);border-color:var(--ok)' }), 'Answered'), h('span', null, h('i', { style: 'border-color:var(--bad)' }), 'Seen, not answered'), h('span', null, h('i' ), 'Not seen yet'), h('span', null, h('i', { style: 'background:var(--gold,#f2b134)' }), 'Marked for review')));
  el.append(
    h('header', { class: 'qz-bar' }, h('div', { class: 't' }, h('b', { text: A.title }), h('span', { text: A.subtitle })), timer, vbadge,
      h('button', { type: 'button', class: 'qz-btn qz-palbtn', text: 'Questions', onclick: () => pal.classList.toggle('open') }),
      h('button', { type: 'button', class: 'qz-btn pri', text: 'Submit test', onclick: confirmSubmit })),
    h('div', { class: 'qz-body' }, qEl, pal),
    h('footer', { class: 'qz-nav' }, prev, markB, clearB, h('span', { class: 'sp' }), next), live);
  document.body.append(el); document.documentElement.classList.add('qz-lock'); const app = $('#app'); if (app) app.inert = true;

  /* --- bookkeeping --- */
  const persist = () => lsSet(ACTIVE_KEY, A);
  function flushTime() { const now = Date.now(); if (R.qStart && qs[A.cur]) { const id = qs[A.cur].id; A.times[id] = (A.times[id] || 0) + (now - R.qStart); } R.qStart = document.hidden ? 0 : now; }
  function toast(t) { clearTimeout(R.tt); const old = $('.qz-toast', el); if (old) old.remove(); el.append(h('div', { class: 'qz-toast', role: 'status', text: t })); R.tt = setTimeout(() => { const x = $('.qz-toast', el); if (x) x.remove(); }, 3500); }
  function paint() {
    const q = qs[A.cur];
    pbs.forEach((b, i) => { const id = qs[i].id; b.className = 'qz-pb' + (A.answers[id] ? ' ans' : A.visited[id] ? ' vis' : '') + (A.marked[id] ? ' mk' : '') + (i === A.cur ? ' cur' : ''); b.setAttribute('aria-label', 'Question ' + (i + 1) + (A.answers[id] ? ', answered' : A.visited[id] ? ', not answered' : ', not seen') + (A.marked[id] ? ', marked for review' : '')); });
    markB.textContent = A.marked[q.id] ? 'Unmark review' : 'Mark for review';
    prev.disabled = A.cur === 0; next.textContent = A.cur === qs.length - 1 ? 'Finish' : 'Next';
    vbadge.textContent = 'Violations ' + A.violations.length + '/' + MAX_VIOL; vbadge.className = 'qz-vbadge' + (A.violations.length ? ' on' : '');
  }
  function go(i) {
    if (i < 0 || i >= qs.length) return;
    flushTime(); A.cur = i; const q = qs[i]; A.visited[q.id] = 1;
    head.textContent = 'Question ' + (i + 1) + ' of ' + qs.length;
    const opts = h('div', { class: 'qz-opts', role: 'radiogroup', 'aria-label': 'Options' });
    q.options.forEach((o, k) => { const L = 'ABCD'[k]; const inp = h('input', { type: 'radio', name: 'qzopt', value: L, checked: A.answers[q.id] === L, onchange: () => setAns(L) }); opts.append(h('label', { class: 'qz-opt' + (A.answers[q.id] === L ? ' on' : ''), 'data-l': L }, inp, h('span', { class: 'qz-let', text: L }), optText(o))); });
    qEl.replaceChildren(h('div', { class: 'qz-qh' }, head), stemNode(q, FGS), opts);
    qEl.scrollTop = 0; paint(); persist();
  }
  function setAns(L) { const id = qs[A.cur].id; A.answers[id] = L; qEl.querySelectorAll('.qz-opt').forEach(o => o.classList.toggle('on', o.dataset.l === L)); paint(); persist(); }
  function clear() { const id = qs[A.cur].id; delete A.answers[id]; qEl.querySelectorAll('.qz-opt').forEach(o => { o.classList.remove('on'); o.querySelector('input').checked = false; }); paint(); persist(); }
  function toggleMark() { const id = qs[A.cur].id; if (A.marked[id]) delete A.marked[id]; else A.marked[id] = 1; paint(); persist(); }

  /* --- modal boxes (never the browser's own pop-ups: they would leave full screen) --- */
  function closeModal() { if (R.modal) { R.modal.remove(); R.modal = null; } }
  function modal(kind, title, body, buttons) {
    closeModal();
    const m = R.modal = h('div', { class: 'qz-mb' }, h('div', { class: 'qz-md ' + kind, role: 'alertdialog', 'aria-modal': 'true', 'aria-label': title },
      h('h3', { text: title }), body, h('div', { class: 'qz-row' }, buttons)));
    el.append(m); const b = $('button.pri,button.warn', m) || $('button', m); if (b) b.focus();
  }
  function needFs() { return A.fs && !isFs(); }
  async function okWarn() {
    if (needFs()) {
      const ok = await enterFs();
      if (!ok && ++R.fsFail < 3) { toast('Press the button again to return to full screen.'); return; }
      if (!ok) { A.fs = false; persist(); toast('Full screen could not be restored. Every other protection stays on.'); }
    }
    closeModal(); qEl.focus();
  }
  function warn(text) {
    const n = A.violations.length, last = n === MAX_VIOL - 1;
    modal('warn', 'Warning ' + n + ' of ' + (MAX_VIOL - 1), h('div', null, h('p', { text: text + '.' }), h('p', { class: 'qz-hint', text: 'Stay on this screen. ' + (last ? 'One more violation will submit your test automatically.' : 'The next violation is your final warning.') }), h('p', { class: 'qz-hint', text: 'The timer is still running.' })),
      [h('button', { type: 'button', class: 'qz-btn warn', text: needFs() ? 'Return to full screen' : 'Continue test', onclick: okWarn })]);
  }
  function fsPrompt() {
    modal('warn', 'Return to full screen', h('div', null, h('p', { text: 'The test must stay in full screen.' }), h('p', { class: 'qz-hint', text: 'The timer is still running.' })),
      [h('button', { type: 'button', class: 'qz-btn warn', text: 'Return to full screen', onclick: okWarn })]);
  }
  function violation(kind, text) {
    if (R.done || R.leaving) return;
    const now = Date.now(); if (now - R.lastV < 1000) { if (needFs() && !R.modal) fsPrompt(); return; }
    R.lastV = now; flushTime();
    A.violations.push({ at: now, kind, text }); persist(); paint();
    if (A.violations.length >= MAX_VIOL) { submit('violations'); return; }
    warn(text);
  }
  function summaryRows() { const a = Object.keys(A.answers).filter(id => qs.some(q => q.id === id)).length; const mk = Object.keys(A.marked).length; return [[a, 'Answered'], [qs.length - a, 'Not answered'], [mk, 'Marked for review'], [clock(A.endsAt - Date.now()), 'Time left']]; }
  function confirmSubmit() {
    modal('', 'Submit your test?', h('div', null, h('div', { class: 'qz-sum' }, summaryRows().map(([b, s]) => h('div', null, h('b', { text: String(b) }), h('span', { text: s })))), h('p', { class: 'qz-hint', text: 'You cannot change your answers after submitting.' })),
      [h('button', { type: 'button', class: 'qz-btn', text: 'Go back to test', onclick: () => { closeModal(); qEl.focus(); } }), h('button', { type: 'button', class: 'qz-btn pri', text: 'Submit now', onclick: () => submit('manual') })]);
  }

  /* --- finishing --- */
  function submit(reason) {
    if (R.done) return; R.done = true;
    flushTime(); clearInterval(R.timer); R.off.forEach(f => f()); R.off = []; closeModal();
    A.reason = reason; A.endedAt = reason === 'time' ? A.endsAt : Date.now();
    exitFs(); lsDel(ACTIVE_KEY); saveHistory(A);
    el.remove(); S.run = null; showResult(A, { fresh: true });
  }

  /* --- the protections --- */
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); R.off.push(() => t.removeEventListener(ev, fn, o)); };
  const stop = e => { e.preventDefault(); };
  on(document, 'visibilitychange', () => { if (document.hidden) { flushTime(); R.qStart = 0; violation('hidden', 'You switched to another tab or app, or minimised the browser'); } else { R.qStart = Date.now(); if (needFs() && !R.modal) fsPrompt(); } });
  on(window, 'blur', () => { setTimeout(() => { if (!R.done && !document.hasFocus() && !document.hidden) violation('focus', 'The test window lost focus (you switched to another window or program)'); }, 80); });
  const fsc = () => { if (R.done) return; if (needFs()) violation('fullscreen', 'You exited full screen'); };
  on(document, 'fullscreenchange', fsc); on(document, 'webkitfullscreenchange', fsc);
  ['contextmenu', 'copy', 'cut', 'paste', 'dragstart', 'selectstart', 'drop'].forEach(ev => on(document, ev, stop, true));
  on(document, 'keydown', e => {
    const k = e.key, c = e.ctrlKey || e.metaKey;
    if (k === 'F12' || /^F([1-9]|1[0-2])$/.test(k) || k === 'ContextMenu' || k === 'PrintScreen' || (c && k.length === 1) || (e.altKey && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'Home'))) { e.preventDefault(); e.stopPropagation(); if (k === 'PrintScreen') { try { navigator.clipboard.writeText(' '); } catch (x) { /* ignore */ } violation('screenshot', 'The screenshot key was pressed'); } return; }
    if (R.modal || e.altKey || e.shiftKey && k.length > 1) return;
    if (k === 'ArrowRight') { e.preventDefault(); go(A.cur + 1); } else if (k === 'ArrowLeft') { e.preventDefault(); go(A.cur - 1); }
    else if (/^[a-dA-D1-4]$/.test(k) && !c) { const L = /\d/.test(k) ? 'ABCD'[+k - 1] : k.toUpperCase(); const inp = $('.qz-opt[data-l="' + L + '"] input', qEl); if (inp) { inp.checked = true; setAns(L); } }
    else if (k === 'm' || k === 'M') toggleMark();
  }, true);
  on(document, 'keyup', e => { if (e.key === 'PrintScreen') { try { navigator.clipboard.writeText(' '); } catch (x) { /* ignore */ } violation('screenshot', 'The screenshot key was pressed'); } }, true);
  /* leaving the page (refresh or close) makes the browser report the page as hidden: that must not count as a second violation on top of the one recorded when the test is resumed */
  on(window, 'beforeunload', e => { R.leaving = true; clearTimeout(R.lt); R.lt = setTimeout(() => { R.leaving = false; }, 1200); e.preventDefault(); e.returnValue = ''; return ''; });
  on(window, 'pagehide', () => { R.leaving = true; });
  /* choosing "Stay" on the leave-page prompt gives the window its focus back: from then on everything counts again */
  on(window, 'focus', () => { R.leaving = false; }); on(document, 'pointerdown', () => { R.leaving = false; }, true);
  try { history.pushState({ qz: 1 }, '', location.href); } catch (e) { /* ignore */ }
  on(window, 'popstate', () => { try { history.pushState({ qz: 1 }, '', location.href); } catch (e) { /* ignore */ } toast('The Back button is switched off during the test.'); });

  /* --- the clock: always worked out from the end time, so it cannot be slowed down --- */
  function tick() {
    const left = A.endsAt - Date.now();
    if (left <= 0) { timer.textContent = '00:00'; submit('time'); return; }
    timer.textContent = clock(left); timer.className = 'qz-timer' + (left < 60000 ? ' crit' : left < 300000 ? ' low' : '');
    [[600000, '10 minutes'], [300000, '5 minutes'], [60000, '1 minute']].forEach(([t, w]) => { if (left <= t && !R.said[t] && A.minutes * 60000 > t) { R.said[t] = 1; live.textContent = w + ' left'; if (t <= 300000) toast(w + ' left'); } });
    if (Date.now() - R.lastSave > 5000) { R.lastSave = Date.now(); flushTime(); persist(); }
  }
  R.timer = setInterval(tick, 250);
  const known = new Set(qs.map(q => q.id));
  ['answers', 'marked', 'visited', 'times'].forEach(k => { A[k] = A[k] || {}; Object.keys(A[k]).forEach(id => { if (!known.has(id)) delete A[k][id]; }); });
  go(Math.min(A.cur || 0, qs.length - 1)); tick();
  R.qStart = document.hidden ? 0 : Date.now();
  if (resumed) violation('reload', 'The page was reloaded or closed during the test');
  else if (!A.fs) toast('Full screen is not available here. Every other protection is on.');
  qEl.focus();
}

/* ---------- before the report: the answers are held back until the full time of the test is over ---------- */
const clockTime = ms => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
function showWait(A, qs) {
  const old = $('.qz-res'); if (old) old.remove();
  const ids = new Set(qs.map(q => q.id)), answered = Object.keys(A.answers).filter(id => ids.has(id)).length, marked = Object.keys(A.marked || {}).filter(id => ids.has(id)).length;
  const used = Math.max(0, Math.min(A.endedAt || A.endsAt, A.endsAt) - A.startedAt);
  const el = h('div', { class: 'qz-res qz-wait', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Test submitted' });
  const cd = h('b', { class: 'qz-big', 'aria-hidden': 'true' });
  let iv = 0;
  const close = () => { clearInterval(iv); el.remove(); document.documentElement.classList.remove('qz-lock'); const app = $('#app'); if (app) app.inert = false; if (S.root && S.root.isConnected) home(); };
  const tick = () => { const left = A.endsAt - Date.now(); if (left <= 0) { clearInterval(iv); showResult(A, { fresh: false }); return; } cd.textContent = clock(left); };
  const stat = (b, t) => h('div', null, h('b', { text: String(b) }), h('span', { text: t }));
  const why = A.reason === 'violations' ? 'The test was submitted automatically after ' + MAX_VIOL + ' violations.' : A.reason === 'time' ? 'Time was up, so the test was submitted automatically.' : '';
  el.append(h('div', { class: 'qz-in' },
    h('div', { class: 'qz-rh' }, h('div', { class: 't' }, h('h2', { text: 'Test submitted' }), h('p', { class: 'qz-sub', style: 'margin:2px 0 0', text: A.title + ' \u00b7 ' + A.subtitle }))),
    why ? h('p', { class: 'qz-note bad', text: why }) : null,
    h('div', { class: 'qz-hero', style: 'justify-content:center;text-align:center;flex-direction:column;gap:6px' },
      h('p', { class: 'qz-hint', style: 'margin:0', text: 'Your answers are saved. Your score, report and the correct answers open in' }), cd,
      h('p', { class: 'qz-hint', style: 'margin:0', text: 'at ' + clockTime(A.endsAt) + ', when the full ' + A.minutes + ' minutes of this test are over.' })),
    h('p', { class: 'qz-note', text: 'The answers are held back so that nobody who finishes early can show them to students who are still taking the test.' }),
    h('div', { class: 'qz-stats' }, stat(answered + ' / ' + qs.length, 'Answered'), stat(qs.length - answered, 'Not answered'), stat(marked, 'Marked for review'), stat(dur(used), 'Time used of ' + A.minutes + ' min'), stat(A.violations.length + ' / ' + MAX_VIOL, 'Violations')),
    h('div', { class: 'qz-row', style: 'margin-top:18px' }, h('button', { type: 'button', class: 'qz-btn pri', onclick: close, text: 'Back to Quiz' }), h('span', { class: 'qz-hint', text: 'You can open the report from \u201cYour recent tests\u201d once it unlocks.' }))));
  document.body.append(el); document.documentElement.classList.add('qz-lock'); const app = $('#app'); if (app) app.inert = true;
  tick(); iv = setInterval(tick, 1000);
  const hd = $('h2', el); hd.setAttribute('tabindex', '-1'); hd.focus();
}

/* ---------- the result report ---------- */
function saveHistory(A) {
  const qs = A.ids.map(i => D.byId[i]).filter(Boolean), g = grade(A, qs);
  A.summary = { score: g.correct, total: g.total, pct: g.pct };
  const list = (lsGet(HIST_KEY) || []).filter(x => x.id !== A.id); list.unshift(A);
  while (list.length && !lsSet(HIST_KEY, list.slice(0, 10))) list.pop();
}
function grade(A, qs) {
  const rows = qs.map((q, i) => { const ch = A.answers[q.id] || null; return { i, q, ch, st: !ch ? 'skip' : ch === q.answer ? 'ok' : 'bad', ms: (A.times || {})[q.id] || 0, marked: !!(A.marked || {})[q.id] }; });
  const c = rows.filter(r => r.st === 'ok').length, w = rows.filter(r => r.st === 'bad').length, s = rows.length - c - w;
  const group = (key, name, order) => { const m = {}; rows.forEach(r => { const k = key(r.q), o = m[k] || (m[k] = { k, name: name(r.q), total: 0, ok: 0, bad: 0, skip: 0, ms: 0 }); o.total++; o[r.st]++; o.ms += r.ms; }); return Object.values(m).sort(order); };
  return { rows, total: rows.length, correct: c, wrong: w, skipped: s, attempted: c + w, pct: rows.length ? c / rows.length * 100 : 0, accuracy: c + w ? c / (c + w) * 100 : 0,
    byCh: group(q => q.chapter_code, q => q.chapter_code + '  ' + q.chapter, (a, b) => ((D.chMap[a.k] || { order: 99 }).order) - ((D.chMap[b.k] || { order: 99 }).order)),
    byLv: group(q => q.difficulty, q => q.difficulty + (q.difficulty === 'L1' ? ' (easy)' : q.difficulty === 'L2' ? ' (medium)' : ' (hard)'), (a, b) => a.k.localeCompare(b.k)) };
}
const VNAME = { hidden: 'Left the page', focus: 'Window lost focus', fullscreen: 'Exited full screen', screenshot: 'Screenshot key', reload: 'Page reloaded or closed' };
async function showResult(A, o) {
  css();
  const qs = A.ids.map(i => D.byId[i]).filter(Boolean);
  if (Date.now() < A.endsAt) { showWait(A, qs); return; }     /* answers stay hidden until the whole test time is over */
  let fg = {}; try { fg = await prep(qs); } catch (e) { /* diagrams missing */ }
  const g = grade(A, qs), usedMs = Math.max(0, Math.min((A.endedAt || A.endsAt), A.endsAt) - A.startedAt);
  const old = $('.qz-res'); if (old) old.remove();
  const el = h('div', { class: 'qz-res', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Test result' });
  const stat = (b, s, c) => h('div', { class: c || '' }, h('b', { text: String(b) }), h('span', { text: s }));
  const band = g.pct >= 80 ? 'Excellent' : g.pct >= 60 ? 'Good' : g.pct >= 40 ? 'Keep practising' : 'Needs more practice';
  const close = () => { el.remove(); document.documentElement.classList.remove('qz-lock'); const app = $('#app'); if (app) app.inert = false; if (S.root && S.root.isConnected) home(); };
  const tbl = (rows, first) => h('div', { class: 'qz-tabwrap' }, h('table', { class: 'qz-tab' }, h('thead', null, h('tr', null, [first, 'Questions', 'Correct', 'Wrong', 'Skipped', 'Score', 'Avg time'].map(t => h('th', { text: t })))),
    h('tbody', null, rows.map(r => { const p = r.total ? r.ok / r.total * 100 : 0; return h('tr', null, h('td', { text: r.name }), h('td', { text: r.total }), h('td', { text: r.ok }), h('td', { text: r.bad }), h('td', { text: r.skip }), h('td', null, Math.round(p) + '% ', h('span', { class: 'qz-bars' }, h('i', { style: 'width:' + p + '%' }))), h('td', { text: r.total ? dur(r.ms / r.total) : '-' })); }))));
  const maxMs = Math.max(1, ...g.rows.map(r => r.ms)), avgAll = g.rows.length ? g.rows.reduce((s, r) => s + r.ms, 0) / g.rows.length : 0;
  const weak = g.byCh.filter(r => r.total && r.ok / r.total < 0.5);
  const reasonNote = A.reason === 'time' ? 'Time was up, so the test was submitted automatically.' : A.reason === 'violations' ? 'The test was submitted automatically after ' + MAX_VIOL + ' violations.' : '';
  const review = g.rows.map(r => h('section', { class: 'qz-rv ' + r.st, id: 'rv' + r.i, 'data-st': r.st, 'data-mk': r.marked ? '1' : '' },
    h('div', { class: 'qz-rvh' }, h('b', { text: 'Q' + (r.i + 1) }), h('small', { text: r.q.id }), h('span', { class: 'qz-pill ' + r.q.difficulty, text: r.q.difficulty }), h('span', { class: 'qz-pill', text: r.q.chapter_code + ' ' + r.q.chapter }),
      r.marked ? h('span', { class: 'qz-pill', text: 'Marked' }) : null, h('span', { class: 'sp' }), h('span', { class: 'qz-pill ' + r.st, text: r.st === 'ok' ? 'Correct' : r.st === 'bad' ? 'Wrong' : 'Not answered' }), h('small', { text: dur(r.ms) })),
    stemNode(r.q, fg),
    r.q.options.map((o, k) => { const L = 'ABCD'[k], right = L === r.q.answer, mine = L === r.ch; return h('div', { class: 'qz-ro' + (right ? ' right' : mine ? ' wrong' : '') }, h('span', { class: 'qz-let', text: L }), optText(o), right || mine ? h('span', { class: 'tag', text: right && mine ? '✓ Your answer · correct' : right ? '✓ Correct answer' : '✗ Your answer' }) : null); }),
    h('p', { class: 'qz-ans', text: r.ch ? 'Your answer: ' + r.ch + '   ·   Correct answer: ' + r.q.answer : 'You did not answer this question.   Correct answer: ' + r.q.answer })));
  const filt = h('div', { class: 'qz-chips qz-noprint', style: 'margin:0 0 12px' });
  [['all', 'All'], ['ok', 'Correct'], ['bad', 'Wrong'], ['skip', 'Not answered'], ['mk', 'Marked']].forEach(([k, t], i) => filt.append(h('button', { type: 'button', class: 'qz-chip', 'aria-pressed': String(i === 0), onclick: e => {
    filt.querySelectorAll('.qz-chip').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
    review.forEach(s => { s.hidden = !(k === 'all' || (k === 'mk' ? s.dataset.mk : s.dataset.st === k)); }); } }, t)));
  el.append(h('div', { class: 'qz-in' },
    h('div', { class: 'qz-rh' }, h('div', { class: 't' }, h('h2', { text: 'Test result' }), h('p', { class: 'qz-sub', style: 'margin:2px 0 0', text: A.title + ' · ' + A.subtitle + ' · ' + new Date(A.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) })),
      h('div', { class: 'qz-row qz-noprint' }, h('button', { type: 'button', class: 'qz-btn', onclick: () => window.print(), text: 'Print / Save as PDF' }),
        h('button', { type: 'button', class: 'qz-btn', onclick: () => { close(); instructions({ mode: A.mode, title: A.title, subtitle: A.subtitle, qs: qs, minutes: A.minutes, back: home }); }, text: 'Retake' }),
        h('button', { type: 'button', class: 'qz-btn pri', onclick: close, text: 'Back to Quiz' }))),
    reasonNote ? h('p', { class: 'qz-note bad', text: reasonNote }) : null,
    h('div', { class: 'qz-hero' }, h('div', { class: 'qz-ring', style: '--p:' + g.pct.toFixed(1) + ';--c:' + (g.pct >= 60 ? 'var(--ok)' : g.pct >= 40 ? '#d9961a' : 'var(--bad)') }, h('div', null, h('b', { text: g.correct + ' / ' + g.total }), h('span', { text: g.pct.toFixed(1) + '%' }))),
      h('div', { class: 'qz-stats' }, stat(band, 'Overall'), stat(g.correct, 'Correct', 'ok'), stat(g.wrong, 'Wrong', 'bad'), stat(g.skipped, 'Not answered'), stat(g.attempted + ' / ' + g.total, 'Attempted'), stat(g.accuracy.toFixed(0) + '%', 'Accuracy (of attempted)'),
        stat(dur(usedMs), 'Time used of ' + A.minutes + ' min'), stat(g.attempted ? dur(usedMs / g.attempted) : '-', 'Per answered question'), stat(Object.keys(A.marked || {}).length, 'Marked for review'), stat(A.violations.length + ' / ' + MAX_VIOL, 'Violations', A.violations.length ? 'bad' : ''))),
    h('h3', { text: 'Answer sheet' }), h('div', { class: 'qz-agrid' }, g.rows.map(r => h('a', { href: '#rv' + r.i, class: r.st, title: 'Question ' + (r.i + 1), onclick: ev => { ev.preventDefault(); const t = $('#rv' + r.i, el); if (t) { t.hidden = false; t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, text: r.i + 1 }))),
    h('h3', { text: 'Chapter-wise' }), tbl(g.byCh, 'Chapter'),
    weak.length ? h('p', { class: 'qz-note', style: 'margin-top:10px', text: 'Revise these first: ' + weak.map(w => w.name.replace(/\s+/, ' ')).join('; ') + '.' }) : null,
    h('h3', { text: 'Level-wise' }), tbl(g.byLv, 'Level'),
    h('h3', { text: 'Time spent on each question' }), h('div', { class: 'qz-tc', role: 'img', 'aria-label': 'Bar chart of the time spent on each question' }, g.rows.map(r => h('div', { class: r.st, style: 'height:' + Math.max(3, r.ms / maxMs * 100) + '%', title: 'Q' + (r.i + 1) + ': ' + dur(r.ms) + ' · ' + (r.st === 'ok' ? 'correct' : r.st === 'bad' ? 'wrong' : 'not answered') }))),
    h('div', { class: 'qz-tcl' }, g.rows.map(r => h('span', { text: (r.i + 1) % 5 === 0 || r.i === 0 ? r.i + 1 : '' }))),
    h('p', { class: 'qz-hint', text: 'Green = correct, red = wrong, grey = not answered. Average ' + dur(avgAll) + ' per question; longest ' + dur(maxMs) + '.' }),
    h('h3', { text: 'Violations' }),
    A.violations.length ? h('div', { class: 'qz-tabwrap' }, h('table', { class: 'qz-tab' }, h('thead', null, h('tr', null, ['#', 'After', 'What happened'].map(t => h('th', { text: t })))), h('tbody', null, A.violations.map((v, i) => h('tr', null, h('td', { text: i + 1 }), h('td', { text: clock(v.at - A.startedAt) }), h('td', { text: (VNAME[v.kind] || v.kind) + ': ' + v.text })))))) : h('p', { class: 'qz-note', text: 'None. You stayed on the test screen from start to finish.' }),
    h('h3', { text: 'Every question, with the correct answer' }), filt, review));
  document.body.append(el); document.documentElement.classList.add('qz-lock'); const app = $('#app'); if (app) app.inert = true;
  el.scrollTop = 0; $('h2', el).setAttribute('tabindex', '-1'); $('h2', el).focus();
}

window.AvantiQuiz = { mount, hasActive: () => !!(lsGet(ACTIVE_KEY) || {}).ids };
})();
