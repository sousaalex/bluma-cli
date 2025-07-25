import { build } from 'esbuild';
import fs from 'fs';
import nodeExternalsPlugin from 'esbuild-plugin-node-externals';

try {
  await build({
    entryPoints: ['src/main.ts'], // <-- Ponto de entrada mudou
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: 'dist/main.js', // <-- Arquivo de saída mudou
    plugins: [nodeExternalsPlugin()],
    // Adicione esta linha para garantir que o React funcione corretamente no bundle
    jsx: 'automatic',
  });

  // Adicionar shebang manualmente
  const outputFile = 'dist/main.js';
  const content = fs.readFileSync(outputFile, 'utf-8');
  fs.writeFileSync(outputFile, `#!/usr/bin/env node\n${content}`);

  console.log('Build completo com sucesso!');
} catch (error) {
  console.error('Falha no build:', error);
  process.exit(1);
}