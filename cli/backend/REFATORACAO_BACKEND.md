# Plano Detalhado de Refatoração do Backend

## Visão Geral
O backend do projeto apresenta módulos extensos e responsabilidades sobrepostas, dificultando a manutenção, testes e evolução. Este plano propõe uma divisão clara de responsabilidades, modularização e criação de novos ficheiros para garantir escalabilidade e facilidade de colaboração.

---
## Problemas Atuais Identificados
- **Ficheiros muito extensos:**
  - `bluma.py` (~414 linhas)
  - `core/agent.py` (~718 linhas)
  - `core/metrics.py` (~347 linhas)
  - `core/feedback.py` (~371 linhas)
- **Responsabilidades misturadas:**
  - Lógica de sessão, histórico, integração LLM, processamento de turnos e gestão de contexto estão misturados.
- **Dificuldade em testar e evoluir:**
  - Funções utilitárias e lógica de negócio não estão isoladas.

---
## Proposta de Nova Estrutura Modular
### 1. **Divisão de `bluma.py`**
- **Responsabilidade:** Orquestração principal, inicialização, ciclo de vida da aplicação.
- **Ações:**
  - Extrair funções de gestão de sessão/histórico para um novo módulo: `session_manager.py`.
  - Extrair lógica de configuração/env para `config_loader.py`.
  - Manter apenas o entrypoint e orquestração principal.

### 2. **Refatoração de `core/agent.py`**
- **Responsabilidade:** Processamento do agente, integração LLM, gestão do contexto da conversa.
- **Ações:**
  - Dividir em submódulos:
    - `agent_context.py`: Gestão do contexto e janela de mensagens.
    - `agent_llm.py`: Integração com LLMs (OpenAI/Azure).
    - `agent_turns.py`: Processamento dos turnos/conversas.
    - `agent_utils.py`: Funções auxiliares comuns ao agente.
  - Manter em `agent.py` apenas a classe principal e delegação para submódulos.

### 3. **Modularização de Métricas e Feedback**
- **metrics.py**
  - Dividir em:
    - `metrics_collector.py`: Coleta e agregação de métricas.
    - `metrics_exporter.py`: Exportação/logging das métricas.
    - `metrics_utils.py`: Funções auxiliares para métricas.
- **feedback.py**
  - Dividir em:
    - `feedback_manager.py`: Gestão centralizada do feedback.
    - `feedback_types.py`: Definição dos tipos/níveis de feedback.
    - `feedback_utils.py`: Funções utilitárias para feedback.

### 4. **Ferramentas e Utilitários**
- **tools.py**
  - Separar ferramentas em ficheiros individuais por domínio (ex: `tool_file_ops.py`, `tool_shell.py`, etc).
- **helpers/** (novo diretório)
  - Centralizar funções utilitárias comuns usadas por vários módulos (ex: manipulação JSON, validação, logging customizado).

### 5. **Testes Automatizados**
- Criar diretório `tests/backend/` com testes unitários para cada novo módulo criado.

---
## Mapa de Migração Sugerido
| Ficheiro Atual                | Novo(s) Ficheiro(s) Sugerido(s)           |
|-------------------------------|-------------------------------------------|
| bluma.py                      | bluma.py (entrypoint), session_manager.py, config_loader.py |
| core/agent.py                 | agent.py, agent_context.py, agent_llm.py, agent_turns.py, agent_utils.py |
| core/metrics.py               | metrics_collector.py, metrics_exporter.py, metrics_utils.py |
| core/feedback.py              | feedback_manager.py, feedback_types.py, feedback_utils.py |
| core/tools.py                 | tool_file_ops.py, tool_shell.py, ...      |
| helpers/ (novo)               | utils comuns                              |

---
## Recomendações Práticas para Devs
1. **Refatore gradualmente:** Priorize mover funções utilitárias e lógicas bem definidas primeiro.
2. **Garanta cobertura de testes:** Sempre que mover código para um novo módulo, crie ou atualize testes unitários correspondentes.
3. **Atualize imports:** Após mover funções/classes, atualize todos os imports nos módulos dependentes.
4. **Documente cada novo módulo:** Inclua docstrings e comentários explicativos sobre a responsabilidade do ficheiro.
5. **Faça commits pequenos e atómicos:** Facilita code review e rollback se necessário.
6. **Use o diretório helpers/** para evitar duplicação de código utilitário entre módulos diferentes.
7. **Mantenha o README atualizado:** Documente a nova arquitetura à medida que for refatorando.

---
## Exemplo de Estrutura Final Esperada
```
bliuma-engineer/
└── cli/
    └── backend/
        ├── bluma.py
        ├── session_manager.py
        ├── config_loader.py
        ├── core/
        │   ├── __init__.py
        │   ├── agent.py
        │   ├── agent_context.py
        │   ├── agent_llm.py
        │   ├── agent_turns.py
        │   ├── agent_utils.py
        │   ├── metrics_collector.py
        │   ├── metrics_exporter.py
        │   ├── metrics_utils.py
        │   ├── feedback_manager.py
        │   ├── feedback_types.py
        │   ├── feedback_utils.py
        │   ├── tool_file_ops.py
        │   ├── tool_shell.py
        │   └── ...
        └── helpers/
            └── ...
tests/
    backend/
        test_agent_context.py
        test_session_manager.py
        ...
```
---
## Conclusão
Esta refatoração tornará o backend mais modular, testável e escalável. Siga este guia como referência durante todo o processo. Dúvidas ou sugestões devem ser discutidas em equipa antes de grandes alterações.