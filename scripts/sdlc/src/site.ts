import fs from 'node:fs/promises';
import path from 'node:path';
import { RELEASES, STORY_STATUSES, type Epic, type Item, type Story, type TestCase } from './schema';
import type { RunSummary, TestResult } from './playwright-report';
import { resultOf, type TraceResult } from './trace';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const PAGES = [
  ['index.html', 'Home'],
  ['backlog.html', 'Backlog'],
  ['traceability.html', 'Traceability'],
  ['tests.html', 'Test report'],
] as const;

const CSS = `
:root{--bg:#F6F7FB;--card:#FFFFFF;--ink:#1B1F3B;--muted:#5A6080;--line:#E3E6F0;--accent:#C9671A;--blue:#2F6FA8;--head:#1B1F3B;--head-ink:#F6F7FB;
  --ok-bg:#E3F1EA;--ok:#1F6B45;--bad-bg:#FBE6E3;--bad:#A3322A;--na-bg:#EEF0F6;--na:#5A6080;--prog-bg:#E6EEF8;--prog:#245A8C;
  --font:'Manrope',Arial,sans-serif;--mono:'JetBrains Mono',Consolas,monospace}
@media (prefers-color-scheme:dark){:root{--bg:#121528;--card:#1B1F36;--ink:#EEF0FA;--muted:#A3A9C7;--line:#2C3150;--accent:#F2994A;--blue:#6FA8DC;--head:#0B0D1C;--head-ink:#EEF0FA;
  --ok-bg:#16382A;--ok:#8FD9B0;--bad-bg:#43201D;--bad:#F2A49B;--na-bg:#262A44;--na:#A3A9C7;--prog-bg:#1C3350;--prog:#9CC4EC;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 var(--font)}
a{color:var(--blue)}
header{background:var(--head);color:var(--head-ink)}
.bar{max-width:1120px;margin:0 auto;padding:14px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 24px}
.brand{font-weight:800;font-size:18px;margin-right:auto;color:inherit;text-decoration:none}
.brand span{color:#F2994A}
nav{display:flex;gap:4px;flex-wrap:wrap}
nav a{color:inherit;text-decoration:none;padding:6px 12px;border-radius:999px;font-weight:600;font-size:14px;opacity:.8}
nav a[aria-current],nav a:hover{background:rgba(255,255,255,.12);opacity:1}
main{max-width:1120px;margin:0 auto;padding:32px 16px 64px;display:flex;flex-direction:column;gap:40px}
section{display:flex;flex-direction:column;gap:16px}
h1{font-size:32px;margin:0;font-weight:800}
h2{font-size:20px;margin:0;font-weight:700}
.sub{color:var(--muted);margin:4px 0 0}
code{font-family:var(--mono);font-size:13px;background:var(--card);border:1px solid var(--line);padding:1px 6px;border-radius:6px}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.kpi,.rel,.col,.tbl{background:var(--card);border:1px solid var(--line);border-radius:12px}
.kpi{padding:16px}
.kpi b{display:block;font-size:34px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
.kpi span{color:var(--muted);font-size:13px}
.meter{height:6px;background:var(--na-bg);border-radius:99px;margin-top:10px;overflow:hidden}
.meter i{display:block;height:100%;background:var(--ok)}
.releases{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.rel{padding:16px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.rel .tag{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--accent)}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;white-space:nowrap}
.ok{background:var(--ok-bg);color:var(--ok)}.bad{background:var(--bad-bg);color:var(--bad)}.na{background:var(--na-bg);color:var(--na)}.prog{background:var(--prog-bg);color:var(--prog)}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.tbl{overflow-x:auto}
table{border-collapse:collapse;width:100%;min-width:720px;font-size:14px}
th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:700}
tr:last-child td{border-bottom:none}
.id{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--blue)}
td small,.tk small{display:block;color:var(--muted);font-size:12px}
.board{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.col{padding:12px;display:flex;flex-direction:column;gap:8px;min-width:0}
.col h3{margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);display:flex;justify-content:space-between}
.tk{border:1px solid var(--line);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:2px;background:var(--bg)}
.tk p{margin:0;font-size:14px;font-weight:600}
.empty{color:var(--muted);font-size:13px;margin:0}
@media (max-width:900px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.releases,.board{grid-template-columns:1fr}}
`;

