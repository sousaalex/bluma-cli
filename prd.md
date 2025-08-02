# PRD — Funcionalidade `/init` no CLI BluMa

## Nome da Funcionalidade
`/init` — Mapeamento e Inicialização do Projeto com BluMa

## Objetivo
Permitir que o utilizador inicialize a inteligência contextual do agente BluMa através do comando `/init`.  
Ao ser executado, o agente deve mapear completamente o codebase do projeto atual, gerar um ficheiro `BluMa.md` e preparar-se para operar com base nesse contexto.

## Descrição Funcional
Quando o utilizador digita ou seleciona o comando `/init`, o CLI deve enviar uma requisição para `agent.ts`, que irá acionar uma nova capacidade do agente:

> **"Run /init to create a BluMa.md file with instructions for BluMa."**

Essa capacidade consiste em:

1. **Mapeamento Completo da Codebase do Utilizador:**
   - Diretórios e subdiretórios
   - Ficheiros por linguagem (ex: `.ts`, `.tsx`, `.json`, `.env`)
   - Stack tecnológica inferida (ex: React, Next.js, Tailwind, Prisma, etc.)
   - Principais entradas (`main`, `index`, `app`)
   - Frameworks e bibliotecas detectadas via `package.json`, `requirements.txt`, etc.

2. **Análise Estrutural e Semântica:**
   - Diagrama de classes (quando aplicável)
   - Relação entre módulos, dependências, ficheiros
   - Inferência de arquitetura (ex: MVC, Microservices, Monólito, etc.)
   - Detecção de scripts ou comandos úteis

3. **Geração do Ficheiro `BluMa.md`:**
   Um ficheiro Markdown contendo:
   - Título do projeto
   - Stack identificada
   - Estrutura de diretórios comentada
   - Lista de comandos úteis
   - Diagrama lógico (texto ou link para imagem)
   - Regras de operação específicas para BluMa
   - Sugestões automáticas de melhorias (opcional)

## Gatilho
- Comando `/init` no CLI
- Pode ser digitado manualmente ou selecionado via UI

## Fluxo Esperado

1. Utilizador digita `/init` no CLI
2. CLI envia requisição para `agent.ts` com o comando `/init`
3. `agent.ts` invoca a funcionalidade `handleInitMapping()`que será um funcinalidade que esara dentro a startar o turno do agente 
4. Agente:
   - Lê a estrutura do projeto
   - Gera o conteúdo detalhado do ficheiro `BluMa.md`
   - Escreve o ficheiro no diretório raiz do projeto
   - Confirma visualmente no CLI: `"BluMa.md criado com sucesso."`

## Considerações Técnicas
- O agente deve ter permissões para leitura de todo o diretório do projeto
- O ficheiro `BluMa.md` não deve sobrescrever versões anteriores sem confirmação
- O conteúdo do ficheiro deve ser reutilizável em futuras execuções
- A funcionalidade deve ser modular para futura expansão (ex: integração com GPT para validação de arquitetura, geração de documentação, etc.)

## Exemplo de Resposta do CLI
```
/init detected.
Mapping project structure...
BluMa.md created successfully. View the internal context file to see how BluMa will operate.
```

## Critérios de Aceitação

- [ ] O comando `/init` gera o ficheiro `BluMa.md`
- [ ] A estrutura do projeto é lida e mapeada corretamente
- [ ] O ficheiro inclui stack, estrutura, relacionamentos e comandos
- [ ] O CLI confirma a execução sem erros
- [ ] O ficheiro é reutilizável por BluMa em futuras execuções

