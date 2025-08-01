import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { calculateEdit, createDiff } from '../src/app/agent/tools/natives/edit';

describe('edit_tool calculateEdit/createDiff', () => {
  const dir = path.join(os.tmpdir(), 'bluma-jest-edit');
  const file = path.join(dir, 'file.txt');

  beforeAll(async () => {
    await fs.mkdir(dir, { recursive: true });
    const content = `Hello
World
`;
    await fs.writeFile(file, content, 'utf-8');
  });

  afterAll(async () => {
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  });

  it('produces new content and a diff for a simple replacement', async () => {
    const oldStr = 'World';
    const newStr = 'Jest';
    const res = await calculateEdit(file, oldStr, newStr, 1);
    expect(res.error === undefined || res.error === null).toBe(true);
    const diff = createDiff(path.basename(file), res.currentContent || '', res.newContent);
    expect(typeof diff).toBe('string');
    expect(diff.length).toBeGreaterThan(10);
    expect(diff).toContain('-World');
    expect(diff).toContain('+Jest');
  });
});