# SDLC system

Every piece of planning and testing for Sketch Game lives here as Markdown. These files take the place of Jira and Zephyr. Each item is one file with YAML frontmatter, and the tooling in `scripts/sdlc` checks the files and builds the views from them.

## Item types and IDs

| Type | ID | Folder | Parent | Equivalent |
|---|---|---|---|---|
| Initiative | `INIT-###` | `initiatives/` | none | Jira initiative |
| Epic | `EP-###` | `epics/` | INIT | Jira epic |
| User story | `US-###` | `stories/` | EP | Jira story |
| Design decision | `ADR-###` | `design/` | none (lists `stories`) | Design page |
| Test case | `TC-###` | `test-cases/` | one or more US | Zephyr test case |
| Sprint | `SPRINT-##` | `sprints/` | none | Jira sprint |

IDs are global and sequential, and they are never reused. Copy the right file from `templates/` to start a new item. `design/architecture.md`, `test-plan.md` and `releases/*.md` are plain documents, not items.

**Story statuses:** `Draft → Ready → In Progress → In Review → Done`. **Releases:** `R1`, `R2`, `R3`.

## Linking automated tests

A Playwright test title starts with its test case ID, for example `test('TC-015 guesser sees blanks for the word', ...)`. A test case either has exactly one automated test, or it is `automation: manual` with a `manualReason`.

## Commands

| Command | What it does |
|---|---|
| `npm run sdlc:validate` | Checks IDs, parents and links, makes sure in-progress stories have test cases, and makes sure every automated test case of a done story has a test |
| `npm run sdlc:backlog` | Generates `backlog.md` (the board) |
| `npm run sdlc:trace` | Generates `traceability.md` from the items and the last Playwright run |

The generated files are not committed. CI publishes them to GitHub Pages from `main`.

## Stage flow (per release)

Each stage is done on its own `sdlc/<release>-<nn>-<stage>` branch and merged through a pull request. The PR description holds the review summary and the owner's sign-off line. The next stage doesn't start until that PR is merged.

1. Initiative (once for the whole product)
2. Epics and stories → `Ready`
3. Sprint planning
4. Technical design (`design/architecture.md` + ADRs)
5. Test plan update and test cases, written before any code
6. Build, one feature branch per story (`feat/US-###-…`)
7. Automated tests that match the TC files
8. Sprint review/retro, release notes, deploy

## Automation notes

These are notes on how Claude handled each stage: prompt patterns that worked, template changes, and pitfalls. At the R1 retrospective, they become reusable Claude skills.

### Stage 1: Initiative (INIT-001, 2026-10-30)

- **Inputs Claude used:** the design doc (intent, goals, release scope), ADR-002 (hosting), and the `initiative` template.
- **Inputs only the owner could give (asked as options):** target audience → personas; which success-metric families count; the product name. Everything else was derived.
- **What Claude drafted:** all sections. Goals map 1:1 to measurable metrics (G1–G5), and each risk has a mitigation that points to a later stage or doc.
- **Owner edits during review:** none. Approved as-is on 2026-11-02.
- **Skill candidate `/initiative`:** read the design doc and ADRs → ask about audience, metrics and name → fill the template → run `sdlc:validate` → open the `sdlc/<release>-01-initiative` PR.
- **Pitfall:** the initiative's status stays `Draft` until the owner signs off. It should flip to `Approved` in the same PR, just before merge. For INIT-001 that step was missed: the PR merged with `Draft`, and the flip happened in the stage 3 PR. The `/initiative` skill should ask for sign-off before the merge.

### Stage 2: Epics and stories (R1, 2026-10-30)

- **Inputs Claude used:** INIT-001 (R1 scope, personas, goals G2 and G3), design doc §5 (room and connection rules, fixed 3 rounds × 80 s, non-functional targets), and the `epic` and `story` templates.
- **Owner input:** one instruction, "based on the initiative write the epics and user stories". No questions were needed, because the initiative and design already fixed scope and personas.
- **What Claude drafted:** 5 epics and 22 stories (63 points). Every R1 scope item in INIT-001 maps to at least one story. The design doc's room rules became EP-005, and goals G2 and G3 became the non-functional stories US-021 and US-022. Every story uses an INIT-001 persona and has Given/When/Then acceptance criteria.
- **Method:** stories were written as data (id, epic, persona, want, so that, criteria) and rendered through the templates, which keeps the format identical across all 22.
- **Left for later stages:** sprint assignment (stage 3), exact palette, word list, sync model and scoring formula (stage 4 ADRs), test cases (stage 5).
- **Owner edits during review:** none. Merged as-is in PR #7.
- **Skill candidate `/stories`:** read the initiative and design → one epic per capability area → stories per scope item with personas and Given/When/Then → `sdlc:validate` → open the `sdlc/<release>-02-stories` PR.

### Stage 3: Sprint planning (R1, 2026-11-02)

- **Inputs Claude used:** the 22 R1 stories with their points and epics, the `sprint` template, and the dependencies between stories (a room before joining, strokes before guessing, a turn before rounds).
- **Owner input (asked as options):** sprint length (1 week), capacity (about 16 points, so 4 sprints), and grouping (a playable slice first, not one epic at a time).
- **What Claude drafted:** SPRINT-01 to SPRINT-04, 2–29 Nov 2026, with 15, 15, 16 and 17 points. Sprint 1 gives a room with live shared drawing, sprint 2 the first playable and scored turn, sprint 3 a full game with every drawing tool, and sprint 4 the resilience and performance stories (goals G2 and G3). Each story got its `sprint:` line.
- **Pitfall caught by the validator:** three sprint goals contained a colon, which is invalid unquoted YAML. `sdlc:validate` rejected the files before commit. The template now quotes `goal`.
- **Owner edits during review:** _(fill in at sign-off)_
- **Skill candidate `/sprints`:** ask length, capacity and grouping → order stories by dependency → fill sprints up to capacity → set each story's `sprint:` → `sdlc:validate` and `sdlc:backlog` → open the `sdlc/<release>-03-sprints` PR.

