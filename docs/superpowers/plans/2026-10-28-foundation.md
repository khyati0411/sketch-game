# Foundation (Setup + SDLC Tooling) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the sketch-game repo: a deployable TypeScript skeleton (client + Socket.IO server), plus the SDLC system (item templates, validator, backlog/traceability generators), CI, GitHub Pages publishing, and deploy config. This is everything R1's stage flow needs before the first initiative is written.

**Architecture:** npm-workspaces monorepo: `client` (React + Vite), `server` (Express + Socket.IO; serves the built client), `shared` (types), `scripts/sdlc` (Node CLI tools run with `tsx`). SDLC items are Markdown files with YAML frontmatter under `docs/sdlc/`. Pure functions load, validate and render them, and thin CLIs write the output files. CI runs everything and publishes generated views to GitHub Pages.

**Tech Stack:** Node 24, TypeScript 5, npm workspaces, React 18 + Vite, Express 4, Socket.IO 4, Vitest, Playwright, gray-matter, zod, fast-glob, marked, tsx, GitHub Actions, Render.

**Spec:** `docs/superpowers/specs/2026-10-28-sketch-game-design.md`

## Global Constraints

- TypeScript everywhere; Node 24; Windows 11 dev machine (paths and line endings must work on Windows and in Linux CI).
- Everything SDLC-related is local Markdown in the repo; no Jira/Zephyr.
- IDs: `INIT-###`, `EP-###`, `US-###`, `ADR-###`, `TC-###`, `SPRINT-##`. Global, sequential, never reused.
- Story statuses: `Draft | Ready | In Progress | In Review | Done`.
- Releases: `R1 | R2 | R3`.
- Playwright test titles start with the TC ID: `test('TC-015 guesser sees blanks for the word', ...)`.
- `docs/sdlc/backlog.md` and `docs/sdlc/traceability.md` are GENERATED and gitignored; CI publishes them to GitHub Pages from `main`.
- Every change reaches `main` through a PR; `main` requires green CI.
- Free-tier hosting with a scheduled keep-alive ping; a single Node service serves client + Socket.IO.

## Review Focus

1. **CRLF line endings.** Git on Windows checks files out with CRLF. The frontmatter loader must parse CRLF and LF files identically. Test in Task 3.
2. **Malformed item files.** Bad YAML or a missing required field must produce a validation error naming the file path, not an unhandled exception. Test in Task 3.
3. **Templates folder.** `docs/sdlc/templates/*.md` contain placeholder IDs and must never be loaded as real items, or they cause duplicate-ID errors. Test in Task 3.
4. **No Playwright report yet.** `sdlc:trace` run before any E2E run must render "not run" for every test case, not crash. Test in Task 5.
5. **YAML auto-typing.** Unquoted dates (`start: 2026-11-02`) parse as `Date`, and `points: 03` as a number. The schema must accept dates and normalize them to `YYYY-MM-DD` strings. Test in Task 3.

---

### Task 0 (owner action, guided): GitHub repo and remote

Claude walks the owner through this and asks before running anything that creates things on GitHub.

- [ ] **Step 1:** Owner confirms the repo name and visibility (public), and that `gh auth status` shows them logged in.
- [ ] **Step 2:** `gh repo create <name> --public --source . --remote origin --push`
  Expected: `master` is pushed. Rename to `main`: `git branch -m master main`, `git push -u origin main`, `gh repo edit --default-branch main`, then delete the remote `master`.
- [ ] **Step 3:** All later tasks run on branch `setup/foundation` and merge by PR at the end (Task 8).

### Task 1: Monorepo skeleton and server

**Files:**
- Create: `package.json` (root, workspaces `client`, `server`, `shared`, `scripts/sdlc`), `tsconfig.base.json`, `.gitignore`, `.gitattributes` (`* text=auto eol=lf`), `.nvmrc` (`24`)
- Create: `shared/package.json`, `shared/src/index.ts`
- Create: `server/package.json`, `server/src/app.ts`, `server/src/index.ts`
- Test: `server/test/app.test.ts`

