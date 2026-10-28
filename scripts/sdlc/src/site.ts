import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';

const page = (title: string, body: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Sketch Game SDLC</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; max-width: 1100px; margin: 0 auto; padding: 16px; color: #1f2328; background: #fff; }
  nav a { margin-right: 16px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px; }
  th, td { border: 1px solid #d0d7de; padding: 6px 10px; text-align: left; }
  th { background: #f6f8fa; }
  blockquote { color: #59636e; margin: 0; padding-left: 12px; border-left: 3px solid #d0d7de; }
  @media (prefers-color-scheme: dark) {
    body { color: #e6edf3; background: #0d1117; }
    a { color: #4493f8; }
    th { background: #161b22; }
    th, td { border-color: #30363d; }
  }
</style>
</head>
<body>
<nav><a href="index.html">Home</a><a href="backlog.html">Backlog</a><a href="traceability.html">Traceability</a><a href="playwright/index.html">Test report</a></nav>
${body}
</body>
</html>
`;

export async function buildSite(opts: {
  backlogMd: string;
  traceMd: string;
  outDir: string;
  commit: string;
  repoUrl?: string;
}): Promise<void> {
  await fs.mkdir(opts.outDir, { recursive: true });
  const repo = opts.repoUrl ? `<li><a href="${opts.repoUrl}">Source and SDLC documents</a></li>` : '';
  const index = `<h1>Sketch Game: SDLC dashboard</h1>
<p>Generated from commit <code>${opts.commit}</code>.</p>
<ul>
<li><a href="backlog.html">Backlog</a>: stories by release and sprint</li>
<li><a href="traceability.html">Traceability matrix</a>: initiative → story → test case → result</li>
<li><a href="playwright/index.html">Playwright report</a>: the latest end-to-end run</li>
${repo}
</ul>`;
  await Promise.all([
    fs.writeFile(path.join(opts.outDir, 'index.html'), page('Home', index)),
    fs.writeFile(path.join(opts.outDir, 'backlog.html'), page('Backlog', await marked.parse(opts.backlogMd))),
    fs.writeFile(path.join(opts.outDir, 'traceability.html'), page('Traceability', await marked.parse(opts.traceMd))),
  ]);
}
