# KI — Kappa Interface

> Multi-agent workflow with keyboard-first TUI

KI คือ Command Center สำหรับควบคุม AI Agent Orchestra — ไม่ต้องเอามือออกจากคีย์บอร์ด

## Quick Start

```bash
# Install dependencies
bun install

# Start TUI
ki

# Or explicit
ki tui

# Start API + WebSocket server
ki serve
```

## Commands

| Command | Description |
|---------|-------------|
| `ki` | Start TUI (default) |
| `ki tui` | Start TUI |
| `ki serve` | Start API + WebSocket server |
| `ki version` | Show version |
| `ki help` | Show help |

### Agent Commands

| Command | Description |
|---------|-------------|
| `ki wake <kappa>` | Wake an agent |
| `ki sleep <kappa>` | Sleep an agent |
| `ki bud <name>` | Create new Kappa bud |
| `ki done <window>` | Mark window as done |
| `ki peek <kappa>` | View agent output |
| `ki talk-to <kappa> <msg>` | Send message |
| `ki hey <kappa> <msg>` | Quick message |

### Fleet Commands

| Command | Description |
|---------|-------------|
| `ki fleet` | Show fleet status |
| `ki federation` | Show peer connectivity |
| `ki health` | Check health |

Plus 60+ more plugin commands.

## TUI Key Bindings

| Key | Action |
|-----|--------|
| `↑` / `k` | Select previous agent |
| `↓` / `j` | Select next agent |
| `Enter` | Open action menu (T/L/K) |
| `/` | Enter command mode |
| `Tab` | Autocomplete command |
| `f` | Toggle feed filter |
| `q` | Quit |

## Architecture

```
src/
├── cli.ts               # Entry point: ki <command>
├── app.tsx              # Root Ink component
├── core/                # Core logic (API, fleet, plugin)
├── commands/            # Slash command registry + 66 plugins
├── tui/                 # Terminal UI (Ink/React)
│   ├── features/        # UI components (agent-list, feed, command-bar, status)
│   ├── hooks/           # React hooks (API, WebSocket, key input)
│   ├── stores/          # Zustand state
│   └── types/           # TypeScript types
├── sdk/                 # SDK for external integration
├── transports/          # MQTT transport layer
├── views/               # HTML views (plugins dashboard)
└── lib/                 # Shared utilities
```

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **TUI**: Ink 5 (React terminal UI)
- **State**: Zustand 5
- **HTTP**: Elysia
- **Transport**: MQTT
- **Validation**: @sinclair/typebox
- **Plugin System**: WASM + native

## Development

```bash
# Dev mode (watch)
bun run dev

# Build
bun run build

# Type check
bun run typecheck

# Test
bun test test/
```

## Kappa Family

KI คือหนึ่งใน 5 สายพันธุ์ของ Kappa Family:

| Strand | Repo | Purpose |
|--------|------|---------|
| DNA | [kappa-genome](https://github.com/doctorboyz/kappa-genome) | Principles + blueprint + birth ritual |
| Soul | [Adams-kappa](https://github.com/doctorboyz/Adams-kappa) | First Cell — born from DNA |
| Skill | [kappa-skill-cli](https://github.com/doctorboyz/kappa-skill-cli) | 53 skills + 36 agents + 3 profiles |
| Interface | [KI](https://github.com/doctorboyz/KI) | This repo — keyboard-first TUI |
| Brain | kappa-brain | MCP server + sqlite-vec + KappaNet |

## License

BUSL-1.1