### Stage 4: Technical design (R1, 2026-11-02)

- **Inputs Claude used:** design doc §5 (rules and targets) and §9 (what was left to the builder), ADR-002, the 22 R1 stories and their acceptance criteria, and the existing `shared`/`server`/`client` skeleton.
- **Owner input (asked as options):** sync model (server action log), scoring (linear in time left), word list (written by Claude, about 300 words), and when to see UI mockups (in this stage). After seeing two directions with three screens each, the owner picked **B · Game night**.
- **What Claude drafted:** `design/architecture.md` (overview, workspaces, event table, test hooks), ADR-003 (drawing sync), ADR-004 (rooms and game flow), ADR-005 (scoring, with worked numbers for US-015), ADR-006 (word list and guess matching), ADR-007 (UI tokens, screens, test ids), `shared/words/en.json` (302 words, checked against ADR-006's rules), and a [mockup canvas](https://claude.ai/artifact/1D4wJxDvyazowQv4FxeHrB). Every R1 story now links the ADRs it depends on, and ADR-002 lists its hosting-dependent stories.
- **Checks:** a script checked the word list for duplicates and the length and character rules (it caught one duplicate and one three-word entry); `sdlc:validate` checked every ADR ↔ story link.
- **Owner edits during review:** _(fill in at sign-off)_
- **Skill candidate `/design`:** read the design doc's open points and the stories → ask only the product choices (sync, scoring, content, look) → write the architecture and one ADR per decision, with worked examples the test cases can reuse → mockups for the look → link ADRs and stories → `sdlc:validate` → open the `sdlc/<release>-04-design` PR.

### Stage 5: Test plan and test cases (R1, 2026-11-02)

- **Inputs Claude used:** the acceptance criteria of all 22 R1 stories, ADR-003 to ADR-007 (exact values, test hooks), and the `test-case` template.
- **Owner input (asked as options):** coverage (key paths per story, about 35 TCs), timers in end-to-end tests (a test mode with short timers), what stays manual (real devices on the Wi-Fi, the family play-test), and exit criteria (all automated tests pass and every manual TC has a recorded run).
- **What Claude drafted:** TC-001 to TC-036 (34 automated, 2 manual), each with an objective naming the criteria it covers, preconditions and a step/expected table. Each automated TC names its Playwright file. Every story's `links.tests` lists its TCs. The test plan now has scope, strategy, unit tests for exact ADR values, test-only switches (`SCREWDLE_TIMERS`, `SCREWDLE_WORDS`) and entry/exit criteria.
- **Conflicts found and fixed while writing tests:** US-002 allows 20-character nicknames but ADR-004 said 16; the ADR now says 20. ADR-004 was unclear whether a drawer's dropped connection ends the turn now or after 60 s; it now ends the turn at once and keeps the seat. Writing tests from the acceptance criteria surfaced both before any code existed.
- **Method:** test cases were written as data and rendered through the template (`.superpowers/gen-r1-test-cases.mjs`, not committed), the same approach as the stories.
- **Owner edits during review:** _(fill in at sign-off)_
- **Skill candidate `/test-cases`:** ask about coverage, timers, manual scope and exit criteria → one TC per story key path (or per criterion) → link stories → update the test plan → `sdlc:validate` → open the `sdlc/<release>-05-test-cases` PR.

### Stage 6: Build, Sprint 1 (US-001 to US-005, 2026-11-02)

- **Process:** the `writing-plans` skill produced `docs/superpowers/plans/2026-11-02-sprint-01.md` (6 tasks with interfaces and review focus). The owner approved four planning calls as options:
  - TC-011 re-parented to US-005, US-008, US-009 and US-013, so it's due in Sprint 3;
  - "Start game" makes the host draw at once;
  - a disconnect counts as leaving until US-018;
  - one sprint branch and one PR.
  `executing-plans` then built it test-first. A ledger recorded every deviation as a ruling.
- **What was built:**
  - `shared` protocol and constants;
  - a pure `Rooms` model (codes, nickname rules, host hand-over, drawer-only action log with clamping and the 50,000-point cap, 5-minute clean-up);
  - Socket.IO handlers;
  - the Game night client (home and join, live lobby, invite link with Copy, start);
  - a live canvas with 30 ms batching, touch support and repaint on resize.
- **Tests:** 28 server and client unit tests, plus 11 Playwright tests (TC-001, TC-003 to TC-010, TC-012, and the smoke test). TC-002 (a real device on the Wi-Fi) stays manual for the R1 exit.
- **Caught by tests:**
  - A type check exposed a crash: points with no open stroke matched `undefined === undefined`. A unit test reproduced it before the fix.
  - TC-009 had a timing bug in the test itself: it read the guesser's "partial" ink after the pen was lifted.
- **Pitfalls for the skill:**
  - `crypto.randomUUID` and `navigator.clipboard` need a secure context, but LAN links are plain http, so ids use a fallback and Copy falls back to selecting the text.
  - Running Playwright with `--reporter=line` replaces the JSON reporter, so traceability shows "not run". Run plain `npx playwright test` before `sdlc:trace`.
- **Owner edits during review:** _(fill in at sign-off)_
- **Skill candidate `/build-sprint`:** plan the sprint's stories (`writing-plans`) → ask only the cross-sprint calls → `executing-plans` with a ledger → mark stories Done once their TCs have green Playwright tests → `sdlc:validate` and `sdlc:trace` → one sprint PR.
