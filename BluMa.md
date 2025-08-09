# BluMa Project Context

## Overview
BluMa CLI is an independent agent for automation and advanced software engineering, running in the terminal with an Ink/React-based interactive UI. It integrates multiple subagents, LLM reasoning, persistent sessions, tool invocation (native + MCP), and controlled execution through interactive confirmations. The system facilitates code analysis, refactoring, and operational workflows for engineering teams.

Architecture consists of:
- **UI Layer**: Entry (`src/main.ts`) → `App.tsx` (Ink React CLI components, hooks, utilities)
- **Agent Layer**: Core orchestrator, subagents (e.g., InitSubAgent), tool execution (`src/app/agent/tools`), session & context management, configs.
- **Build & Packaging**: `esbuild` bundling, with config assets copied to distribution.

---

## Detected Technology Stack
- **Runtime**: Node.js (ES Modules)
- **Language**: TypeScript
- **UI Framework**: React (via Ink)
- **Build Tool**: esbuild + node-externals plugin
- **Testing**: Jest
- **APIs/SDKs**: OpenAI API, Model Context Protocol SDK (`@modelcontextprotocol/sdk`)
- **CLI Packaging**: npm bin (`bluma` → `dist/main.js`)
- **Dev Tools**: Babel (presets for env, react, typescript), ts-node-dev, nodemon
- **Other libs**: diff, uuid, update-notifier

---

## Directory Map (summary)
```
.
├── README.md               # Main project documentation
├── package.json            # npm manifest (dependencies, scripts, CLI bin)
├── scripts/build.js        # esbuild bundler, copies configs → dist/config
├── src/
│   ├── main.ts              # CLI entry point
│   ├── app/
│   │   ├── agent/           # Core agent logic
│   │   │   ├── bluma/core/  # BluMa-specific orchestration
│   │   │   ├── config/      # Configuration files (bluma-mcp.json, native_tools.json)
│   │   │   ├── core/        # Context mgmt, LLM integration, prompt building
│   │   │   ├── feedback/    # Feedback system
│   │   │   ├── session_manger/
│   │   │   ├── subagents/   # Modular subagents (init, etc.)
│   │   │   ├── tools/       # Tool definitions (mcp, natives)
│   │   │   └── utils/       # Update checks, misc helpers
│   │   └── ui/              # Ink React CLI components, hooks, utils
│   └── tests/               # Jest test suites (unit, integration, UI)
└── tsconfig.json           # TypeScript config
```

---

## Key Config Files
- **src/app/agent/config/bluma-mcp.json** — MCP protocol configuration
- **src/app/agent/config/native_tools.json** — Native tooling definitions

These are copied to `dist/config/` during build for runtime use.

---

## Useful Scripts (from package.json)
- `npm run build` — Bundle CLI app to `dist/main.js`, copy configs
- `npm start` — Run compiled CLI (`dist/main.js`)
- `npm test` — Execute Jest test suite
- `npm run test:watch` — Watch mode for Jest

---

## Operational Notes for BluMa
- **Entry point**: `src/main.ts` → `dist/main.js` is invoked via `bluma` command
- **Build flow**: uses esbuild with externals, outputs ESM bundle, prepends node shebang
- **Configs**: Must be present in `dist/config/` for CLI to function — build script ensures this
- **Extensibility**: Add new tools under `src/app/agent/tools` (natives or protocol clients) and register in configs
- **MCP integration**: Defined in bluma-mcp.json; adjust for compatible MCP servers

---

*Generated for BluMa agents — all details based on current repository inspection.*