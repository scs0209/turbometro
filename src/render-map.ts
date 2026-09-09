/**
 * Showcase map SVG — layoutMetro for geometry; SMIL trains; shallow 3D cues in glyph/shadow.
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

function roundPath(d: string): string {
  return d.replace(/-?\d+\.?\d*(?:e[+-]?\d+)?/gi, (n) => {
    const v = Number(n);
    return Number.isFinite(v) ? String(Math.round(v * 10) / 10) : n;
  });
}

function offsetPath(d: string, pad: number): string {
  return roundPath(
    d.replace(/(-?\d+\.?\d*(?:e[+-]?\d+)?)\s+(-?\d+\.?\d*(?:e[+-]?\d+)?)/gi, (_, x, y) => {
      return `${Number(x) + pad} ${Number(y) + pad}`;
    }),
  );
}

/** Extract polyline points from simple M/L paths. */
function pathPoints(d: string): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const re = /([ML])\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    pts.push({ x: Number(m[2]), y: Number(m[3]) });
  }
  // also catch bare pairs after first M
  if (pts.length < 2) {
    const nums = [...d.matchAll(/(-?\d+\.?\d*)/g)].map((x) => Number(x[1]));
    for (let i = 0; i + 1 < nums.length; i += 2) {
      pts.push({ x: nums[i]!, y: nums[i + 1]! });
    }
  }
  return pts;
}

function pointsToPath(pts: Array<{ x: number; y: number }>): string {
  if (!pts.length) return 'M 0 0';
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${roundNum(p.x)} ${roundNum(p.y)}`)
    .join(' ');
}

function roundNum(n: number): number {
  return Math.round(n * 10) / 10;
}

function reversePath(d: string): string {
  return pointsToPath(pathPoints(d).reverse());
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
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

/** Path from `fromId` → `toId` (direction corrected). */
function directedPath(
  layout: LayoutResult,
  fromId: string,
  toId: string,
): string {
  const a = layout.positions.get(fromId);
  const b = layout.positions.get(toId);
  if (!a || !b) return 'M 0 0';
  const segs = collectSegments(layout);
  let best: string | null = null;
  let bestScore = Infinity;
  let bestReversed = false;

  for (const s of segs) {
    const pts = pathPoints(s.d);
    if (pts.length < 2) continue;
    const start = pts[0]!;
    const end = pts[pts.length - 1]!;
    const fwd = dist(start, a) + dist(end, b);
    const rev = dist(start, b) + dist(end, a);
    if (fwd < bestScore) {
      bestScore = fwd;
      best = s.d;
      bestReversed = false;
    }
    if (rev < bestScore) {
      bestScore = rev;
      best = s.d;
      bestReversed = true;
    }
  }

  if (best && bestScore < 55) {
    return bestReversed ? reversePath(best) : best;
  }
  return `M ${roundNum(a.x)} ${roundNum(a.y)} L ${roundNum(b.x)} ${roundNum(b.y)}`;
}

/** Isometric-ish 3-face metro car. */
function trainGlyph3d(color: string): string {
  const side = shade(color, -0.28);
  const top = shade(color, 0.18);
  return `
    <g class="tm-car-3d">
      <!-- shadow on "ground" -->
      <ellipse cx="2" cy="9" rx="16" ry="3.2" fill="#000" opacity="0.28"/>
      <!-- left/side face -->
      <path d="M -14,2 L -10,-4 L 8,-4 L 4,2 Z" fill="${side}" stroke="var(--map-ink)" stroke-width="0.9"/>
      <!-- front face -->
      <path d="M 4,2 L 8,-4 L 20,-1 L 16,5 Z" fill="${shade(color, -0.12)}" stroke="var(--map-ink)" stroke-width="0.9"/>
      <!-- roof / top -->
      <path d="M -10,-4 L -4,-8 L 14,-5 L 8,-4 Z" fill="${top}" stroke="var(--map-ink)" stroke-width="0.9"/>
      <!-- windows -->
      <rect x="-8" y="-2.2" width="5" height="2.8" rx="0.5" fill="#E8F4FF" opacity="0.9"/>
      <rect x="-1" y="-2.2" width="5" height="2.8" rx="0.5" fill="#E8F4FF" opacity="0.9"/>
      <path d="M 9,-1.5 L 12,-0.2 L 12,1.6 L 9,0.4 Z" fill="#E8F4FF" opacity="0.85"/>
    </g>`;
}

function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const n = (i: number) => {
    const v = Math.max(0, Math.min(255, parseInt(h.slice(i, i + 2), 16) * (1 + amt)));
    return Math.round(v).toString(16).padStart(2, '0');
  };
  return `#${n(0)}${n(2)}${n(4)}`;
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
        <ellipse class="station-shadow" cx="1.5" cy="11" rx="${interchange ? 14 : 11}" ry="3.5" fill="#000" opacity="0.22"/>
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

  // Prefer packages that have a ride path; max 4 trains to avoid chaos
  const byPkg = new Map<string, (typeof replay.events)[0]>();
  for (const ev of replay.events) {
    const prev = byPkg.get(ev.package);
    if (!prev || ev.status === 'running') byPkg.set(ev.package, ev);
  }
  const tasks = Object.keys(turbo);
  const candidates = [...byPkg.values()]
    .map((ev) => ({ ev, ends: shortestPathEndpoints(graph, ev.package) }))
    .filter((x) => x.ends)
    .slice(0, 4);

  const guidePaths: string[] = [];
  const trains = candidates
    .map(({ ev, ends }, i) => {
      const color = taskColor(ev.task, tasks);
      const raw = directedPath(layout, ends!.from, ends!.to);
      const d = offsetPath(raw, pad);
      const pathId = `ride-path-${i}`;
      const dur = 3.2 + (i % 3) * 0.55;
      const begin = i * 0.85;
      guidePaths.push(
        `<path id="${pathId}" d="${d}" fill="none" stroke="none" pointer-events="none"/>`,
      );
      return `
      <g class="tm-train" data-turbometro="train" data-package="${esc(ev.package)}" data-task="${esc(ev.task)}">
        ${trainGlyph3d(color)}
        <animateMotion
          dur="${dur}s"
          begin="${begin}s"
          repeatCount="indefinite"
          rotate="auto"
          calcMode="linear">
          <mpath href="#${pathId}" xlink:href="#${pathId}"/>
        </animateMotion>
      </g>`;
    })
    .join('\n');

  return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${vbW} ${vbH}" width="100%" height="auto" class="metro-svg" role="img" aria-label="Monorepo subway map for ${esc(title)}">
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
    <filter id="boardDepth" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" flood-opacity="0.35"/>
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
    .map.is-dim .tm-train { opacity: 0.2; }
    .tm-train { pointer-events: none; }
    .cartouche .title { fill: var(--map-ink); font-weight: 700; letter-spacing: 0.08em; }
    .cartouche .sub { fill: var(--map-muted); }
    .paused .tm-train animateMotion { animation-play-state: paused; }
    @media (prefers-reduced-motion: reduce) {
      .tm-train animateMotion { repeatCount: 0; }
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
  <g class="guides" aria-hidden="true">${guidePaths.join('\n')}</g>
  <g class="stations">${stations}</g>
  <g class="trains">${trains}</g>
</svg>`;
}
