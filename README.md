# BluMa CLI

[![npm version](https://img.shields.io/npm/v/bluma.svg?style=flat-square)](https://www.npmjs.com/package/bluma)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](https://shields.io/)

<p align="center">
  <img src="docs\assets\bluma.png" alt="Tela inicial BluMa CLI" width="1000"/>
</p>

BluMa CLI is an independent agent for automation and advanced software engineering. The project is a conversational assistant that interacts via terminal (CLI), built with React/Ink, supporting smart agents (LLM, OpenAI Azure), tool execution, persistent history, session management, and extensibility through external plugins/tools.

---

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Requirements](#requirements)
- [Installation](#installation)
- [How to Run](#how-to-run)
- [Project Structure](#project-structure)
- [Development and Build](#development-and-build)
- [Extensibility: Tools and Plugins](#extensibility-tools-and-plugins)
- [Tests](#tests)
- [Configuration and Environment Variables](#configuration-and-environment-variables)
- [License](#license)

---

## <a name="overview"></a>Overview
BluMa CLI is a modern CLI focused on automation, LLM collaboration, documentation, refactoring, running complex tasks, and integrating with external tools. It uses React (via Ink) for rich terminal interfaces and features context/conversation management, smart feedback, and interactive confirmation systems.

---

## <a name="key-features"></a>Key Features
- **Rich CLI interface** using React/Ink 5, with interactive prompts and custom components.
- **Session management:** automatic persistence of conversation and tool history via files.
- **Central agent (LLM):** orchestrated by Azure OpenAI (or compatible), enabling natural language-driven automation.
- **Tool invocation:** native and via MCP SDK for running commands, code manipulation, file management, and more.
- **Dynamic prompts:** builds live conversational context, behavioral rules, and technical history.
- **Smart feedback component** with technical suggestions and checks.
- **ConfirmPrompt & Workflow Decision:** confirmations for sensitive operations, edit/code previews, always-accepted tool whitelists.
- **Extensible:** easily add new tools or integrate external SDK/plugins.

---

## <a name="requirements"></a>Requirements
- Node.js >= 18
- npm >= 9
- Account (with key) for Azure OpenAI (or equivalent variables for OpenAI-compatible endpoints)

---

## <a name="installation"></a>Installation

### Recommended: Global Installation

> **Important:** It is recommended to install BluMa globally so the `bluma` command works in any terminal.

```bash
npm install -g @nomad-e/bluma-cli
```

If you get permission errors, EXAMPLES:
  - **Linux:** Run as administrator using `sudo`:
    ```bash
    sudo npm install -g @nomad-e/bluma-cli
    ```
  - **Windows:** Open Command Prompt/Terminal as Administrator and repeat the command

> **macOS:** After global installation, **always run the `bluma` command without sudo**:
>
> ```bash
> bluma
> ```
> Running with sudo may cause permission problems, environment variable issues, and npm cache ownership problems.
> Only use sudo to install, never to run the CLI.

### Setting Up Environment Variables
For BluMa CLI to operate with OpenAI/Azure, GitHub, and Notion, set the following environment variables globally in your system.

**Required:**
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_DEPLOYMENT`
- `GITHUB_PERSONAL_ACCESS_TOKEN` (if you'll use GitHub)
- `NOTION_API_TOKEN` (if you'll use Notion)

#### How to set environment variables globally:

**Linux/macOS:**
Add to your `~/.bashrc`, `~/.zshrc`, or equivalent:
```sh
export AZURE_OPENAI_ENDPOINT="https://..."
export AZURE_OPENAI_API_KEY="your_key"
export AZURE_OPENAI_API_VERSION="2024-06-01"
export AZURE_OPENAI_DEPLOYMENT="bluma-gpt"
export GITHUB_PERSONAL_ACCESS_TOKEN="..."
export NOTION_API_TOKEN="..."
```
Then run:
```sh
source ~/.bashrc # or whichever file you edited
```

**Windows (CMD):**
```cmd
setx AZURE_OPENAI_ENDPOINT "https://..."
setx AZURE_OPENAI_API_KEY "your_key"
setx AZURE_OPENAI_API_VERSION "2024-06-01"
setx AZURE_OPENAI_DEPLOYMENT "bluma-gpt"
setx GITHUB_PERSONAL_ACCESS_TOKEN "..."
setx NOTION_API_TOKEN "..."
```
(Only needs to be run once per variable. Restart the terminal after.)

**Windows (PowerShell):**
```powershell
[Environment]::SetEnvironmentVariable("AZURE_OPENAI_ENDPOINT", "https://...", "Machine")
[Environment]::SetEnvironmentVariable("AZURE_OPENAI_API_KEY", "your_key", "Machine")
[Environment]::SetEnvironmentVariable("AZURE_OPENAI_API_VERSION", "2024-06-01", "Machine")
[Environment]::SetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT", "bluma-gpt", "Machine")
[Environment]::SetEnvironmentVariable("GITHUB_PERSONAL_ACCESS_TOKEN", "...", "Machine")
[Environment]::SetEnvironmentVariable("NOTION_API_TOKEN", "...", "Machine")
```

### ℹ️ Global Installation of npm Packages in PowerShell (Windows)
When installing BluMa (or any npm package globally) in PowerShell, you might see:
```
Do you want to change the execution policy?
[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [S] Suspend  [?] Help (default is "N"):
```
👉 **Choose `Y` (Yes) or `A` (Yes to All)**. This will change the execution policy to **RemoteSigned** (only scripts from the internet need a digital signature).

- This is safe for devs: Windows only requires digital signatures for web scripts—local scripts, from npm, work normally.
- Read more: [About Execution Policies (Microsoft Docs)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/about/about_execution_policies)

**To restore the default policy after installation, run:**
```powershell
Set-ExecutionPolicy Default
```

> **Tip:** Restart your terminal to ensure the variables are loaded globally.

---

## <a name="how-to-run"></a>How to Run
```bash
npm start
# Or directly using the built binary
npx bluma
```
==> The CLI will open an interactive terminal interface for dialogue, command execution, and engineering workflow automation.

---

## <a name="project-structure"></a>Project Structure
```
bluma-engineer/
├── package.json               # npm/project config
├── tsconfig.json              # TypeScript config
├── scripts/build.js           # Build script using esbuild
├── src/
│   ├── main.ts                # Entry point (Ink renderer)
│   └── app/
│        ├── agent/            # Agent core (session mgmt, tools, MCP, prompt, feedback)
│        ├── ui/               # Ink/React CLI interface components
│        └── protocols/        # Protocols & helpers
```
---

## <a name="development-and-build"></a>Development and Build
- Build is performed using [esbuild](https://esbuild.github.io/) (see scripts/build.js).
- TS source files are in `src/` and compiled to `dist/`.
- Use `npm run build` to compile and get the CLI binary ready.
- Config files are automatically copied to `dist/config`.

### Main scripts:
```bash
npm run build    # Compiles project to dist/
npm start        # Runs CLI (after build)
npm run dev      # (If configured, hot-reload/TS watch)
```

---

## <a name="extensibility-tools-and-plugins"></a>Extensibility: Tools and Plugins
- Add native tools in `src/app/agent/tools/natives/`
- Use the MCP SDK for advanced plugins integrating with external APIs
- Create custom Ink components to expand the interface

---

## <a name="tests"></a>Tests
- The repository ships with Jest 30 configured (babel-jest) and TypeScript support.
- Test files are located under `tests/` and follow `*.spec.ts` naming.
- Run tests:

```bash
npm test
npm run test:watch
```

---

## Live Dev Overlays (Open Channel During Processing)
BluMa supports a live side-channel that stays active even while the agent is processing. This lets the dev send guidance or constraints in real-time — like pair programming.

Key points
- Permissive mode enabled: during processing, any free text you type is treated as a [hint] automatically.
- Structured prefixes are also supported at any time:
  - [hint] Text for immediate guidance to the agent
  - [constraint] Rules/limits (e.g., "não tocar em src/app/agent/**")
  - [override] Parameter overrides as key=value pairs (e.g., "file_path=C:/... expected_replacements=2")
  - [assume] Register explicit assumptions
  - [cancel] Interrupt safely (already supported)

How it works
- Frontend: the input remains active in read-only (processing) mode and emits a dev_overlay event.
- Agent backend: consumes overlays with precedence (constraint > override > hint). Hints and assumptions are injected into the system context before the next decision; overrides/constraints adjust tool parameters just before execution.
- Logging & history: every overlay is logged and stored in session history for auditability.

Examples
- During a long task, just type:
  - "Prefer do not touch tests yet" → will be treated as [hint]
  - "[constraint] não editar src/app/ui/**" → blocks edits under that path
  - "[override] expected_replacements=2" → adjusts the next edit_tool call
  - "[assume] target=api" → adds an assumption in context

Notes
- The side-channel does not pause the agent — it adapts on the fly.
- If an overlay conflicts with the current plan: constraint > override > hint.
- All overlays are acknowledged via standard internal messages and persisted.

---

## <a name="configuration-and-environment-variables"></a>Configuration and Environment Variables
You must create a `.env` file (copy if needed from `.env.example`) with the following variables:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_DEPLOYMENT`
- `GITHUB_PERSONAL_ACCESS_TOKEN` (optional; required for GitHub integrations)
- `NOTION_API_TOKEN` (optional; required for Notion integrations)

And others required by your agent/context or Azure setup.

Advanced config files are located in `src/app/agent/config/`.

---

## <a name="stack"></a>Tech Stack Overview
- Language: TypeScript (ESM)
- Runtime: Node.js >= 18
- CLI UI: React 18 via Ink 5, plus `ink-text-input`, `ink-spinner`, `ink-big-text`
- Bundler: esbuild, with `esbuild-plugin-node-externals`
- Test Runner: Jest 30 + babel-jest
- Transpilers: Babel presets (env, react, typescript)
- LLM/Agent: Azure OpenAI via `openai` SDK; MCP via `@modelcontextprotocol/sdk`
- Config loading: dotenv
- Utilities: uuid, diff, react-devtools-core

---

## <a name="license"></a>License
Apache-2.0. Made by Alex Fonseca and NomadEngenuity contributors.

Enjoy, hack, and—if possible—contribute!