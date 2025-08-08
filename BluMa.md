# BluMa Project Overview

## Overview
BluMa CLI is an independent automation and engineering agent that runs in the terminal with a rich UI via React/Ink. It leverages LLMs (Azure OpenAI / OpenAI compat) to orchestrate automation, code manipulation, file management, and session persistence. The system supports a modular tool architecture—native or via MCP SDK—enabling extensibility for custom workflows.

## Technology Stack
**Languages & Environment**
- TypeScript (Node.js v18+)
- JavaScript (ESM)
- Python (for backend integration: `cli/backend/bluma.py`)

**Frameworks & Libraries**
- React 18 + Ink 5 (terminal UI)
- Babel (transpile TS/JS)
- ESBuild (bundling)
- Jest (testing)
- MCP SDK
- OpenAI (LLM API)
- Ink UI components (`ink-big-text`, `ink-spinner`, `ink-text-input`)

**Tooling**
- npm scripts (`build`, `start`, `test`, `test:watch`)
- Babel presets for env, react, typescript
- Nodemon, ts-node-dev for development

## Directory Structure (Summary)
```
cli/                  # CLI-specific backend & configs
  backend/bluma.py    # Python backend helper
  config/tools.json   # Tool configuration manifest

scripts/              # Build and tooling scripts
  build.js            # Build with esbuild + externals

src/app/agent/        # Core LLM orchestration and subagents
  config/             # Agent config (MCP tools, native tools)
  core/               # LLM API integration and prompt handling
  feedback/           # Feedback systems for tech suggestions
  session_manager/    # Persistent conversations & tool history
  subagents/          # Specialised autonomous subagents
  tools/              # Tool execution modules
  utils/              # Helper utilities (e.g., update checks)

src/app/protocols/    # Protocol handling modules (Python support here too)

src/app/ui/           # React/Ink UI components and hooks
  components/         # Reusable interface components
  utils/              # UI utilities (terminal title, slash cmd registry)

src/main.ts           # Main app entry (pre-compiled)
tests/                # Unit and integration tests
```

## Entry Points
- **CLI Binary:** `bluma` (package.json bin → dist/main.js)
- **Source Main:** `src/main.ts`
- **Backend Script:** `cli/backend/bluma.py`

## Key Configs
- `package.json` — project metadata, dependencies, scripts
- `babel.config.cjs` — transpilation setup
- `jest.config.cjs` — test runner config
- `tools.json` — CLI tool registry for the agent
- `bluma-mcp.json`, `native_tools.json` — agent tool configurations

## Useful npm Scripts
```bash
npm run build      # Compile TypeScript to dist/
npm start          # Run built CLI from dist/
npm test           # Run test suite with Jest
npm run test:watch # Watch mode for tests
```

## Operational Notes
- Requires Node.js >= 18 and npm >= 9
- Environment variables must be set for LLM integrations (Azure/OpenAI) and optionally GitHub/Notion
- CLI supports interactive and autonomous operations; confirmations used for sensitive tools
- Extensible via adding tool manifests and corresponding implementations in `src/app/agent/tools`

## For BluMa Agents
- Subagents can register via `src/app/agent/subagents/registry.ts`
- Protocol modules in `src/app/protocols` define interaction standards
- UI flows are orchestrated through `src/app/ui/layout.tsx` with dynamic Ink components