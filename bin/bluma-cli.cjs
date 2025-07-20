#!/usr/bin/env node
// Wrapper para BluMa CLI: inicia o frontend React Ink (Node.js)
const { spawn } = require('child_process');
const path = require('path');

// Resolve caminho absoluto do backend
const isWin = process.platform === 'win32';
const backendPath = isWin
  ? path.join(__dirname, '..', 'dist', 'bluma.exe')
  : path.join(__dirname, '..', 'dist', 'bluma');
const sessionId = require('uuid').v4();

// Inicia o backend primeiro
const backendProc = spawn(backendPath, [sessionId], { stdio: 'inherit' });
backendProc.on('error', (err) => {
  console.error('Erro ao iniciar backend:', err);
  process.exit(1);
});
backendProc.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Backend saiu com código ${code}`);
    process.exit(code);
  }
});

// Usa tsx para rodar o frontend (index.tsx)
const cliPath = path.join(__dirname, '..', 'cli', 'index.tsx');
const tsxPath = path.join(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
const args = [sessionId, ...process.argv.slice(2)];

let child;
const tsxBin = process.platform === 'win32'
  ? path.join(__dirname, '..', 'node_modules', '.bin', 'tsx.cmd')
  : path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
if (process.platform === 'win32') {
  child = spawn('cmd.exe', ['/c', tsxBin, cliPath, ...args], { stdio: 'inherit' });
} else {
  child = spawn(tsxBin, [cliPath, ...args], { stdio: 'inherit' });
}
child.on('exit', code => {
  backendProc.kill(); // Garante que o backend morra junto
  process.exit(code);
});
