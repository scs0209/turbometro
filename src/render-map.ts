/**
 * Showcase map SVG — layoutMetro for geometry only; we draw the transit board.
 */
import { shortestPathEndpoints } from './graph.js';
import { taskColor } from './replay.js';
import type { Graph, Replay, TurboTasks } from './types.js';

export type LayoutResult = {
  positions: Map<string, { x: number; y: number }>;
  width: number;
  height: number;
  routePaths: Array<
    Array<{
      d: string;
      color: string;
      thickness: number;
      opacity: number;
    }>
  >;
  extraEdges: Array<{
    d: string;
    color: string;
    thickness: number;
    opacity: number;
  }>;
  scale: number;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shortLabel(name: string): string {
  const parts = name.split('/');
  return parts[parts.length - 1] || name;
}

function offsetPath(d: string, pad: number): string {
  return d.replace(/(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g, (_, x, y) => {
    return `${Number(x) + pad} ${Number(y) + pad}`;
  });
}

function collectSegments(layout: LayoutResult): Array<{
  d: string;
  color: string;
  thickness: number;
  kind: 'route' | 'extra';
}> {
  const out: Array<{
    d: string;
    color: string;
    thickness: number;
    kind: 'route' | 'extra';
  }> = [];
  for (const route of layout.routePaths) {
    for (const seg of route) {
      out.push({
        d: seg.d,
        color: seg.color,
        thickness: Math.max(seg.thickness, 7),
        kind: 'route',
      });
    }
  }
  for (const seg of layout.extraEdges) {
    out.push({
      d: seg.d,
      color: seg.color,
      thickness: Math.max(seg.thickness * 1.4, 4.5),
      kind: 'extra',
    });
  }
  return out;
}

function pathNear(
  layout: LayoutResult,
  fromId: string,
  toId: string,
): string {
  const a = layout.positions.get(fromId);
  const b = layout.positions.get(toId);
  if (!a || !b) return 'M 0 0';
  const segs = collectSegments(layout);
  const score = (d: string) => {
    const nums = [...d.matchAll(/(-?\d+\.?\d*)/g)].map((m) => Number(m[1]));
    if (nums.length < 4) return Infinity;
    const x0 = nums[0]!,
      y0 = nums[1]!;
    const x1 = nums[nums.length - 2]!,
      y1 = nums[nums.length - 1]!;
    const dFwd =
      Math.hypot(x0 - a.x, y0 - a.y) + Math.hypot(x1 - b.x, y1 - b.y);
    const dRev =
      Math.hypot(x0 - b.x, y0 - b.y) + Math.hypot(x1 - a.x, y1 - a.y);
    return Math.min(dFwd, dRev);
  };
  let best: string | null = null;
  let bestScore = Infinity;
  for (const s of segs) {
    const sc = score(s.d);
    if (sc < bestScore) {
      bestScore = sc;
      best = s.d;
    }
  }
  if (best && bestScore < 48) return best;
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

function trainGlyph(color: string, id: string): string {
  return `
    <g id="${id}" class="tm-car">
      <defs>
        <filter id="glow-${id}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g transform="translate(-20,-7)" filter="url(#glow-${id})">
        <rect x="0" y="0" width="26" height="12" rx="3" fill="${color}" stroke="var(--map-ink)" stroke-width="1.25"/>
        <rect x="27" y="0" width="16" height="12" rx="3" fill="${color}" stroke="var(--map-ink)" stroke-width="1.25"/>
        <rect x="3.5" y="2.8" width="6" height="4" rx="0.8" fill="#F8FBFF" opacity="0.95"/>
        <rect x="12" y="2.8" width="6" height="4" rx="0.8" fill="#F8FBFF" opacity="0.95"/>
        <rect x="30" y="2.8" width="6" height="4" rx="0.8" fill="#F8FBFF" opacity="0.95"/>
        <circle cx="6" cy="13.2" r="1.7" fill="var(--map-ink)"/>
        <circle cx="20" cy="13.2" r="1.7" fill="var(--map-ink)"/>
        <circle cx="32" cy="13.2" r="1.7" fill="var(--map-ink)"/>
        <circle cx="40" cy="13.2" r="1.7" fill="var(--map-ink)"/>
      </g>
    </g>`;
}

export function buildMapSvg(opts: {
  title: string;
  graph: Graph;
  layout: LayoutResult;
  turbo: TurboTasks;
  replay: Replay;
}): string {
  const { layout, graph, turbo, replay, title } = opts;
  const pad = 64;
  const vbW = layout.width + pad * 2;
  const vbH = layout.height + pad * 2 + 20;
  const s = layout.scale || 2;
  const segs = collectSegments(layout);

  const deg = new Map<string, number>();
  for (const n of graph.nodes) deg.set(n.name, 0);
  for (const [a, b] of graph.edges) {
    deg.set(a, (deg.get(a) ?? 0) + 1);
    deg.set(b, (deg.get(b) ?? 0) + 1);
  }

  const railsCasing = segs
    .map(
      (seg, i) =>
        `<path class="rail-case" data-rail="${i}" d="${offsetPath(seg.d, pad)}" fill="none" stroke="var(--rail-case)" stroke-width="${seg.thickness + 5.5}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('\n');

  const railsColor = segs
    .map(
      (seg, i) =>
        `<path class="rail-line" data-rail="${i}" d="${offsetPath(seg.d, pad)}" fill="none" stroke="${seg.color}" stroke-width="${seg.thickness}" stroke-linecap="round" stroke-linejoin="round" opacity="${seg.kind === 'extra' ? 0.75 : 0.98}"/>`,
    )
    .join('\n');

  const stations = graph.nodes
    .map((n) => {
      const p = layout.positions.get(n.name);
      if (!p) return '';
      const x = p.x + pad;
      const y = p.y + pad;
      const d = deg.get(n.name) ?? 0;
      const interchange = d >= 2;
      const r = interchange ? 10 : 7.5;
      const label = shortLabel(n.name);
      const lw = Math.max(label.length * 7.1 + 12, 40);
      return `
      <g class="station" data-station="${esc(n.name)}" tabindex="0" transform="translate(${x},${y})">
        <circle class="station-hit" r="20" fill="transparent"/>
        ${
          interchange
            ? `<rect class="station-capsule" x="-15" y="-10" width="30" height="20" rx="10" fill="var(--station-fill)" stroke="var(--map-ink)" stroke-width="2.6"/>`
            : `<circle class="station-ring" r="${r}" fill="var(--station-fill)" stroke="var(--map-ink)" stroke-width="2.7"/>`
        }
        <circle class="station-core" r="2.8" fill="var(--map-ink)"/>
        <g class="station-label" transform="translate(14,-12) rotate(-26)">
          <rect class="label-bg" x="-4" y="-12" width="${lw}" height="17" rx="3" fill="var(--label-bg)"/>
          <text class="label-text" x="2" y="1" font-size="${11 * (s / 2)}">${esc(label)}</text>
        </g>
        <title>${esc(n.name)}</title>
      </g>`;
    })
    .join('\n');

  const byPkg = new Map<string, (typeof replay.events)[0]>();
  for (const ev of replay.events) {
    const prev = byPkg.get(ev.package);
    if (!prev || ev.status === 'running') byPkg.set(ev.package, ev);
  }
  const tasks = Object.keys(turbo);
  const trainAnim: string[] = [];
  const trains = [...byPkg.values()]
    .map((ev, i) => {
      const color = taskColor(ev.task, tasks);
      const id = `t${i}`;
      const ends = shortestPathEndpoints(graph, ev.package);
      if (!ends) {
        const p = layout.positions.get(ev.package);
        if (!p) return '';
        const x = p.x + pad;
        const y = p.y + pad;
        const delay = 350 + i * 550;
        trainAnim.push(`
          @keyframes pulse-${i} {
            0%,100% { transform: translate(${x}px,${y}px) scale(0.94); opacity: 0.65; }
            50% { transform: translate(${x}px,${y}px) scale(1.06); opacity: 1; }
          }
          .tm-train-${i} { animation: pulse-${i} 2.4s ${delay}ms ease-in-out infinite; }
        `);
        return `<g class="tm-train tm-train-${i}" data-turbometro="train" data-package="${esc(ev.package)}">${trainGlyph(color, id)}</g>`;
      }
      const d = offsetPath(pathNear(layout, ends.from, ends.to), pad);
      const delay = 280 + i * 620;
      const dur = 2800 + (i % 3) * 450;
      trainAnim.push(`
        @keyframes ride-${i} {
          0% { offset-distance: 0%; opacity: 0; }
          7% { opacity: 1; }
          80% { offset-distance: 100%; opacity: 1; }
          92% { offset-distance: 100%; opacity: 0.12; }
          100% { offset-distance: 0%; opacity: 0; }
        }
        .tm-train-${i} {
          offset-path: path('${d}');
          offset-rotate: auto;
          offset-anchor: center;
          animation: ride-${i} ${dur}ms ${delay}ms cubic-bezier(.42,.0,.2,1) infinite;
        }
      `);
      return `<g class="tm-train tm-train-${i}" data-turbometro="train" data-package="${esc(ev.package)}" data-task="${esc(ev.task)}">${trainGlyph(color, id)}</g>`;
    })
    .join('\n');

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" width="100%" height="auto" class="metro-svg" role="img" aria-label="Monorepo subway map for ${esc(title)}">
  <defs>
    <radialGradient id="boardGlow" cx="48%" cy="36%" r="70%">
      <stop offset="0%" stop-color="var(--glow-center)"/>
      <stop offset="100%" stop-color="var(--glow-edge)"/>
    </radialGradient>
    <pattern id="microGrid" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M 28 0 L 0 0 0 28" fill="none" stroke="var(--grid-line)" stroke-width="0.7"/>
    </pattern>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1.2" stdDeviation="2" flood-opacity="0.28"/>
    </filter>
  </defs>
  <style>
    .metro-svg { font-family: "IBM Plex Mono", ui-monospace, monospace; }
    .station { cursor: pointer; outline: none; }
    .station .label-text { fill: var(--map-ink); font-weight: 600; letter-spacing: -0.02em; }
    .station-label { pointer-events: none; }
    .station:hover .station-ring, .station:focus-visible .station-ring,
    .station.is-active .station-ring,
    .station:hover .station-capsule, .station.is-active .station-capsule {
      stroke: var(--accent);
    }
    .station:hover .label-bg, .station.is-active .label-bg { fill: var(--label-bg-active); }
    .map.is-dim .rail-line, .map.is-dim .rail-case { opacity: 0.18; }
    .map.is-dim .station { opacity: 0.28; }
    .map.is-dim .station.is-active,
    .map.is-dim .station.is-neighbor { opacity: 1; }
    .map.is-dim .tm-train { opacity: 0.25; }
    .map.is-dim .tm-train.is-focus { opacity: 1; }
    .tm-train { pointer-events: none; }
    .cartouche .title { fill: var(--map-ink); font-weight: 700; letter-spacing: 0.08em; }
    .cartouche .sub { fill: var(--map-muted); }
    ${trainAnim.join('\n')}
    @media (prefers-reduced-motion: reduce) {
      .tm-train { animation: none !important; offset-distance: 60% !important; opacity: 1 !important; }
    }
  </style>
  <rect width="100%" height="100%" fill="url(#boardGlow)"/>
  <rect width="100%" height="100%" fill="url(#microGrid)" opacity="0.7"/>
  <g class="cartouche" transform="translate(24,20)">
    <rect width="228" height="48" rx="6" fill="var(--cartouche-bg)" stroke="var(--map-border)" stroke-width="1.2" filter="url(#softShadow)"/>
    <text class="title" x="14" y="20" font-size="10">TURBOMETRO NETWORK</text>
    <text class="sub" x="14" y="36" font-size="9">${esc(title)} · ${graph.nodes.length} stations · ${graph.edges.length} rails</text>
  </g>
  <g class="rails">
    ${railsCasing}
    ${railsColor}
  </g>
  <g class="stations">${stations}</g>
  <g class="trains">${trains}</g>
</svg>`;
}
