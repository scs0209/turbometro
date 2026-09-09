# Context — turbometro (for continuing elsewhere)

Ship under **`scs0209/turbometro`**. Slogan: *Your monorepo as a subway — trains run when turbo does.*

## Status

- **v0.1.0 shipped** — GitHub + npm (`npx turbometro`)
- Release: https://github.com/scs0209/turbometro/releases/tag/v0.1.0
- Package: https://www.npmjs.com/package/turbometro

## Product locks (do not reopen casually)

- Trains = turbo **tasks** (synthetic/replay in v0.1, not live attach)
- Stations = workspace packages; rails = workspace deps
- Layout: vendored **23min/DAG-map** (Apache NOTICE; not npm `dag-map`)
- Cycles: warn + drop edges; scale warn≥40 / fail≥150 (`--force`)
- Viewer: Three.js WebGL maquette; station click → assemble once → first train bokoko stagger → later switches keep mesh

## Docs in this folder

| File | What |
|------|------|
| [design-v0.1.md](./design-v0.1.md) | APPROVED design (office-hours) |
| [eng-plan-v0.1.md](./eng-plan-v0.1.md) | LOCKED eng plan |
| [../gif-recipe.md](../gif-recipe.md) | Demo GIF capture notes |
| [../../TODOS.md](../../TODOS.md) | P2/P3 follow-ups |

## Next (from TODOS)

1. **P2** turbo run → replay JSON bridge  
2. **P3** live turbo attach  
3. **P3** headless `--gif`

## Other machine checklist

```bash
git clone https://github.com/scs0209/turbometro.git
cd turbometro && npm install && npm test
# optional gstack: install gstack, then point at this repo + read docs/history/
gh auth switch --user scs0209   # for push
npm login                       # only if publishing (passkey / bypass token)
```

Local-only gstack noise (`~/.gstack/projects/ayaan/timeline.jsonl` 등)는 레포에 없음 — 의사결정은 위 히스토리 문서로 충분.
