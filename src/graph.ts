import type { Graph } from './types.js';

/** Find edges that participate in a cycle (DFS). */
export function findCycleEdgeKeys(graph: Graph): Set<string> {
  const children = new Map<string, string[]>();
  for (const n of graph.nodes) children.set(n.name, []);
  for (const [from, to] of graph.edges) {
    children.get(from)?.push(to);
  }

  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  for (const n of graph.nodes) color.set(n.name, WHITE);
  const cycleEdges = new Set<string>();

  function dfs(u: string, stack: string[]): void {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of children.get(u) ?? []) {
      const c = color.get(v) ?? WHITE;
      if (c === GRAY) {
        // edge u→v closes a cycle; mark all edges on the cycle path
        const idx = stack.indexOf(v);
        const cycle = stack.slice(idx);
        for (let i = 0; i < cycle.length; i++) {
          const a = cycle[i]!;
          const b = cycle[(i + 1) % cycle.length]!;
          cycleEdges.add(`${a}->${b}`);
        }
        cycleEdges.add(`${u}->${v}`);
      } else if (c === WHITE) {
        dfs(v, stack);
      }
    }
    stack.pop();
    color.set(u, BLACK);
  }

  for (const n of graph.nodes) {
    if (color.get(n.name) === WHITE) dfs(n.name, []);
  }
  return cycleEdges;
}

/** Drop cycle edges; returns new graph + dropped keys. */
export function dropCycleEdges(graph: Graph): {
  graph: Graph;
  dropped: string[];
} {
  const bad = findCycleEdgeKeys(graph);
  if (bad.size === 0) return { graph, dropped: [] };
  const edges = graph.edges.filter(([a, b]) => !bad.has(`${a}->${b}`));
  return {
    graph: { nodes: graph.nodes, edges },
    dropped: [...bad],
  };
}

/** Pick a parent of `pkg` if any (for short train path). */
export function pickParent(graph: Graph, pkg: string): string | null {
  // edges are depender → dependency; train rides from dependency toward depender
  // so "parent" along the ride is a dependency of pkg... wait:
  // Design: short dep path ride into the package that has the task.
  // Event is on package P. Ride along an edge into P.
  // Incoming: someone depends on P? Or P depends on someone?
  // D6: ride short dep path then stop at event package.
  // Heuristic: from a workspace dependency of P (upstream) → P.
  // Our edges are [depender, dependency] i.e. app → ui.
  // So path app→ui means app depends on ui. Train for task on `app` should come from `ui` toward `app`.
  // Edge direction in layout: we passed [app, ui]. For train on app, reverse: ui → app.
  const deps = graph.edges.filter(([from]) => from === pkg).map(([, to]) => to);
  return deps[0] ?? null;
}

export function shortestPathEndpoints(
  graph: Graph,
  pkg: string,
): { from: string; to: string } | null {
  const upstream = pickParent(graph, pkg);
  if (!upstream) return null;
  return { from: upstream, to: pkg };
}
