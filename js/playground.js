/* AtomSpace – Playground Module */

// Globals are in state.js

function initPlayground() {
  const canvas = document.getElementById('playground-canvas'); if (pgRenderer) { pgRenderer.dispose(); cancelAnimationFrame(pgFrame); pgRenderer = null; }
  const isMobile = window.innerWidth < 600; const W = window.innerWidth, H = window.innerHeight;
  canvas.width = W; canvas.height = H; const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.setSize(W, H, false); renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2)); renderer.setClearColor(0x020509, 1);
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x020509, 0.015);
  const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 300); camera.position.set(0, 4, 28); camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0x223355, 3)); const pl = new THREE.PointLight(0x00f5ff, 3, 80); pl.position.set(0, 10, 10); scene.add(pl); const pl2 = new THREE.PointLight(0xff44aa, 2, 60); pl2.position.set(-10, -5, 0); scene.add(pl2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80, 20, 20), new THREE.MeshBasicMaterial({ color: 0x040d18, wireframe: true, transparent: true, opacity: 0.3 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -10; scene.add(floor);
  pgScene = scene; pgCamera = camera; pgRenderer = renderer; pgAtoms = [];
  canvas.addEventListener('dblclick', pgOnDoubleClick); canvas.addEventListener('mousedown', pgOnMouseDown); canvas.addEventListener('mousemove', pgOnMouseMove); canvas.addEventListener('mouseup', pgOnMouseUp);
  canvas.addEventListener('wheel', e => { pgCamera.position.z = Math.max(8, Math.min(60, pgCamera.position.z + e.deltaY * 0.04)); }, { passive: true });
  pgSpawnRandom(4);
  function loop(t) {
    if (currentView !== 'playground') return;
    pgFrame = requestAnimationFrame(loop); pgUpdate(t); renderer.render(scene, camera); pgFpsCount++; if (t - pgFpsLast > 1000) { pgFps = pgFpsCount; pgFpsCount = 0; pgFpsLast = t; setTextSafe('pg-fps', pgFps); }
  }
  loop(0);
}

function pgSpawnAtom(symbol, position, velocity) {
  symbol = symbol || pgSelectedElement; const col = PG_COLORS[symbol] || PG_COLORS.default; const rad = 0.5 + Math.random() * 0.4;
  const pos = position || new THREE.Vector3((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 6 + 4, (Math.random() - 0.5) * 6);
  const vel = velocity || new THREE.Vector3((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.08);
  const group = new THREE.Group(); group.position.copy(pos);
  group.add(new THREE.Mesh(new THREE.SphereGeometry(rad, 14, 14), new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.3, shininess: 100 })));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(rad * 2.2, 0.03, 6, 50), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3 })); ring.rotation.x = Math.random() * Math.PI; group.add(ring);
  const tGeo = new THREE.BufferGeometry(); tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30 * 3), 3));
  const trail = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.4 })); trail.frustumCulled = false; trail.visible = pgTrails; pgScene.add(trail);
  group.userData = { type: 'pgAtom', symbol, radius: rad, col, velocity: vel.clone(), ring, trail, trailPoints: [], mass: rad * 2 };
  pgScene.add(group); pgAtoms.push(group); setTextSafe('pg-atom-count', pgAtoms.length);
  spawnImpactParticles(pos.clone(), col, 0.4); return group;
}

