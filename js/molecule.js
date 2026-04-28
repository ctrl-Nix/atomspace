/* AtomSpace – Molecule Builder Module */

// Globals are in state.js

function initMoleculeBuilder() {
  const canvas = document.getElementById('mol-canvas');
  const wrap = document.getElementById('mol-canvas-wrap');
  if (molRenderer) { molRenderer.dispose(); cancelAnimationFrame(molFrame); molRenderer = null; }
  const W = wrap.clientWidth > 10 ? wrap.clientWidth : window.innerWidth;
  const H = wrap.clientHeight > 10 ? wrap.clientHeight : window.innerHeight - 160;
  canvas.width = W; canvas.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(W, H); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0x020509, 1);
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 500); camera.position.set(0, 0, 18);
  scene.add(new THREE.AmbientLight(0x334466, 4));
  const pl1 = new THREE.PointLight(0x00f5ff, 4, 60); pl1.position.set(0, 8, 6); scene.add(pl1);
  const pl2 = new THREE.PointLight(0x0055ff, 2, 40); pl2.position.set(-8, -4, 0); scene.add(pl2);
  const gridHelper = new THREE.GridHelper(40, 20, 0x0a2030, 0x061520); gridHelper.position.y = -8; scene.add(gridHelper);
  molScene = scene; molCamera = camera; molRenderer = renderer; molAtoms = []; molBonds = [];
  canvas.addEventListener('mousedown', molOnMouseDown); canvas.addEventListener('mousemove', molOnMouseMove); canvas.addEventListener('mouseup', molOnMouseUp); canvas.addEventListener('dblclick', molOnDoubleClick);
  canvas.addEventListener('touchstart', molOnTouchStart, { passive: false }); canvas.addEventListener('touchmove', molOnTouchMove, { passive: false });
  canvas.addEventListener('touchend', () => { molDragAtom = null; if (molAutoBond) molDetectAndDrawBonds(); }, { passive: true });
  canvas.addEventListener('wheel', e => { molCamera.position.z = Math.max(5, Math.min(40, molCamera.position.z + e.deltaY * 0.02)); }, { passive: true });
  function loop() {
    if (currentView !== 'molecule') return;
    molFrame = requestAnimationFrame(loop); molUpdate(); renderer.render(scene, camera);
  }
  loop();
}

function molSpawnAtom(symbol, position) {
  symbol = symbol || molSelectedElement; const pos = position || new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4, 0);
  const col = ELEMENT_COLORS[symbol] || ELEMENT_COLORS.default;
  const rad = { H: 0.35, O: 0.6, C: 0.55, N: 0.55, S: 0.75, Na: 0.8, Cl: 0.7, F: 0.5, P: 0.65 }[symbol] || 0.5;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(rad, 20, 20), new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.2, shininess: 120 }));
  mesh.position.copy(pos); mesh.userData = { type: 'molAtom', symbol, velocity: new THREE.Vector3(), charge: 0 };
  mesh.castShadow = true; molScene.add(mesh); molAtoms.push(mesh);
  mesh.add(new THREE.Mesh(new THREE.SphereGeometry(rad * 1.5, 16, 16), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.06, side: THREE.BackSide })));
  const labelSprite = molMakeLabelSprite(symbol, col); labelSprite.position.set(0, rad * 1.6, 0); mesh.add(labelSprite);
  if (molAutoBond) setTimeout(() => molDetectAndDrawBonds(), 50);
  updateMolInfo(); return mesh;
}

