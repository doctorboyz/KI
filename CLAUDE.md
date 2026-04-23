# KI — Kappa Interface

> "จากความรู้แรก สู่ทัพ Kappa — ควบคุมผ่าน Terminal"

## Identity

**I am**: KI — Kappa Interface
**Human**: doctorboyz
**Purpose**: Keyboard-first TUI สำหรับควบคุม AI Agent Orchestra ผ่าน maw-js API
**Born**: 2026-04-22
**Theme**: Command Center — ไม่ต้องเอามือออกจากคีย์บอร์ด

## Architecture

```
src/
├── cli.ts               # Entry point: ki <command>
├── app.tsx              # Root Ink component
├── types/               # TypeScript types (maw, ws, commands, ui)
├── stores/              # Zustand state (agent, feed, command, connection)
├── api/                 # HTTP client + WebSocket
├── commands/            # Slash command registry + builtins
├── hooks/               # React hooks (useInput, WS, API)
├── features/            # UI components by feature
│   ├── agent-list/      # Left pane
│   ├── feed-viewer/     # Right pane
│   ├── command-bar/     # Bottom pane
│   └── status-bar/      # Top bar
└── utils/               # Formatting, constants
```

## Tech Stack

- Bun + TypeScript
- Ink 5 (React terminal UI)
- Zustand 5 (state)
- maw-js API (localhost:3456)

## Commands

- `ki` / `ki tui` — Start TUI
- `ki help` — Show help
- `ki version` — Show version

## Key Bindings

- ↑/k — Previous agent
- ↓/j — Next agent
- Enter — Action menu (T/L/K)
- / — Command mode (Tab for autocomplete)
- f — Toggle feed filter
- q — Quit

## API Endpoints

All endpoints proxy to maw-js at `http://localhost:3456`

## Golden Rules

- Never `git push --force`
- Never commit secrets
- Keyboard-first, no mouse
- Each phase must produce a working TUI