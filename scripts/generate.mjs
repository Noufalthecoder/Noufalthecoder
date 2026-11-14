// Builds every panel of the profile README as a hand-drawn SVG.
// Runs in GitHub Actions with GITHUB_TOKEN (live data), or locally with
// DATA_FILE=fixture.json for a preview.
//
// To change what the profile says, edit PROFILE below. Nothing else needs touching.
// Fonts embedded in the panels: Bricolage Grotesque and JetBrains Mono (both SIL Open Font License), subset in assets/fonts.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const asset = (p) => join(ROOT, 'assets', p);
const USER = process.env.GH_USER || 'Noufalthecoder';
const TOKEN = process.env.GITHUB_TOKEN;
const OUT = process.env.OUT_DIR || 'dist';

// ------------------------------------------------------------------ content
const PROFILE = {
  first: 'Mohammed',
  last: 'Noufal',
  role: 'AI ENGINEER / FULL-STACK DEVELOPER',
  pitch: ['I build AI agents and full-stack products,', 'and ship them fast enough to win hackathons.'],
  facts: [
    { n: '10+', label: 'HACKATHON WINS' },
    { n: '4', label: 'INTERNSHIPS' },
    { n: '600+', label: 'LEETCODE' },
    { n: '{repos}', label: 'REPOS' },
  ],
  work: [
    { id: 'rulyos', name: 'RulyOS', tag: 'NEXT.JS / TYPESCRIPT',
      lines: ['A financial control plane for autonomous AI agents.', 'Agents get spending power, not the keys.'] },
    { id: 'vanakkam', name: 'Vanakkam', tag: 'TYPESCRIPT / YOUCAM AI',
      lines: ['An AI beauty studio. One selfie becomes a skin scan', 'and looks matched to real product shades.'] },
    { id: 'recongraph', name: 'ReconGraph', tag: 'PYTHON / GRAPH',
      lines: ['Financial reconciliation intelligence. Every payment,', 'settlement and refund traced through one graph.'] },
    { id: 'navicargo', name: 'NaviCargo AI', tag: 'NEXT.JS / TYPESCRIPT',
      lines: ['Predicts missed vessel connections for exporters', 'and prices the risk in rupees before it lands.'] },
    { id: 'catalyst', name: 'Catalyst', tag: 'PYTHON / LLM',
      lines: ['Turns messy industrial catalog data into structured,', 'validated, evidence-backed product information.'] },
    { id: 'dana', name: 'DaNA', tag: 'REACT / HEALTH',
      lines: ['Premarital genetic screening explained simply,', 'so couples can plan for healthy children.'] },
  ],
  recordNote: '10+ WINS, NATIONAL AND INTERNATIONAL',
  record: [
    { place: '1st', event: 'Agent.AI Challenge', by: 'HACKEREARTH', result: 'WINNER', top: true },
    { place: '1st', event: 'OpsFusion', by: 'IFMR KREA UNIVERSITY', result: 'WINNER', top: true },
    { place: '2nd', event: 'Synapse Sentinel Hackathon', by: 'CIT', result: 'RUNNER-UP' },
    { place: 'Final', event: 'World Computer Hacker League', by: 'ICP HUBS', result: 'NATIONAL FINALIST' },
    { place: 'Semi', event: 'ET AI Hackathon 2026', by: 'ECONOMIC TIMES', result: 'NATIONAL SEMI-FINALIST' },
  ],
  solved: [
    { n: '600+', label: 'LEETCODE' },
    { n: '300+', label: 'CODECHEF' },
    { n: '150+', label: 'SKILLRACK' },
  ],
  experience: [
    { year: '2025', role: 'Backend AI Engineer Intern', at: 'FLYRANK.AI' },
    { year: '2024', role: 'SDE Intern', at: 'L2M LABS' },
    { year: '2024', role: 'Machine Learning Intern', at: 'ALFIDO TECH' },
    { year: '2024', role: 'Web Developer Intern', at: 'ELEVATE LABS' },
  ],
  toolbox: [
    { label: 'LANGUAGES', items: 'Python, TypeScript, JavaScript, Java, SQL' },
    { label: 'AI / ML', items: 'LLM agents, RAG, TensorFlow, scikit-learn, OpenCV' },
    { label: 'WEB', items: 'React, Next.js, Node.js, FastAPI, GraphQL' },
    { label: 'CLOUD / DATA', items: 'AWS, Google Cloud, Firebase, PostgreSQL, Docker' },
  ],
  closing: ['Building something with AI?', 'Let’s talk.'],
};

