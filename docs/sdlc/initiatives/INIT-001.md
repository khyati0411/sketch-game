---
id: INIT-001
type: initiative
title: Screwdle, a draw-and-guess party game for friends and family
status: Draft            # Draft | Approved
---

**Owner:** Khyati · **Created:** 2026-10-30 · **Source:** [design doc](../../superpowers/specs/2026-10-28-sketch-game-design.md), [ADR-002](../design/ADR-002.md)

## Problem

Groups of friends and family who get together at home want a quick party game everyone can join from their own phone or laptop. Online draw-and-guess games like skribbl.io need a public server, show ads, and mix in strangers. There is no simple option that runs on your own PC, stays within your own Wi-Fi, and that you control.

A second goal sits behind the product. Screwdle is built with a full SDLC, from this initiative to automated tests, where Claude drafts each stage and the owner reviews it. The product should show that this works.

## Vision

One person starts Screwdle on their PC and shares a link. Everyone on the same Wi-Fi opens it, picks a nickname, and is playing within a minute. Players take turns drawing a word while the others race to guess it in chat, and the scoreboard crowns a winner after a few rounds. The drawing feels instant, and nobody needs an account or an install.

## Personas

| Persona | Who | What they need |
|---|---|---|
| **Host** | The person running Screwdle on their PC for a game night | Start quickly, share one link, control when the game starts |
| **Drawer** | A player whose turn it is to draw | Pick an easy-enough word, good drawing tools, see others guessing |
| **Guesser** | Everyone else during a turn | See the drawing live, guess in chat, know when they're right and how they score |
| **Owner/maintainer** | Khyati, building and showcasing the project | A trustworthy SDLC trail, green tests, and a dashboard that proves it |

Players range from kids to grandparents, so the interface has to be obvious without explanation and work on phones.

## Goals and success metrics

| # | Goal | Metric | Target |
|---|---|---|---|
| G1 | A fun game night | Play-test with 4+ people on one Wi-Fi | Completes 3 rounds without help; most players say they'd play again |
| G2 | Drawing feels real-time | Stroke latency drawer → guessers on the local network | < 150 ms p95 with 8 players |
| G3 | Stable multiplayer | Full game of 8 players, and load test | No desync; 20 rooms × 8 players on the owner's PC |
| G4 | Trustworthy process | Stories with ≥ 1 test case; automated TCs passing in CI; stages merged via signed-off PR | 100% / 100% / every stage |
| G5 | Claude automates the SDLC | Share of each stage's artifact drafted by Claude vs. edited by the owner, logged in the automation notes | Logged for every stage; most content Claude-drafted |

## Scope

**In scope, by release**

| Release | Theme | Highlights |
|---|---|---|
| R1 | Core game | Private room with invite link, lobby, turns, choose 1 of 3 words, live drawing, chat guessing, time-based scoring, rounds, final scoreboard, full drawing tools, reconnect within 60 s |
| R2 | Polish + open rooms | Letter hints, close-guess notice, sounds, podium, host settings and custom words, "Play" button to join any open room on the server, basic moderation (profanity filter, chat rate limit, vote-kick) |
| R3 | Accounts + leaderboards | Optional sign-in, saved profile and stats, leaderboard. Guests can still play. Storage stays local (ADR to follow) |

**Out of scope:** public internet hosting and third-party hosting (ADR-002), native mobile apps, voice or video chat, ads and payments, languages other than English, integration with Jira or Zephyr.

## Risks and assumptions

| # | Risk or assumption | Mitigation |
|---|---|---|
| A1 | Players are on the same network as the host's PC | Documented in the README; the server prints the join link |
| R1 | Windows Firewall or router isolation (guest Wi-Fi) blocks other devices | README steps for allowing Node on private networks; a test-plan check from a second device |
| R2 | Drawing sync lags or desyncs on slower phones | Real-time design ADR in R1 stage 4; automated latency test (G2) |
| R3 | Stopping the host PC ends every game | Accepted for a home party game (ADR-002) |
| R4 | Process overhead slows the build | Claude drafts every artifact; the owner reviews and approves |
| R5 | "Screwdle" is close to existing names | Name check before any public showcase; the repo keeps the name `sketch-game` until then |
