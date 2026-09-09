import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { shortestPathEndpoints } from './graph.js';
import { taskColor } from './replay.js';
import { toDagMapInput } from './layout.js';
import type { Graph, Replay, TurboTasks } from './types.js';

type LayoutMetro = (
  dag: { nodes: Array<{ id: string; label: string; cls: string }>; edges: Array<[string, string]> },
  options?: Record<string, unknown>,
) => {
  positions: Map<string, { x: number; y: number }>;
  width: number;
  height: number;
};

type RenderSVG = (
  dag: { nodes: Array<{ id: string; label: string; cls: string }>; edges: Array<[string, string]> },
  layout: ReturnType<LayoutMetro>,
  options?: Record<string, unknown>,
) => string;

async function loadVendor(): Promise<{
  layoutMetro: LayoutMetro;
  renderSVG: RenderSVG;
}> {
  // dist/render-html.js → packageRoot/vendor/...
  const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const metroUrl = pathToFileURL(
    path.join(pkgRoot, 'vendor/dag-map/src/layout-metro.js'),
  ).href;
  const renderUrl = pathToFileURL(
    path.join(pkgRoot, 'vendor/dag-map/src/render.js'),
  ).href;
  const { layoutMetro } = (await import(metroUrl)) as {
    layoutMetro: LayoutMetro;
  };
  const { renderSVG } = (await import(renderUrl)) as { renderSVG: RenderSVG };
  return { layoutMetro, renderSVG };
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTrainLayer(
  graph: Graph,
  layout: ReturnType<LayoutMetro>,
  replay: Replay,
  turbo: TurboTasks,
): string {
  const tasks = Object.keys(turbo);
  const parts: string[] = [
    `<g class="turbometro-trains" data-turbometro="trains">`,
  ];

  replay.events.forEach((ev, i) => {
    const pos = layout.positions.get(ev.package);
    if (!pos) return;
    const color = taskColor(ev.task, tasks);
    const pathEnds = shortestPathEndpoints(graph, ev.package);
    const delay = ev.t;
    const dur = 800;

    if (pathEnds) {
      const from = layout.positions.get(pathEnds.from);
      const to = layout.positions.get(pathEnds.to);
      if (from && to) {
        const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
        parts.push(`
          <g class="tm-train" data-turbometro="train" data-package="${esc(ev.package)}" data-task="${esc(ev.task)}" data-status="${esc(ev.status)}">
            <rect width="14" height="8" rx="2" fill="${color}" stroke="#111" stroke-width="0.8"
              style="offset-path: path('${d}'); offset-rotate: auto; animation: tm-ride-${i} ${dur}ms ${delay}ms linear infinite;" />
          </g>
          <style>
            @keyframes tm-ride-${i} {
              0% { offset-distance: 0%; opacity: 0.3; }
              10% { opacity: 1; }
              70% { offset-distance: 100%; opacity: 1; }
              100% { offset-distance: 100%; opacity: ${ev.status === 'fail' ? 0.4 : 0.85}; }
            }
          </style>
        `);
        return;
      }
    }

    parts.push(`
      <g class="tm-pulse" data-turbometro="train" data-package="${esc(ev.package)}" data-task="${esc(ev.task)}" transform="translate(${pos.x},${pos.y})">
        <circle r="10" fill="${color}" opacity="0.35"
          style="animation: tm-pulse-${i} 1.2s ${delay}ms ease-in-out infinite;" />
        <rect x="-7" y="-4" width="14" height="8" rx="2" fill="${color}" stroke="#111" stroke-width="0.8" />
      </g>
      <style>
        @keyframes tm-pulse-${i} {
          0%, 100% { r: 8; opacity: 0.25; }
          50% { r: 14; opacity: 0.55; }
        }
      </style>
    `);
  });

  parts.push('</g>');
  return parts.join('\n');
}

export async function renderMetroHtml(opts: {
  title: string;
  graph: Graph;
  turbo: TurboTasks;
  replay: Replay;
  disclaimer: string;
}): Promise<string> {
  const { layoutMetro, renderSVG } = await loadVendor();
  const dag = toDagMapInput(opts.graph);
  const layout = layoutMetro(dag, {
    routing: 'angular',
    theme: 'cream',
    scale: 1.6,
  });
  let svg = renderSVG(dag, layout, {
    title: opts.title,
    subtitle: 'packages = stations · deps = rails · turbo tasks = trains',
    showLegend: true,
    legendLabels: {
      pure: 'apps',
      recordable: 'packages',
      side_effecting: 'other',
      gate: 'control',
    },
  });

  const trains = buildTrainLayer(opts.graph, layout, opts.replay, opts.turbo);
  svg = svg.replace('</svg>', `${trains}\n</svg>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(opts.title)} — turbometro</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      background:
        radial-gradient(ellipse at 20% 0%, #fff7e8 0%, transparent 50%),
        linear-gradient(180deg, #f6f1e8 0%, #e8eef5 100%);
      min-height: 100vh;
    }
    header {
      padding: 1.25rem 1.5rem 0.5rem;
      max-width: 1100px;
      margin: 0 auto;
    }
    h1 { margin: 0; font-size: 1.35rem; letter-spacing: -0.02em; }
    p { margin: 0.35rem 0 0; color: #445; font-size: 0.95rem; }
    .disclaimer {
      margin-top: 0.75rem;
      font-size: 0.8rem;
      color: #667;
      border-left: 3px solid #c9a227;
      padding-left: 0.75rem;
    }
    main { padding: 0.5rem 1rem 2rem; overflow: auto; }
    .map {
      background: #fffdf8;
      border: 1px solid #e2d6c2;
      border-radius: 4px;
      padding: 0.5rem;
      box-shadow: 0 8px 24px rgba(40, 30, 10, 0.06);
    }
    svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
    @media (prefers-reduced-motion: reduce) {
      .tm-train rect, .tm-pulse circle { animation: none !important; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${esc(opts.title)}</h1>
    <p>Your monorepo as a subway — trains run when turbo does.</p>
    <p class="disclaimer">${esc(opts.disclaimer)}</p>
  </header>
  <main>
    <div class="map" data-turbometro="map">
      ${svg}
    </div>
  </main>
</body>
</html>
`;
}
