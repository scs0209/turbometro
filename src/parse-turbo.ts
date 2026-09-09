import fs from 'node:fs';
import path from 'node:path';
import type { Graph, TurboTasks } from './types.js';

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

const PREFERRED_SCRIPTS = [
  'build',
  'test',
  'lint',
  'typecheck',
  'check',
  'dev',
];

/** Infer a task legend from package.json scripts when turbo.json is absent. */
export function inferTasksFromGraph(graph: Graph): TurboTasks {
  const counts = new Map<string, number>();
  for (const node of graph.nodes) {
    const pkgPath = path.join(node.dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    for (const name of Object.keys(pkg.scripts ?? {})) {
      if (name.includes(':')) continue; // skip namespaced scripts
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  const tasks: TurboTasks = {};
  for (const pref of PREFERRED_SCRIPTS) {
    if ((counts.get(pref) ?? 0) > 0) tasks[pref] = {};
  }
  if (Object.keys(tasks).length === 0) {
    // pick top 3 most common simple scripts
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [name] of ranked.slice(0, 3)) tasks[name] = {};
  }
  if (Object.keys(tasks).length === 0) tasks.build = {};
  return tasks;
}

export type ParseTurboResult = {
  tasks: TurboTasks;
  source: 'turbo' | 'inferred';
  path?: string;
};

export function parseTurbo(root: string, graph: Graph): ParseTurboResult {
  const cfgPath = findTurboConfigPath(root);
  if (!cfgPath) {
    return { tasks: inferTasksFromGraph(graph), source: 'inferred' };
  }
  const raw = stripJsonc(fs.readFileSync(cfgPath, 'utf8'));
  const json = JSON.parse(raw) as {
    tasks?: TurboTasks;
    pipeline?: TurboTasks;
  };
  const tasks = json.tasks ?? json.pipeline;
  if (!tasks || Object.keys(tasks).length === 0) {
    return { tasks: inferTasksFromGraph(graph), source: 'inferred', path: cfgPath };
  }
  return { tasks, source: 'turbo', path: cfgPath };
}
