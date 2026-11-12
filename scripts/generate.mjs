// Generates hand-crafted animated SVG cards from live GitHub data.
// Runs inside GitHub Actions (GITHUB_TOKEN) — or locally with MOCK=1 for preview.
import { writeFileSync, mkdirSync } from 'node:fs';

const USER  = process.env.GH_USER || 'Noufalthecoder';
const TOKEN = process.env.GITHUB_TOKEN;
const OUT   = process.env.OUT_DIR || 'dist';

const P = { cyan: '#00f5d4', purple: '#9b5de5', pink: '#f15bb5', yellow: '#fee440',
            text: '#e0d7ff', dim: '#8b7fb8', bg1: '#07010f', bg2: '#1a0638' };
const MONO = `'JetBrains Mono','Fira Code',Consolas,'Courier New',monospace`;
const SANS = `'Segoe UI','Helvetica Neue',Arial,sans-serif`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// ---------------------------------------------------------------- data
async function fetchData() {
  if (process.env.MOCK) return mockData();
  const query = `query($login:String!){ user(login:$login){
    followers{ totalCount }
    repositories(first:100, ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC){
      totalCount
      nodes{ stargazerCount languages(first:10, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{ name color } } } }
    }
    contributionsCollection{ contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } } }
  }}`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-generator' },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.user;
}

function mockData() {
  const weeks = []; const start = new Date(Date.now() - 364 * 864e5);
  let days = [];
  for (let i = 0; i < 365; i++) {
    const d = new Date(start.getTime() + i * 864e5).toISOString().slice(0, 10);
    days.push({ date: d, contributionCount: Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 12) });
    if (days.length === 7) { weeks.push({ contributionDays: days }); days = []; }
  }
  if (days.length) weeks.push({ contributionDays: days });
  return {
    followers: { totalCount: 42 },
    repositories: { totalCount: 18, nodes: [
      { stargazerCount: 12, languages: { edges: [{ size: 50000, node: { name: 'JavaScript', color: '#f1e05a' } }, { size: 20000, node: { name: 'CSS', color: '#563d7c' } }] } },
      { stargazerCount: 5, languages: { edges: [{ size: 30000, node: { name: 'TypeScript', color: '#3178c6' } }, { size: 9000, node: { name: 'HTML', color: '#e34c26' } }] } },
      { stargazerCount: 2, languages: { edges: [{ size: 12000, node: { name: 'Python', color: '#3572A5' } }, { size: 4000, node: { name: 'Java', color: '#b07219' } }] } },
    ] },
    contributionsCollection: { contributionCalendar: { totalContributions: 0, weeks } },
  };
}

function computeStats(user) {
  const cal = user.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  const total = days.reduce((s, d) => s + d.contributionCount, 0);

  let longest = 0, longestStart = null, longestEnd = null, run = 0, runStart = null;
  for (const d of days) {
    if (d.contributionCount > 0) {
      if (run === 0) runStart = d.date;
      run++;
      if (run > longest) { longest = run; longestStart = runStart; longestEnd = d.date; }
    } else run = 0;
  }
  let i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--;      // today not done yet — don't break the streak
  let current = 0, currentStart = null;
  while (i >= 0 && days[i].contributionCount > 0) { current++; currentStart = days[i].date; i--; }

  const best = days.reduce((b, d) => (d.contributionCount > b.contributionCount ? d : b), { contributionCount: 0, date: null });
  const stars = user.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0);

  const langMap = {};
  for (const r of user.repositories.nodes)
    for (const e of r.languages.edges) {
      langMap[e.node.name] ??= { name: e.node.name, color: e.node.color || P.purple, size: 0 };
      langMap[e.node.name].size += e.size;
    }
  const langTotal = Object.values(langMap).reduce((s, l) => s + l.size, 0);
  const langs = Object.values(langMap).sort((a, b) => b.size - a.size).slice(0, 6)
    .map((l) => ({ ...l, pct: langTotal ? (l.size / langTotal) * 100 : 0 }));

  return {
    days, total, current, currentStart, longest, longestStart, longestEnd, best, stars, langs,
    followers: user.followers.totalCount, repos: user.repositories.totalCount,
    from: days[0]?.date, to: days[days.length - 1]?.date,
  };
}

