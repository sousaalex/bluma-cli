# PRD: Busca Inteligente de Arquivos/Diretórios pelo prefixo "@" na BluMa CLI

## Visão Geral e Objetivo
Adicionar na BluMa CLI a capacidade de:
- Detectar e sugerir caminhos de arquivos/diretórios quando o usuário digita "@..." nos prompts.
- Completar automaticamente nomes (autocompletar tipo shell/IDE).
- Ler conteúdo de arquivos/pastas referenciados (quando apropriado) para uso pelo agente ou ferramentas.
- Integrar sugestões à UI de prompt CLI.

## Motivação
Facilitar workflows técnicos, permitindo referenciar rapidamente arquivos/diretórios no contexto de automações, edição, navegação ou instruções ao agente. Inspiração em experiências TUI/IDE e concorrentes (gemini-cli).

## Funcionalidades/Requisitos
1. **Parsing de Input:**
    - Parsear comandos/inputs para identificar tokens iniciados por "@".
    - Suportar múltiplos "@" no mesmo input e tratar escaping (ex: `\@`).

2. **Autocomplete & Sugestões:**
    - Ao digitar "@", abrir sugestões de arquivos/diretórios relativos ao CWD/projeto.
    - Filtrar sugestões dinamicamente conforme typing (ex: `@src/a` exibe `src/app/agent` etc).
    - Diferenciar visualmente arquivos de diretórios.
    - Atalhos/teclas para navegar e completar sugestão.

3. **Resolução e Leitura:**
    - Ao submeter input que contém "@algum/arquivo.txt" ou diretório, resolver o path.
    - Quando apropriado, ler e mostrar/resumir conteúdo (até um limite), ou passar para o agente.
    - Gerenciar erros: path inexistente, permissionamento, path inválido, etc.

4. **Integração CLI/UI:**
    - Integrar componente de sugestões/autocomplete na UI do input (Ink/React).
    - Comportamento fluido: não bloquear navegação nem digitação.
    - Feedback visual de loading/busca, além de erros claros.

5. **Testes e Cobertura:**
    - Testes de parsing.
    - Testes de sugestões e navegação/autocomplete.
    - Testes no fluxo principal (envio input + leitura de arquivos).

## Macro Etapas de Implementação
1. **Parsing e Identificação de tokens @...:**
    - Criar função pura para processar/parsing do input (testável isolado).
    - Identificar todos @path válidos, tratar múltiplos por string e escapes.

2. **Autocomplete/sugestão inteligente:**
    - Criar hook (por exemplo: `useAtCompletion`) que monitora input e dispara busca/localização de arquivos em tempo real.
    - Gerar sugestões baseadas no conteúdo do diretório e substring digitada. Suportar navegação.
    - Exibir sugestões Inline (Ink/React Component) com diferenciação de tipo (file/dir).

3. **Resolução/Leitura de paths:**
    - Adaptar core/tool para, ao submeter input, identificar quais paths precisam ser lidos/carregados.
    - Invocar read-file/read-dir conforme tipo e propagar conteúdo/lidar com limites (tamanho, binários).
    - Integrar fallback para erros de permissão, inexistência, etc.

4. **Integração à UI principal:**
    - Acoplar componente de autocomplete ao prompt principal.
    - Suporte à navegação de sugestões e confirmação (teclas, mouse opcional).

5. **Testes e Validação:**
    - Cobrir: parsing, sugestões, integration com envio de input, corner cases (vários @, paths inválidos, etc).
    - Testes E2E CLI.

## Critérios de Aceite
- Sugestões e autocomplete por @ funcionam em toda CLI independentemente do comando.
- Tratamento robusto de erros e de múltiplos paths.
- Facilidade de navegação/UX semelhante a TUI/IDEs modernas.
- Cobertura de parsing/sugestão mínima de 90% em testes.

---
> **Referência para arquitetura: gemini-cli `atCommandProcessor.ts` & `useAtCompletion.ts`.