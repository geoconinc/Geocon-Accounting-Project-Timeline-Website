import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** Bump semver minor by 0.1 (0.1.0 → 0.2.0, 0.9.0 → 1.0.0). */
export function bumpByTenth(version: string): string {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(version.trim());
  if (!match) throw new Error(`Invalid version: ${version}`);

  let major = Number(match[1]);
  let minor = Number(match[2]);
  const patch = Number(match[3] ?? "0");

  minor += 1;
  if (minor >= 10) {
    major += 1;
    minor = 0;
  }

  return `${major}.${minor}.${patch}`;
}

function main() {
  const root = process.cwd();
  const pkgPath = path.join(root, "package.json");
  const lockPath = path.join(root, "package-lock.json");
  const versionPath = path.join(root, "VERSION");

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
  const prev = pkg.version;
  const next = bumpByTenth(prev);

  pkg.version = next;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  if (existsSync(lockPath)) {
    const lock = JSON.parse(readFileSync(lockPath, "utf8")) as {
      version: string;
      packages?: Record<string, { version?: string }>;
    };
    lock.version = next;
    if (lock.packages?.[""]) lock.packages[""].version = next;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  }

  writeFileSync(versionPath, `${next}\n`);
  console.log(`Version: ${prev} → ${next}`);
}

// Only run when invoked directly (e.g. `tsx scripts/bump-version.ts`), not when
// imported (e.g. by unit tests), so importing bumpByTenth has no side effects.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
