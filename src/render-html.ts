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
  const n = opts.graph.nodes.length;
  // denser monorepos need tighter layout so the maquette stays one composition
  const layout = layoutMetro(dag, {
    routing: 'angular',
    theme: TRANSIT_LAYOUT_THEME,
    scale: n > 20 ? 1.55 : n > 12 ? 1.85 : 2.15,
    layerSpacing: n > 20 ? 36 : n > 12 ? 42 : 48,
    mainSpacing: n > 20 ? 34 : n > 12 ? 40 : 46,
    subSpacing: n > 20 ? 16 : 22,
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
      <div class="hint">click hub · zoom for all labels · drag orbit</div>
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
    scene.fog = new THREE.Fog(0x12151a, 40, 140);

    const camera = new THREE.PerspectiveCamera(36, view.clientWidth / view.clientHeight, 0.1, 400);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 6;
    controls.maxDistance = 120;

    scene.add(new THREE.HemisphereLight(0xb8c4d4, 0x2a2e36, 0.55));
    const sun = new THREE.DirectionalLight(0xf0f2f5, 1.35);
    sun.position.set(14, 24, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 2; sun.shadow.camera.far = 80;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -50;
    sun.shadow.camera.right = sun.shadow.camera.top = 50;
    sun.shadow.bias = -0.0002;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x6a7a90, 0.45);
    fill.position.set(-14, 10, -8); scene.add(fill);

    const allX = SCENE.stations.map(s => s.x);
    const allZ = SCENE.stations.map(s => s.z);
    const minX = Math.min(...allX), maxX = Math.max(...allX);
    const minZ = Math.min(...allZ), maxZ = Math.max(...allZ);
    const cx = (minX + maxX) / 2 || 0;
    const cz = (minZ + maxZ) / 2 || 0;
    const spanX = Math.max(maxX - minX, 6);
    const spanZ = Math.max(maxZ - minZ, 6);
    const pad = 3.2;
    const slabW = spanX + pad * 2;
    const slabD = spanZ + pad * 2;
    function world(p) { return new THREE.Vector3(p.x - cx, p.y, p.z - cz); }
    function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
    const rnd = mulberry32(SCENE.stations.length * 9973 + SCENE.rails.length * 17);
    const dense = SCENE.stations.length > 14;

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

    // Architectural maquette base — AABB slab fitted to the network (not a huge empty square)
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(slabW*1.04, 1.0, slabD*1.04), mats.edge);
    cliff.position.y = -0.5; cliff.castShadow = true; cliff.receiveShadow = true; worldRoot.add(cliff);
    const top = new THREE.Mesh(new THREE.BoxGeometry(slabW, 0.2, slabD), mats.slab);
    top.position.y = 0.05; top.receiveShadow = true; top.castShadow = true; worldRoot.add(top);
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(slabW*0.55, 0.4, slabD*0.55), mats.dark);
    pedestal.position.y = -1.15; pedestal.castShadow = true; worldRoot.add(pedestal);

    function building(x,z,w,d,h,mi){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mats.buildings[mi%mats.buildings.length]);
      mesh.position.set(x,h/2+0.16,z); mesh.castShadow=true; mesh.receiveShadow=true;
      const win=new THREE.Mesh(new THREE.BoxGeometry(w*0.72,h*0.55,0.03), mats.glass);
      win.position.set(0,0.02,d/2+0.02); mesh.add(win); return mesh;
    }
    // only a few background masses on small maps — dense graphs stay readable
    if(!dense){
      for(let i=0;i<10;i++){
        const x=(rnd()-0.5)*slabW*0.7, z=(rnd()-0.5)*slabD*0.7;
        let ok=true;
        for(const st of SCENE.stations){ const p=world(st); if(Math.hypot(p.x-x,p.z-z)<2.0){ok=false;break;} }
        if(!ok) continue;
        worldRoot.add(building(x,z, 0.4+rnd()*0.55, 0.35+rnd()*0.45, 0.6+rnd()*1.6, Math.floor(rnd()*5)));
      }
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
      // quiet default massing so empty rings don't look unfinished
      g.add(building(0.85,0.55, 0.32,0.28, 0.55+rnd()*0.45, Math.floor(rnd()*5)));
      const nBuild=st.interchange?2:1;
      const props=[];
      for(let i=0;i<nBuild;i++){
        const ang=(i/nBuild)*Math.PI*2+0.6, rr=1.35+rnd()*0.25;
        const b=building(Math.cos(ang)*rr, Math.sin(ang)*rr, 0.35+rnd()*0.3, 0.3+rnd()*0.22, 0.8+rnd()*1.2, Math.floor(rnd()*5));
        b.userData.baseY=b.position.y;
        b.userData.baseScale=1;
        b.scale.setScalar(0);
        b.visible=false;
        props.push(b); g.add(b);
      }
      [accent, canopy, mast, beacon].forEach(piece=>{
        piece.userData.baseY=piece.position.y;
        piece.userData.baseScale=1;
        piece.scale.setScalar(0);
        piece.visible=false;
        props.push(piece);
      });
      g.userData.props=props;
      g.userData.revealed=false;
      g.userData.prominent=!!st.prominent;
      const canvas=document.createElement('canvas'); canvas.width=256; canvas.height=64;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='rgba(10,12,16,0.92)';
      if(ctx.roundRect){ctx.roundRect(10,14,236,36,8);ctx.fill()} else ctx.fillRect(10,14,236,36);
      ctx.strokeStyle=st.color; ctx.lineWidth=2;
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(10,14,236,36,8);ctx.stroke()}
      ctx.font='700 20px IBM Plex Mono, monospace'; ctx.fillStyle=st.color; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(st.label,128,34);
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas), transparent:true, depthTest:false, depthWrite:false}));
      const lift=1.7 + (st.degree%3)*0.25;
      sprite.scale.set(st.prominent?1.9:1.55, st.prominent?0.48:0.4, 1);
      sprite.position.set(0, lift, 0);
      sprite.userData.isLabel=true;
      sprite.visible = !!st.prominent; // hubs/apps only until zoomed
      g.userData.labelSprite=sprite;
      g.add(sprite);
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

    // bokoko-style: each piece pops in on its own timeline (scale/Y only — never mutate shared material opacity)
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
      }
      return allDone;
    }

    function snapPartsIn(parts){
      for(const part of parts){
        part.visible=true;
        part.scale.setScalar(part.userData.baseScale||1);
        if(part.userData.baseY!=null) part.position.y=part.userData.baseY;
      }
    }

    function makeTrain(colorHex){
      const color=new THREE.Color(colorHex); const g=new THREE.Group();
      const parts=[];
      function part(){
        const pg=new THREE.Group();
        pg.userData.baseScale=1;
        pg.userData.baseY=0;
        pg.position.set(0,0,0);
        parts.push(pg); g.add(pg); return pg;
      }
      function windowPane(x,y,z){
        // BasicMaterial + depthWrite false: never get buried by body / lighting
        const mat=new THREE.MeshBasicMaterial({
          color:0x7ecbff, transparent:false, depthWrite:false
        });
        const w=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.14,0.05), mat);
        w.position.set(x,y,z);
        w.renderOrder=10;
        return w;
      }
      // bokoko reveal order: rear → body → windows → headlight
      const rear=part();
      const car2=new THREE.Mesh(new RoundedBoxGeometry(0.55,0.34,0.4,2,0.06),
        new THREE.MeshStandardMaterial({color:color.clone().offsetHSL(0,-0.05,0.06), roughness:0.35, metalness:0.2, emissive:color, emissiveIntensity:0.15}));
      car2.position.x=-0.78; car2.castShadow=true; car2.name='car2'; rear.add(car2);

      const mid=part();
      const body=new THREE.Mesh(new RoundedBoxGeometry(0.95,0.36,0.42,2,0.07),
        new THREE.MeshStandardMaterial({color, metalness:0.25, roughness:0.3, emissive:color, emissiveIntensity:0.35}));
      body.castShadow=true; body.name='body'; mid.add(body);

      const glass=part();
      glass.name='windows';
      // both flanks, clearly outside body half-depth (0.21)
      [[0.18,0.05,0.28],[-0.18,0.05,0.28],[0.18,0.05,-0.28],[-0.18,0.05,-0.28],
       [-0.78,0.05,0.26],[-0.78,0.05,-0.26]].forEach(([x,y,z])=> glass.add(windowPane(x,y,z)));

      const nose=part();
      const light=new THREE.Mesh(new THREE.SphereGeometry(0.05,10,10),
        new THREE.MeshStandardMaterial({color:0xfff2c4, emissive:0xffe08a, emissiveIntensity:1.1}));
      light.position.set(0.52,0,0); nose.add(light);

      g.userData.parts=parts;
      g.userData.windows=glass;
      return g;
    }

    function recolorTrain(mesh, colorHex){
      const color=new THREE.Color(colorHex);
      const body=mesh.getObjectByName('body');
      const car2=mesh.getObjectByName('car2');
      if(body && body.material){ body.material.color.copy(color); body.material.emissive.copy(color); }
      if(car2 && car2.material){
        const c2=color.clone().offsetHSL(0,-0.05,0.06);
        car2.material.color.copy(c2); car2.material.emissive.copy(color);
      }
    }

    const clock=new THREE.Clock();
    const revealedStations=new Set();
    let sharedTrain=null;
    let trainEverDeparted=false;

    function ensureTrain(colorHex){
      if(!sharedTrain){
        sharedTrain=makeTrain(colorHex);
        sharedTrain.visible=false;
        worldRoot.add(sharedTrain);
      } else {
        recolorTrain(sharedTrain, colorHex);
      }
      return sharedTrain;
    }

    function disposeObject(obj){
      worldRoot.remove(obj);
      obj.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material){
        if(Array.isArray(o.material)) o.material.forEach(m=>m.dispose()); else o.material.dispose();
      }});
    }

    function finishPropsIfNeeded(tr){
      if(!tr || tr.phase!=='props' || !tr.stGroup) return;
      snapPartsIn(tr.stGroup.userData.props||[]);
      revealedStations.add(tr.pkgId);
      tr.stGroup.userData.revealed=true;
    }

    function disposeTrainNow(){
      if(!activeTrain) return;
      finishPropsIfNeeded(activeTrain);
      // only Clear removes the mesh; station switches reuse sharedTrain
      if(sharedTrain && activeTrain.mesh===sharedTrain){
        sharedTrain.visible=false;
      } else if(activeTrain.mesh && activeTrain.mesh!==sharedTrain){
        disposeObject(activeTrain.mesh);
      }
      activeTrain=null; statRide.textContent='0';
    }

    function clearTrain(animated){
      if(!activeTrain && !sharedTrain) return;
      if(sharedTrain){
        disposeObject(sharedTrain);
        sharedTrain=null;
        trainEverDeparted=false;
      }
      activeTrain=null;
      statRide.textContent='0';
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

    const _fwd=new THREE.Vector3(1,0,0);
    const _tan=new THREE.Vector3();
    const _q=new THREE.Quaternion();
    function placeTrainOnCurve(mesh, curve, u){
      // stay slightly before the true end so tangent stays stable (no 90° flip)
      const uu=Math.min(Math.max(u,0), 0.995);
      const p=curve.getPointAt(uu);
      curve.getTangentAt(uu, _tan);
      if(_tan.lengthSq()<1e-10) _tan.set(1,0,0); else _tan.normalize();
      mesh.position.copy(p);
      // train mesh faces +X — align +X to path tangent (no lookAt+rotateY hack)
      _q.setFromUnitVectors(_fwd, _tan);
      mesh.quaternion.copy(_q);
    }

    function beginRide(tr){
      placeTrainOnCurve(tr.mesh, tr.curve, 0);
      tr.mesh.visible=true;
      tr.mesh.scale.setScalar(1);
      playing=true;
      const playBtn=document.getElementById('btn-play');
      playBtn.textContent='Pause'; playBtn.setAttribute('aria-pressed','true');
      statRide.textContent='1';
      // first appearance only — bokoko: parts assemble one-by-one
      if(!trainEverDeparted){
        const parts=tr.mesh.userData.parts||[];
        for(const part of parts){
          part.visible=false;
          part.scale.setScalar(0);
          part.position.y=part.userData.baseY||0;
        }
        tr.phase='intro';
        tr.t0=clock.getElapsedTime();
        tr.partDur=0.52;
        tr.partStagger=0.12;
        hudSub.textContent='task · '+tr.task+' · train assembling…';
        return;
      }
      snapPartsIn(tr.mesh.userData.parts||[]);
      tr.phase='ride';
      tr.t0=clock.getElapsedTime();
      hudSub.textContent='task · '+tr.task+' · riding dep path';
    }

    function spawnRide(pkgId, label){
      selectedId=pkgId;
      const stGroup=stationMeshes.find(s=>s.userData.stationId===pkgId) || null;
      setSelection(stGroup);
      hudTitle.textContent=label;

      // same station — leave train exactly as-is (incl. first intro)
      if(activeTrain && activeTrain.pkgId===pkgId) return;

      // switching stations: finish previous assemble, but NEVER dispose/hide the shared train
      if(activeTrain) finishPropsIfNeeded(activeTrain);

      const ride=rideByPkg.get(pkgId);
      if(!ride){
        hudSub.textContent='Terminal stop · no dep ride path';
        if(stGroup && !revealedStations.has(pkgId)){
          activeTrain={
            pkgId, mesh:sharedTrain || new THREE.Group(), curve:null, speed:0, task:'',
            phase:'props', t0:clock.getElapsedTime(), stGroup,
            propDur:0.55, propStagger:0.13
          };
          if(activeTrain.mesh!==sharedTrain) worldRoot.add(activeTrain.mesh);
        } else if(activeTrain){
          activeTrain.pkgId=pkgId;
          activeTrain.stGroup=stGroup;
          activeTrain.curve=null;
          activeTrain.phase='arrived';
        }
        return;
      }

      const firstVisit=!revealedStations.has(pkgId);
      const pts=ride.points.map(p=>{ const v=world(p); v.y=railY+0.24; return v; });
      const curve=new THREE.CatmullRomCurve3(pts,false,'catmullrom',0.25);
      const mesh=ensureTrain(ride.color);

      activeTrain={
        pkgId, curve, mesh, speed:ride.speed, task:ride.task, stGroup,
        phase: firstVisit ? 'props' : 'ride',
        t0:clock.getElapsedTime(),
        propDur:0.55, propStagger:0.13,
        outroDur:0.35
      };
      hudTitle.textContent=label;
      statRide.textContent=trainEverDeparted || mesh.visible ? '1' : '0';

      if(firstVisit){
        // hide ONLY before the very first departure in the session
        if(!trainEverDeparted) mesh.visible=false;
        hudSub.textContent='task · '+ride.task+' · assembling stop…';
        playing=true;
      } else {
        // other stop / revisit — retarget path, stay visible, no pop
        beginRide(activeTrain);
      }
    }

    const box=new THREE.Box3().setFromObject(worldRoot);
    const center=box.getCenter(new THREE.Vector3());
    const size=box.getSize(new THREE.Vector3());
    controls.target.copy(center);
    const dist=Math.max(size.x, size.z, 10) * (dense ? 0.95 : 1.15);
    camera.position.set(center.x+dist*0.85, center.y+dist*0.72, center.z+dist*0.95);
    controls.maxDistance = Math.max(40, dist * 2.4);
    scene.fog.near = dist * 0.9;
    scene.fog.far = dist * 3.2;
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
      const camDist = camera.position.distanceTo(controls.target);
      const showAllLabels = camDist < Math.max(14, dist * 0.55);
      for(const s of stationMeshes){
        const pulse=0.85+0.15*Math.sin(t*2.2 + s.position.x);
        const sel=s.userData.stationId===selectedId;
        if(s.userData.neonMats[1]) s.userData.neonMats[1].emissiveIntensity=(sel?3.4:2.1)*pulse;
        if(s.userData.glow) s.userData.glow.intensity=(sel?1.35:0.55)*(0.9+0.1*Math.sin(t*3+s.position.z));
        if(s.userData.labelSprite){
          s.userData.labelSprite.visible = sel || s.userData.prominent || showAllLabels;
        }
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
              tr.phase='arrived';
              hudSub.textContent='Terminal stop · assembled';
            } else {
              // buildings done — first show only if never departed; else stay visible
              beginRide(tr);
            }
          }
        } else if(tr.phase==='intro'){
          placeTrainOnCurve(tr.mesh, tr.curve, 0);
          const parts=tr.mesh.userData.parts||[];
          const done=updateStaggerParts(parts, t-tr.t0, tr.partDur, tr.partStagger);
          if(done){
            snapPartsIn(parts);
            if(tr.mesh.userData.windows){
              tr.mesh.userData.windows.visible=true;
              tr.mesh.userData.windows.scale.setScalar(1);
              tr.mesh.userData.windows.position.y=0;
            }
            trainEverDeparted=true;
            tr.phase='ride';
            tr.t0=t;
            hudSub.textContent='task · '+tr.task+' · riding dep path';
          }
        } else if(tr.phase==='outro'){
          const raw=Math.min(1, (t-tr.t0)/tr.outroDur);
          const s=Math.max(0.001, 1-easeInBack(raw));
          tr.mesh.scale.setScalar(s);
          if(raw>=1) disposeTrainNow();
        } else if(tr.phase==='arrived'){
          // parked — no animation
        } else if(playing && tr.phase==='ride'){
          if(tr.mesh.userData.windows && !tr.mesh.userData.windows.visible){
            snapPartsIn(tr.mesh.userData.parts||[]);
          }
          const u=Math.min(1, (t-tr.t0)*tr.speed);
          placeTrainOnCurve(tr.mesh, tr.curve, u);
          if(u>=1){
            placeTrainOnCurve(tr.mesh, tr.curve, 0.995);
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

    // optional capture hook: metro.html?capture=1
    if(location.search.includes('capture')){
      window.__turbometro = {
        stations: SCENE.stations.map(s=>({id:s.id,label:s.label})),
        spawn:(id,label)=>spawnRide(id,label||id),
      };
    }
  </script>
</body>
</html>
`;
}
