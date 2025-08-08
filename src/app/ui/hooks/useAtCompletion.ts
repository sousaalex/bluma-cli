import { useEffect, useRef, useState } from "react";
import fs from "fs";
import path from "path";

export interface AtSuggestion {
  label: string; // path shown
  fullPath: string; // absolute
  isDir: boolean;
}

const MAX_RESULTS = 50;
const DEFAULT_RECURSIVE_DEPTH = 2; // when typing just '@', scan depth

function listPathSuggestions(baseDir: string, pattern: string): AtSuggestion[] {
  const raw = pattern || '';
  const patternEndsWithSlash = raw.endsWith('/');
  // trim leading and trailing slashes
  const relDir = raw.replace(/^\/+|\/+$/g, '');
  const filterPrefix = patternEndsWithSlash ? '' : (relDir.split('/').slice(-1)[0] || '');

  const listDir = path.resolve(baseDir, relDir || '.');
  const results: AtSuggestion[] = [];

  const IGNORED_DIRS = ['node_modules', '.git', '.venv', 'dist', 'build'];
  const IGNORED_EXTS = ['.pyc', '.class', '.o', '.map', '.log', '.tmp'];

  function isIgnoredName(name: string) {
    if (!name) return false;
    if (IGNORED_DIRS.includes(name)) return true;
    if (name.startsWith('.')) return true; // hidden
    return false;
  }

  function isIgnoredFile(name: string) {
    if (!name) return false;
    for (const e of IGNORED_EXTS) if (name.endsWith(e)) return true;
    return false;
  }

  function pushEntry(entryPath: string, label: string, isDir: boolean) {
    if (results.length >= MAX_RESULTS) return;
    const clean = label.split(path.sep).join('/').replace(/[]+/g, '');
    results.push({ label: clean + (isDir ? '/' : ''), fullPath: entryPath, isDir });
  }

  try {
    // If user typed just '@' or pattern ends with '/', list the directory (shallow recursive)
    if (raw.length === 0 || patternEndsWithSlash) {
      const queue: { dir: string; depth: number; rel: string }[] = [{ dir: listDir, depth: 0, rel: relDir }];
      while (queue.length && results.length < MAX_RESULTS) {
        const node = queue.shift()!;
        try {
          const entries = fs.readdirSync(node.dir, { withFileTypes: true });
          for (const entry of entries) {
            if (isIgnoredName(entry.name)) continue;
            const entryAbs = path.join(node.dir, entry.name);
            const entryRel = node.rel ? path.posix.join(node.rel, entry.name) : entry.name;
            if (entryRel.split('/').includes('node_modules')) continue;
            if (!entry.isDirectory() && isIgnoredFile(entry.name)) continue;
            pushEntry(entryAbs, entryRel, entry.isDirectory());
            if (entry.isDirectory() && node.depth < DEFAULT_RECURSIVE_DEPTH) {
              queue.push({ dir: entryAbs, depth: node.depth + 1, rel: node.rel ? node.rel + '/' + entry.name : entry.name + '/' });
            }
            if (results.length >= MAX_RESULTS) break;
          }
        } catch (e) {
          // ignore read errors
        }
      }
    } else {
      // otherwise list the directory specified by relDir non-recursively and apply prefix filter
      const entries = fs.readdirSync(listDir, { withFileTypes: true });
      for (const entry of entries) {
        if (filterPrefix && !entry.name.startsWith(filterPrefix)) continue;
        if (isIgnoredName(entry.name)) continue;
        if (!entry.isDirectory() && isIgnoredFile(entry.name)) continue;
        const entryAbs = path.join(listDir, entry.name);
        const label = relDir ? path.posix.join(relDir, entry.name) : entry.name;
        pushEntry(entryAbs, label, entry.isDirectory());
        if (results.length >= MAX_RESULTS) break;
      }
    }
  } catch (e) {
    // swallow
  }

  return results.slice(0, MAX_RESULTS);
}

export interface UseAtCompletionHook {
  open: boolean;
  suggestions: AtSuggestion[];
  selected: number;
  // Accept either a number or a functional updater (like React's setState)
  setSelected: (idx: number | ((prev: number) => number)) => void;
  insertAtSelection: () => void;
  close: () => void;
  update: (txt: string, cursor: number) => void;
}

export function useAtCompletion({ cwd, text,
 cursorPosition, setText }:{ cwd:string, text:string, cursorPosition:number, setText:(t:string, pos?: number)=>void }): UseAtCompletionHook {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [suggestions, setSuggestions] = useState<AtSuggestion[]>([]);
  const lastQuery = useRef("");

  // Detect pattern @... perto do cursor
  function scanForAt(text:string, pos:number): { pattern:string|null, insertStart:number } {
    const before = text.slice(0, pos);
    const m = before.match(/@([\w\/.\-_]*)$/);
    if (!m) return { pattern:null, insertStart:-1 };
    return { pattern:m[1] || '', insertStart:m.index!+1 };
  }

  function update(newText:string, newCursor:number) {
    const res = scanForAt(newText, newCursor);
    if (res.pattern!==null && res.pattern.length>=0) {
      setOpen(true);
      // Inform global flag that @autocomplete is open so the input buffer won't auto-submit on Enter
      (globalThis as any).__BLUMA_AT_OPEN__ = true;
      const suggs = listPathSuggestions(cwd, res.pattern);
      setSuggestions(suggs);
      setSelected(0);
      lastQuery.current = res.pattern;
    } else {
      setOpen(false);
      (globalThis as any).__BLUMA_AT_OPEN__ = false;
      setSuggestions([]);
    }
  }
  useEffect(()=>{ update(text, cursorPosition); }, [text, cursorPosition, cwd]);

  function insertAtSelection() {
    if (!open || !suggestions[selected]) return;
    const res = scanForAt(text, cursorPosition);
    if(!res || res.insertStart<0) return;
    let chosen = suggestions[selected].label;
    const isDir = suggestions[selected].isDir;
    // normalize chosen to POSIX and strip control chars
chosen = chosen.replace(/\\/g, '/').replace(/\|/g, '');

    // If chosen contains parent segments (e.g. 'src/app'), we only want the final segment for insertion
    let insertVal = chosen;
    if (insertVal.includes('/')) {
      // remove any trailing slash for segment extraction
      insertVal = insertVal.replace(/\/+$/g, '');
      const parts = insertVal.split('/');
      insertVal = parts[parts.length - 1];
    }
    // Ensure directories end with '/'
    if (isDir && !insertVal.endsWith('/')) insertVal = insertVal + '/';

    // Replace only the current segment (text after the last '/' in the @pattern)
    const pattern = res.pattern || '';
    const lastSlash = pattern.lastIndexOf('/');
    const segmentOffset = lastSlash >= 0 ? lastSlash + 1 : 0; // number of chars into pattern where current segment starts
    const segmentStart = res.insertStart + segmentOffset; // absolute index in text where segment starts
    const before = text.slice(0, segmentStart);
    const after = text.slice(cursorPosition);
    const newText = before + insertVal + after;
    // Move cursor to end of inserted text (setText moveCursorToEnd = true)
    setText(newText + (isDir ? '' : ' '), true); // se arquivo, insere espaço após, se dir, só path
    if (isDir) {
      setOpen(false); setSuggestions([]);
      setTimeout(() => {
        setOpen(true);
        update(newText, newText.length); // sempre cursor no final após inserir dir
      }, 0);
    } else { // arquivo
      setOpen(false);
      setSuggestions([]);
    }
  }
  function close() {
    setOpen(false);
    setSuggestions([]);
  }
  return { open, suggestions, selected, setSelected, insertAtSelection, close, update };
}