/* Unkganit · LaTeX -> Office equations (OMML) and plain linear text.
   Used by the Word and PowerPoint export so the questions stay editable. */
(function (root) {
'use strict';
const GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', Upsilon: 'Υ', omicron: 'ο', varpi: 'ϖ', varrho: 'ϱ', varsigma: 'ς', varkappa: 'ϰ', digamma: 'ϝ', upmu: 'μ', uppi: 'π', Alpha: 'Α', Beta: 'Β', Epsilon: 'Ε', Zeta: 'Ζ', Eta: 'Η', Iota: 'Ι', Kappa: 'Κ', Mu: 'Μ', Nu: 'Ν', Omicron: 'Ο', Rho: 'Ρ', Tau: 'Τ', Chi: 'Χ' };
const SYM = { cdot: '⋅', times: '×', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', equiv: '≡', sim: '∼', simeq: '≃', cong: '≅', infty: '∞', to: '→', rightarrow: '→', leftarrow: '←', longrightarrow: '⟶', Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', leftrightarrow: '↔', implies: '⇒', iff: '⇔', in: '∈', ni: '∋', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃', supseteq: '⊇', cup: '∪', cap: '∩', forall: '∀', exists: '∃', ldots: '…', dots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱', circ: '∘', degree: '°', triangle: '△', angle: '∠', mid: '∣', partial: '∂', nabla: '∇', ell: 'ℓ', perp: '⊥', parallel: '∥', propto: '∝', emptyset: '∅', varnothing: '∅', therefore: '∴', because: '∵', langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', prime: '′', setminus: '∖', div: '÷', ast: '∗', star: '⋆', oplus: '⊕', otimes: '⊗', lbrace: '{', rbrace: '}', aleph: 'ℵ', hbar: 'ℏ', Re: 'ℜ', Im: 'ℑ', neg: '¬', lnot: '¬', land: '∧', lor: '∨', wedge: '∧', vee: '∨', bullet: '•', lt: '<', gt: '>', lbrack: '[', rbrack: ']', vert: '|', Vert: '‖', bigtriangleup: '△', bot: '⊥', odot: '⊙', circledast: '⊛', nleq: '≰', ngeq: '≱', mapsto: '↦', longleftrightarrow: '⟷', Longrightarrow: '⟹', Longleftarrow: '⟸', Longleftrightarrow: '⟺', uparrow: '↑', downarrow: '↓', nexists: '∄', complement: '∁', smallsetminus: '∖', square: '□', Box: '□', checkmark: '✓', lvert: '|', rvert: '|', lVert: '‖', rVert: '‖', backslash: '∖', updownarrow: '↕', Uparrow: '⇑', Downarrow: '⇓', lgroup: '⟮', rgroup: '⟯', '|': '‖', '{': '{', '}': '}', '%': '%', '$': '$', '&': '&', '#': '#', '_': '_', '\\': ' ' };
/* more relations, arrows and symbols a physics sheet uses (so none comes out as its command name) */
Object.assign(SYM, { gg: '≫', ll: '≪', lll: '⋘', ggg: '⋙', leqslant: '⩽', geqslant: '⩾', leqq: '≦', geqq: '≧', lesssim: '≲', gtrsim: '≳', lessapprox: '⪅', gtrapprox: '⪆', lneq: '⪇', gneq: '⪈', lneqq: '≨', gneqq: '≩', nless: '≮', ngtr: '≯', nsim: '≁', ncong: '≇', nmid: '∤', nparallel: '∦', nsubseteq: '⊈', nsupseteq: '⊉', subsetneq: '⊊', supsetneq: '⊋', nrightarrow: '↛', nleftarrow: '↚', nRightarrow: '⇏', nLeftarrow: '⇍', nLeftrightarrow: '⇎', nleftrightarrow: '↮', approxeq: '≊', thicksim: '∼', thickapprox: '≈', backsim: '∽', eqsim: '≂', doteq: '≐', asymp: '≍', varpropto: '∝', between: '≬', prec: '≺', succ: '≻', preceq: '⪯', succeq: '⪰', sqsubseteq: '⊑', sqsupseteq: '⊒', models: '⊨', vdash: '⊢', dashv: '⊣', top: '⊤', owns: '∋',
  rightleftharpoons: '⇌', leftrightharpoons: '⇋', rightharpoonup: '⇀', rightharpoondown: '⇁', leftharpoonup: '↼', leftharpoondown: '↽', rightleftarrows: '⇄', leftrightarrows: '⇆', rightrightarrows: '⇉', leftleftarrows: '⇇', upharpoonright: '↾', downharpoonright: '⇂', gets: '←', longleftarrow: '⟵', longmapsto: '⟼', hookrightarrow: '↪', hookleftarrow: '↩', leadsto: '⇝', nearrow: '↗', searrow: '↘', nwarrow: '↖', swarrow: '↙', circlearrowleft: '↺', circlearrowright: '↻', curvearrowleft: '↶', curvearrowright: '↷', Lleftarrow: '⇚', Rrightarrow: '⇛', Updownarrow: '⇕',
  dagger: '†', ddagger: '‡', dag: '†', ddag: '‡', colon: ':', textdegree: '°', ohm: 'Ω', textohm: 'Ω', micro: 'µ', textmu: 'μ', AA: 'Å', celsius: '°C', degreeCelsius: '°C', textcelsius: '°C', S: '§', P: '¶', pounds: '£', copyright: '©', textperthousand: '‰', perthousand: '‰', textpm: '±', textbullet: '•',
  measuredangle: '∡', sphericalangle: '∢', uplus: '⊎', sqcup: '⊔', sqcap: '⊓', amalg: '⨿', ominus: '⊖', oslash: '⊘', bigodot: '⨀', bigoplus: '⨁', bigotimes: '⨂', biguplus: '⨄', bigsqcup: '⨆', bigvee: '⋁', bigwedge: '⋀', coprod: '∐', dotplus: '∔', ltimes: '⋉', rtimes: '⋊', intercal: '⊺', wr: '≀', bowtie: '⋈', Join: '⋈', smile: '⌣', frown: '⌢', lhd: '◁', rhd: '▷', unlhd: '⊴', unrhd: '⊵', triangleleft: '◁', triangleright: '▷', triangledown: '▽', bigtriangledown: '▽', blacktriangle: '▲', blacktriangledown: '▼', blacksquare: '■', diamond: '⋄', Diamond: '◇', lozenge: '◊', blacklozenge: '⧫', bigcirc: '◯', bigstar: '★', circledcirc: '⊚', clubsuit: '♣', diamondsuit: '♢', heartsuit: '♡', spadesuit: '♠', flat: '♭', sharp: '♯', natural: '♮', surd: '√',
  imath: 'ı', jmath: 'ȷ', wp: '℘', mho: '℧', hslash: 'ℏ', eth: 'ð', dotsc: '…', dotso: '…', dotsb: '⋯', dotsm: '⋯', dotsi: '⋯', hdots: '…', centerdot: '⋅', cdotp: '⋅', ldotp: '.', vline: '|', textbar: '|', textbackslash: '\\', textasciitilde: '~', textendash: '–', textemdash: '—', textless: '<', textgreater: '>' });
/* \not before a relation: its negated sign (\not= -> ≠, \not\in -> ∉), else a combining long solidus over the sign */
const NOT = { '=': '≠', '<': '≮', '>': '≯', '|': '∤', in: '∉', ni: '∌', owns: '∌', equiv: '≢', subset: '⊄', supset: '⊅', subseteq: '⊈', supseteq: '⊉', sim: '≁', approx: '≉', cong: '≇', simeq: '≄', le: '≰', leq: '≰', ge: '≱', geq: '≱', lt: '≮', gt: '≯', mid: '∤', parallel: '∦', exists: '∄', prec: '⊀', succ: '⊁', leftarrow: '↚', rightarrow: '↛', to: '↛', gets: '↚', Leftarrow: '⇍', Rightarrow: '⇏', Leftrightarrow: '⇎', leftrightarrow: '↮', asymp: '≭', vdash: '⊬', models: '⊭', sqsubseteq: '⋢', sqsupseteq: '⋣', preceq: '⋠', succeq: '⋡' };
/* \xrightarrow[below]{above} and friends: the arrow with its labels */
const XARR = { xrightarrow: '→', xleftarrow: '←', xRightarrow: '⇒', xLeftarrow: '⇐', xleftrightarrow: '↔', xLeftrightarrow: '⇔', xrightleftharpoons: '⇌', xleftrightharpoons: '⇋', xmapsto: '↦', xlongequal: '=', xhookrightarrow: '↪', xhookleftarrow: '↩', xtofrom: '⇄' };
/* siunitx unit macros (\SI{3}{\metre\per\second}) */
const UNIT = { metre: 'm', meter: 'm', second: 's', kilogram: 'kg', gram: 'g', kelvin: 'K', ampere: 'A', mole: 'mol', candela: 'cd', newton: 'N', joule: 'J', watt: 'W', pascal: 'Pa', hertz: 'Hz', coulomb: 'C', volt: 'V', ohm: 'Ω', farad: 'F', tesla: 'T', weber: 'Wb', henry: 'H', siemens: 'S', becquerel: 'Bq', gray: 'Gy', sievert: 'Sv', litre: 'L', liter: 'L', hour: 'h', minute: 'min', day: 'd', electronvolt: 'eV', degree: '°', degreeCelsius: '°C', celsius: '°C', percent: '%', radian: 'rad', steradian: 'sr', decibel: 'dB', astronomicalunit: 'au', lightyear: 'ly', atomicmassunit: 'u', dalton: 'Da', bar: 'bar', angstrom: 'Å', kilo: 'k', mega: 'M', giga: 'G', tera: 'T', milli: 'm', micro: 'µ', nano: 'n', pico: 'p', femto: 'f', centi: 'c', deci: 'd', hecto: 'h', deca: 'da' };
const FN = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'exp', 'arg', 'det', 'gcd', 'lim', 'max', 'min', 'inf', 'sup', 'sinh', 'cosh', 'tanh', 'arcsin', 'arccos', 'arctan', 'deg', 'dim', 'ker', 'mod', 'Pr', 'cosec', 'lg', 'coth', 'sech', 'csch', 'cosech', 'arccot', 'arcsec', 'arccsc', 'sgn', 'limsup', 'liminf', 'argmax', 'argmin'];
const FN_LIM = { lim: 1, max: 1, min: 1, inf: 1, sup: 1, limsup: 1, liminf: 1, argmax: 1, argmin: 1 }, FN_NAME = { limsup: 'lim sup', liminf: 'lim inf', argmax: 'arg max', argmin: 'arg min' };
const BB = { R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ', P: 'ℙ', H: 'ℍ' };
const SPACES = { ',': ' ', ';': ' ', ':': ' ', ' ': ' ', quad: ' ', qquad: '  ', '>': ' ', space: ' ' };
Object.assign(SPACES, { enspace: SPACES[' '], enskip: SPACES[' '], thinspace: SPACES[','], medspace: SPACES[':'], thickspace: SPACES[';'], negthinspace: '', negmedspace: '', negthickspace: '' });
const ACC = { hat: '̂', widehat: '̂', vec: '⃗', tilde: '̃', widetilde: '̃', dot: '̇', ddot: '̈', check: '̌', acute: '́', grave: '̀', breve: '̆', overrightarrow: '⃗', overleftarrow: '⃖', bar: '̄', mathring: '̊', overleftrightarrow: '⃡' };
const TEXTY = { text: 'nor', mbox: 'nor', hbox: 'nor', textrm: 'nor', textit: 'nor', textbf: 'nor', emph: 'nor', textsf: 'nor', texttt: 'nor', textup: 'nor', textnormal: 'nor', textsc: 'nor', textmd: 'nor', textsl: 'nor', mathnormal: 'i', pmb: 'b', Bbb: 'bb', mathrm: 'p', operatorname: 'p', mathit: 'i', mathbf: 'b', boldsymbol: 'b', bm: 'b', mathsf: 'p', mathtt: 'p', mathcal: 'scr', mathscr: 'scr', mathbb: 'bb', mathfrak: 'p' };
const ENV_DELIM = { pmatrix: ['(', ')'], bmatrix: ['[', ']'], Bmatrix: ['{', '}'], vmatrix: ['|', '|'], Vmatrix: ['‖', '‖'], cases: ['{', ''], dcases: ['{', ''], rcases: ['', '}'] };
const UNKNOWN = {};
/* delimiters after \left \right \middle \big...: always one character (Office wants a single char in begChr/endChr) */
const DELIM = { '|': '‖', '{': '{', '}': '}', langle: '⟨', rangle: '⟩', lvert: '|', rvert: '|', vert: '|', lVert: '‖', rVert: '‖', Vert: '‖' };
/* commands inside \text{...} (text mode) */
const TXT = { AA: 'Å', aa: 'å', textdegree: '°', degree: '°', textmu: 'μ', micro: 'µ', ohm: 'Ω', textohm: 'Ω', textpm: '±', textasciitilde: '~', textendash: '–', textemdash: '—', textbackslash: '\\', textbar: '|', textless: '<', textgreater: '>', textperiodcentered: '·', S: '§', P: '¶', ss: 'ß', dag: '†', ddag: '‡', textdagger: '†', textdaggerdbl: '‡', textbullet: '•', textregistered: '®', texttrademark: '™', textcopyright: '©', copyright: '©', pounds: '£', textsterling: '£', texteuro: '€', euro: '€', textcent: '¢', textperthousand: '‰', textcelsius: '°C', upmu: 'μ', o: 'ø', O: 'Ø', ae: 'æ', i: 'ı' };
const textConv = s => String(s).replace(/\$([^$]*)\$/g, (m, x) => lin(parse(x))).replace(/\\(?:text\w*|mbox|emph|mathrm)\s*\{([^{}]*)\}/g, '$1')
  .replace(/\\([a-zA-Z]+)\s*|\\([^a-zA-Z])/g, (m, w, c) => { if (w) { const r = TXT[w] !== undefined ? TXT[w] : GREEK[w] || (SPACES[w] !== undefined ? SPACES[w] : SYM[w]); if (r !== undefined) return r; UNKNOWN[w] = (UNKNOWN[w] || 0) + 1; return w; } return c === '-' || c === '/' ? '' : SPACES[c] !== undefined ? SPACES[c] : SYM[c] !== undefined ? SYM[c] : c; })
  .replace(/~/g, ' ').replace(/[{}]/g, '');
/* every italic run of a parsed group in one style (\mathrm, \mathbf ...), going into fractions, scripts, roots ... */
function restyle(a, sty) {
  (a || []).forEach(n => { if (!n) return; if (n.k === 'r') { if (sty === 'p' ? !n.sty : n.sty !== 'nor') n.sty = sty; return; } ['e', 'n', 'd', 'sub', 'sup', 'lim', 'deg'].forEach(k => { if (Array.isArray(n[k])) restyle(n[k], sty); }); if (n.rows) n.rows.forEach(r => r.forEach(c => restyle(c, sty))); });
  return a;
}
const primes = a => a.map(n => (n.k === 'r' ? Object.assign(n, { s: n.s.replace(/″/g, '′′').replace(/‴/g, '′′′').replace(/′′′/g, '‴').replace(/′′/g, '″') }) : n));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- tokenizer ---------- */
function tokenize(src) {
  const t = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+)\s*/.exec(src.slice(i));
      if (m) { t.push({ k: 'cmd', v: m[1], p: i, e: i + m[0].length }); i += m[0].length; }
      else if (src[i + 1] === '\\') { t.push({ k: 'row', p: i, e: i + 2 }); i += 2; }
      else { t.push({ k: 'cmd', v: src[i + 1] || '', p: i, e: i + 2 }); i += 2; }
    } else if (c === '{' || c === '}' || c === '^' || c === '_' || c === '&') { t.push({ k: c, p: i, e: i + 1 }); i++; }
    else if (/\s/.test(c)) { t.push({ k: 'sp', p: i, e: i + 1 }); i++; }
    else { t.push({ k: 'ch', v: c, p: i, e: i + 1 }); i++; }
  }
  return t;
}

