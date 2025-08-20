# To-Do Rules — Regras e Boas Práticas para a ferramenta `todo`

Este documento descreve, de forma completa e exaustiva, as regras, restrições e boas práticas para o uso da ferramenta nativa `todo` do agente. O objetivo é garantir comportamento determinístico, segurança, facilidade de integração e interoperabilidade entre agentes, UIs e pipelines automáticos.

Índice
- Visão geral
- Formato e esquema
- Ações suportadas
- Validação de entrada
- Regras de mutação e idempotência
- Execução automática e segurança (safe_tool)
- Logging, audit e persistência
- Erros e respostas previsíveis
- Regras de interface (UI / renderização)
- Regras de interação com o agente / prompt
- Regras de versionamento e compatibilidade
- Testes e qualidade
- Limitações e considerações
- Exemplos de payloads e respostas

---

Visão geral
----------
A ferramenta `todo` é um gerenciador nativo de listas de tarefas (checklist) pensado para integração com agentes autônomos e pipelines. Ela fornece um contrato claro e estruturado para que tanto humanos quanto máquinas possam ler e modificar o estado de tarefas de forma previsível.

Formato e esquema
-----------------
- Representação principal: array de strings chamado `to_do`.
- Formato de cada item: obrigatório prefixo de status seguido por um espaço e o texto da tarefa.
  - Status válido: `🗹 ` (concluído) ou `☐ ` (pendente).
  - Exemplo: `☐ Implementar validação de inputs` ou `🗹 Review do PR #42`.
- Retorno: ao executar ações que alterem estado, a ferramenta devolve o array `to_do` atualizado e um campo `_tool_result` com duas chaves:
  - `parsed`: array de objetos { index: number, status: 'done'|'pending', text: string }
  - `render`: string com visual humano legível (cada item em nova linha com índice e marca)

Ações suportadas
-----------------
- `list` — retorna o estado atual sem mutação.
- `add` — acrescenta um novo item pendente; payload: `{ action: 'add', item: 'text' }`.
- `complete` — marca um item como concluído; payload: `{ action: 'complete', index: 1 }` (1-based).
- `remove` — remove um item por índice; payload: `{ action: 'remove', index: 2 }`.

Validação de entrada
--------------------
- `action` é obrigatório e deve ser uma das opções listadas.
- `index` se fornecido deve ser inteiro >= 1 e <= length(to_do).
- `item` quando exigido deve ser string não vazia e sem prefixo (o prefixo é atribuído pela ferramenta).
- `to_do` (opcional) quando fornecido será normalizado: qualquer item sem prefixo será convertido para `☐ <texto>`.
- Erros de validação devem retornar uma resposta clara com `error` contendo a mensagem e `status: 400` quando aplicável.

Regras de mutação e idempotência
--------------------------------
- `add` é idempotente apenas se o mesmo item for adicionado com um identificador externo; por padrão, chamadas repetidas adicionam itens duplicados.
- `complete` e `remove` são idempotentes no sentido que aplicar `complete` numa tarefa já concluída não causa erro — apenas mantém o estado `🗹`.
- `remove` numa posição já removida (índice inválido) deve retornar erro de input inválido.
- Alterações devem sempre retornar o novo array `to_do` completo para permitir sincronização do cliente.

Execução automática e segurança (safe_tool)
-------------------------------------------
- A `todo` é considerada uma `safe_tool` para execuções automáticas pelo agente quando as ações são localizadas e previsíveis (ex.: `list`, `render`, `add` com item textual simples).
- O agente pode autoaprová-la sem intervenção humana quando: a) a ação não modifica código fonte; b) não requer acesso a credenciais nem recursos externos sensíveis; c) não envolve remoção em massa sem confirmação.
- Para ações destrutivas (por ex. `remove` em massa), recomenda-se confirmação humana, a menos que haja política explícita favorável.

Regras de concorrência
----------------------
- A ferramenta deve considerar o array `to_do` recebido como snapshot; mudanças concorrentes devem ser resolvidas pela camada que persiste estado (locking otimista ou verificação de versão) — se o projeto não persiste, o consumidor deve ser consciente de possíveis conflitos.
- Em ambientes multi-agent, incluir um campo de `timestamp` ou `version` na camada de armazenamento é recomendado.

