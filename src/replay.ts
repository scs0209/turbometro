import fs from 'node:fs';
import type { Graph, Replay, ReplayEvent, TurboTasks } from './types.js';

const TASK_COLORS = [
  '#FF5C5C',
  '#3DDC97',
  '#4C8DFF',
  '#F5A200',
  '#FB923C',
  '#2DD4BF',
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
        { name: '@demo/admin', dir: 'apps/admin', kind: 'apps' },
        { name: '@demo/ui', dir: 'packages/ui', kind: 'packages' },
        { name: '@demo/api-client', dir: 'packages/api-client', kind: 'packages' },
        { name: '@demo/utils', dir: 'packages/utils', kind: 'packages' },
        { name: '@demo/config', dir: 'packages/config', kind: 'packages' },
      ],
      edges: [
        ['@demo/web', '@demo/ui'],
        ['@demo/web', '@demo/api-client'],
        ['@demo/admin', '@demo/ui'],
        ['@demo/admin', '@demo/api-client'],
        ['@demo/ui', '@demo/utils'],
        ['@demo/api-client', '@demo/utils'],
        ['@demo/utils', '@demo/config'],
      ],
    },
    turbo: {
      build: { dependsOn: ['^build'] },
      test: { dependsOn: ['build'] },
      lint: {},
    },
  };
}