/* commands that can be the base of a prescript (^\circ\mathrm{C}) and commands that only change spacing or fonts */
const BASECMD = { ce: 1, pu: 1, boxed: 1, vec: 1, hat: 1, bar: 1, overline: 1, frac: 1, sqrt: 1, AA: 1, ohm: 1, micro: 1 };
const IGN = { nonumber: 1, notag: 1, mathstrut: 1, strut: 1, displaylimits: 1, allowbreak: 1, nobreak: 1, protect: 1, ensuremath: 1, rm: 1, bf: 1, it: 1, sf: 1, tt: 1, cal: 1, normalfont: 1, small: 1, large: 1, Large: 1, LARGE: 1, huge: 1, Huge: 1, normalsize: 1, footnotesize: 1, scriptsize: 1, tiny: 1, scriptscriptstyle: 1, centering: 1, noindent: 1, newline: 1, smash: 1 };
const LONGARR = { '→': '⟶', '←': '⟵', '⇒': '⟹', '⇐': '⟸', '↔': '⟷', '⇔': '⟺', '↦': '⟼' };
/* siunitx: \num{3e8} -> 3×10^{8}; \si{\metre\per\second} or {m.s^{-1}} -> upright m s⁻¹ */
const numTex = r => String(r).replace(/(\d)\s*[eE]\s*([-+]?\d+)/g, '$1\\times 10^{$2}').replace(/\s*x\s*(?=\d)/g, '\\times ');
function unitTex(raw) {
  const out = []; let pfx = '', pw = 0, per = false;
  String(raw).replace(/\\([a-zA-Z]+)\s*|([^\\]+)/g, (m, c, txt) => {
    if (txt) { if (txt.trim()) out.push({ u: txt.trim().replace(/\s*[.~]\s*|\s+/g, '\\,'), p: 1, raw: true }); return m; }
    if (c === 'per') per = true; else if (c === 'square') pw = 2; else if (c === 'cubic') pw = 3;
    else if (c === 'squared' || c === 'cubed' || c === 'tothe') { const l = out[out.length - 1]; if (l) l.p *= c === 'squared' ? 2 : 3; }
    else if (/^(yocto|zepto|atto|femto|pico|nano|micro|milli|centi|deci|deca|deka|hecto|kilo|mega|giga|tera|peta|exa)$/.test(c)) pfx += UNIT[c] || ({ deka: 'da', yocto: 'y', zepto: 'z', atto: 'a', peta: 'P', exa: 'E' })[c];
    else { const u = UNIT[c] !== undefined ? UNIT[c] : SYM[c] || GREEK[c] || TXT[c] || c; out.push({ u: pfx + u, p: (pw || 1) * (per ? -1 : 1) }); pfx = ''; pw = 0; per = false; }
    return m;
  });
  return '\\mathrm{' + out.map(x => x.raw ? x.u : '{' + x.u + '}' + (x.p !== 1 ? '^{' + x.p + '}' : '')).join('\\,') + '}';
}
/* mhchem, the common part: \ce{2H2 + O2 -> 2H2O}, \ce{Cu^2+}, \ce{N2 <=> 2N} */
const ceTex = r => '\\mathrm{' + String(r).replace(/\s*<=>\s*/g, ' \\rightleftharpoons ').replace(/\s*<-+>\s*/g, ' \\leftrightarrow ').replace(/\s*-+>\s*/g, ' \\rightarrow ').replace(/\s*<-+\s*/g, ' \\leftarrow ')
  .replace(/\^([0-9]*[+\-])/g, '^{$1}').replace(/([A-Za-z)\]])(\d+)/g, '$1_{$2}').replace(/([A-Za-z)\]])([+\-])(?=\s|$)/g, '$1^{$2}').trim().replace(/ +/g, '\\ ') + '}';

