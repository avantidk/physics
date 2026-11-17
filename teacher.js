/* Physics Dashboard: Question Bank (Dashboard tab) and PYQs. One file, no build step. */
(function () {
'use strict';
let OPTS = null;
const SITE_VERSION = '28';   /* website version: matches the published version number */
const SHEET_W = 794, SHEET_H = 1123, PAD_X = 36, COL_GAP = 22;
const MAX_FS = 15, MAN_MIN = 13.5, AUTO_MIN = 13.5;
const CDN = {
  katex: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js',
  math: 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.js',
  auto: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js',
  h2c: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  pdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  pptx: 'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js',
  docx: 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
  zip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
};
const DIFF = { L1: 'L1', L2: 'L2', L3: 'L3' };
const RANK = { L1: 0, L2: 1, L3: 2 };

/* Out-of-syllabus questions (bank field oo): include or exclude them from the DPP library */
const OOS = { ex: false };
try { OOS.ex = localStorage.getItem('oosEx2') === '1'; } catch (e) {}
function oosBox() { return null; }
function syncOos() { document.querySelectorAll('.oosSeg button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.k === 'ex') === OOS.ex))); }
function applyOos() {
  BANK.qs = OOS.ex ? BANK.all.filter(q => !q.oo) : BANK.all.slice();
  SUBS = buildSubDpps(BANK.qs, CHMAP); buildPyqTopics();
  Object.keys(BK).forEach(k => delete BK[k]);
  ['cw', 'sw'].forEach(t => { PDFT[t].sel = null; PDFT[t].v++; if ($('#' + t + 'List')) renderPdfTab(t); });
  window.__oosInfo = () => ({ n: BANK.qs.length, all: BANK.all.length, oo: BANK.qs.filter(q => q.oo).length, subs: SUBS.length });
}
let KATEX_P = null;
/* diagrams come from the data files as SVG text: drop anything that could run script before it goes into the page */
function safeSvg(svg) {
  return String(svg || '').replace(/<script[\s\S]*?<\/script\s*>/gi, '').replace(/<script\b[^>]*\/?>/gi, '').replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/((?:xlink:)?href\s*=\s*["']?)\s*(?:javascript|vbscript):[^"'\s>]*/gi, '$1#');
}
let BANK = null, BYID = new Map(), CHMAP = new Map(), downloads = { save: o => new Promise(res => { const blob = o.data instanceof Blob ? o.data : new Blob([o.data]); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = o.filename || 'download'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); res(true); }, 1500); }) }; /* plain browser download until (and unless) the Claude runtime offers its own */

/* ---------- permissions ----------
   The plan (Free, Premium, Staff) and role come from the user's Supabase profile, read by auth.js.
   Free: view only. Premium: PDF download, print and PDF sharing. Staff: everything, including Word / PowerPoint and Attention flags.
   Every download, print, share and copy path below checks G() / need() as well as hiding its button. */
const PERM = () => (window.AvantiAuth && window.AvantiAuth.perm) || {};
function G(what) { return PERM()[what] === true; }
function need(what) {
  if (G(what)) return true;
  toast(['docx', 'pptx'].includes(what) && G('pdf') ? 'Your plan includes PDF downloads only.' : 'This needs a Premium membership. Open the profile menu and choose Purchase membership.');
  return false;
}
/* ---------- helpers ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const _svg = d => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const ICO = {
  print: _svg('<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>'),
  share: _svg('<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.7 15.7 6.3M8.3 13.3l7.4 4.4"/>'),
  chat: _svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
  mail: _svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>'),
  link: _svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>'),
  bw: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
  dl: _svg('<path d="M12 4v11"/><path d="M7.5 11 12 15.5 16.5 11"/><path d="M5 19.5h14"/>'),
  drive: '<img src="img/drive.png" width="22" height="20" alt="" style="display:block">',
  max: _svg('<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/>'),
  min: _svg('<path d="M9 4v5H4"/><path d="M15 4v5h5"/><path d="M9 20v-5H4"/><path d="M15 20v-5h5"/>')
};
const FIMG = { pdf: '<img src="img/pdf.png" width="36" height="36" alt="" style="display:block;object-fit:contain">', docx: '<img src="img/word.png" width="38" height="33" alt="" style="display:block;object-fit:contain">', pptx: '<img src="img/ppt.png" width="38" height="33" alt="" style="display:block;object-fit:contain">' };
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in (props || {})) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
    else if (k === 'checked' || k === 'value' || k === 'disabled') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); });
  return e;
}
const sum = a => a.reduce((x, y) => x + y, 0);
let toastT;
function toast(msg) {
  let t = $('.toast'); if (t) t.remove();
  t = h('div', { class: 'toast', 'aria-hidden': 'true', text: msg }); document.body.append(t);
  /* screen readers announce changes to a live region that is already on the page, not a freshly added one */
  let lv = document.getElementById('toastLive'); if (!lv) { lv = h('div', { id: 'toastLive', role: 'status', 'aria-live': 'polite', style: 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap' }); document.body.append(lv); }
  lv.textContent = ''; setTimeout(() => { lv.textContent = msg; }, 50);
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), Math.max(3200, String(msg).length * 80));
}
const loaded = {};
const ALT = {
  'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js': ['https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js', 'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'],
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js': ['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', 'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'],
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js': ['https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', 'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'],
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js': ['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'],
  'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js': ['https://unpkg.com/docx@8.5.0/build/index.umd.js', 'https://cdnjs.cloudflare.com/ajax/libs/docx/8.5.0/index.umd.js']
};
function loadOne(url) {
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = () => { s.remove(); rej(new Error('Could not load ' + url.split('/').pop())); };
    document.head.append(s);
  });
}
function loadScript(url) {
  if (loaded[url]) return loaded[url];
  return (loaded[url] = (async () => {
    let err;
    for (const u of [url].concat(ALT[url] || [])) {
      for (let k = 0; k < 2; k++) { try { await loadOne(u); return; } catch (e) { err = e; await new Promise(r => setTimeout(r, 400)); } }
    }
    delete loaded[url];
    throw new Error((err && err.message ? err.message : 'Could not load a library') + '. Check your connection.');
  })());
}
function math(node) {
  if (!window.renderMathInElement) return;
  try {
    window.renderMathInElement(node, { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false, macros: { '\\frac': '\\dfrac{#1}{#2}' } });
  } catch (e) { /* leave raw text */ }
}
/* wide maths: shrink to the available width instead of spilling into the next column */
function fitMath(nd) {
  const qb = nd.querySelector('.qb'); if (!qb || !qb.clientWidth) return;
  nd.querySelectorAll('.mfit').forEach(w => { const c = w.firstElementChild; c.style.transform = ''; w.replaceWith(c); });
  nd.querySelectorAll('.katex-display').forEach(d => {
    const html = d.querySelector('.katex-html'); if (!html) return;
    html.style.transform = ''; d.style.height = '';
    const w = d.clientWidth || qb.clientWidth, cw = html.scrollWidth;
    if (cw > w + 1) {
      /* too wide for the column: let it wrap at the = and + signs (inline maths breaks lines) instead of shrinking it */
      const ann = d.querySelector('annotation');
      if (ann && window.katex) {
        try { const wr = h('div', { class: 'dwrap' }); wr.innerHTML = window.katex.renderToString(ann.textContent, { displayMode: false, throwOnError: false, macros: { '\\frac': '\\dfrac{#1}{#2}' } }); d.replaceWith(wr); return; } catch (e) { /* keep the shrunk version */ }
      } const k = (w - 2) / cw, hh = d.offsetHeight; html.style.transformOrigin = 'left top'; html.style.transform = 'scale(' + k + ')'; d.style.height = Math.ceil(hh * k) + 'px'; }
  });
  nd.querySelectorAll('.katex .base').forEach(bs => {
    if (bs.closest('.katex-display')) return;
    const opt = bs.closest('.opt'), cell = bs.closest('td,th'), avail = opt ? opt.clientWidth - opt.firstElementChild.offsetWidth - 6 : cell ? cell.clientWidth - 10 : (bs.closest('.stem') || qb).clientWidth, w = bs.offsetWidth;
    if (!avail || w <= avail + 1) return;
    const k = (avail - 2) / w, wrap = h('span', { class: 'mfit', style: 'display:inline-block;vertical-align:middle;width:' + Math.ceil(w * k) + 'px;height:' + Math.ceil(bs.offsetHeight * k) + 'px' });
    bs.replaceWith(wrap); wrap.append(bs); bs.style.transformOrigin = 'left top'; bs.style.transform = 'scale(' + k + ')';
  });
}
const plain = s => s.replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}\\()^_]/g, '');

/* ---------- question logic ---------- */
/* a question is in the pool when its source is ticked; the exam choice only matters for PYQs */

/* ---------- sheet building ---------- */
function colWidth(cols) { return Math.floor((SHEET_W - 2 * PAD_X - (cols - 1) * COL_GAP) / cols); }
/* question label (preview and exports): class, year, paper */
function pyqLabel(q) {
  const y = q.y ? String(q.y) : '', p = String(q.p || '');
  return q.i;
}
function tagText(q) { if (q._noTag) return ''; if (q.s !== 'P') return q.i ? '[' + q.i + ']' : '';   /* practice (non-PYQ) questions: only their question code */
  const lv = q.lvTag ? 'L' + practiceLevel(q) : ''; const ex = pyqLabel(q); return lv || ex ? '[' + [lv, ex].filter(Boolean).join(' \u00b7 ') + ']' : ''; }