// ---------------------------------------------------------------- pieces
function odometer(value, cx, baseline, size, color, delay) {
  const s = String(value);
  const w = size * 0.62, h = size * 1.2;
  const x0 = cx - (w * s.length) / 2;
  return [...s].map((ch, i) => {
    const target = (10 + Number(ch)) * h;               // spin through 0-9 once, land on digit
    let col = '';
    for (let k = 0; k < 20; k++) col += `<text x="${(w / 2).toFixed(1)}" y="${(k * h + size * 0.95).toFixed(1)}" text-anchor="middle">${k % 10}</text>`;
    return `<svg x="${(x0 + i * w).toFixed(1)}" y="${(baseline - size * 0.95).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" overflow="hidden">
      <g fill="${color}" font-family="${MONO}" font-size="${size}" font-weight="800">${col}
        <animateTransform attributeName="transform" type="translate" values="0 0;0 ${-target}" keyTimes="0;1" calcMode="spline" keySplines=".12 .9 .25 1" dur="${(1.8 + i * 0.3).toFixed(2)}s" begin="${delay}s" fill="freeze"/>
      </g></svg>`;
  }).join('');
}

function ring(cx, cy, r, frac, gradId, color, delay, spin) {
  const C = 2 * Math.PI * r;
  const off = C * (1 - Math.max(0.03, Math.min(1, frac)));
  return `
  <circle cx="${cx}" cy="${cy}" r="${r + 16}" fill="none" stroke="${color}" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="2 9">
    <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="${spin * 360} ${cx} ${cy}" dur="24s" repeatCount="indefinite"/>
  </circle>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-opacity=".12" stroke-width="11"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#${gradId})" stroke-width="11" stroke-linecap="round"
          stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})" filter="url(#glow)">
    <animate attributeName="stroke-dashoffset" values="${C.toFixed(1)};${off.toFixed(1)}" keyTimes="0;1" calcMode="spline" keySplines=".2 .8 .2 1" dur="2s" begin="${delay}s" fill="freeze"/>
  </circle>
  <g>
    <circle cx="${cx}" cy="${cy - r - 16}" r="3.5" fill="${color}" filter="url(#glow)"/>
    <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="${-spin * 360} ${cx} ${cy}" dur="7s" repeatCount="indefinite"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="${r - 14}" fill="${color}" opacity=".05">
    <animate attributeName="opacity" values=".03;.12;.03" dur="3s" repeatCount="indefinite"/>
  </circle>`;
}

const ICONS = {
  bolt:  `<path d="M2,-11 L-6,2 L-1,2 L-3,11 L6,-3 L1,-3 Z"/>`,
  flame: `<path d="M0,-12 C4,-7 8,-3 7,3 C6,8 3,11 0,11 C-3,11 -7,8 -7,3 C-7,-1 -4,-3 -3,-8 C-1,-5 0,-4 1,-4 C2,-7 1,-10 0,-12 Z"/>`,
  crown: `<path d="M-9,7 L-9,-4 L-4,1 L0,-9 L4,1 L9,-4 L9,7 Z"/>`,
};
function icon(name, x, y, fill, wobble) {
  const anim = wobble
    ? `<animateTransform attributeName="transform" type="scale" values="1 1;1.1 .9;.92 1.1;1 1" dur=".9s" repeatCount="indefinite"/>`
    : `<animate attributeName="opacity" values="1;.55;1" dur="2s" repeatCount="indefinite"/>`;
  return `<g transform="translate(${x} ${y})"><g fill="${fill}" filter="url(#glow)">${ICONS[name]}${anim}</g></g>`;
}

