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
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>turbometro — ${esc(opts.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
  <script type="importmap">
  {"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}
  </script>
  <style>
    :root{--bg:#0c0e12;--panel:rgba(14,16,20,.92);--ink:#e6e9ef;--muted:#8b93a1;--border:#2a303b;--accent:#5b8def;--accent-2:#8fa3bf}
    *{box-sizing:border-box} html,body{height:100%;margin:0;background:var(--bg);color:var(--ink);font-family:Syne,system-ui,sans-serif;overflow:hidden}
    .app{height:100%;display:grid;grid-template-rows:auto 1fr auto}
    .top,.bottom{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.7rem 1rem;background:var(--panel);backdrop-filter:blur(12px);z-index:2}
    .top{border-bottom:1px solid var(--border)}.bottom{border-top:1px solid var(--border);flex-wrap:wrap}
    .logo{font-weight:800;font-size:1.2rem;letter-spacing:-.04em;background:linear-gradient(110deg,var(--accent),var(--accent-2));-webkit-background-clip:text;background-clip:text;color:transparent}
    .repo{font-family:"IBM Plex Mono",monospace;font-size:.72rem;color:var(--muted)}
    .toolbar{display:flex;gap:.35rem}
    .toolbar button{font-family:"IBM Plex Mono",monospace;font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink);background:transparent;border:1px solid var(--border);padding:.35rem .6rem;cursor:pointer}
    .toolbar button:hover{border-color:var(--accent);color:var(--accent)}
    #view{position:relative;min-height:0}
    #view canvas{display:block;width:100%!important;height:100%!important}
    .hud{position:absolute;left:1rem;top:1rem;z-index:1;pointer-events:none;max-width:min(340px,80vw)}
    .hud h1{margin:0;font-size:clamp(1.15rem,2.2vw,1.55rem);letter-spacing:-.03em;text-shadow:0 2px 12px rgba(0,0,0,.25)}
    .hud p{margin:.35rem 0 0;font-family:"IBM Plex Mono",monospace;font-size:.7rem;color:var(--muted);line-height:1.45}
    .stats{position:absolute;right:1rem;top:1rem;z-index:1;display:flex;gap:.8rem;font-family:"IBM Plex Mono",monospace;font-size:.65rem;color:var(--muted);pointer-events:none}
    .stats strong{display:block;color:var(--ink);font-family:Syne,sans-serif;font-size:.95rem}
    .hint{position:absolute;left:50%;bottom:1rem;transform:translateX(-50%);font-family:"IBM Plex Mono",monospace;font-size:.65rem;color:var(--muted);background:var(--panel);border:1px solid var(--border);padding:.3rem .65rem;z-index:1;pointer-events:none}
    .chips{display:flex;flex-wrap:wrap;gap:.35rem}
    .chip{display:inline-flex;align-items:center;gap:.3rem;font-family:"IBM Plex Mono",monospace;font-size:.68rem;border:1px solid var(--border);padding:.18rem .45rem;color:var(--muted)}
    .chip i{width:.9rem;height:.22rem;display:inline-block}
    .note{font-family:"IBM Plex Mono",monospace;font-size:.62rem;color:var(--muted);max-width:26rem;line-height:1.4}
    #boot{position:absolute;inset:0;display:grid;place-items:center;background:#0c0e12;z-index:3;font-family:"IBM Plex Mono",monospace;font-size:.78rem;color:#8b93a1}
  </style>
</head>
<body>
  <div class="app">
    <header class="top">
      <div style="display:flex;gap:.7rem;align-items:baseline;min-width:0">
        <div class="logo">turbometro</div>
        <div class="repo">${esc(opts.title)}</div>
      </div>
      <div class="toolbar">
        <button type="button" id="btn-play" aria-pressed="true">Pause</button>
        <button type="button" id="btn-clear">Clear train</button>
        <button type="button" id="btn-reset">Reset cam</button>
      </div>
    </header>
    <div id="view">
      <div id="boot">loading model…</div>
      <div class="hud">
        <h1 id="hud-title">Select a station</h1>
        <p id="hud-sub">Click a stop · pieces assemble once, then the train rides</p>
      </div>
      <div class="stats">
        <div><strong>${stationCount}</strong>stations</div>
        <div><strong>${railCount}</strong>rails</div>
        <div><strong id="stat-ride">0</strong>active</div>
      </div>
      <div class="hint">click station · drag orbit · scroll zoom</div>
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
    document.getElementById('boot').remove();
    let playing = true;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(view.clientWidth, view.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    view.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12151a);
    scene.fog = new THREE.Fog(0x12151a, 28, 70);

    const camera = new THREE.PerspectiveCamera(36, view.clientWidth / view.clientHeight, 0.1, 200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.45;
    controls.minDistance = 8;
    controls.maxDistance = 40;

    scene.add(new THREE.HemisphereLight(0xb8c4d4, 0x2a2e36, 0.55));
    const sun = new THREE.DirectionalLight(0xf0f2f5, 1.35);
    sun.position.set(14, 24, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 2; sun.shadow.camera.far = 80;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -30;
    sun.shadow.camera.right = sun.shadow.camera.top = 30;
    sun.shadow.bias = -0.0002;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x6a7a90, 0.45);
    fill.position.set(-14, 10, -8); scene.add(fill);

    const allX = SCENE.stations.map(s => s.x);
    const allZ = SCENE.stations.map(s => s.z);
    const cx = (Math.min(...allX) + Math.max(...allX)) / 2 || 0;
    const cz = (Math.min(...allZ) + Math.max(...allZ)) / 2 || 0;
    const span = Math.max(Math.max(...allX) - Math.min(...allX), Math.max(...allZ) - Math.min(...allZ), 8);
    const islandR = span * 0.055 * 0.55 + 6.8;
    function world(p) { return new THREE.Vector3(p.x - cx, p.y, p.z - cz); }
    function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
    const rnd = mulberry32(SCENE.stations.length * 9973 + SCENE.rails.length * 17);

    const mats = {
      slab: new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.82, metalness: 0.12 }),
      edge: new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.75, metalness: 0.2 }),
      asphalt: new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.9, metalness: 0.05 }),
      plaza: new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.7, metalness: 0.15 }),
      concrete: new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: 0.65, metalness: 0.18 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x8a929c, roughness: 0.35, metalness: 0.75 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x1c2836, roughness: 0.15, metalness: 0.85, transparent: true, opacity: 0.85 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.6, metalness: 0.3 }),
      road: new THREE.MeshStandardMaterial({ color: 0x32383f, roughness: 0.92, metalness: 0.08 }),
      buildings: [0x3d434c,0x2f353d,0x454c56,0x252a31,0x505862].map(c =>
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.25 }))
    };
    const rideByPkg = new Map(SCENE.trains.map(t => [t.package, t]));
    const stationMeshes = [];
    let activeTrain = null;
    let selectedId = null;
    const hudTitle = document.getElementById('hud-title');
    const hudSub = document.getElementById('hud-sub');
    const statRide = document.getElementById('stat-ride');

    const worldRoot = new THREE.Group();
    scene.add(worldRoot);

    // Architectural maquette base — concrete slab, not toy island
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(islandR*2.05, 1.1, islandR*2.05), mats.edge);
    cliff.position.y = -0.55; cliff.castShadow = true; cliff.receiveShadow = true; worldRoot.add(cliff);
    const top = new THREE.Mesh(new THREE.BoxGeometry(islandR*2, 0.22, islandR*2), mats.slab);
    top.position.y = 0.05; top.receiveShadow = true; top.castShadow = true; worldRoot.add(top);
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(islandR*1.15, 0.45, islandR*1.15), mats.dark);
    pedestal.position.y = -1.25; pedestal.castShadow = true; worldRoot.add(pedestal);

    // sparse volume blocks (massing study, not candy houses)
    function building(x,z,w,d,h,mi){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mats.buildings[mi%mats.buildings.length]);
      mesh.position.set(x,h/2+0.16,z); mesh.castShadow=true; mesh.receiveShadow=true;
      const win=new THREE.Mesh(new THREE.BoxGeometry(w*0.72,h*0.55,0.03), mats.glass);
      win.position.set(0,0.02,d/2+0.02); mesh.add(win); return mesh;
    }
    for(let i=0;i<18;i++){
      const a=rnd()*Math.PI*2, r=islandR*(0.35+rnd()*0.5);
      const x=Math.cos(a)*r, z=Math.sin(a)*r;
      let ok=true;
      for(const st of SCENE.stations){ const p=world(st); if(Math.hypot(p.x-x,p.z-z)<1.8){ok=false;break;} }
      if(!ok) continue;
      worldRoot.add(building(x,z, 0.45+rnd()*0.7, 0.4+rnd()*0.55, 0.7+rnd()*2.2, Math.floor(rnd()*5)));
    }

    const railY = 1.05;
    for (const rail of SCENE.rails) {
      const pts = rail.points.map(p => { const v=world(p); v.y=railY; return v; });
      if (pts.length<2) continue;
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.22);
      const segs = Math.max(36, pts.length*16);
      const radius = Math.max(0.055, rail.width*0.5);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, radius, 12, false),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(rail.color), metalness:0.3, roughness:0.35, emissive:new THREE.Color(rail.color), emissiveIntensity:0.2 }));
      tube.castShadow=true; tube.receiveShadow=true; worldRoot.add(tube);
      const deck = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, radius*1.75, 8, false), mats.steel);
      deck.position.y=-0.05; deck.castShadow=true; worldRoot.add(deck);
      const n = Math.max(3, Math.floor(curve.getLength()/1.55));
      for(let i=0;i<=n;i++){
        const p=curve.getPointAt(i/n);
        const pillar=new THREE.Mesh(new THREE.BoxGeometry(0.1,Math.max(0.2,p.y-0.19),0.1), mats.concrete);
        pillar.position.set(p.x,(p.y-0.19)/2+0.19,p.z); pillar.castShadow=true; worldRoot.add(pillar);
      }
    }

    for (const st of SCENE.stations) {
      const neon = new THREE.Color(st.color);
      const g=new THREE.Group(); const p=world(st); g.position.set(p.x,0.19,p.z);
      g.userData.stationId = st.id; g.userData.label = st.label; g.userData.color = st.color;
      const plaza=new THREE.Mesh(new THREE.BoxGeometry(st.interchange?2.0:1.55, 0.08, st.interchange?2.0:1.55), mats.asphalt);
      plaza.receiveShadow=true; plaza.castShadow=true; plaza.userData.pick=true; g.add(plaza);
      // neon ground ring
      const ring=new THREE.Mesh(new THREE.TorusGeometry(st.interchange?0.95:0.72, 0.035, 10, 48),
        new THREE.MeshStandardMaterial({ color:neon, emissive:neon, emissiveIntensity:1.35, roughness:0.25, metalness:0.4 }));
      ring.rotation.x=Math.PI/2; ring.position.y=0.06; ring.userData.pick=true; g.add(ring);
      const ringInner=new THREE.Mesh(new THREE.TorusGeometry(st.interchange?0.55:0.42, 0.018, 8, 40),
        new THREE.MeshStandardMaterial({ color:neon, emissive:neon, emissiveIntensity:2.1, roughness:0.2, metalness:0.35 }));
      ringInner.rotation.x=Math.PI/2; ringInner.position.y=0.07; g.add(ringInner);
      const platform=new THREE.Mesh(new THREE.BoxGeometry(st.interchange?1.5:1.15, 0.12, 0.5), mats.concrete);
      platform.position.y=railY-0.35; platform.castShadow=true; platform.userData.pick=true; g.add(platform);
      const canopy=new THREE.Mesh(new THREE.BoxGeometry(st.interchange?1.3:1.0, 0.05, 0.48), mats.steel);
      canopy.position.y=railY+0.2; canopy.castShadow=true; g.add(canopy);
      const accent=new THREE.Mesh(new THREE.BoxGeometry(st.interchange?1.3:1.0, 0.04, 0.05),
        new THREE.MeshStandardMaterial({ color:neon, emissive:neon, emissiveIntensity:1.8, roughness:0.25, metalness:0.45 }));
      accent.position.y=railY+0.16; g.add(accent);
      // neon beacon mast
      const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.045,1.35,10),
        new THREE.MeshStandardMaterial({ color:0x1a1e24, roughness:0.4, metalness:0.7 }));
      mast.position.set(st.interchange?0.55:0.42, 0.75, 0.35); g.add(mast);
      const beacon=new THREE.Mesh(new THREE.SphereGeometry(0.09,12,12),
        new THREE.MeshStandardMaterial({ color:neon, emissive:neon, emissiveIntensity:2.4, roughness:0.15 }));
      beacon.position.set(st.interchange?0.55:0.42, 1.45, 0.35); beacon.userData.pick=true; g.add(beacon);
      const glow=new THREE.PointLight(neon, 0.55, 4.5, 2);
      glow.position.copy(beacon.position); g.add(glow);
      g.userData.neonMats=[ring.material, ringInner.material, accent.material, beacon.material];
      g.userData.glow=glow;
      const nBuild=st.interchange?3:2;
      const props=[];
      for(let i=0;i<nBuild;i++){
        const ang=(i/nBuild)*Math.PI*2+0.4, rr=1.55+rnd()*0.35;
        const b=building(Math.cos(ang)*rr, Math.sin(ang)*rr, 0.4+rnd()*0.35, 0.35+rnd()*0.25, 0.9+rnd()*1.6, Math.floor(rnd()*5));
        b.userData.baseY=b.position.y;
        b.userData.baseScale=1;
        b.scale.setScalar(0);
        b.visible=false;
        props.push(b); g.add(b);
      }
      // platform kit pieces also stagger in on first visit
      [accent, canopy, mast, beacon].forEach(piece=>{
        piece.userData.baseY=piece.position.y;
        piece.userData.baseScale=1;
        piece.scale.setScalar(0);
        piece.visible=false;
        props.push(piece);
      });
      g.userData.props=props;
      g.userData.revealed=false;
      const canvas=document.createElement('canvas'); canvas.width=256; canvas.height=64;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='rgba(10,12,16,0.9)';
      if(ctx.roundRect){ctx.roundRect(10,14,236,36,8);ctx.fill()} else ctx.fillRect(10,14,236,36);
      ctx.strokeStyle=st.color; ctx.lineWidth=3;
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(10,14,236,36,8);ctx.stroke()}
      ctx.font='700 22px IBM Plex Mono, monospace'; ctx.fillStyle=st.color; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(st.label,128,34);
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas), transparent:true, depthTest:false}));
      sprite.scale.set(2.15,0.54,1); sprite.position.set(0,2.1,0); g.add(sprite);
      stationMeshes.push(g); worldRoot.add(g);
    }

    for(let i=0;i<SCENE.stations.length-1;i++){
      if(rnd()>0.5) continue;
      const a=world(SCENE.stations[i]), b=world(SCENE.stations[i+1]);
      const mid=a.clone().lerp(b,0.5), len=a.distanceTo(b);
      const road=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.03,len), mats.road);
      road.position.set(mid.x,0.205,mid.z); road.lookAt(b.x,0.205,b.z); road.receiveShadow=true; worldRoot.add(road);
    }

    function easeOutCubic(x){ return 1-Math.pow(1-x,3); }
    function easeOutBack(x){
      const c1=1.70158, c3=c1+1;
      return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);
    }
    function easeInBack(x){
      const c1=1.70158, c3=c1+1;
      return c3*x*x*x-c1*x*x;
    }

    // bokoko-style: each piece pops in on its own timeline
    function updateStaggerParts(parts, elapsed, partDur, stagger){
      let allDone=true;
      for(let i=0;i<parts.length;i++){
        const part=parts[i];
        const local=Math.min(1, Math.max(0, (elapsed - i*stagger)/partDur));
        if(local<1) allDone=false;
        if(local<=0){
          part.visible=false;
          part.scale.setScalar(0);
          continue;
        }
        part.visible=true;
        const s=Math.max(0.001, easeOutBack(local));
        part.scale.setScalar(s * (part.userData.baseScale||1));
        if(part.userData.baseY!=null){
          part.position.y = part.userData.baseY + (1-easeOutCubic(local))*0.55;
        }
        part.traverse(o=>{
          if(o.material && o.material.transparent){
            o.material.opacity = easeOutCubic(Math.min(1, local*1.2));
          }
        });
      }
      return allDone;
    }

    function snapPartsIn(parts){
      for(const part of parts){
        part.visible=true;
        part.scale.setScalar(part.userData.baseScale||1);
        if(part.userData.baseY!=null) part.position.y=part.userData.baseY;
        part.traverse(o=>{ if(o.material && o.material.transparent) o.material.opacity=1; });
      }
    }

    function makeTrain(colorHex){
      const color=new THREE.Color(colorHex); const g=new THREE.Group();
      const body=new THREE.Mesh(new RoundedBoxGeometry(0.95,0.36,0.42,2,0.07),
        new THREE.MeshStandardMaterial({color, metalness:0.25, roughness:0.3, emissive:color, emissiveIntensity:0.35}));
      body.castShadow=true; g.add(body);
      const car2=new THREE.Mesh(new RoundedBoxGeometry(0.55,0.34,0.4,2,0.06),
        new THREE.MeshStandardMaterial({color:color.clone().offsetHSL(0,-0.05,0.06), roughness:0.35, emissive:color, emissiveIntensity:0.15}));
      car2.position.x=-0.78; car2.castShadow=true; g.add(car2);
      const winMat=new THREE.MeshStandardMaterial({color:0xeaf6ff, emissive:0x7eb6ff, emissiveIntensity:0.25, roughness:0.25});
      [[0.15,0.06,0.22],[-0.2,0.06,0.22],[-0.78,0.06,0.21]].forEach(([x,y,z])=>{
        const w=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.12,0.02), winMat); w.position.set(x,y,z); g.add(w);
      });
      const light=new THREE.Mesh(new THREE.SphereGeometry(0.045,8,8),
        new THREE.MeshStandardMaterial({color:0xfff2c4, emissive:0xffe08a, emissiveIntensity:0.9}));
      light.position.set(0.5,0,0); g.add(light);
      g.visible=false; // shown only when ready to depart
      return g;
    }

    const clock=new THREE.Clock();
    const revealedStations=new Set();

    function disposeObject(obj){
      worldRoot.remove(obj);
      obj.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material){
        if(Array.isArray(o.material)) o.material.forEach(m=>m.dispose()); else o.material.dispose();
      }});
    }

    function disposeTrainNow(){
      if(!activeTrain) return;
      // if we interrupt mid-assemble, keep what was meant to stay
      if(activeTrain.stGroup && activeTrain.phase==='props'){
        snapPartsIn(activeTrain.stGroup.userData.props||[]);
        revealedStations.add(activeTrain.pkgId);
        activeTrain.stGroup.userData.revealed=true;
      }
      disposeObject(activeTrain.mesh);
      activeTrain=null; statRide.textContent='0';
    }

    function clearTrain(animated){
      if(!activeTrain) return;
      if(!animated || activeTrain.phase==='outro' || activeTrain.phase==='arrived'){
        disposeTrainNow();
        return;
      }
      activeTrain.phase='outro';
      activeTrain.t0=clock.getElapsedTime();
      activeTrain.outroFrom=1;
    }

    function setSelection(stGroup){
      for(const s of stationMeshes){
        const on=s===stGroup;
        if(s.userData.neonMats[0]) s.userData.neonMats[0].emissiveIntensity=on?2.8:1.35;
        if(s.userData.neonMats[1]) s.userData.neonMats[1].emissiveIntensity=on?3.4:2.1;
        if(s.userData.neonMats[2]) s.userData.neonMats[2].emissiveIntensity=on?3.0:1.8;
        if(s.userData.neonMats[3]) s.userData.neonMats[3].emissiveIntensity=on?4.2:2.4;
        if(s.userData.glow) s.userData.glow.intensity=on?1.35:0.55;
      }
    }

    function placeTrainOnCurve(mesh, curve, u){
      const p=curve.getPointAt(Math.min(Math.max(u,0),0.999));
      const look=curve.getPointAt(Math.min(u+0.02,0.999));
      mesh.position.copy(p); mesh.lookAt(look); mesh.rotateY(Math.PI/2);
    }

    function beginRide(tr){
      tr.mesh.visible=true;
      tr.mesh.scale.setScalar(1);
      placeTrainOnCurve(tr.mesh, tr.curve, 0);
      tr.phase='ride';
      tr.t0=clock.getElapsedTime();
      hudSub.textContent='task · '+tr.task+' · riding dep path';
      playing=true;
      const playBtn=document.getElementById('btn-play');
      playBtn.textContent='Pause'; playBtn.setAttribute('aria-pressed','true');
    }

    function spawnRide(pkgId, label){
      selectedId=pkgId;
      const stGroup=stationMeshes.find(s=>s.userData.stationId===pkgId) || null;
      setSelection(stGroup);

      // same train already moving / assembling — ignore
      if(activeTrain && activeTrain.pkgId===pkgId && (activeTrain.phase==='ride' || activeTrain.phase==='props')){
        return;
      }

      // already arrived here — depart as-is, no train animation
      if(activeTrain && activeTrain.pkgId===pkgId && activeTrain.phase==='arrived' && activeTrain.curve){
        beginRide(activeTrain);
        hudTitle.textContent=label;
        return;
      }

      disposeTrainNow();
      const ride=rideByPkg.get(pkgId);
      if(!ride){
        hudTitle.textContent=label;
        hudSub.textContent='Terminal stop · no dep ride path';
        if(stGroup && !revealedStations.has(pkgId)){
          activeTrain={
            pkgId, mesh:new THREE.Group(), curve:null, speed:0, task:'',
            phase:'props', t0:clock.getElapsedTime(), stGroup,
            propDur:0.55, propStagger:0.13
          };
          worldRoot.add(activeTrain.mesh);
        }
        return;
      }

      const firstVisit=!revealedStations.has(pkgId);
      const pts=ride.points.map(p=>{ const v=world(p); v.y=railY+0.24; return v; });
      const curve=new THREE.CatmullRomCurve3(pts,false,'catmullrom',0.25);
      const mesh=makeTrain(ride.color);
      placeTrainOnCurve(mesh, curve, 0);
      worldRoot.add(mesh);

      activeTrain={
        pkgId, curve, mesh, speed:ride.speed, task:ride.task, stGroup,
        phase: firstVisit ? 'props' : 'ride',
        t0:clock.getElapsedTime(),
        propDur:0.55, propStagger:0.13,
        outroDur:0.35
      };
      hudTitle.textContent=label;
      statRide.textContent='1';
      if(firstVisit){
        mesh.visible=false;
        hudSub.textContent='task · '+ride.task+' · assembling stop…';
        playing=true;
      } else {
        // stop already built — train just departs, no spawn anim
        beginRide(activeTrain);
      }
      const playBtn=document.getElementById('btn-play');
      playBtn.textContent='Pause'; playBtn.setAttribute('aria-pressed','true');
    }

    const box=new THREE.Box3().setFromObject(worldRoot);
    const center=box.getCenter(new THREE.Vector3());
    const size=box.getSize(new THREE.Vector3());
    controls.target.copy(center);
    const dist=Math.max(size.x,size.z,10)*1.2;
    camera.position.set(center.x+dist*0.9, center.y+dist*0.78, center.z+dist*0.72);
    controls.update();
    const homeCam=camera.position.clone(), homeTarget=controls.target.clone();

    const raycaster=new THREE.Raycaster();
    const pointer=new THREE.Vector2();
    let down={x:0,y:0};

    renderer.domElement.addEventListener('pointerdown', e=>{
      down={x:e.clientX,y:e.clientY};
    });
    renderer.domElement.addEventListener('pointerup', e=>{
      if(Math.hypot(e.clientX-down.x, e.clientY-down.y)>6) return;
      const rect=renderer.domElement.getBoundingClientRect();
      pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
      pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(pointer, camera);
      const hits=raycaster.intersectObjects(stationMeshes, true);
      if(!hits.length) return;
      let obj=hits[0].object;
      while(obj && !obj.userData.stationId) obj=obj.parent;
      if(!obj) return;
      spawnRide(obj.userData.stationId, obj.userData.label);
    });
    renderer.domElement.style.cursor='pointer';

    document.getElementById('btn-play').addEventListener('click', e=>{
      playing=!playing; e.currentTarget.textContent=playing?'Pause':'Play';
      e.currentTarget.setAttribute('aria-pressed', playing?'true':'false');
    });
    document.getElementById('btn-clear').addEventListener('click', ()=>{
      clearTrain(true); selectedId=null; setSelection(null);
      hudTitle.textContent='Select a station';
      hudSub.textContent='Click a neon stop · buildings assemble once, then ride';
    });
    document.getElementById('btn-reset').addEventListener('click', ()=>{
      camera.position.copy(homeCam); controls.target.copy(homeTarget);
    });

    (function tick(){
      const t=clock.getElapsedTime();
      controls.update();
      for(const s of stationMeshes){
        const pulse=0.85+0.15*Math.sin(t*2.2 + s.position.x);
        const sel=s.userData.stationId===selectedId;
        if(s.userData.neonMats[1]) s.userData.neonMats[1].emissiveIntensity=(sel?3.4:2.1)*pulse;
        if(s.userData.glow) s.userData.glow.intensity=(sel?1.35:0.55)*(0.9+0.1*Math.sin(t*3+s.position.z));
      }
      if(activeTrain){
        const tr=activeTrain;
        if(tr.phase==='props'){
          const props=(tr.stGroup && tr.stGroup.userData.props) || [];
          const done=updateStaggerParts(props, t-tr.t0, tr.propDur, tr.propStagger);
          if(done){
            revealedStations.add(tr.pkgId);
            if(tr.stGroup) tr.stGroup.userData.revealed=true;
            if(!tr.curve){
              disposeTrainNow();
              hudSub.textContent='Terminal stop · assembled';
            } else {
              // buildings done — train departs as-is (no train spawn anim)
              beginRide(tr);
            }
          }
        } else if(tr.phase==='outro'){
          const raw=Math.min(1, (t-tr.t0)/tr.outroDur);
          const s=Math.max(0.001, 1-easeInBack(raw));
          tr.mesh.scale.setScalar(s);
          if(raw>=1) disposeTrainNow();
        } else if(tr.phase==='arrived'){
          // parked — no animation
        } else if(playing && tr.phase==='ride'){
          const u=Math.min(1, (t-tr.t0)*tr.speed);
          placeTrainOnCurve(tr.mesh, tr.curve, u);
          if(u>=1){
            tr.phase='arrived';
            hudSub.textContent='task · '+tr.task+' · arrived';
          }
        }
      }
      renderer.render(scene,camera);
      requestAnimationFrame(tick);
    })();
    window.addEventListener('resize', ()=>{
      const w=view.clientWidth, h=view.clientHeight;
      camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h);
    });
  </script>
</body>
</html>
`;
}
