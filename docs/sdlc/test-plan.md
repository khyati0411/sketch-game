# Test Plan: Sketch Game

## Scope
_Filled in during R1 stage 5._

## Strategy
- Unit tests (Vitest) for game logic and SDLC tooling.
- End-to-end tests (Playwright), one per automated test case, titled by TC ID; multi-player cases use several browser contexts.
- Non-functional checks for latency and load against the targets in the design doc.

## Test types
functional · negative · realtime · non-functional

## Environments
- Local: `npm run build && npm start`
- CI: GitHub Actions (Linux, Chromium)
- Local network: owner's PC serving other devices on the same Wi-Fi (manual multi-device checks, ADR-002)

## Entry / exit criteria

## Per-release scope
### R1
### R2
### R3
