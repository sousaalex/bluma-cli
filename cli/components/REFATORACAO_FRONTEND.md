# Plano Detalhado de Refatoração do Frontend

## Visão Geral
O frontend apresenta um ficheiro principal (`App.tsx`) muito extenso, com múltiplas responsabilidades e lógica misturada. Este plano propõe a divisão em componentes menores, extração de hooks customizados e modularização para facilitar manutenção, testes e evolução.

---
## Problemas Atuais Identificados
- **Ficheiro principal demasiado grande:**
  - `App.tsx` (~865 linhas) mistura UI, lógica de backend, parsing e gestão de estado.
- **Responsabilidades misturadas:**
  - Renderização, gestão de histórico, comunicação com backend e animações estão no mesmo ficheiro.
- **Dificuldade em testar e evoluir:**
  - Componentes e lógica não isolados dificultam testes unitários e manutenção.

---
## Proposta de Nova Estrutura Modular
### 1. **Divisão de `App.tsx`**
- **Responsabilidade:** Orquestração da UI e integração dos componentes.
- **Ações:**
  - Extrair componentes:
    - `ToolCall.tsx`: Renderização das chamadas de ferramentas.
    - `ToolResult.tsx`: Renderização dos resultados das ferramentas.
    - `Header.tsx`: Cabeçalho da aplicação.
    - `SessionInfo.tsx`: Informação da sessão e status MCP.
    - `InputBar.tsx`: Input do utilizador (TextInput).
    - `StatusBar.tsx`: Mensagens de status e animações.
    - `ErrorBox.tsx`: Exibição de erros críticos do backend.
  - Manter em `App.tsx` apenas a composição dos componentes e lógica mínima de orquestração.

### 2. **Extração de Hooks Customizados**
- Criar hooks para encapsular lógica complexa:
  - `useBackendProcess.ts`: Gestão do processo backend, eventos stdout/stderr, ciclo de vida.
  - `useHistoryManager.ts`: Gestão do histórico de mensagens e componentes.
  - `useStatusMessage.ts`: Gestão do statusMessage e feedback visual.

### 3. **Organização dos Componentes**
- Criar subdiretório `components/ui/` para componentes visuais reutilizáveis (ex: AsciiArt, ErrorBox, StatusBar).
- Manter componentes lógicos no diretório principal (`components/`).

### 4. **Testes Automatizados**
- Criar diretório `tests/frontend/` com testes unitários para cada novo componente/hook criado.

---
## Mapa de Migração Sugerido
| Ficheiro Atual         | Novo(s) Ficheiro(s) Sugerido(s)                |
|-----------------------|-----------------------------------------------|
| App.tsx               | App.tsx (composição), ToolCall.tsx, ToolResult.tsx, Header.tsx, SessionInfo.tsx, InputBar.tsx, StatusBar.tsx, ErrorBox.tsx |
| UI.tsx                | Pode ser dividido em Header.tsx, SessionInfo.tsx ou movido para ui/ |
| ui/AsciiArt.ts        | Mantém-se em ui/, pode ser complementado com outros componentes visuais |
| (novo) hooks/         | useBackendProcess.ts, useHistoryManager.ts, useStatusMessage.ts |

---
## Recomendações Práticas para Devs
1. **Refatore gradualmente:** Priorize extrair componentes bem definidos primeiro (ToolCall, ToolResult).
2. **Garanta cobertura de testes:** Sempre que mover código para um novo componente/hook, crie ou atualize testes unitários correspondentes.
3. **Atualize imports:** Após mover funções/classes, atualize todos os imports nos módulos dependentes.
4. **Documente cada novo componente/hook:** Inclua comentários explicativos sobre a responsabilidade do ficheiro.
5. **Faça commits pequenos e atómicos:** Facilita code review e rollback se necessário.
6. **Use o diretório ui/** para evitar duplicação de componentes visuais entre módulos diferentes.
7. **Mantenha o README atualizado:** Documente a nova arquitetura à medida que for refatorando.

---
## Exemplo de Estrutura Final Esperada
```
bliuma-engineer/
└── cli/
    └── components/
        ├── App.tsx
        ├── ToolCall.tsx
        ├── ToolResult.tsx
        ├── Header.tsx
        ├── SessionInfo.tsx
        ├── InputBar.tsx
        ├── StatusBar.tsx
        ├── ErrorBox.tsx
        ├── UI.tsx (se necessário)
        ├── hooks/
        │   ├── useBackendProcess.ts
        │   ├── useHistoryManager.ts
        │   └── useStatusMessage.ts
        └── ui/
            ├── AsciiArt.ts
            └── ...
tests/
    frontend/
        test_ToolCall.test.tsx
        test_useBackendProcess.test.ts
        ...
```
---
## Conclusão
Esta refatoração tornará o frontend mais modular, testável e escalável. Siga este guia como referência durante todo o processo. Dúvidas ou sugestões devem ser discutidas em equipa antes de grandes alterações.