/* ---------- parser: LaTeX -> tree ---------- */
function parse(src) {
  const T = tokenize(src); let i = 0;
  const peek = () => { while (i < T.length && T[i].k === 'sp') i++; return T[i]; };
  const next = () => { const t = peek(); if (t) i++; return t; };
  const isStop = t => !t || t.k === '}' || t.k === '&' || t.k === 'row' || (t.k === 'cmd' && (t.v === 'right' || t.v === 'end' || t.v === 'middle'));
  function seq() {
    const out = [];
    for (;;) {
      const t = peek(); if (isStop(t)) break;
      let a = t.k === '^' || t.k === '_' ? run('', null) : atom(); if (!a) continue;   /* ^ or _ with nothing before it: a script on an empty base */
      a = scripts(a);
      if (a.k === 'script' && a.e[0].k === 'r' && a.e[0].s === '' && !a.e[0].sty) {   /* ^{235}_{92}U, ^\circ C: a prescript on what follows */
        const s = peek();
        if (s && (s.k === '{' || (s.k === 'ch' && /[A-Za-z0-9]/.test(s.v)) || (s.k === 'cmd' && (GREEK[s.v] || TEXTY[s.v] || BASECMD[s.v])))) { const b = atom(); if (b) a = scripts({ k: 'pre', sub: a.sub, sup: a.sup, e: [b] }); }
      }
      out.push(a);
    }
    return naryWrap(merge(pairBars(out)));
  }
  function scripts(a) {
    for (;;) {
      const s = peek();
      if (s && s.k === 'cmd' && (s.v === 'limits' || s.v === 'nolimits')) { i++; continue; }
      if (s && s.k === '^') { i++; const x = arg(); a = script(a, null, x); }
      else if (s && s.k === '_') { i++; const x = arg(); a = script(a, x, null); }
      else if (s && s.k === 'ch' && s.v === "'") { i++; a = script(a, null, [run('′')]); }
      else return a;
    }
  }
  /* [optional argument] as maths, or null */
  function optArg() {
    const p = peek(); if (!p || p.k !== 'ch' || p.v !== '[') return null;
    i++; const s = []; while (peek() && !(peek().k === 'ch' && peek().v === ']')) { const a = atom(); if (a) s.push(a); else break; } i++; return merge(s);
  }
  function skipOpt() { const p = peek(); if (p && p.k === 'ch' && p.v === '[') { while (i < T.length && !(T[i].k === 'ch' && T[i].v === ']')) i++; i++; } }
  function script(base, sub, sup) {
    if (base.k === 'script') { base = Object.assign({}, base); if (sub) base.sub = base.sub ? merge(base.sub.concat(sub)) : sub; if (sup) base.sup = base.sup ? primes(merge(base.sup.concat(sup))) : sup; return base; }   /* f'' -> f″, v'^2 -> v′² */
    return { k: 'script', e: [base], sub, sup };
  }
  function arg() {
    const t = peek(); if (!t) return [];
    if (t.k === '{') { i++; const s = seq(); if (peek() && peek().k === '}') i++; return s; }
    const a = atom(); return a ? [a] : [];
  }
  function rawGroup() {
    const t = peek(); if (!t) return '';
    if (t.k !== '{') { i++; return t.v || ''; }
    let depth = 0, j = i;
    for (; j < T.length; j++) { if (T[j].k === '{') depth++; else if (T[j].k === '}') { depth--; if (!depth) break; } }
    const s = src.slice(T[i].e, T[j] ? T[j].p : src.length); i = j + 1; return s;
  }
  function delimTok() {
    const t = peek(); if (!t || (t.k !== 'ch' && t.k !== 'cmd')) return ''; i++;
    if (t.k === 'ch') return t.v === '.' ? '' : t.v === '<' ? '⟨' : t.v === '>' ? '⟩' : t.v;
    const c = DELIM[t.v] || SYM[t.v] || ''; return [...c].length === 1 ? c : '';
  }
  /* \\[4pt]: drop the optional space after a line break */
  function skipLen() {
    const t = peek(); if (!t || t.k !== 'ch' || t.v !== '[') return;
    let j = i + 1; while (j < T.length && !(T[j].k === 'ch' && T[j].v === ']') && j - i < 12) j++;
    if (T[j] && T[j].k === 'ch' && T[j].v === ']' && /^\s*-?[\d.]+\s*[a-z]{0,2}\s*$/.test(src.slice(T[i].e, T[j].p))) i = j + 1;
  }
  function matrixRows(end) {
    const rows = []; let row = [], cell = [];
    for (;;) {
      const t = peek();
      if (!t) break;
      if (t.k === 'cmd' && t.v === 'end') { i++; rawGroup(); break; }
      if (t.k === '&') { i++; row.push(cell); cell = []; continue; }
      if (t.k === 'row') { i++; skipLen(); row.push(cell); rows.push(row); row = []; cell = []; continue; }
      if (t.k === '}') { i++; continue; }
      if (t.k === 'cmd' && (t.v === 'hline' || t.v === 'cline')) { i++; if (t.v === 'cline') rawGroup(); continue; }
      if (t.k === 'cmd' && (t.v === 'right' || t.v === 'middle')) { i++; const c = delimTok(); if (c) cell.push(run(c, 'p')); continue; }   /* \left( in one cell, \right) in another */
      const i0 = i; cell = cell.concat(seq()); if (i === i0) i++;   /* always move on: never loop on a token seq() cannot take */
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => c.length));
  }
  function atom() {
    const t = next(); if (!t) return null;
    if (t.k === '{') { i--; const g = arg(); return { k: 'grp', e: g }; }
    if (t.k === 'ch') return run(t.v, /[A-Za-z]/.test(t.v) ? null : (/\d/.test(t.v) ? null : 'p'));
    if (t.k === '^' || t.k === '_') { return null; }
    if (t.k === '&' || t.k === 'row') return run(' ', 'nor');
    if (t.k !== 'cmd') return null;
    const v = t.v;
    if (v === 'frac' || v === 'dfrac' || v === 'tfrac' || v === 'cfrac') { const n = arg(), d = arg(); return { k: 'frac', n, d }; }
    if (v === 'binom' || v === 'dbinom') { const n = arg(), d = arg(); return { k: 'delim', beg: '(', end: ')', e: [{ k: 'frac', n, d, noBar: true }] }; }
    if (v === 'sqrt') { const deg = optArg(); return { k: 'rad', deg, e: arg() }; }
    if (v === 'left') { const beg = delimTok(); let body = seq(); while (peek() && peek().k === 'cmd' && peek().v === 'middle') { i++; const c = delimTok(); body = merge(body.concat(c ? [run(c, 'p')] : [], seq())); } let end = ''; const p = peek(); if (p && p.k === 'cmd' && p.v === 'right') { i++; end = delimTok(); } return { k: 'delim', beg, end, e: body }; }
    if (v === 'middle') { return run(delimTok(), 'p'); }
    if (/^(big|Big|bigg|Bigg|bigl|bigr|Bigl|Bigr|biggl|biggr)$/.test(v)) { const d = delimTok(); return d ? run(d, 'p') : null; }
    if (ACC[v]) { const e = arg(); return { k: 'acc', chr: ACC[v], e }; }
    if (v === 'overline') return { k: 'bar', e: arg() };
    if (v === 'underline') return { k: 'bar', e: arg(), pos: 'bot' };
    if (v === 'underbrace' || v === 'overbrace') return { k: 'gchr', chr: v === 'underbrace' ? '⏟' : '⏞', pos: v === 'underbrace' ? 'bot' : 'top', e: arg() };
    if (v === 'not') {   /* \not= -> ≠, \not\in -> ∉, anything else gets a long solidus */
      const p = peek(); if (!p || isStop(p)) return null;
      const key = p.k === 'ch' || p.k === 'cmd' ? p.v : null; if (key && NOT[key]) { i++; return run(NOT[key], 'p'); }
      const a = atom(); return a && a.k === 'r' ? Object.assign(a, { s: a.s + '\u0338' }) : a;
    }
    if (v === 'boxed') return { k: 'box', e: arg() };
    if (v === 'fbox' || v === 'framebox') { skipOpt(); skipOpt(); return { k: 'box', e: [run(textConv(rawGroup()), 'nor')] }; }
    if (v === 'cancel' || v === 'bcancel' || v === 'xcancel' || v === 'sout' || v === 'cancelto') { const to = v === 'cancelto' ? arg() : null, e = arg(), b = { k: 'box', e, strike: v === 'cancelto' ? 'cancel' : v }; return to ? { k: 'script', e: [b], sub: null, sup: to } : b; }
    if (XARR[v]) {   /* arrow with a label above (and one below) */
      const below = optArg(), above = arg(), long = Math.max(wd(above), below ? wd(below) : 0) > 1.2;
      let a = run(long && LONGARR[XARR[v]] || XARR[v], 'p');
      if (below && below.length) a = { k: 'under', e: [a], lim: below };
      return above.length ? { k: 'over', e: [a], lim: above } : a;
    }
    if (v === 'SI' || v === 'qty' || v === 'SIrange' || v === 'qtyrange') { skipOpt(); const n = parse(numTex(rawGroup())); if (/range/.test(v)) { const n2 = parse(numTex(rawGroup())); n.push(run(' to ', 'nor'), ...n2); } return { k: 'grp', e: n.concat([run(SPACES[','], 'nor')], parse(unitTex(rawGroup()))) }; }
    if (v === 'si' || v === 'unit') { skipOpt(); return { k: 'grp', e: parse(unitTex(rawGroup())) }; }
    if (v === 'num') { skipOpt(); return { k: 'grp', e: parse(numTex(rawGroup())) }; }
    if (v === 'ang') { skipOpt(); return { k: 'grp', e: parse(numTex(rawGroup())).concat([run('°', 'p')]) }; }
    if (v === 'ce' || v === 'pu') { return { k: 'grp', e: parse(v === 'ce' ? ceTex(rawGroup()) : '\\mathrm{' + rawGroup().replace(/\s+/g, '\\ ') + '}') }; }
    if (v === 'pmod' || v === 'bmod') return v === 'bmod' ? run(' mod ', 'nor') : { k: 'grp', e: [run(' (mod ', 'nor')].concat(arg(), [run(')', 'nor')]) };
    if (v === 'tag') { const p = peek(); if (p && p.k === 'ch' && p.v === '*') i++; return run('  (' + textConv(rawGroup()) + ')', 'nor'); }
    if (v === 'hspace' || v === 'vspace' || v === 'phantom' || v === 'hphantom' || v === 'vphantom' || v === 'label' || v === 'hfill') { const p = peek(); if (p && p.k === 'ch' && p.v === '*') i++; if (v !== 'hfill') rawGroup(); return v === 'vspace' || v === 'vphantom' || v === 'label' ? null : run(' ', 'nor'); }
    if (v === 'kern' || v === 'mkern' || v === 'hskip' || v === 'mskip' || v === 'mspace') { const p = peek(); if (p && v === 'mspace' && p.k === '{') { rawGroup(); return run(' ', 'nor'); } const m = p && /^\s*-?\s*[\d.]+\s*(pt|mu|em|ex|cm|mm|in|bp|pc|sp|dd)/.exec(src.slice(p.p)); if (m) { const end = p.p + m[0].length; while (i < T.length && T[i].p < end) i++; } return null; }
    if (IGN[v]) return null;
    if (v === 'overset' || v === 'stackrel' || v === 'underset') {
      const top = arg(), base = arg();
      const arrow = top.length === 1 && top[0].k === 'r' && /^(→|⟶|⃗)$/.test(top[0].s);
      if (v !== 'underset' && arrow) return { k: 'acc', chr: '⃗', e: base };
      return { k: v === 'underset' ? 'under' : 'over', e: base, lim: top };
    }
    if (v === 'textcolor' || v === 'color') { rawGroup(); return v === 'color' ? null : { k: 'grp', e: arg() }; }
    if (v === 'cline') { rawGroup(); return null; }
    if (v === 'def') { i++; rawGroup(); return null; }
    if (v === 'substack') { const s = rawGroup(); const rows = s.split(/\\\\(?:\s*\[[^\]]*\])?/).map(x => parse(x)); return { k: 'mat', rows: rows.map(r => [r]), left: false }; }
    if (TEXTY[v]) {
      const sty = TEXTY[v];
      if (sty === 'nor') return Object.assign(run(textConv(rawGroup()), 'nor'), v === 'emph' || v === 'textit' || v === 'textsl' ? { it: true } : v === 'textbf' ? { b: true } : {});
      if (sty === 'bb') { const s = rawGroup(); return run(s.split('').map(ch => BB[ch] || ch).join(''), 'p'); }
      const p = peek(), star = v === 'operatorname' && p && p.k === 'ch' && p.v === '*'; if (star) i++;
      const g = merge(restyle(arg(), sty));
      if (v === 'operatorname' && g.length && g.every(n => n.k === 'r')) return Object.assign(run(g.map(n => n.s).join(''), 'p', true), { lim: star });
      return g.length === 1 ? g[0] : g.length ? { k: 'grp', e: g } : run('', 'p');
    }
    if (FN.includes(v)) return Object.assign(run(FN_NAME[v] || v, 'p'), { fn: true, lim: !!FN_LIM[v] });
    if (v === 'int' || v === 'oint' || v === 'iint' || v === 'iiint') return run({ int: '∫', oint: '∮', iint: '∬', iiint: '∭' }[v], 'p');
    if (v === 'sum' || v === 'prod' || v === 'bigcup' || v === 'bigcap') return Object.assign(run({ sum: '∑', prod: '∏', bigcup: '⋃', bigcap: '⋂' }[v], 'p'), { big: true });
    if (GREEK[v]) return run(GREEK[v], /^[A-Z]/.test(v) ? 'p' : null);
    if (SPACES[v] !== undefined) return run(SPACES[v], 'nor');
    if (v === '!') return null;
    if (v === 'displaystyle' || v === 'textstyle' || v === 'scriptstyle' || v === 'limits' || v === 'nolimits' || v === 'hline' || v === 'bigm' || v === 'mathop' || v === 'relax') return null;
    if (v === 'begin') {
      const name = rawGroup().trim();
      if (name === 'array' || name === 'tabular') rawGroup();
      const rows = matrixRows(name), d = ENV_DELIM[name];
      const m = { k: 'mat', rows, left: /^[dr]?cases$/.test(name) };
      return d ? { k: 'delim', beg: d[0], end: d[1], e: [m] } : m;
    }
    if (SYM[v] !== undefined) return run(SYM[v], 'p');
    UNKNOWN[v] = (UNKNOWN[v] || 0) + 1;
    return run(v, 'nor');
  }
  /* top level: nothing is dropped. \\ starts a new line (an equation array), & is alignment (ignored), a stray } \right \end is skipped */
  const lines = [[]];
  for (;;) {
    const i0 = i, cur = lines[lines.length - 1]; cur.push(...seq());
    const t = peek(); if (!t) break;
    i++;
    if (t.k === 'row') { skipLen(); lines.push([]); }
    else if (t.k === 'cmd' && (t.v === 'right' || t.v === 'middle')) { const c = delimTok(); if (c) cur.push(run(c, 'p')); }
    else if (t.k === 'cmd' && t.v === 'end') rawGroup();
    if (i === i0) i++;
  }
  const ls = lines.map(l => merge(l)).filter(l => l.length);
  return ls.length > 1 ? [{ k: 'mat', rows: ls.map(l => [l]), left: true, eq: true }] : (ls[0] || []);
}
const INTS = { '∫': 1, '∮': 1, '∬': 1, '∭': 1 };
const isIntNode = n => (n.k === 'r' && INTS[n.s] && !n.fn) || (n.k === 'script' && n.e[0].k === 'r' && INTS[n.e[0].s]);
const stopsOperand = n => n.k === 'r' && ((/^[=≤≥≠≈≡⇒⇔→<>,;]/.test(n.s)) || (n.sty === 'nor' && /[A-Za-z]{2,}/.test(n.s)));
/* an integral sign takes everything after it up to a relation sign as its operand, so Office draws it as a real integral */
function naryWrap(nodes) {
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (isIntNode(n)) {
      let j = i + 1; while (j < nodes.length && !stopsOperand(nodes[j])) j++;
      const base = n.k === 'script' ? n.e[0] : n;
      out.push({ k: 'nary', chr: base.s, sub: n.k === 'script' ? n.sub : null, sup: n.k === 'script' ? n.sup : null, e: naryWrap(nodes.slice(i + 1, j)) });
      i = j - 1;
    } else out.push(n);
  }
  return out;
}
function pairBars(a) {
  const out = []; let open = -1;
  a.forEach(n => {
    const bar = n.k === 'r' && n.s === '|' && !n.fn, barS = n.k === 'script' && n.e[0].k === 'r' && n.e[0].s === '|';
    if (bar && open < 0) { open = out.length; out.push(n); }
    else if ((bar || barS) && open >= 0) { const inner = out.splice(open + 1); out.pop(); const d = { k: 'delim', beg: '|', end: '|', e: merge(inner) }; out.push(barS ? Object.assign({}, n, { e: [d] }) : d); open = -1; }
    else out.push(n);
  });
  return out;
}
function run(s, sty, fn) { return { k: 'r', s, sty: sty || null, fn: !!fn }; }
function merge(a) {
  const out = [];
  a.forEach(n => {
    const l = out[out.length - 1];
    if (n && n.k === 'r' && l && l.k === 'r' && l.sty === n.sty && !l.fn && !n.fn && !l.big && !n.big && !l.it === !n.it && !l.b === !n.b) l.s += n.s;
    else if (n) out.push(Object.assign({}, n));
  });
  return out;
}

