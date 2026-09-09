import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { toDagMapInput } from './layout.js';
import type { LayoutResult } from './render-map.js';
import { buildSceneData } from './scene-data.js';
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

  const scene = buildSceneData({
    title: opts.title,
    graph: opts.graph,
    layout,
    turbo: opts.turbo,
    replay: opts.replay,
  });

  const sceneJson = JSON.stringify(scene).replace(/</g, '\\u003c');
  const stationCount = opts.graph.nodes.length;
  const railCount = opts.graph.edges.length;

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="generator" content="turbometro 0.1" />
  <title>turbometro — ${esc(opts.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
    }
  }
  </script>
  <style>
    :root {
      --bg: #070A0F;
      --panel: rgba(14,18,26,0.92);
      --ink: #E8EEF7;
      --muted: #8B97AB;
      --border: #243041;
      --accent: #3DDC97;
      --accent-2: #4C8DFF;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; background: var(--bg); color: var(--ink); font-family: Syne, system-ui, sans-serif; overflow: hidden; }
    .app { height: 100%; display: grid; grid-template-rows: auto 1fr auto; }
    .top, .bottom {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      padding: 0.75rem 1.1rem; background: var(--panel); border-color: var(--border);
      backdrop-filter: blur(14px); z-index: 2;
    }
    .top { border-bottom: 1px solid var(--border); }
    .bottom { border-top: 1px solid var(--border); flex-wrap: wrap; }
    .logo {
      font-weight: 800; font-size: 1.25rem; letter-spacing: -0.04em;
      background: linear-gradient(110deg, var(--accent), var(--accent-2));
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .repo { font-family: "IBM Plex Mono", monospace; font-size: 0.75rem; color: var(--muted); }
    .toolbar { display: flex; gap: 0.35rem; }
    .toolbar button {
      font-family: "IBM Plex Mono", monospace; font-size: 0.7rem; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--ink); background: transparent;
      border: 1px solid var(--border); padding: 0.4rem 0.65rem; cursor: pointer;
    }
    .toolbar button:hover, .toolbar button[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }
    #view {
      position: relative; min-height: 0;
    }
    #view canvas { display: block; width: 100% !important; height: 100% !important; }
    .hud {
      position: absolute; left: 1rem; top: 1rem; z-index: 1;
      pointer-events: none; max-width: min(360px, 80vw);
    }
    .hud h1 { margin: 0; font-size: clamp(1.2rem, 2.4vw, 1.7rem); letter-spacing: -0.03em; }
    .hud p { margin: 0.4rem 0 0; font-family: "IBM Plex Mono", monospace; font-size: 0.72rem; color: var(--muted); line-height: 1.45; }
    .stats {
      position: absolute; right: 1rem; top: 1rem; z-index: 1;
      display: flex; gap: 0.85rem; font-family: "IBM Plex Mono", monospace; font-size: 0.68rem; color: var(--muted);
      pointer-events: none;
    }
    .stats strong { display: block; color: var(--ink); font-family: Syne, sans-serif; font-size: 1rem; }
    .hint {
      position: absolute; left: 50%; bottom: 1rem; transform: translateX(-50%);
      font-family: "IBM Plex Mono", monospace; font-size: 0.68rem; color: var(--muted);
      background: var(--panel); border: 1px solid var(--border); padding: 0.35rem 0.7rem; z-index: 1;
      pointer-events: none;
    }
    .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chip {
      display: inline-flex; align-items: center; gap: 0.35rem;
      font-family: "IBM Plex Mono", monospace; font-size: 0.7rem;
      border: 1px solid var(--border); padding: 0.2rem 0.5rem; color: var(--muted);
    }
    .chip i { width: 1rem; height: 0.25rem; display: inline-block; }
    .note { font-family: "IBM Plex Mono", monospace; font-size: 0.65rem; color: var(--muted); max-width: 28rem; line-height: 1.4; }
    #boot {
      position: absolute; inset: 0; display: grid; place-items: center;
      background: var(--bg); z-index: 3; font-family: "IBM Plex Mono", monospace; font-size: 0.8rem; color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="app">
    <header class="top">
      <div style="display:flex;gap:0.75rem;align-items:baseline;min-width:0">
        <div class="logo">turbometro</div>
        <div class="repo">${esc(opts.title)}</div>
      </div>
      <div class="toolbar">
        <button type="button" id="btn-play" aria-pressed="true">Pause</button>
        <button type="button" id="btn-reset">Reset cam</button>
      </div>
    </header>
    <div id="view">
      <div id="boot">loading 3D network…</div>
      <div class="hud">
        <h1>Monorepo in 3D</h1>
        <p>Drag to orbit · scroll to zoom · real WebGL trains on 3D rails</p>
      </div>
      <div class="stats">
        <div><strong>${stationCount}</strong>stations</div>
        <div><strong>${railCount}</strong>rails</div>
        <div><strong>${scene.trains.length}</strong>trains</div>
      </div>
      <div class="hint">real WebGL scene · not a flat map tilt</div>
    </div>
    <footer class="bottom">
      <div class="chips">${taskChips(opts.turbo)}</div>
      <p class="note">${esc(opts.disclaimer)}</p>
    </footer>
  </div>
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

    const SCENE = ${sceneJson};
    const view = document.getElementById('view');
    const boot = document.getElementById('boot');
    let playing = true;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(view.clientWidth, view.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    view.appendChild(renderer.domElement);
    boot.remove();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a0f);
    scene.fog = new THREE.Fog(0x070a0f, 28, 75);

    const camera = new THREE.PerspectiveCamera(42, view.clientWidth / view.clientHeight, 0.1, 200);
    camera.position.set(14, 12, 16);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 6;
    controls.maxDistance = 48;
    controls.target.set(0, 0.4, 0);

    // Lights
    scene.add(new THREE.AmbientLight(0x8aa0c0, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(10, 18, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 60;
    key.shadow.camera.left = -25;
    key.shadow.camera.right = 25;
    key.shadow.camera.top = 25;
    key.shadow.camera.bottom = -25;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x4c8dff, 0.35);
    fill.position.set(-12, 8, -6);
    scene.add(fill);
    const rim = new THREE.PointLight(0x3ddc97, 1.2, 40);
    rim.position.set(0, 6, 0);
    scene.add(rim);

    // Ground city plate
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(40, 64),
      new THREE.MeshStandardMaterial({ color: 0x0e141d, metalness: 0.2, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(50, 50, 0x1c2736, 0x121924);
    grid.position.y = 0.01;
    scene.add(grid);

    // Center graph around origin
    const allX = SCENE.stations.map(s => s.x);
    const allZ = SCENE.stations.map(s => s.z);
    const cx = (Math.min(...allX) + Math.max(...allX)) / 2 || 0;
    const cz = (Math.min(...allZ) + Math.max(...allZ)) / 2 || 0;
    function world(p) { return new THREE.Vector3(p.x - cx, p.y, p.z - cz); }

    // Rails as lit tubes
    for (const rail of SCENE.rails) {
      const pts = rail.points.map(world);
      if (pts.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.15);
      const geo = new THREE.TubeGeometry(curve, Math.max(20, pts.length * 12), Math.max(0.06, rail.width * 0.55), 10, false);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(rail.color),
        metalness: 0.55,
        roughness: 0.28,
        emissive: new THREE.Color(rail.color),
        emissiveIntensity: 0.22,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      // casing
      const caseGeo = new THREE.TubeGeometry(curve, Math.max(20, pts.length * 12), Math.max(0.1, rail.width * 0.85), 10, false);
      const caseMesh = new THREE.Mesh(caseGeo, new THREE.MeshStandardMaterial({ color: 0x05070b, metalness: 0.4, roughness: 0.7 }));
      caseMesh.position.y = -0.01;
      scene.add(caseMesh);
    }

    // Stations
    const stationMeshes = new Map();
    for (const st of SCENE.stations) {
      const g = new THREE.Group();
      const p = world(st);
      g.position.copy(p);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(st.interchange ? 0.55 : 0.42, st.interchange ? 0.62 : 0.48, 0.18, 24),
        new THREE.MeshStandardMaterial({ color: 0x151c27, metalness: 0.3, roughness: 0.55 })
      );
      base.castShadow = true;
      base.receiveShadow = true;
      g.add(base);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(st.interchange ? 0.48 : 0.36, 0.05, 10, 32),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(st.color),
          emissive: new THREE.Color(st.color),
          emissiveIntensity: 0.55,
          metalness: 0.4,
          roughness: 0.35,
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.16;
      g.add(ring);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.9, 12),
        new THREE.MeshStandardMaterial({ color: 0xdde5f2, metalness: 0.6, roughness: 0.25 })
      );
      pillar.position.y = 0.55;
      pillar.castShadow = true;
      g.add(pillar);

      // label sprite
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(10,14,20,0.82)';
      ctx.roundRect(8, 12, 240, 40, 8); ctx.fill();
      ctx.font = '600 22px IBM Plex Mono, monospace';
      ctx.fillStyle = '#E8EEF7';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.label, 128, 34);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      sprite.scale.set(2.4, 0.6, 1);
      sprite.position.set(0, 1.35, 0);
      g.add(sprite);

      scene.add(g);
      stationMeshes.set(st.id, g);
    }

    // 3D trains
    function makeTrain(colorHex) {
      const color = new THREE.Color(colorHex);
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new RoundedBoxGeometry(0.85, 0.32, 0.38, 2, 0.06),
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.45,
          roughness: 0.3,
          emissive: color,
          emissiveIntensity: 0.25,
        })
      );
      body.castShadow = true;
      g.add(body);
      const cabin = new THREE.Mesh(
        new RoundedBoxGeometry(0.35, 0.28, 0.36, 2, 0.05),
        new THREE.MeshStandardMaterial({ color: color.clone().offsetHSL(0, 0, 0.08), metalness: 0.4, roughness: 0.28 })
      );
      cabin.position.set(0.35, 0.02, 0);
      cabin.castShadow = true;
      g.add(cabin);
      const winMat = new THREE.MeshStandardMaterial({ color: 0xd9ecff, emissive: 0x7eb6ff, emissiveIntensity: 0.35, metalness: 0.1, roughness: 0.15 });
      [[-0.18, 0.06, 0.2], [0.05, 0.06, 0.2], [0.35, 0.06, 0.19]].forEach(([x, y, z]) => {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.02), winMat);
        w.position.set(x, y, z);
        g.add(w);
      });
      // undercarriage
      const under = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.08, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x11161f, metalness: 0.7, roughness: 0.4 })
      );
      under.position.y = -0.18;
      g.add(under);
      return g;
    }

    const trainActors = SCENE.trains.map((t) => {
      const pts = t.points.map(world);
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
      const mesh = makeTrain(t.color);
      scene.add(mesh);
      return { curve, mesh, speed: t.speed, phase: t.phase, package: t.package };
    });

    // Fit camera to content
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    controls.target.copy(center);
    const dist = Math.max(size.x, size.z, 8) * 1.35;
    camera.position.set(center.x + dist * 0.7, center.y + dist * 0.55, center.z + dist * 0.7);
    controls.update();
    const homeCam = camera.position.clone();
    const homeTarget = controls.target.clone();

    document.getElementById('btn-play').addEventListener('click', (e) => {
      playing = !playing;
      e.currentTarget.textContent = playing ? 'Pause' : 'Play';
      e.currentTarget.setAttribute('aria-pressed', playing ? 'true' : 'false');
    });
    document.getElementById('btn-reset').addEventListener('click', () => {
      camera.position.copy(homeCam);
      controls.target.copy(homeTarget);
    });

    const clock = new THREE.Clock();
    function tick() {
      const dt = clock.getDelta();
      controls.update();
      if (playing) {
        const t = clock.elapsedTime;
        for (const tr of trainActors) {
          const u = (tr.phase + t * tr.speed) % 1;
          const p = tr.curve.getPointAt(u);
          const look = tr.curve.getPointAt(Math.min(u + 0.02, 0.999));
          tr.mesh.position.copy(p);
          tr.mesh.lookAt(look);
          tr.mesh.rotateY(Math.PI / 2);
        }
      }
      // gentle rim pulse
      rim.intensity = 1.05 + Math.sin(clock.elapsedTime * 1.4) * 0.25;
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();

    window.addEventListener('resize', () => {
      const w = view.clientWidth, h = view.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  </script>
</body>
</html>
`;
}
