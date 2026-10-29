# Sketch Game: Design

**Date:** 2026-10-28
**Status:** Draft, awaiting approval
**Working name:** sketch-game (final name TBD)

## 1. Intent and why

Build a multiplayer draw-and-guess web game in the style of skribbl.io, polished enough
to show publicly, and build it through a full SDLC whose artifacts are produced with
Claude's help and kept as local Markdown in the repo (no Jira, no Zephyr).

The owner already knows SDLC. The point is not to learn the process. It is to
**show that Claude can automate it end to end**, from initiative to user stories, design,
test cases, automated test scripts, and traceability, while producing a real, playable game.

There are two deliverables, and both are part of the showcase:

1. **The game:** hosted on the owner's PC and playable by anyone on the same network
   (changed 2026-10-29, see ADR-002; previously a public URL).
2. **The SDLC trail:** every initiative, epic, story, test case, and test result lives in
   the public GitHub repo and links together by ID, with a traceability matrix that is
   generated, never hand-written.

## 2. Goals, non-goals, anti-goals

**Goals**
- A playable, fun, low-latency skribbl.io-style game that anyone on the same network can
  open from a link.
- A complete SDLC artifact chain for every feature, consistent across three releases.
- Automated end-to-end tests (Playwright) that map 1:1 to documented test cases and run in CI.
- A process that is repeatable with Claude. After it has been proven on this project, each
  stage gets extracted into a reusable Claude skill or slash command.

**Non-goals**
- Native mobile apps (the web app should still be usable on a phone browser).
- Voice or video chat, monetization, ads, internationalization.
- Integrating with real Jira or Zephyr, or exporting to them.

**Anti-goals** (failure even if it "works")
- **Back-filled process:** documents written after the code to make it look like SDLC
  happened. Each stage's artifact must exist and be reviewed *before* the next stage starts.
- **Hand-maintained traceability:** a matrix that drifts from reality. It must be generated
  from the item files and real test results.
- **A laggy or desyncing game:** if drawing doesn't feel real-time, the showcase fails no
  matter how good the documents are.

## 3. Constraints

- Everything is local Markdown in the repo, plus the public GitHub remote (code, PRs, CI,
  Pages dashboard).
- No third-party hosting for the game: it runs on the owner's PC (ADR-002).
- Dev machine: Windows 11, Node 24, git available.
- Releases R1 and R2 have no database and no accounts (guest nicknames only). A database
  arrives only in R3.

## 4. Approaches considered

### 4a. Document structure

| Option | Description | Trade-off |
|---|---|---|
| A. File per stage | One `.md` per stage holding all items, with stable IDs | Easy to read on GitHub; files get long |
| **B. File per item (chosen)** | One `.md` per initiative, epic, story, and test case, each with YAML frontmatter; backlog and matrix generated | Most Jira-like and most automatable; many small files |
| C. File per stage per release | Stage files split by R1/R2/R3 | Tidy releases; stories that change across releases get duplicated |

**Chosen: B.** The owner picked it. It mirrors Jira tickets and Zephyr cases most closely,
and it maps cleanly to future automation: one skill writes one item file, and generators
build the views.

### 4b. Automation level

| Option | Trade-off |
|---|---|
| Reusable pipeline from day 1 | Locks in stage templates before learning what works |
| Guided, this project only | Nothing reusable left behind |
| **Guided first, extract later (chosen)** | Slower to a reusable tool, but the tool reflects what actually worked |

### 4c. Tech stack

**Chosen: TypeScript end to end.** React + Vite (HTML canvas) on the frontend, Node +
Socket.IO on the server, Playwright for E2E. One language, the common stack for this genre,
and Socket.IO handles rooms and reconnects. Alternatives such as .NET SignalR or Python
websockets were not chosen because the owner picked the recommended stack.

## 5. Product scope by release

All three releases are described in the initiative(s). The backlog phases them.

**Core loop (R1)**
- Create a private room and share an invite link; join with a nickname and avatar color.
- Lobby showing players; the host starts the game.
- Turn rotation: each player draws once per round. R1 uses fixed defaults (3 rounds,
  80-second turns); making them configurable is an R2 host setting.
- The drawer picks one of 3 random words; others see blanks (`_ _ _ _`).
- Guessers type in chat; correct guesses are hidden from others and award points scaled by
  speed. The drawer earns points based on how many players guessed.
- Turn ends on timer expiry or when everyone has guessed; the word is revealed; scores update.
- Final scoreboard at game end.
- Rich drawing tools: color palette, brush sizes, eraser, fill bucket, undo, clear.
- Strokes stream live to all players. Late joiners and reconnecting players receive the
  current canvas state.

