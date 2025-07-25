// src/app/agent/tools/shell_command.ts

import os from 'os';
import { exec, ExecException } from 'child_process';

// --- Tipos e Interfaces ---
// Definir interfaces claras para os argumentos de entrada e os dados de saída
// torna a ferramenta previsível e mais fácil para o LLM (e para os humanos) usar.

/**
 * Define a estrutura dos argumentos que a função `shellCommand` aceita.
 */
interface ShellCommandArgs {
  command: string;
  timeout?: number;
  cwd?: string;
  verbose?: boolean;
}

/**
 * Define a estrutura do resultado de uma única tentativa de execução.
 */
interface CommandResult {
  method: string;
  status: 'Success' | 'Error' | 'Timeout';
  code?: number | null; // Código de saída do processo
  output?: string;      // Saída padrão (stdout)
  error?: string;       // Saída de erro (stderr) ou mensagem de erro da execução
}

/**
 * Define a estrutura do relatório completo, usado no modo 'verbose'.
 */
interface Report {
  platform: string;
  command: string;
  cwd: string;
  env?: { [key: string]: string };
  results: CommandResult[];
}

/**
 * Executa um comando de terminal de forma robusta e assíncrona.
 * Esta função foi projetada para ser segura, capturando todos os resultados e erros
 * em um formato JSON estruturado, sem travar a aplicação principal.
 *
 * @param args - Objeto com os parâmetros da função.
 * @param args.command - Comando a executar (ex: 'npm install', 'git pull').
 * @param args.timeout - Tempo máximo de execução em segundos (default: 20).
 * @param args.cwd - Diretório onde executar o comando (default: atual).
 * @param args.verbose - Se True, retorna um relatório detalhado; se False, só o resultado principal.
 * @returns Uma Promise que resolve para uma string JSON com o resultado da execução.
 */
export function shellCommand(args: ShellCommandArgs): Promise<string> {
  // Desestruturação dos argumentos com valores padrão para torná-los opcionais.
  const { command, timeout = 20, cwd = process.cwd(), verbose = false } = args;

  // Envolvemos toda a lógica em uma Promise. Isso é essencial para lidar com
  // a natureza assíncrona de `child_process.exec`. A função retornará
  // imediatamente esta Promise, e o código que a chamou pode usar `await`
  // para esperar pela sua resolução (quando o comando terminar).
  return new Promise((resolve) => {
    // Prepara o objeto de relatório que será preenchido.
    const report: Report = {
      platform: os.platform(), // Coleta o sistema operacional (ex: 'win32', 'linux')
      command: command,
      cwd: cwd,
      results: [],
    };

    // Se o modo verboso estiver ativado, coleta algumas variáveis de ambiente úteis para depuração.
    if (verbose) {
      report.env = {
        PATH: process.env.PATH || "NOT SET",
        ComSpec: process.env.ComSpec || "NOT SET", // Específico do Windows, útil para saber qual cmd está sendo usado
      };
    }

    // `child_process.exec` é a função principal. Ela cria um novo processo de shell
    // e executa o comando dentro dele. Isso é poderoso, pois permite o uso de
    // pipes (`|`), redirecionamentos (`>`), e outras funcionalidades do shell.
    const childProcess = exec(
      command,
      {
        // O diretório de trabalho para o comando.
        cwd: cwd,
        // O timeout em milissegundos. Se o comando exceder este tempo, ele será encerrado.
        timeout: timeout * 1000,
        // A opção `shell` foi removida, pois `exec` usa o shell por padrão.
        // Especificar a codificação garante que a saída seja tratada como texto UTF-8.
        encoding: 'utf-8',
      },
      // Este é o callback que será executado QUANDO o processo filho terminar,
      // seja por sucesso, erro ou timeout.
      (error: ExecException | null, stdout: string, stderr: string) => {
        
        // Prepara o objeto de resultado com as informações do processo finalizado.
        const result: CommandResult = {
          method: 'child_process.exec',
          status: 'Success',
          // Se `error` existir, ele contém o código de saída. Caso contrário, o código é 0 (sucesso).
          code: error ? error.code || null : 0,
          // Limpa espaços em branco do início e fim das saídas.
          output: stdout.trim(),
          error: stderr.trim(),
        };

        // Se o objeto `error` não for nulo, algo deu errado.
        if (error) {
          // A propriedade `killed` é `true` se o processo foi encerrado pelo timeout.
          if (error.killed) {
            result.status = 'Timeout';
            // Concatena a mensagem de timeout com qualquer saída de erro que possa ter sido gerada.
            result.error = `Command exceeded timeout of ${timeout} seconds. ${stderr.trim()}`.trim();
          } else {
            // Se não foi timeout, foi um erro de execução (ex: comando não encontrado, permissão negada).
            result.status = 'Error';
            // Concatena a mensagem de erro principal com a saída de erro padrão.
            result.error = `${error.message}\n${stderr.trim()}`.trim();
          }
        }
        
        // Decide o que retornar com base na flag 'verbose'.
        if (verbose) {
          // No modo verboso, adiciona o resultado ao relatório completo.
          report.results.push(result);
          // Resolve a Promise com o relatório completo, formatado para leitura humana.
          resolve(JSON.stringify(report, null, 2));
        } else {
          // No modo normal, resolve a Promise apenas com o resultado da execução.
          resolve(JSON.stringify(result, null, 2));
        }
      }
    );
  });
}