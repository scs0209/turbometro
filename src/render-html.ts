import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { shortestPathEndpoints } from './graph.js';
import { taskColor } from './replay.js';
import { toDagMapInput } from './layout.js';
import type { Graph, Replay, TurboTasks } from './types.js';

/** Seoul-ish transit board — not cream, not purple SaaS. */
export const TRANSIT_THEME = {
  paper: '#EEF2F6',
  ink: '#0E1116',
  muted: '#5A6578',
  border: '#C5CEDA',
  classes: {
    pure: '#00A84D',
    recordable: '#0039A6',
    side_effecting: '#F5A200',
    gate: '#C60C30',
    pending: '#9AA3B2',
  },
  lineOpacity: 1.55,
};

type LayoutMetro = (
  dag: {
    nodes: Array<{ id: string; label: string; cls: string }>;
    edges: Array<[string, string]>;
  },
  options?: Record<string, unknown>,
) => {
  positions: Map<string, { x: number; y: number }>;
  width: number;
  height: number;
};

type RenderSVG = (
  dag: {
    nodes: Array<{ id: string; label: string; cls: string }>;
    edges: Array<[string, string]>;
  },
  layout: ReturnType<LayoutMetro>,
  options?: Record<string, unknown>,
) => string;

async function loadVendor(): Promise<{
  layoutMetro: LayoutMetro;
  renderSVG: RenderSVG;
}> {
  const pkgRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
  );
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

/** Compact 2-car metro glyph (viewBox-ish local coords). */
function trainGlyph(color: string): string {
  return `
    <g class="tm-car" transform="translate(-18,-6)">
      <rect x="0" y="1" width="22" height="10" rx="2.2" fill="${color}" stroke="#0E1116" stroke-width="1.1"/>
      <rect x="23" y="1" width="14" height="10" rx="2.2" fill="${color}" stroke="#0E1116" stroke-width="1.1"/>
      <rect x="3" y="3.2" width="5" height="3.2" rx="0.6" fill="#F4F8FC" opacity="0.92"/>
      <rect x="10" y="3.2" width="5" height="3.2" rx="0.6" fill="#F4F8FC" opacity="0.92"/>
      <rect x="26" y="3.2" width="5" height="3.2" rx="0.6" fill="#F4F8FC" opacity="0.92"/>
      <circle cx="5" cy="12" r="1.5" fill="#0E1116"/>
      <circle cx="17" cy="12" r="1.5" fill="#0E1116"/>
      <circle cx="28" cy="12" r="1.5" fill="#0E1116"/>
      <circle cx="34" cy="12" r="1.5" fill="#0E1116"/>
    </g>`;
}

function buildTrainLayer(
  graph: Graph,
  layout: ReturnType<LayoutMetro>,
  replay: Replay,
  turbo: TurboTasks,
): string {
  const tasks = Object.keys(turbo);
  // One train per package: prefer running, else first event
  const byPkg = new Map<string, (typeof replay.events)[0]>();
  for (const ev of replay.events) {
    const prev = byPkg.get(ev.package);
    if (!prev || ev.status === 'running') byPkg.set(ev.package, ev);
  }
  const events = [...byPkg.values()];

  const parts: string[] = [
    `<g class="turbometro-trains" data-turbometro="trains">`,
  ];

  events.forEach((ev, i) => {
    const pos = layout.positions.get(ev.package);
    if (!pos) return;
    const color = taskColor(ev.task, tasks);
    const pathEnds = shortestPathEndpoints(graph, ev.package);
    const delay = 400 + i * 700;
    const dur = 2200 + (i % 3) * 400;

    if (pathEnds) {
      const from = layout.positions.get(pathEnds.from);
      const to = layout.positions.get(pathEnds.to);
      if (from && to) {
        const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
        parts.push(`
          <g class="tm-train" data-turbometro="train" data-package="${esc(ev.package)}" data-task="${esc(ev.task)}" data-status="${esc(ev.status)}"
             style="offset-path: path('${d}'); offset-rotate: auto; offset-anchor: center; animation: tm-ride-${i} ${dur}ms ${delay}ms cubic-bezier(.4,.0,.2,1) infinite;">
            ${trainGlyph(color)}
          </g>
          <style>
            @keyframes tm-ride-${i} {
              0% { offset-distance: 0%; opacity: 0; }
              8% { opacity: 1; }
              78% { offset-distance: 100%; opacity: 1; }
              92% { offset-distance: 100%; opacity: 1; }
              100% { offset-distance: 100%; opacity: 0; }
            }
          </style>
        `);
        return;
      }
    }

    parts.push(`
      <g class="tm-pulse" data-turbometro="train" data-package="${esc(ev.package)}" data-task="${esc(ev.task)}" transform="translate(${pos.x},${pos.y})">
        <circle class="tm-ring" r="16" fill="none" stroke="${color}" stroke-width="2"
          style="animation: tm-ring-${i} 1.8s ${delay}ms ease-out infinite;" />
        ${trainGlyph(color)}
      </g>
      <style>
        @keyframes tm-ring-${i} {
          0% { transform: scale(0.55); opacity: 0.85; }
          100% { transform: scale(1.55); opacity: 0; }
        }
      </style>
    `);
  });

  parts.push('</g>');
  return parts.join('\n');
}

