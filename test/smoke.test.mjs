import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { findWorkspaceRoot } from '../dist/find-root.js';
import { parseWorkspacePackagesList, parseWorkspace } from '../dist/parse-workspace.js';
import { dropCycleEdges } from '../dist/graph.js';
import { scaleGuard } from '../dist/scale.js';
import { stripJsonc } from '../dist/parse-turbo.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = path.join(root, 'fixtures/mini-mono');
const bin = path.join(root, 'bin/turbometro.js');

test('parseWorkspacePackagesList', () => {
  const list = parseWorkspacePackagesList(`packages:\n  - 'apps/*'\n  - "packages/*"\n`);
  assert.deepEqual(list, ['apps/*', 'packages/*']);
});

test('expandGlob recursive **', async () => {
  const { expandGlob } = await import('../dist/parse-workspace.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-glob-'));
  fs.mkdirSync(path.join(tmp, 'apps/web'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'apps/web/package.json'),
    JSON.stringify({ name: '@t/web' }),
  );
  fs.mkdirSync(path.join(tmp, 'apps/web/.next'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'apps/web/.next/package.json'),
    JSON.stringify({ name: 'should-skip' }),
  );
  const dirs = expandGlob(tmp, 'apps/**');
  assert.equal(dirs.length, 1);
  assert.ok(dirs[0].endsWith(path.join('apps', 'web')));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('findWorkspaceRoot from nested cwd', () => {
  const found = findWorkspaceRoot(path.join(fixture, 'apps/web'));
  assert.equal(found, fixture);
});

test('parseWorkspace mini-mono', () => {
  const g = parseWorkspace(fixture);
  assert.ok(g.nodes.length >= 3);
  assert.ok(g.edges.length >= 2);
});

test('dropCycleEdges', () => {
  const g = {
    nodes: [
      { name: 'a', dir: 'a', kind: 'packages' },
      { name: 'b', dir: 'b', kind: 'packages' },
    ],
    edges: [
      ['a', 'b'],
      ['b', 'a'],
    ],
  };
  const { graph, dropped } = dropCycleEdges(g);
  assert.ok(dropped.length >= 1);
  assert.ok(graph.edges.length < g.edges.length);
});

test('scaleGuard', () => {
  assert.equal(scaleGuard(10, false).ok, true);
  assert.ok(scaleGuard(50, false).warn);
  assert.equal(scaleGuard(200, false).ok, false);
  assert.equal(scaleGuard(200, true).ok, true);
});

test('stripJsonc', () => {
  const j = stripJsonc(`{\n  // c\n  "tasks": { "build": {} }\n}`);
  assert.ok(JSON.parse(j).tasks.build);
});

test('CLI --demo writes HTML with 3D scene', () => {
  const out = path.join(os.tmpdir(), `turbometro-demo-${Date.now()}.html`);
  const r = spawnSync(process.execPath, [bin, '--demo', '--out', out], {
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  const html = fs.readFileSync(out, 'utf8');
  assert.match(html, /three@0\.170/);
  assert.match(html, /WebGLRenderer/);
  assert.match(html, /"trains"/);
  assert.match(html, /data-turbometro="map"|id="view"/);
  fs.unlinkSync(out);
});

test('CLI fixture mini-mono', () => {
  const out = path.join(os.tmpdir(), `turbometro-fix-${Date.now()}.html`);
  const r = spawnSync(
    process.execPath,
    [bin, '--cwd', fixture, '--out', out],
    { encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const html = fs.readFileSync(out, 'utf8');
  assert.match(html, /@mini\/web/);
  assert.match(html, /WebGLRenderer/);
  fs.unlinkSync(out);
});

test('CLI without turbo infers scripts (pnpm ** glob)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-infer-'));
  fs.writeFileSync(
    path.join(tmp, 'pnpm-workspace.yaml'),
    "packages:\n  - 'packages/**'\n",
  );
  fs.mkdirSync(path.join(tmp, 'packages/a'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'packages/a/package.json'),
    JSON.stringify({
      name: '@tmp/a',
      scripts: { build: 'echo', lint: 'echo' },
    }),
  );
  const out = path.join(tmp, 'x.html');
  const r = spawnSync(
    process.execPath,
    [bin, '--cwd', tmp, '--out', out],
    { encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stderr + r.stdout, /inferring task legend/i);
  const html = fs.readFileSync(out, 'utf8');
  assert.match(html, /@tmp\/a/);
  fs.rmSync(tmp, { recursive: true, force: true });
});
