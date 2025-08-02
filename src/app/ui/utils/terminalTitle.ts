import { exec } from 'child_process';

export type TitleKeeperOptions = {
  intervalMs?: number; // how often to re-apply title
  strict?: boolean; // if true, always reapply regardless
};

let intervalHandle: NodeJS.Timer | null = null;
let lastTitle: string | null = null;

export function setTerminalTitle(title: string) {
  try {
    // Set Node process title (helps in task managers and some terminals)
    try { (process as any).title = title; } catch {}

    // OSC 0 sequence — broadly supported
    if (process.stdout && (process.stdout as any).isTTY) {
      process.stdout.write(`\u001b]0;${title}\u0007`);
    }

    // Windows fallback for classic consoles
    if (process.platform === 'win32') {
      try {
        exec(`title ${title}`);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

export function startTitleKeeper(title: string, opts: TitleKeeperOptions = {}) {
  const intervalMs = typeof opts.intervalMs === 'number' ? opts.intervalMs : 2000;
  const strictEnv = process.env.BLUMA_TITLE_STRICT;
  const strict = typeof opts.strict === 'boolean' ? opts.strict : (strictEnv ? strictEnv !== 'false' : true);

  // First application
  setTerminalTitle(title);
  lastTitle = title;

  // Re-apply periodically to counter external overwrites
  if (intervalHandle) {
    clearInterval(intervalHandle as unknown as NodeJS.Timeout);
  }
  intervalHandle = setInterval(() => {
    if (strict) {
      setTerminalTitle(title);
      lastTitle = title;
    } else {
      // Non-strict mode: still re-apply to be resilient
      setTerminalTitle(title);
      lastTitle = title;
    }
  }, intervalMs) as unknown as NodeJS.Timer;

  // Keep on key lifecycle events
  const reapply = () => setTerminalTitle(title);
  process.on('beforeExit', reapply);
  process.on('exit', reapply);
  process.on('SIGWINCH', reapply as any);
  process.on('uncaughtException', reapply as any);
  process.on('unhandledRejection', reapply as any);

  return () => stopTitleKeeper();
}

export function stopTitleKeeper() {
  if (intervalHandle) {
    clearInterval(intervalHandle as unknown as NodeJS.Timeout);
    intervalHandle = null;
  }
  // Remove listeners if desired in future; currently benign
}
