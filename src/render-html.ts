import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { toDagMapInput } from './layout.js';
import { buildMapSvg, type LayoutResult } from './render-map.js';
import { TRANSIT_LAYOUT_THEME } from './theme.js';
import type { Graph, Replay, TurboTasks } from './types.js';
import { taskColor } from './replay.js';

type LayoutMetro = (
  dag: {
    nodes: Array<{ id: string; label: string; cls: string }>;
    edges: Array<[string, string]>;
  },
  options?: Record<string, unknown>,
) => LayoutResult & { theme?: unknown };

async function loadVendor(): Promise<{ layoutMetro: LayoutMetro }> {
  const pkgRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
  );
  const metroUrl = pathToFileURL(
    path.join(pkgRoot, 'vendor/dag-map/src/layout-metro.js'),
  ).href;
  const { layoutMetro } = (await import(metroUrl)) as {
    layoutMetro: LayoutMetro;
  };
  return { layoutMetro };
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function taskChips(turbo: TurboTasks): string {
  const tasks = Object.keys(turbo);
  return tasks
    .map((t) => {
      const c = taskColor(t, tasks);
      return `<span class="chip"><i style="background:${c}"></i>${esc(t)}</span>`;
    })
    .join('');
}

export async function renderMetroHtml(opts: {
  title: string;
  graph: Graph;
  turbo: TurboTasks;
  replay: Replay;
  disclaimer: string;
}): Promise<string> {
  const { layoutMetro } = await loadVendor();
  const dag = toDagMapInput(opts.graph);
  const layout = layoutMetro(dag, {
    routing: 'angular',
    theme: TRANSIT_LAYOUT_THEME,
    scale: 2.15,
    layerSpacing: 48,
    mainSpacing: 46,
    subSpacing: 22,
  });

  const svg = buildMapSvg({
    title: opts.title,
    graph: opts.graph,
    layout,
    turbo: opts.turbo,
    replay: opts.replay,
  });

  const edgeJson = JSON.stringify(opts.graph.edges);
  const stationCount = opts.graph.nodes.length;
  const railCount = opts.graph.edges.length;

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="generator" content="turbometro 0.1" />
  <title>turbometro — ${esc(opts.title)}</title>
  <script>
    (function () {
      try {
        var t = new URLSearchParams(location.search).get('theme');
        if (t !== 'light' && t !== 'dark') {
          try { t = localStorage.getItem('turbometro-theme'); } catch (e) {}
        }
        if (t !== 'light' && t !== 'dark') {
          t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        document.documentElement.setAttribute('data-theme', t);
      } catch (e) {}
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root, [data-theme="dark"] {
      --bg: #0B0F14;
      --bg-elev: #121821;
      --ink: #E8EEF7;
      --muted: #8B97AB;
      --border: #2A3545;
      --accent: #3DDC97;
      --accent-2: #4C8DFF;
      --map-ink: #E8EEF7;
      --map-muted: #8B97AB;
      --map-border: #2A3545;
      --rail-case: #06080C;
      --station-fill: #151C27;
      --label-bg: rgba(18,24,33,0.92);
      --label-bg-active: rgba(61,220,151,0.18);
      --cartouche-bg: rgba(18,24,33,0.92);
      --glow-center: #151C28;
      --glow-edge: #0B0F14;
      --grid-line: rgba(232,238,247,0.045);
      --toolbar: rgba(18,24,33,0.88);
    }
    [data-theme="light"] {
      --bg: #E8EDF4;
      --bg-elev: #F7F9FC;
      --ink: #0E1116;
      --muted: #5A6578;
      --border: #C5CEDA;
      --accent: #00A84D;
      --accent-2: #0039A6;
      --map-ink: #0E1116;
      --map-muted: #5A6578;
      --map-border: #C5CEDA;
      --rail-case: #FFFFFF;
      --station-fill: #FFFFFF;
      --label-bg: rgba(247,249,252,0.95);
      --label-bg-active: rgba(0,168,77,0.14);
      --cartouche-bg: rgba(247,249,252,0.96);
      --glow-center: #F4F7FB;
      --glow-edge: #E8EDF4;
      --grid-line: rgba(14,17,22,0.05);
      --toolbar: rgba(247,249,252,0.92);
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--bg);
      font-family: "Syne", system-ui, sans-serif;
      overflow: hidden;
    }
    .app {
      height: 100%;
      display: grid;
      grid-template-rows: auto 1fr auto;
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid var(--border);
      background: var(--toolbar);
      backdrop-filter: blur(12px);
    }
    .brand {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      min-width: 0;
    }
    .logo {
      font-weight: 800;
      font-size: 1.35rem;
      letter-spacing: -0.04em;
      background: linear-gradient(110deg, var(--accent), var(--accent-2));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      white-space: nowrap;
    }
    .repo {
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.78rem;
      color: var(--muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .toolbar {
      display: flex;
      gap: 0.4rem;
      flex-shrink: 0;
    }
    .toolbar button {
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--ink);
      background: transparent;
      border: 1px solid var(--border);
      padding: 0.45rem 0.7rem;
      cursor: pointer;
      border-radius: 2px;
    }
    .toolbar button:hover, .toolbar button[aria-pressed="true"] {
      border-color: var(--accent);
      color: var(--accent);
    }
    .stage {
      position: relative;
      min-height: 0;
      padding: 1rem 1.25rem 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .hero {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      justify-content: space-between;
      gap: 0.75rem 1.5rem;
    }
    .hero h1 {
      margin: 0;
      font-size: clamp(1.4rem, 2.6vw, 2rem);
      letter-spacing: -0.03em;
      font-weight: 700;
    }
    .hero p {
      margin: 0.35rem 0 0;
      color: var(--muted);
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.78rem;
      max-width: 36rem;
      line-height: 1.45;
    }
    .stats {
      display: flex;
      gap: 1rem;
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.72rem;
      color: var(--muted);
    }
    .stats strong { color: var(--ink); font-size: 1rem; display: block; font-family: Syne, sans-serif; }
    .board-viewport {
      flex: 1;
      min-height: 0;
      perspective: 1600px;
      perspective-origin: 50% 35%;
      display: grid;
      place-items: center;
      padding: 0.5rem 0.75rem 1rem;
    }
    .board {
      width: min(100%, 1080px);
      transform-style: preserve-3d;
      transform: rotateX(var(--tilt-x, 18deg)) rotateZ(var(--tilt-z, -3.5deg)) translateY(-6px);
      transition: transform 80ms linear;
      border: 1px solid var(--border);
      background: var(--bg-elev);
      border-radius: 4px;
      padding: 0.85rem;
      box-shadow:
        0 2px 0 rgba(255,255,255,0.04) inset,
        0 28px 50px rgba(0,0,0,0.45),
        0 8px 16px rgba(0,0,0,0.35),
        0 60px 40px -30px rgba(0,0,0,0.5);
    }
    .board::after {
      content: "";
      position: absolute;
      inset: auto 8% -18px;
      height: 28px;
      background: radial-gradient(ellipse at center, rgba(0,0,0,0.45), transparent 70%);
      filter: blur(6px);
      pointer-events: none;
      z-index: -1;
    }
    .board { position: relative; }
    .board .map { width: 100%; transform: translateZ(12px); }
    .board svg { display: block; width: 100%; height: auto; max-height: calc(100vh - 240px); }
    .bottom {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      align-items: center;
      justify-content: space-between;
      padding: 0.7rem 1.25rem 0.9rem;
      border-top: 1px solid var(--border);
      background: var(--toolbar);
    }
    .chips { display: flex; flex-wrap: wrap; gap: 0.45rem; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.72rem;
      padding: 0.25rem 0.55rem;
      border: 1px solid var(--border);
      color: var(--muted);
    }
    .chip i {
      width: 1.1rem;
      height: 0.28rem;
      display: inline-block;
      border-radius: 1px;
    }
    .note {
      font-family: "IBM Plex Mono", monospace;
      font-size: 0.68rem;
      color: var(--muted);
      max-width: 28rem;
      line-height: 1.4;
    }
    @media (prefers-reduced-motion: reduce) {
      .board { transform: none; box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
    }
  </style>
</head>
<body>
  <div class="app">
    <header class="top">
      <div class="brand">
        <div class="logo">turbometro</div>
        <div class="repo">${esc(opts.title)}</div>
      </div>
      <div class="toolbar">
        <button type="button" id="btn-theme" title="Toggle theme">Theme</button>
        <button type="button" id="btn-play" aria-pressed="true" title="Pause trains">Pause</button>
      </div>
    </header>
    <main class="stage">
      <div class="hero">
        <div>
          <h1>Monorepo line map</h1>
          <p>Packages are stations. Workspace deps are rails. Turbo tasks ride as trains.</p>
        </div>
        <div class="stats">
          <div><strong>${stationCount}</strong>stations</div>
          <div><strong>${railCount}</strong>rails</div>
          <div><strong>${Object.keys(opts.turbo).length}</strong>task lines</div>
        </div>
      </div>
      <div class="board-viewport" id="viewport">
        <div class="board" id="board3d">
          <div class="map" data-turbometro="map" id="map">${svg}</div>
        </div>
      </div>
    </main>
    <footer class="bottom">
      <div class="chips">${taskChips(opts.turbo)}</div>
      <p class="note">${esc(opts.disclaimer)}</p>
    </footer>
  </div>
  <script>
    (function () {
      var edges = ${edgeJson};
      var map = document.getElementById('map');
      var root = document.documentElement;
      var play = document.getElementById('btn-play');
      var themeBtn = document.getElementById('btn-theme');
      var viewport = document.getElementById('viewport');
      var board = document.getElementById('board3d');
      var svg = map.querySelector('svg');
      var paused = false;

      function neighbors(id) {
        var set = {};
        edges.forEach(function (e) {
          if (e[0] === id) set[e[1]] = 1;
          if (e[1] === id) set[e[0]] = 1;
        });
        return set;
      }

      function clearActive() {
        map.classList.remove('is-dim');
        map.querySelectorAll('.is-active,.is-neighbor').forEach(function (el) {
          el.classList.remove('is-active');
          el.classList.remove('is-neighbor');
        });
      }

      map.querySelectorAll('.station').forEach(function (st) {
        st.addEventListener('click', function () {
          var id = st.getAttribute('data-station');
          if (st.classList.contains('is-active') && map.classList.contains('is-dim')) {
            clearActive();
            return;
          }
          clearActive();
          map.classList.add('is-dim');
          st.classList.add('is-active');
          var n = neighbors(id);
          map.querySelectorAll('.station').forEach(function (other) {
            var oid = other.getAttribute('data-station');
            if (n[oid]) other.classList.add('is-neighbor');
          });
        });
      });

      map.addEventListener('click', function (e) {
        if (!e.target.closest('.station')) clearActive();
      });

      themeBtn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('turbometro-theme', next); } catch (e) {}
      });

      play.addEventListener('click', function () {
        paused = !paused;
        if (svg) {
          if (paused) svg.pauseAnimations();
          else svg.unpauseAnimations();
        }
        play.setAttribute('aria-pressed', paused ? 'false' : 'true');
        play.textContent = paused ? 'Play' : 'Pause';
      });

      // Shallow 3D parallax on the board
      viewport.addEventListener('pointermove', function (e) {
        var r = viewport.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5;
        var ny = (e.clientY - r.top) / r.height - 0.5;
        var tiltX = 18 - ny * 10;
        var tiltZ = -3.5 + nx * 8;
        board.style.setProperty('--tilt-x', tiltX.toFixed(2) + 'deg');
        board.style.setProperty('--tilt-z', tiltZ.toFixed(2) + 'deg');
      });
      viewport.addEventListener('pointerleave', function () {
        board.style.setProperty('--tilt-x', '18deg');
        board.style.setProperty('--tilt-z', '-3.5deg');
      });
    })();
  </script>
</body>
</html>
`;
}
