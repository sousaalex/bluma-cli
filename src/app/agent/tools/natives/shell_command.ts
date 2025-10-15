// src/app/agent/tools/shell_command.ts

import os from 'os';
import { spawn } from 'child_process';
import path from 'path';

interface ShellCommandArgs {
  command: string;
  timeout?: number;
  cwd?: string;
  verbose?: boolean;
}

interface CommandResult {
  status: 'success' | 'error' | 'timeout';
  exitCode: number | null;
  stdout: string;
  stderr: string;
  command: string;
  cwd: string;
  platform: string;
  duration: number;
}

/**
 * Executa comandos shell de forma universal e robusta.
 * Suporta Linux, macOS e Windows com detecção automática do shell apropriado.
 */
export function shellCommand(args: ShellCommandArgs): Promise<string> {
  const {
    command,
    timeout = 300, // 5 minutos por padrão
    cwd = process.cwd(),
    verbose = false
  } = args;

  return new Promise((resolve) => {
    const startTime = Date.now();
    const platform = os.platform();
    
    // Detecta o shell apropriado para o sistema operacional
    let shellCmd: string;
    let shellArgs: string[];

    if (platform === 'win32') {
      // Windows: usa PowerShell ou cmd
      shellCmd = process.env.COMSPEC || 'cmd.exe';
      shellArgs = ['/c', command];
    } else {
      // Linux/macOS: usa bash ou sh
      shellCmd = process.env.SHELL || '/bin/bash';
      shellArgs = ['-c', command];
    }

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let finished = false;

    // Spawn o processo filho
    const childProcess = spawn(shellCmd, shellArgs, {
      cwd: cwd,
      env: process.env,
      // Importante: no Windows, precisamos do shell, mas spawn já lida com isso
      windowsHide: true,
    });

    // Timeout handler
    const timeoutId = setTimeout(() => {
      if (!finished) {
        timedOut = true;
        childProcess.kill('SIGTERM');
        
        // Se não matar em 2s, força com SIGKILL
        setTimeout(() => {
          if (!finished) {
            childProcess.kill('SIGKILL');
          }
        }, 2000);
      }
    }, timeout * 1000);

    // Captura stdout
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    // Captura stderr
    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    // Handle de erros no processo
    childProcess.on('error', (error) => {
      if (!finished) {
        finished = true;
        clearTimeout(timeoutId);
        
        const result: CommandResult = {
          status: 'error',
          exitCode: null,
          stdout: stdout.trim(),
          stderr: `Failed to execute command: ${error.message}`,
          command: command,
          cwd: cwd,
          platform: platform,
          duration: Date.now() - startTime
        };

        resolve(formatResult(result, verbose));
      }
    });

    // Handle de conclusão do processo
    childProcess.on('close', (code, signal) => {
      if (!finished) {
        finished = true;
        clearTimeout(timeoutId);

        const result: CommandResult = {
          status: timedOut ? 'timeout' : (code === 0 ? 'success' : 'error'),
          exitCode: code,
          stdout: stdout.trim(),
          stderr: timedOut 
            ? `Command timed out after ${timeout} seconds\n${stderr.trim()}`
            : stderr.trim(),
          command: command,
          cwd: cwd,
          platform: platform,
          duration: Date.now() - startTime
        };

        resolve(formatResult(result, verbose));
      }
    });
  });
}

/**
 * Formata o resultado para retorno ao agente
 */
function formatResult(result: CommandResult, verbose: boolean): string {
  if (verbose) {
    return JSON.stringify(result, null, 2);
  }

  // Modo conciso: apenas as informações essenciais
  const output: any = {
    status: result.status,
    exitCode: result.exitCode
  };

  if (result.stdout) {
    output.stdout = result.stdout;
  }

  if (result.stderr) {
    output.stderr = result.stderr;
  }

  if (result.status === 'timeout') {
    output.message = `Command exceeded timeout of ${result.duration / 1000}s`;
  }

  return JSON.stringify(output, null, 2);
}

/**
 * Versão helper para comandos que precisam de output em tempo real
 * (útil para npm install, builds longos, etc)
 */
export function shellCommandStreaming(
  command: string,
  cwd: string = process.cwd(),
  onOutput?: (data: string, isError: boolean) => void
): Promise<{ exitCode: number | null; success: boolean }> {
  return new Promise((resolve) => {
    const platform = os.platform();
    let shellCmd: string;
    let shellArgs: string[];

    if (platform === 'win32') {
      shellCmd = process.env.COMSPEC || 'cmd.exe';
      shellArgs = ['/c', command];
    } else {
      shellCmd = process.env.SHELL || '/bin/bash';
      shellArgs = ['-c', command];
    }

    const childProcess = spawn(shellCmd, shellArgs, {
      cwd: cwd,
      env: process.env,
      windowsHide: true,
    });

    if (childProcess.stdout && onOutput) {
      childProcess.stdout.on('data', (data) => {
        onOutput(data.toString(), false);
      });
    }

    if (childProcess.stderr && onOutput) {
      childProcess.stderr.on('data', (data) => {
        onOutput(data.toString(), true);
      });
    }

    childProcess.on('close', (code) => {
      resolve({
        exitCode: code,
        success: code === 0
      });
    });

    childProcess.on('error', (error) => {
      if (onOutput) {
        onOutput(`Error: ${error.message}`, true);
      }
      resolve({
        exitCode: null,
        success: false
      });
    });
  });
}