import fs from 'node:fs';
import path from 'node:path';
import { findWorkspaceRoot } from './find-root.js';
import { dropCycleEdges } from './graph.js';
import { parseWorkspace } from './parse-workspace.js';
import { parseTurbo } from './parse-turbo.js';
import { scaleGuard } from './scale.js';
import {
  buildSyntheticReplay,
  demoGraphAndTurbo,
  loadReplay,
} from './replay.js';
import { renderMetroHtml } from './render-html.js';
import type { CliOptions, Graph, TurboTasks } from './types.js';

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    cwd: process.cwd(),
    out: path.join(process.cwd(), 'metro.html'),
    demo: false,
    replayPath: null,
    force: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--demo') opts.demo = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--out') opts.out = path.resolve(argv[++i] ?? 'metro.html');
    else if (a === '--replay')
      opts.replayPath = path.resolve(argv[++i] ?? '');
    else if (a === '--cwd') opts.cwd = path.resolve(argv[++i] ?? '.');
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return opts;
}

function printHelp(): void {
  console.log(`turbometro — monorepo subway map

Usage:
  turbometro [--out metro.html] [--replay run.json] [--force] [--cwd dir]
  turbometro --demo

Just run inside a pnpm workspace (or pass --cwd). Auto-detects packages
(including apps/** globs). turbo.json is optional — scripts are inferred.
Default trains are synthetic replay.
`);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  let graph: Graph;
  let turbo: TurboTasks;
  let title: string;
  let disclaimer: string;

  if (opts.demo) {
    const demo = demoGraphAndTurbo();
    graph = demo.graph;
    turbo = demo.turbo;
    title = 'turbometro demo';
    disclaimer =
      'Demo data. v0.1 trains are synthetic/replay — not a live turbo attach.';
  } else {
    const root = findWorkspaceRoot(opts.cwd);
    if (!root) {
      console.error(
        'turbometro: no pnpm-workspace.yaml found (searched upward from cwd).',
      );
      process.exit(1);
    }
    try {
      graph = parseWorkspace(root);
      const parsed = parseTurbo(root, graph);
      turbo = parsed.tasks;
      if (parsed.source === 'inferred') {
        console.warn(
          'turbometro: no turbo.json(c) — inferring task legend from package scripts.',
        );
      }
    } catch (e) {
      console.error(`turbometro: ${(e as Error).message}`);
      process.exit(1);
    }
    title = path.basename(root);
    disclaimer =
      'Trains are synthetic/replay (default). Pass --replay run.json to override. Live turbo attach is roadmap.';
  }

  const scale = scaleGuard(graph.nodes.length, opts.force);
  if (!scale.ok) {
    console.error(`turbometro: ${scale.error}`);
    process.exit(1);
  }
  if (scale.warn) console.warn(`turbometro: ${scale.warn}`);

  const { graph: acyclic, dropped } = dropCycleEdges(graph);
  if (dropped.length) {
    console.warn(
      `turbometro: dropped ${dropped.length} cycle edge(s): ${dropped.join(', ')}`,
    );
  }
  graph = acyclic;

  const replay = opts.replayPath
    ? loadReplay(opts.replayPath)
    : buildSyntheticReplay(graph, turbo);

  const html = await renderMetroHtml({
    title,
    graph,
    turbo,
    replay,
    disclaimer,
  });
  fs.writeFileSync(opts.out, html, 'utf8');
  console.log(`Wrote ${opts.out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
