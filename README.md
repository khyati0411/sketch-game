# Sketch Game

A multiplayer draw-and-guess game in the style of skribbl.io. It is built with a full, Claude-automated SDLC kept as Markdown in this repo: initiative → epics and stories → design → test cases → automated Playwright tests → a generated traceability matrix.

- **SDLC dashboard (backlog, traceability, test report):** https://khyati0411.github.io/sketch-game/
- **How the process works:** [docs/sdlc/README.md](docs/sdlc/README.md)
- **Design:** [docs/superpowers/specs/2026-10-28-sketch-game-design.md](docs/superpowers/specs/2026-10-28-sketch-game-design.md)

## Play it

The game runs on your own PC, with no third-party hosting ([ADR-002](docs/sdlc/design/ADR-002.md)).

```bash
npm install
npm run build
npm start
```

The server prints where to join:

```
Sketch Game is running.
  On this PC:     http://localhost:3000
  Same network:   http://192.168.1.20:3000
```

Open the first link yourself and send the "Same network" link to friends on the same Wi-Fi. The first time, Windows may ask whether Node.js can accept connections: allow it on **private networks** only. Stopping the server ends any game in progress.

## Stack

TypeScript, React + Vite (canvas), Node + Express + Socket.IO, Vitest, Playwright, GitHub Actions.

## Development

```bash
npm install
npx playwright install chromium
npm run dev                # server on :3000 (watch mode)
npm run dev -w client      # client on :5173, proxied to the server
```

| Command | Purpose |
|---|---|
| `npm test` | Unit tests (all workspaces) |
| `npx playwright test` | End-to-end tests (builds and starts the app) |
| `npm run build && npm start` | Production build on :3000 |
| `npm run sdlc:validate` | Check SDLC item files and links |
| `npm run sdlc:backlog` / `sdlc:trace` / `sdlc:site` | Generate the backlog, traceability matrix and dashboard |