**Interfaces:**
- Produces: `createServer(opts: { clientDist?: string }): { httpServer: http.Server; io: socket.io.Server }` in `server/src/app.ts`. `GET /health` → `200 {"status":"ok"}`. When `clientDist` exists, it serves static files with an SPA fallback to `index.html`. On socket connect, it emits `server:hello` with `{ version: string }`.
- Produces: `shared/src/index.ts` exports `const SERVER_HELLO = 'server:hello'` and `type ServerHello = { version: string }`.
- `server/src/index.ts` listens on `process.env.PORT ?? 3000` and uses `clientDist = ../client/dist`.
- Root scripts: `build` (shared → client → server), `start` (`node server/dist/index.js`), `test` (vitest across workspaces), `dev`.

- [ ] **Step 1: Write the failing tests**

```ts
it('GET /health returns ok', async () => {
  const { httpServer } = createServer({});
  const res = await request(httpServer).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});
it('emits server:hello on socket connect', async () => {
  // listen on port 0, connect with socket.io-client, await SERVER_HELLO payload
  expect(payload.version).toMatch(/^\d+\.\d+\.\d+$/);
});
```

- [ ] **Step 2:** `npm test -w server`. Expected: FAIL, `createServer` is not defined.
- [ ] **Step 3:** Implement `createServer` as specified (version read from `server/package.json`).
- [ ] **Step 4:** `npm test -w server`. Expected: 2 passed.
- [ ] **Step 5: Commit:** `feat: monorepo skeleton with health and socket hello`

### Task 2: Client shell and E2E smoke

**Files:**
- Create: `client/` (Vite React TS: `index.html` with `<title>Sketch Game</title>`, `src/main.tsx`, `src/App.tsx`, `vite.config.ts` proxying `/socket.io` and `/health` to `:3000`)
- Create: `playwright.config.ts` (testDir `tests/e2e`, `webServer: npm run build && npm start` on port 3000, reporters `list`, `html` → `playwright-report/`, `json` → `test-results/results.json`)
- Test: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `SERVER_HELLO`, `ServerHello` from `shared`.
- Produces: `App` renders a heading "Sketch Game" and an element `data-testid="conn-status"` whose text becomes `connected v<version>` after `server:hello`.