function frame(w, h, inner, extraDefs = '') {
  const per = 2 * (w - 4 + h - 4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.bg1}"/><stop offset="1" stop-color="${P.bg2}"/></linearGradient>
  <linearGradient id="border" x1="0" x2="1">
    <stop offset="0" stop-color="${P.cyan}"><animate attributeName="stop-color" values="${P.cyan};${P.purple};${P.pink};${P.cyan}" dur="6s" repeatCount="indefinite"/></stop>
    <stop offset="1" stop-color="${P.pink}"><animate attributeName="stop-color" values="${P.pink};${P.cyan};${P.purple};${P.pink}" dur="6s" repeatCount="indefinite"/></stop>
  </linearGradient>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${P.purple}" stroke-opacity=".08"/></pattern>
  ${extraDefs}
</defs>
<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="18" fill="url(#bg)"/>
<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="18" fill="url(#grid)"/>
${inner}
<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="18" fill="none" stroke="url(#border)" stroke-width="2" opacity=".7"/>
<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="18" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"
      stroke-dasharray="140 ${(per - 140).toFixed(0)}" filter="url(#glow)" opacity=".85">
  <animate attributeName="stroke-dashoffset" values="0;${-per.toFixed(0)}" dur="7s" repeatCount="indefinite"/>
</rect>
</svg>`;
}

// ---------------------------------------------------------------- cards
function statsCard(s) {
  const W = 1200, H = 460, cy = 170, r = 72;
  const panels = [
    { cx: 220, val: s.total,   grad: 'gA', color: P.cyan,   icon: 'bolt',  label: 'CONTRIBUTIONS', sub: `${fmtDate(s.from)} – ${fmtDate(s.to)}`, frac: 1, unit: 'THIS YEAR' },
    { cx: 600, val: s.current, grad: 'gB', color: P.yellow, icon: 'flame', label: 'CURRENT STREAK', sub: s.current ? `since ${fmtDate(s.currentStart)}` : 'start one today ⚡', frac: s.longest ? s.current / s.longest : 0, unit: 'DAYS' },
    { cx: 980, val: s.longest, grad: 'gC', color: P.pink,   icon: 'crown', label: 'LONGEST STREAK', sub: s.longest ? `${fmtDate(s.longestStart)} – ${fmtDate(s.longestEnd)}` : '—', frac: 1, unit: 'DAYS' },
  ];
  const defs = `
  <linearGradient id="gA" x1="0" x2="1"><stop offset="0" stop-color="${P.cyan}"/><stop offset="1" stop-color="${P.purple}"/></linearGradient>
  <linearGradient id="gB" x1="0" x2="1"><stop offset="0" stop-color="${P.yellow}"/><stop offset="1" stop-color="${P.pink}"/></linearGradient>
  <linearGradient id="gC" x1="0" x2="1"><stop offset="0" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.purple}"/></linearGradient>
  <linearGradient id="bar" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${P.purple}"/><stop offset=".6" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.cyan}"/></linearGradient>
  <linearGradient id="scan" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <clipPath id="barsClip"><rect x="40" y="318" width="1120" height="110"/></clipPath>`;

  let body = `
  <g font-family="${MONO}" font-size="14" letter-spacing="3">
    <circle cx="40" cy="38" r="5" fill="${P.cyan}"><animate attributeName="opacity" values="1;.2;1" dur="1.2s" repeatCount="indefinite"/></circle>
    <text x="54" y="43" fill="${P.text}">${esc(USER.toUpperCase())} <tspan fill="${P.dim}">// CONTRIBUTION REACTOR</tspan></text>
    <text x="1160" y="43" text-anchor="end" fill="${P.dim}">STATUS <tspan fill="${P.cyan}">● ONLINE<animate attributeName="opacity" values="1;.35;1" dur="1.6s" repeatCount="indefinite"/></tspan>  ·  ALWAYS SHIPPING <tspan fill="${P.yellow}">⚡</tspan></text>
  </g>`;

  panels.forEach((p, i) => {
    const d = 0.3 + i * 0.35;
    body += ring(p.cx, cy, r, p.frac, p.grad, p.color, d, i % 2 ? -1 : 1);
    body += odometer(p.val, p.cx, cy + 12, 46, '#ffffff', d);
    body += `<text x="${p.cx}" y="${cy + 38}" text-anchor="middle" font-family="${MONO}" font-size="11" letter-spacing="3" fill="${p.color}">${p.unit}</text>`;
    body += icon(p.icon, p.cx - 92, cy + r + 47, p.color, p.icon === 'flame');
    body += `<text x="${p.cx - 74}" y="${cy + r + 53}" font-family="${SANS}" font-size="17" font-weight="800" letter-spacing="3" fill="${P.text}">${p.label}
      <animate attributeName="opacity" values="0;1" dur=".6s" begin="${d + 1}s" fill="freeze"/></text>`;
    body += `<text x="${p.cx}" y="${cy + r + 76}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${P.dim}">${esc(p.sub)}</text>`;
  });

  // last 90 days equalizer
  const recent = s.days.slice(-90);
  const maxC = Math.max(1, ...recent.map((d) => d.contributionCount));
  const bw = 1120 / recent.length, base = 428, maxH = 92;
  body += `<text x="40" y="306" font-family="${MONO}" font-size="12" letter-spacing="3" fill="${P.dim}">LAST 90 DAYS</text>`;
  if (s.best.date) body += `<text x="1160" y="306" text-anchor="end" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${P.dim}">PEAK DAY <tspan fill="${P.cyan}">${s.best.contributionCount}</tspan> · ${fmtDate(s.best.date)}</text>`;
  body += `<line x1="40" y1="${base + 0.5}" x2="1160" y2="${base + 0.5}" stroke="${P.purple}" stroke-opacity=".4"/>`;
  body += `<g clip-path="url(#barsClip)">`;
  recent.forEach((d, i) => {
    const h = d.contributionCount ? Math.max(6, (d.contributionCount / maxC) * maxH) : 3;
    const x = 40 + i * bw + 1.5, w = Math.max(2, bw - 3);
    const fill = d.contributionCount ? 'url(#bar)' : P.purple;
    const op = d.contributionCount ? 1 : 0.25;
    const begin = (1.4 + i * 0.018).toFixed(3);
    body += `<rect x="${x.toFixed(1)}" y="${base}" width="${w.toFixed(1)}" height="0" rx="2" fill="${fill}" opacity="${op}">
      <animate attributeName="height" values="0;${h.toFixed(1)}" dur=".7s" begin="${begin}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".3 1.4 .5 1"/>
      <animate attributeName="y" values="${base};${(base - h).toFixed(1)}" dur=".7s" begin="${begin}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".3 1.4 .5 1"/>
    </rect>`;
  });
  body += `<rect x="-120" y="318" width="120" height="110" fill="url(#scan)">
      <animate attributeName="x" values="-120;1200" dur="3.5s" begin="3.5s" repeatCount="indefinite"/></rect></g>`;

  return frame(W, H, body, defs);
}

