// scripts/session_stress_isolated.js
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

async function safeRenameWithRetry(src, dest, maxRetries = 6) {
  let attempt = 0;
  let lastErr;
  const isWin = process.platform === 'win32';
  while (attempt <= maxRetries) {
    try {
      await fs.rename(src, dest);
      return;
    } catch (e) {
      lastErr = e;
      const code = (e && e.code) || '';
      const transient = code === 'EPERM' || code === 'EBUSY' || code === 'ENOTEMPTY' || code === 'EACCES';
      if (!(isWin && transient) || attempt === maxRetries) break;
      const backoff = Math.min(1000, 50 * Math.pow(2, attempt));
      await new Promise(r => setTimeout(r, backoff));
      attempt++;
    }
  }
  // Fallback copy+unlink
  const data = await fs.readFile(src);
  await fs.writeFile(dest, data);
  await fs.unlink(src).catch(() => {});
}

async function saveSessionHistory(sessionFile, history) {
  const sessionData = {
    session_id: 'stress',
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    conversation_history: history,
  };
  const temp = `${sessionFile}.${Date.now()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(sessionData, null, 2), 'utf-8');
  await safeRenameWithRetry(temp, sessionFile);
}

async function run() {
  const sessionDir = path.join(os.tmpdir(), 'bluma-session-stress');
  const sessionFile = path.join(sessionDir, 'stress-session.json');
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(sessionFile, JSON.stringify({}), 'utf-8').catch(() => {});

  const base = [{ role: 'system', content: 'stress' }];
  const total = 200;
  const tasks = [];
  for (let i = 0; i < total; i++) {
    tasks.push(saveSessionHistory(sessionFile, [...base, { role: 'user', content: `m-${i}` }]).catch(err => ({ err, i })));
  }
  const results = await Promise.all(tasks);
  const errors = results.filter(x => x && x.err);
  if (errors.length) {
    console.error(`Isolated stress test completed with ${errors.length} errors.`);
    for (const e of errors.slice(0, 5)) {
      console.error(`#${e.i}:`, e.err?.code || e.err?.message || e.err);
    }
    process.exitCode = 1;
  } else {
    console.log('Isolated stress test passed with 0 errors.');
  }
}

run().catch(e => {
  console.error('Unexpected error:', e);
  process.exitCode = 2;
});