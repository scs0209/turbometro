import fs from 'node:fs';
import path from 'node:path';
import type { TurboTasks } from './types.js';

/** Strip // and /* *\/ comments for turbo.jsonc. */
export function stripJsonc(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

export function findTurboConfigPath(root: string): string | null {
  for (const name of ['turbo.json', 'turbo.jsonc']) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function parseTurbo(root: string): TurboTasks {
  const cfgPath = findTurboConfigPath(root);
  if (!cfgPath) {
    throw new Error(
      `Missing turbo.json or turbo.jsonc in ${root}. turbometro v0.1 requires Turborepo.`,
    );
  }
  const raw = stripJsonc(fs.readFileSync(cfgPath, 'utf8'));
  const json = JSON.parse(raw) as {
    tasks?: TurboTasks;
    pipeline?: TurboTasks;
  };
  const tasks = json.tasks ?? json.pipeline;
  if (!tasks || Object.keys(tasks).length === 0) {
    throw new Error(`No tasks/pipeline found in ${cfgPath}`);
  }
  return tasks;
}
