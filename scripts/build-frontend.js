// scripts/build-frontend.js (VERSÃO FINAL CORRIGIDA)
import { build } from 'esbuild';
import fs from 'fs';
import nodeExternalsPlugin from 'esbuild-plugin-node-externals';

try {
  await build({
    entryPoints: ['cli/index.tsx'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: 'dist/index.js',
    plugins: [nodeExternalsPlugin()], // <-- 2. Adicione o plugin aqui
    define: {
      'process.env.REACT_DEVTOOLS': JSON.stringify('false'),
    },
    // A opção 'external' não é mais necessária, o plugin cuida disso.
    banner: {
      js: 'globalThis.self = globalThis;',
    },
  });

  // Adicionar shebang manualmente ao arquivo gerado
  const outputFile = 'dist/index.js';
  const content = fs.readFileSync(outputFile, 'utf-8');
  fs.writeFileSync(outputFile, `#!/usr/bin/env node\n${content}`);

  console.log('Compilação do frontend concluída com sucesso!');
} catch (error) {
  console.error('Falha na compilação do frontend:', error);
  process.exit(1);
}