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
    :root{--bg:#87b8dc;--panel:rgba(18,24,32,.88);--ink:#f4f7fb;--muted:#c5d0de;--border:#2c3a4d;--accent:#3DDC97;--accent-2:#4C8DFF}
    *{box-sizing:border-box} html,body{height:100%;margin:0;background:linear-gradient(#9ec8e8,#87b8dc 40%,#6fa0c4);color:var(--ink);font-family:Syne,system-ui,sans-serif;overflow:hidden}
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
    #boot{position:absolute;inset:0;display:grid;place-items:center;background:#87b8dc;z-index:3;font-family:"IBM Plex Mono",monospace;font-size:.78rem;color:#1a3044}
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
        <button type="button" id="btn-reset">Reset cam</button>
      </div>
    </header>
    <div id="view">
      <div id="boot">building mini world…</div>
      <div class="hud">
        <h1>Mini metro world</h1>
        <p>Diorama island · elevated rails · orbit to explore</p>
      </div>
      <div class="stats">
        <div><strong>${stationCount}</strong>stations</div>
        <div><strong>${railCount}</strong>rails</div>
        <div><strong>${scene.trains.length}</strong>trains</div>
      </div>
      <div class="hint">drag · scroll · miniature city</div>
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
    scene.background = new THREE.Color(0x9ec8e8);
    scene.fog = new THREE.Fog(0xb7d6ec, 24, 58);

    const camera = new THREE.PerspectiveCamera(36, view.clientWidth / view.clientHeight, 0.1, 200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.45;
    controls.minDistance = 8;
    controls.maxDistance = 40;

    scene.add(new THREE.HemisphereLight(0xfff1d6, 0x6f9e5c, 0.95));
    const sun = new THREE.DirectionalLight(0xfff6e8, 1.6);
    sun.position.set(14, 24, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 2; sun.shadow.camera.far = 80;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -30;
    sun.shadow.camera.right = sun.shadow.camera.top = 30;
    sun.shadow.bias = -0.0002;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xa8c8ff, 0.4);
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
      dirt: new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.92 }),
      grass: new THREE.MeshStandardMaterial({ color: 0x6fbf6a, roughness: 0.88 }),
      grass2: new THREE.MeshStandardMaterial({ color: 0x58a85a, roughness: 1 }),
      water: new THREE.MeshStandardMaterial({ color: 0x5eb3e8, roughness: 0.12, metalness: 0.4, transparent: true, opacity: 0.9 }),
      road: new THREE.MeshStandardMaterial({ color: 0x5c6570, roughness: 0.85 }),
      plaza: new THREE.MeshStandardMaterial({ color: 0xe8e0d4, roughness: 0.75 }),
      concrete: new THREE.MeshStandardMaterial({ color: 0xd9d2c5, roughness: 0.8 }),
      trunk: new THREE.MeshStandardMaterial({ color: 0x8b5a3c, roughness: 0.9 }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x3f9e4a, roughness: 0.75 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.55, metalness: 0.25 }),
      buildings: [0xf2d6c2,0xdfe9f2,0xf7e7a8,0xc9e4d2,0xffd5c8,0xe8d5f0].map(c =>
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.68 }))
    };

    const worldRoot = new THREE.Group();
    scene.add(worldRoot);

    const cliff = new THREE.Mesh(new THREE.CylinderGeometry(islandR*1.02, islandR*1.14, 2.0, 64, 1, true), mats.dirt);
    cliff.position.y = -1.05; cliff.castShadow = true; cliff.receiveShadow = true; worldRoot.add(cliff);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(islandR, islandR, 0.38, 64), mats.grass);
    top.position.y = 0; top.receiveShadow = true; top.castShadow = true; worldRoot.add(top);
    const water = new THREE.Mesh(new THREE.RingGeometry(islandR*1.08, islandR*1.4, 64), mats.water);
    water.rotation.x = -Math.PI/2; water.position.y = -1.65; worldRoot.add(water);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(islandR*0.5, islandR*0.68, 0.6, 48), mats.dark);
    pedestal.position.y = -2.2; pedestal.castShadow = true; worldRoot.add(pedestal);

    for (let i=0;i<8;i++){
      const a=rnd()*Math.PI*2, r=islandR*(0.2+rnd()*0.55);
      const patch=new THREE.Mesh(new THREE.CircleGeometry(0.6+rnd()*1.2, 18), mats.grass2);
      patch.rotation.x=-Math.PI/2; patch.position.set(Math.cos(a)*r, 0.2, Math.sin(a)*r); worldRoot.add(patch);
    }

    function tree(x,z,s=1){
      const g=new THREE.Group();
      const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.05*s,0.07*s,0.35*s,6), mats.trunk);
      tr.position.y=0.18*s; tr.castShadow=true; g.add(tr);
      const lf=new THREE.Mesh(new THREE.SphereGeometry(0.22*s,10,10), mats.leaf);
      lf.position.y=0.45*s; lf.castShadow=true; g.add(lf);
      g.position.set(x,0.19,z); return g;
    }
    for(let i=0;i<32;i++){
      const a=rnd()*Math.PI*2, r=islandR*(0.32+rnd()*0.55);
      const x=Math.cos(a)*r, z=Math.sin(a)*r;
      let ok=true;
      for(const st of SCENE.stations){ const p=world(st); if(Math.hypot(p.x-x,p.z-z)<1.45){ok=false;break;} }
      if(ok) worldRoot.add(tree(x,z,0.65+rnd()*0.8));
    }

    function building(x,z,w,d,h,mi){
      const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,1,0.04), mats.buildings[mi%mats.buildings.length]);
      mesh.position.set(x,h/2+0.19,z); mesh.castShadow=true; mesh.receiveShadow=true;
      const win=new THREE.Mesh(new THREE.BoxGeometry(w*0.65,h*0.5,0.02),
        new THREE.MeshStandardMaterial({color:0x9fd0ff, emissive:0x3a6fa0, emissiveIntensity:0.18, roughness:0.3}));
      win.position.set(0,0.04,d/2+0.01); mesh.add(win); return mesh;
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
      const deck = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, radius*1.9, 8, false), mats.concrete);
      deck.position.y=-0.05; deck.castShadow=true; worldRoot.add(deck);
      const n = Math.max(3, Math.floor(curve.getLength()/1.55));
      for(let i=0;i<=n;i++){
        const p=curve.getPointAt(i/n);
        const pillar=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,Math.max(0.2,p.y-0.19),8), mats.concrete);
        pillar.position.set(p.x,(p.y-0.19)/2+0.19,p.z); pillar.castShadow=true; worldRoot.add(pillar);
      }
    }

    for (const st of SCENE.stations) {
      const g=new THREE.Group(); const p=world(st); g.position.set(p.x,0.19,p.z);
      const plaza=new THREE.Mesh(new THREE.CylinderGeometry(st.interchange?1.2:0.95, st.interchange?1.25:1.0, 0.12, 24), mats.plaza);
      plaza.receiveShadow=true; plaza.castShadow=true; g.add(plaza);
      const platform=new THREE.Mesh(new RoundedBoxGeometry(st.interchange?1.45:1.1, 0.14, 0.55, 1, 0.04), mats.concrete);
      platform.position.y=railY-0.35; platform.castShadow=true; g.add(platform);
      const canopy=new THREE.Mesh(new RoundedBoxGeometry(st.interchange?1.25:0.95, 0.07, 0.52, 1, 0.03),
        new THREE.MeshStandardMaterial({ color:new THREE.Color(st.color), roughness:0.45, metalness:0.15, emissive:new THREE.Color(st.color), emissiveIntensity:0.22 }));
      canopy.position.y=railY+0.18; canopy.castShadow=true; g.add(canopy);
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.15,8), mats.concrete);
      pole.position.set(0.58,0.58,0.38); pole.castShadow=true; g.add(pole);
      const nBuild=st.interchange?5:3;
      for(let i=0;i<nBuild;i++){
        const ang=(i/nBuild)*Math.PI*2+rnd(), rr=1.4+rnd()*0.5;
        g.add(building(Math.cos(ang)*rr, Math.sin(ang)*rr, 0.35+rnd()*0.35, 0.3+rnd()*0.3, 0.55+rnd()*1.45, Math.floor(rnd()*6)));
      }
      const canvas=document.createElement('canvas'); canvas.width=256; canvas.height=64;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='rgba(255,255,255,0.94)';
      if(ctx.roundRect){ctx.roundRect(10,14,236,36,10);ctx.fill()} else ctx.fillRect(10,14,236,36);
      ctx.font='700 22px IBM Plex Mono, monospace'; ctx.fillStyle='#1a2230'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(st.label,128,34);
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas), transparent:true, depthTest:false}));
      sprite.scale.set(2.15,0.54,1); sprite.position.set(0,2.1,0); g.add(sprite);
      worldRoot.add(g);
    }

    for(let i=0;i<SCENE.stations.length-1;i++){
      if(rnd()>0.5) continue;
      const a=world(SCENE.stations[i]), b=world(SCENE.stations[i+1]);
      const mid=a.clone().lerp(b,0.5), len=a.distanceTo(b);
      const road=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.03,len), mats.road);
      road.position.set(mid.x,0.205,mid.z); road.lookAt(b.x,0.205,b.z); road.receiveShadow=true; worldRoot.add(road);
    }

    function makeTrain(colorHex){
      const color=new THREE.Color(colorHex); const g=new THREE.Group();
      const body=new THREE.Mesh(new RoundedBoxGeometry(0.95,0.36,0.42,2,0.07),
        new THREE.MeshStandardMaterial({color, metalness:0.2, roughness:0.35, emissive:color, emissiveIntensity:0.2}));
      body.castShadow=true; g.add(body);
      const car2=new THREE.Mesh(new RoundedBoxGeometry(0.55,0.34,0.4,2,0.06),
        new THREE.MeshStandardMaterial({color:color.clone().offsetHSL(0,-0.05,0.06), roughness:0.35}));
      car2.position.x=-0.78; car2.castShadow=true; g.add(car2);
      const winMat=new THREE.MeshStandardMaterial({color:0xeaf6ff, emissive:0x7eb6ff, emissiveIntensity:0.28, roughness:0.2});
      [[0.15,0.06,0.22],[-0.2,0.06,0.22],[-0.78,0.06,0.21]].forEach(([x,y,z])=>{
        const w=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.12,0.02), winMat); w.position.set(x,y,z); g.add(w);
      });
      const light=new THREE.Mesh(new THREE.SphereGeometry(0.045,8,8),
        new THREE.MeshStandardMaterial({color:0xfff2c4, emissive:0xffe08a, emissiveIntensity:1.3}));
      light.position.set(0.5,0,0); g.add(light); return g;
    }

    const trainActors = SCENE.trains.map(t => {
      const pts=t.points.map(p=>{ const v=world(p); v.y=railY+0.24; return v; });
      const curve=new THREE.CatmullRomCurve3(pts,false,'catmullrom',0.25);
      const mesh=makeTrain(t.color); worldRoot.add(mesh);
      return { curve, mesh, speed:t.speed*0.82, phase:t.phase };
    });

    const box=new THREE.Box3().setFromObject(worldRoot);
    const center=box.getCenter(new THREE.Vector3());
    const size=box.getSize(new THREE.Vector3());
    controls.target.copy(center);
    const dist=Math.max(size.x,size.z,10)*1.2;
    camera.position.set(center.x+dist*0.9, center.y+dist*0.78, center.z+dist*0.72);
    controls.update();
    const homeCam=camera.position.clone(), homeTarget=controls.target.clone();

    document.getElementById('btn-play').addEventListener('click', e=>{
      playing=!playing; e.currentTarget.textContent=playing?'Pause':'Play';
      e.currentTarget.setAttribute('aria-pressed', playing?'true':'false');
    });
    document.getElementById('btn-reset').addEventListener('click', ()=>{
      camera.position.copy(homeCam); controls.target.copy(homeTarget);
    });

    const clock=new THREE.Clock();
    (function tick(){
      const t=clock.getElapsedTime();
      controls.update();
      if(playing){
        for(const tr of trainActors){
          const u=(tr.phase+t*tr.speed)%1;
          const p=tr.curve.getPointAt(u);
          const look=tr.curve.getPointAt(Math.min(u+0.015,0.999));
          tr.mesh.position.copy(p); tr.mesh.lookAt(look); tr.mesh.rotateY(Math.PI/2);
        }
      }
      worldRoot.rotation.y = Math.sin(t*0.12)*0.015;
      worldRoot.position.y = Math.sin(t*0.4)*0.025;
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
