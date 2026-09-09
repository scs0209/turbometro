# turbometro

**Your monorepo as a subway — trains run when turbo does.**

`npx turbometro` turns a **pnpm + Turborepo** workspace into a self-contained subway map: packages are stations, workspace deps are rails, and turbo tasks ride as trains.

> **v0.1 honesty:** trains are **synthetic / replay** by default (not a live turbo attach). Live attach is on the roadmap.

## Demo

```bash
npm run build && node bin/turbometro.js --demo --out metro.html
npx --yes serve . -p 4173
# open http://localhost:4173/metro.html
```

Outputs a **real WebGL 3D scene** (Three.js): orbit camera, lit tube rails, 3D trains on curves. Needs network once for the Three.js CDN (or use a local static server — `file://` can block ES modules).

Record a GIF with [`docs/gif-recipe.md`](docs/gif-recipe.md).


### After npm publish

```bash
npx turbometro
# writes ./metro.html
```

### Before publish (this repo)

```bash
git clone https://github.com/scs0209/turbometro.git
cd turbometro
npm install
npm run build
node bin/turbometro.js --demo --out metro.html
open metro.html
```

Against the fixture:

```bash
node bin/turbometro.js --cwd fixtures/mini-mono --out metro.html
```

## CLI

```
turbometro [--out metro.html] [--replay run.json] [--force] [--cwd dir]
turbometro --demo
```

| Flag | Meaning |
|------|---------|
| `--demo` | Built-in 3-station sample (no workspace required) |
| `--replay` | Use a timeline JSON instead of synthetic events |
| `--force` | Bypass the 150-package hard cap |
| `--out` | Output path (default `./metro.html`) |

## Requirements

- Node ≥ 20
- Target repo: `pnpm-workspace.yaml` + `turbo.json` or `turbo.jsonc`
- Dependency cycles: **warned** and cycle edges dropped (map still renders)

## Replay JSON

```json
{
  "events": [
    { "t": 0, "task": "build", "package": "@mini/web", "status": "running" },
    { "t": 800, "task": "build", "package": "@mini/web", "status": "pass" }
  ]
}
```

## Credits

Metro layout engine vendored from [23min/DAG-map](https://github.com/23min/DAG-map) (Apache-2.0). See `vendor/dag-map/NOTICE`.

## License

MIT — © scs0209
