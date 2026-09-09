# turbometro

**Your monorepo as a subway — trains run when turbo does.**

`npx turbometro` turns a **pnpm + Turborepo** workspace into a self-contained **3D subway**: packages are stations, workspace deps are rails, and turbo tasks ride as trains.

![turbometro demo](docs/demo.gif)

> **v0.1 honesty:** trains are **synthetic / replay** by default (not a live turbo attach). Live attach is on the roadmap.

## Quick start

```bash
npx turbometro
# writes ./metro.html — serve it over http (CDN Three.js)
npx --yes serve . -p 4173
# open http://localhost:4173/metro.html
# click a neon station → buildings assemble once → train rides
```

## Demo (this repo)

```bash
npm install
npm run build
node bin/turbometro.js --demo --out metro.html
npx --yes serve . -p 4173
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
| `--demo` | Built-in sample graph (no workspace required) |
| `--replay` | Use a timeline JSON instead of synthetic events |
| `--force` | Bypass the 150-package hard cap |
| `--out` | Output path (default `./metro.html`) |

## Interaction

- **First click** on a station: stop kit assembles piece-by-piece, then the train materializes and rides the dep path
- **Later clicks**: train keeps the mesh — only the path retargets (no flicker)
- Orbit: drag · zoom: scroll · **Clear train** removes the rider

## Requirements

- Node ≥ 20
- Target repo: `pnpm-workspace.yaml` + `turbo.json` or `turbo.jsonc`
- Dependency cycles: **warned** and cycle edges dropped (map still renders)
- Open the HTML via a local static server (`file://` can block ES modules / CDN)

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
