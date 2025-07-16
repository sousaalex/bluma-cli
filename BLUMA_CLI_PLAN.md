# Plano de Arquitetura — CLI Bluma (inspirado no gemini-cli)

## Objetivo
Criar um CLI chamado `bluma` que, ao ser executado, monta imediatamente a interface interativa (estilo chat/assistente), usando o padrão do gemini-cli como referência.

---

## Estrutura de Diretórios Sugerida
```
bluma-engineer/
│
├── packages/
│   └── cli-bluma/
│       ├── src/
│       │   ├── index.ts      # Entry point do comando 'bluma'
│       │   ├── bluma.tsx     # Monta interface interativa (Ink/React)
│       │   ├── config/       # Configurações e autenticação
│       │   ├── ui/           # Componentes de interface (Ink)
│       │   ├── utils/        # Utilitários gerais
│       │   └── ...           # Lógica de integração, temas, etc.
│       └── package.json      # bin: 'bluma'
│
├── docs/                    # Documentação técnica e de uso
├── scripts/                 # Scripts de build, publish, setup
├── package.json             # Gerenciamento monorepo (workspaces)
└── README.md                # Visão geral do projeto
```

---

## Estratégia de Entry Point e Comando
- O comando `bluma` é registrado no campo `bin` do `package.json` do pacote `cli-bluma`.
- Instalação via `npm install -g ./packages/cli-bluma` torna o comando disponível globalmente.
- O entry point (`index.ts`) importa e executa a função principal (`main()` ou similar) definida em `bluma.tsx`, que monta a interface interativa imediatamente.
- Toda a lógica de UI, autenticação, temas e integrações fica modularizada em subdiretórios.

---

## Tecnologias Recomendadas
- **Node.js + TypeScript**: Base moderna, tipada e multiplataforma.
- **Ink**: Interface CLI interativa com React.
- **Commander.js**: Parsing de argumentos (opcional, se quiser flags).
- **Jest/Vitest**: Testes automatizados.

---

## Fluxo de Build e Publicação
1. Build local com scripts npm (`npm run build`).
2. Instalação global para testes: `npm install -g ./packages/cli-bluma`.
3. Publicação futura no npm se desejado.
4. Documentação centralizada em `/docs` e README do pacote.

---

## Benefícios da Arquitetura Proposta
- Simplicidade: comando único, interface direta ao chamar `bluma`.
- Modularidade interna para fácil manutenção e extensão futura.
- Base sólida para evoluir para múltiplos modos ou integrações sem perder clareza.
- Inspiração comprovada no padrão do gemini-cli.

---

## Próximos Passos Sugeridos
1. Validar se a estrutura atende ao objetivo do CLI único/interativo.
2. Implementar esqueleto inicial dos arquivos principais (`index.ts`, `bluma.tsx`).
3. Definir padrões de UI/UX e integração com serviços externos.
4. Documentar guidelines para manutenção e extensão futura.