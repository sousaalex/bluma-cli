// scripts/session_stress_test.js
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { saveSessionHistory } from '../dist/app/agent/session_manger/session_manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const sessionDir = path.join(os.tmpdir(), 'bluma-session-stress');
  const sessionFile = path.join(sessionDir, 'stress-session.json');
  const historyBase = [{ role: 'system', content: 'stress test' }];

  // ensure dir
  const fs = await import('fs/promises');
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(sessionFile, JSON.stringify({ session_id: 'stress', created_at: new Date().toISOString(), conversation_history: [] }, null, 2));

  const tasks = [];
  const total = 200;
  for (let i = 0; i < total; i++) {
    tasks.push(
      saveSessionHistory(sessionFile, [...historyBase, { role: 'user', content: `msg-${i}` }]).catch(err => ({ err, i }))
    );
  }

  const results = await Promise.all(tasks);
  const errors = results.filter(r => r && r.err);

  if (errors.length > 0) {
    console.error(`Stress test completed with ${errors.length} errors.`);
    for (const e of errors.slice(0, 5)) {
      console.error(`#${e.i}:`, e.err?.code || e.err?.message || e.err);
    }
    process.exitCode = 1;
  } else {
    console.log('Stress test passed with 0 errors.');
  }
}

run().catch(e => {
  console.error('Unexpected error in stress test:', e);
  process.exitCode = 2;
});