// ------------------------------------------------------------------ design tokens
const C = {
  bg: '#0C0B0A', raised: '#141210', line: '#2B2723', text: '#F3EEE6', soft: '#CFC7BA',
  muted: '#948C80', faint: '#5E584F', accent: '#FF6B2C', accentSoft: '#FFB38A',
  heat: ['#1B1816', '#55260F', '#993F17', '#DB5A22', '#FF8A4F'],
};
const FONTS = JSON.parse(readFileSync(asset('fonts.json'), 'utf8'));
const PORTRAIT = JSON.parse(readFileSync(asset('portrait.json'), 'utf8'));
const STACK = {
  display: `'Ndisplay','Arial Narrow','Helvetica Neue',Arial,sans-serif`,
  text: `'Ntext','Segoe UI','Helvetica Neue',Arial,sans-serif`,
  mono: `'Nmono',ui-monospace,SFMono-Regular,Consolas,Menlo,monospace`,
};
const WEIGHT = { display: 800, text: 400, mono: 400 };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = (v) => Number(v.toFixed(2));
/** Width of a string in px, from the embedded font's real advance widths. */
const measure = (s, font, size, ls = 0) =>
  [...String(s)].reduce((w, ch) => w + (FONTS[font].adv[ch] ?? 0.6) * size, 0) + ls * Math.max(0, String(s).length - 1);

function text(x, y, str, { font = 'text', size = 16, fill = C.text, anchor, ls = 0, cls = '', style = '' } = {}) {
  return `<text class="${font[0]}${cls ? ' ' + cls : ''}" x="${n(x)}" y="${n(y)}" font-size="${size}" fill="${fill}"` +
    (anchor ? ` text-anchor="${anchor}"` : '') + (ls ? ` letter-spacing="${ls}"` : '') + (style ? ` style="${style}"` : '') +
    `>${esc(str)}</text>`;
}
const label = (x, y, str, o = {}) => text(x, y, str, { font: 'mono', size: 13, fill: C.muted, ls: 1.1, ...o });
const rule = (x1, y, x2, o = {}) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${o.stroke || C.line}"${o.cls ? ` class="${o.cls}"` : ''}${o.style ? ` style="${o.style}"` : ''}/>`;
const arrow = (x, y, s, color, w = 1.6) =>
  `<path d="M${n(x)} ${n(y + s)}L${n(x + s)} ${n(y)}M${n(x + s * 0.28)} ${n(y)}H${n(x + s)}V${n(y + s * 0.72)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const fontFace = (f) => `@font-face{font-family:'N${f}';font-weight:${WEIGHT[f]};src:url(data:font/woff2;base64,${FONTS[f].b64}) format('woff2')}`;

function frame(w, h, body, { fonts = ['display', 'text', 'mono'], css = '', defs = '', title = '', radius = 24, bg = C.bg, border = C.line } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<style>${fonts.map(fontFace).join('')}
.d{font-family:${STACK.display};font-weight:800}
.t{font-family:${STACK.text}}
.m{font-family:${STACK.mono}}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes draw{from{transform:scaleX(0)}to{transform:none}}
.rise{animation:rise .8s cubic-bezier(.2,.7,.2,1) both}
.fade{animation:fade .9s ease-out both}
.draw{animation:draw 1s cubic-bezier(.7,0,.2,1) both;transform-origin:left;transform-box:fill-box}
${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs><clipPath id="panel"><rect width="${w}" height="${h}" rx="${radius}"/></clipPath>${defs}</defs>
<g clip-path="url(#panel)"><rect width="${w}" height="${h}" fill="${bg}"/>${body}</g>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${radius - 0.5}" fill="none" stroke="${border}"/>
</svg>
`;
}

