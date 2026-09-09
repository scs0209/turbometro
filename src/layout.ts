/**
 * Workspace graph → dag-map input
 *
 * Mapping rules (v0.1):
 * - package name → node.id / label
 * - kind (apps|packages|other) → node.cls (theme class colors)
 * - edge [depender, dependency] kept as dag-map edge [from, to]
 * - routes: auto-discovered by layoutMetro (greedy longest-path)
 */
import type { Graph } from './types.js';

const CLS: Record<string, string> = {
  apps: 'pure',
  packages: 'recordable',
  other: 'side_effecting',
};

export type DagMapInput = {
  nodes: Array<{ id: string; label: string; cls: string }>;
  edges: Array<[string, string]>;
};

export function toDagMapInput(graph: Graph): DagMapInput {
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.name,
      label: n.name,
      cls: CLS[n.kind] ?? 'pure',
    })),
    edges: graph.edges.map(([a, b]) => [a, b] as [string, string]),
  };
}
