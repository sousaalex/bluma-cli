import { useEffect, useRef, useState } from "react";
import fs from "fs";
import path from "path";

export interface AtSuggestion {
  label: string; // path shown
  fullPath: string; // absolute
  isDir: boolean;
}

const MAX_RESULTS = 10;

function listPathSuggestions(baseDir: string, pattern: string): AtSuggestion[] {
  let relDir = pattern.replace(/^\//, "");
  let filterPrefix = relDir.split("/").slice(-1)[0];
  relDir = relDir.slice(0, relDir.lastIndexOf("/") + 1);

  let dirToList = path.resolve(baseDir, relDir);
  let results: AtSuggestion[] = [];
  try {
    const entries = fs.readdirSync(dirToList, { withFileTypes: true });
    entries.forEach((entry) => {
      if (filterPrefix && !entry.name.startsWith(filterPrefix)) return;
      const entryPath = path.join(relDir, entry.name);
      results.push({
        label: entry.name + (entry.isDirectory() ? "/" : ""),
        fullPath: path.join(dirToList, entry.name),
        isDir: entry.isDirectory(),
      });
    });
  } catch {}
  return results.slice(0, MAX_RESULTS);
}

export interface UseAtCompletionHook {
  open: boolean;
  suggestions: AtSuggestion[];
  selected: number;
  setSelected: (idx: number) => void;
  insertAtSelection: () => void;
  close: () => void;
  update: (txt: string, cursor: number) => void;
}

export function useAtCompletion({ cwd, text,
 cursorPosition, setText }:{ cwd:string, text:string, cursorPosition:number, setText:(t:string)=>void }): UseAtCompletionHook {
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
      const suggs = listPathSuggestions(cwd, res.pattern);
      setSuggestions(suggs);
      setSelected(0);
      lastQuery.current = res.pattern;
    } else {
      setOpen(false);
      setSuggestions([]);
    }
  }
  useEffect(()=>{ update(text, cursorPosition); }, [text, cursorPosition, cwd]);

  function insertAtSelection() {
    if (!open || !suggestions[selected]) return;
    const res = scanForAt(text, cursorPosition);
    if(!res || res.insertStart<0) return;
    const chosen = suggestions[selected].label;
    const before = text.slice(0, res.insertStart);
    const after = text.slice(cursorPosition);
    setText(before + chosen + after);
    setOpen(false);
    setSuggestions([]);
  }
  function close() {
    setOpen(false);
    setSuggestions([]);
  }
  return { open, suggestions, selected, setSelected, insertAtSelection, close, update };
}
