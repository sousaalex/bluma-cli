
# BluMa CLI

**BluMa CLI** é um assistente autônomo para engenharia de software. Foi criado para acelerar o desenvolvimento, refatoração e análise de projetos complexos, usando automação e padrões avançados de IA. Ele combina protocolos de engenharia, automação de tarefas, métricas de desempenho e uma interface interativa via terminal.

---

## 🚀 Funcionalidades

* **Interface CLI interativa** com Ink/React (moderna e responsiva no terminal)
* **Automação de tarefas** como análise de código, refatoração, geração de documentação e manipulação de arquivos
* **Sistema de métricas e feedbacks inteligentes** com logging detalhado e sugestões de melhoria
* **Arquitetura modular**: backend em Python para lógica e frontend em TypeScript/React para UI
* **Foco em qualidade e resiliência**, seguindo padrões profissionais de engenharia

---

## 📦 Estrutura do Projeto

```
bluma-engineer/
├── BLUMA_CLI_PLAN.md           # Planejamento e visão geral do projeto
├── cli/
│   ├── backend/                # Lógica em Python: agente, métricas, feedback, notebook
│   │   ├── core/              # Núcleo: agent.py, feedback.py, metrics.py, notebook.py, tools.py
│   │   └── bluma.py           # Entrypoint do backend Python
│   ├── components/            # Componentes React/Ink da interface CLI
│   │   └── ui/                # Subcomponentes de UI (AsciiArt)
│   ├── config/                # Arquivos de configuração (JSON)
│   ├── mcp/                   # Ferramentas MCP: code_analysis, code_manipulation, edit, end_task, file_operations, idle, message, shell
│   ├── prompt_core/           # Sistema de prompts dinâmicos
│   │   ├── description/       # Descrições de prompt
│   │   └── prompt/            # Núcleo dos prompts
│   ├── protocols/             # Protocolos operacionais (idle, notificações, documentação)
│   └── index.tsx              # Ponto de entrada da interface CLI (Ink/React)
├── logs/                      # Logs e métricas detalhadas
├── sessions/                  # Sessões/contextos salvos (JSON)
├── package.json               # Dependências do frontend (Node.js/TypeScript)
├── pyproject.toml             # Configuração avançada Python (opcional)
├── requirements.txt           # Dependências do backend (Python)
├── tsconfig.json              # Configuração do TypeScript
├── uv.lock                    # Lockfile Python (opcional)
└── README.md                  # Documentação principal
```

---

## ⚙️ Instalação e Execução

### Requisitos:

* Python 3.10 ou superior
* Node.js 18 ou superior
* npm ou yarn
* (Recomendado) Ambiente virtual em Python:

  ```bash
  python -m venv .venv && source .venv/bin/activate  # Linux/Mac
  .venv\Scripts\activate                             # Windows
  ```

### Instalar dependências:

```bash
pip install -r requirements.txt
npm install
```

### Executar o CLI:

```bash
npm start
```

Ou diretamente:

```bash
npx tsx cli/index.tsx
```

---

## 🛠️ Scripts

* `npm start` — Inicia a interface CLI
* `pip install -r requirements.txt` — Instala dependências do backend Python
* `npm install` — Instala dependências do frontend TypeScript

---

## 📁 Diretórios Relevantes

* `cli/backend/core/` — Lógica central do agente (Python)
* `cli/components/` — Componentes da interface (Ink/React)
* `cli/mcp/` — Ferramentas de automação MCP
* `logs/` — Logs e métricas detalhadas
* `sessions/` — Sessões/contextos salvos

---

## 🤝 Contribuições

1. Faça fork do repositório e crie uma branch:
   `git checkout -b feature/nome-da-feature`
2. Realize commits claros e com testes sempre que possível
3. Abra um Pull Request explicando sua contribuição
4. Siga o padrão de código e mantenha a documentação atualizada

---

## 📄 Licença

Este projeto utiliza a licença MIT. Detalhes no arquivo `LICENSE`.

---

## 👨‍💻 Suporte

Para dúvidas ou sugestões, abra uma issue ou entre em contato via GitHub.

---
