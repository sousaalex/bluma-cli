import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { loadOrcreateSession, saveSessionHistory } from '../src/app/agent/session_manger/session_manager';

const TEST_SESSION_ID = 'jest-session-test';

describe('session_manager safe save', () => {
  const tempRoot = path.join(os.tmpdir(), 'bluma-jest');
  const sessionFile = path.join(tempRoot, `${TEST_SESSION_ID}.json`);

  beforeAll(async () => {
    await fs.mkdir(tempRoot, { recursive: true });
  });

  afterAll(async () => {
    try { await fs.rm(tempRoot, { recursive: true, force: true }); } catch {}
  });

  it('creates or loads and saves without throwing', async () => {
    const [file, history0] = await loadOrcreateSession(TEST_SESSION_ID);
    expect(file.endsWith(`${TEST_SESSION_ID}.json`)).toBe(true);
    expect(Array.isArray(history0)).toBe(true);

    const newHistory = [
      { role: 'system', content: 'hello' },
      { role: 'developer', content: 'world' },
    ];
    await saveSessionHistory(file, newHistory);

    const raw = await fs.readFile(file, 'utf-8');
    const data = JSON.parse(raw);
    expect(data.conversation_history.length).toBe(2);
    expect(data.conversation_history[1].content).toBe('world');
  });
});