// ------------------------------------------------------------------ data
async function fetchData() {
  if (process.env.DATA_FILE) return JSON.parse(readFileSync(process.env.DATA_FILE, 'utf8'));
  const query = `query($login:String!){ user(login:$login){
    repositories(first:100, ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC){
      totalCount
      nodes{ languages(first:10, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{ name } } } }
    }
    contributionsCollection{ contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } } }
  }}`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-generator' },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  const json = await res.json();
  if (json.errors || !json.data?.user) throw new Error(JSON.stringify(json.errors || json));
  return json.data.user;
}

function computeStats(user) {
  const weeks = user.contributionsCollection.contributionCalendar.weeks.map((w) => w.contributionDays);
  const days = weeks.flat();
  const total = days.reduce((s, d) => s + d.contributionCount, 0);

  let longest = 0, run = 0;
  for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  let i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--; // today may not be done yet
  let current = 0;
  while (i >= 0 && days[i].contributionCount > 0) { current++; i--; }
  const best = days.reduce((b, d) => (d.contributionCount > b.contributionCount ? d : b), { contributionCount: 0, date: null });
  const active = days.filter((d) => d.contributionCount > 0).length;

  const sizes = {};
  for (const r of user.repositories.nodes) for (const e of r.languages.edges) sizes[e.node.name] = (sizes[e.node.name] || 0) + e.size;
  const sum = Object.values(sizes).reduce((s, v) => s + v, 0) || 1;
  const ranked = Object.entries(sizes).sort((a, b) => b[1] - a[1]).map(([name, size]) => ({ name, pct: (size / sum) * 100 }));
  const langs = ranked.slice(0, 4);
  const rest = ranked.slice(4).reduce((s, l) => s + l.pct, 0);
  if (rest > 0.05) langs.push({ name: 'Other', pct: rest });

  return { weeks, days, total, longest, current, best, active, langs, repos: user.repositories.totalCount };
}