function pgUpdate(time) {
  const FLOOR = -10, WALL = 25;
  for (let i = 0; i < pgAtoms.length; i++) {
    const atom = pgAtoms[i]; const d = atom.userData;
    if (pgForceMode === 0) d.velocity.y -= 0.005;
    else if (pgForceMode === 2) {
      pgAtoms.forEach(other => { if (other === atom) return; const dir = new THREE.Vector3().subVectors(other.position, atom.position); const distSq = dir.lengthSq(); if (distSq < 400 && distSq > 1) { const force = 0.015 * other.userData.mass / distSq; d.velocity.add(dir.normalize().multiplyScalar(force)); } });
    }
    else if (pgForceMode === 3) {
      pgAtoms.forEach(other => { if (other === atom) return; const dir = new THREE.Vector3().subVectors(other.position, atom.position); const dist = dir.length(); if (dist < 15 && dist > 0.1) d.velocity.add(dir.normalize().multiplyScalar(-0.002 * (1 - dist / 15))); });
    }
    d.velocity.multiplyScalar(0.995); atom.position.add(d.velocity);
    if (atom.position.y < FLOOR + d.radius) { atom.position.y = FLOOR + d.radius; d.velocity.y *= -0.7; if (Math.abs(d.velocity.y) > 0.02) spawnImpactParticles(atom.position.clone(), d.col, 0.3); }
    if (Math.abs(atom.position.x) > WALL) { atom.position.x = Math.sign(atom.position.x) * WALL; d.velocity.x *= -0.7; }
    if (Math.abs(atom.position.z) > WALL) { atom.position.z = Math.sign(atom.position.z) * WALL; d.velocity.z *= -0.7; }
    if (d.trail) { d.trailPoints.push(atom.position.clone()); if (d.trailPoints.length > 30) d.trailPoints.shift(); const posAttr = d.trail.geometry.attributes.position; for (let j = 0; j < 30; j++) { const p = d.trailPoints[j] || atom.position; posAttr.setXYZ(j, p.x, p.y, p.z); } posAttr.needsUpdate = true; }
    if (d.ring) d.ring.rotation.z += 0.02;
  }
  if (pgCollisions) {
    for (let i = 0; i < pgAtoms.length; i++) {
      for (let j = i + 1; j < pgAtoms.length; j++) {
        const a = pgAtoms[i], b = pgAtoms[j]; const dist = a.position.distanceTo(b.position), minDist = a.userData.radius + b.userData.radius;
        if (dist < minDist) {
          const normal = new THREE.Vector3().subVectors(a.position, b.position).normalize(); const relVel = new THREE.Vector3().subVectors(a.userData.velocity, b.userData.velocity); const sepVel = relVel.dot(normal);
          if (sepVel < 0) { const impulse = -1.2 * sepVel / (1 / a.userData.mass + 1 / b.userData.mass); const impulseVec = normal.multiplyScalar(impulse); a.userData.velocity.add(impulseVec.clone().multiplyScalar(1 / a.userData.mass)); b.userData.velocity.sub(impulseVec.clone().multiplyScalar(1 / b.userData.mass)); if (dist > 0) { const move = normal.clone().multiplyScalar((minDist - dist) * 0.5); a.position.add(move); b.position.sub(move); } }
        }
      }
    }
  }
  updateImpactParticles();
}

function pgSpawnRandom(n) { for (let i = 0; i < n; i++) setTimeout(() => pgSpawnAtom(), i * 80); }
function pgCycleForce() { pgForceMode = (pgForceMode + 1) % 4; setTextSafe('pg-force-label', PG_FORCE_NAMES[pgForceMode]); toast(`Force Mode: ${PG_FORCE_NAMES[pgForceMode]}`, 'info', '🌀'); }
function pgToggleTrails() { pgTrails = !pgTrails; document.getElementById('pg-trails-btn').classList.toggle('active', pgTrails); pgAtoms.forEach(a => { if (a.userData.trail) a.userData.trail.visible = pgTrails; }); }
function pgToggleCollisions() { pgCollisions = !pgCollisions; document.getElementById('pg-coll-btn').classList.toggle('active', pgCollisions); }
function pgExplodeAll() { pgAtoms.forEach(a => { a.userData.velocity.add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8)); spawnImpactParticles(a.position.clone(), a.userData.col, 1.5); }); playTone(100, 'sawtooth', 0.5, 0.2); }
function pgClear() { pgAtoms.forEach(a => { pgScene.remove(a); if (a.userData.trail) pgScene.remove(a.userData.trail); }); pgAtoms = []; setTextSafe('pg-atom-count', 0); }
let pgLastMousePos = {x:0, y:0};
function pgOnDoubleClick(e) { if (!pgRenderer) return; const rect = pgRenderer.domElement.getBoundingClientRect(); pgMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1; pgMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1; pgRaycaster.setFromCamera(pgMouse, pgCamera); const pos = new THREE.Vector3(); pgRaycaster.ray.at(28, pos); pgSpawnAtom(null, pos); }
function pgOnMouseDown(e) { const rect = pgRenderer.domElement.getBoundingClientRect(); pgMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1; pgMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1; pgLastMousePos = {x: pgMouse.x, y: pgMouse.y}; pgRaycaster.setFromCamera(pgMouse, pgCamera); const hits = pgRaycaster.intersectObjects(pgAtoms, true); if (hits.length) { let obj = hits[0].object; while (obj.parent && obj.userData.type !== 'pgAtom') obj = obj.parent; pgDragAtom = obj; } }
function pgOnMouseMove(e) { if (!pgDragAtom) return; const rect = pgRenderer.domElement.getBoundingClientRect(); const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1, my = -((e.clientY - rect.top) / rect.height) * 2 + 1; const dx = mx - pgLastMousePos.x; const dy = my - pgLastMousePos.y; pgDragAtom.position.x += dx * 15; pgDragAtom.position.y += dy * 15; pgDragAtom.userData.velocity.set(dx * 2, dy * 2, 0); pgLastMousePos = {x: mx, y: my}; }
function pgOnMouseUp() { pgDragAtom = null; }
function pgSelectElement(sym) { pgSelectedElement = sym; document.querySelectorAll('.pg-el-btn').forEach(b => b.classList.toggle('selected', b.dataset.el === sym)); }
function pgToggleGravity() { pgCycleForce(); }