/* "match the lists" questions: split into intro + two lists so they can be drawn as a table */
function matchParts(text) {
  const ls = String(text).split('\n'), HA = /^\s*(List|Column)[\s\-]*(I|1)\s*(\([^)]*\))?\s*:\s*(.*)$/i, HB = /^\s*(List|Column)[\s\-]*(II|2)\s*(\([^)]*\))?\s*:\s*(.*)$/i;
  let a = -1, b = -1, ma = null, mb = null;
  for (let k = 0; k < ls.length; k++) { if (a < 0) { ma = HA.exec(ls[k]); if (ma) a = k; } else if (b < 0) { mb = HB.exec(ls[k]); if (mb) b = k; } }
  if (a < 0 || b < 0) return null;
  const grp = r => { if (!r.length || !/^\(?([A-Za-z]|\d+|i{1,3}|iv|vi{0,3})[).]/.test(r[0]) && !/^\(([A-Za-z]|\d+|i{1,3}|iv|vi{0,3})\)/.test(r[0])) return r; const o = []; r.forEach(x => { if (/^\(([A-Za-z]|\d{1,2}|i{1,3}|iv|vi{0,3})\)/.test(x) || !o.length) o.push(x); else o[o.length - 1] += ' ' + x; }); return o; };
  const items = (inline, lines) => { const r = []; if (inline && inline.trim()) inline.split(/\s;\s+(?=\()/).forEach(x => { if (x.trim()) r.push(x.trim()); }); lines.forEach(l => { if (l.trim()) r.push(l.trim()); }); return grp(r); };
  const left = items(ma[4], ls.slice(a + 1, b)), right = items(mb[4], ls.slice(b + 1));
  if (!left.length || !right.length) return null;
  const lab = m => (m[1] + (/^list$/i.test(m[1]) ? '-' : ' ') + m[2]) + (m[3] ? ' ' + m[3] : '');
  return { pre: ls.slice(0, a).join('\n').trim(), head: [lab(ma), lab(mb)], left, right };
}
function matchTable(m) {
  const n = Math.max(m.left.length, m.right.length), rows = [];
  for (let i = 0; i < n; i++) rows.push(h('tr', {}, h('td', { text: m.left[i] || '' }), h('td', { text: m.right[i] || '' })));
  return h('table', { class: 'mtab' }, h('thead', {}, h('tr', {}, h('th', { text: m.head[0] }), h('th', { text: m.head[1] }))), h('tbody', {}, rows));
}
/* tall formulas (matrices, cases, chains of fractions) sitting inside a line of text overlap their neighbours in the PDF picture: give them a line of their own */
const spaceCases = t => String(t).replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (m, b) => { const tl = /\\(d|t)?frac|\\sqrt|\\sum|\\int|\\prod|\\lim|\\binom/.test(b); return '\\begin{cases}' + b.replace(/\\\\(?!\[)(?=[\s\S]*\S)/g, '\\\\[' + (tl ? '1.3em' : '0.55em') + ']') + '\\end{cases}'; });
const boldHtml = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>');
function tallToDisplay(s) {
  return spaceCases(s).replace(/\\\(([\s\S]+?)\\\)/g, (m, x0) => { const x = x0.replace(/\\begin\{([bp])matrix\}([\s\S]*?)\\end\{\1matrix\}/g, (mm, k, body) => { const r = body.split('\\\\').length, big = r >= 3 ? '\\Bigg' : r === 2 ? '\\Big' : ''; return big ? big + 'l' + (k === 'b' ? '[' : '(') + '\\begin{matrix}' + body + '\\end{matrix}' + big + 'r' + (k === 'b' ? ']' : ')') : mm; }); return ((/\\begin\{/.test(x) || ((x.match(/\\d?frac/g) || []).length >= 2 && x.length > 24)) ? '\\[' + x + '\\]' : (x !== x0 ? '\\(' + x + '\\)' : m)); });
}
function buildQ(q, n, p) {
  const maxOpt = Math.max(0, ...q.o.map(o => plain(o).length));
  const cls = !q.o.length ? '' : (maxOpt <= 10 && p.cols === 1) ? 'c4' : maxOpt <= 26 ? 'c2' : 'c1';
  const hint = q.t === 'MSQ' ? '(one or more options correct)' : '';
  const t = p.tag ? tagText(q) : '';
  const mt = matchParts(q.q);
  let txt = String(mt ? mt.pre : q.q), after = '';
  const stemKids = s => { const out = []; let buf = []; const flush = () => { if (buf.length) { const d = h('div', { class: 'stem' }); d.insertAdjacentHTML('afterbegin', boldHtml(tallToDisplay(buf.join('\n')))); out.push(d); buf = []; } }; s.split('\n').forEach(line => { const m = /^\{\{tbl:([\s\S]*)\}\}$/.exec(line.trim()); if (m) { flush(); const rows = m[1].split('\x1e').map(r => r.split('\x1f')); out.push(h('table', { class: 'dt' }, rows.map((r, ri) => h('tr', {}, r.map(c => { const cell = h(ri ? 'td' : 'th'); cell.insertAdjacentHTML('afterbegin', boldHtml(tallToDisplay(c))); return cell; }))))); } else buf.push(line); }); flush(); return out; };
  const fx = txt.indexOf('{{figure}}');
  if (fx > -1) { after = txt.slice(fx + 10).trim(); txt = txt.slice(0, fx).trim(); }
  const tags = [hint ? h('span', { class: 'tag', text: hint }) : null, t ? h('span', { class: 'tag', text: t }) : null];
  const stems = stemKids(txt), stem = stems[stems.length - 1] && stems[stems.length - 1].tagName === 'DIV' ? stems[stems.length - 1] : h('div', { class: 'stem' });
  if (!after) tags.forEach(t => t && stem.append(t));
  if (!stems.includes(stem)) stems.push(stem);
  const kids = [...stems];
  if (mt) kids.push(matchTable(mt));
  if (q.f) kids.push(h('img', { class: 'fig', alt: 'Figure', src: figSrc(q.f), width: q.f.w, height: q.f.h }));
  if (after) { const aft = stemKids(after); let st2 = aft[aft.length - 1] && aft[aft.length - 1].tagName === 'DIV' ? aft[aft.length - 1] : null; if (!st2) { st2 = h('div', { class: 'stem' }); aft.push(st2); } tags.forEach(t => t && st2.append(t)); kids.push(...aft); }
  if (q.o.length) kids.push(h('div', { class: 'opts ' + cls, style: q.o.some(o => /\\d?frac/.test(o)) ? 'row-gap:.8em' : '' }, q.o.map((o, i) => h('div', { class: 'opt' }, h('b', { text: '(' + 'ABCD'[i] + ')' }), h('span', { text: o })))));
  const node = h('div', { class: 'sq' }, q.head ? h('div', { class: 'qhead', text: q.head }) : null, h('div', { class: 'qn', text: n + '.' }), h('div', { class: 'qb' }, kids));
  math(node);
  return node;
}
var LOGO_DATA = '';
try { fetch('img/ankit-logo-dark.png').then(r => r.ok ? r.blob() : null).then(bl => { if (!bl) return; const fr = new FileReader(); fr.onload = () => { LOGO_DATA = fr.result; }; fr.readAsDataURL(bl); }).catch(() => {}); } catch (e) { /* use the file path */ }
/* a figure that is just a picture wrapped in an SVG is drawn from the picture itself (screenshots and PDFs then never lose it) */
function figSrc(f) { const m = /<image[^>]*?href="(data:image\/(?:png|jpeg|jpg);base64,[^"]+)"/.exec(f.svg || ''); return m ? m[1] : 'data:image/svg+xml;utf8,' + encodeURIComponent(f.svg); }
function skeleton(p, keyMode) {
  const test = p.mode === 'test', sub = keyMode ? (keyMode === 'exp' ? 'Explanations' : 'Answer key') : (p.sub || 'Physics');
  const info = h('div', { class: 'sh-info' },
    h('span', { text: 'Name: ______________________' }), h('span', { text: 'Avanti ID: __________' }),
    h('span', { text: (p.total || p.qs.length) + ' questions' }),
    test ? h('span', { text: 'Time: ' + p.mins + ' min' }) : h('span', { text: 'Date: ______________' }),
    test ? h('span', { text: 'Max marks: ' + (p.total || p.qs.length) * p.pos + '  (+' + p.pos + ' / \u2212' + p.neg + ')' }) : h('span', { text: 'Marks: ____ / ' + p.qs.length }));
  const dt = p.date ? new Date(p.date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  /* header: logo left, exam name (18 bold) with date below (14), Physics top right; footer: Exam - Date left, page number right */
  const examName = p.pyq ? String(p.sub || '').replace(/\s*\u00b7\s*all topics$/, '') : p.title, dateLine = p.pyq ? p.title : sub;
  const headTitle = p.pyq ? examName : p.title, headSub = p.pyq ? (keyMode ? dateLine + ' \u00b7 ' + (keyMode === 'exp' ? 'Explanations' : 'Answer key') : dateLine) : sub;
  const logo = h('img', { class: 'sh-logo', src: LOGO_DATA || 'img/ankit-logo-dark.png', alt: 'PhyNik', style: 'height:40px;width:auto;display:block' });
  return h('div', { class: 'sheet' },
    h('div', { class: 'sh-head' },
      h('div', { class: 'sh-brand' }, logo),
      h('div', { class: 'sh-title', style: 'font-size:18px;font-weight:700;line-height:1.2' }, headTitle, h('small', { text: headSub, style: 'font-size:14px;font-weight:600;margin-top:3px;letter-spacing:0;color:var(--sheet-muted)' })),
      h('div', { class: 'sh-meta' }, h('div', { text: 'Physics', style: 'font-weight:700;font-size:12px' }), p.pyq ? h('div', { class: 'sh-badge', text: 'PYQ' }) : p.badge ? h('div', { class: 'sh-badge', text: p.badge }) : (dt ? h('div', { text: dt }) : null), p.batch ? h('div', { text: p.batch }) : null)),
    keyMode || !test ? null : info,
    h('div', { class: 'sh-body' }),
    h('div', { class: 'sh-foot' }, h('span', { text: p.pyq ? examName + ' - ' + dateLine : p.title }), h('span', { text: keyMode ? 'Teacher copy' : test ? 'Test' + (p.pageOf ? ' \u00b7 Page ' + p.pageOf : '') : (p.pg ? 'Page ' + p.pg : '') })));
}
function pickSplit(hs, gap, avail, cols) {
  const n = hs.length, total = sum(hs);
  if (!n) return { split: 0, m: 0 };
  if (cols === 1) { const m = total + gap * (n - 1); return m <= avail ? { split: n, m } : null; }
  let best = null, pre = 0;
  for (let k = 1; k <= n; k++) {
    pre += hs[k - 1];
    const s1 = pre + gap * (k - 1), s2 = k < n ? total - pre + gap * (n - k - 1) : 0, m = Math.max(s1, s2);
    if (!best || m < best.m) best = { split: k, m };
  }
  return best.m <= avail ? best : null;
}
/* Lays the sheet out into `host` so it is exactly full: biggest text that fits, then equal gaps. */
function layoutSheet(p, host, minFs) {
  const sheet = skeleton(p); host.append(sheet);
  const body = $('.sh-body', sheet), cols = p.cols, nCols = [];
  for (let i = 0; i < cols; i++) { const c = h('div', { class: 'sh-col' }); body.append(c); nCols.push(c); }
  const avail = nCols[0].clientHeight;
  const nodes = p.qs.map((q, i) => buildQ(q, i + 1 + (p.start || 0), p));
  const meas = h('div', { class: 'measure' }); meas.style.width = colWidth(cols) + 'px';
  nodes.forEach(nd => { nd.style.flex = 'none'; meas.append(nd); });
  document.body.append(meas);
  let best = null, fs = p.maxFs || MAX_FS;
  const floor = minFs || (p.pyq ? 12 : p.maxFs ? FIT_MIN : MAN_MIN);
  for (; fs >= floor - 0.001; fs -= 0.25) {
    meas.style.setProperty('--fs', fs + 'px'); nodes.forEach(fitMath);
    const hs = nodes.map(nd => nd.offsetHeight);
    const r = pickSplit(hs, fs * 0.7, avail - 8, cols);
    if (r) { best = { fs, split: r.split, m: r.m }; break; }
  }
  let overflow = false;
  if (!best) { overflow = true; fs = floor; meas.style.setProperty('--fs', fs + 'px'); nodes.forEach(fitMath); const hs = nodes.map(nd => nd.offsetHeight); const r = pickSplit(hs, 0, 1e9, cols); best = { fs, split: r.split, m: r.m }; }
  sheet.style.setProperty('--fs', best.fs + 'px');
  const groups = cols === 1 ? [nodes] : [nodes.slice(0, best.split), nodes.slice(best.split)];
  groups.forEach((g, i) => g.forEach(nd => { nd.style.flex = ''; nCols[i].append(nd); }));
  meas.remove();
  /* DPP pages: do not stretch a few tall questions apart; cap the gap and leave the rest blank at the bottom of the column */
  if (p.capGap) nCols.forEach((c, i) => { const ns = groups[i] || []; if (ns.length < 2) return; const used = sum(ns.map(n => n.offsetHeight)), free = c.clientHeight - used; c.style.justifyContent = 'flex-start'; c.style.gap = Math.max(0, Math.min(free / (ns.length - 1), best.fs * 2.2)) + 'px'; });
  const slack = overflow ? 0 : (avail - best.m) / avail;
  return { sheet, nodes, groups, fs: best.fs, overflow, slack, avail, gap: best.fs * 0.7, n: nodes.length };
}
/* answer key: one plain, continuous list (no boxes); pages of the same sheet read as one run, and it only
   spills onto a second page when the answers really do not fit on one */
function keySheets(pp, host) {
  const base = pp[0], groups = [];
  pp.forEach(p => {
    const lab = String(p.badge || p.title).replace(/\s*\u00b7\s*Page \d+ of \d+$/, ''), g = groups[groups.length - 1], items = p.qs.map((q, i) => ({ n: i + 1 + (p.start || 0), a: q.a || '\u2014' }));
    if (g && g.lab === lab) g.items.push(...items); else groups.push({ lab, items });
  });
  const labelled = groups.length > 1, sheets = [];
  let body = null, head = null, flow = null;
  const fresh = () => { const sh = skeleton(Object.assign({}, base, { qs: [], badge: '' }), true); sh.style.boxShadow = 'none'; body = $('.sh-body', sh); body.style.display = 'block'; host.append(sh); sheets.push(sh); };
  const open = g => { head = labelled ? h('div', { class: 'keyhead', text: g.lab }) : null; flow = h('div', { class: 'keyflow' }); if (head) body.append(head); body.append(flow); };
  const over = () => body.scrollHeight > body.clientHeight + 1;
  fresh();
  for (const g of groups) {
    open(g);
    for (const it of g.items) {
      const el = h('span', { class: 'kitem' }, h('b', { text: it.n + '.' }), h('span', { text: ' ' + it.a }));
      flow.append(el); math(el);
      if (over()) {
        el.remove();
        if (!flow.children.length) { flow.remove(); if (head) head.remove(); }
        fresh(); open(g); flow.append(el);
      }
    }
  }
  return sheets;
}
/* explanations: a flowing list of full solutions (text, maths and the solution's own figure) over as many pages as needed */
function explSheets(items, base, host) {
  const labelled = new Set(items.map(x => x.lab)).size > 1, sheets = []; let body = null, last = null;
  const fresh = () => { const sh = skeleton(Object.assign({}, base, { qs: [], badge: '' }), 'exp'); sh.style.boxShadow = 'none'; body = $('.sh-body', sh); body.style.display = 'block'; host.append(sh); sheets.push(sh); };
  const over = () => body.scrollHeight > body.clientHeight + 1;
  const build = it => {
    const el = h('div', { class: 'explitem', style: 'margin:0 0 9px;font-size:12px;line-height:1.45' }), parts = it.text.split(/\s*\{\{figure\}\}\s*/);
    el.append(h('b', { text: it.n + '. ', style: 'color:var(--sheet-accent)' }));
    parts.forEach((t, k) => {
      if (k) { if (it.f && it.f.svg) { const fg = h('div', { style: 'margin:4px 0' }); fg.innerHTML = safeSvg(it.f.svg).replace(/<svg /, '<svg style="width:' + Math.min(it.f.w || 240, 240) + 'px;height:auto" '); el.append(fg); } }
      if (t.trim()) el.append(h('span', { text: t.replace(/^\n+|\n+$/g, ''), style: 'white-space:pre-wrap' }));
    });
    if (parts.length === 1 && it.f && it.f.svg) { const fg = h('div', { style: 'margin:4px 0' }); fg.innerHTML = safeSvg(it.f.svg).replace(/<svg /, '<svg style="width:' + Math.min(it.f.w || 240, 240) + 'px;height:auto" '); el.append(fg); }
    return el;
  };
  fresh();
  for (const it of items) {
    const mk = () => { const nodes = []; if (labelled && it.lab !== last) nodes.push(h('div', { class: 'keyhead', text: it.lab })); nodes.push(build(it)); return nodes; };
    let nodes = mk(); nodes.forEach(nd => { body.append(nd); math(nd); });
    if (over() && body.children.length > nodes.length) { nodes.forEach(nd => nd.remove()); fresh(); nodes = mk(); nodes.forEach(nd => { body.append(nd); math(nd); }); }
    last = it.lab;
  }
  return sheets;
}
/* fits at the readable size? used by "Fill page" */

/* ---------- DPP library: build ready-made topic-wise DPPs from the bank ---------- */
function tcNum(tc) { const m = String(tc).match(/\.(\d+)$/); return m ? +m[1] : 999; }
function sortTopicwise(qs) {
  return qs.map((q, i) => ({ q, i })).sort((a, b) => tcNum(a.q.tc) - tcNum(b.q.tc) || a.q.tp.localeCompare(b.q.tp) || RANK[a.q.d] - RANK[b.q.d] || a.i - b.i).map(x => x.q);
}
/* levels: [{key, qs}] easiest first. cross: a small leftover may join the neighbouring level. */
function practiceLevel(q) {
  return RANK[q.d] == null ? 2 : RANK[q.d] + 1;   // every question is L1, L2 or L3
}

/* ---------- subtopic DPPs and level booklets ---------- */
const SUB_TOP = 20, FIT_MIN = 12, DPP_FS = 14;   /* px: 12 px = 9 pt, 14 px = 10.5 pt */
/* every chapter gets about one DPP per lecture (LECTURES, give or take one), as many as its questions allow, each on its own topic(s):
   - a topic with enough questions gets its own DPP, a big topic is spread over several DPPs (different questions in each)
   - small neighbouring topics are merged into one DPP
   Each DPP: at least 5 L1 + 5 L2 + 5 L3 (gaps filled from L2 first, then the other level), up to 20 questions on one A4 side. */
/* lectures to be taken per chapter (M2=2A+2B, M3 = 3A only, M11=A+B+C, M20=A+B); a DPP is submitted after every class */
const LECTURES = {};
const evenPick = (a, k) => a.length <= k ? a.slice() : Array.from({ length: k }, (_, j) => a[Math.floor((j + 0.5) * a.length / k)]);
function buildSubDpps(bank, chmap) {
  const out = [], byCh = {};
  bank.forEach(q => { if (q.s !== 'N') return; (byCh[q.cc] = byCh[q.cc] || []).push(q); });
  Object.keys(byCh).sort((a, b) => chmap.get(a).o - chmap.get(b).o || chmap.get(a).cl - chmap.get(b).cl).forEach(cc => {
    const c = chmap.get(cc), tm = new Map();
    byCh[cc].forEach(q => { if (!tm.has(q.tc)) tm.set(q.tc, { tc: q.tc, tp: q.tp, qs: [] }); tm.get(q.tc).qs.push(q); });
    const topics = [...tm.values()].sort((x, y) => tcNum(x.tc) - tcNum(y.tc));
    const N = byCh[cc].length, n = Math.max(1, Math.min(LECTURES[cc] || 8, Math.floor(N / 13)));
    let G = topics.map(t => ({ qs: t.qs.slice() }));
    const merge = (a) => { G.splice(a, 2, { qs: G[a].qs.concat(G[a + 1].qs) }); };
    for (let g = 0; g < 99 && G.length > 1; g++) {            // merge small topics into a neighbour
      let k = 0; G.forEach((x, y) => { if (x.qs.length < G[k].qs.length) k = y; });
      if (G[k].qs.length >= 13) break;
      const a = k === 0 ? 0 : k === G.length - 1 ? k - 1 : (G[k - 1].qs.length <= G[k + 1].qs.length ? k - 1 : k); merge(a);
    }
    while (G.length > n) { let b = 0, bs = 1e9; for (let a = 0; a + 1 < G.length; a++) { const z = G[a].qs.length + G[a + 1].qs.length; if (z < bs) { bs = z; b = a; } } merge(b); }
    const m = G.map(() => 1);
    for (let e = n - G.length; e > 0; e--) {                   // spare DPPs go to the biggest topics
      let k = -1, bv = 0; G.forEach((x, y) => { const v = x.qs.length / m[y]; if (Math.floor(x.qs.length / (m[y] + 1)) >= 13 && v > bv) { bv = v; k = y; } });
      if (k < 0) break; m[k]++;
    }
    let num = 0;
    G.forEach((g, gi) => {
      const lvl = { 1: [], 2: [], 3: [] }; g.qs.forEach(q => lvl[practiceLevel(q)].push(q));
      const used = new Set(), mm = m[gi];
      for (let j = 0; j < mm; j++) {
        const chunks = [1, 2, 3].map(l => { const a = lvl[l]; return a.slice(Math.round(j * a.length / mm), Math.round((j + 1) * a.length / mm)).filter(q => !used.has(q.i)); });
        const picks = [], take = q => { picks.push(q); used.add(q.i); };
        chunks.forEach(ch => evenPick(ch, 5).forEach(take));
        let need = 15 - picks.length;
        [2, 3, 1].forEach(l => { chunks[l - 1].filter(q => !used.has(q.i)).slice(0, Math.max(0, need)).forEach(q => { take(q); need--; }); });
        [2, 3, 1].forEach(l => { if (need <= 0) return; const a = lvl[l], at = j * a.length / mm; a.map((q, x) => ({ q, d: Math.abs(x - at) })).filter(o => !used.has(o.q.i)).sort((x, y) => x.d - y.d).slice(0, need).forEach(o => { take(o.q); need--; }); });
        if (!picks.length) continue;
        const extra = new Set(); let more = SUB_TOP - picks.length;
        if (picks.length >= 15) [2, 3, 1].forEach(l => { chunks[l - 1].filter(q => !used.has(q.i)).slice(0, Math.max(0, more)).forEach(q => { take(q); extra.add(q.i); more--; }); });
        const qs = sortTopicwise(picks); num++;
        out.push({ kind: 'sub', cc, chapter: c.n, num, id: 'sub-' + cc + '-' + num, lvs: [], tps: [...new Set(qs.map(q => q.tp === 'Unmapped' ? 'Mixed problems' : q.tp))], pool: picks.length, qs, extra });
      }
    });
  });
  return out;
}

/* ---------- PYQ topics from the CMS list ---------- */
const norm = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
let PYQT = {};
/* PYQ order inside a topic: easy (L1) to hard (L3), then newest first (year, then date from the id) */
const pyqDay = q => { const m = /^J[MA](\d{4})(\d{2})(\d{2})(\d)/.exec(q.i || ''); return m ? m[1] + m[2] + m[3] + m[4] : '0'; };
const pyqNewest = (a, b) => (Number(b.y) || 0) - (Number(a.y) || 0) || pyqDay(b).localeCompare(pyqDay(a));
/* flat list for pages: a heading at each topic start and at each level change ("L1 questions") */
function buildPyqTopics() {
  PYQT = {};
  Object.keys(BANK.syl || {}).forEach(cc => { PYQT[cc] = { topics: BANK.syl[cc].map(t => ({ no: t[0], name: t[1], code: t[2], qs: [] })), other: [] }; });
  BANK.qs.forEach(q => {
    if (q.s !== 'P' || !PYQT[q.cc]) return;
    const c = PYQT[q.cc], t = c.topics.find(x => norm(x.name) === norm(q.tp)); (t ? t.qs : c.other).push(q);
  });
  Object.values(PYQT).forEach(c => { const by = a => a.map((q, i) => ({ q, i })).sort((x, y) => RANK[x.q.d] - RANK[y.q.d] || pyqNewest(x.q, y.q) || x.i - y.i).map(x => x.q); c.topics.forEach(t => { t.qs = by(t.qs); }); c.other = by(c.other); });
}

/* ---------- DPP library UI ---------- */
let SUBS = [];
const BK = {};
const LS = { kind: 'sub', chs: [], ids: [], idk: '', part: 'all', page: 0, key: false, shown: false, year: 'all', yrs: [], ex: [], lv: ['L1', 'L2', 'L3'], pubs: [], srcs: [], tough: 2, mixv: 2, stat: '', seed: 0 };
const PUBS = [];
function initPubs() {
  const found = [...new Set(BANK.qs.filter(q => q.s === 'N').map(q => q.pb || 'Practice'))], first = [];
  PUBS.length = 0; first.concat(found.filter(x => !first.includes(x)).sort()).forEach(x => PUBS.push(x));
  LS.pubs = PUBS.slice(); LS.srcs = EXAMS.concat(PUBS);
}
const shortList = (a, n) => a.slice(0, n).join(', ') + (a.length > n ? ' +' + (a.length - n) : '');
const BASE = { mode: 'dpp', kind: 'dpp', big: true, cols: 2, tag: true, date: '', batch: '', mins: 0, pos: 4, neg: 1 };
/* a DPP is about 15 questions on one A4 side */
/* up to 20 questions per DPP: keep as many as fit at 10.5-11.5 pt, dropping the extra (6th-per-level) questions first, then the tallest ones (never below 12) */
/* split questions into full pages: greedy count, then spread evenly */
function paginate(qs, base) {
  const host = h('div', { style: 'position:absolute;left:-10000px;top:0;width:794px' }); document.body.append(host);
  const sk = skeleton(Object.assign({}, base, { qs: [] })); host.append(sk);
  const cols = []; for (let i = 0; i < base.cols; i++) { const c = h('div', { class: 'sh-col' }); $('.sh-body', sk).append(c); cols.push(c); }
  const avail = cols[0].clientHeight, gap = AUTO_MIN * 0.7;
  const meas = h('div', { class: 'measure' }); meas.style.width = colWidth(base.cols) + 'px'; meas.style.setProperty('--fs', AUTO_MIN + 'px'); document.body.append(meas);
  const hs = qs.map((q, i) => { const nd = buildQ(q, i + 1, base); nd.style.flex = 'none'; meas.append(nd); fitMath(nd); return nd.offsetHeight; });
  meas.remove(); host.remove();
  const ok = (a, b) => pickSplit(hs.slice(a, b), gap, avail - 8, base.cols);
  const greedy = []; let st = 0;
  while (st < qs.length) { let en = st + 1; while (en < qs.length && ok(st, en + 1)) en++; greedy.push([st, en]); st = en; }
  const k = greedy.length, even = []; let i = 0;
  for (let pg = 0; pg < k; pg++) { const sz = Math.ceil((qs.length - i) / (k - pg)); even.push([i, i + sz]); i += sz; }
  const use = even.every(r => ok(r[0], r[1])) ? even : greedy;
  return use.map(r => qs.slice(r[0], r[1]));
}
function idPages(ids, title) {
  const qs = ids.map(i => BYID.get(i)).filter(Boolean);
  return qs.length ? packPages(qs, (g, i, n) => ({ title, sub: 'Worksheet', badge: n > 1 ? 'Page ' + (i + 1) + ' of ' + n : 'Worksheet' })) : [];
}
function packPages(qs, mk) {
  const pg = paginate(qs, BASE), out = []; let start = 0;
  pg.forEach((g, i) => { out.push(Object.assign({}, BASE, mk(g, i, pg.length), { qs: g, start, cols: 2 })); start += g.length; });
  return out;
}
const exOf = q => 'School Level';
const EXAMS = ['School Level'];
const qWord = n => n + (n === 1 ? ' question' : ' questions');
/* ---------- Topicwise DPP: 2 A4 pages, text 11 to 12 pt ---------- */
const DPP_MINPX = 14.67, DPP_MAXPX = 16, DPP_CAP = 60;   /* 11 pt and 12 pt in px (1 pt = 4/3 px) */
const TKM = {};
function topicKeyOf(q) {
  const m = TKM[q.cc] || (TKM[q.cc] = new Map(((BANK.syl || {})[q.cc] || []).map(t => [norm(t[1]), String(t[0])])));
  return q.cc + '|' + (m.get(norm(q.tp)) || 'other');
}
const srcOf = q => q.s === 'P' ? exOf(q) : (q.pb || 'Practice');
function dppPool(forCount) {
  const yrs = LS.yrs, chs = new Set(LS.chs), ids = new Set(LS.ids), src = new Set(LS.srcs);
  return BANK.qs.filter(q => chs.has(q.cc) && (forCount || ids.has(topicKeyOf(q))) && src.has(srcOf(q)) && (q.s !== 'P' || !yrs.length || yrs.includes(String(q.y))) && LS.lv.includes('L' + practiceLevel(q))).map(q => Object.assign({}, q, { lvTag: true }));
}
function rrTopics(qs) {
  const g = new Map(); qs.forEach(q => { const k = topicKeyOf(q); if (!g.has(k)) g.set(k, []); g.get(k).push(q); });
  const lists = [...g.values()];
  if (LS.seed) { const rnd = (() => { let a = LS.seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })(); const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }; lists.forEach(shuf); shuf(lists); }
  else lists.forEach(l => { if (l[0].s === 'P') l.sort(pyqNewest); });
  const out = []; for (let i = 0; lists.some(l => i < l.length); i++) lists.forEach(l => { if (i < l.length) out.push(l[i]); });
  return out;
}
const chOrd2 = cc => { const c = CHMAP.get(cc); return c ? c.cl * 100 + c.o : 0; };
const dppOrder = qs => qs.map((q, i) => ({ q, i })).sort((a, b) => chOrd2(a.q.cc) - chOrd2(b.q.cc) || tcNum(a.q.tc) - tcNum(b.q.tc) || a.q.tp.localeCompare(b.q.tp) || practiceLevel(a.q) - practiceLevel(b.q) || a.i - b.i).map(x => x.q);
/* pick the order in which questions are taken so that every prefix keeps the chosen level mix and PYQ / practice mix */
function dppSeq(pool, cap) {
  const cats = {}; pool.forEach(q => { const k = (q.s === 'P' ? 'P' : 'N') + practiceLevel(q); (cats[k] = cats[k] || []).push(q); });
  Object.keys(cats).forEach(k => { cats[k] = rrTopics(cats[k]); });
  const hasP = pool.some(q => q.s === 'P'), hasN = pool.some(q => q.s !== 'P');
  let ws = { P: LS.mixv === 3 ? 1 : LS.mixv === 2 ? 0.5 : 0, N: LS.mixv === 1 ? 1 : LS.mixv === 2 ? 0.5 : 0 };
  if (!hasP) ws = { P: 0, N: 1 }; else if (!hasN) ws = { P: 1, N: 0 };
  const wl0 = LS.tough === 1 ? [1, 0, 0] : LS.tough === 3 ? [0, 0, 1] : [1, 1, 1].map(x => x / 3);
  let wl = wl0.map((w, i) => LS.lv.includes('L' + (i + 1)) ? w : 0); const sw = sum(wl);
  wl = sw ? wl.map(w => w / sw) : [1, 2, 3].map(l => LS.lv.includes('L' + l) ? 1 / LS.lv.length : 0);
  const pos = {}, taken = {}, seq = [], fbAt = [];
  Object.keys(cats).forEach(k => { pos[k] = 0; taken[k] = 0; });
  const left = k => pos[k] < cats[k].length;
  while (seq.length < cap) {
    const live = Object.keys(cats).filter(left); if (!live.length) break;
    const want = live.filter(k => ws[k[0]] * wl[+k[1] - 1] > 0);
    let k;
    if (want.length) k = want.reduce((a, b) => (ws[b[0]] * wl[+b[1] - 1] * (seq.length + 1) - taken[b]) > (ws[a[0]] * wl[+a[1] - 1] * (seq.length + 1) - taken[a]) ? b : a);
    else { fbAt.push(seq.length); k = live.slice().sort((a, b) => Math.abs(+a[1] - LS.tough) - Math.abs(+b[1] - LS.tough) || ws[b[0]] - ws[a[0]])[0]; }
    seq.push(cats[k][pos[k]++]); taken[k]++;
  }
  return { seq, fbAt };
}
function dppHeights(qs, fs) {
  const host = h('div', { style: 'position:absolute;left:-10000px;top:0;width:794px' }); document.body.append(host);
  const sk = skeleton(Object.assign({}, BASE, { qs: [] })); host.append(sk);
  const c = h('div', { class: 'sh-col' }); $('.sh-body', sk).append(c); const avail = c.clientHeight;
  const meas = h('div', { class: 'measure' }); meas.style.width = colWidth(2) + 'px'; meas.style.setProperty('--fs', fs + 'px'); document.body.append(meas);
  const hs = new Map(); qs.forEach((q, i) => { const nd = buildQ(q, i + 1, BASE); nd.style.flex = 'none'; meas.append(nd); fitMath(nd); hs.set(q.i, nd.offsetHeight); });
  meas.remove(); host.remove(); return { hs, avail };
}
function dppBuild() {
  const pool = dppPool(); if (!pool.length) return { pages: [], stat: '' };
  const { seq, fbAt } = dppSeq(pool, DPP_CAP), H = dppHeights(seq, DPP_MINPX), gap = DPP_MINPX * 0.7;
  const fits = qs => !!pickSplit(qs.map(q => H.hs.get(q.i)), gap, H.avail - 8, 2);
  const split = n => {   /* ordered list for n questions, and the split point closest to half where both pages fit */
    const qs = dppOrder(seq.slice(0, n)); if (fits(qs)) return { qs, k: n }; if (n < 2) return null;
    let best = null; for (let k = 1; k < n; k++) if (fits(qs.slice(0, k)) && fits(qs.slice(k)) && (!best || Math.abs(k - n / 2) < Math.abs(best - n / 2))) best = k;
    return best ? { qs, k: best } : null;
  };
  let lo = 1, hi = seq.length, ok = split(hi) ? hi : 0;
  if (!ok) { while (lo <= hi) { const m = (lo + hi) >> 1; if (split(m)) { ok = m; lo = m + 1; } else hi = m - 1; } }
  for (let t = 0; t < 3 && ok < seq.length && split(ok + 1); t++) ok++;
  const nm = chs => chs.length <= 2 ? chs.map(cc => CHMAP.get(cc).n).join(' + ') : chs.length + ' chapters';
  const used = LS.chs.filter(cc => pool.some(q => q.cc === cc)).sort((a, b) => chOrd2(a) - chOrd2(b));
  const title = nm(used), file = title + ' DPP';
  for (let n = ok; n >= 1; n--) {
    const sp = split(n); if (!sp) continue;
    const r = dppPlace(sp.qs, sp.k, title, file); if (!r) continue;
    return Object.assign(r, { pool, title, file, out: new Set() }, dppFin(r, pool, fbAt.some(i => i < n)));
  }
  return { pages: [], stat: '' };
}
/* lay the chosen questions out for real: one page (k = n) or two pages split after k; both pages get the same text size */
function dppPlace(qs, k, title, file) {
  const n = qs.length, tps = [...new Set(qs.map(q => q.tp === 'Unmapped' ? 'Mixed problems' : q.tp))], sub = shortList(tps, 3);
  const mk = (g, start, i, tot) => Object.assign({}, BASE, { title, sub, badge: 'DPP', pg: tot > 1 ? (i + 1) + ' of ' + tot : '', qs: g, start, total: n, maxFs: DPP_MAXPX, file, capGap: true });
  const parts = k >= n ? [qs] : [qs.slice(0, k), qs.slice(k)];
  let pages = parts.map((g, i) => mk(g, i ? parts[0].length : 0, i, parts.length));
  const host = h('div', { style: 'position:absolute;left:-10000px;top:0;width:794px' }); document.body.append(host);
  let bad = false, fs = DPP_MAXPX;
  try { pages.forEach(pg => { const L = layoutSheet(pg, host, DPP_MINPX); L.sheet.remove(); if (L.overflow) bad = true; fs = Math.min(fs, L.fs); }); } finally { host.remove(); }
  if (bad) return null;
  pages = pages.map(pg => Object.assign(pg, { maxFs: fs }));
  return { pages, qs, k: Math.min(k, n), fs };
}
function dppFin(r, pool, fb) {
  const qs = r.qs, n = qs.length, lv = [1, 2, 3].map(l => 'L' + l + ' ' + qs.filter(q => practiceLevel(q) === l).length).join(' · '), np = qs.filter(q => q.s === 'P').length;
  LS.fs = r.fs;
  return { stat: '<b>' + qWord(n) + '</b> of ' + pool.length + ' matching, on ' + r.pages.length + ' A4 ' + (r.pages.length > 1 ? 'pages' : 'page') + ' at ' + (r.fs * 0.75).toFixed(1).replace('.0', '') + ' pt. ' + lv + ' · PYQ ' + np + ' · Practice ' + (n - np) + '.' + (fb ? ' Not enough questions for this exact pick, so some come from the nearest level or source.' : '') };
}
/* swap one question for another from the same pool: same level first, then same kind (PYQ / practice), then same topic */
function dppSwap(r, id) {
  const cur = r.qs.findIndex(q => q.i === id); if (cur < 0) return false;
  const q0 = r.qs[cur], inSel = new Set(r.qs.map(q => q.i)); r.out.add(id);
  const lvl = practiceLevel(q0), isP = q0.s === 'P', tk = topicKeyOf(q0);
  const score = q => (practiceLevel(q) === lvl ? 4 : 0) + ((q.s === 'P') === isP ? 2 : 0) + (topicKeyOf(q) === tk ? 1 : 0);
  const cands = r.pool.filter(q => !inSel.has(q.i) && !r.out.has(q.i)).map(q => ({ q, sc: score(q) + Math.random() * 0.9 })).sort((a, b) => b.sc - a.sc).slice(0, 30);
  for (const { q } of cands) {
    const qs = dppOrder(r.qs.map((x, i) => i === cur ? q : x));
    const k0 = r.k >= qs.length ? qs.length : r.k;
    for (const k of [k0, ...[1, -1, 2, -2].map(d => k0 + d).filter(k => k >= 1 && k < qs.length)]) {
      const pl = dppPlace(qs, k, r.title, r.file); if (!pl) continue;
      Object.assign(r, pl, dppFin(pl, r.pool, false)); return true;
    }
  }
  return false;
}
const dppKey = () => 'dpp|' + LS.chs.join(',') + '|' + LS.ids.join(',') + '|' + LS.lv.join('') + '|' + LS.srcs.join(',') + '|' + LS.yrs.join(',') + '|' + LS.tough + LS.mixv + '|' + LS.seed + '|' + (OOS.ex ? 1 : 0) + (window.katex ? 'k' : '');
const dppCur = () => { const key = dppKey(); return BK[key] || (BK[key] = dppBuild()); };
function currentPages() {
  const r = dppCur(); LS.stat = r.stat;
  return r.pages.map(p => Object.assign({}, p, { key: LS.key, exp: !!LS.exp }));
}
/* a redraw replaces the inputs: remember which one had keyboard focus and give focus back to the new one with the same value */
const keptFocus = list => { const a = document.activeElement; return a && a.tagName === 'INPUT' && list.contains(a) ? a.value : null; };
const refocus = (list, v) => { if (v == null) return; const x = [...list.querySelectorAll('input')].find(i => i.value === v); if (x) x.focus({ preventScroll: true }); };
/* tick-box list: a summary button that opens a list of checkboxes. Redraws keep it open. */
function mfill(id, items, sel, set, noun, o) {
  o = o || {};
  const box = $('#' + id), list = $('.ml', box), st = list.scrollTop, valid = items.map(i => i[0]);
  const cur = sel.filter(v => valid.includes(v)), fv = keptFocus(list);
  list.textContent = '';
  items.forEach(([v, t]) => {
    const cb = h('input', { type: 'checkbox', value: v, onchange: () => set([...list.querySelectorAll('input:checked')].map(x => x.value)) });
    cb.checked = cur.includes(v);
    list.append(h('label', { class: 'mi' }, cb, h('span', { text: t })));
  });
  list.scrollTop = st; refocus(list, fv);
  const names = items.filter(i => cur.includes(i[0])).map(i => i[1].replace(/\s*\(\d+\)$/, ''));
  $('.mt', box).textContent = !items.length ? (o.empty || 'Nothing to pick') : !cur.length ? (o.none || 'Pick ' + noun) : cur.length === items.length ? 'All ' + noun + ' (' + items.length + ')' : cur.length <= 2 ? names.join(', ') : cur.length + ' of ' + items.length + ' ' + noun;
  return cur;
}
const msel = (id, noun) => h('div', { class: 'msel', id },
  h('button', { type: 'button', class: 'mbtn', 'aria-expanded': 'false', onclick: e => { const b = e.currentTarget, o = b.getAttribute('aria-expanded') !== 'true'; document.querySelectorAll('.msel .mbtn').forEach(x => { x.setAttribute('aria-expanded', 'false'); x.parentNode.classList.remove('open'); }); b.setAttribute('aria-expanded', String(o)); b.parentNode.classList.toggle('open', o); } }, h('span', { class: 'mt', text: 'Pick ' + noun }), h('span', { class: 'mcar', 'aria-hidden': 'true', text: '\u25be' })),
  h('div', { class: 'mp' },
    h('div', { class: 'mq' },
      h('button', { type: 'button', class: 'mlink', 'data-act': 'mall', 'data-k': id, text: 'Select all' }),
      h('button', { type: 'button', class: 'mlink', 'data-act': 'mnone', 'data-k': id, text: 'Clear' })),
    h('div', { class: 'ml' })));