Smoke tests carry no TC ID (they're infrastructure, not R1 test cases). Task 4's validator ignores titles without a TC prefix.

- [ ] **Step 1: Write the failing test**

```ts
test('smoke: app loads and socket connects', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Sketch Game');
  await expect(page.getByTestId('conn-status')).toHaveText(/^connected v\d+\.\d+\.\d+$/);
});
```

- [ ] **Step 2:** `npx playwright test`. Expected: FAIL (no client yet).
- [ ] **Step 3:** Implement the client shell.
- [ ] **Step 4:** `npx playwright test`. Expected: 1 passed. `test-results/results.json` exists.
- [ ] **Step 5: Commit:** `feat: client shell with socket status and e2e smoke`

### Task 3: SDLC item model, templates, and loader

**Files:**
- Create: `scripts/sdlc/package.json`, `scripts/sdlc/src/schema.ts`, `scripts/sdlc/src/load.ts`
- Create: `docs/sdlc/README.md` (ID scheme, statuses, stage flow and PR-per-stage rule copied from spec §6, and an empty "Automation notes" section)
- Create: `docs/sdlc/templates/{initiative,epic,story,adr,test-case,sprint,release}.md`
- Create: `docs/sdlc/test-plan.md` (headings: Scope, Strategy, Test types, Environments, Entry/Exit criteria, Per-release scope: R1/R2/R3)
- Create: empty dirs with `.gitkeep`: `initiatives/ epics/ stories/ design/ test-cases/ sprints/ releases/`
- Test: `scripts/sdlc/test/load.test.ts` with fixtures in `scripts/sdlc/test/fixtures/`

**Interfaces:**
- Produces in `schema.ts` (zod schemas plus inferred types, discriminated on `type`):
  - common: `id`, `type`, `title: string`
  - `initiative`: `status: 'Draft'|'Approved'`
  - `epic`: `parent: INIT id`, `release`, `status: StoryStatus`
  - `story`: `parent: EP id`, `release`, `sprint?: SPRINT id`, `status: StoryStatus`, `points?: 1|2|3|5|8|13`, `links?: { tests?: TC id[]; design?: ADR id[] }`
  - `adr`: `status: 'Proposed'|'Accepted'|'Superseded'`, `stories: US id[]`
  - `test-case`: `parent: US id[]` (min 1), `priority: 'High'|'Medium'|'Low'`, `testType: 'functional'|'negative'|'realtime'|'non-functional'`, `automation: 'automated'|'manual'`, `manualReason?` (required when manual), `status: 'Draft'|'Ready'`
  - `sprint`: `release`, `goal: string`, `start`, `end` (dates accepted as Date or string, normalized to `YYYY-MM-DD`), `status: 'Planned'|'Active'|'Closed'`
  - ID regex per type: the Global Constraints formats. `type Item`, `type ItemType`.
- Produces in `load.ts`: `loadItems(sdlcRoot: string): Promise<{ items: (Item & { file: string })[]; errors: LoadError[] }>`, where `type LoadError = { file: string; message: string }`. It globs `**/*.md` under `sdlcRoot`, excludes `templates/**`, `README.md`, `test-plan.md`, `backlog.md`, `traceability.md`, and `releases/**`. `file` is a repo-relative path with forward slashes.

Templates use a placeholder ID (`US-XXX`) and an explanatory body: story = "As a / I want / so that" plus Given/When/Then acceptance criteria; test case = Objective, Preconditions, numbered Steps | Expected result table.

- [ ] **Step 1: Write the failing tests**

```ts
it('loads a valid story', ...)           // fixtures/valid/stories/US-001.md → items[0].id === 'US-001'
it('parses CRLF files the same as LF', ...)  // same content written with \r\n → deep-equal item
it('reports bad YAML with file path, no throw', ...)  // errors[0].file endsWith 'US-002.md'
it('reports missing required field', ...)     // story without parent → errors[0].message contains 'parent'
it('rejects id not matching its type', ...)    // type story, id TC-001 → error
it('normalizes unquoted sprint dates', ...)    // start: 2026-11-02 → '2026-11-02'
it('requires manualReason for manual test cases', ...)
it('skips templates/ and README', ...)         // run on docs/sdlc → errors empty, no XXX ids
```

- [ ] **Step 2:** `npm test -w scripts/sdlc`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement the schemas and `loadItems` (gray-matter + fast-glob + zod `safeParse`; collect, never throw).
- [ ] **Step 4:** `npm test -w scripts/sdlc`. Expected: 8 passed.
- [ ] **Step 5: Commit:** `feat(sdlc): item schema, templates and loader`

### Task 4: Validator and `sdlc:validate`

**Files:**
- Create: `scripts/sdlc/src/e2e-ids.ts`, `scripts/sdlc/src/validate.ts`, `scripts/sdlc/src/cli/validate.ts`
- Modify: root `package.json`: add the script `"sdlc:validate": "tsx scripts/sdlc/src/cli/validate.ts"`
- Test: `scripts/sdlc/test/validate.test.ts`, `scripts/sdlc/test/e2e-ids.test.ts`

**Interfaces:**
- Consumes: `Item`, `loadItems`.
- Produces: `collectE2eTestIds(testDir: string): Promise<Map<string, string[]>>` maps TC id → test file paths. It matches `test(` / `test.only(` / `test.skip(` whose first string-literal argument starts with `TC-\d{3}\b`, in any quote style.
- Produces: `validate(items: Item[], e2e: Map<string, string[]>): ValidationError[]`, where `type ValidationError = { rule: string; id?: string; file?: string; message: string }`.
- CLI: prints errors grouped by file and exits 1 on any load or validation error, else prints `SDLC OK: <n> items` and exits 0.

Rules (one test each):
| rule | condition |
|---|---|
| `unique-id` | no two items share an id |
| `parent-type` | epic→initiative, story→epic, test-case→story (each entry) resolve and have the right type |
| `link-resolves` | story `links.design` → existing ADR, `links.tests` → existing TC; ADR `stories` → existing US; story `sprint` → existing sprint |
| `story-tests-consistent` | if a story has `links.tests`, it equals the set of TCs whose `parent` includes the story |
| `story-has-tests` | a story with status `In Progress`, `In Review` or `Done` has ≥1 TC |
| `automated-has-e2e` | an `automated` TC whose parent stories are all `Done` appears in the e2e map |
| `e2e-known-tc` | every TC id in the e2e map exists as a TC item |
| `sprint-release` | a story's sprint has the same release as the story |

- [ ] **Step 1:** Write the failing tests: one passing fixture set (expect `[]`), one violation test per rule asserting `rule` and `id`, plus e2e-ids tests (single and double quotes, backticks, a non-TC title ignored, `test.skip` counted).
- [ ] **Step 2:** `npm test -w scripts/sdlc`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test -w scripts/sdlc` passes; `npm run sdlc:validate` on the empty repo prints `SDLC OK: 0 items`.
- [ ] **Step 5: Commit:** `feat(sdlc): validator and sdlc:validate`

### Task 5: Backlog and traceability generators

**Files:**
- Create: `scripts/sdlc/src/backlog.ts`, `scripts/sdlc/src/playwright-report.ts`, `scripts/sdlc/src/trace.ts`, `scripts/sdlc/src/cli/backlog.ts`, `scripts/sdlc/src/cli/trace.ts`
- Modify: root `package.json` (`sdlc:backlog`, `sdlc:trace`), `.gitignore` (`docs/sdlc/backlog.md`, `docs/sdlc/traceability.md`, `site/`, `playwright-report/`, `test-results/`)
- Test: `scripts/sdlc/test/backlog.test.ts`, `scripts/sdlc/test/trace.test.ts`

**Interfaces:**
- Produces: `renderBacklog(items: Item[]): string`. Markdown with `## R1`, `## R2`, `## R3` sections; within each, `### SPRINT-01: <goal>` sections (sprint order), then `### Unscheduled`. Each section has a table `| ID | Title | Epic | Status | Points |` sorted by status order (Draft→Done) then id, followed by `Total: <sum> pts (<done> done)`. Story IDs link to `stories/US-###.md`. A header line says `Generated by sdlc:backlog. Do not edit.`
- Produces: `type TestResult = 'passed' | 'failed' | 'skipped' | 'not run'`; `parsePlaywrightReport(json: unknown): Map<string, TestResult>` walks `suites[].specs[]` recursively (nested `describe`s), reads the TC id from the spec title, takes the last attempt's status, and lets `failed` win when one TC has several specs.
- Produces: `renderTraceability(items: Item[], results: Map<string, TestResult>, meta: { generatedAt: string; commit: string }): string`. One table `| Initiative | Epic | Story | Status | Test case | Automation | Result |`, with one row per (story, TC) and stories without TCs shown with `—`. It ends with a summary: counts of passed/failed/not run/manual, and coverage = stories with ≥1 TC / all stories.
- CLI `sdlc:trace` reads `test-results/results.json` if present; otherwise every automated TC is `not run`. Manual TCs show `manual`.

- [ ] **Step 1:** Write the failing tests: backlog grouping and order, points totals, unscheduled section; report parsing with nested suites and retries (last attempt wins); failed-wins merge; **no report → all `not run`**; manual TC row; coverage %.
- [ ] **Step 2:** `npm test -w scripts/sdlc`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Tests pass; `npm run sdlc:backlog && npm run sdlc:trace` write both files without error.
- [ ] **Step 5: Commit:** `feat(sdlc): backlog and traceability generators`

### Task 6: CI, Pages site, and keep-alive

**Files:**
- Create: `scripts/sdlc/src/site.ts`, `scripts/sdlc/src/cli/site.ts` (`sdlc:site`)
- Create: `.github/workflows/ci.yml`, `.github/workflows/keepalive.yml`
- Test: `scripts/sdlc/test/site.test.ts`

**Interfaces:**
- Produces: `buildSite(opts: { backlogMd: string; traceMd: string; outDir: string; commit: string }): Promise<void>`. It writes `outDir/index.html` (links to backlog, traceability, Playwright report, repo), `backlog.html` and `traceability.html` (rendered with `marked` inside one shared minimal HTML shell with readable table CSS). The CLI then copies `playwright-report/` to `site/playwright/` when present.
- `ci.yml`: on push and pull_request. Steps: checkout, setup-node 24 with npm cache, `npm ci`, `npx playwright install --with-deps chromium`, `npm run sdlc:validate`, `npm test`, `npx playwright test` (`continue-on-error: false`), then always `sdlc:backlog`, `sdlc:trace`, `sdlc:site`, upload `site/` as a build artifact. On `main` only, a `deploy-pages` job runs `actions/upload-pages-artifact` + `actions/deploy-pages` (permissions `pages: write`, `id-token: write`) with `if: always()` after the test job, so failures are published too.
- `keepalive.yml`: cron `*/10 * * * *`, `curl -fsS "$LIVE_URL/health"` using the repo variable `LIVE_URL`; it skips when the variable is unset.

- [ ] **Step 1:** Write the failing test: `buildSite` with sample markdown → the three HTML files exist; `traceability.html` contains a `<table>`; `index.html` links `playwright/index.html`.
- [ ] **Step 2:** Run, see FAIL; implement; run, see PASS.
- [ ] **Step 3:** Push the branch and open a draft PR. Expected: CI is green and the site artifact is downloadable.
- [ ] **Step 4: Commit:** `ci: validate, test, e2e, generate and publish SDLC site`

### Task 7: Deploy config

**Files:**
- Create: `render.yaml` (web service, `buildCommand: npm ci && npm run build`, `startCommand: npm start`, `healthCheckPath: /health`, plan free, Node 24)
- Create: `docs/sdlc/design/ADR-001.md`: hosting decision (Render free + keep-alive; accepted trade-offs: cold starts, in-memory rooms lost on restart). `stories: []` until R1 stories exist.
- Modify: `README.md`: project intro, links to live URL, Pages site, `docs/sdlc/README.md`; cold-start note; local dev commands.

- [ ] **Step 1:** Locally: `npm run build && npm start`, then `curl http://localhost:3000/health` → `{"status":"ok"}`; open `/` and see `connected v0.1.0`.
- [ ] **Step 2 (owner action, guided):** The owner connects the repo in the Render dashboard (Blueprint → `render.yaml`), and Claude walks them through it. When it's live, they set the repo variable `LIVE_URL` (`gh variable set LIVE_URL`).
- [ ] **Step 3:** Verify `curl $LIVE_URL/health` → ok and the live page shows `connected`. This proves WebSockets work on the host.
- [ ] **Step 4:** `npm run sdlc:validate` → OK (ADR-001 counts). **Commit:** `chore: render deploy config, ADR-001 hosting, README`

### Task 8: Merge foundation and protect main

- [ ] **Step 1:** Mark the PR ready. The description summarizes Tasks 1–7 and the owner's sign-off line. The owner merges.
- [ ] **Step 2 (owner action, guided):** Enable Pages (Source: GitHub Actions). Add a branch protection rule on `main`: require a PR and the `ci` status check.
- [ ] **Step 3:** Verify the Pages URL serves `index.html` with the backlog (empty), the traceability matrix (empty, coverage n/a), and the smoke Playwright report. Add the Pages URL to the README via a small PR.

---

## After this plan: R1 stage flow (guided, not code tasks)

Each stage is a guided session with Claude, done on its own `sdlc/R1-…` branch and merged by PR (spec §6.5). Claude drafts each item from the templates, the owner reviews by clicking options, and Claude records what worked under "Automation notes" in `docs/sdlc/README.md`.

1. `sdlc/R1-01-initiative`: INIT-001 (whole product, R1–R3)
2. `sdlc/R1-02-stories`: R1 epics and stories, status `Ready`
3. `sdlc/R1-03-sprint-planning`: SPRINT-01..n; regenerate backlog
4. `sdlc/R1-04-design`: `architecture.md` + ADRs (socket protocol, canvas sync, scoring), with UI mockups shown to the owner
5. `sdlc/R1-05-test-cases`: test-plan R1 section + TC files; `sdlc:validate` green
6. **Then write the R1 build plan** (writing-plans), with one task per story, test-first, Playwright specs named by TC.
7. Build → sprint review/retro → `releases/R1.md` → deploy → skill-extraction proposal at the retro.