const page = (file: string, title: string, body: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Sketch Game SDLC</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&family=JetBrains+Mono:wght@600&display=swap">
<style>${CSS}</style>
</head>
<body>
<header><div class="bar"><a class="brand" href="index.html">Sketch Game <span>SDLC</span></a>
<nav>${PAGES.map(([href, label]) => `<a href="${href}"${href === file ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav></div></header>
<main>
${body}
</main>
</body>
</html>
`;

const CHIP: Record<TraceResult, string> = {
  passed: '<span class="chip ok">✓ Passed</span>',
  failed: '<span class="chip bad">✗ Failed</span>',
  skipped: '<span class="chip na">○ Skipped</span>',
  'not run': '<span class="chip na">○ Not run</span>',
  manual: '<span class="chip na">Manual</span>',
};

const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '—');
const meter = (n: number, of: number) => `<div class="meter"><i style="width:${of ? Math.round((n / of) * 100) : 0}%"></i></div>`;

function releaseStatus(stories: Story[]): string {
  if (stories.length === 0) return '<span class="chip na">Not started</span>';
  if (stories.every((s) => s.status === 'Done')) return '<span class="chip ok">Done</span>';
  return '<span class="chip prog">In progress</span>';
}

export async function buildSite(opts: {
  items: Item[];
  results: Map<string, TestResult>;
  outDir: string;
  commit: string;
  generatedAt: string;
  /** Prepended to `stories/US-###.md` for links to story files. */
  linkBase: string;
  repoUrl?: string;
  /** The latest Playwright run; undefined when there is no report. */
  run?: RunSummary;
}): Promise<void> {
  const { items, results, linkBase } = opts;
  const byId = new Map(items.map((i) => [i.id, i]));
  const stories = items.filter((i): i is Story => i.type === 'story').sort((a, b) => a.id.localeCompare(b.id));
  const testCases = items.filter((i): i is TestCase => i.type === 'test-case').sort((a, b) => a.id.localeCompare(b.id));
  const testsOf = (s: Story) => testCases.filter((tc) => tc.parent.includes(s.id));
  const titleOf = (id: string) => esc(byId.get(id)?.title ?? '');
  const storyLink = (s: Story) => `<a class="id" href="${linkBase}stories/${s.id}.md">${s.id}</a>`;

  const automated = testCases.filter((tc) => tc.automation !== 'manual');
  const passed = automated.filter((tc) => resultOf(tc, results) === 'passed').length;
  const covered = stories.filter((s) => testsOf(s).length > 0).length;

  const index = `<section>
<div><h1>Project health</h1><p class="sub">Built from commit <code>${esc(opts.commit)}</code> · ${esc(opts.generatedAt.slice(0, 10))}${
    opts.repoUrl ? ` · <a href="${opts.repoUrl}">Source and SDLC documents</a>` : ''
  }</p></div>
<div class="kpis">
<div class="kpi"><b data-kpi="stories">${stories.length}</b><span>Stories</span></div>
<div class="kpi"><b data-kpi="test-cases">${testCases.length}</b><span>Test cases</span></div>
<div class="kpi"><b data-kpi="pass-rate">${pct(passed, automated.length)}</b><span>${passed} of ${automated.length} automated passing</span>${meter(passed, automated.length)}</div>
<div class="kpi"><b data-kpi="coverage">${pct(covered, stories.length)}</b><span>Stories with test cases</span>${meter(covered, stories.length)}</div>
</div>
</section>
<section>
<h2>Releases</h2>
<div class="releases">
${RELEASES.map((r) => {
  const inRelease = stories.filter((s) => s.release === r);
  const tests = new Set(inRelease.flatMap((s) => testsOf(s).map((tc) => tc.id))).size;
  const epics = items.filter((i): i is Epic => i.type === 'epic' && i.release === r).map((e) => esc(e.title));
  return `<div class="rel" data-release="${r}"><span class="tag">${r}</span><b>${
    inRelease.length ? `${inRelease.length} ${inRelease.length === 1 ? 'story' : 'stories'} · ${tests} ${tests === 1 ? 'test case' : 'test cases'}` : 'Not planned yet'
  }</b>${epics.length ? `<small>${epics.join(' · ')}</small>` : ''}${releaseStatus(inRelease)}</div>`;
}).join('\n')}
</div>
</section>`;

  const backlog = RELEASES.map((r) => {
    const inRelease = stories.filter((s) => s.release === r);
    if (inRelease.length === 0) return `<section><h2>${r}</h2><p class="empty">No stories yet.</p></section>`;
    const columns = STORY_STATUSES.map((status) => {
      const cards = inRelease.filter((s) => s.status === status);
      return `<div class="col" data-status="${status}"><h3>${status}<span>${cards.length}</span></h3>${
        cards.length
          ? cards
              .map((s) => {
                const n = testsOf(s).length;
                const meta = [s.parent, s.sprint, s.points ? `${s.points} pts` : '', `${n} ${n === 1 ? 'test case' : 'test cases'}`].filter((m): m is string => Boolean(m));
                return `<div class="tk">${storyLink(s)}<p>${esc(s.title)}</p><small>${meta.map(esc).join(' · ')}</small></div>`;
              })
              .join('')
          : '<p class="empty">None</p>'
      }</div>`;
    }).join('\n');
    return `<section><h2>${r}</h2><div class="board">\n${columns}\n</div></section>`;
  }).join('\n');

  const rows = stories.flatMap((s) => {
    const epic = byId.get(s.parent);
    const initiative = epic?.type === 'epic' ? epic.parent : '';
    const lead = `<td><span class="id">${esc(initiative || '—')}</span><small>${titleOf(initiative)}</small></td>
<td><span class="id">${esc(s.parent)}</span><small>${titleOf(s.parent)}</small></td>
<td>${storyLink(s)}<small>${esc(s.title)} · ${esc(s.status)}</small></td>`;
    const tcs = testsOf(s);
    if (tcs.length === 0) return [`<tr>${lead}<td>—</td><td><span class="chip bad">No test cases</span></td></tr>`];
    return tcs.map((tc) => `<tr>${lead}<td><span class="id">${tc.id}</span><small>${esc(tc.title)} · ${tc.automation}</small></td><td>${CHIP[resultOf(tc, results)]}</td></tr>`);
  });
  const counts = new Map<TraceResult, number>();
  for (const tc of testCases) counts.set(resultOf(tc, results), (counts.get(resultOf(tc, results)) ?? 0) + 1);

  const trace = `<section>
<div><h1>Traceability matrix</h1><p class="sub">Initiative → epic → story → test case → latest result.</p></div>
<div class="chips">${[...counts].map(([r, n]) => CHIP[r].replace('</span>', ` · ${n}</span>`)).join('')}</div>
<div class="tbl"><table>
<tr><th>Initiative</th><th>Epic</th><th>Story</th><th>Test case</th><th>Result</th></tr>
${rows.join('\n') || '<tr><td colspan="5" class="empty">No stories yet.</td></tr>'}
</table></div>
</section>`;

  const run = opts.run;
  const runCounts = new Map<TestResult, number>();
  for (const t of run?.tests ?? []) runCounts.set(t.result, (runCounts.get(t.result) ?? 0) + 1);
  const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
  const testRow = (t: RunSummary['tests'][number]) => {
    const tc = /^(TC-\d{3})\b\s*(.*)$/.exec(t.title);
    const name = tc ? `<span class="id">${tc[1]}</span> ${esc(tc[2])}` : esc(t.title);
    const notes = [t.retried ? 'Passed on retry' : '', t.error ? esc(t.error) : ''].filter(Boolean).join(' · ');
    return `<tr><td>${name}${notes ? `<small>${notes}</small>` : ''}</td><td><code>${esc(t.file)}</code></td><td>${esc(t.project)}</td><td>${secs(t.durationMs)}</td><td>${CHIP[t.result]}</td></tr>`;
  };
  const testsPage = `<section>
<div><h1>Test report</h1><p class="sub">${
    run
      ? `Run ${esc(run.startedAt?.slice(0, 16).replace('T', ' ') ?? '')} UTC · ${run.tests.length} ${run.tests.length === 1 ? 'test' : 'tests'}${run.durationMs ? ` · ${secs(run.durationMs)}` : ''}`
      : 'No test run yet. The next CI run fills this page.'
  }</p></div>
${run ? `<div class="chips">${[...runCounts].map(([r, n]) => CHIP[r].replace('</span>', ` · ${n}</span>`)).join('')}</div>
<div class="tbl"><table>
<tr><th>Test</th><th>File</th><th>Browser</th><th>Duration</th><th>Result</th></tr>
${run.tests.map(testRow).join('\n') || '<tr><td colspan="5" class="empty">No tests in this run.</td></tr>'}
</table></div>` : ''}
<p class="sub"><a href="playwright/index.html">Open the full Playwright report</a> for step-by-step traces and screenshots.</p>
</section>`;

  await fs.mkdir(opts.outDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(opts.outDir, 'index.html'), page('index.html', 'Home', index)),
    fs.writeFile(path.join(opts.outDir, 'backlog.html'), page('backlog.html', 'Backlog', `<h1>Backlog</h1>\n${backlog}`)),
    fs.writeFile(path.join(opts.outDir, 'traceability.html'), page('traceability.html', 'Traceability', trace)),
    fs.writeFile(path.join(opts.outDir, 'tests.html'), page('tests.html', 'Test report', testsPage)),
  ]);
}