/* one-choice dropdown: same look as msel, but picking an item selects it and closes the list */
const ssel = (id, noun) => {
  if (!document.getElementById('ssel-css')) { const st = document.createElement('style'); st.id = 'ssel-css'; st.textContent = '.pdflist{overflow:visible!important;max-height:none!important;height:auto!important}.msel.sgl .mp{position:static!important;width:auto!important;max-height:none!important;overflow:visible!important;margin-top:6px;box-shadow:none}.msel.sgl .ml{max-height:min(52vh,420px)!important;overflow-y:auto}.msel.sgl .mi{align-items:flex-start;padding-block:8px}.msel.sgl .mi span{white-space:normal;overflow-wrap:anywhere;line-height:1.3}'; document.head.append(st); }
  const b = msel(id, noun); b.classList.add('sgl'); const q = b.querySelector('.mq'); if (q) q.remove(); return b;
};
function sfill(id, items, sel, set, noun, o) {
  o = o || {};
  const box = $('#' + id), list = $('.ml', box), st = list.scrollTop, fv = keptFocus(list);
  list.textContent = '';
  /* arrow keys move through the choices and keep the list open; Enter, Space or a click picks one and closes it */
  const shut = () => { box.classList.remove('open'); const b = $('.mbtn', box); b.setAttribute('aria-expanded', 'false'); b.focus({ preventScroll: true }); };
  list.onkeydown = e => { if (/^Arrow/.test(e.key)) box.dataset.kb = '1'; else if ((e.key === 'Enter' || e.key === ' ') && e.target.type === 'radio') { e.preventDefault(); if (!e.target.checked) { e.target.checked = true; set(e.target.value); } shut(); } else if (e.key === 'Escape') shut(); };
  items.forEach(([v, t]) => {
    const rb = h('input', { type: 'radio', name: id, value: v, onchange: () => { const kb = box.dataset.kb === '1'; delete box.dataset.kb; if (!kb) { box.classList.remove('open'); $('.mbtn', box).setAttribute('aria-expanded', 'false'); } set(v); } });
    rb.checked = v === sel;
    list.append(h('label', { class: 'mi' }, rb, h('span', { text: t })));
  });
  list.scrollTop = st; if (box.classList.contains('open')) refocus(list, fv);
  const hit = items.find(i => i[0] === sel);
  $('.mt', box).textContent = !items.length ? (o.empty || 'Nothing to pick') : hit ? hit[1].replace(/\s*\(\d+ questions?\)$/, '') : 'Pick ' + noun;
}
function renderLib() {
  if (!$('#libCh')) return;
  syncOos();
  const was = LS.shown;
  const chOf = [...new Set(BANK.qs.map(q => q.cc))].filter(cc => CHMAP.get(cc)).sort((a, b) => chOrd2(a) - chOrd2(b));
  LS.chs = mfill('libCh', chOf.map(cc => [cc, cc + ' ' + CHMAP.get(cc).n]), LS.chs, v => { LS.chs = v; renderLib(); }, 'chapters');
  const multiCh = LS.chs.length > 1;
  /* sources: PYQ plus every practice source, all listed */
  const cnt = {}; BANK.qs.forEach(q => { if (LS.chs.includes(q.cc)) cnt[srcOf(q)] = (cnt[srcOf(q)] || 0) + 1; });
  const srcItems = EXAMS.concat(PUBS).map(x => [x, x + ' (' + (cnt[x] || 0) + ')']);
  LS.srcs = mfill('libSrc', srcItems, LS.srcs, v => { LS.srcs = v; renderLib(); }, 'sources', { none: 'No source picked' });
  const hasP = LS.srcs.some(x => EXAMS.includes(x)), hasN = LS.srcs.some(x => !EXAMS.includes(x));
  $('#fldYear').hidden = !hasP;
  if (hasP) {
    const cy = {}; BANK.qs.forEach(q => { if (q.s === 'P' && LS.chs.includes(q.cc) && q.y && LS.lv.includes('L' + practiceLevel(q))) cy[q.y] = (cy[q.y] || 0) + 1; });
    const ys = Object.keys(cy).sort((a, b) => b - a);
    LS.yrs = mfill('libYr', ys.map(y => [y, y + ' (' + cy[y] + ')']), LS.yrs, v => { LS.yrs = v; renderLib(); }, 'years', { none: 'All years' });
  }
  /* subtopics of the picked chapters */
  const pool0 = dppPool(true), per = {}; pool0.forEach(q => { const k = topicKeyOf(q); per[k] = (per[k] || 0) + 1; });
  const items = []; LS.chs.slice().sort((a, b) => chOrd2(a) - chOrd2(b)).forEach(cc => {
    const pre = multiCh ? cc + ' ' + CHMAP.get(cc).n + ' · ' : '';
    ((BANK.syl || {})[cc] || []).forEach(t => items.push([cc + '|' + t[0], pre + t[2] + ' · ' + t[1] + ' (' + (per[cc + '|' + t[0]] || 0) + ')']));
    if (per[cc + '|other']) items.push([cc + '|other', pre + 'Other topics (' + per[cc + '|other'] + ')']);
  });
  const k = LS.chs.join(',');
  if (LS.idk !== k) { LS.idk = k; LS.ids = items.map(i => i[0]); }
  LS.ids = mfill('libDpp', items, LS.ids, v => { LS.ids = v; renderLib(); }, 'subtopics', { empty: 'Pick a chapter first' });
  /* sliders */
  const tl = ['', 'All easy: L1 questions only.', 'Mixed: about one third from each level.', 'All tough: L3 questions only.'][LS.tough];
  $('#toughHint').textContent = tl + '';
  const mx = $('#mixSl'), canMix = hasP && hasN; mx.disabled = !canMix;
  $('#mixHint').textContent = !canMix ? (hasP ? 'Only exams are picked, so every question is a PYQ.' : hasN ? 'No exam is picked, so every question is a practice question.' : 'Pick at least one source.') : ['', 'N: all practice questions, no PYQs.', 'O: half practice questions, half PYQs.', 'P: all PYQs, no practice questions.'][LS.mixv];
  const n = pool0.filter(q => LS.ids.includes(topicKeyOf(q)) && LS.lv.includes('L' + practiceLevel(q)) && (q.s !== 'P' || !LS.yrs.length || LS.yrs.includes(String(q.y)))).length;
  const np = pool0.filter(q => q.s === 'P' && LS.ids.includes(topicKeyOf(q)) && (!LS.yrs.length || LS.yrs.includes(String(q.y)))).length;
  const info = !LS.chs.length ? 'Pick one or more chapters first.' : n ? '<b>' + qWord(n) + ' available</b> (' + np + ' PYQ, ' + (n - np) + ' practice). The DPP uses 1 A4 page if they are few, otherwise 2, at 11 to 12 pt.' : '<b>0 questions</b> for this pick so far.';
  $('#libNote').textContent = 'Pick chapters and subtopics. The DPP takes as many questions as fit on 2 A4 pages (text 11 to 12 pt), in topic order. A short list stays on 1 page. Every question shows its level (L1, L2 or L3).';
  LS.shown = false; LS.page = 0;
  const wrap = $('#libPrev'); wrap.textContent = ''; wrap._et = (wrap._et || 0) + 1;
  const ip = h('p', { class: 'msg' }); ip.innerHTML = info;
  wrap.append(h('div', { class: 'ph' }, ip, h('button', { type: 'button', class: 'btn', 'data-act': 'libshow', text: 'Show preview' })));
  $('#libMsg').textContent = ''; $('#libPages').hidden = true;
  if (was && n) showLibPrev();
}
function addKeyPages(wrap, pages) {
  const kp = pages.filter(p => p.key);
  if (kp.length) {
    const hst = exportHost();
    try { keySheets(kp, hst).forEach(sh => { const sc = h('div', { class: 'pgscale' }); wrap.append(h('div', { class: 'pgbox keypg' }, sc)); sc.append(sh); }); }
    finally { hst.remove(); }
    rescale();
  }
  const ep = pages.filter(p => p.exp); if (ep.length) addExplPages(wrap, ep);
}
async function addExplPages(wrap, pages) {
  const tok = wrap._et = (wrap._et || 0) + 1, items = await explItems(pages);
  if (wrap._et !== tok || !wrap.isConnected) return;
  if (!items.length) { wrap.append(h('div', { class: 'empty', text: 'None of these questions has an explanation yet.' })); return; }
  const hst = exportHost();
  try { explSheets(items, pages[0], hst).forEach(sh => { const sc = h('div', { class: 'pgscale' }); wrap.append(h('div', { class: 'pgbox keypg' }, sc)); sc.append(sh); }); }
  finally { hst.remove(); }
  rescale();
}
function showLibPrev() {
  const pages = currentPages(), wrap = $('#libPrev'), msg = $('#libMsg'); wrap.textContent = ''; wrap._et = (wrap._et || 0) + 1;
  if (!pages.length) { wrap.append(h('div', { class: 'empty', text: 'No questions here yet.' })); msg.textContent = ''; return; }
  LS.shown = true; LS.page = 0;
  const pb = $('#libPages'); pb.hidden = true; pb.textContent = '';
  const tot = sum(pages.map(x => x.qs.length)), tok = LS.tok = (LS.tok || 0) + 1, scalers = []; let warn = false;
  pages.forEach(() => { const sc = h('div', { class: 'pgscale' }); wrap.append(h('div', { class: 'pgbox' }, sc)); scalers.push(sc); });
  rescale();
  const say = done => { msg.className = 'msg' + (warn ? ' warn' : ''); msg.innerHTML = (LS.stat || '') + (done ? '' : ' Loading\u2026') + (pages.length > 1 && done ? ' Scroll to see both pages. Download includes both.' : ''); };
  say(false);
  let i = 0;
  const step = () => { if (LS.tok !== tok) return; const end = Math.min(i + 3, pages.length); for (; i < end; i++) { const L = layoutSheet(pages[i], scalers[i]); if (L.overflow) warn = true; L.nodes.forEach((nd, j) => { nd.style.position = 'relative'; nd.append(h('button', { type: 'button', class: 'dswap', 'data-act': 'libswap', 'data-k': pages[i].qs[j].i, title: 'Swap this question for another one', 'aria-label': 'Swap this question for another one', text: '\u21c4' })); }); } rescale(); say(i >= pages.length); if (i < pages.length) setTimeout(step, 0); else addKeyPages(wrap, pages); };
  step();
}
/* Print and Share, used by every tab that downloads: they all go through the same PDF as "Download PDF" */
const pdfBlobOf = payload => new Promise((res, rej) => { doExport('pdf', Object.assign({}, payload, { onBlob: (blob, file) => res({ blob, file }), onFail: rej })).then(() => rej(new Error('The PDF was not made')), rej); });
async function sendPdf(app, blob, file, title) {
  if (!need('share')) return;
  if (window.AvantiPortal && window.AvantiPortal.shareReady) { window.AvantiPortal.shareReady(blob, file, title); return; }
  await downloads.save({ filename: file, data: blob }); toast('PDF saved. Attach "' + file + '" in your app.');
}
/* every export button stays off while any export (PDF, Word, PowerPoint, print, share) is still being made, and comes back on only when the last one ends */
const EXP_SEL = '[data-act="exp"],[data-act="lexp"],[data-act="lexpall"],[data-act="pdfdl"],[data-act="xprint"],[data-act="xshare"]';
let expBusyN = 0;
function expBusy(d) { expBusyN = Math.max(0, expBusyN + d); document.querySelectorAll(EXP_SEL).forEach(b => { b.disabled = expBusyN > 0; }); }
function shareFrom(btn, title, get) {
  if (!need('share')) return;
  closeShare(); toast('Preparing the PDF\u2026');
  expBusy(1); if (btn) btn.disabled = true;
  Promise.resolve().then(get).then(r => sendPdf('', r.blob, r.file, title))
    .catch(e => toast('Could not prepare the PDF' + (e && e.message ? ': ' + e.message : '')))
    .then(() => { expBusy(-1); if (btn && !expBusyN) btn.disabled = false; });
}
function printFrom(get) {
  if (!need('print')) return;
  const w = window.open('', '_blank');
  if (!w) { toast('This view does not allow a print window. Use Download PDF, then print the file.'); return; }
  try { w.document.write('<!doctype html><title>Preparing…</title><body style="font-family:sans-serif;padding:24px">Preparing the PDF for printing…</body>'); } catch (e) { /* ignore */ }
  expBusy(1);
  Promise.resolve().then(get).then(r => { const u = URL.createObjectURL(r.blob); w.location.href = u; setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* the PDF is open: print from there */ } }, 1000); setTimeout(() => URL.revokeObjectURL(u), 120000); /* free the PDF once the print window has it */ })
    .catch(e => { try { w.close(); } catch (x) { /* ignore */ } toast('Could not prepare the PDF' + (e && e.message ? ': ' + e.message : '')); })
    .then(() => expBusy(-1));
}
window.__pdfPrint = printFrom; window.__pdfShare = shareFrom;
const prtBtn = src => h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'xprint', 'data-src': src, title: 'Print', 'aria-label': 'Print', html: ICO.print });
const shrBtn = src => h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'xshare', 'data-src': src, title: 'Share the PDF (WhatsApp, Discord, email)', 'aria-label': 'Share the PDF', html: ICO.share });
function pdfSource(t) {
  const src = t.dataset.src;
  if (src === 'lib') { const pages = currentPages(); if (!pages.length) { toast('No questions here yet'); return null; } return { title: pages[0].title + ' DPP', get: () => pdfBlobOf({ pages, file: pages[0].file }) }; }
  if (src === 'pyq') {
    const T = t.dataset.t, r = pdfRows(T).find(x => x.k === t.dataset.k); if (!r) { toast('Pick a paper or chapter first'); return null; }
    const pages = pdfPages(T, r).map(p => Object.assign({}, p, { key: !!PDFT[T].key, exp: !!PDFT[T].exp }));
    return { title: r.name, get: () => pdfBlobOf({ pages, file: r.file }) };
  }
  return null;
}
function exportLib(kind) {
  if (!need(kind)) return;
  const pages = currentPages(); if (!pages.length) { toast('No questions here yet'); return; }
  if (pages.length === 1) { doExport(kind, Object.assign({}, pages[0], { file: pages[0].file })); return; }
  doExport(kind, { pages, file: pages[0].file });
}
/* ---------- "PYQ ChapterWise PDF" and "Shift Wise PDF" tabs ---------- */
const PDFT = { cw: { bucket: 'School', sel: null, page: 0, v: 0, years: [], sess: [], cls: [], blocks: [], lv: [], types: [], key: false }, sw: { bucket: 'School', sel: null, page: 0, v: 0, years: [], sess: [], cls: [], key: false } };
const clsName = qs => [...new Set(qs.map(q => q.cl).filter(Boolean))].join(' & ') || 'Physics';
const chOrder = cc => { const c = CHMAP.get(cc); return c.cl * 100 + c.o; };
function pyqOf(bucket) { return BANK.qs.filter(q => q.s === 'P'); }
const cwYearOk = q => { const P = PDFT.cw, c = CHMAP.get(q.cc); return (!P.years.length || P.years.includes(String(q.y))) && (!P.sess.length || P.sess.includes(q.ss)) && (!P.cls.length || P.cls.includes(String(q.cl))) && (!P.lv.length || P.lv.includes(q.d)) && (!P.types.length || P.types.includes(q.t)); };
const swOk = q => { const P = PDFT.sw; return (!P.years.length || P.years.includes(String(q.y))) && (!P.sess.length || P.sess.includes(q.ss)) && (!P.cls.length || P.cls.includes(String(q.cl))); };
const swKey = () => ['years', 'sess', 'cls'].map(k => PDFT.sw[k].length ? PDFT.sw[k].slice().sort().join(',') : 'all').join('/');
const cwYrKey = () => ['years', 'sess', 'cls', 'blocks', 'lv', 'types'].map(k => PDFT.cw[k].length ? PDFT.cw[k].slice().sort().join(',') : 'all').join('/');
const cwYrSfx = () => ['cls', 'years', 'sess', 'lv'].map(k => PDFT.cw[k].length ? ' ' + (k === 'cls' ? 'Class ' : '') + PDFT.cw[k].slice().sort().join('+') : '').join('');
const cwYrText = () => { const ys = PDFT.cw.years.map(Number).sort((a, b) => a - b); if (!ys.length) return 'all'; return ys.length <= 4 ? ys.join(' \u00b7 ') : ys.length + ' years (' + ys[0] + '\u2013' + ys[ys.length - 1] + ')'; };
/* newest paper first: year, then exam month (Oct/Nov, then May/June, then Feb/Mar), then paper number (23, 22, 21); e.g. 0625/23/O/N/25 is the latest of 2025 */
function paperRank(code, year) {
  const m = /^\w+\/(\d+)\/([A-Z])\/([A-Z])\/(\d\d)$/.exec(code), MON = { 'F/M': 2, 'M/J': 5, 'O/N': 10 };
  if (!m) return (year || 0) * 1e6;
  return (year || 2000 + +m[4]) * 1e6 + (MON[m[2] + '/' + m[3]] || 0) * 1e3 + (+m[1] || 0);
}
function pdfRows(T) {
  const P = PDFT[T], key = 'rows|' + T + '|' + P.bucket + '|' + (T === 'cw' ? cwYrKey() : swKey());
  if (BK[key]) return BK[key];
  const qs = pyqOf(P.bucket).filter(q => T !== 'cw' || cwYearOk(q)); let rows = [];
  if (T === 'cw') {
    const by = {}; qs.forEach(q => { (by[q.cc] = by[q.cc] || []).push(q); });
    rows = Object.keys(by).sort((a, b) => chOrder(a) - chOrder(b)).map(cc => ({ k: cc, name: CHMAP.get(cc).n, qs: by[cc], file: CHMAP.get(cc).n + ' ' + clsName(by[cc]) + ' Questions' + (T === 'cw' ? cwYrSfx() : '') }));
  } else {
    const by = {}; qs.filter(swOk).forEach(q => { const k = q.p || q.i; (by[k] = by[k] || []).push(q); });
    rows = Object.keys(by).sort((a, b) => paperRank(b, by[b][0].y) - paperRank(a, by[a][0].y) || b.localeCompare(a)).map(k => ({ k, name: k, qs: by[k], file: k.replace(/\//g, '-') + ' Question Paper' }));
  }
  return (BK[key] = rows);
}
/* one page set per row; chapter wise = topic wise inside the chapter, shift wise = chapter order */
function pdfPages(T, r) {
  const key = 'pg|' + T + '|' + PDFT[T].bucket + '|' + (T === 'cw' ? cwYrKey() : swKey()) + '|' + r.k + (window.renderMathInElement ? '|k' : ''); if (BK[key]) return BK[key]; /* page splits measured before the maths renders are not reused afterwards */
  const bucket = PDFT[T].bucket, sub = (T !== 'cw' && bucket === 'Adv' && r.qs[0] && r.qs[0].y && r.qs[0].y < 2013 ? 'IIT-JEE' : clsName(r.qs)) + (T === 'cw' ? ' \u00b7 all topics' : '');
  let flat = [];
  if (T === 'cw') {
    const c = PYQT[r.k], topics = c ? c.topics.map(t => ({ label: t.code || ('Topic ' + t.no), name: t.name, qs: t.qs.filter(q => cwYearOk(q)) })).concat([{ label: 'Other', name: 'Other topics', qs: c.other.filter(q => cwYearOk(q)) }]) : [{ label: '', name: 'All topics', qs: r.qs }];
    topics.forEach(t => t.qs.forEach((q, i) => flat.push(Object.assign({}, q, { _pf: 1, _t: (t.label ? t.label + ' \u00b7 ' : '') + t.name, head: i === 0 ? (t.label ? t.label + ' \u00b7 ' : '') + t.name : '' }))));
  } else {
    r.qs.slice().sort((a, b) => (+String(a.i).split('-').pop() || 0) - (+String(b.i).split('-').pop() || 0)).forEach(q => flat.push(Object.assign({}, q, { _pf: 1, _noTag: 1, _t: '', head: '' }))); /* question paper: no chapter names, like a real paper */
  }
  const pages = packPages(flat, (g, i, n) => ({ title: r.name, sub, pyq: true, pg: n > 1 ? (i + 1) + ' of ' + n : '' }));
  if (T === 'cw') pages.forEach(pg => { if (pg.qs.length && !pg.qs[0].head) pg.qs = [Object.assign({}, pg.qs[0], { head: pg.qs[0]._t + ' (continued)' })].concat(pg.qs.slice(1)); });
  return (BK[key] = pages);
}
/* ---------- chapter PowerPoint (PYQ ChapterWise PDF tab) ---------- */
let PYQMETA = null;
function pyqMeta() { return PYQMETA || (PYQMETA = fetch('qb/data/pyq.json').then(r => r.json()).then(list => { const m = {}; list.forEach(x => { m[x.id] = x; }); return m; }).catch(() => ({}))); }
async function cwPptxData(r) {
  const P = PDFT.cw, bucket = P.bucket, cc = r.k, c = CHMAP.get(cc), pc = PYQT[cc];
  const years = {}; pyqOf(bucket).filter(q => q.cc === cc && q.y).forEach(q => { years[q.y] = (years[q.y] || 0) + 1; });
  const inScope = q => cwYearOk(q);
  const flat = pc ? [].concat(...pc.topics.map(t => t.qs.filter(inScope).map(q => Object.assign({}, q, { _t: t.name, _lab: pyqLabel(q) }))), pc.other.filter(inScope).map(q => Object.assign({}, q, { _t: 'Other topics', _lab: pyqLabel(q) }))) : r.qs.map(q => Object.assign({}, q, { _t: r.name, _lab: pyqLabel(q) }));
  const topics = pc ? pc.topics.map(t => ({ name: t.name, n: t.qs.filter(inScope).length })).concat(pc.other.filter(inScope).length ? [{ name: 'Other topics', n: pc.other.filter(inScope).length }] : []) : [];
  const figs = {}; for (const q of flat) if (q.f && !figs[q.i]) { try { figs[q.i] = await figPng(q.f); } catch (e) { /* skip the picture */ } }
  let logo = null; try { const rs = await fetch('img/ankit-logo.png'); if (rs.ok) { const bl = await rs.blob(), bm = await createImageBitmap(bl), dataUrl = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(bl); }); logo = { dataUrl, w: bm.width, h: bm.height }; } } catch (e) { /* no logo file: skip */ }
  return { logo, chapter: c.n, cl: c.cl, clLabel: (c.cls || [''])[0].toUpperCase(), cc, bucket, bucketName: clsName(r.qs), bucketLabel: bucket, year: cwYrText(), count: flat.length, years, topics, qs: flat, figs, meta: await pyqMeta() };
}
async function exportCwPptx(r) {
  if (!need('pptx')) return;
  if (!downloads) { toast('Downloads are not available in this view'); return; }
  expBusy(1);
  toast('Preparing PowerPoint…');
  try {
    const d = await cwPptxData(r); if (PDFT.cw.exp) d.expl = await explForQs(d.qs); if (PDFT.cw.key) d.key = true;
    await Promise.all([loadScript('mathdoc.b3.js'), loadScript('office.b9.js'), loadScript(CDN.zip), loadScript(CDN.pptx)]);
    const blob = await window.OfficeDoc.buildCwPptx(window.PptxGenJS, window.JSZip, Object.assign(d, { bucket: d.bucketLabel }), { CHMAP, figs: d.figs });
    const file = r.file + '.pptx';
    await downloads.save({ filename: file, data: blob }); toast('Saved ' + file);
  } catch (e) {
    if (e && e.code === 'declined') toast('Download cancelled');
    else toast('PowerPoint export failed: ' + (e && e.message ? e.message : 'try again'));
  } finally { expBusy(-1); }
}
/* ---------- one source of truth: the question list for DPPs, PYQs and tests is built from the SAME files as the Question Bank (qb/data/pyq.json + nonpyq.json). bank-meta.json only holds the chapter list and syllabus. ---------- */
const QBJ = {};
function qbJson(n) {
  if (!QBJ[n]) {
    const pre = window.__qbPre && window.__qbPre.data && window.__qbPre.data[n];
    const direct = () => fetch('qb/data/' + n + '.json').then(r => { if (!r.ok) throw new Error(n); return r.json(); });
    QBJ[n] = (pre ? Promise.resolve(pre).catch(direct) : direct()).catch(e => { delete QBJ[n]; throw e; });
  }
  return QBJ[n];
}
const QB_EXAM = { 'School Level': 'School' };
function qbCompact(r, withKcet) {
  const e = QB_EXAM[r.exam] || 'School';
  const P = true;
  let o = r.options || []; if (typeof o === 'string') { try { o = JSON.parse(o); } catch (x) { o = []; } }
  const q = { i: String(r.id), s: P ? 'P' : 'N', e, ss: r.session || '', cl: String(r.class || ''), y: P && r.year != null && r.year !== '' ? Number(r.year) : null, p: r.paper, t: r.type, cc: r.chapter_code, tc: String(r.topic_code || '').replace(/^JM-/, ''), tp: r.topic || '', d: r.difficulty, q: r.question || '', o, a: r.answer == null ? '' : String(r.answer) };
  if (!P) { q.pb = r.publisher || 'Practice'; q.sec = r.section || ''; if (r.pyq) q.pq = r.pyq_ref || ''; }
  if (r.oos) q.oo = 1;
  if (r.figure && r.figure.svg) q.f = r.figure;
  return q;
}
/* pictures are in qb/data/figures.json (not inside pyq.json / nonpyq.json); loaded once, shared with the Question Bank */
let figP = null;
window.__getFigs = function () {
  if (!figP) figP = fetch('qb/data/figures.json').then(r => { if (!r.ok) throw new Error('figures'); return r.json(); }).catch(e => { figP = null; throw e; });
  return figP;
};
let bankP = null;
function loadBank() {
  if (window.__BANK) return Promise.resolve(window.__BANK);
  if (!bankP) bankP = Promise.all([fetch('bank-meta.json').then(r => { if (!r.ok) throw new Error('bank-meta'); return r.json(); }), qbJson('pyq'), qbJson('nonpyq'), window.__getFigs().catch(() => ({}))]).then(([meta, py, np, figs]) => {
    const qs = []; py.concat(np).forEach(r => { if (figs && figs[r.id] && !r.figure) r.figure = figs[r.id]; const q = qbCompact(r); if (q) qs.push(q); });
    return { chapters: meta.chapters, syl: meta.syl, qs };
  }).catch(e => { bankP = null; throw e; });
  return bankP;
}
/* ---------- Question Bank tab "Export PPT": same black Avanti slides as the PYQ ChapterWise PPT, for any selection ---------- */
window.__qbCwPptx = async function (ids, explain, key) {
  if (!need('pptx')) throw new Error('Your plan includes PDF downloads only');
  if (!BANK) { const bank = await loadBank(); BANK = bank; BANK.all = bank.qs.slice(); bank.qs.forEach(q => BYID.set(q.i, q)); bank.chapters.forEach(c => CHMAP.set(c.c, c)); }
  /* KCET questions are kept out of the main bank (a separate exam), so look any id that is not there up in the raw PYQ file */
  let xtra = null; if (ids.some(i => !BYID.has(i))) { xtra = new Map(); (await qbJson('pyq')).forEach(r => { if (r.exam === 'KCET' || r.exam === 'IAT' || r.exam === 'NDA') { const q = qbCompact(r, true); if (q) xtra.set(q.i, q); } }); }
  const qs = ids.map(i => BYID.get(i) || (xtra && xtra.get(String(i)))).filter(Boolean); if (!qs.length) throw new Error('no questions found');
  const ccs = [...new Set(qs.map(q => q.cc))].sort((a, b) => chOrder(a) - chOrder(b)), one = ccs.length === 1, c0 = CHMAP.get(ccs[0]);
  const cls = [...new Set(ccs.map(cc => (CHMAP.get(cc).cls || [''])[0]))];
  const synIdx = (cc, tp) => { const s = (BANK.syl || {})[cc] || []; const k = s.findIndex(t => norm(t[1]) === norm(tp)); return k < 0 ? 999 : k; };
  const tname = q => (one ? '' : CHMAP.get(q.cc).n + ' · ') + (/^UNMAPPED/.test(q.tc || '') || !q.tp || q.tp === 'Unmapped' ? 'Other topics' : q.tp);
  const flat = qs.map(q => Object.assign({}, q, { _t: tname(q), _lab: q.s === 'P' ? pyqLabel(q) : '' }));
  const tm = new Map(); flat.forEach(q => { const k = q.cc + '|' + q._t; if (!tm.has(k)) tm.set(k, { name: q._t, n: 0, o: chOrder(q.cc) * 1000 + synIdx(q.cc, q.tp) }); tm.get(k).n++; });
  const topics = [...tm.values()].sort((a, b) => a.o - b.o).map(t => ({ name: t.name, n: t.n }));
  const years = {}; qs.filter(q => q.s === 'P' && q.y).forEach(q => { years[q.y] = (years[q.y] || 0) + 1; });
  const nP = qs.filter(q => q.s === 'P').length, nN = qs.length - nP, ex = [...new Set(qs.filter(q => q.s === 'P').map(q => q.e))];
  const kindLabel = nN && nP ? 'PYQs + practice' : nN ? 'Practice questions' : 'Physics Questions';
  const figs = {}; for (const q of flat) if (q.f && !figs[q.i]) { try { figs[q.i] = await figPng(q.f); } catch (e) { /* skip the picture */ } }
  let logo = null; try { const rs = await fetch('img/ankit-logo.png'); if (rs.ok) { const bl = await rs.blob(), bm = await createImageBitmap(bl), dataUrl = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(bl); }); logo = { dataUrl, w: bm.width, h: bm.height }; } } catch (e) { /* no logo file: skip */ }
  const yl = Object.keys(years).map(Number).sort((a, b) => a - b);
  const d = { logo, chapter: one ? c0.n : 'Selected Questions', cl: cls[0], cc: one ? ccs[0] : '', clLabel: cls.join(' & ').toUpperCase(), chLabel: one ? 'CHAPTER ' + ccs[0].replace(/^[A-Za-z]+/, '') : ccs.length + ' CHAPTERS',
    bucket: ex.length === 1 ? ex[0] : 'Main', bucketName: kindLabel, kindLabel, perQ: true, noFront: true, noTopic: true, year: yl.length ? (yl.length === 1 ? String(yl[0]) : 'all') : '\u2014', count: flat.length, years, topics, qs: flat, figs, meta: await pyqMeta() };
  await Promise.all([loadScript('mathdoc.b3.js'), loadScript('office.b9.js'), loadScript(CDN.zip), loadScript(CDN.pptx)]);
  if (explain) d.expl = await explForQs(qs);
  if (key) d.key = true;
  return window.OfficeDoc.buildCwPptx(window.PptxGenJS, window.JSZip, d, { CHMAP, figs });
};
function markPdfRows(T) { document.querySelectorAll('#' + T + 'List .pdfrow').forEach(e => e.setAttribute('aria-current', String(e.dataset.k === PDFT[T].sel))); }
const keySwitch = (id, act, extra) => h('label', { class: 'pick1 tgl tgl-hl' }, h('input', Object.assign({ type: 'checkbox', role: 'switch', id, 'data-act': act }, extra || {})), h('span', { class: 'tgl-track', 'aria-hidden': 'true' }), h('span', { text: 'Answer Key' }));
const expSwitch = (id, act, extra) => h('label', { class: 'pick1 tgl tgl-hl' }, h('input', Object.assign({ type: 'checkbox', role: 'switch', id, 'data-act': act }, extra || {})), h('span', { class: 'tgl-track', 'aria-hidden': 'true' }), h('span', { text: 'Explanation' }));
function renderPdfTab(T) {
  const view = $('#view' + (T === 'cw' ? 'Cw' : 'Sw')), P = PDFT[T]; if (!view || !BANK) return;
  if (!$('#' + T + 'List')) {
    view.textContent = '';
    view.append(
      h('div', { class: 'rail' }, h('div', { class: 'card' },
        h('div', { class: 'tglrow' }, keySwitch(T + 'Key', 'pdfkey', { 'data-t': T }), expSwitch(T + 'Expl', 'pdfexp', { 'data-t': T })),
        h('div', { class: 'pyqkind', role: 'group', 'aria-label': 'PYQs' }, [['sw', 'Question Paper', 'A whole paper'], ['cw', 'Chapterwise', 'Every chapter, all topics']].map(([k, t, d]) =>
          h('button', { type: 'button', class: 'pyqk', 'aria-pressed': String(T === k), onclick: () => { if (PYQSUB !== k) { PYQSUB = k; pyqShow(); } } }, h('strong', { text: t }), h('span', { text: d })))),
        T === 'cw' ? h('div', { class: 'pdflist', id: T + 'List' }, h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Chapter' }), ssel(T + 'Pick', 'a chapter'))) : null,
        h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Year' }), T === 'cw' ? msel(T + 'Yr', 'years') : ssel(T + 'Yr', 'a year')),
        h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Session' }), T === 'cw' ? msel(T + 'Se', 'sessions') : ssel(T + 'Se', 'a session')),
        h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Class' }), T === 'cw' ? msel(T + 'Cl', 'classes') : ssel(T + 'Cl', 'a class')),
        T === 'sw' ? h('div', { class: 'pdflist', id: T + 'List' }, h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Question paper (code)' }), ssel(T + 'Pick', 'a paper'))) : null,
        T === 'cw' ? h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Question Level' }), msel('cwLv', 'levels')) : null,
        T === 'cw' ? h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Question type' }), msel('cwTy', 'question types')) : null)),
      h('div', { class: 'stage' }, h('div', { class: 'statbar' }, h('div', { class: 'msg', id: T + 'Msg', 'aria-live': 'polite' }), h('div', { class: 'pgbtns', id: T + 'Pages', hidden: true }), h('div', { class: 'rowbtns', id: T + 'Exp', hidden: true }, ...[['docx', 'Word (editable)'], ['pdf', 'PDF'], ['pptx', 'PowerPoint (editable)']].map(([f, nm]) => h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'pdfdl', 'data-t': T, 'data-k': '', 'data-f': f, title: 'Download ' + nm, 'aria-label': 'Download ' + nm, html: FIMG[f] })), ...['xprint', 'xshare'].map(a => { const b = a === 'xprint' ? prtBtn('pyq') : shrBtn('pyq'); b.dataset.t = T; b.dataset.k = ''; return b; })), h('button', { type: 'button', class: 'btn ibtn maxbtn', 'data-act': 'max', 'aria-pressed': 'false', title: 'Maximize', 'aria-label': 'Maximize', html: ICO.max })), h('div', { class: 'pgwrap', id: T + 'Prev' })));
    if (window.ResizeObserver) new ResizeObserver(rescale).observe($('#' + T + 'Prev'));
  }
  const list = $('#' + T + 'List'); list.querySelectorAll('.hint').forEach(e => e.remove());
  let rows = pdfRows(T); const my = ++P.v;
  {
    const all = pyqOf(P.bucket), refresh = () => { P.page = 0; renderPdfTab(T); };   /* keep the picked chapter / paper; it is dropped below only if the new filters leave it with no questions */
    const cnt = {}; all.forEach(q => { if (q.y) cnt[q.y] = (cnt[q.y] || 0) + 1; });
    const ys = Object.keys(cnt).map(Number).sort((a, b) => b - a);
    P.years = P.years.filter(y => ys.includes(+y));
    const yItems = ys.map(y => [String(y), y + ' (' + cnt[y] + ')']), cItems = ['IGCSE', 'AS & A Level'].map(c => [c, c + ' (' + all.filter(q => String(q.cl) === c).length + ')']);
    const sItems = ['Feb/Mar', 'May/June', 'Oct/Nov'].map(x => [x, x + ' (' + all.filter(q => q.ss === x).length + ')']);
    if (T === 'cw') {
      mfill('cwSe', sItems, P.sess, v => { P.sess = v; refresh(); }, 'sessions', { none: 'All sessions' });
      mfill('cwYr', yItems, P.years, v => { P.years = v; refresh(); }, 'years', { none: 'All years', empty: 'No years yet' });
      mfill('cwCl', cItems, P.cls, v => { P.cls = v; refresh(); }, 'classes', { none: 'All classes' });
    } else {
      P.years = P.years.slice(0, 1); P.cls = P.cls.slice(0, 1); P.sess = P.sess.slice(0, 1);
      sfill('swSe', [['all', 'All sessions (' + all.length + ')']].concat(sItems), P.sess[0] || 'all', v => { P.sess = v === 'all' ? [] : [v]; refresh(); }, 'a session');
      sfill('swYr', [['all', 'All years (' + all.length + ')']].concat(yItems), P.years[0] || 'all', v => { P.years = v === 'all' ? [] : [v]; refresh(); }, 'a year', { empty: 'No years yet' });
      sfill('swCl', [['all', 'All classes (' + all.length + ')']].concat(cItems), P.cls[0] || 'all', v => { P.cls = v === 'all' ? [] : [v]; refresh(); }, 'a class');
    }
    if (T === 'cw') {
      mfill('cwLv', ['L1', 'L2', 'L3'].map(l => [l, l + ' (' + all.filter(q => q.d === l).length + ')']), P.lv, v => { P.lv = v; refresh(); }, 'levels', { none: 'All levels' });
      mfill('cwTy', ['MCQ', 'Subjective'].map(t => [t, t + ' (' + all.filter(q => q.t === t).length + ')']), P.types, v => { P.types = v; refresh(); }, 'question types', { none: 'All question types' });
    }
    rows = pdfRows(T);
  }
  if (P.sel && !rows.some(r => r.k === P.sel)) P.sel = null;
  if (!rows.length) { list.append(h('p', { class: 'hint', text: 'No questions here yet.' })); }
  sfill(T + 'Pick', rows.map(r => [r.k, (T === 'cw' ? r.k + ' ' : '') + r.name + ' (' + qWord(r.qs.length) + ')']), P.sel, k => { P.sel = k; P.page = 0; const r0 = rows.find(r => r.k === k); if (r0) $('.mt', $('#' + T + 'Pick')).textContent = (T === 'cw' ? r0.k + ' ' : '') + r0.name; showPdfPrev(T); }, T === 'cw' ? 'a chapter' : 'a paper', { empty: 'No questions here yet' });
  markPdfRows(T);
  showPdfPrev(T);
}
function showPdfPrev(T) {
  const P = PDFT[T], wrap = $('#' + T + 'Prev'), msg = $('#' + T + 'Msg'), pb = $('#' + T + 'Pages'); if (!wrap) return;
  wrap.textContent = ''; wrap._et = (wrap._et || 0) + 1; pb.hidden = true; pb.textContent = ''; /* a late explanation load for the old paper is dropped */
  const r = P.sel && pdfRows(T).find(x => x.k === P.sel), ex = $('#' + T + 'Exp'); if (ex) { ex.hidden = !r; ex.querySelectorAll('button:not(.wsbtn)').forEach(b => { b.dataset.k = r ? r.k : ''; }); }
  if (!r) { msg.className = 'msg'; msg.textContent = 'Click a row to preview it. The PDF, Word and PowerPoint buttons above the preview save it.'; return; }
  const pages = pdfPages(T, r).map(p => Object.assign({}, p, { key: !!P.key, exp: !!P.exp })), tok = P.tok = (P.tok || 0) + 1; let warn = false;
  const scalers = pages.map(() => { const sc = h('div', { class: 'pgscale' }); wrap.append(h('div', { class: 'pgbox' }, sc)); return sc; }); rescale();
  const say = (done) => { msg.className = 'msg' + (warn ? ' warn' : ''); msg.textContent = ''; msg.append(h('b', { text: r.name + ':' }), ' ' + qWord(r.qs.length) + ', ' + pages.length + (pages.length === 1 ? ' page.' : ' pages' + (done ? ' (scroll to see all).' : ', loading\u2026'))); };
  say(pages.length === 1);
  let i = 0;
  const step = () => { if (P.tok !== tok) return; const end = Math.min(i + 3, pages.length); for (; i < end; i++) { const L = layoutSheet(pages[i], scalers[i]); if (L.overflow) warn = true; } rescale(); say(i >= pages.length); if (i < pages.length) setTimeout(step, 0); else addKeyPages(wrap, pages); };
  step();
}

let PYQSUB = (() => { try { return localStorage.getItem('avanti-pyqsub') === 'cw' ? 'cw' : 'sw'; } catch (e) { return 'sw'; } })();
function pyqShow() {
  hideViews();
  try { localStorage.setItem('avanti-pyqsub', PYQSUB); } catch (e) { /* optional */ }
  setTabInner(PYQSUB);
  document.querySelectorAll('[data-act="tab"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === 'pyq')));
  syncQbPop('pyq');
  setTimeout(rescale, 0);
}
/* the overview menu shows which item is open: Syllabus Priority is a tab, the other three are panels inside the Question Bank */
function syncQbPop(t) {
  document.querySelectorAll('#qbPop .tb-item').forEach(b => {
    if (b.dataset.act === 'tab') { const on = b.dataset.k === t; b.setAttribute('aria-selected', String(on)); b.setAttribute('aria-checked', String(on)); }
    else if (t !== 'qb') { b.setAttribute('aria-selected', 'false'); b.setAttribute('aria-checked', 'false'); const pn = document.getElementById(b.getAttribute('data-qbpanel')); if (pn) pn.hidden = true; }
  });
  syncQbChecks();
}
/* the panel items show whether their panel is open (the Question Bank script opens and closes the panels) */
function syncQbChecks() {
  document.querySelectorAll('#qbPop .tb-item[data-qbpanel]').forEach(b => { const pn = document.getElementById(b.getAttribute('data-qbpanel')), on = !!(pn && !pn.hidden); b.setAttribute('aria-checked', String(on)); b.setAttribute('aria-selected', String(on)); });
}
function setTab(t) {
  if (t === 'pyq') { pyqShow(); return; }
  const pv = $('#viewPyq'); if (pv) pv.hidden = true;
  setTabInner(t);
}
function hideViews() { ['Qb', 'Lib', 'Cw', 'Sw', 'Syl', 'Pyq', 'Portal'].forEach(n => { const e = $('#view' + n); if (e) e.hidden = true; }); const cp = document.getElementById('qbClassPop'); if (cp) { const x = cp.querySelector('.qb-pclose'); if (x) x.click(); else cp.remove(); } /* a Dashboard pop-up never stays open behind another tab */ }
function setTabInner(t) {
  hideViews(); const v = $('#view' + ({ qb: 'Qb', lib: 'Lib', cw: 'Cw', sw: 'Sw', syl: 'Syl' })[t]); if (v) v.hidden = false;
  if (window.AvantiPortal) window.AvantiPortal.leave();
  document.querySelectorAll('[data-act="tab"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === t)));
  syncQbPop(t);
  if (t === 'qb') qbInit(); else if (t === 'syl') renderSyl(); else if (t === 'cw' || t === 'sw') ensureDpp().then(() => { renderPdfTab(t); setTimeout(rescale, 0); }, () => dppFail(t)); else ensureDpp().then(() => { renderLib(); setTimeout(rescale, 0); }, () => dppFail(t));
  setTimeout(rescale, 0);
}

/* ---------- preview ---------- */
function rescale() {
  ['#pgwrap', '#libPrev', '#cwPrev', '#swPrev'].forEach(id => {
    const wrap = $(id); if (!wrap || !wrap.clientWidth) return;
    const cs = getComputedStyle(wrap), k = Math.min(1.35, (wrap.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)) / SHEET_W);
    wrap.querySelectorAll('.pgbox').forEach(bx => { const sc = $('.pgscale', bx); if (!sc) return; sc.style.transform = 'scale(' + k + ')'; bx.style.height = Math.ceil(SHEET_H * k) + 'px'; bx.style.width = Math.floor(SHEET_W * k) + 'px'; bx.style.margin = '0 auto'; });
  });
}

/* ---------- rail (settings) ---------- */

/* ---------- actions ---------- */
function onAct(e) {
  if (e.type === 'click' && e.target.isConnected && !e.target.closest('.msel')) document.querySelectorAll('.msel.open').forEach(x => { x.classList.remove('open'); x.querySelector('.mbtn').setAttribute('aria-expanded', 'false'); });
  if (e.type === 'click' && !e.target.closest('#qbInfoBtn')) { const pp = $('#qbPop'); if (pp && !pp.hidden) { if (e.target.closest('#qbPop')) { const vq = $('#viewQb'); if (vq && vq.hidden) setTab('qb'); setTimeout(syncQbChecks, 0); } pp.hidden = true; const ib = $('#qbInfoBtn'); if (ib) ib.setAttribute('aria-expanded', 'false'); } }
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act, k = t.dataset.k;
  if (e.type === 'change' && t.tagName !== 'INPUT' && t.tagName !== 'SELECT') return;
  if (e.type === 'click' && t.tagName === 'INPUT') return;
  const gate = { lexp: k, pdfdl: t.dataset.f || 'pdf', xprint: 'print', xshare: 'share', pdfshare: 'share' }[a];
  if (gate && !need(gate)) return;
  switch (a) {
    case 'lexp': exportLib(k); break;
    case 'theme': themeToggle(); break;
    case 'guide': guideOpen(); break;
    case 'guideclose': guideClose(); break;
    case 'guideback': if (e.target === t) guideClose(); break;
    case 'qbinfo': { const pp = $('#qbPop'), op = pp.hidden; pp.hidden = !op; t.setAttribute('aria-expanded', String(op)); if (op) syncQbChecks(); break; }
    case 'tab': setTab(k); break;
    case 'pyqsub': PYQSUB = k === 'cw' ? 'cw' : 'sw'; pyqShow(); break;
    case 'libkind': LS.kind = k; LS.idk = ''; LS.chTouched = false; renderLib(); break;
    case 'oos': { OOS.ex = k === 'ex'; try { localStorage.setItem('oosEx2', OOS.ex ? '1' : '0'); } catch (e) {} applyOos(); LS.idk = ''; syncOos(); renderLib(); toast(OOS.ex ? 'Out-of-syllabus questions excluded' : 'Out-of-syllabus questions included'); break; }
    case 'pdfex': { const T = t.dataset.t; PDFT[T].bucket = k; PDFT[T].sel = null; PDFT[T].page = 0; renderPdfTab(T); break; }
    case 'pdfrow': { const T = t.dataset.t; PDFT[T].sel = k; PDFT[T].page = 0; markPdfRows(T); showPdfPrev(T); break; }
    case 'max': toggleMax(t); break;
    case 'pdfshare': { const T = t.dataset.t, r = pdfRows(T).find(x => x.k === k); if (r) { const mk = extra => () => { const pages = pdfPages(T, r).map(p => Object.assign({}, p, { key: !!PDFT[T].key, exp: !!PDFT[T].exp })); doExport('pdf', Object.assign({ pages, file: r.file }, extra)); }; shareMenu(t, { title: r.name, drive: mk({ drive: true }), download: mk({}) }); } break; }
    case 'pdfpage': { const T = t.dataset.t; PDFT[T].page = +k; showPdfPrev(T); break; }
    case 'pdfdl': { const T = t.dataset.t, r = pdfRows(T).find(x => x.k === k); if (r && T === 'cw' && t.dataset.f === 'pptx') { exportCwPptx(r); break; } if (r) { const pages = pdfPages(T, r).map(p => Object.assign({}, p, { key: !!PDFT[T].key, exp: !!PDFT[T].exp })); doExport(t.dataset.f || 'pdf', { pages, file: r.file }); } break; }
    case 'libpub': { const n = LS.pubs.includes(k) ? LS.pubs.filter(x => x !== k) : LS.pubs.concat(k); if (!n.length) { toast('Keep at least one source'); break; } LS.pubs = PUBS.filter(x => n.includes(x)); LS.idk = ''; renderLib(); break; }
    case 'liblv': { const n = LS.lv.includes(k) ? LS.lv.filter(x => x !== k) : LS.lv.concat(k); if (!n.length) { toast('Keep at least one level'); break; } LS.lv = ['L1', 'L2', 'L3'].filter(x => n.includes(x)); renderLib(); break; }
    case 'mall': case 'mnone': { const boxe = $('#' + k); boxe.querySelectorAll('.ml input').forEach(x => { x.checked = a === 'mall'; }); boxe.querySelector('.ml input') ? boxe.querySelector('.ml input').dispatchEvent(new Event('change')) : 0; break; }
    case 'libshow': showLibPrev(); break;
    case 'xprint': { const g = pdfSource(t); if (g) printFrom(g.get); break; }
    case 'xshare': { const g = pdfSource(t); if (g) shareFrom(t, g.title, g.get); break; }
    case 'libshuffle': { LS.seed = 1 + Math.floor(Math.random() * 2147483000); showLibPrev(); toast('New set of questions'); break; }
    case 'libswap': { const r = dppCur(); if (dppSwap(r, k)) showLibPrev(); else toast('No other question can replace this one'); break; }
    case 'libpage': LS.page = +k; showLibPrev(); break;
    case 'pdfkey': PDFT[t.dataset.t].key = t.checked; if (PDFT[t.dataset.t].sel) showPdfPrev(t.dataset.t); break;
    case 'pdfexp': PDFT[t.dataset.t].exp = t.checked; if (PDFT[t.dataset.t].sel) showPdfPrev(t.dataset.t); break;
    case 'libexp': LS.exp = $('#libExpl').checked; if (LS.shown) showLibPrev(); break;
    case 'libkey': LS.key = $('#libKey').checked; if (LS.shown) showLibPrev(); break;
  }
}

/* ---------- export ---------- */
function exportHost() { const hst = h('div', { 'data-exphost': '', style: 'position:absolute;left:-10000px;top:0;width:794px;background:#fff' }); document.body.append(hst); return hst; }
async function shot(node, scale) {
  await document.fonts.ready;
  await Promise.all([...node.querySelectorAll('img')].map(im => (im.decode ? im.decode().catch(() => {}) : Promise.resolve())));
  return window.html2canvas(node, { scale, backgroundColor: '#ffffff', logging: false, useCORS: true, onclone: d => { try { const ks = d.createElement('style'); ks.textContent = '.katex-mathml{display:none!important}'; d.head.appendChild(ks); } catch (e) { /* ignore */ } const x = d.querySelector('[data-exphost]'); if (x) { x.style.left = '0px'; x.style.top = '0px'; x.style.zIndex = '-1'; } } });
}
const ansText = q => (q.a || '\u2014').replace(/\\[()\[\]]/g, '');
const fname = (p, ext) => (p.file || p.title || 'sheet').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') + ext;
/* ---------- Share menu ---------- */
const DASH_URL = location.origin + location.pathname;
function closeShare() { const m = document.getElementById('shareMenu'); if (m) m.remove(); document.removeEventListener('click', closeShareOut, true); document.removeEventListener('keydown', closeShareKey, true); }
function closeShareOut(e) { const m = document.getElementById('shareMenu'); if (m && !m.contains(e.target)) closeShare(); }
function closeShareKey(e) { if (e.key === 'Escape') closeShare(); }
function shareMenu(btn, o) {
  if (!need('share')) return;
  closeShare();
  const text = o.title + ' (PhyNik Physics Dashboard)', link = o.url || DASH_URL, full = text + '\n' + link;
  const item = (ico, label, attrs) => h(attrs.href ? 'a' : 'button', Object.assign({ class: 'smi', type: attrs.href ? undefined : 'button' }, attrs), h('span', { class: 'smic', html: ico }), h('span', { text: label }));
  const m = h('div', { id: 'shareMenu', class: 'smenu', role: 'menu' },
    h('div', { class: 'smh', text: 'Share ' + o.title }),
    item(ICO.chat, 'WhatsApp', { href: 'https://wa.me/?text=' + encodeURIComponent(full), target: '_blank', rel: 'noopener', onclick: closeShare }),
    item(ICO.mail, 'Email (Gmail)', { href: 'https://mail.google.com/mail/?view=cm&fs=1&su=' + encodeURIComponent(text) + '&body=' + encodeURIComponent(full), target: '_blank', rel: 'noopener', onclick: closeShare }),
    item(ICO.link, 'Copy link', { onclick: async () => { closeShare(); try { await navigator.clipboard.writeText(full); toast('Link copied'); } catch (e) { toast('Could not copy. Select and copy: ' + link); } } }),
    o.print ? item(ICO.print, 'Print', { onclick: () => { closeShare(); o.print(); } }) : null,
    o.download ? item(FIMG.pdf.replace('width="36" height="36"', 'width="20" height="20"'), 'Download PDF', { onclick: () => { closeShare(); o.download(); } }) : null,
    h('div', { class: 'smn', text: 'The link opens the dashboard. To print or send the file itself, download it first.' }));
  document.body.append(m);
  const r = btn.getBoundingClientRect(), mw = m.offsetWidth;
  m.style.top = Math.min(window.innerHeight - m.offsetHeight - 8, r.bottom + 6) + 'px';
  m.style.left = Math.max(8, Math.min(window.innerWidth - mw - 8, r.right - mw)) + 'px';
  setTimeout(() => { document.addEventListener('click', closeShareOut, true); document.addEventListener('keydown', closeShareKey, true); }, 0);
}
function toggleMax(btn) {
  const st = btn.closest('.stage'); if (!st) return;
  const on = !st.classList.contains('maxed'); st.classList.toggle('maxed', on); document.body.classList.toggle('hasmax', on);
  btn.innerHTML = on ? ICO.min : ICO.max; btn.title = on ? 'Close (Esc)' : 'Maximize'; btn.setAttribute('aria-label', on ? 'Close full screen' : 'Maximize'); btn.setAttribute('aria-pressed', String(on));
  setTimeout(rescale, 0); setTimeout(rescale, 150);
}
function closeMax() { const st = document.querySelector('.stage.maxed'); if (!st) return; const b = st.querySelector('[data-act="max"]'); if (b) toggleMax(b); }
async function doExport(kind, p0) {
  if (!need(kind)) return;
  if (!p0) return;
  const pages = p0.pages ? p0.pages : [p0], pk = p0 && p0.pages ? p0 : pages[0];
  if (!pages.length || !pages[0].qs.length) { toast('Add some questions first'); return; }
  if (!downloads) { toast('Downloads are not available in this view'); return; }
  expBusy(1);
  const multi = pages.length > 1, file = fname(pk, '.' + kind);
  toast('Preparing ' + kind.toUpperCase() + '\u2026');
  if (kind !== 'pdf') {
    try {
      const blob = await buildEditable(kind, pages.map(p => Object.assign({}, p, { key: p.key }, kind === 'docx' ? { cols: 2 } : {})));
      await downloads.save({ filename: file, data: blob });
      toast('Saved ' + file);
    } catch (e) {
      if (e && e.code === 'declined') toast('Download cancelled');
      else toast('Export failed: ' + (e && e.message ? e.message : 'try again'));
    } finally { expBusy(-1); }
    return;
  }
  const hst = exportHost();
  try {
    await Promise.all([loadScript(CDN.h2c), kind === 'pdf' ? loadScript(CDN.pdf) : kind === 'docx' ? loadScript(CDN.docx) : loadScript(CDN.pptx)]);
    const pdf = kind === 'pdf' ? new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }) : null, items = [];
    for (let k = 0; k < pages.length; k++) {
      const p = pages[k]; if (multi) toast('Preparing page ' + (k + 1) + ' of ' + pages.length + '\u2026');
      const L = layoutSheet(p, hst, p.maxFs ? FIT_MIN : MAN_MIN); L.sheet.style.boxShadow = 'none';
      if (pdf) { const c = await shot(L.sheet, 2.5); if (k) pdf.addPage(); pdf.addImage(c.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297); }
      else { const imgs = []; for (const nd of L.nodes) { const c = await shot(nd, kind === 'pptx' ? (multi ? 3 : 4) : (multi ? 2 : 3)); imgs.push({ c, w: nd.offsetWidth, h: nd.offsetHeight }); } items.push({ p, L: { groups: L.groups.map(g => g.map(n => L.nodes.indexOf(n))), gap: L.gap }, imgs }); }
      L.sheet.remove();
    }
    let blob;
    if (pdf) {
      const kp = pages.filter(p => p.key);
      if (kp.length) for (const ks of keySheets(kp, hst)) { const c2 = await shot(ks, 2); pdf.addPage(); pdf.addImage(c2.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297); ks.remove(); }
      const ep = pages.filter(p => p.exp);
      if (ep.length) { const items = await explItems(ep); if (!items.length) toast('None of these questions has an explanation yet'); else for (const es of explSheets(items, ep[0], hst)) { const c3 = await shot(es, 2); pdf.addPage(); pdf.addImage(c3.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297); es.remove(); } }
      blob = pdf.output('blob');
    }
    if (pk.onBlob) await pk.onBlob(blob, file); else { await downloads.save({ filename: file, data: blob }); toast('Saved ' + file); }
  } catch (e) {
    if (pk.onFail) pk.onFail(e);
    if (e && e.code === 'declined') toast('Download cancelled');
    else toast('Export failed: ' + (e && e.message ? e.message : 'try again'));
  } finally { hst.remove(); expBusy(-1); }
}
/* Explanation toggle: full solutions come from qb/data/sol.json, shown after the answer key on their own pages */
let SOLT = null;
function loadSolsT() { if (!SOLT) SOLT = fetch('qb/data/sol.json').then(r => { if (!r.ok) throw new Error('sol'); return r.json(); }).catch(() => { SOLT = null; return {}; }); return SOLT; }
async function explItems(pages) {
  const m = await loadSolsT(), out = [];
  pages.forEach(p => { const lab = String(p.badge || p.title).replace(/\s*\u00b7\s*Page \d+ of \d+$/, ''); p.qs.forEach((q, i) => { const sv = m[q.i]; if (!sv) return; const t = typeof sv === 'string' ? sv : sv.t; if (!t || !String(t).trim()) return; out.push({ n: i + 1 + (p.start || 0), lab, text: String(t), f: typeof sv === 'string' ? null : (sv.f || null) }); }); });
  return out;
}
async function explForQs(qs) {
  const m = await loadSolsT(), out = [];
  for (let k = 0; k < qs.length; k++) { const sv = m[qs[k].i]; if (!sv) continue; const t = typeof sv === 'string' ? sv : sv.t; if (!t || !String(t).trim()) continue; let fig = null; const f = typeof sv === 'string' ? null : sv.f; if (f && f.svg) { try { fig = await figPng(f); } catch (e) { /* skip the picture */ } } out.push({ n: k + 1, text: String(t), fig }); }
  return out;
}
(function () { const st = document.createElement('style'); st.textContent = '.tglrow{display:flex;flex-wrap:wrap;gap:8px 24px;align-items:center;margin:4px 0 14px}.tglrow .tgl-hl{margin:0!important;padding:0 0 0 0!important;background:transparent!important;border:0!important;box-shadow:none!important;min-height:0!important;border-radius:0!important;font-weight:600}.tglrow .tgl-hl input{left:0!important}.gd-note{border-left:4px solid var(--accent,#0e6b84);background:var(--accent-soft,#dbeef3);padding:10px 14px;border-radius:8px;margin:0 0 14px;font-weight:600}'; document.head.append(st); })();
const keyLine = p => p.qs.map((q, i) => (i + 1 + (p.start || 0)) + '-' + (window.MathDoc ? window.MathDoc.plainText(q.a || '\u2014') : ansText(q))).join('    ');
/* figures: SVG -> PNG so Word and PowerPoint can hold them */
async function figPng(f) {
  const img = new Image(); img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(f.svg);
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  const w = f.w || img.width || 300, hh = f.h || img.height || 200, c = document.createElement('canvas'); c.width = w * 2; c.height = hh * 2;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL('image/png'), data = await new Promise(r => c.toBlob(b => b.arrayBuffer().then(x => r(new Uint8Array(x))), 'image/png'));
  return { w, h: hh, data, dataUrl };
}
async function buildEditable(kind, pages) {
  const ep0 = pages.filter(p => p.exp), eItems = ep0.length ? await explItems(ep0) : [], eLab = new Set(eItems.map(x => x.lab)).size > 1;
  for (const e of eItems) { e.lab = eLab ? e.lab : ''; e.fig = null; if (e.f && e.f.svg) { try { e.fig = await figPng(e.f); } catch (x) { /* skip the picture */ } } }
  if (pages.length > 1 && pages[0].kind === 'test') pages = [Object.assign({}, pages[0], { qs: [].concat(...pages.map(p => p.qs)), start: 0, pageOf: '' })];
  await Promise.all([loadScript('mathdoc.b3.js'), loadScript('office.b9.js'), loadScript(CDN.zip), kind === 'docx' ? loadScript(CDN.docx) : loadScript(CDN.pptx)]);
  const figs = {};
  for (const p of pages) for (const q of p.qs) if (q.f && !figs[q.i]) { try { figs[q.i] = await figPng(q.f); } catch (e) { /* skip the picture */ } }
  let logo = null; try { const rs = await fetch('img/ankit-logo-dark.png'); if (rs.ok) { const bl = await rs.blob(), bm = await createImageBitmap(bl); logo = { data: new Uint8Array(await bl.arrayBuffer()), w: bm.width, h: bm.height, dataUrl: await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(bl); }) }; } } catch (e) { /* no logo file: skip */ }
  const H = { CHMAP, DIFF, tagText, keyLine, figs, matchParts, expl: eItems, logo };
  return kind === 'docx' ? window.OfficeDoc.buildDocx(window.docx, window.JSZip, pages, H) : window.OfficeDoc.buildPptx(window.PptxGenJS, window.JSZip, pages, H);
}


