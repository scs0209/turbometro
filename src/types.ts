export type PackageNode = {
  name: string;
  dir: string;
  /** apps | packages | other — used as dag-map cls */
  kind: string;
};

export type Graph = {
  nodes: PackageNode[];
  /** directed workspace dependency edges [from, to] meaning from depends on to */
  edges: Array<[string, string]>;
};

export type TurboTasks = Record<string, { dependsOn?: string[] }>;

export type ReplayEvent = {
  t: number;
  task: string;
  package: string;
  status: 'running' | 'pass' | 'fail';
};

export type Replay = {
  events: ReplayEvent[];
};

export type CliOptions = {
  cwd: string;
  out: string;
  demo: boolean;
  replayPath: string | null;
  force: boolean;
  /** Include nested packages beyond apps/* / packages/* (depth > 2) */
  deep: boolean;
};