Logging, audit e persistência
-----------------------------
- Toda execução deve ser logada com: timestamp, ação, argumentos, usuário/agent que solicitou (quando aplicável), resultado (sucesso/erro), e diffs entre `to_do` antigo e novo.
- Logs de auditoria devem manter rastro de quem fez remoções e completions.
- Persistência: a ferramenta não impõe mecanismo — se integrada a um backend, este deve garantir durabilidade e backups.

Erros e respostas previsíveis
-----------------------------
- Erros de validação: respondem com { error: 'mensagem', status: 400 }
- Erros internos: respondem com { error: 'Internal error', status: 500, details?: '...' }
- Respostas de sucesso sempre incluem `to_do` (array) e `_tool_result`.

Regras de interface (UI / renderização)
---------------------------------------
- Para exibir ao usuário, usar `_tool_result.render` primeiro; se não existir, montar a partir de `_tool_result.parsed`.
- A renderização deve ser simples e acessível: índice, marca, texto. Exemplo:
  1. ☐ Implement unit tests
  2. 🗹 Fix bug #123
- Ao permitir edição inline, o cliente deve enviar payloads claros (`add`, `complete`, `remove`) e nunca enviar listas embutidas em texto livre.

Regras de interação com o agente / prompt
----------------------------------------
- O prompt do agente deve instruir explicitamente o uso da `todo` para planeamento e checklist (evitar texto livre para tarefas).
- Exemplo de instrução no sistema prompt: "When producing a checklist or plan use the `todo` tool and structure items with the strict checklist format. Prefer machine-readable outputs in `_tool_result`."
- Se o agente gerar tarefas, ele deve sempre preencher o `to_do` via chamada à ferramenta em vez de enviar as tarefas como texto normal.

Regras de versionamento e compatibilidade
----------------------------------------
- Quaisquer alterações ao schema (`to_do` structure, `_tool_result` keys) devem manter compatibilidade retroativa sempre que possível.
- Quando um breaking change for necessário, atualizar versão da ferramenta e documentar migração no README.

Testes e qualidade
------------------
- Cobertura mínima recomendada: casos para cada ação (list/add/complete/remove/render), validação de inputs, idempotência e erros esperados.
- Testes de integração devem validar persistência, concorrência e logs de auditoria.

Limitações e considerações
--------------------------
- A ferramenta foca em listas simples e curtas; para listas muito grandes (milhares de itens) recomenda-se paginação e mecanismos de busca especializados.
- Não é adequada para fluxos de aprovação complexos (multi-stage, com atribuições e dependências) sem extensão do schema.

Exemplos de payloads e respostas
--------------------------------
1) List
Request: { "action": "list", "to_do": ["☐ Write docs"] }
Response:
{
  "to_do": ["☐ Write docs"],
  "_tool_result": {
    "parsed": [{ "index":1, "status":"pending","text":"Write docs" }],
    "render": "1. ☐ Write docs"
  }
}

2) Add
Request: { "action": "add", "item": "Implement validation" }
Response: to_do updated with new item at the end and _tool_result as acima.

3) Complete
Request: { "action":"complete", "index": 1 }
Response: updated to_do with index 1 marked as `🗹 ` and _tool_result parsed accordingly.

4) Remove
Request: { "action":"remove", "index": 2 }
Response: updated to_do without the removed item and removed: "☐ text" returned optionally.

Checklist de regras rápidas (resumo)
------------------------------------
- Sempre usar prefixo `🗹 ` ou `☐ `.
- `action` obrigatório e validado.
- `item` sem prefixo quando usado em `add`.
- `index` 1-based para `complete` e `remove`.
- `todo` considerada safe_tool para operações comuns (list/add/render) — configure confirmação para ações destrutivas.
- Retornar sempre `to_do` e `_tool_result`.
- Log, audit, persistência e testes obrigatórios em ambiente de produção.

---

Versões e histórico
-------------------
- v1.0 — Regras iniciais, esquema `to_do` + `_tool_result`.


Se desejar, posso também:
- Incluir este documento num README.md com exemplos em JSON formatado;
- Registrar uma referência a este ficheiro diretamente no system prompt (prompt_builder) para que o agente cite as regras;
- Gerar testes unitários / de integração e exemplos executáveis.

