/* Physics Dashboard (lite): Dashboard + PYQs only. No sign-in and no plans: every export (PDF, Word, PowerPoint, print, share, copy) is on. */
(function () {
'use strict';
/* no account: exports, print, share and copy are on; saved worksheets and tests are off */
window.AvantiAuth = { perm: { pdf: true, docx: true, pptx: true, print: true, share: true, copy: true, attention: true }, renderMenu: function () {} };
/* small pop-up menu under a button (the Export menu) and the icons it uses */
function h(tag, props, ...kids) { const e = document.createElement(tag); for (const k in (props || {})) { const v = props[k]; if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k === 'text') e.textContent = v; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } kids.flat().forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); }); return e; }
function dropMenu(btn, items) {
  const old = document.querySelector('.pt-dmenu'); if (old) { const same = old.owner === btn; if (old.close) old.close(); else old.remove(); if (same) return; }
  const m = h('div', { class: 'pt-dmenu', role: 'menu' }, items.filter(Boolean).map(it => it === '-' ? h('div', { class: 'pt-dsep', role: 'separator' })
    : h('button', { type: 'button', role: 'menuitem', class: 'pt-ditem', onclick: () => { close(); it.onclick(); } }, it.icon ? h('span', { class: 'pt-dic', html: it.icon }) : null, h('span', { class: 'pt-dtx' }, h('b', { text: it.text }), it.sub ? h('small', { text: it.sub }) : null))));
  m.owner = btn; m.close = () => close(); document.body.append(m); /* closing from the button again also removes the listeners and resets aria-expanded */
  const r = btn.getBoundingClientRect(), w = m.offsetWidth;
  m.style.top = Math.min(window.innerHeight - m.offsetHeight - 8, r.bottom + 6) + 'px';
  m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
  btn.setAttribute('aria-expanded', 'true');
  const out = e => { if (!m.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close(); }, key = e => { if (e.key === 'Escape') { close(); btn.focus(); } };
  function close() { m.remove(); btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', out, true); document.removeEventListener('keydown', key, true); window.removeEventListener('scroll', close, true); }
  setTimeout(() => { document.addEventListener('click', out, true); document.addEventListener('keydown', key, true); window.addEventListener('scroll', close, true); }, 0);
  const first = m.querySelector('button'); if (first) first.focus();
}
window.AvantiPortal = { dropMenu, icons: {
  pdf: '<img src="img/pdf.png" width="22" height="22" alt="">', docx: '<img src="img/word.png" width="22" height="20" alt="">', pptx: '<img src="img/ppt.png" width="22" height="20" alt="">',
  share: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>' }, leave: function () {} };
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.append(s); }); }
async function start() {
  const a = document.getElementById('app');
  try {
    const code = await fetch('teacher.js').then(r => { if (!r.ok) throw new Error('teacher'); return r.text(); });
    const s = document.createElement('script'); s.textContent = code; document.head.append(s);
    if (!window.AvantiTeacher) throw new Error('teacher');
  } catch (e) { a.innerHTML = '<div style="padding:48px 16px;text-align:center;font-family:system-ui,sans-serif;color:#fff"><p>The dashboard could not load. Please refresh the page.</p></div>'; return; }
  window.AvantiTeacher.start({});
}
window.AvantiBoot = { start, loadScript };
start();
})();
