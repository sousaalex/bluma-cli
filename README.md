# BluMa CLI

[![npm version](https://img.shields.io/npm/v/bluma.svg?style=flat-square)](https://www.npmjs.com/package/bluma)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](https://shields.io/)

<p align="center">
  <img src="docs\assets\images\bluma.png" alt="Tela inicial BluMa CLI" width="1000"/>
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
npm install -g bluma
```

If you get permission errors, EXAMPLES:
  - **Linux:** Run as administrator using `sudo`:
    ```bash
    sudo npm install -g bluma
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
- Organize your tests inside the `test/` folder in your preferred style or as your project's coverage grows

---

## <a name="configuration-and-environment-variables"></a>Configuration and Environment Variables
You must create a `.env` file (copy if needed from `.env.example`) with the following variables:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_DEPLOYMENT`

And others required by your agent/context or Azure setup.

Advanced config files are located in `src/app/agent/config/`.

---

## <a name="license"></a>License
MIT. Made by Alex Fonseca and NomadEngenuity contributors.

Enjoy, hack, and—if possible—contribute!