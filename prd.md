Como renderizar Markdown nas respostas de um agente IA que roda no CLI com React Ink
Boa — dá pra fazer e fica muito agradável. Vou te mostrar 3 coisas práticas e prontas pra usar:

Componente MarkdownRenderer (converte Markdown para componentes Ink).

Exemplo de CLI agent que recebe respostas (até em stream) e vai renderizando.

Melhorias úteis: sintaxe colorida em blocos de código, links, listas e streaming incremental.

Abaixo tem um exemplo completo (TypeScript) — instala as dependências indicadas e cola os ficheiros no teu projecto.

Dependências (npm/yarn)
bash
Copiar
Editar
npm install ink react marked cli-highlight chalk
# ou
yarn add ink react marked cli-highlight chalk
MarkdownRenderer.tsx
Um renderer simples que usa marked para tokenizar e converte tokens em componentes Ink (Text, Box). Trata headings, parágrafos, bold/italic, listas e code blocks com cli-highlight.

tsx
Copiar
Editar
// MarkdownRenderer.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { marked } from 'marked';
import { highlight } from 'cli-highlight';
import chalk from 'chalk';

type Props = { markdown: string };

function renderTokens(tokens: marked.Token[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const t = token as marked.Tokens.Heading;
        out.push(
          <Box key={out.length} marginBottom={1}>
            <Text bold underline>
              {`${'#'.repeat(t.depth)} ${t.text}`}
            </Text>
          </Box>
        );
        break;
      }
      case 'paragraph': {
        const p = token as marked.Tokens.Paragraph;
        out.push(
          <Box key={out.length} wrapMargin={1}>
            <Text>{renderInline(p.text)}</Text>
          </Box>
        );
        break;
      }
      case 'list': {
        const l = token as marked.Tokens.List;
        l.items.forEach((item, idx) => {
          // item is of type ListItem
          const text = (item as any).tokens
            ? (item as any).tokens
                .map((t: any) => (t.type === 'text' ? t.text : ''))
                .join('')
            : (item as any).text;
          out.push(
            <Box key={out.length}>
              <Text>{l.ordered ? `${idx + 1}. ` : '• '}</Text>
              <Text>{renderInline(text)}</Text>
            </Box>
          );
        });
        out.push(<Box key={out.length} marginBottom={1} />);
        break;
      }
      case 'code': {
        const c = token as marked.Tokens.Code;
        const highlighted = highlight(c.text, { language: c.lang ?? 'text', ignoreIllegals: true });
        out.push(
          <Box key={out.length} flexDirection="column" marginY={1}>
            <Text>{chalk.inverse(` ${c.lang ?? 'code'} `)}</Text>
            <Box marginTop={0}>
              <Text>{highlighted}</Text>
            </Box>
          </Box>
        );
        break;
      }
      case 'blockquote': {
        const b = token as marked.Tokens.Blockquote;
        out.push(
          <Box key={out.length}>
            <Text italic dimColor>{`> ${b.text}`}</Text>
          </Box>
        );
        break;
      }
      default:
        // fallback: try to stringify
        if ((token as any).text) {
          out.push(<Text key={out.length}>{(token as any).text}</Text>);
        }
    }
  }

  return out;
}

function renderInline(text: string): React.ReactNode {
  // simples: bold **text**, italic *text*, inline code `x`
  const parts: React.ReactNode[] = [];
  let rest = text;
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/;

  while (rest.length) {
    const m = rest.match(regex);
    if (!m) {
      parts.push(rest);
      break;
    }
    const index = m.index ?? 0;
    if (index > 0) parts.push(rest.slice(0, index));
    const token = m[0];
    if (token.startsWith('**')) parts.push(<Text bold key={parts.length}>{m[2]}</Text>);
    else if (token.startsWith('*')) parts.push(<Text italic key={parts.length}>{m[3]}</Text>);
    else if (token.startsWith('`')) parts.push(<Text inverse key={parts.length}>{m[4]}</Text>);
    rest = rest.slice(index + token.length);
  }

  return parts;
}

export const MarkdownRenderer: React.FC<Props> = ({ markdown }) => {
  const tokens = marked.lexer(markdown);
  return <Box flexDirection="column">{renderTokens(tokens)}</Box>;
};
