
# BluMa CLI

**BluMa CLI** é um assistente autônomo para engenharia de software. Ele acelera o desenvolvimento, refatoração e análise de projetos complexos usando automação e padrões avançados. O projeto combina protocolos de engenharia, automação de tarefas e uma interface interativa via terminal.

---

## 🚀 Funcionalidades Existentes no Projeto

* Interface CLI interativa baseada em Ink/React (TypeScript)
* Automação de tarefas: análise/manipulação/refatoração de código, geração de documentação e manipulação de arquivos via MCP tools (Python)
* Sistema básico de métricas/logs via arquivos JSONL em logs/metrics/
* Arquitetura modular: backend Python para lógica/automações; frontend TypeScript/React para UI CLI
* Protocolos operacionais: idle, notificações e documentação via Python modules em cli/protocols/
* Foco em qualidade e resiliência seguindo padrões profissionais

---

## 📦 Estrutura Real do Projeto (2025-07-17)
```
bluma-engineer/
├── BLUMA_CLI_PLAN.md           # Planejamento geral do projeto
├── cli/
│   ├── backend/
│   │   ├── __init__.py         
│   │   ├── bluma.py            
│   │   ├── REFATORACAO_BACKEND.md 
│   │   └── core/
│   ├── components/
│   │   ├── App.tsx             
│   │   ├── REFATORACAO_FRONTEND.md 
│   │   ├── UI.tsx              
│   │   └── ui/
│   ├── config/
│   │   ├── advanced_api_config.json 
│   │   └── mcp_server_config.json 
│   ├── mcp/
│   │   ├── files_mcp.py        
│   │   └── ...                 
│   ├── prompt_core/
│   │   ├── __init__.py         
│   │   ├── README.md           
│   │   ├── description/
│   │   └── prompt/
│   ├── protocols/
│   │   ├── __init__.py         
│   │   ├── documentation.py    
│   │   ├── idle.py             
│   │   └── notification.py     
│   └── index.tsx               
├── logs/
│   └── metrics/                
├── sessions/                   
├── package.json                
├── pyproject.toml              
├── requirements.txt            
├── tsconfig.json               
├── uv.lock                     
└── README.md                   
```

---

## ⚙️ Instalação e Execução

### Requisitos:
* Python 3.10+
* Node.js 18+
* npm (ou yarn)
* (Opcional) Ambiente virtual Python:
  - `python -m venv .venv && source .venv/bin/activate` (Linux/Mac)
  - `.venv\Scripts\activate` (Windows)

### Instalação de dependências:
```bash
pip install -r requirements.txt
npm install
```
### Execução da interface CLI:
```bash
npm start
```
Ou diretamente:
```bash
npx tsx cli/index.tsx
```

---

## 🛠️ Scripts Disponíveis

* `npm start` — Inicia a interface CLI (definido em package.json)
* `pip install -r requirements.txt` — Instala dependências Python (requirements.txt existe)
* `npm install` — Instala dependências Node.js/TypeScript (package.json existe)

---

## 📁 Diretórios e Arquivos Especiais Existentes

* `cli/backend/core/` — Lógica central do agente (Python)
* `cli/components/` — Componentes da interface (Ink/React)
* `cli/mcp/` — Ferramentas MCP Python
* `logs/metrics/` — Logs/métricas em JSONL
* `sessions/` — Sessões/contextos salvos em JSON
* Documentos de refatoração: `cli/backend/REFATORACAO_BACKEND.md`, `cli/components/REFATORACAO_FRONTEND.md`
* Arquivos de lock/configuração: `uv.lock`, `pyproject.toml`, `tsconfig.json`, além de dependências em `requirements.txt`, `package.json`

---

## 🤝 Contribuições

1. Faça fork do repositório e crie uma branch:
   `git checkout -b feature/nome-da-feature`
2. Realize commits claros e mantenha a documentação atualizada.
3. Abra um Pull Request explicando sua contribuição.
4. Siga o padrão de código do projeto.
   
---

## 📄 Licença

Este projeto ainda não possui um arquivo de licença explícito. Recomenda-se definir uma licença antes de distribuição pública.

---

## 👨‍💻 Suporte

Para dúvidas ou sugestões, utilize as issues do repositório.

---
