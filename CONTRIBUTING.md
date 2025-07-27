# Contribuindo para BluMa CLI

Primeiro, obrigado por querer melhorar o BluMa CLI!
Aqui estão algumas diretrizes para acelerar seu fluxo e manter o projeto saudável.

## Sumário
- [Como contribuir](#como-contribuir)
- [Como abrir um issue](#como-abrir-um-issue)
- [Como abrir um Pull Request (PR)](#como-abrir-um-pull-request-pr)
- [Style Guide](#style-guide)
- [Dicas de setup local](#dicas-de-setup-local)
- [Revisão de código e merges](#revisao-de-codigo-e-merges)
- [Comunicação e Etiqueta](#comunicacao-e-etiqueta)

---

## Como contribuir

1. **Fork o repositório** e crie uma branch para sua feature/correção (`feature/nome-da-feature` ou `fix/descrição`)
2. Configure e rode localmente (veja [Dicas de Setup Local](#dicas-de-setup-local))
3. Teste suas alterações em ambientes e plataformas diferentes, se possível
4. Escreva testes e documentação sempre que adicionar algo significativo
5. Abra o PR contra o branch principal

## Como abrir um issue
- Reporte bugs com o máximo de contexto, prints, passos para reproduzir e ambiente
- Sugira features claras, com exemplos de uso
- Perguntas e discussões abertas são bem-vindas; só evite SPAM

## Como abrir um Pull Request (PR)
- Pré-requisito: código buildando e sem lint errors
- Respeite a convenção de nomes e mensagens de commit limpas
- Explique o que resolveu/criou, cite o issue se aplicável
- Use PRs “pequenos” e objetivos; grandes batches são desencorajados

## Style Guide
- **Use inglês** para código, comentários técnicos e mensagens de commit
- Respeite a tabulação do projeto (2 espaços)
- Prefira TypeScript e React moderno (`react-jsx`), siga o padrão Ink para CLI
- Não adicione libs sem discutir no issue/PR ou consenso
- Comente partes complexas
- Exporte funções e componentes via default/export {} quando faz sentido

## Dicas de setup local
```bash
npm install
npm run build # ou npm start
# Certifique-se de instalar dependências globais como descrito no README.md
```
Para colaboração:
- Garanta uso de Node.js recomendado no README
- Teste em sistemas Unix e Windows se sua alteração for de infraestrutura/caminhos
- Veja os scripts em package.json e build.js para helpers e automações

## Revisão de código e merges
- Todos PRs precisam de revisão por pelo menos outro colaborador (ou owner)
- PRs sem revisão >5 dias podem ser fechados (salvo exceção aberta)
- Bugs críticos têm prioridade máxima
- Nunca force-push na main/master - use pull requests!

## Comunicação e Etiqueta
- Seja respeitoso, direto, paciente
- Use linguagem construtiva na discussão de PR/issue
- Ao discordar, proponha alternativa técnica justificando
- Todos são bem-vindos a opinar, contribua inclusive revisando!

---

BluMa CLI agradece sua colaboração!
Para dúvidas técnicas, crie um issue. Para bugs "graves" email/tags rápidas ao owner. Quebre código, evolua, hackeie - mas sempre pensando no coletivo.