function renderSyl() {}

/* ---------- boot ---------- */
/* ---------- light / dark toggle ---------- */
const THEME_KEY = 'avanti-teacher-theme';
function themeNow() { const a = document.documentElement.getAttribute('data-theme'); if (a === 'dark' || a === 'light') return a; try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; } }
function themeApply(m) {
  document.documentElement.setAttribute('data-theme', m);
  const b = document.getElementById('themeBtn');
  if (b) { b.setAttribute('aria-pressed', String(m === 'dark')); const to = m === 'dark' ? 'light' : 'dark'; b.title = 'Switch to ' + to + ' mode'; b.setAttribute('aria-label', 'Switch to ' + to + ' mode'); b.innerHTML = m === 'dark' ? THEME_ICONS.sun : THEME_ICONS.moon; }
}
const THEME_ICONS = {
  sun: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
};
function themeInit() { let m = null; try { m = localStorage.getItem(THEME_KEY); } catch (e) { m = null; } if (m === 'dark' || m === 'light') document.documentElement.setAttribute('data-theme', m); themeApply(themeNow()); }
function themeToggle() { const m = themeNow() === 'dark' ? 'light' : 'dark'; themeApply(m); try { localStorage.setItem(THEME_KEY, m); } catch (e) { /* optional */ } }
const GUIDE_HTML = () => `
<p class="gd-lead">PhyNik holds Cambridge Physics questions (IGCSE and AS &amp; A Level) with answers, one paper at a time. There is no sign-in and nothing to install.</p>
<nav class="gd-toc" aria-label="Guide sections"><a href="#gd-qb">Dashboard</a><a href="#gd-card">Question cards</a><a href="#gd-exp">Download and share</a><a href="#gd-cnt">Counts</a><a href="#gd-pyq">PYQs</a><a href="#gd-tips">Tips</a></nav>
<h3 id="gd-qb">1. Dashboard</h3>
<p>All questions in one list, grouped by chapter. Use <b>Find questions</b> to narrow the list. The filters work in this order:</p>
<ul>
<li><b>Chapters</b> first (pick one or more), then <b>Question type</b> (MCQ or Subjective).</li>
<li>Then <b>Year</b>, <b>Session</b> (Feb/Mar, May/June, Oct/Nov), <b>Class</b> (IGCSE or AS &amp; A Level) and <b>Question Level</b> (L1 easy, L2 medium, L3 hard).</li>
<li>You can also search by words or by question ID, for example <b>0625/21/M/J/25-3</b>. <b>Reset filters</b> clears everything.</li>
<li><b>Show all answers</b> and <b>Hide options</b> change how the whole page looks. <b>Attention</b> shows only the questions that carry an attention note.</li>
</ul>
<h3 id="gd-card">2. Question cards</h3>
<ul>
<li>The top row shows the <b>question ID</b> (blue for the extended MCQ papers 21, 22 and 23, red for the extended theory papers 41, 42 and 43) and the <b>level</b> (L1 green, L2 orange, L3 red).</li>
<li>The eye icon shows the answer. The book icon opens the solution when there is one. The menu icon shows the chapter, the question type and the ID. Tap the ID to copy it.</li>
<li>A red <b>Attention</b> tag means the question needs checking. The note under the tag says what to check.</li>
<li>The ID is the paper code plus the question number: <b>0625/21/M/J/25-3</b> is question 3 of paper 0625/21, May/June 2025. M/J is May/June, O/N is Oct/Nov and F/M is Feb/Mar. Papers 11 to 13 are core MCQ, 21 to 23 extended MCQ, 31 to 33 core theory and 41 to 43 extended theory. The last two digits are the year.</li>
</ul>
<h3 id="gd-exp">3. Download and share</h3>
<ul>
<li>Tick the questions you want (or use <b>Select all filtered</b>). The four icons at the top left then switch on: <b>PDF</b>, <b>Word</b> (editable), <b>PowerPoint</b> (one question per slide) and <b>Share</b>.</li>
<li>Turn on <b>Answer Key</b> to add the answers on a separate page, and <b>Explanation</b> to add solutions.</li>
</ul>
<h3 id="gd-cnt">4. Counts (bar-chart icon, top right)</h3>
<ul>
<li><b>Physics Bank: Question Counts</b> shows how many questions there are in total and by class. Click <b>All questions</b> to see every question, or a class (for example <b>IGCSE</b>) to see its chapters with their question counts; click a chapter there to see its questions.</li>
<li><b>Chapter-wise Count</b> shows each chapter with its L1, L2 and L3 counts and a total. Click a chapter row to see all of that chapter's questions (other filters are cleared).</li>
<li>The <b>&times;</b> at the top right closes a count box.</li>
</ul>
<h3 id="gd-pyq">5. PYQs</h3>
<p>The same questions as printable sheets. Use the switch at the top:</p>
<ul>
<li><b>Question Paper</b>: pick a year, a session and a class, then a paper code. You get the whole paper in question order.</li>
<li><b>Chapterwise</b>: pick a chapter first, then narrow by year, session, class, level and question type.</li>
<li>The page preview is live. Turn on <b>Answer Key</b> or <b>Explanation</b> and use the PDF, Word, PowerPoint, print and share buttons above the preview.</li>
</ul>
<h3 id="gd-tips">Tips</h3>
<ul>
<li>The <b>moon/sun icon</b> (top right) switches between light and dark mode.</li>
<li>On a phone everything works too: the tabs sit under the logo.</li>
<li>Formulas are written in proper notation. If one looks broken, refresh the page once.</li>
<li>The footer shows the website version.</li>
</ul>
<p class="gd-foot">Built by Nikhil.</p>`;

