# BluMa.md

Project: @nomad-e/bluma-cli (version 0.0.31)

Overview
BluMa CLI is an independent automation/engineering agent with a rich terminal UI built on React/Ink. It orchestrates an LLM-driven agent core, tool invocation (native + MCP), interactive confirmations, session/history, and extensibility via plugins. The CLI entry renders an Ink app that wires the agent and UI through an EventEmitter.

Detected Tech Stack (from manifests/configs)
- Language/Runtime: TypeScript (ESM) on Node.js >= 18 (package.json, tsconfig.json)
- UI: React 18 via Ink 5 with ink-text-input, ink-spinner, ink-big-text (package.json)
- LLM/MCP: openai SDK; @modelcontextprotocol/sdk (package.json); agent wiring in src/app/agent/agent.ts
- Build: esbuild + esbuild-plugin-node-externals (scripts/build.js)
- Transpile: Babel (preset-env, preset-typescript) for Jest transforms (babel.config.cjs, jest.config.cjs)
- Tests: Jest 30 + babel-jest, testMatch under tests/**/*.spec.(ts|js) (jest.config.cjs)
- Env/config: dotenv; config files under src/app/agent/config copied to dist/config at build (scripts/build.js)

High-level Directory Map
- /src/main.ts — Program entry; renders Ink App with sessionId and event bus.
- /src/app/ui/** — Ink/React CLI components and layout, input prompt, confirmation flow, update notice, overlays.
- /src/app/agent/** — Agent core, LLM client, prompt builder, session manager, feedback system, tool invoker, MCP client, subagents.
  - bluma/core/bluma.ts — BluMaAgent core loop/state (referenced by agent.ts).
  - core/** — llm.ts adapter, prompt builder, context manager.
  - tools/** — mcp client and native tools (ls, readLines, count_lines, edit, shell_command, message, end_task).
  - subagents/** — registry and implementations, including init subagent.
  - config/** — runtime config JSON copied to dist/config by build script.
- /scripts/build.js — esbuild bundling and post-build config copy.
- /tests/** — Jest unit/integration specs for agents, subagents, UI, and tools.
- package.json, tsconfig.json, babel.config.cjs, jest.config.cjs — project/test/build configs.

Entry Points and Runtime Flow
- Binary/CLI: package.json sets "bin": { "bluma": "dist/main.js" } and main: "dist/main.js".
- Build output: dist/main.js (ESM) with a hashbang injected by build script.
- Runtime entry: src/main.ts creates EventEmitter + sessionId and renders App from src/app/ui/App.tsx.
- UI boot: App.tsx constructs Agent(sessionId, eventBus), awaits initialize(), and wires backend_message events to UI components and confirmation prompts.
- Agent orchestration: src/app/agent/agent.ts wires ToolInvoker (native), MCPClient, AdvancedFeedbackSystem, BluMaAgent, and SubAgentsBluMa. It routes "/init" to the init subagent and otherwise delegates to BluMaAgent.

Key Configs and Scripts
- scripts/build.js
  - Bundles src/main.ts → dist/main.js with esbuild (esm, node platform, externals plugin).
  - Injects shebang (#!/usr/bin/env node).
  - Copies config files from src/app/agent/config → dist/config.
- tsconfig.json
  - target/module: esnext; jsx: react-jsx; outDir: dist; moduleResolution: bundler; strict/skipLibCheck enabled.
- babel.config.cjs
  - Presets: @babel/preset-env (node 18), @babel/preset-typescript.
- jest.config.cjs
  - transform via babel-jest; testMatch: **/tests/**/*.spec.(ts|js); testEnvironment: node.

Useful CLI Commands (package.json scripts)
- npm run build — Build with esbuild, inject hashbang, copy config to dist/config.
- npm start — Run compiled CLI (node dist/main.js).
- npm test — Run Jest test suite.
- npm run test:watch — Jest in watch mode.

Operational Notes for BluMa
- Environment variables:
  - Uses dotenv; a global env path is loaded in the agent: ~/.bluma-cli/.env (src/app/agent/agent.ts). Also see .env / .env.example at repo root.
  - For LLM (Azure/OpenAI/OpenRouter), ensure endpoint/model keys are configured per your deployment strategy.
- MCP/tools:
  - Native tools available: count_lines, edit, end_task, ls, message, readLines, shell_command (under src/app/agent/tools/natives/). MCP client is instantiated and connected on initialize().
- Confirmation workflow:
  - The UI requests confirmation for tool_calls unless whitelisted via “accept always” during the session (App.tsx handling for confirmation_request).
- Build artifacts:
  - dist/main.js is the CLI binary; config JSON files are required at runtime and copied to dist/config by the build script.

Subagents and Behavior
- Init Subagent (src/app/agent/subagents/init/init_subagent.ts)
  - Capability: "/init". Seeds a fixed user instruction to scan repo and produce BluMa.md; executes via BaseLLMSubAgent and uses the same tool/confirmation channel.
- SubAgents orchestrator (src/app/agent/subagents/subagents_bluma.ts, registry.ts) manages registration and routing for slash commands.

Testing Footprint (from /tests)
- Coverage across agents, init subagent seed, session manager, prompt builder, overlays, UI working state, edit tool, routing, and integration flows.

Quick Start
1) npm install
2) npm run build
3) npm start  (or invoke dist/main.js directly; after global install, use `bluma`)

Evidence References
- package.json, tsconfig.json, babel.config.cjs, jest.config.cjs
- scripts/build.js
- src/main.ts, src/app/ui/App.tsx
- src/app/agent/agent.ts
- src/app/agent/tools/natives/*, src/app/agent/tools/mcp/mcp_client.ts
- src/app/agent/subagents/init/init_subagent.ts
- tests/**/*.spec.*
