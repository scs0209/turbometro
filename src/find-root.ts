import fs from 'node:fs';
import path from 'node:path';

/** Walk up from cwd until pnpm-workspace.yaml is found. */
export function findWorkspaceRoot(cwd: string): string | null {
  let dir = path.resolve(cwd);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