/* ---------- OMML ---------- */
/* run properties for the flavour: 'pptx@1800' (a:rPr, size in 1/100 pt), 'docx@21' (w:rPr, size in half-points, the size of the text around it) */
function rpr(fl, sty, x) {
  const sz = fl && fl.indexOf('@') > 0 ? fl.split('@')[1] : '', it = !!(x && x.it), b = !!(x && x.b);
  if (fl && fl.indexOf('docx') === 0) { const f = sty === 'nor' ? 'Calibri' : 'Cambria Math'; return '<w:rPr><w:rFonts w:ascii="' + f + '" w:hAnsi="' + f + '"/>' + (b ? '<w:b/>' : '') + (it ? '<w:i/>' : '') + (sz ? '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/>' : '') + '</w:rPr>'; }
  if (fl && fl.indexOf('pptx') === 0) return '<a:rPr lang="en-US"' + (sz ? ' sz="' + sz + '"' : '') + (b ? ' b="1"' : '') + ' i="' + (sty && !it ? '0' : '1') + '"><a:latin typeface="Cambria Math" panose="02040503050406030204" pitchFamily="18" charset="0"/><a:ea typeface="Cambria Math" panose="02040503050406030204" pitchFamily="18" charset="0"/></a:rPr>';
  return '';
}
function mrun(s, sty, fl, x) {
  if (s === '') return '';
  const p = sty ? '<m:rPr>' + (sty === 'nor' ? '<m:nor/>' : sty === 'scr' ? '<m:scr m:val="script"/>' : sty === 'bb' ? '' : '<m:sty m:val="' + sty + '"/>') + '</m:rPr>' : '';
  return '<m:r>' + p + rpr(fl, sty, x) + '<m:t xml:space="preserve">' + esc(s) + '</m:t></m:r>';
}
const ZW = '\u200b';   /* stands in for an empty base, so Office draws no empty placeholder box */
function body(nodes, fl) { const s = nodes.map(n => nd(n, fl)).join(''); return s || mrun(' ', 'nor', fl); }
function nd(n, fl) {
  switch (n.k) {
    case 'r': return mrun(n.s, n.sty, fl, n);
    case 'box': { const st = n.strike, pr = st ? '<m:hideTop m:val="1"/><m:hideBot m:val="1"/><m:hideLeft m:val="1"/><m:hideRight m:val="1"/>' + (st === 'sout' ? '<m:strikeH m:val="1"/>' : '') + (st === 'cancel' || st === 'xcancel' ? '<m:strikeBLTR m:val="1"/>' : '') + (st === 'bcancel' || st === 'xcancel' ? '<m:strikeTLBR m:val="1"/>' : '') : '';
      return '<m:borderBox>' + (pr ? '<m:borderBoxPr>' + pr + '</m:borderBoxPr>' : '') + '<m:e>' + body(n.e, fl) + '</m:e></m:borderBox>'; }
    case 'gchr': return '<m:groupChr><m:groupChrPr><m:chr m:val="' + n.chr + '"/><m:pos m:val="' + n.pos + '"/><m:vertJc m:val="' + (n.pos === 'top' ? 'bot' : 'top') + '"/></m:groupChrPr><m:e>' + body(n.e, fl) + '</m:e></m:groupChr>';
    case 'pre': return '<m:sPre><m:sub>' + (n.sub ? body(n.sub, fl) : mrun(ZW, null, fl)) + '</m:sub><m:sup>' + (n.sup ? body(n.sup, fl) : mrun(ZW, null, fl)) + '</m:sup><m:e>' + body(n.e, fl) + '</m:e></m:sPre>';
    case 'grp': return body(n.e, fl);
    case 'frac': return '<m:f>' + (n.noBar ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : '') + '<m:num>' + body(n.n, fl) + '</m:num><m:den>' + body(n.d, fl) + '</m:den></m:f>';
    case 'rad': return '<m:rad><m:radPr>' + (n.deg ? '' : '<m:degHide m:val="1"/>') + '</m:radPr><m:deg>' + (n.deg ? body(n.deg, fl) : '') + '</m:deg><m:e>' + body(n.e, fl) + '</m:e></m:rad>';
    case 'delim': return '<m:d><m:dPr><m:begChr m:val="' + esc(n.beg) + '"/><m:endChr m:val="' + esc(n.end) + '"/></m:dPr><m:e>' + body(n.e, fl) + '</m:e></m:d>';
    case 'acc': return '<m:acc><m:accPr><m:chr m:val="' + n.chr + '"/></m:accPr><m:e>' + body(n.e, fl) + '</m:e></m:acc>';
    case 'over': return '<m:limUpp><m:e>' + body(n.e, fl) + '</m:e><m:lim>' + body(n.lim, fl) + '</m:lim></m:limUpp>';
    case 'under': return '<m:limLow><m:e>' + body(n.e, fl) + '</m:e><m:lim>' + body(n.lim, fl) + '</m:lim></m:limLow>';
    case 'bar': return '<m:bar><m:barPr><m:pos m:val="' + (n.pos || 'top') + '"/></m:barPr><m:e>' + body(n.e, fl) + '</m:e></m:bar>';
    case 'nary': return '<m:nary><m:naryPr><m:chr m:val="' + esc(n.chr) + '"/><m:limLoc m:val="subSup"/>' + (n.sub ? '' : '<m:subHide m:val="1"/>') + (n.sup ? '' : '<m:supHide m:val="1"/>') + (fl ? '<m:ctrlPr>' + rpr(fl, 'p') + '</m:ctrlPr>' : '') + '</m:naryPr><m:sub>' + (n.sub ? body(n.sub, fl) : '') + '</m:sub><m:sup>' + (n.sup ? body(n.sup, fl) : '') + '</m:sup><m:e>' + body(n.e, fl) + '</m:e></m:nary>';
    case 'mat': {
      if (n.eq) return '<m:eqArr>' + n.rows.map(r => '<m:e>' + body(r[0], fl) + '</m:e>').join('') + '</m:eqArr>';
      const R = n.rows.length ? n.rows : [[[]]], w = Math.max(1, ...R.map(r => r.length));
      const rows = R.map(r => '<m:mr>' + Array.from({ length: w }, (_, j) => '<m:e>' + body(r[j] || [], fl) + '</m:e>').join('') + '</m:mr>').join('');
      return '<m:m><m:mPr>' + (n.left && R.some(r => JSON.stringify(r).match(/"k":"(frac|rad|nary)"/)) ? '<m:rSpRule m:val="1"/>' : '') + '<m:mcs><m:mc><m:mcPr><m:count m:val="' + w + '"/><m:mcJc m:val="' + (n.left ? 'left' : 'center') + '"/></m:mcPr></m:mc></m:mcs></m:mPr>' + rows + '</m:m>';
    }
    case 'script': {
      const b = n.e[0], base = b.k === 'r' && b.s === '' ? mrun(ZW, null, fl) : body(n.e, fl), sub = n.sub && body(n.sub, fl), sup = n.sup && body(n.sup, fl);
      if ((b.k === 'r' && (b.big || b.lim)) || b.k === 'gchr') {
        let x = base;
        if (sub) x = '<m:limLow><m:e>' + x + '</m:e><m:lim>' + sub + '</m:lim></m:limLow>';
        if (sup) x = '<m:limUpp><m:e>' + x + '</m:e><m:lim>' + sup + '</m:lim></m:limUpp>';
        return x;
      }
      if (sub && sup) return '<m:sSubSup><m:e>' + base + '</m:e><m:sub>' + sub + '</m:sub><m:sup>' + sup + '</m:sup></m:sSubSup>';
      if (sub) return '<m:sSub><m:e>' + base + '</m:e><m:sub>' + sub + '</m:sub></m:sSub>';
      return '<m:sSup><m:e>' + base + '</m:e><m:sup>' + sup + '</m:sup></m:sSup>';
    }
  }
  return '';
}
/* flavor: 'docx' | 'pptx' | '' */
function omml(tex, display, fl) {
  const inner = body(parse(tex), fl || '');
  return display ? '<m:oMathPara><m:oMath>' + inner + '</m:oMath></m:oMathPara>' : '<m:oMath>' + inner + '</m:oMath>';
}