// ------------------------------------------------------------------ hero
function hero(s) {
  const W = 1000, H = 560, PAD = 56;
  const size = Math.min(132, 500 / Math.max(measure(PROFILE.first, 'display', 1), measure(PROFILE.last + '.', 'display', 1)));
  const y1 = 232, y2 = y1 + size * 0.86;
  const lastW = measure(PROFILE.last, 'display', size);

  // portrait: dots grouped by size and by a random bucket, so it resolves out of noise
  const { pitch, levels, groups, w: pw, h: ph } = PORTRAIT;
  const scale = (H / ph) * 1.06, px = W - pw * scale + 22, py = H - ph * scale + 34;
  const drift = [[-16, 9], [13, -14], [-9, -17], [18, 11]];
  const dots = groups.map((g) => {
    const sw = pitch * (0.18 + 0.82 * (g.l / levels));
    const delay = n(0.2 + g.b * 0.17 + (levels - g.l) * 0.1);
    const shimmer = g.b === 0 ? `,shim 6s ease-in-out ${n(3 + g.l * 0.45)}s infinite` : '';
    return `<path d="${g.d}" stroke-width="${n(sw)}" style="animation:pin${g.b} 1.2s cubic-bezier(.2,.7,.2,1) ${delay}s both${shimmer}"/>`;
  }).join('');

  let fx = PAD;
  const facts = PROFILE.facts.map((f, i) => {
    const x = fx, value = f.n.replace('{repos}', s.repos);
    fx += Math.max(measure(value, 'display', 36), measure(f.label, 'mono', 11.5, 0.9)) + 34;
    return `<g class="rise" style="animation-delay:${n(1.25 + i * 0.09)}s">${text(x, 508, value, { font: 'display', size: 36 })}${label(x, 531, f.label, { size: 11.5, ls: 0.9 })}</g>`;
  }).join('');

  const body = `
<rect x="${W - 520}" width="520" height="${H}" fill="url(#glow)"/>
<g transform="translate(${n(px)} ${n(py)}) scale(${n(scale)})" mask="url(#pfade)" fill="none" stroke="url(#ink)" stroke-linecap="round">${dots}</g>
<rect class="scan" x="${n(px)}" y="0" width="${n(pw * scale)}" height="2" fill="${C.accent}"/>
<circle cx="${PAD + 5}" cy="73" r="5" fill="${C.accent}" class="pulse"/>
${label(PAD + 22, 78, PROFILE.role, { size: 14, fill: C.soft, cls: 'fade', style: 'animation-delay:.15s' })}
<g clip-path="url(#l1)"><g class="up" style="animation-delay:.2s">${text(PAD - 4, y1, PROFILE.first, { font: 'display', size })}</g></g>
<g clip-path="url(#l2)"><g class="up" style="animation-delay:.34s">${text(PAD - 4, y2, PROFILE.last, { font: 'display', size })}${text(PAD - 4 + lastW + size * 0.03, y2, '.', { font: 'display', size, fill: C.accent })}</g></g>
${PROFILE.pitch.map((l, i) => text(PAD, y2 + 54 + i * 29, l, { size: 20.5, fill: C.soft, cls: 'rise', style: `animation-delay:${n(0.75 + i * 0.1)}s` })).join('')}
${rule(PAD, 462, PAD + 470, { cls: 'draw', style: 'animation-delay:1s' })}
${facts}`;

  const defs = `
<radialGradient id="glow" cx=".62" cy=".42" r=".62"><stop offset="0" stop-color="${C.accent}" stop-opacity=".16"/><stop offset="1" stop-color="${C.accent}" stop-opacity="0"/></radialGradient>
<linearGradient id="ink" gradientUnits="userSpaceOnUse" x1="0" y1="${n(ph * 0.3)}" x2="0" y2="${ph}"><stop offset="0" stop-color="${C.text}"/><stop offset="1" stop-color="${C.accentSoft}"/></linearGradient>
<linearGradient id="pf" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".2" stop-color="#fff"/></linearGradient>
<mask id="pfade" maskUnits="userSpaceOnUse" x="-40" y="-40" width="${pw + 80}" height="${ph + 80}"><rect x="-40" y="-40" width="${pw + 80}" height="${ph + 80}" fill="url(#pf)"/></mask>
<clipPath id="l1"><rect x="0" y="${n(y1 - size * 0.84)}" width="${W}" height="${n(size * 0.98)}"/></clipPath>
<clipPath id="l2"><rect x="0" y="${n(y2 - size * 0.84)}" width="${W}" height="${n(size * 1.02)}"/></clipPath>`;

  const css = `
${drift.map(([dx, dy], i) => `@keyframes pin${i}{from{opacity:0;transform:translate(${dx}px,${dy}px)}to{opacity:1;transform:none}}`).join('\n')}
@keyframes shim{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes up{from{transform:translateY(${Math.ceil(size)}px)}to{transform:none}}
@keyframes scan{0%{transform:translateY(0);opacity:0}12%{opacity:.9}88%{opacity:.9}100%{transform:translateY(${H}px);opacity:0}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
.up{animation:up 1s cubic-bezier(.16,1,.3,1) both}
.scan{animation:scan 2s cubic-bezier(.5,0,.4,1) .1s both}
.pulse{animation:pulse 2.4s ease-in-out infinite}`;

  return frame(W, H, body, { css, defs, title: `${PROFILE.first} ${PROFILE.last}. AI engineer and full-stack developer. ${PROFILE.pitch.join(' ')}` });
}

// ------------------------------------------------------------------ buttons
function button(str, primary) {
  const H = 56, size = 15, ls = 1.4;
  const tw = measure(str, 'mono', size, ls);
  const W = Math.ceil(tw + 28 * 2 + 26);
  const fg = primary ? C.bg : C.text;
  const body = `${text(28, 34.5, str, { font: 'mono', size, fill: fg, ls })}${arrow(28 + tw + 12, 22, 11, fg, 1.8)}`;
  return frame(W, H, body, { fonts: ['mono'], radius: 28, bg: primary ? C.accent : C.bg, border: primary ? C.accent : '#3A3530', title: str });
}

