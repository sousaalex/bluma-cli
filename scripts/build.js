// scripts/build.js
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path'; // <-- Adicione esta importação
import nodeExternalsPlugin from 'esbuild-plugin-node-externals';

async function main() {
  try {
    await build({
      entryPoints: ['src/main.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: 'dist/main.js',
      plugins: [nodeExternalsPlugin()],
      jsx: 'automatic',
    });

    const outputFile = 'dist/main.js';
    const content = fs.readFileSync(outputFile, 'utf-8');
    fs.writeFileSync(outputFile, `#!/usr/bin/env node\n${content}`);

    // <<< INÍCIO DA NOVA LÓGICA DE CÓPIA >>>
    console.log('Copiando arquivos de configuração...');
    const configSrcDir = 'src/app/agent/config';
    const configDestDir = 'dist/config';

    // Cria o diretório de destino se não existir
    if (!fs.existsSync(configDestDir)) {
      fs.mkdirSync(configDestDir, { recursive: true });
    }

    // Lista os arquivos no diretório de origem
    const configFiles = fs.readdirSync(configSrcDir);

    // Copia cada arquivo
    for (const file of configFiles) {
      const srcFile = path.join(configSrcDir, file);
      const destFile = path.join(configDestDir, file);
      fs.copyFileSync(srcFile, destFile);
      console.log(` - Copiado: ${file}`);
    }
    // <<< FIM DA NOVA LÓGICA DE CÓPIA >>>

    console.log('Build completo com sucesso!');
  } catch (error) {
    console.error('Falha no build:', error);
    process.exit(1);
  }
}

main();