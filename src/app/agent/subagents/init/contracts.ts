// src/app/agent/subagents/init/contracts.ts

// Tipos para input/output do InitSubAgent — expandir conforme necessário
export interface InitInput {
  confirmOverwrite?: boolean;
}

export interface InitOutput {
  success: boolean;
  message?: string;
  files?: string[];
}