// ------------------------------------------------------------------ work cards
function workCard(p, index) {
  const W = 494, H = 404, IH = 278, PAD = 26;
  const img = readFileSync(asset(`work/${p.id}.jpg`)).toString('base64');
  const body = `
<image href="data:image/jpeg;base64,${img}" x="0" y="0" width="${W}" height="${IH}" preserveAspectRatio="xMidYMin slice"/>
${rule(0, IH, W)}
${label(PAD, IH + 33, String(index + 1).padStart(2, '0'), { fill: C.accent, size: 12.5 })}
${label(W - PAD, IH + 33, p.tag, { anchor: 'end', size: 11.5, ls: 0.9 })}
${text(PAD - 1, IH + 72, p.name, { font: 'display', size: 34 })}
${arrow(PAD + measure(p.name, 'display', 34) + 10, IH + 50, 13, C.accent, 2)}
${p.lines.map((l, i) => text(PAD, IH + 97 + i * 19.5, l, { size: 14.6, fill: C.muted })).join('')}`;
  return frame(W, H, body, { radius: 20, title: `${p.name}. ${p.lines.join(' ')}` });
}

// ------------------------------------------------------------------ section heading
// A transparent strip that sits directly on the page, so it has to read on light and dark themes.
function heading(kicker, title) {
  const W = 1000, H = 92;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<style>${fontFace('display')}${fontFace('mono')}
.d{font-family:${STACK.display};font-weight:800;fill:#14110F}
.m{font-family:${STACK.mono};fill:#C2410C}
@media (prefers-color-scheme:dark){.d{fill:${C.text}}.m{fill:${C.accent}}}
</style>
<text class="m" x="3" y="32" font-size="13" letter-spacing="1.1">${esc(kicker)}</text>
<text class="d" x="1" y="78" font-size="42">${esc(title)}</text>
</svg>
`;
}

// ------------------------------------------------------------------ hackathon record
function record() {
  const W = 1000, PAD = 56, ROW = 66, TOP = 104;
  const rows = PROFILE.record.map((r, i) => {
    const y = TOP + i * ROW;
    return `<g class="rise" style="animation-delay:${n(0.15 + i * 0.08)}s">
${rule(PAD, y, W - PAD)}
${text(PAD, y + 45, r.place, { font: 'display', size: 38, fill: r.top ? C.accent : C.muted })}
${text(PAD + 112, y + 41, r.event, { size: 22.5 })}
${label(W - PAD, y + 31, r.result, { anchor: 'end', fill: r.top ? C.accent : C.soft, size: 12.5 })}
${label(W - PAD, y + 50, r.by, { anchor: 'end', size: 11.5, fill: C.faint })}</g>`;
  }).join('');
  const base = TOP + PROFILE.record.length * ROW;
  const colW = (W - PAD * 2) / 4;
  const solved = PROFILE.solved.map((v, i) => {
    const x = PAD + colW * (i + 1);
    return `${text(x, base + 74, v.n, { font: 'display', size: 46 })}${label(x, base + 99, v.label, { size: 12 })}`;
  }).join('');
  const body = `
${label(PAD, 62, 'HACKATHONS / SELECTED RESULTS', { fill: C.accent })}
${label(W - PAD, 62, PROFILE.recordNote, { anchor: 'end', fill: C.soft })}
${rows}
<rect y="${base}" width="${W}" height="140" fill="${C.raised}"/>
${rule(0, base, W)}
${label(PAD, base + 62, 'PROBLEMS', { fill: C.soft })}${label(PAD, base + 82, 'SOLVED', { fill: C.soft })}
${solved}`;
  return frame(W, base + 140, body, { title: `Hackathons: ${PROFILE.recordNote.toLowerCase()}. Selected results: ` + PROFILE.record.map((r) => `${r.result} at ${r.event}`).join('; ') });
}

// ------------------------------------------------------------------ live activity
function activity(s) {
  const W = 1000, H = 452, PAD = 56, INNER = W - PAD * 2;
  const cols = s.weeks.length, pitch = INNER / cols, cell = pitch - 3;
  const counts = s.days.map((d) => d.contributionCount).filter((c) => c > 0).sort((a, b) => a - b);
  const q = (p) => counts[Math.min(counts.length - 1, Math.floor(counts.length * p))] ?? 1;
  const cuts = [q(0.25), q(0.5), q(0.8)];
  const level = (c) => (c === 0 ? 0 : c <= cuts[0] ? 1 : c <= cuts[1] ? 2 : c <= cuts[2] ? 3 : 4);
  const GY = 226;
  const fmt = (d, o) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', ...o });

  let months = '', lastMonth = -1, lastX = -99;
  const grid = s.weeks.map((week, w) => {
    const x = PAD + w * pitch;
    const m = new Date(week[0].date + 'T00:00:00Z').getUTCMonth();
    if (m !== lastMonth && x - lastX > 46 && w < cols - 2) {
      months += label(x, GY - 13, fmt(week[0].date, { month: 'short' }).toUpperCase(), { size: 10.5, fill: C.faint, ls: 0.8 });
      lastX = x;
    }
    lastMonth = m;
    const cells = week.map((d) => {
      const row = new Date(d.date + 'T00:00:00Z').getUTCDay();
      return `<rect x="${n(x)}" y="${n(GY + row * pitch)}" width="${n(cell)}" height="${n(cell)}" rx="3" fill="${C.heat[level(d.contributionCount)]}"/>`;
    }).join('');
    return `<g class="fade" style="animation-duration:.5s;animation-delay:${n(0.3 + w * 0.022)}s">${cells}</g>`;
  }).join('');

  const totalW = measure(s.total, 'display', 104);
  const side = [
    { v: `${s.current}`, unit: s.current === 1 ? 'day' : 'days', l: 'CURRENT STREAK' },
    { v: `${s.longest}`, unit: s.longest === 1 ? 'day' : 'days', l: 'LONGEST STREAK' },
    { v: `${s.best.contributionCount}`, unit: s.best.date ? `on ${fmt(s.best.date, { month: 'short', day: 'numeric' })}` : '', l: 'BUSIEST DAY' },
  ].map((f, i) => {
    const x = PAD + 430 + i * 160;
    return `${label(x, 118, f.l, { size: 11.5, ls: 0.9 })}${text(x, 160, f.v, { font: 'display', size: 40 })}${text(x + measure(f.v, 'display', 40) + 8, 160, f.unit, { size: 15, fill: C.muted })}`;
  }).join('');

  const BY = GY + 7 * pitch + 32;
  const shades = [C.accent, C.text, '#8E867A', '#5A544C', '#38332E'];
  let bx = PAD, lx = PAD;
  const bar = s.langs.map((l, i) => {
    const w = (l.pct / 100) * INNER;
    const seg = `<rect x="${n(bx)}" y="${n(BY)}" width="${n(Math.max(w - 2, 1))}" height="8" rx="2" fill="${shades[i]}"/>`;
    bx += w;
    return seg;
  }).join('');
  const legend = s.langs.map((l, i) => {
    const name = l.name.toUpperCase(), pct = `${l.pct.toFixed(l.pct < 10 ? 1 : 0)}%`;
    const out = `<rect x="${n(lx)}" y="${n(BY + 26)}" width="9" height="9" rx="2" fill="${shades[i]}"/>` +
      label(lx + 17, BY + 35, name, { size: 12, fill: C.soft, ls: 0.9 }) +
      label(lx + 17 + measure(name, 'mono', 12, 0.9) + 9, BY + 35, pct, { size: 12, fill: C.faint, ls: 0.9 });
    lx += 17 + measure(name, 'mono', 12, 0.9) + 9 + measure(pct, 'mono', 12, 0.9) + 30;
    return out;
  }).join('');

  const updated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
  const body = `
${label(PAD, 62, 'LAST 12 MONTHS ON GITHUB', { fill: C.accent })}
${label(W - PAD, 62, `LIVE DATA / UPDATED ${updated}`, { anchor: 'end', fill: C.faint })}
${text(PAD - 4, 166, s.total, { font: 'display', size: 104, cls: 'rise' })}
${text(PAD + totalW + 12, 142, 'contributions', { size: 17, fill: C.soft })}
${text(PAD + totalW + 12, 164, `across ${s.active} active days`, { size: 15, fill: C.muted })}
${side}
${months}${grid}
${bar}${legend}`;
  return frame(W, H, body, { title: `${s.total} contributions in the last year. Current streak ${s.current} days, longest ${s.longest} days. Top languages: ${s.langs.map((l) => l.name).join(', ')}.` });
}

// ------------------------------------------------------------------ experience + toolbox
function about() {
  const W = 1000, H = 392, PAD = 56, MID = 520;
  const exp = PROFILE.experience.map((e, i) => {
    const y = 104 + i * 66;
    return `${rule(PAD, y, MID - 48)}${label(PAD, y + 31, e.year, { fill: C.accent, size: 12.5 })}
${text(PAD + 66, y + 32, e.role, { size: 19.5 })}${label(PAD + 66, y + 52, e.at, { size: 11.5, fill: C.muted })}`;
  }).join('');
  const tools = PROFILE.toolbox.map((t, i) => {
    const y = 104 + i * 66;
    return `${rule(MID, y, W - PAD)}${label(MID, y + 31, t.label, { size: 11.5 })}${text(MID, y + 53, t.items, { size: 16.5, fill: C.soft })}`;
  }).join('');
  const body = `
${label(PAD, 62, 'EXPERIENCE', { fill: C.accent })}
${label(MID, 62, 'TOOLBOX', { fill: C.accent })}
${exp}${tools}`;
  return frame(W, H, body, { fonts: ['text', 'mono'], title: 'Experience: ' + PROFILE.experience.map((e) => `${e.role} at ${e.at} (${e.year})`).join('; ') + '. Toolbox: ' + PROFILE.toolbox.map((t) => t.items).join(', ') });
}

// ------------------------------------------------------------------ closing
function closing() {
  const W = 1000, H = 250, PAD = 56;
  const size = 66, w2 = measure(PROFILE.closing[1], 'display', size);
  const body = `
<rect width="${W}" height="${H}" fill="url(#cg)"/>
${text(PAD - 2, 112, PROFILE.closing[0], { font: 'display', size })}
${text(PAD - 2, 112 + size * 0.98, PROFILE.closing[1], { font: 'display', size, fill: C.accent })}
${arrow(PAD + w2 + 18, 112 + size * 0.98 - 40, 34, C.accent, 5)}
${label(W - PAD, H - 44, 'MESSAGE ME ON LINKEDIN', { anchor: 'end', fill: C.soft })}`;
  const defs = `<radialGradient id="cg" cx=".95" cy="1" r=".8"><stop offset="0" stop-color="${C.accent}" stop-opacity=".2"/><stop offset="1" stop-color="${C.accent}" stop-opacity="0"/></radialGradient>`;
  return frame(W, H, body, { fonts: ['display', 'mono'], defs, title: PROFILE.closing.join(' ') + ' Message me on LinkedIn.' });
}

// ------------------------------------------------------------------ run
const stats = computeStats(await fetchData());
mkdirSync(OUT, { recursive: true });
const files = {
  'hero.svg': hero(stats),
  'btn-linkedin.svg': button('LINKEDIN', false),
  'btn-portfolio.svg': button('PORTFOLIO', true),
  'h-work.svg': heading('01 / SELECTED WORK', 'Things I’ve shipped'),
  'h-record.svg': heading('02 / TRACK RECORD', 'Tested under a deadline'),
  'h-activity.svg': heading('03 / ACTIVITY', 'Still shipping'),
  'record.svg': record(),
  'activity.svg': activity(stats),
  'about.svg': about(),
  'closing.svg': closing(),
};
PROFILE.work.forEach((p, i) => { files[`work-${p.id}.svg`] = workCard(p, i); });
for (const [name, svg] of Object.entries(files)) writeFileSync(join(OUT, name), svg);
console.log(`Wrote ${Object.keys(files).length} panels to ${OUT}/ (${stats.total} contributions, ${stats.repos} repos)`);