function guideOpen() {
  let m = document.getElementById('guideModal');
  if (m) m.remove();
  m = h('div', { class: 'gd-back', id: 'guideModal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Site guide', 'data-act': 'guideback' },
    h('div', { class: 'gd-card' },
      h('div', { class: 'gd-top' }, h('h2', { text: 'How to use this dashboard' }), h('button', { type: 'button', class: 'gd-x', 'data-act': 'guideclose', 'aria-label': 'Close guide', html: '&times;' })),
      h('div', { class: 'gd-body', html: GUIDE_HTML() })));
  document.body.append(m);
  m.querySelectorAll('.gd-toc a').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); const t = m.querySelector(a.getAttribute('href')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  const app = document.getElementById('app'); if (app) app.inert = true; /* the page behind the guide can't be reached by Tab or a screen reader */
  /* Tab and Shift+Tab stay inside the guide */
  m.addEventListener('keydown', e => { if (e.key !== 'Tab') return; const f = [...m.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null); if (!f.length) return;
    const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } });
  const x = m.querySelector('.gd-x'); if (x) x.focus();
}
function guideClose() { const m = document.getElementById('guideModal'); if (m) m.remove(); const app = document.getElementById('app'); if (app) app.inert = false; const b = document.getElementById('guideBtn'); if (b) b.focus(); }
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('guideModal')) { guideClose(); return; }
  const pp = document.getElementById('qbPop'); if (pp && !pp.hidden) { pp.hidden = true; const ib = document.getElementById('qbInfoBtn'); if (ib) { ib.setAttribute('aria-expanded', 'false'); ib.focus(); } }
});
function buildShell() {
  const root = $('#app');
  root.innerHTML = '';
  const tb = (k, text, on) => h('button', { type: 'button', class: 'tb', 'data-act': 'tab', 'data-k': k, 'aria-pressed': String(!!on), text });
  root.append(
    h('div', { class: 'shell' },
      h('header', { class: 'topbar' },
        h('div', { class: 'tb-head' }, h('img', { class: 'tb-logo', src: 'img/ankit-logo.png', alt: 'PhyNik', width: 145, height: 51 }), h('h1', { class: 'tb-title', text: 'PhyNik', style: 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap' }), null),
        h('button', { type: 'button', class: 'tb-theme', id: 'themeBtn', 'data-act': 'theme', 'aria-pressed': 'false' }),
        h('button', { type: 'button', class: 'tb-theme tb-guide', id: 'guideBtn', 'data-act': 'guide', title: 'Guide: what is in this site', 'aria-label': 'Guide: what is in this site', html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.3a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1.1-1.4 2.1"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/></svg>' }),
        h('button', { type: 'button', class: 'tb-theme tb-info', id: 'qbInfoBtn', 'data-act': 'qbinfo', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: 'Question Bank overview', 'aria-label': 'Question Bank overview', html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>' }),
        h('div', { class: 'tb-pop', id: 'qbPop', hidden: true, role: 'menu' }, [['heroov', 'Physics Bank: Question Counts'], ['overview', 'Chapter-wise Count']].map(([k, t]) => k === 'syl' ? h('button', { type: 'button', class: 'tb-item', role: 'menuitemradio', 'aria-selected': 'false', 'aria-checked': 'false', 'data-act': 'tab', 'data-k': 'syl', text: t }) : h('button', { type: 'button', class: 'tb-item', role: 'menuitemradio', 'aria-selected': 'false', 'aria-checked': 'false', 'data-qbpanel': k, text: t }))),
        h('nav', { class: 'tb-menu' }, tb('qb', 'Dashboard', true), tb('pyq', 'PYQs'))),
      h('main', { class: 'main' },
        h('div', { id: 'viewQb', class: 'qbhost' }),
        h('div', { id: 'viewLib', class: 'make', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewPyq', class: 'pyqpick', hidden: true }),
        h('div', { id: 'viewCw', class: 'make', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewSw', class: 'make', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewSyl', class: 'sy-wrap', hidden: true }),
        h('div', { id: 'viewPortal', class: 'pt-wrap', hidden: true })),
      h('footer', { class: 'app-foot', id: 'appFoot' },
        h('span', { class: 'af-brand' }, 'Made with ', h('span', { class: 'af-heart', style: 'color:#e11d48', 'aria-label': 'love', text: '\u2665' }), ' by Nikhil'),
        h('span', { class: 'af-ver', id: 'appFootSite' }),
        h('span', { class: 'af-ver', id: 'appFootVer', text: 'Version ' + SITE_VERSION }),
        h('span', { class: 'af-link', id: 'appFootLink' }))));
  if (!document.getElementById('app-fit-css')) { const fs2 = document.createElement('style'); fs2.id = 'app-fit-css'; fs2.textContent = 'html,body{max-width:100%;overflow-x:hidden;overscroll-behavior-x:none}.tb-menu{max-width:100%}.katex-mathml{max-width:1px!important;overflow:hidden!important}'; document.head.appendChild(fs2); }
  if (!document.getElementById('app-foot-css')) { const st = document.createElement('style'); st.id = 'app-foot-css'; st.textContent = '.app-foot{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px 14px;margin:28px auto 0;padding:14px 16px 20px;border-top:1px solid var(--color-border-line,rgba(128,128,128,.28));font-size:12px;line-height:1.4;letter-spacing:.02em;color:var(--color-fg-muted,#6b807f)}.app-foot .af-brand{font-weight:600;order:3;flex-basis:100%;text-align:center;margin-top:8px}.app-foot .af-ver::before{display:none!important}.app-foot .af-ver:not(:empty)::before,.app-foot .af-link:not(:empty)::before{content:"|";margin-right:14px;opacity:.45}.app-foot .qb-sstat-link{font:inherit;color:inherit;text-decoration:none;cursor:pointer;border-bottom:1px dotted currentColor;padding:0}.app-foot .qb-sstat-link:hover{color:var(--color-fg,#111);border-bottom-style:solid}'; document.head.append(st); }
}
function buildLib() {
  if (!document.getElementById('dpp-css')) { const st = document.createElement('style'); st.id = 'dpp-css'; st.textContent = '.dslide{width:100%;margin:6px 0 2px;accent-color:#166b67;cursor:pointer}.dslide:disabled{opacity:.4;cursor:not-allowed}.dticks{display:flex;justify-content:space-between;gap:6px;font-size:12px;font-weight:600;color:var(--muted,#6b807f)}.dticks span:nth-child(2){text-align:center}.dticks span:last-child{text-align:right}.dswap{position:absolute;top:1.9em;left:0;z-index:3;width:23px;height:23px;display:flex;align-items:center;justify-content:center;font:700 13px/1 system-ui,sans-serif;padding:0;border-radius:999px;border:1px solid #c9e3e2;background:#fff;color:#1f9590;cursor:pointer;opacity:.85}.dswap:hover{opacity:1;background:#e8fcfb}'; document.head.append(st); }
  const slide = (id, label, key, ticks) => h('div', { class: 'fld' }, h('span', { class: 'lbl', text: label }),
    h('input', { type: 'range', class: 'dslide', id, min: '1', max: '3', step: '1', value: String(LS[key]), 'aria-label': label, onchange: e => { LS[key] = +e.target.value; renderLib(); }, oninput: e => { LS[key] = +e.target.value; } }),
    h('div', { class: 'dticks', 'aria-hidden': 'true' }, ticks.map(t => h('span', { text: t }))), h('p', { class: 'hint', id: id === 'toughSl' ? 'toughHint' : 'mixHint' }));
  return h('div', { id: 'viewLib', class: 'make' },
    h('div', { class: 'rail' },
      h('div', { class: 'card' },
        h('h3', { text: 'Topicwise DPPs (After every class)' }),
        h('p', { class: 'hint', id: 'libNote' }),
        h('div', { class: 'tglrow' },
          h('label', { class: 'pick1 tgl tgl-hl' }, h('input', { type: 'checkbox', role: 'switch', id: 'libKey', 'data-act': 'libkey' }), h('span', { class: 'tgl-track', 'aria-hidden': 'true' }), h('span', { text: 'Answer Key' })),
          h('label', { class: 'pick1 tgl tgl-hl' }, h('input', { type: 'checkbox', role: 'switch', id: 'libExpl', 'data-act': 'libexp' }), h('span', { class: 'tgl-track', 'aria-hidden': 'true' }), h('span', { text: 'Explanation' }))),
        h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Chapters (tick one or many)' }), msel('libCh', 'chapters')),
        h('div', { class: 'fld', id: 'fldDpp' }, h('span', { class: 'lbl', id: 'lblDpp', text: 'Subtopics (tick one or many)' }), msel('libDpp', 'subtopics')),
        h('div', { class: 'fld', id: 'fldSrc' }, h('span', { class: 'lbl', text: 'Source (tick one or many)' }), msel('libSrc', 'sources')),
        h('div', { class: 'fld', id: 'fldYear', hidden: true }, h('span', { class: 'lbl', text: 'Year of the exam (leave blank for all)' }), msel('libYr', 'years')),
        slide('toughSl', 'Toughness of the DPP', 'tough', ['1 · Easy', '2 · Mixed', '3 · Tough']),
        slide('mixSl', 'Practice questions or PYQs', 'mixv', ['N · Practice', 'O · 50 : 50', 'P · PYQ']),
        oosBox())),
    h('div', { class: 'rail' },
      h('div', { class: 'stage' }, h('div', { class: 'statbar' }, h('div', { class: 'msg', id: 'libMsg', 'aria-live': 'polite' }),
        h('div', { class: 'pgbtns', id: 'libPages', hidden: true }),
        h('div', { class: 'rowbtns', id: 'libExp' },
          h('button', { type: 'button', class: 'btn', 'data-act': 'libshuffle', title: 'Pick a different set of questions for the same settings', text: '\u21bb Shuffle' }),
          h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'lexp', 'data-k': 'docx', title: 'Download Word (editable)', 'aria-label': 'Download Word (editable)', html: FIMG.docx }),
          h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'lexp', 'data-k': 'pdf', title: 'Download PDF', 'aria-label': 'Download PDF', html: FIMG.pdf }),
          h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'lexp', 'data-k': 'pptx', title: 'Download PowerPoint (editable)', 'aria-label': 'Download PowerPoint (editable)', html: FIMG.pptx }),
          prtBtn('lib'), shrBtn('lib'))),
        h('div', { class: 'pgwrap', id: 'libPrev' }))));
}
/* Whole shift paper: take every question of one past paper, in paper order, as a 3 hour test */

let dppP = null, listeners = false;
/* the question data did not load: say so in the open view (not the hidden library) and offer a retry */
function dppFail(t) {
  const v = $('#view' + ({ lib: 'Lib', cw: 'Cw', sw: 'Sw' })[t] || 'Lib'); if (!v || v.hidden) return;
  v.textContent = ''; v.append(h('div', { class: 'hint', role: 'alert', style: 'padding:32px 16px;text-align:center' }, h('p', { text: 'The questions could not load. Check your connection and try again.' }),
    h('button', { type: 'button', class: 'btn', onclick: () => { v.textContent = ''; v.append(h('p', { class: 'hint', text: 'Loading\u2026' })); if ((t === 'cw' || t === 'sw') && PYQSUB === t) pyqShow(); else setTabInner(t); } }, 'Try again')));
}
function ensureDpp() {
  if (dppP) return dppP;
  return (dppP = (async () => {
    const [bank, css] = await Promise.all([loadBank(), document.getElementById('kcss') ? Promise.resolve(null) : fetch('katex.css').then(r => r.text())]);
    if (css) { const st = h('style', { text: css }); st.id = 'kcss'; document.head.append(st); }
    BANK = bank; BANK.all = bank.qs.slice(); bank.qs.forEach(q => BYID.set(q.i, q)); bank.chapters.forEach(c => CHMAP.set(c.c, c));
    initPubs(); applyOos();
    KATEX_P = loadScript(CDN.katex).then(() => loadScript(CDN.auto)).then(() => { if (LS.shown) showLibPrev(); PDFT.cw.v++; PDFT.sw.v++; ['cw', 'sw'].forEach(t => { if ($('#' + t + 'List') && !$('#view' + (t === 'cw' ? 'Cw' : 'Sw')).hidden) renderPdfTab(t); }); }).catch(() => {});
    const lib = $('#viewLib'); const wasLib = lib.hidden;
    const nl = buildLib();
    nl.hidden = wasLib; lib.replaceWith(nl);
    if (window.ResizeObserver) { const ro = new ResizeObserver(rescale); ro.observe($('#libPrev')); }
    renderLib();
  })().catch(e => { dppP = null; const m = $('#viewLib'); if (m) { m.textContent = ''; m.append(h('p', { class: 'hint', text: 'The library did not load. Refresh the page.' })); } throw e; }));
}
function boot() {
  buildShell(); themeInit();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMax(); }); document.addEventListener('click', onAct); document.addEventListener('change', onAct);
  /* the filter lists (tick-box and one-choice) close with Escape, which returns focus to their button, and close when focus moves out of them */
  const mselClose = (m, focusBtn) => { m.classList.remove('open'); const b = m.querySelector('.mbtn'); if (b) { b.setAttribute('aria-expanded', 'false'); if (focusBtn) b.focus({ preventScroll: true }); } };
  document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; const m = document.activeElement && document.activeElement.closest && document.activeElement.closest('.msel.open'); if (m) { e.preventDefault(); mselClose(m, true); } });
  document.addEventListener('focusout', e => { const m = e.target.closest && e.target.closest('.msel.open'); if (m && e.relatedTarget && !m.contains(e.relatedTarget)) mselClose(m, false); });
  window.addEventListener('resize', rescale);
  /* the artifact's download permission is looked up when the viewer saves, not at start-up */
  const anchorSave = downloads.save;
  downloads = { save: async o => {
    let d = null; try { d = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { d = null; }
    if (!d || !d.save) return anchorSave(o);
    try { return await d.save({ filename: o.filename, data: o.data }); }
    catch (e) {
      if (e && e.code === 'declined') throw e;
      const buf = o.data instanceof Blob ? new Uint8Array(await o.data.arrayBuffer()) : o.data;
      return d.save({ filename: o.filename, data: buf });
    }
  } };
  qbInit();
}
/* ---------- Question bank tab: the question bank's own page and code, loaded on first use ---------- */
let qbLoaded = false;
async function qbInit() {
  if (qbLoaded) return; qbLoaded = true;
  const host = $('#viewQb'); host.textContent = ''; host.append(h('div', { class: 'qbload' }, h('div', { class: 'spin' }), h('p', { text: 'Loading the question bank\u2026' })));
  try {
    const pre = window.__qbPre || {};
    const html = await (pre.html || fetch('qb/qb.html').then(r => r.text()));
    const js = await (pre.js || fetch('qb/qb-all.js').then(r => r.text()));
    await Promise.all([document.getElementById('kcss') ? null : fetch('katex.css').then(r => r.text()).then(c => { if (!document.getElementById('kcss')) { const st = h('style', { text: c }); st.id = 'kcss'; document.head.append(st); } }), loadScript(CDN.katex)]).catch(() => {});
    host.innerHTML = '<div id="dash-root">' + html + '</div>';
    const sc = document.createElement('script'); sc.textContent = js; document.head.append(sc);
    await window.__qbStart();
    document.querySelectorAll('#tiles .qb-trow').forEach(r => { const t = r.querySelector('.qb-tile'); if (t && /\D0$/.test(t.textContent.trim())) r.remove(); });
  } catch (e) { qbLoaded = false; host.textContent = 'The question bank did not load. Refresh the page.'; }
}
window.AvantiTeacher = {
  start: o => { OPTS = o; boot(); },
  setTab: t => setTab(t), hideViews: () => hideViews(), toast: m => toast(m),
  /* the question bank (same data as the Question Bank, DPPs and PYQs tabs), for the test maker */
  bank: () => ensureDpp().then(() => ({ qs: BANK.all, byId: BYID, chapters: CHMAP })),
  /* saved worksheets: the same PDF / Word / PowerPoint export and share menu as DPPs (plan checks inside) */
  exportIds: async (ids, title, kind) => { await ensureDpp(); const pages = idPages(ids, title); if (!pages.length) { toast('None of these questions is in the question bank now'); return; } doExport(kind, { pages, file: title }); },
  pdfIds: async (ids, title) => { await ensureDpp(); const pages = idPages(ids, title); if (!pages.length) { toast('None of these questions is in the question bank now'); return null; } return pdfBlobOf({ pages, file: title }); },
  shareIds: async (btn, ids, title) => { await ensureDpp(); const pages = idPages(ids, title); if (!pages.length) { toast('None of these questions is in the question bank now'); return; } shareFrom(btn, title, () => pdfBlobOf({ pages, file: title })); },
  math: node => math(node)
};


})();