function langCard(s) {
  const W = 1200, H = 210;
  const langs = s.langs.length ? s.langs : [{ name: 'Coming soon', color: P.purple, pct: 100 }];
  let defs = `<clipPath id="barClip"><rect x="40" y="74" width="0" height="20" rx="10">
      <animate attributeName="width" values="0;1120" dur="1.8s" begin=".3s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".2 .8 .2 1"/></rect></clipPath>
    <linearGradient id="shine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
  let body = `<g font-family="${MONO}" font-size="14" letter-spacing="3">
    <circle cx="40" cy="38" r="5" fill="${P.pink}"><animate attributeName="opacity" values="1;.2;1" dur="1.2s" repeatCount="indefinite"/></circle>
    <text x="54" y="43" fill="${P.text}">LANGUAGE DNA <tspan fill="${P.dim}">// WHAT I BUILD WITH</tspan></text></g>`;
  body += `<rect x="40" y="74" width="1120" height="20" rx="10" fill="${P.purple}" opacity=".12"/><g clip-path="url(#barClip)">`;
  let x = 40;
  langs.forEach((l) => { const w = (l.pct / 100) * 1120; body += `<rect x="${x.toFixed(1)}" y="74" width="${(w + 0.5).toFixed(1)}" height="20" fill="${l.color}"/>`; x += w; });
  body += `<rect x="-200" y="74" width="200" height="20" fill="url(#shine)"><animate attributeName="x" values="-200;1200" dur="3s" begin="2.2s" repeatCount="indefinite"/></rect></g>`;
  langs.forEach((l, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const lx = 50 + col * 380, ly = 136 + row * 40, d = (1.6 + i * 0.15).toFixed(2);
    body += `<g opacity="0"><animate attributeName="opacity" values="0;1" dur=".5s" begin="${d}s" fill="freeze"/>
      <circle cx="${lx}" cy="${ly - 5}" r="7" fill="${l.color}" filter="url(#glow)"><animate attributeName="r" values="6;8;6" dur="${(2 + i * 0.3).toFixed(1)}s" repeatCount="indefinite"/></circle>
      <text x="${lx + 20}" y="${ly}" font-family="${SANS}" font-size="17" font-weight="700" fill="${P.text}">${esc(l.name)}</text>
      <text x="${lx + 330}" y="${ly}" text-anchor="end" font-family="${MONO}" font-size="15" fill="${l.color}">${l.pct.toFixed(1)}%</text></g>`;
  });
  return frame(W, H, body, defs);
}

// ---------------------------------------------------------------- main
const stats = computeStats(await fetchData());
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/stats.svg`, statsCard(stats));
writeFileSync(`${OUT}/languages.svg`, langCard(stats));
console.log(`✔ stats.svg + languages.svg → ${OUT}  (total ${stats.total}, streak ${stats.current}, longest ${stats.longest})`);
