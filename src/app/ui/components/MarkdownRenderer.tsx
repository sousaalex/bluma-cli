/**
 * Componente MarkdownRenderer
 * ----------------------------
 * Este componente usa a biblioteca Ink (React para CLI) para renderizar
 * conteúdo Markdown formatado diretamente no terminal.
 * - Usa `marked` para parsear markdown em tokens.
 * - Usa `chalk` e `cli-highlight` para aplicar cores e destaque de sintaxe.
 * - Implementa renderização personalizada para cada tipo de elemento (heading, list, code, table, etc.).
 * - Suporta formatação inline básica (negrito, itálico, código e links).
 */
// Importa o React para criar componentes funcionais do Ink
import React from "react";
import { Box, Text } from "ink";
import { marked } from "marked";
import { highlight } from "cli-highlight";
import chalk from "chalk";

type Props = { markdown: string };

/**
 * Converte tokens de nível de bloco do markdown para componentes React Ink.
 * Para cada tipo de token (heading, paragraph, list, etc.) renderiza com estilo próprio.
 */
function renderTokens(tokens: any[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const t = token as any;
        const colors: Record<number, (text: string) => string> = {
          1: chalk.bold.hex("#0969da"), // Azul GitHub
          2: chalk.bold.hex("#1a7f37"), // Verde suave
          3: chalk.bold.hex("#8250df"), // Roxo
          4: chalk.bold.hex("#cf222e"), // Vermelho
          5: chalk.bold.hex("#9a6700"), // Amarelo escuro
          6: chalk.bold.hex("#57606a"), // Cinza
        };
        out.push(
          <Box key={out.length} marginBottom={1}>
            <Text>{colors[t.depth](`# ${t.text}`)}</Text>
          </Box>
        );
        break;
      }

      case "paragraph": {
        const p = token as any;
        out.push(
          <Box key={out.length} marginBottom={1} flexDirection="row">
            {renderInline(p.text)}
          </Box>
        );
        break;
      }

      case "list": {
        const l = token as any;
        l.items.forEach((item: any, idx: number) => {
          const text = (item as any).tokens
            ? (item as any).tokens
                .map((t: any) => (t.type === "text" ? t.text : ""))
                .join("")
            : (item as any).text;
          out.push(
            <Box key={out.length} paddingLeft={2}>
              <Text color="white">{l.ordered ? `${idx + 1}.` : "•"}</Text>
              <Text> {renderInline(text)}</Text>
            </Box>
          );
        });
        out.push(<Box key={out.length} marginBottom={1} />);
        break;
      }

      case "code": {
        const c = token as any;
        const highlighted = highlight(c.text, {
          language: c.lang ?? "text",
          ignoreIllegals: true,
        });
        out.push(
          <Box
            key={out.length}
            flexDirection="column"
            borderStyle="round"
            borderColor="gray"
          >
            <Box marginBottom={1}>
              <Text bold color="cyan">
                {c.lang ?? "code"}
              </Text>
            </Box>
            <Box>
              <Text>{highlighted}</Text>
            </Box>
          </Box>
        );
        break;
      }

      case "blockquote": {
        const b = token as any;
        out.push(
          <Box key={out.length} flexDirection="row">
            <Text color="#0969da">│ </Text>
            <Text dimColor italic>
              {b.text}
            </Text>
          </Box>
        );
        break;
      }

      case "table": {
        const table = token as any;
        // Render header
        const headerCells = table.header.map((cell: any) =>
          chalk.bold(cell.text)
        );
        out.push(
          <Box key={out.length} flexDirection="row">
            {headerCells.map((h: string, i: number) => (
              <Box key={i} paddingRight={2}>
                <Text>{h}</Text>
              </Box>
            ))}
          </Box>
        );
        // Render rows
        table.rows.forEach((row: any) => {
          out.push(
            <Box key={out.length} flexDirection="row">
              {row.map((cell: any, i: number) => (
                <Box key={i} paddingRight={2}>
                  <Text>{cell.text}</Text>
                </Box>
              ))}
            </Box>
          );
        });
        out.push(<Box key={out.length} marginBottom={1} />);
        break;
      }

      default:
        if ((token as any).text) {
          out.push(<Text key={out.length}>{(token as any).text}</Text>);
        }
    }
  }

  return out;
}

// Função para processar e aplicar formatação inline (negrito, itálico, código, links)
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let rest = text;
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/;

  while (rest.length) {
    const m = rest.match(regex);
    if (!m) {
      parts.push(<Text key={parts.length}>{rest}</Text>);
      break;
    }
    const index = m.index ?? 0;
    if (index > 0)
      parts.push(<Text key={parts.length}>{rest.slice(0, index)}</Text>);
    const token = m[0];

    if (token.startsWith("**")) {
      parts.push(
        <Text bold key={parts.length}>
          {m[2]}
        </Text>
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <Text italic key={parts.length}>
          {m[3]}
        </Text>
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <Text key={parts.length}>
          <Text backgroundColor="#eaeef2" color="black">
            {` ${m[4]} `}
          </Text>
        </Text>
      );
    } else if (token.startsWith("[")) {
      parts.push(
        <Text underline color="#0969da" key={parts.length}>
          {m[5]} ({m[6]})
        </Text>
      );
    }

    rest = rest.slice(index + token.length);
  }

  return parts;
}

// Componente principal que recebe a string markdown e a processa.
// Ele converte o markdown em tokens usando `marked.lexer`
// e depois passa esses tokens para a função `renderTokens` para renderização detalhada.
export const MarkdownRenderer: React.FC<Props> = ({ markdown }) => {
  const tokens = marked.lexer(markdown);
  return <Box flexDirection="column">{renderTokens(tokens)}</Box>;
};
