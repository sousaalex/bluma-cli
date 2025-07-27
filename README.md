# BluMa CLI

[![npm version](https://img.shields.io/npm/v/bluma.svg?style=flat-square)](https://www.npmjs.com/package/bluma)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](https://shields.io/)

<p align="center">
  <img src="dist/bluma.png" alt="Tela inicial BluMa CLI" width="1000"/>
</p>

BluMa CLI é um agente independente para automação e engenharia de software avançada. O projeto implementa um assistente conversacional que interage via terminal (CLI), baseado em React/Ink, com suporte a agentes inteligentes (LLM, OpenAI Azure), execução de ferramentas, histórico persistente, gestão de sessões e integração extensível via plugins/tools externos.

---

## Sumário
- [Visão Geral](#visao-geral)
- [Características Principais](#caracteristicas-principais)
- [Requisitos](#requisitos)
- [Instalação](#instalacao)
- [Como Executar](#como-executar)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Desenvolvimento e Build](#desenvolvimento-e-build)
- [Extensibilidade: Ferramentas e Plugins](#extensibilidade-ferramentas-e-plugins)
- [Testes](#testes)
- [Configuração e Variáveis](#configuracao-e-variaveis)
- [Licença](#licenca)

---

## <a name="visao-geral"></a>Visão Geral
BluMa é uma CLI moderna voltada para automação, colaboração com LLMs, documentação, refatoração, execução de tarefas complexas e interação com ferramentas externas. Utiliza React (via Ink) para interfaces ricas em terminal e conta com um gestor de contexto/conversa, feedback inteligente e sistema de confirmação interativa.

---

## <a name="caracteristicas-principais"></a>Características Principais
- **Interface CLI rica** construída em React/Ink 5, com prompts interativos e componentes customizados.
- **Gestão de sessão:** persistência automática do histórico de conversas e ferramentas via arquivos.
- **Agente central (LLM):** orquestrado por Azure OpenAI (ou compatível), permite automação orientada por linguagem natural.
- **Invocação de Ferramentas:** integração nativa e via MCP SDK para executar comandos, manipular código, gerenciamento de arquivos e mais.
- **Prompt dinâmico:** construção dinâmica de contexto conversacional, regras comportamentais e histórico técnico.
- **Componente de feedback inteligente** com sugestões e checagens técnicas.
- **ConfirmPrompt e Workflow Decision:** confirmações para execuções sensíveis, preview de alterações (ex: edit de código), whitelist de comandos sempre aceitos.
- **Extensível:** fácil adicionar novas ferramentas ou integrar SDK/plugin externo.

---

## <a name="requisitos"></a>Requisitos
- Node.js >= 18
- npm >= 9
- Conta (com chave) do Azure OpenAI (ou variáveis equivalentes para os endpoints OpenAI/compatíveis)

---

## <a name="instalacao"></a>Instalação

### Método Recomendado: Instalação Global

> **Importante:** recomenda-se instalar o BluMa globalmente no sistema para garantir acesso ao comando bluma em qualquer terminal.

```bash
npm install -g bluma
```

- Caso ocorram erros de permissão, EXEMPLO:
    - **Linux:** rode como administrador usando `sudo`:
      ```bash
      sudo npm install -g bluma
      ```
    - **Windows:** execute o terminal/prompt como Administrador e depois repita o comando

> **macOS:** Após instalar globalmente, **sempre rode o comando `bluma` sem sudo**:
>
> ```bash
> bluma
> ```
> Rodar com sudo pode causar problemas de permissão, variáveis de ambiente e ownership de ficheiros em cache npm. 
> Só use sudo para instalar, nunca para rodar o CLI.


### Configuração das Variáveis de Ambiente
Para o BluMa operar com OpenAI/Azure, Github e Notion, defina as seguinters variáveis globais de ambiente no seu sistema.

**Obrigatórias:**
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_DEPLOYMENT`
- `GITHUB_PERSONAL_ACCESS_TOKEN` (caso vá operar com o Github)
- `NOTION_API_TOKEN` (caso vá operar com o Notion)

#### Como definir as variáveis globais:

**Linux/macOS:**
Adicione ao arquivo `~/.bashrc`, `~/.zshrc` ou equivalente:
```sh
export AZURE_OPENAI_ENDPOINT="https://..."
export AZURE_OPENAI_API_KEY="sua_chave"
export AZURE_OPENAI_API_VERSION="2024-06-01"
export AZURE_OPENAI_DEPLOYMENT="bluma-gpt"
export GITHUB_PERSONAL_ACCESS_TOKEN="..."
export NOTION_API_TOKEN="..."
```
Depois rode:
```sh
source ~/.bashrc # ou o arquivo que alterou
```

**Windows (CMD):**
```cmd
setx AZURE_OPENAI_ENDPOINT "https://..."
setx AZURE_OPENAI_API_KEY "sua_chave"
setx AZURE_OPENAI_API_VERSION "2024-06-01"
setx AZURE_OPENAI_DEPLOYMENT "bluma-gpt"
setx GITHUB_PERSONAL_ACCESS_TOKEN "..."
setx NOTION_API_TOKEN "..."
```
(Só precisa rodar 1 vez para cada variável. Depois, reinicie o terminal.)

**Windows (PowerShell):**
```powershell
[Environment]::SetEnvironmentVariable("AZURE_OPENAI_ENDPOINT", "https://...", "Machine")
[Environment]::SetEnvironmentVariable("AZURE_OPENAI_API_KEY", "sua_chave", "Machine")
[Environment]::SetEnvironmentVariable("AZURE_OPENAI_API_VERSION", "2024-06-01", "Machine")
[Environment]::SetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT", "bluma-gpt", "Machine")
[Environment]::SetEnvironmentVariable("GITHUB_PERSONAL_ACCESS_TOKEN", "...", "Machine")
[Environment]::SetEnvironmentVariable("NOTION_API_TOKEN", "...", "Machine")
```

### ℹ️ Instalação Global de Pacotes no PowerShell (Windows)
Ao instalar o BluMa (ou qualquer pacote npm globalmente) no PowerShell, pode aparecer o prompt:
```
Do you want to change the execution policy?
[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [S] Suspend  [?] Help (default is "N"):
```
👉 **Escolha a opção `Y` (Yes) ou `A` (Yes to All)**, pressionando a tecla correspondente. Com isso, a política de execução será ajustada para **RemoteSigned** (só scripts baixados da Internet precisam de assinatura).

- Isso é seguro para devs: o Windows só exige assinatura digital para scripts vindos da web—scripts locais, do npm, funcionam normalmente.
- Leia mais em: [Sobre Execution Policies (Microsoft Docs)](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/about/about_execution_policies)

**Dica:** Deseja restaurar a política padrão depois da instalação? Execute:
```powershell
Set-ExecutionPolicy Default
```

> **Dica:** Reinicie o terminal para garantir que as variáveis já estão disponíveis globalmente.

---

## <a name="como-executar"></a>Como Executar
```bash
npm start
# Ou direto pelo binário pós-build
npx bluma
```
==> O CLI abrirá uma interface interativa no terminal para dialogar, executar comandos e automatizar workflows de engenharia.

---

## <a name="estrutura-do-projeto"></a>Estrutura do Projeto
```
bluma-engineer/
├── package.json               # Configuração npm/project
├── tsconfig.json              # Configuração TypeScript
├── scripts/build.js           # Script de build com esbuild
├── src/
│   ├── main.ts                # Ponto de entrada (renderizador Ink)
│   └── app/
│        ├── agent/            # Núcleo do agente (gestão session, tools, MCP, prompt, feedback)
│        ├── ui/               # Componentes de interface Ink/React CLI
│        └── protocols/        # Protocolos & helpers
```
---

## <a name="desenvolvimento-e-build"></a>Desenvolvimento e Build
- O build é feito via [esbuild](https://esbuild.github.io/) (ver scripts/build.js).
- Fontes TS ficam em `src/` e vão para `dist/`.
- Use `npm run build` para compilar e preparar binário CLI.
- Os arquivos de configuração são copiados para `dist/config` automaticamente.

### Scripts principais:
```bash
npm run build    # Compila projeto para dist/
npm start        # Roda CLI (após build)
npm run dev      # (Se estiver configurado, hot-reload/TS watch)
```

---

## <a name="extensibilidade-ferramentas-e-plugins"></a>Extensibilidade: Ferramentas e Plugins
- Adicione ferramentas nativas em `src/app/agent/tools/natives/`.
- Use MCP SDK para plugins avançados integrando com APIs externos.
- Crie componentes Ink customizados para expandir a interface.

---

## <a name="testes"></a>Testes
- Organize seus testes dentro da pasta `test/` conforme seu padrão local ou necessidade do projeto, se desejar ampliar a cobertura do BluMa CLI.

---

## <a name="configuracao-e-variaveis"></a>Configuração e Variáveis
É obrigatório criar um arquivo `.env` (copie, se necessário, de `.env.example`) com as seguintes variáveis:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_DEPLOYMENT`

E outras que forem requeridas no contexto do seu agente/contexto Azure.

Os arquivos de configuração avançada estão em `src/app/agent/config/`.

---

## <a name="licenca"></a>Licença
MIT. Feito por Alex Fonseca e colaboradores NomadEngenuity.

Desfrute, hackeie e, se possível, colabore!