function taskLegend(turbo: TurboTasks): string {
  const tasks = Object.keys(turbo);
  return tasks
    .map((t) => {
      const c = taskColor(t, tasks);
      return `<li><span class="swatch" style="background:${c}"></span><code>${esc(t)}</code> line</li>`;
    })
    .join('');
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
    theme: TRANSIT_THEME,
    scale: 1.85,
    layerSpacing: 42,
    mainSpacing: 40,
  });
  let svg = renderSVG(dag, layout, {
    title: '',
    subtitle: null,
    showLegend: true,
    diagonalLabels: true,
    labelAngle: 38,
    legendLabels: {
      pure: 'apps',
      recordable: 'packages',
      side_effecting: 'other',
      gate: 'gate',
    },
    font: "'IBM Plex Mono', ui-monospace, monospace",
  });

  const trains = buildTrainLayer(opts.graph, layout, opts.replay, opts.turbo);
  svg = svg.replace('</svg>', `${trains}\n</svg>`);

  const stationCount = opts.graph.nodes.length;
  const railCount = opts.graph.edges.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>turbometro — ${esc(opts.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --ink: #0E1116;
      --muted: #5A6578;
      --paper: #EEF2F6;
      --line-green: #00A84D;
      --line-blue: #0039A6;
      --sheet: #F7F9FC;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      font-family: "Syne", "Pretendard", sans-serif;
      background-color: var(--paper);
      background-image:
        linear-gradient(90deg, rgba(14,17,22,0.035) 1px, transparent 1px),
        linear-gradient(rgba(14,17,22,0.035) 1px, transparent 1px),
        radial-gradient(ellipse 80% 50% at 100% -10%, rgba(0,168,77,0.12), transparent 55%),
        radial-gradient(ellipse 60% 40% at -10% 100%, rgba(0,57,166,0.10), transparent 50%);
      background-size: 28px 28px, 28px 28px, auto, auto;
      min-height: 100vh;
    }
    .frame {
      max-width: 1120px;
      margin: 0 auto;
      padding: clamp(1.25rem, 3vw, 2.5rem);
    }
    .brand {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.65rem 1.1rem;
      margin-bottom: 0.35rem;
    }
    .brand-mark {
      font-weight: 800;
      font-size: clamp(2.4rem, 6vw, 3.6rem);
      letter-spacing: -0.045em;
      line-height: 0.95;
      background: linear-gradient(105deg, var(--line-green) 0 42%, var(--line-blue) 42% 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: brand-shift 8s ease-in-out infinite alternate;
    }
    @keyframes brand-shift {
      from { filter: hue-rotate(0deg); }
      to { filter: hue-rotate(-8deg); }
    }
    .brand-sub {
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.78rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }
    h1.repo {
      margin: 0.4rem 0 0;
      font-size: clamp(1.05rem, 2.4vw, 1.35rem);
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .tagline {
      margin: 0.45rem 0 0;
      max-width: 36rem;
      font-size: 1.02rem;
      font-weight: 600;
      color: #243044;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
      margin: 1rem 0 1.25rem;
      padding: 0;
      list-style: none;
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.75rem;
      color: var(--muted);
    }
    .meta strong { color: var(--ink); font-weight: 600; }
    .sheet {
      background: var(--sheet);
      border: 2px solid var(--ink);
      padding: 0.75rem 0.5rem 0.25rem;
      position: relative;
    }
    .sheet::before {
      content: "NETWORK MAP";
      position: absolute;
      top: -0.7rem;
      left: 0.85rem;
      padding: 0 0.4rem;
      background: var(--sheet);
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.65rem;
      letter-spacing: 0.16em;
      font-weight: 600;
    }
    .sheet svg { display: block; width: 100%; height: auto; }
    .legend-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-top: 1.1rem;
      align-items: flex-start;
    }
    .legend-row h2 {
      margin: 0 0 0.4rem;
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-family: "IBM Plex Mono", monospace;
      color: var(--muted);
      font-weight: 600;
    }
    .legend-row ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem 1rem;
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.78rem;
    }
    .legend-row li { display: flex; align-items: center; gap: 0.4rem; }
    .swatch {
      width: 1.35rem;
      height: 0.35rem;
      border-radius: 1px;
      display: inline-block;
    }
    .note {
      margin-top: 1.25rem;
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.72rem;
      color: var(--muted);
      line-height: 1.45;
      max-width: 42rem;
    }
    @media (prefers-reduced-motion: reduce) {
      .tm-train, .tm-ring, .brand-mark { animation: none !important; }
    }
  </style>
</head>
<body>
  <div class="frame">
    <header>
      <div class="brand">
        <div class="brand-mark">turbometro</div>
        <div class="brand-sub">line diagram</div>
      </div>
      <h1 class="repo">${esc(opts.title)}</h1>
      <p class="tagline">Your monorepo as a subway — trains run when turbo does.</p>
      <ul class="meta">
        <li><strong>${stationCount}</strong> stations</li>
        <li><strong>${railCount}</strong> rails</li>
        <li><strong>${Object.keys(opts.turbo).length}</strong> task lines</li>
      </ul>
    </header>
    <div class="sheet" data-turbometro="map">
      ${svg}
    </div>
    <div class="legend-row">
      <div>
        <h2>Task trains</h2>
        <ul>${taskLegend(opts.turbo)}</ul>
      </div>
    </div>
    <p class="note">${esc(opts.disclaimer)}</p>
  </div>
</body>
</html>
`;
}