function molMakeLabelSprite(symbol, color) {
  const size = 128; const cvs = document.createElement('canvas'); cvs.width = size; cvs.height = size;
  const ctx = cvs.getContext('2d'); ctx.clearRect(0, 0, size, size); ctx.shadowColor = color; ctx.shadowBlur = 18; ctx.fillStyle = '#ffffff'; ctx.font = `bold ${symbol.length > 1 ? 46 : 58}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(symbol, size / 2, size / 2);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cvs), transparent: true, depthTest: false })); sprite.scale.set(1.2, 1.2, 1); return sprite;
}

function molDetectAndDrawBonds() {
  molBonds.forEach(b => molScene.remove(b)); molBonds = []; const BOND_DIST = 3.5;
  for (let i = 0; i < molAtoms.length; i++) {
    for (let j = i + 1; j < molAtoms.length; j++) {
      const a = molAtoms[i], b = molAtoms[j]; const dist = a.position.distanceTo(b.position); const key = `${a.userData.symbol}-${b.userData.symbol}`;
      if (dist < BOND_DIST && BOND_RULES[key] !== undefined) { molBonds.push(molCreateBond(a.position, b.position, a.userData.symbol, b.userData.symbol, dist)); }
    }
  }
  updateMolInfo();
}

function molCreateBond(p1, p2, sym1, sym2, dist) {
  const dir = new THREE.Vector3().subVectors(p2, p1), len = dir.length(), mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const order = BOND_RULES[`${sym1}-${sym2}`] || 1; const bondGroup = new THREE.Group(); bondGroup.userData = { type: 'bond', atom1: sym1, atom2: sym2, order };
  const col = order === 2 ? '#00ff88' : order === 3 ? '#ff44aa' : '#44aaff';
  const offsets = order === 1 ? [0] : order === 2 ? [-0.15, 0.15] : [-0.25, 0, 0.25];
  offsets.forEach(offset => {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 8), new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.3, transparent: true, opacity: 0.85 }));
    cyl.position.copy(mid); cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    if (offset !== 0) { cyl.position.add(new THREE.Vector3(dir.y, -dir.x, 0).normalize().multiplyScalar(offset)); }
    bondGroup.add(cyl);
  });
  molScene.add(bondGroup); return bondGroup;
}

function molUpdate() {
  const t = Date.now() * 0.001;
  molBonds.forEach((bg, bi) => { bg.children.forEach(cyl => { if (cyl.material) cyl.material.emissiveIntensity = 0.2 + Math.sin(t * 2 + bi) * 0.15; }); });
  updateImpactParticles();
  if (molAutoRotate && molCamera) { const radius = molCamera.position.length(); const angle = t * 0.3; molCamera.position.x = Math.sin(angle) * radius; molCamera.position.z = Math.cos(angle) * radius; molCamera.lookAt(0, 0, 0); }
}

function updateMolInfo(preset) {
  const el = document.getElementById('mol-info-content'); if (!el) return;
  if (preset) {
    const btc = preset.bondType === 'ionic' ? 'bond-ionic' : preset.bondType === 'double' ? 'bond-double' : preset.bondType === 'triple' ? 'bond-triple' : 'bond-single';
    el.innerHTML = `<div class="mol-info-header"><div class="mol-info-formula">${preset.formula}</div><div class="mol-info-name">${preset.name}</div></div><div class="mol-info-desc">${preset.desc || ''}</div><div class="mol-info-divider"></div><div class="mol-bond-item"><span class="mol-bond-label">MOL. WEIGHT</span><span class="mol-bond-val mol-val-hl">${preset.mw ? preset.mw + ' g/mol' : '—'}</span></div><div class="mol-bond-item"><span class="mol-bond-label">GEOMETRY</span><span class="mol-bond-val">${preset.geometry || '—'}</span></div><div class="mol-bond-item"><span class="mol-bond-label">POLARITY</span><span class="mol-bond-val"><span class="mol-pol-dot ${(preset.polarity || '').toLowerCase()}"></span>${preset.polarity || '—'}</span></div><div class="mol-bond-item"><span class="mol-bond-label">STATE (STP)</span><span class="mol-bond-val">${preset.state || '—'}</span></div><div class="mol-bond-item"><span class="mol-bond-label">BOND ANGLE</span><span class="mol-bond-val">${preset.angle}°</span></div><div class="mol-bond-item"><span class="mol-bond-label">BOND TYPE</span><span class="mol-bond-val"><span class="bond-type-badge ${btc}">${preset.bondType.toUpperCase()}</span></span></div><div class="mol-info-divider"></div><div class="mol-bond-item"><span class="mol-bond-label">ATOMS</span><span class="mol-bond-val">${preset.atoms.length}</span></div><div class="mol-bond-item"><span class="mol-bond-label">BONDS</span><span class="mol-bond-val">${preset.bonds.length}</span></div>`;
  } else {
    const atomCount = molAtoms.length; const mw = molCalcMolecularWeight(); const formula = atomCount > 0 ? molCalcFormula() : '—';
    el.innerHTML = `<div class="mol-info-header"><div class="mol-info-formula">${formula}</div><div class="mol-info-name">${atomCount > 0 ? 'Custom Molecule' : ''}</div></div>${atomCount > 0 ? '<div class="mol-info-divider"></div>' : ''}${atomCount > 0 ? `<div class="mol-bond-item"><span class="mol-bond-label">ATOMS</span><span class="mol-bond-val">${atomCount}</span></div>` : ''}${atomCount > 0 ? `<div class="mol-bond-item"><span class="mol-bond-label">BONDS</span><span class="mol-bond-val">${molBonds.length}</span></div>` : ''}${atomCount > 0 ? `<div class="mol-bond-item"><span class="mol-bond-label">MOL. WEIGHT</span><span class="mol-bond-val mol-val-hl">${mw} g/mol</span></div>` : ''}${atomCount > 0 ? `<div class="mol-bond-item"><span class="mol-bond-label">FORMULA</span><span class="mol-bond-val">${formula}</span></div>` : ''}${atomCount === 0 ? '<div class="mol-info-empty"><div class="mol-info-empty-icon">⬡</div><div>Select a preset above<br>or add atoms to build</div></div>' : ''}`;
  }
}

function molCalcMolecularWeight() { let mw = 0; molAtoms.forEach(a => { mw += (ELEMENT_MASSES[a.userData.symbol] || 0); }); return mw.toFixed(2); }
function molCalcFormula() {
  const counts = {}; molAtoms.forEach(a => { counts[a.userData.symbol] = (counts[a.userData.symbol] || 0) + 1; }); const order = ['C', 'H'];
  const keys = Object.keys(counts).sort((a, b) => { const ai = order.indexOf(a), bi = order.indexOf(b); if (ai !== -1 && bi !== -1) return ai - bi; if (ai !== -1) return -1; if (bi !== -1) return 1; return a.localeCompare(b); });
  const subs = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  return keys.map(k => k + (counts[k] > 1 ? String(counts[k]).split('').map(c => subs[c] || c).join('') : '')).join('');
}

function molLoadPreset(name) {
  molClearAll(); const preset = MOLECULE_PRESETS[name]; if (!preset) return; molCurrentPreset = preset;
  preset.atoms.forEach(a => molSpawnAtom(a.s, new THREE.Vector3(a.pos[0], a.pos[1], a.pos[2])));
  setTimeout(() => { molDetectAndDrawBonds(); updateMolInfo(preset); molCenterCamera(); }, 120);
  document.querySelectorAll('.mol-preset-pill').forEach(p => p.classList.toggle('active', p.dataset.preset === name));
  toast(`Loaded ${preset.name}`, 'success', '⬡'); playTone(440, 'sine', 0.3, 0.05);
}

function molClearAll() { molAtoms.forEach(a => molScene.remove(a)); molBonds.forEach(b => molScene.remove(b)); molAtoms = []; molBonds = []; molCurrentPreset = null; document.querySelectorAll('.mol-preset-pill').forEach(p => p.classList.remove('active')); updateMolInfo(); }
function molUndoLastAtom() { if (!molAtoms.length) return; const last = molAtoms.pop(); molScene.remove(last); if (molAutoBond) molDetectAndDrawBonds(); updateMolInfo(); toast('Removed last atom', 'info', '↩'); }
function molToggleRotate() { molAutoRotate = !molAutoRotate; document.getElementById('mol-rotate-btn').classList.toggle('active-btn', molAutoRotate); toast(`Auto-rotate ${molAutoRotate ? 'ON' : 'OFF'}`, 'info', '⟳'); }
function molToggleAutoBond() { molAutoBond = !molAutoBond; document.getElementById('mol-auto-bond-btn').style.color = molAutoBond ? 'var(--nc)' : 'var(--t3)'; toast(`Auto-bond ${molAutoBond ? 'ON' : 'OFF'}`, 'info', '⚡'); }

function molScreenToWorld(clientX, clientY) {
  const rect = molRenderer.domElement.getBoundingClientRect(); molMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1; molMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  molRaycaster.setFromCamera(molMouse, molCamera); const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); const target = new THREE.Vector3(); molRaycaster.ray.intersectPlane(plane, target); return target;
}

let molLastTap = 0;
function molOnTouchStart(e) { if (e.touches.length === 1) { const t = e.touches[0]; const rect = molRenderer.domElement.getBoundingClientRect(); molMouse.x = ((t.clientX - rect.left) / rect.width) * 2 - 1; molMouse.y = -((t.clientY - rect.top) / rect.height) * 2 + 1; molRaycaster.setFromCamera(molMouse, molCamera); const hits = molRaycaster.intersectObjects(molAtoms); if (hits.length > 0) { molDragAtom = hits[0].object; molDragOffset.copy(hits[0].point).sub(molDragAtom.position); } else { const now = Date.now(); if (now - molLastTap < 300) molSpawnAtom(molSelectedElement, molScreenToWorld(t.clientX, t.clientY)); molLastTap = now; } } }
function molOnTouchMove(e) { if (!molDragAtom || e.touches.length !== 1) return; molDragAtom.position.copy(molScreenToWorld(e.touches[0].clientX, e.touches[0].clientY)).sub(molDragOffset); if (molAutoBond) molDetectAndDrawBonds(); }
function molOnMouseDown(e) { const rect = molRenderer.domElement.getBoundingClientRect(); molMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1; molMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1; molRaycaster.setFromCamera(molMouse, molCamera); const hits = molRaycaster.intersectObjects(molAtoms); if (hits.length > 0) { molDragAtom = hits[0].object; molDragOffset.copy(hits[0].point).sub(molDragAtom.position); } }
function molOnMouseMove(e) { if (!molDragAtom) return; molDragAtom.position.copy(molScreenToWorld(e.clientX, e.clientY)).sub(molDragOffset); if (molAutoBond) molDetectAndDrawBonds(); }
function molOnMouseUp() { molDragAtom = null; if (molAutoBond) molDetectAndDrawBonds(); }
function molOnDoubleClick(e) { const rect = molRenderer.domElement.getBoundingClientRect(); molMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1; molMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1; molRaycaster.setFromCamera(molMouse, molCamera); const hits = molRaycaster.intersectObjects(molAtoms); if (hits.length === 0) { molSpawnAtom(molSelectedElement, molScreenToWorld(e.clientX, e.clientY)); } }

function molSelectElement(sym) {
  molSelectedElement = sym;
  document.querySelectorAll('.mol-el-btn').forEach(b => b.classList.toggle('selected', b.dataset.el === sym));
  toast(`Selected ${sym}`, 'info', '⚛');
}

function molCenterCamera() {
  if (!molCamera || !molAtoms.length) return; const box = new THREE.Box3(); molAtoms.forEach(a => box.expandByPoint(a.position)); const targetZ = Math.max(8, box.getSize(new THREE.Vector3()).length() * 2.2);
  gsap.to(molCamera.position, { x: 0, y: 0, z: targetZ, duration: 1, onUpdate: () => molCamera.lookAt(0, 0, 0) });
}
