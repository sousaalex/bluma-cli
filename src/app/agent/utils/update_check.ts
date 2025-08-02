/**
 * Update check utility for BluMa CLI
 */
import updateNotifier from "update-notifier";
import { readPackageUp } from "read-package-up";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

function findPackageJsonNearest(startDir: string): { name?: string; version?: string } | null {
  // Walk up until we find a package.json
  let dir = startDir;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "package.json");
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed?.name && parsed?.version) return parsed;
      } catch {
        // ignore parse errors and continue walking up
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export async function checkForUpdates(): Promise<string | null> {
  try {
    // Allow forcing an update message for testing without hitting network or registry
    if (process.env.BLUMA_FORCE_UPDATE_MSG) {
      return String(process.env.BLUMA_FORCE_UPDATE_MSG);
    }

    // Prefer resolving package.json based on the actual executed entry (bin)
    // When installed globally, process.argv[1] should point into the installed package dist
    const binPath = process.argv?.[1];
    let pkg: { name?: string; version?: string } | undefined;

    if (binPath && fs.existsSync(binPath)) {
      const candidatePkg = findPackageJsonNearest(path.dirname(binPath));
      if (candidatePkg?.name && candidatePkg?.version) {
        pkg = candidatePkg;
      }
    }

    if (!pkg) {
      // Fallback to previous heuristic using the current module location
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const result = await readPackageUp({ cwd: __dirname });
      pkg = result?.packageJson as { name?: string; version?: string } | undefined;
    }

    if (!pkg?.name || !pkg?.version) return null;

    // Decide the check interval
    const isCI = Boolean(process.env.CI);
    const isNoCache = process.env.BLUMA_UPDATE_NO_CACHE === "1";
    const isDev = process.env.NODE_ENV !== "production";

    // In dev or when no-cache flag is set, we want to check every start
    const updateCheckInterval = isNoCache || isDev ? 0 : 1000 * 60 * 60 * 24; // 0 => always check

    const notifier = updateNotifier({
      pkg: { name: pkg.name, version: pkg.version },
      updateCheckInterval,
      shouldNotifyInNpmScript: true,
    });

    if (notifier.update && !isCI) {
      const cur = notifier.update.current;
      const lat = notifier.update.latest;
      if (cur && lat && cur !== lat) {
        return `Update available for ${pkg.name}! ${cur} → ${lat}
      Run npm i -g ${pkg.name} to update.`;
      }
    }
    return null;
  } catch (e) {
    console.warn("Update check failed:", e);
    return null;
  }
}