**Room and connection rules (R1, Claude's call)**
- 2–8 players per room. The host can start once at least 2 players are present.
- Each guest gets a random session token stored in the browser. A player who reconnects
  within 60 seconds keeps their seat and score; after that the seat is released.
- Late joiners can chat and guess straight away (scored normally) and join the drawing
  order from the next round.
- If the drawer leaves, the turn ends at once: the word is revealed and nobody scores.
- If the host leaves, host passes to the longest-present player.
- If fewer than 2 players remain, the game ends and shows the scoreboard.
- Rooms live in server memory. A server restart ends all games, which is accepted (see §7).

**Non-functional targets (R1, Claude's call)**
- Stroke latency from drawer to guessers: under 150 ms p95 with 8 players on the
  owner's PC and local network.
- Turn transitions and score updates show up on every client within 500 ms.
- Load target: 20 concurrent rooms × 8 players on the owner's PC.
- These become non-functional test cases; the latency check runs as an automated
  multi-context Playwright test.

**R2: polish + matchmaking**
- Letter hints revealed over time; "close guess" notice to the guesser only.
- Sound effects; end-of-game podium.
- Host settings: rounds, draw time, word count, custom word list (optionally custom-only).
- Public matchmaking: a "Play" button joins an open public room on this server or creates
  one. With local hosting, "public" means anyone who can reach the owner's PC.
- Basic moderation for public rooms: a profanity filter on nicknames and chat, chat rate
  limiting, and vote-kick. Each is a story with its own test cases.

**R3: accounts + leaderboards**
- Sign-in, saved profile and avatar, persistent stats (games played, wins, total score).
- Global leaderboard.
- Guests can still play without an account.
- Auth provider, database, and hosting for R3 are decided in R3's technical design (ADR).

## 6. The SDLC system

### 6.1 Repository layout

```
sketch-game/
├── docs/
│   ├── superpowers/specs/            # this design doc (stage 0)
│   └── sdlc/
│       ├── README.md                 # how the chain works, ID scheme, statuses
│       ├── templates/                # one template per item type
│       ├── initiatives/INIT-001.md
│       ├── epics/EP-001.md
│       ├── stories/US-001.md
│       ├── design/                   # architecture.md + ADR-001.md, ADR-002.md ...
│       ├── test-plan.md              # one living test plan (scope, strategy, environments)
│       ├── test-cases/TC-001.md
│       ├── sprints/SPRINT-01.md      # sprint goal, committed stories, review, retro
│       ├── releases/R1.md            # release notes
│       ├── backlog.md                # GENERATED
│       └── traceability.md           # GENERATED
├── client/                           # React + Vite
├── server/                           # Node + Socket.IO
├── shared/                           # shared TS types / socket event contracts
├── tests/e2e/                        # Playwright specs
└── scripts/sdlc/                     # generators (backlog, traceability), ID validator
```

### 6.2 Item types, IDs, and frontmatter

| Type | ID | Parent | Equivalent |
|---|---|---|---|
| Initiative | `INIT-###` | none | Jira initiative |
| Epic | `EP-###` | INIT | Jira epic |
| User story | `US-###` | EP | Jira story |
| Design decision | `ADR-###` | none (lists the stories it serves) | Confluence design page |
| Test case | `TC-###` | US (one or more) | Zephyr test case |
| Sprint | `SPRINT-##` | none | Jira sprint |

IDs are global and sequential, never reused, and stay the same across releases.
Every item file starts with YAML frontmatter. Example story:

```yaml
---
id: US-007
type: story
title: Guesser sees blanks for the current word
parent: EP-002
release: R1
sprint: SPRINT-02
status: Done          # Draft | Ready | In Progress | In Review | Done
points: 3
links:
  tests: [TC-015, TC-016]
  design: [ADR-002]
---
```

Story bodies use "As a / I want / so that" followed by acceptance criteria in Given/When/Then.
Test case bodies follow Zephyr's structure: objective, preconditions, numbered steps with
expected results, priority, and type (functional, negative, real-time/multi-client,
non-functional).

### 6.3 Linking automated tests

Each Playwright test title starts with its test case ID, e.g.
`test('TC-015 guesser sees blanks for the word', ...)`. One test case maps to exactly one
automated test or is marked `automation: manual` with a reason. Multi-player cases use
multiple browser contexts within one test.

### 6.4 Generators

TypeScript scripts in `scripts/sdlc/`, run via npm scripts:

- `sdlc:validate`: every ID is unique, every parent and link resolves, every story has
  at least one test case, and every automated TC has a matching Playwright test.
- `sdlc:backlog`: builds `backlog.md`, a board grouped by release, then sprint, then status,
  with point totals.
- `sdlc:trace`: reads the item files and Playwright's JSON report, and builds
  `traceability.md` (INIT → EP → US → TC → test → last result: pass/fail/not run).

CI (GitHub Actions) runs `sdlc:validate`, the unit tests, the Playwright E2E tests, and
`sdlc:trace` on every push. On `main`, CI publishes the generated traceability matrix,
the backlog, and the Playwright HTML report to **GitHub Pages**, so the "last result"
column always reflects real CI runs and the public can open it without logging in. The
generated files are not committed to the repo (they are gitignored); locally they can be
generated for preview.

### 6.5 Stage flow and gates

For each release, in order. Each stage ends with the owner's review before the next begins
(this is the anti-back-filling rule).

**Review evidence: one pull request per stage.** Each stage's artifacts are created on a
branch (`sdlc/R1-02-stories`, `sdlc/R1-05-test-cases`, and so on) and merged into `main`
through a GitHub pull request. The PR description holds the review summary: what was
reviewed, changes made during review, and the owner's sign-off line. Code is built on
feature branches per story (`feat/US-007-...`), also merged by PR, with the story and
test case IDs in the PR title. A solo owner can't formally approve their own PR, so the
merge plus the sign-off line in the description serves as the approval record. Branch
protection on `main` requires PRs and green CI. The public PR timeline shows that
documents were merged before the code that implements them. The validator also fails
if a story is `In Progress` while its test cases don't yet exist on `main`.

1. **Initiative.** Written once for the whole product (R1–R3), with problem, goals, scope,
   success metrics, and risks. Updated only by explicit change.
2. **Epics and stories** for the release, with acceptance criteria, points, and status `Ready`.
3. **Sprint planning.** Stories assigned to sprints; `backlog.md` regenerated.
4. **Technical design.** `architecture.md` (written in R1, updated later) plus ADRs for
   significant decisions (e.g. socket event protocol, canvas sync model, scoring formula,
   hosting, and in R3 auth and the database).
5. **Test plan update and test cases**, written from the acceptance criteria *before* the
   code.
6. **Build**, story by story, test-first where practical. The story status moves through
   the workflow.
7. **Automated tests**, implemented to match the TC files.
8. **Sprint review/retro and release notes**; traceability regenerated; deploy.

The working mode is "guided first": Claude drafts each artifact in conversation, the owner
reviews it, and Claude records what worked in each stage (prompt patterns, templates,
pitfalls) in `docs/sdlc/README.md` under "Automation notes". After R1, or whenever the
owner chooses, those notes become reusable Claude skills or slash commands, one per stage.

## 7. Showcase and delivery

- Public GitHub repo with all docs.
- GitHub Actions CI as described in 6.4.
- Local hosting (ADR-002, replacing ADR-001's Render plan): a single Node service on the
  owner's PC serves the built client and the Socket.IO endpoint on port 3000, listening on
  all interfaces. The owner plays at `http://localhost:3000`; others on the same Wi-Fi join
  at the LAN address the server prints on start.
- No live public URL. The showcase is the repo, the Pages dashboard, and live demos.
- The README links to the GitHub Pages matrix/report and the SDLC docs, and explains how
  to run the game and invite players on the same network.

## 8. Decided by Claude (owner may override)

- Guest nicknames in R1 and R2; no persistence until R3.
- Folder layout, ID scheme, frontmatter fields, and status workflow above.
- One living test plan instead of one per release; per-release scope sits in sections.
- Sprint files exist even though the work is solo, so the sprint trail is part of the
  showcase. Sprint length is decided at the first sprint planning.
- Single-service app (client served by the Node server).
- Room/connection rules and non-functional targets in §5.
- R1 uses fixed rounds and timer; configurability is in R2.
- **Planning scope:** the implementation plan covers project setup (repo, SDLC scaffolding,
  generators, CI, Pages, deploy) plus R1 in detail. R2 and R3 are planned at the start of
  each release, through their own stage flow; that's the SDLC working as intended.
- **Skill extraction timing:** proposed at the R1 retrospective, so R2 can run on the
  extracted skills. No target date; the owner decides at the retro.

## 9. Left to the builder

- Exact canvas sync protocol (stroke batching, throttling, state snapshot for late joiners).
- Exact scoring formula and timer values (captured in an ADR and in story acceptance criteria).
- Word list source and size for the default English list.
- Lint/format tooling, monorepo tooling (npm workspaces or similar), unit test framework.
- Visual design of the game UI (to be shown to the owner as mockups during R1 design).
