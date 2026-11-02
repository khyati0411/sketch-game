# Test Plan: Screwdle

## Scope

R1 (core game) is covered by 36 test cases, TC-001 to TC-036. Each one covers the key path through one story, and related acceptance criteria share a TC (owner's choice at stage 5). Every R1 story has at least one TC, and each TC names the criteria it covers in its Objective.

| Area | Stories | Test cases | Playwright file |
|---|---|---|---|
| Rooms and lobby | US-001 to US-004 | TC-001 to TC-008 | `tests/e2e/rooms.spec.ts` |
| Drawing | US-005 to US-009 | TC-009 to TC-016 | `tests/e2e/drawing.spec.ts` |
| Turns, words, guessing | US-010 to US-014 | TC-017 to TC-024 | `tests/e2e/turns.spec.ts` |
| Scoring and results | US-015 to US-017 | TC-025 to TC-028 | `tests/e2e/scoring.spec.ts` |
| Resilience | US-018 to US-020 | TC-029 to TC-033 | `tests/e2e/resilience.spec.ts` |
| Performance | US-021, US-022 | TC-034, TC-035 | `tests/e2e/performance.spec.ts` |
| Manual | US-001, play-test | TC-002, TC-036 | none; results recorded in the TC file |

## Strategy

- **End-to-end (Playwright):** one test per automated TC, titled with its ID (`test('TC-021 …')`). Multi-player cases use one browser context per player against one server. TC-012 uses a touch-enabled, phone-size context. TC-035 drives 160 `socket.io-client` connections from the test process instead of browsers.
- **Unit (Vitest):** guards the exact values the ADRs fix, which end-to-end tests check only by their effects:
  - ADR-005 scoring: 500 for an instant guess, 450 with 70 s left, 200 with 20 s left, 100 at the buzzer; 50 per guesser for the drawer, capped at 300; tied winners; roll-back when the drawer leaves.
  - ADR-004 state machine with a fake clock: 15 / 80 / 5 s phases, the 60 s reconnect window, host hand-over, turn order with late joiners, three rounds.
  - ADR-006: every word in `shared/words/en.json` follows the rules; `normalizeGuess` handles case, spaces and accents; the mask keeps spaces.
  - ADR-003: action-log replay (undo of stroke, fill and clear), the 50,000-point cap, and drawer-only checks.
- **Manual:** TC-002 (a real second device on the Wi-Fi) and TC-036 (family play-test, goal G1). Each run adds a row to the TC's "Manual runs" table.

## Test-only switches

These are read by the server only when set, and Playwright's `webServer` sets them. Production runs (`npm start`) never set them.

| Variable | Effect | Why |
|---|---|---|
| `SCREWDLE_TIMERS=test` | Word choice 1.5 s, drawing 8 s, reveal 0.5 s, reconnect window 3 s, room clean-up 5 s. Scoring keeps the same formula, scaled to the shorter turn | A full 3-round game runs in seconds; the real values are covered by unit tests |
| `SCREWDLE_WORDS=cat,house,ice cream` | Use this list, in this order, instead of `en.json` | Tests know the words (for example "ice cream" for the spaced mask) |

## Test types
functional · negative · realtime · non-functional

## Environments
- Local: `npm run build && npm start`
- CI: GitHub Actions (Linux, Chromium), with the test-only switches on
- Local network: the owner's PC serving other devices on the same Wi-Fi (manual checks, ADR-002)

## Entry / exit criteria

**Entry (a story can move to In Progress):** its test cases are `Ready` and merged to `main`. `sdlc:validate --base` enforces this on pull requests.

**Exit (R1 is releasable):**
- Every automated R1 test case passes in CI on `main`.
- Every manual R1 test case has at least one recorded run with result Pass.
- The unit tests listed above exist and pass.
- The traceability matrix shows no R1 story without a passing test case.

## Per-release scope
### R1
TC-001 to TC-036, as above.
### R2
Planned at the start of R2.
### R3
Planned at the start of R3.
