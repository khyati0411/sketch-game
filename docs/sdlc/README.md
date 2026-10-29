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
- **Owner edits during review:** _(fill in at sign-off: none / list)_
- **Skill candidate `/initiative`:** read the design doc and ADRs → ask about audience, metrics and name → fill the template → run `sdlc:validate` → open the `sdlc/<release>-01-initiative` PR.
- **Pitfall:** the initiative's status stays `Draft` until the owner signs off. It flips to `Approved` in the same PR, just before merge.

### Stage 2: Epics and stories (R1, 2026-10-30)

- **Inputs Claude used:** INIT-001 (R1 scope, personas, goals G2 and G3), design doc §5 (room and connection rules, fixed 3 rounds × 80 s, non-functional targets), and the `epic` and `story` templates.
- **Owner input:** one instruction, "based on the initiative write the epics and user stories". No questions were needed, because the initiative and design already fixed scope and personas.
- **What Claude drafted:** 5 epics and 22 stories (63 points). Every R1 scope item in INIT-001 maps to at least one story. The design doc's room rules became EP-005, and goals G2 and G3 became the non-functional stories US-021 and US-022. Every story uses an INIT-001 persona and has Given/When/Then acceptance criteria.
- **Method:** stories were written as data (id, epic, persona, want, so that, criteria) and rendered through the templates, which keeps the format identical across all 22.
- **Left for later stages:** sprint assignment (stage 3), exact palette, word list, sync model and scoring formula (stage 4 ADRs), test cases (stage 5).
- **Owner edits during review:** _(fill in at sign-off)_
- **Skill candidate `/stories`:** read the initiative and design → one epic per capability area → stories per scope item with personas and Given/When/Then → `sdlc:validate` → open the `sdlc/<release>-02-stories` PR.