/* ---------- plain linear text (fallback, and for anything that can't hold equations) ---------- */
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ', x: 'ˣ', y: 'ʸ', a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', k: 'ᵏ', m: 'ᵐ', p: 'ᵖ', t: 'ᵗ', '′': '′', '″': '″', '‴': '‴', '∘': '°' };
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', n: 'ₙ', m: 'ₘ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', t: 'ₜ', x: 'ₓ' };
function uni(s, map) { let o = ''; for (const c of s) { if (!map[c]) return null; o += map[c]; } return o; }
function lin(nodes) {
  let o = '';
  nodes.forEach((n, idx) => {
    const l = (x) => lin(x);
    switch (n.k) {
      case 'r': o += n.s + (n.fn && idx < nodes.length - 1 && nodes[idx + 1].k !== 'delim' && nodes[idx + 1].k !== 'script' ? ' ' : ''); break;
      case 'grp': case 'box': case 'gchr': o += l(n.e); break;
      case 'pre': { const f = (s, m, ch) => { const u = uni(s, m); return u !== null ? u : ch + '(' + s + ')'; }; o += (n.sup ? f(l(n.sup), SUP, '^') : '') + (n.sub ? f(l(n.sub), SUB, '_') : '') + l(n.e); break; }
      case 'frac': { const a = l(n.n), b = l(n.d), w = s => /^[\w.′]+$/.test(s) ? s : '(' + s + ')'; o += n.noBar ? '(' + a + ' over ' + b + ')' : w(a) + '/' + w(b); break; }
      case 'rad': o += (n.deg ? '(' + l(n.deg) + ')' : '') + '√(' + l(n.e) + ')'; break;
      case 'delim': o += n.beg + l(n.e) + n.end; break;
      case 'acc': { const e = l(n.e); o += e + n.chr; break; }
      case 'bar': o += l(n.e) + '̄'; break;
      case 'over': o += l(n.e) + '^(' + l(n.lim) + ')'; break;
      case 'under': o += l(n.e) + '_(' + l(n.lim) + ')'; break;
      case 'mat': o += n.rows.map(r => r.map(c => l(c)).join(', ')).join(n.left ? '; ' : ' | '); break;
      case 'nary': o += n.chr + (n.sub ? '_(' + l(n.sub) + ')' : '') + (n.sup ? '^(' + l(n.sup) + ')' : '') + ' ' + l(n.e); break;
      case 'script': {
        const b = l(n.e);
        const sub = n.sub ? l(n.sub) : '', sup = n.sup ? l(n.sup) : '';
        const f = (s, m, ch) => { const u = uni(s, m); return u !== null ? u : ch + '(' + s + ')'; };
        o += b + (sub ? f(sub, SUB, '_') : '') + (sup ? f(sup, SUP, '^') : '');
        break;
      }
    }
  });
  return o;
}
const toText = tex => lin(parse(tex));

