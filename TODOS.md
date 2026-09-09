# TODOS

## turbometro

### turbo run → replay JSON bridge

**What:** Convert `turbo run` output/logs (or dry-run graph) into `run.json` for `--replay`.

**Why:** Default v0.1 trains are synthetic; a bridge closes the gap with the slogan without requiring live attach.

**Context:** Eng plan D13 follow-up. Prefer stable turbo JSON over brittle log regex. Sketch: `turbometro record -- turbo run build`.

**Effort:** M
**Priority:** P2
**Depends on:** v0.1.0 shipped

### Live turbo attach

**What:** Stream running turbo tasks onto the map in real time.

**Why:** Matches slogan fully for local dashboards.

**Context:** Design v0.2. Not required for README showcase GIF.

**Effort:** L
**Priority:** P3
**Depends on:** v0.1.0

### Headless --gif export

**What:** `turbometro --gif` via Playwright/ffmpeg.

**Why:** Automate README media.

**Context:** Manual recipe lives in `docs/gif-recipe.md` for v0.1.

**Effort:** M
**Priority:** P3
**Depends on:** v0.1.0

## Completed

_(none yet)_
