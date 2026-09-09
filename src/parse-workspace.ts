import fs from 'node:fs';
import path from 'node:path';
import type { Graph, PackageNode } from './types.js';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  '.cache',
  'dist',
  'build',
  'coverage',
  'out',
  '.output',
  'storybook-static',
]);

/** Minimal pnpm-workspace.yaml packages: list parser (no full YAML dep). */
export function parseWorkspacePackagesList(yamlText: string): string[] {
  const lines = yamlText.split(/\r?\n/);
  const pkgs: string[] = [];
  let inPackages = false;
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '');
    if (/^\s*packages\s*:/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      if (/^\S/.test(line) && !/^\s*-\s*/.test(line)) break;
      const m = line.match(/^\s*-\s*['"]?([^'"]+?)['"]?\s*$/);
      if (m) pkgs.push(m[1]!);
    }
  }
  return pkgs;
}

function kindFromDir(root: string, dir: string): string {
  const rel = path.relative(root, dir).split(path.sep)[0] || 'other';
  if (rel === 'apps') return 'apps';
  if (rel === 'packages') return 'packages';
  return 'other';
}

function isWorkspaceDep(spec: string, workspaceNames: Set<string>): boolean {
  if (spec.startsWith('workspace:')) return true;
  return workspaceNames.has(spec);
}

export type ExpandOpts = {
  /** Max path depth from workspace root (apps/web = 2). Default 2 keeps maps readable. */
  maxDepth?: number;
  workspaceRoot?: string;
};

/** Collect package roots under absBase (dirs with package.json). */
export function findPackageDirs(
  absBase: string,
  recursive: boolean,
  opts: ExpandOpts = {},
): string[] {
  if (!fs.existsSync(absBase)) return [];
  const out: string[] = [];
  const wsRoot = opts.workspaceRoot ?? absBase;
  const maxDepth = opts.maxDepth ?? Infinity;

  function depthOf(dir: string): number {
    const rel = path.relative(wsRoot, dir);
    if (!rel || rel === '.') return 0;
    return rel.split(path.sep).filter(Boolean).length;
  }

  if (!recursive) {
    return fs
      .readdirSync(absBase, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !SKIP_DIRS.has(d.name))
      .map((d) => path.join(absBase, d.name))
      .filter((dir) => {
        if (depthOf(dir) > maxDepth) return false;
        return fs.existsSync(path.join(dir, 'package.json'));
      });
  }

  function walk(dir: string): void {
    const depth = depthOf(dir);
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (
      depth > 0 &&
      depth <= maxDepth &&
      fs.existsSync(path.join(dir, 'package.json'))
    ) {
      out.push(dir);
    }
    if (depth >= maxDepth) return;
    for (const d of entries) {
      if (!d.isDirectory()) continue;
      if (SKIP_DIRS.has(d.name)) continue;
      walk(path.join(dir, d.name));
    }
  }

  walk(absBase);
  return out;
}

/**
 * Expand a pnpm-workspace packages pattern.
 * Supports: `apps`, `apps/*`, `apps/**`, `apps/**\/*`, `packages/*`.
 */
export function expandGlob(
  root: string,
  pattern: string,
  opts: ExpandOpts = {},
): string[] {
  const cleaned = pattern.replace(/\/+$/, '');
  const expandOpts: ExpandOpts = {
    maxDepth: opts.maxDepth ?? 2,
    workspaceRoot: root,
  };
  if (!cleaned.includes('*')) {
    const abs = path.join(root, cleaned);
    if (!fs.existsSync(abs)) return [];
    return findPackageDirs(abs, true, expandOpts);
  }

  const recursive = cleaned.includes('**');
  const base = cleaned
    .replace(/\/\*\*\/\*$/, '')
    .replace(/\/\*\*$/, '')
    .replace(/\/\*$/, '')
    .replace(/\*\*$/, '')
    .replace(/\*$/, '');
  const absBase = path.join(root, base || '.');
  return findPackageDirs(
    absBase,
    recursive || cleaned.endsWith('/**'),
    expandOpts,
  );
}

export function parseWorkspace(
  root: string,
  opts: { deep?: boolean } = {},
): Graph {
  const wsPath = path.join(root, 'pnpm-workspace.yaml');
  if (!fs.existsSync(wsPath)) {
    throw new Error(`Missing pnpm-workspace.yaml in ${root}`);
  }
  const patterns = parseWorkspacePackagesList(fs.readFileSync(wsPath, 'utf8'));
  if (patterns.length === 0) {
    throw new Error('pnpm-workspace.yaml has no packages entries');
  }

  const seen = new Set<string>();
  const maxDepth = opts.deep ? 8 : 2;
  const dirs = patterns
    .flatMap((p) => expandGlob(root, p, { maxDepth, workspaceRoot: root }))
    .filter((dir) => {
      const key = path.resolve(dir);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const nodes: PackageNode[] = [];
  for (const dir of dirs) {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      name?: string;
      private?: boolean;
    };
    if (!pkg.name) continue;
    nodes.push({
      name: pkg.name,
      dir,
      kind: kindFromDir(root, dir),
    });
  }

  if (nodes.length === 0) {
    throw new Error('No workspace packages found');
  }

  const names = new Set(nodes.map((n) => n.name));
  const edges: Array<[string, string]> = [];
  const edgeSet = new Set<string>();

  for (const node of nodes) {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(node.dir, 'package.json'), 'utf8'),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [depName, spec] of Object.entries(deps)) {
      if (!names.has(depName)) continue;
      if (!isWorkspaceDep(spec, names)) continue;
      const key = `${node.name}->${depName}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push([node.name, depName]);
    }
  }

  return { nodes, edges };
}