/* rough width in em, used to decide how options are laid out */
function wd(nodes) {
  let w = 0;
  nodes.forEach(n => {
    switch (n.k) {
      case 'r': w += n.s.length * (n.sty === 'nor' ? 0.5 : 0.55); break;
      case 'grp': case 'gchr': w += wd(n.e); break;
      case 'box': w += wd(n.e) + 0.4; break;
      case 'pre': w += wd(n.e) + 0.7 * Math.max(n.sub ? wd(n.sub) : 0, n.sup ? wd(n.sup) : 0); break;
      case 'frac': w += Math.max(wd(n.n), wd(n.d)) + 0.3; break;
      case 'rad': w += wd(n.e) + 0.9 + (n.deg ? 0.4 : 0); break;
      case 'delim': w += wd(n.e) + 0.7; break;
      case 'acc': case 'bar': w += wd(n.e); break;
      case 'mat': { const c = Math.max(1, ...n.rows.map(r => r.length)); let t = 0; for (let j = 0; j < c; j++) t += Math.max(0, ...n.rows.map(r => wd(r[j] || []))); w += t + 0.6 * (c - 1) + 0.8; break; }
      case 'nary': w += 1 + 0.5 * Math.max(n.sub ? wd(n.sub) : 0, n.sup ? wd(n.sup) : 0) + wd(n.e); break;
      case 'script': w += wd(n.e) + 0.7 * Math.max(n.sub ? wd(n.sub) : 0, n.sup ? wd(n.sup) : 0); break;
    }
  });
  return w;
}
const width = s => split(s).reduce((a, p) => a + (p.t === 'text' ? p.s.length * 0.5 : wd(parse(p.s))), 0);

/* split "text \( maths \) text \[ display \]" into parts */
function split(s) {
  const out = []; let i = 0, buf = '';
  while (i < s.length) {
    if (s[i] === '\\' && (s[i + 1] === '(' || s[i + 1] === '[')) {
      const close = s[i + 1] === '(' ? '\\)' : '\\]', j = s.indexOf(close, i + 2);
      if (j > 0) { if (buf) out.push({ t: 'text', s: buf }); buf = ''; out.push({ t: 'math', s: s.slice(i + 2, j).trim(), display: s[i + 1] === '[' }); i = j + 2; continue; }
    }
    buf += s[i]; i++;
  }
  if (buf) out.push({ t: 'text', s: buf });
  return out;
}
/* a whole string as plain text with maths in linear form */
const plainText = s => split(s).map(p => p.t === 'text' ? p.s : toText(p.s)).join('');

root.MathDoc = { width, UNKNOWN, omml, toText, split, plainText, parse, esc };
if (typeof module !== 'undefined') module.exports = root.MathDoc;
})(typeof window !== 'undefined' ? window : globalThis);
