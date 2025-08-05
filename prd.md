# PRD — Arquitetura BluMa Core + SubAgentes e Funcionalidade `/init`

## Visão Geral
Estabelecer a arquitetura do agente BluMa como um Core orquestrador estável (BluMa) com SubAgentes plugáveis, cada um especializado em uma tarefa, com system prompt próprio e ciclo de turnos isolado. A primeira capacidade a usar essa arquitetura será o comando `/init`, delegado ao SubAgente de Inicialização (InitSubAgent), responsável por mapear a codebase e gerar o ficheiro `BluMa.md`.

## Objetivos
- Definir um Core (agent.ts) minimalista, imutável e extensível por registry de subagentes.
- Permitir adicionar novos SubAgentes sem modificar o Core.
- Delegar `/init` ao InitSubAgent, com prompt e política próprios.
- Produzir `BluMa.md` com contexto do projeto, de forma não destrutiva (sem sobrescrita silenciosa).

## Escopo
- Arquitetura de orquestração e plugabilidade de SubAgentes.
- SubAgente inicial: InitSubAgent.
- Integração do comando `/init` no CLI/roteador do Core.

## Arquitetura
### Componentes
- Core (BluMa)
  - `agent.ts`: orquestrador estável, roteia comandos para SubAgentes, injeta contexto comum, não contém lógica de domínio.
  - `core/`: utilitários, processamento de turnos e políticas do BluMa.
- SubAgentes
  - Localização: `src/app/agent/subagents/<nome>/`
  - Estrutura típica:
    - `system_prompt.md`: prompt dedicado do subagente
    - `<nome>_subagent.ts`: implementação da interface SubAgent
    - `contracts.ts`: tipos de Input/Output e opções
    - `mappers/`, `generators/`: lógica específica por domínio do subagente
- Registry/DI
  - `src/app/agent/subagents/registry.ts` com API para registro e recuperação por capacidade/comando.

### Interfaces e Contratos
- SubAgent
  - `id: string`
  - `capabilities: string[]` (ex.: ["/init"])
  - `execute(input: TInput, ctx: OrchestrationContext): Promise<TOutput>`
- OrchestrationContext
  - `projectRoot: string`
  - `fsOps`, `toolInvoker`, `messageBus`, `logger`, `policy`
- CommandRouter (no Core)
  - Resolve comando → SubAgente por `capabilities` (prefixo `/`).
  - Fallback amigável quando capacidade não existe.

## SubAgente `/init` (InitSubAgent)
### Objetivo
Mapear codebase, inferir stack e gerar `BluMa.md` com contexto operacional para o BluMa.

### Funcionalidades
1) Mapeamento da codebase
   - Diretórios/subdiretórios com ignores (node_modules, build, out, .git, etc.).
   - Classificação por tipos de ficheiro (ts, tsx, js, json, env, md, yaml, etc.).
   - Inferência de stack via manifestos (package.json, requirements.txt, etc.).
   - Identificação de entradas (main/index/app) e scripts.
2) Análise estrutural/semântica
   - Relações entre módulos e dependências.
   - Heurísticas de arquitetura (React, Next.js, Tailwind, Prisma, etc.).
   - Detecção de comandos úteis.
3) Geração do `BluMa.md`
   - Título do projeto
   - Stack identificada
   - Estrutura de diretórios comentada (árvore resumida)
   - Lista de comandos úteis
   - Diagrama lógico textual (opcional)
   - Regras de operação para o BluMa
   - Sugestões automáticas (opcional)

### Fluxo `/init`
1. CLI envia `/init` → Core `agent.ts`.
2. Core consulta `SubAgentRegistry` pela capacidade `/init`.
3. Core instancia/obtém `InitSubAgent` e injeta `OrchestrationContext`.
4. `InitSubAgent.execute` mapeia, analisa e produz conteúdo do `BluMa.md`.
5. Core aplica política de escrita (confirmar overwrite quando necessário) e salva o `BluMa.md` tanto no diretório raiz do projeto quanto no diretório oculto `.bluma/` (ou equivalente no projeto).
6. Core confirma no CLI: "BluMa.md criado com sucesso nos dois destinos." (ou mensagens de aviso/erro).

## Considerações Técnicas
- Não sobrescrever `BluMa.md` sem confirmação (usar opção `--force` ou prompt interativo).
- Performance: limitar profundidade e ignorar diretórios pesados; operações IO eficientes.
- Portabilidade: compatível com Windows/Mac/Linux; paths e encodings corretos.
- Modularidade: subagentes independentes, versionáveis e testáveis isoladamente.
- Segurança: políticas por subagente (escopo de ferramentas e acesso a FS).

## Diretórios e Estrutura (proposta)
```
src/app/agent/
  agent.ts                 # Core orquestrador (estável)
  core/                    # Políticas e utilitários do BluMa
  modules/                 # (façades finas, se necessário)
  subagents/
    registry.ts            # Registro e DI de subagentes
    init/
      system_prompt.md     # Prompt do InitSubAgent
      init_subagent.ts     # Implementação do subagente
      contracts.ts         # Tipos de Input/Output
      mappers/             # Mapeadores/heurísticas
      generators/          # Geração de BluMa.md, diagramas
```

## Exemplo de Resposta do CLI
```
/init detected.
Mapping project structure...
BluMa.md created successfully. View the internal context file to see how BluMa will operate.
```

## Critérios de Aceitação — Arquitetura
- [ ] `agent.ts` atua como Core orquestrador estável, sem lógica de domínio.
- [ ] Existe `SubAgentRegistry` permitindo registrar/obter subagentes por capacidades.
- [ ] SubAgentes implementam a interface `SubAgent` e possuem `system_prompt.md` próprio.
- [ ] É possível adicionar um novo SubAgente sem alterar `agent.ts`.

## Critérios de Aceitação — `/init`
- [ ] O comando `/init` delega ao `InitSubAgent`.
- [ ] O `InitSubAgent` gera `BluMa.md`.
- [ ] A estrutura do projeto é lida e mapeada corretamente.
- [ ] O ficheiro inclui stack, estrutura, relacionamentos e comandos.
- [ ] O CLI confirma a execução sem erros.
- [ ] O ficheiro é reutilizável por BluMa em futuras execuções.
