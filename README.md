# Sketch Game

A multiplayer draw-and-guess game in the style of skribbl.io. It is built with a full, Claude-automated SDLC kept as Markdown in this repo: initiative → epics and stories → design → test cases → automated Playwright tests → a generated traceability matrix.

- **Play:** _live URL coming once deployed_
- **SDLC dashboard (backlog, traceability, test report):** _GitHub Pages URL coming once enabled_
- **How the process works:** [docs/sdlc/README.md](docs/sdlc/README.md)
- **Design:** [docs/superpowers/specs/2026-10-28-sketch-game-design.md](docs/superpowers/specs/2026-10-28-sketch-game-design.md)

> The demo runs on a free host. The first visit after a quiet period can take 30–60 seconds to wake the server, and a server restart ends any game in progress.

## Stack

TypeScript, React + Vite (canvas), Node + Express + Socket.IO, Vitest, Playwright, GitHub Actions, Render.

## Local development

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
