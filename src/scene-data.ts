/**
 * Flatten layoutMetro output into a Three.js-ready scene payload.
 */
import { shortestPathEndpoints } from './graph.js';
import { taskColor } from './replay.js';
import type { Graph, Replay, TurboTasks } from './types.js';
import type { LayoutResult } from './render-map.js';

export type ScenePoint = { x: number; y: number; z: number };

export type SceneData = {
  title: string;
  stations: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    z: number;
    color: string;
    interchange: boolean;
  }>;
  rails: Array<{
    points: ScenePoint[];
    color: string;
    width: number;
  }>;
  trains: Array<{
    id: string;
    package: string;
    task: string;
    color: string;
    points: ScenePoint[];
    speed: number;
    phase: number;
  }>;
};

function shortLabel(name: string): string {
  const parts = name.split('/');
  return parts[parts.length - 1] || name;
}

function pathPoints2d(d: string): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const re = /([ML])\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    pts.push({ x: Number(m[2]), y: Number(m[3]) });
  }
  return pts;
}

function reversePts<T>(arr: T[]): T[] {
  return [...arr].reverse();
}

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function collectSegments(layout: LayoutResult) {
  const out: Array<{ d: string; color: string; thickness: number }> = [];
  for (const route of layout.routePaths) {
    for (const seg of route) {
      out.push({
        d: seg.d,
        color: seg.color,
        thickness: Math.max(seg.thickness, 7),
      });
    }
  }
  for (const seg of layout.extraEdges) {
    out.push({
      d: seg.d,
      color: seg.color,
      thickness: Math.max(seg.thickness * 1.4, 4.5),
    });
  }
  return out;
}

/** Map layout 2D → world 3D (x, elevation, z). */
function to3(
  x: number,
  y: number,
  elev = 0,
  scale = 0.06,
): ScenePoint {
  return { x: x * scale, y: elev, z: y * scale };
}

function directedPoints(
  layout: LayoutResult,
  fromId: string,
  toId: string,
): Array<{ x: number; y: number }> {
  const a = layout.positions.get(fromId);
  const b = layout.positions.get(toId);
  if (!a || !b) return [];
  const segs = collectSegments(layout);
  let best: Array<{ x: number; y: number }> | null = null;
  let bestScore = Infinity;

  for (const s of segs) {
    const pts = pathPoints2d(s.d);
    if (pts.length < 2) continue;
    const start = pts[0]!;
    const end = pts[pts.length - 1]!;
    const fwd = dist(start, a) + dist(end, b);
    const rev = dist(start, b) + dist(end, a);
    if (fwd < bestScore) {
      bestScore = fwd;
      best = pts;
    }
    if (rev < bestScore) {
      bestScore = rev;
      best = reversePts(pts);
    }
  }
  if (best && bestScore < 55) return best;
  return [a, b];
}

const KIND_COLOR: Record<string, string> = {
  apps: '#3DDC97',
  packages: '#4C8DFF',
  other: '#F5A200',
};

export function buildSceneData(opts: {
  title: string;
  graph: Graph;
  layout: LayoutResult;
  turbo: TurboTasks;
  replay: Replay;
}): SceneData {
  const { layout, graph, turbo, replay, title } = opts;
  const scale = 0.055;

  const deg = new Map<string, number>();
  for (const n of graph.nodes) deg.set(n.name, 0);
  for (const [a, b] of graph.edges) {
    deg.set(a, (deg.get(a) ?? 0) + 1);
    deg.set(b, (deg.get(b) ?? 0) + 1);
  }

  const stations = graph.nodes.map((n) => {
    const p = layout.positions.get(n.name)!;
    return {
      id: n.name,
      label: shortLabel(n.name),
      ...to3(p.x, p.y, 0.35, scale),
      color: KIND_COLOR[n.kind] ?? '#4C8DFF',
      interchange: (deg.get(n.name) ?? 0) >= 2,
    };
  });

  const rails = collectSegments(layout).map((seg) => {
    const pts2 = pathPoints2d(seg.d);
    return {
      color: seg.color,
      width: seg.thickness * scale * 0.45,
      points: pts2.map((p) => to3(p.x, p.y, 0.12, scale)),
    };
  });

  const byPkg = new Map<string, (typeof replay.events)[0]>();
  for (const ev of replay.events) {
    const prev = byPkg.get(ev.package);
    if (!prev || ev.status === 'running') byPkg.set(ev.package, ev);
  }
  const tasks = Object.keys(turbo);
  const trains = [...byPkg.values()]
    .map((ev, i) => {
      const ends = shortestPathEndpoints(graph, ev.package);
      if (!ends) return null;
      const pts2 = directedPoints(layout, ends.from, ends.to);
      if (pts2.length < 2) return null;
      return {
        id: `train-${i}`,
        package: ev.package,
        task: ev.task,
        color: taskColor(ev.task, tasks),
        points: pts2.map((p) => to3(p.x, p.y, 0.55, scale)),
        speed: 0.08 + (i % 3) * 0.02,
        phase: i * 0.22,
      };
    })
    .filter(Boolean) as SceneData['trains'];

  return {
    title,
    stations,
    rails: rails.filter((r) => r.points.length >= 2),
    trains: trains.slice(0, 5),
  };
}
