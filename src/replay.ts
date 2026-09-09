import fs from 'node:fs';
import type { Graph, Replay, ReplayEvent, TurboTasks } from './types.js';

const TASK_COLORS = [
  '#e63946',
  '#457b9d',
  '#2a9d8f',
  '#e9c46a',
  '#9b5de5',
  '#f4a261',
];

export function taskColor(task: string, tasks: string[]): string {
  const i = Math.max(0, tasks.indexOf(task));
  return TASK_COLORS[i % TASK_COLORS.length]!;
}

/** Synthetic timeline: walk packages in name order, emit running→pass per task. */
export function buildSyntheticReplay(
  graph: Graph,
  turbo: TurboTasks,
): Replay {
  const taskNames = Object.keys(turbo);
  const primary = taskNames.includes('build')
    ? 'build'
    : taskNames[0] ?? 'build';
  const events: ReplayEvent[] = [];
  let t = 0;
  for (const node of graph.nodes) {
    events.push({
      t,
      task: primary,
      package: node.name,
      status: 'running',
    });
    t += 800;
    events.push({
      t,
      task: primary,
      package: node.name,
      status: 'pass',
    });
    t += 400;
  }
  return { events };
}

export function loadReplay(filePath: string): Replay {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Replay;
  if (!raw.events || !Array.isArray(raw.events)) {
    throw new Error(`Invalid replay file: ${filePath}`);
  }
  return raw;
}

export function demoGraphAndTurbo(): { graph: Graph; turbo: TurboTasks } {
  return {
    graph: {
      nodes: [
        { name: '@demo/web', dir: 'apps/web', kind: 'apps' },
        { name: '@demo/ui', dir: 'packages/ui', kind: 'packages' },
        { name: '@demo/utils', dir: 'packages/utils', kind: 'packages' },
      ],
      edges: [
        ['@demo/web', '@demo/ui'],
        ['@demo/ui', '@demo/utils'],
      ],
    },
    turbo: {
      build: { dependsOn: ['^build'] },
      test: { dependsOn: ['build'] },
    },
  };
}
