/* AtomSpace – Atom Viewer & AR Module */

// Globals are in state.js

function buildAtomGeometry(group, electrons, el) {
  group.clear();
  electrons.length = 0;
  if (!el) return;

  const nR = 0.5 + Math.log10(el.n || 1) * 0.8;
  const elColor = new THREE.Color(el.color || '#00f5ff');
  const shells = el.shells || [1];
  const isMobile = window.innerWidth < 600;
  const hiQ = !isMobile;

  // Nucleus
  const nucleusGroup = new THREE.Group();
  nucleusGroup.name = 'nucleus';
  const protons = el.n;
  const nucleons = Math.round(el.m || el.n * 2);
  const maxNuc = isMobile ? 18 : 50;

  for (let i = 0; i < Math.min(nucleons, maxNuc); i++) {
    const isP = i < protons;
    const seg = hiQ ? 10 : 7;
    const geo = new THREE.SphereGeometry(0.09 + Math.random() * 0.025, seg, seg);
    const col = isP ? new THREE.Color(0xff5533) : new THREE.Color(0x3366ff);
    const emi = isP ? new THREE.Color(0x661100) : new THREE.Color(0x001155);
    const mat = new THREE.MeshPhongMaterial({ color: col, emissive: emi, shininess: 100, specular: 0x444444 });
    const s = new THREE.Mesh(geo, mat);
    const phi = Math.acos(-1 + (2 * i) / Math.max(nucleons, 1));
    const th = Math.sqrt(nucleons * Math.PI) * phi;
    const r = nR * (0.6 + Math.random() * 0.38);
    s.position.set(r * Math.cos(th) * Math.sin(phi), r * Math.sin(th) * Math.sin(phi), r * Math.cos(phi));
    nucleusGroup.add(s);
  }

  // Nucleus glow
  [{ scale: 1.15, op: 0.22, side: THREE.FrontSide }, { scale: 1.55, op: 0.09, side: THREE.BackSide }, { scale: 2.2, op: 0.04, side: THREE.BackSide }].forEach(({ scale, op, side }) => {
    const g = new THREE.SphereGeometry(nR * scale, 16, 16);
    const m = new THREE.MeshBasicMaterial({ color: elColor, transparent: true, opacity: op, side, blending: THREE.AdditiveBlending, depthWrite: false });
    nucleusGroup.add(new THREE.Mesh(g, m));
  });

  const pulseMat = new THREE.MeshBasicMaterial({ color: elColor, transparent: true, opacity: 0.04, wireframe: true });
  const pulseMesh = new THREE.Mesh(new THREE.SphereGeometry(nR * 1.9, 14, 14), pulseMat);
  pulseMesh.name = 'nucleus-pulse';
  nucleusGroup.add(pulseMesh);
  group.add(nucleusGroup);

  // Electron Shells
  const SHELL_HUES = [185, 210, 270, 330, 20, 55, 120];
  const SHELL_TILTS = [{ rx: Math.PI * 0.5, ry: 0 }, { rx: Math.PI * 0.3, ry: Math.PI * 0.4 }, { rx: Math.PI * 0.1, ry: Math.PI * 0.3 }, { rx: Math.PI * 0.8, ry: Math.PI * 0.15 }, { rx: Math.PI * 0.25, ry: Math.PI * 0.7 }, { rx: Math.PI * 0.6, ry: Math.PI * 0.5 }, { rx: Math.PI * 0.35, ry: Math.PI }];

  shells.forEach((count, si) => {
    const radius = nR * 2.3 + si * 1.45 + 1.1;
    const hue = SHELL_HUES[si % SHELL_HUES.length];
    const shellCol = new THREE.Color(`hsl(${hue},100%,65%)`);
    const tilt = SHELL_TILTS[si % SHELL_TILTS.length];
    const speed = 0.50 / (si * 0.42 + 1);
    const rSeg = hiQ ? 130 : 64;

    [[0.018, 0.55], [0.07, 0.09], [0.20, 0.025]].forEach(([tube, op]) => {
      const geo = new THREE.TorusGeometry(radius, tube, tube > 0.1 ? 4 : 8, rSeg);
      const mat = new THREE.MeshBasicMaterial({ color: shellCol, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = tilt.rx; ring.rotation.y = tilt.ry;
      ring.name = tube === 0.018 ? 'ring' : '';
      ring.userData = { glowRing: true, shellIdx: si, baseRadius: radius, shellCol, tiltRx: tilt.rx, tiltRy: tilt.ry };
      group.add(ring);
    });

    const eCount = Math.min(count, 8);
    for (let ei = 0; ei < eCount; ei++) {
      const baseAngle = (ei / eCount) * Math.PI * 2;
      const eGeo = new THREE.SphereGeometry(0.115, hiQ ? 12 : 8, hiQ ? 12 : 8);
      const eMat = new THREE.MeshPhongMaterial({ color: shellCol, emissive: shellCol, emissiveIntensity: 1.3, shininess: 220, specular: new THREE.Color(0xffffff) });
      const electron = new THREE.Mesh(eGeo, eMat);
      electron.userData = { type: 'electron', shell: si, idx: ei, baseAngle, radius, speed, tiltX: tilt.rx, tiltY: tilt.ry, velocityBoost: 0, shellCol };
      group.add(electron);
      electrons.push(electron);

      const hGeo = new THREE.SphereGeometry(0.30, 8, 8);
      const hMat = new THREE.MeshBasicMaterial({ color: shellCol, transparent: true, opacity: 0.20, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide });
      const halo = new THREE.Mesh(hGeo, hMat);
      halo.userData = { type: 'trail', parentElectron: electron, isHalo: true };
      group.add(halo); electrons.push(halo);

      const tCount = hiQ ? 5 : 3;
      for (let t = 1; t <= tCount; t++) {
        const tr = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.025, 0.09 - t * 0.013), 6, 6), new THREE.MeshBasicMaterial({ color: shellCol, transparent: true, opacity: 0.5 * Math.pow(0.62, t), blending: THREE.AdditiveBlending, depthWrite: false }));
        tr.userData = { type: 'trail', parentElectron: electron, trailOffset: t * 0.25 };
        group.add(tr); electrons.push(tr);
      }
    }
  });

  const pCount = isMobile ? 160 : 380;
  const pPos = new Float32Array(pCount * 3);
  const baseR = shells.length * 1.5 + 2.0;
  for (let i = 0; i < pCount; i++) {
    const r = baseR + Math.random() * 5, th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI;
    pPos[i * 3] = r * Math.sin(ph) * Math.cos(th); pPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); pPos[i * 3 + 2] = r * Math.cos(ph);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: elColor, size: isMobile ? 0.065 : 0.055, transparent: true, opacity: 0.5, sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.name = 'particles';
  group.add(pts);
  group.userData.particles = pts;
  group.userData.elColor = elColor;
  group.userData.nucleusRadius = nR;

  buildEnergyParticleField(group, el, shells.length);
  initElectronPhysics(electrons);
}

function animateAtom(group, electrons, time) {
  const t = time * 0.001;
  const pulse = group.getObjectByName('nucleus-pulse');
  if (pulse) {
    pulse.scale.setScalar(1 + Math.sin(t * 2.2) * 0.07);
    pulse.material.opacity = 0.03 + Math.sin(t * 2.2) * 0.018;
  }
  const nucGroup = group.getObjectByName('nucleus');
  if (nucGroup) { nucGroup.rotation.y += 0.004; nucGroup.rotation.x += 0.002; }

  explodeFactor = explodeMode ? Math.min(1, explodeFactor + 0.025) : Math.max(0, explodeFactor - 0.025);

  electrons.forEach(obj => {
    const d = obj.userData;
    if (d.type === 'electron') {
      const angle = d.baseAngle + t * (d.speed + Math.abs(d.velocityBoost || 0) * 0.1);
      d.baseAngle += (d.velocityBoost || 0) * 0.04;
      d.velocityBoost = (d.velocityBoost || 0) * 0.91;
      const r = (d.radius + explodeFactor * d.shell * 0.9);
      const ph = d.physics;
      const rx = ph ? ph.repelVelocity.x : 0, ry = ph ? ph.repelVelocity.y : 0, rz = ph ? ph.repelVelocity.z : 0;
      const ca = Math.cos(angle), sa = Math.sin(angle), cx = Math.cos(d.tiltX), sx = Math.sin(d.tiltX), cy = Math.cos(d.tiltY), sy = Math.sin(d.tiltY);
      const lx = r * ca, ly = r * sa * cx, lz = r * sa * sx;
      obj.position.set(lx * cy - lz * sy + rx, ly + ry, lx * sy + lz * cy + rz);
      if (obj.material && obj.material.emissiveIntensity !== undefined) {
        const targetEmi = 1.3 + Math.abs(d.velocityBoost || 0) * 4 + Math.sin(t * 3 + d.idx * 1.5) * 0.2;
        obj.material.emissiveIntensity += (targetEmi - obj.material.emissiveIntensity) * 0.15;
      }
    } else if (d.type === 'trail') {
      const pe = d.parentElectron;
      if (!pe || !pe.userData) return;
      if (d.isHalo) { obj.position.copy(pe.position); obj.material.opacity = 0.15 + Math.sin(t * 4 + pe.userData.idx) * 0.05; return; }
      const trailAngle = pe.userData.baseAngle + t * pe.userData.speed - d.trailOffset;
      const r = pe.userData.radius + explodeFactor * pe.userData.shell * 0.9;
      const ca = Math.cos(trailAngle), sa = Math.sin(trailAngle), cx = Math.cos(pe.userData.tiltX), sx = Math.sin(pe.userData.tiltX), cy = Math.cos(pe.userData.tiltY), sy = Math.sin(pe.userData.tiltY);
      const lx = r * ca, ly = r * sa * cx, lz = r * sa * sx;
      obj.position.set(lx * cy - lz * sy, ly, lx * sy + lz * cy);
    }
  });

  group.children.forEach(child => {
    if (child.userData && child.userData.glowRing && child.material) {
      const si = child.userData.shellIdx;
      const baseOp = child.geometry.parameters.tube > 0.1 ? 0.05 : (child.geometry.parameters.tube > 0.05 ? 0.09 : 0.55);
      child.material.opacity = baseOp + Math.sin(t * (0.8 + si * 0.3)) * baseOp * 0.35;
      
      // Apply explode scaling
      if (child.userData.baseRadius) {
        const scale = (child.userData.baseRadius + explodeFactor * si * 0.9) / child.userData.baseRadius;
        child.scale.set(scale, scale, scale);
      }
    }
    if (child.name === 'nucleus') {
      child.children.forEach(nuc => {
        if (nuc.material && nuc.material.wireframe !== undefined && nuc.name !== 'nucleus-pulse') {
          nuc.material.wireframe = typeof wireframeMode !== 'undefined' ? wireframeMode : false;
        }
      });
    }
    if (child.userData && child.userData.type === 'electron') {
      if (child.material && child.material.wireframe !== undefined) {
        child.material.wireframe = typeof wireframeMode !== 'undefined' ? wireframeMode : false;
      }
    }
  });
  const pts = group.userData.particles;
  if (pts) { pts.rotation.y = t * 0.07; pts.rotation.z = t * 0.035; pts.material.opacity = 0.4 + Math.sin(t * 1.2) * 0.1; }
  animateEnergyField(group, null, time);
}

function initAtomViewer() {
  const canvas = document.getElementById('atom-canvas');
  const container = document.getElementById('atom-canvas-container');
  if (atomRenderer) { atomRenderer.dispose(); cancelAnimationFrame(atomFrame); atomRenderer = null; }
  const W = container.clientWidth > 10 ? container.clientWidth : window.innerWidth;
  const H = container.clientHeight > 10 ? container.clientHeight : Math.round(window.innerHeight * 0.55);
  canvas.width = W; canvas.height = H;
  const isMobile = window.innerWidth < 600;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)); renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 500); camera.position.set(0, 0, isMobile ? 11 : 10);
  scene.add(new THREE.AmbientLight(0x0a1a33, 4));
  const p1 = new THREE.PointLight(0x00ccff, 5, 50); p1.position.set(5, 8, 8); scene.add(p1);
  const p2 = new THREE.PointLight(0x5500ff, 3, 40); p2.position.set(-8, -4, 2); scene.add(p2);
  const p3 = new THREE.PointLight(0xff0066, 2, 30); p3.position.set(4, -6, -4); scene.add(p3);
  const p4 = new THREE.PointLight(0x334466, 2, 60); p4.position.set(0, 14, 0); scene.add(p4);
  const group = new THREE.Group(); scene.add(group); const electrons = [];
  buildAtomGeometry(group, electrons, currentElement);
  atomRenderer = renderer; atomCamera = camera; atomScene_ = scene; atomGroup = group; atomElectrons = electrons;

  let mouseNX = 0.5, mouseNY = 0.5, mouseInCanvas = false, prevX = 0, prevY = 0;
  canvas.addEventListener('mousedown', e => { isDraggingAtom = true; prevX = e.clientX; prevY = e.clientY; });
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect(); mouseNX = (e.clientX - rect.left) / rect.width; mouseNY = (e.clientY - rect.top) / rect.height; mouseInCanvas = true;
    if (isDraggingAtom) { atomGroup.rotation.y += (e.clientX - prevX) * 0.008; atomGroup.rotation.x += (e.clientY - prevY) * 0.008; prevX = e.clientX; prevY = e.clientY; }
  });
  canvas.addEventListener('mouseleave', () => { mouseInCanvas = false; }); window.addEventListener('mouseup', () => { isDraggingAtom = false; });

  let lastTX = 0, lastTY = 0, lastTDist = 0;
  canvas.addEventListener('touchstart', e => { if (e.touches.length === 1) { lastTX = e.touches[0].clientX; lastTY = e.touches[0].clientY; } if (e.touches.length === 2) { lastTDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); } }, { passive: true });
  canvas.addEventListener('touchmove', e => { e.preventDefault(); if (e.touches.length === 1) { const dx = e.touches[0].clientX - lastTX, dy = e.touches[0].clientY - lastTY; atomGroup.rotation.y += dx * 0.012; atomGroup.rotation.x += dy * 0.012; lastTX = e.touches[0].clientX; lastTY = e.touches[0].clientY; } if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); atomCamera.position.z = Math.max(3, Math.min(25, atomCamera.position.z - (d - lastTDist) * 0.05)); lastTDist = d; } }, { passive: false });
  canvas.addEventListener('wheel', e => { e.preventDefault(); atomCamera.position.z = Math.max(3, Math.min(25, atomCamera.position.z + e.deltaY * 0.012)); }, { passive: false });

  updateElementDisplay(currentElement);
  let frameCount = 0;
  function loop(time) {
    if (currentView !== 'atom') return;
    atomFrame = requestAnimationFrame(loop); frameCount++;
    if (mouseInCanvas && !isDraggingAtom && !(isMobile && frameCount % 2)) {
      const ndc = new THREE.Vector2(mouseNX * 2 - 1, -(mouseNY * 2 - 1)); const vec = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(camera); const dir = vec.sub(camera.position).normalize(); const tv = (0 - camera.position.z) / dir.z; const mw = camera.position.clone().add(dir.multiplyScalar(tv));
      applyElectronPhysics(atomElectrons, mw, time, 4.0, 0.08); if (group.userData.fieldPts) animateEnergyField(group, mw, time);
    }
    animateAtom(atomGroup, atomElectrons, time); if (autoRotate && !isDraggingAtom) atomGroup.rotation.y += 0.004;
    renderer.render(scene, camera);
  }
  loop(0);
}

function initHomeViewer() {
  const canvas = document.getElementById('home-3d-canvas'); if (!canvas) return;
  if (homeRenderer) { homeRenderer.dispose(); cancelAnimationFrame(homeFrame); homeRenderer = null; }
  const isMobile = window.innerWidth < 600; const size = isMobile ? 100 : 180;
  canvas.width = size; canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true });
  renderer.setSize(size, size); renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)); renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100); camera.position.set(0, 0, 9);
  scene.add(new THREE.AmbientLight(0x112244, 3)); const pl = new THREE.PointLight(0x00ccff, 5, 20); pl.position.set(0, 3, 4); scene.add(pl); const pl2 = new THREE.PointLight(0x5500ff, 2, 15); pl2.position.set(-3, -2, 0); scene.add(pl2);
  const group = new THREE.Group(); scene.add(group); const electrons = [];
  buildAtomGeometry(group, electrons, ELEMENTS.find(e => e.n === 1));
  homeGroup = group; homeElectrons = electrons; homeRenderer = renderer;
  let homeElIdx = 0; const cycleMs = isMobile ? 3000 : 2000;
  const homeInterval = setInterval(() => { if (!homeRenderer) { clearInterval(homeInterval); return; } homeElIdx = (homeElIdx + 1) % Math.min(ELEMENTS.length, 20); buildAtomGeometry(homeGroup, homeElectrons, ELEMENTS[homeElIdx]); }, cycleMs);
  let frameCount = 0;
  function loop(t) {
    if (currentView !== 'home') return;
    homeFrame = requestAnimationFrame(loop); frameCount++;
    if (isMobile && frameCount % 2 === 0) { renderer.render(scene, camera); return; }
    animateAtom(homeGroup, homeElectrons, t); homeGroup.rotation.y += 0.008; homeGroup.rotation.x += 0.003; renderer.render(scene, camera);
  }
  loop(0);
}

function initElectronPhysics(electrons) {
  electrons.forEach(obj => {
    if (obj.userData.type !== 'electron') return;
    obj.userData.physics = { repelForce: new THREE.Vector3(), repelVelocity: new THREE.Vector3(), wobble: 0, wobbleVel: 0, excitationLevel: 0, excitationTimer: 0, originalRadius: obj.userData.radius, originalShell: obj.userData.shell };
  });
}

function applyElectronPhysics(electrons, handWorldPos, time, interactionRadius = 5.0, repulsionStrength = 0.12) {
  electrons.forEach(obj => {
    const d = obj.userData; if (d.type !== 'electron' || !d.physics) return;
    const ph = d.physics;
    if (handWorldPos) {
      const delta = new THREE.Vector3().subVectors(obj.position, handWorldPos); const dist = delta.length();
      if (dist < interactionRadius && dist > 0.01) {
        const strength = repulsionStrength * Math.pow(1 - dist / interactionRadius, 2); delta.normalize().multiplyScalar(strength); ph.repelForce.copy(delta);
        ph.wobbleVel += strength * 2; d.velocityBoost = (d.velocityBoost || 0) + strength * 0.5;
      }
    }
    ph.repelVelocity.add(ph.repelForce); ph.repelVelocity.multiplyScalar(0.85); ph.repelForce.multiplyScalar(0.7);
    ph.wobbleVel += -ph.wobble * 0.3; ph.wobbleVel *= 0.88; ph.wobble += ph.wobbleVel;
    if (ph.excitationLevel > 0) { ph.excitationTimer--; if (ph.excitationTimer <= 0) { ph.excitationLevel = 0; d.radius = ph.originalRadius; triggerPhotonEmission(obj, d, time); } }
    obj.position.add(ph.repelVelocity);
  });
}

function triggerPhotonEmission(electronObj, elData, time) {
  const flashEl = document.createElement('div'); flashEl.className = 'photon-flash'; const hue = Math.round((elData.shell * 60 + 180) % 360);
  flashEl.style.background = `radial-gradient(ellipse at 50% 50%, hsla(${hue},100%,70%,0.4) 0%, transparent 70%)`; document.body.appendChild(flashEl); setTimeout(() => flashEl.remove(), 450);
  if (soundEnabled) { const freq = 400 + elData.shell * 150; playTone(freq, 'sine', 0.5, 0.08); setTimeout(() => playTone(freq * 1.5, 'triangle', 0.2, 0.05), 100); }
  const ind = document.getElementById('excitation-indicator'); if (ind) { ind.textContent = `PHOTON EMITTED — n=${elData.shell + 1} → GROUND STATE`; ind.style.color = `hsl(${hue},100%,70%)`; ind.style.borderColor = `hsl(${hue},100%,70%)`; ind.style.background = `hsla(${hue},100%,10%,0.8)`; ind.style.opacity = '1'; setTimeout(() => { ind.style.opacity = '0'; }, 2000); }
}

function exciteElectron() {
  const electrons = atomElectrons; if (!electrons || !electrons.length) return;
  const candidates = electrons.filter(e => e.userData.type === 'electron' && (!e.userData.physics || e.userData.physics.excitationLevel === 0));
  if (!candidates.length) { toast('All electrons already excited!', 'warn', '⚡'); return; }
  const e = candidates[Math.floor(Math.random() * Math.min(candidates.length, 3))]; if (!e.userData.physics) initElectronPhysics([e]);
  const ph = e.userData.physics; ph.excitationLevel = 1; ph.excitationTimer = 180; e.userData.radius = e.userData.radius * 1.6;
  if (e.material) { e.material.emissiveIntensity = 3; setTimeout(() => { if (e.material) e.material.emissiveIntensity = 0.7; }, 800); }
  toast(`Electron excited to n=${e.userData.shell + 2}`, 'success', '⚡'); playTone(800, 'sine', 0.3, 0.06);
  const ed = document.getElementById('energy-diagram'); if (ed) { ed.classList.add('visible'); buildEnergyDiagram(currentElement); }
}

function buildEnergyDiagram(el) {
  const container = document.getElementById('ed-levels'); if (!container) return;
  const shells = el.shells || [1]; const shellColors = ['#00f5ff', '#44aaff', '#aa55ff', '#ff44aa', '#ff8844', '#ffdd00', '#44ff88'];
  container.innerHTML = shells.map((count, i) => {
    const col = shellColors[i % shellColors.length]; const energyLabel = `n=${i + 1}  E=${-(13.6 / Math.pow(i + 1, 2)).toFixed(1)}eV`;
    const eDots = Array.from({ length: Math.min(count, 8) }, () => `<div class="ed-e" style="background:${col}55;border-color:${col}"></div>`).join('');
    return `<div class="ed-level"><div class="ed-label" style="color:${col}">${i + 1}</div><div class="ed-line" style="background:${col}44;border:1px solid ${col}66"></div><div class="ed-electrons">${eDots}</div></div><div style="font-family:var(--fm);font-size:0.52rem;color:var(--t3);margin-bottom:4px;padding-left:28px;">${energyLabel}</div>`;
  }).join('');
}

function buildEnergyParticleField(group, el, shellCount) {
  const old = group.getObjectByName('energyField'); if (old) group.remove(old);
  const fieldGroup = new THREE.Group(); fieldGroup.name = 'energyField';
  const N = 600; const positions = new Float32Array(N * 3); const velocities = []; const baseRadius = shellCount * 1.4 + 3; const elColor = new THREE.Color(el.color || '#00f5ff');
  for (let i = 0; i < N; i++) { const r = baseRadius + Math.random() * 5, theta = Math.random() * Math.PI * 2, phi = Math.random() * Math.PI; positions[i * 3] = r * Math.sin(phi) * Math.cos(theta); positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta); positions[i * 3 + 2] = r * Math.cos(phi); velocities.push(new THREE.Vector3((Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01)); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: elColor, size: 0.06, transparent: true, opacity: 0.55, sizeAttenuation: true, blending: THREE.AdditiveBlending }));
  pts.userData = { velocities, baseRadius, N }; fieldGroup.add(pts); group.add(fieldGroup); group.userData.energyField = fieldGroup; group.userData.fieldPts = pts;
}

function animateEnergyField(group, handWorldPos, time) {
  const pts = group.userData.fieldPts; if (!pts) return;
  const t = time * 0.001; const positions = pts.geometry.attributes.position.array; const vels = pts.userData.velocities; const baseR = pts.userData.baseRadius; const N = pts.userData.N;
  for (let i = 0; i < N; i++) {
    const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2; const px = positions[ix], py = positions[iy], pz = positions[iz];
    vels[i].x += (Math.random() - 0.5) * 0.002; vels[i].y += (Math.random() - 0.5) * 0.002; vels[i].z += (Math.random() - 0.5) * 0.002;
    const dist = Math.sqrt(px * px + py * py + pz * pz); const springF = (dist - baseR) * 0.003;
    vels[i].x -= (px / dist) * springF; vels[i].y -= (py / dist) * springF; vels[i].z -= (pz / dist) * springF;
    if (handWorldPos) {
      const dx = handWorldPos.x - px, dy = handWorldPos.y - py, dz = handWorldPos.z - pz; const hdist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (hdist < 6 && hdist > 0.1) {
        const attract = 0.003 * (1 - hdist / 6); const cx = dy * pz - dz * py, cy = dz * px - dx * pz, cz = dx * py - dy * px; const cl = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
        vels[i].x += (cx / cl) * attract * 0.5 + dx / hdist * attract; vels[i].y += (cy / cl) * attract * 0.5 + dy / hdist * attract; vels[i].z += (cz / cl) * attract * 0.5 + dz / hdist * attract;
      }
    }
    vels[i].multiplyScalar(0.96); const pulse = 1 + Math.sin(t + i * 0.1) * 0.008; positions[ix] = (px + vels[i].x) * pulse; positions[iy] = (py + vels[i].y) * pulse; positions[iz] = (pz + vels[i].z) * pulse;
  }
  pts.geometry.attributes.position.needsUpdate = true; pts.material.opacity = 0.4 + Math.sin(t * 1.5) * 0.15;
}

// AR Functions
let arStream = null;
function initARMode() {
  const loading = document.getElementById('ar-loading'); loading.style.display = 'flex'; loading.style.opacity = '1';
  document.getElementById('ar-load-text').textContent = 'REQUESTING CAMERA ACCESS';
  if (arStream) { arStream.getTracks().forEach(t => t.stop()); arStream = null; }
  setTimeout(() => {
    navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false })
      .then(stream => { arStream = stream; const video = document.getElementById('ar-video'); video.srcObject = stream; video.onloadedmetadata = () => { video.play().catch(() => { }); setupARScene(); setTimeout(() => hideARLoading(), 600); }; setTimeout(() => { if (loading.style.display !== 'none') { setupARScene(); hideARLoading(); } }, 3000); })
      .catch(err => { setupARScene(); hideARLoading(); toast('No camera — using mouse demo mode', 'warn', '⚠'); simulateHandTracking(); });
  }, 150);
}

function setupARScene() {
  const canvas = document.getElementById('ar-canvas'); if (arRenderer) { arRenderer.dispose(); cancelAnimationFrame(arFrame); arRenderer = null; }
  const isMobile = window.innerWidth < 600; const W = window.innerWidth, H = window.innerHeight;
  canvas.width = W; canvas.height = H; const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)); renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 500); camera.position.set(0, 0, isMobile ? 14 : 12);
  scene.add(new THREE.AmbientLight(0x0a1a33, 4));
  const pl1 = new THREE.PointLight(0x00ccff, 5, 60); pl1.position.set(5, 8, 8); scene.add(pl1);
  const pl2 = new THREE.PointLight(0x5500ff, 3, 45); pl2.position.set(-8, -4, 2); scene.add(pl2);
  const pl3 = new THREE.PointLight(0xff0066, 2, 35); pl3.position.set(4, -6, -4); scene.add(pl3);
  const group = new THREE.Group(); scene.add(group); const electrons = [];
  buildAtomGeometry(group, electrons, currentElement);
  arRenderer = renderer; arCamera = camera; arScene_ = scene; arGroup = group; arElectrons = electrons;
  gs = { scale: 1, prevPinch: null, prevX: null, prevY: null, prevTwo: null };
  let frameCount = 0;
  function loop(time) {
    if (currentView !== 'ar') return;
    arFrame = requestAnimationFrame(loop); frameCount++;
    fpsCount++; if (time - lastFpsTime > 1000) { fps = fpsCount; fpsCount = 0; lastFpsTime = time; setTextSafe('hud-fps', fps); }
    if (isMobile && frameCount % 2 === 0) { renderer.render(scene, camera); return; }
    animateAtom(arGroup, arElectrons, time); arGroup.rotation.y += 0.006; renderer.render(scene, camera);
    updateScaleBar(gs.scale); setTextSafe('hud-roty', Math.round((arGroup.rotation.y % (Math.PI * 2)) / (Math.PI * 2) * 360) + '°');
  }
  loop(0);
}

function hideARLoading() { const el = document.getElementById('ar-loading'); el.style.opacity = '0'; setTimeout(() => { el.style.display = 'none'; el.style.opacity = '1'; }, 420); }
function updateScaleBar(scale) { const segs = document.querySelectorAll('.hud-bar-seg'); const lit = Math.round((scale / 4) * segs.length); segs.forEach((s, i) => s.classList.toggle('lit', i < lit)); setTextSafe('hud-scale', scale.toFixed(2) + '×'); }

function startHandTracking() {
  handActive = true; document.getElementById('ar-hand-btn').textContent = '◈ DISABLE HANDS'; document.getElementById('ar-hand-btn').classList.add('primary');
  setTextSafe('hud-hands', 'LOADING'); document.getElementById('hud-hands').className = 'hud-val warn';
  if (typeof Hands !== 'undefined' && typeof Camera !== 'undefined') { initMediaPipe(); } else {
    let attempts = 0; const poll = setInterval(() => { attempts++; if (typeof Hands !== 'undefined' && typeof Camera !== 'undefined') { clearInterval(poll); initMediaPipe(); } else if (attempts > 25) { clearInterval(poll); toast('MediaPipe failed to load — using mouse demo', 'warn', '⚠'); fallbackToMouse(); } }, 200);
  }
}

function initMediaPipe() {
  const video = document.getElementById('ar-video'); if (!video.srcObject) { toast('Camera not ready', 'warn', '⚠'); fallbackToMouse(); return; }
  try {
    const hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.65, minTrackingConfidence: 0.55 });
    hands.onResults(onHandResults);
    const startCam = () => { const cam = new Camera(video, { onFrame: async () => { try { await hands.send({ image: video }); } catch (e) { } }, width: 640, height: 480 }); cam.start(); mediapipeHands = hands; mpCamera = cam; setTextSafe('hud-hands', 'ACTIVE'); document.getElementById('hud-hands').className = 'hud-val active'; document.getElementById('gesture-guide').style.opacity = '1'; toast('Hand tracking active ✋', 'success', '◈'); };
    if (video.readyState >= 2) { startCam(); } else { video.addEventListener('canplay', startCam, { once: true }); }
  } catch (e) { fallbackToMouse(); }
}

function stopHandTracking() {
  handActive = false; if (mpCamera) { mpCamera.stop(); mpCamera = null; } if (mediapipeHands) { mediapipeHands.close(); mediapipeHands = null; }
  document.getElementById('ar-hand-btn').textContent = '◈ ENABLE HANDS'; document.getElementById('ar-hand-btn').classList.remove('primary');
  setTextSafe('hud-hands', 'OFF'); setTextSafe('hud-gesture', 'NONE');
  const gc = document.getElementById('gesture-canvas'); if (gc) gc.getContext('2d').clearRect(0, 0, gc.width, gc.height);
}

function onHandResults(results) {
  const gc = document.getElementById('gesture-canvas'); if (!gc) return;
  gc.width = gc.parentElement.clientWidth; gc.height = gc.parentElement.clientHeight;
  const ctx = gc.getContext('2d'); ctx.clearRect(0, 0, gc.width, gc.height);
  [0, 1].forEach(i => { const ring = document.getElementById('hand-ring-' + i); if (ring) ring.style.display = 'none'; });
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) { setTextSafe('hud-hands', 'SEARCHING'); setTextSafe('hud-gesture', 'NONE'); gs.prevPinch = null; gs.prevX = null; gs.prevY = null; return; }
  document.getElementById('gesture-guide').style.opacity = '0'; setTextSafe('hud-hands', results.multiHandLandmarks.length + ' HAND' + (results.multiHandLandmarks.length > 1 ? 'S' : ''));
  results.multiHandLandmarks.forEach((lm, i) => { drawHandSkeleton(ctx, lm, gc.width, gc.height, i); const palm = lm[0]; const ring = document.getElementById('hand-ring-' + i); if (ring && palm) { const rx = (1 - palm.x) * gc.width, ry = palm.y * gc.height; const thumb = lm[4], index = lm[8]; const pinch = Math.hypot(thumb.x - index.x, thumb.y - index.y); const ringSize = Math.max(20, Math.min(70, pinch * gc.width * 1.2)); ring.style.display = 'block'; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; ring.style.width = ringSize + 'px'; ring.style.height = ringSize + 'px'; const isPinching = pinch < 0.06; if (i === 0) { ring.style.borderColor = isPinching ? 'rgba(255,200,0,0.9)' : 'rgba(0,245,255,0.8)'; ring.style.boxShadow = isPinching ? '0 0 20px rgba(255,200,0,0.6)' : '0 0 12px rgba(0,245,255,0.4)'; } } });
  processGestures(results.multiHandLandmarks);
}

function drawHandSkeleton(ctx, landmarks, w, h, handIdx) {
  const CONNECTIONS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17], [0, 5]];
  const baseCol = handIdx === 0 ? '0,245,255' : '168,85,247';
  ctx.lineWidth = 1.5; CONNECTIONS.forEach(([a, b]) => { const la = landmarks[a], lb = landmarks[b], x1 = (1 - la.x) * w, y1 = la.y * h, x2 = (1 - lb.x) * w, y2 = lb.y * h; const gradient = ctx.createLinearGradient(x1, y1, x2, y2); gradient.addColorStop(0, `rgba(${baseCol},0.75)`); gradient.addColorStop(1, `rgba(${baseCol},0.25)`); ctx.strokeStyle = gradient; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });
  landmarks.forEach((lm, i) => { const x = (1 - lm.x) * w, y = lm.y * h, isTip = [4, 8, 12, 16, 20].includes(i), isKey = [0, 4, 8].includes(i), size = isTip ? 5 : isKey ? 3.5 : 2; if (isTip) { const grd = ctx.createRadialGradient(x, y, 0, x, y, 12); grd.addColorStop(0, `rgba(${baseCol},0.5)`); grd.addColorStop(1, `rgba(${baseCol},0)`); ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill(); } ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fillStyle = (i === 4 || i === 8) ? 'rgba(255,120,50,1)' : `rgba(${baseCol},0.9)`; ctx.fill(); });
  const t = landmarks[4], ix = landmarks[8], tx = (1 - t.x) * w, ty = t.y * h, inx = (1 - ix.x) * w, iny = ix.y * h, pd = Math.hypot(tx - inx, ty - iny), isPinching = pd < w * 0.06;
  ctx.setLineDash([4, 4]); ctx.strokeStyle = isPinching ? 'rgba(255,200,0,0.8)' : `rgba(${baseCol},0.25)`; ctx.lineWidth = isPinching ? 2 : 1; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(inx, iny); ctx.stroke(); ctx.setLineDash([]);
  if (isPinching) { const mx = (tx + inx) / 2, my = (ty + iny) / 2; const grd = ctx.createRadialGradient(mx, my, 0, mx, my, pd * 0.5); grd.addColorStop(0, 'rgba(255,200,0,0.4)'); grd.addColorStop(1, 'rgba(255,200,0,0)'); ctx.beginPath(); ctx.arc(mx, my, pd * 0.5, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill(); }
}

function processGestures(hands) {
  if (!arGroup) return; const h1 = hands[0]; const thumb = h1[4], index = h1[8], palm = h1[0];
  const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
  if (gs.prevPinch !== null) { const delta = (pinchDist - gs.prevPinch) * 4; if (Math.abs(delta) > 0.005) { gs.scale = Math.max(0.25, Math.min(5, gs.scale + delta)); arGroup.scale.setScalar(gs.scale); showGestureLabel(delta > 0 ? 'ZOOM IN' : 'ZOOM OUT'); if (Math.abs(delta) > 0.02) playGestureSound(delta > 0 ? 'zoom-in' : 'zoom-out'); } }
  gs.prevPinch = pinchDist; const hx = 1 - palm.x, hy = palm.y;
  if (gs.prevX !== null) { const dx = hx - gs.prevX, dy = hy - gs.prevY; if (Math.abs(dx) > 0.004 || Math.abs(dy) > 0.004) { arGroup.rotation.y += dx * 4; arGroup.rotation.x += dy * 2.5; setTextSafe('hud-gesture', 'ROTATE'); if (Math.abs(dx) > 0.01) playGestureSound('rotate'); } }
  gs.prevX = hx; gs.prevY = hy;
  if (hands.length >= 2) { const p2 = hands[1][0], dist = Math.hypot(palm.x - p2.x, palm.y - p2.y); if (gs.prevTwo !== null) { const d2 = (dist - gs.prevTwo) * 3; if (Math.abs(d2) > 0.004) { gs.scale = Math.max(0.25, Math.min(5, gs.scale + d2)); arGroup.scale.setScalar(gs.scale); showGestureLabel(d2 > 0 ? 'EXPAND' : 'CONTRACT'); } } gs.prevTwo = dist; perturbElectrons((palm.x + p2.x) / 2, (palm.y + p2.y) / 2, 1.5); } else { gs.prevTwo = null; if (h1[8].y < h1[5].y - 0.05) perturbElectrons(index.x, index.y, 0.8); }
}

function perturbElectrons(normX, normY, strength) {
  if (!arElectrons || !arGroup || !arCamera) return; const handWorld = handScreenToWorld(normX, normY);
  applyElectronPhysics(arElectrons, handWorld, Date.now(), 5.5, strength * 0.14); if (arGroup.userData.fieldPts) animateEnergyField(arGroup, handWorld, Date.now());
}

function handScreenToWorld(normX, normY) {
  if (!arCamera) return null; const ndcX = (1 - normX) * 2 - 1, ndcY = (1 - normY) * 2 - 1; const vec = new THREE.Vector3(ndcX, ndcY, 0.7); vec.unproject(arCamera); const dir = vec.sub(arCamera.position).normalize(); const t = (0 - arCamera.position.z) / dir.z; return arCamera.position.clone().add(dir.multiplyScalar(t));
}

function showGestureLabel(text) {
  const lbl = document.getElementById('gesture-label'); const ring = document.getElementById('gesture-ring');
  if (lbl) { lbl.textContent = text; lbl.style.opacity = '1'; clearTimeout(lbl._t); lbl._t = setTimeout(() => { lbl.style.opacity = '0'; if (ring) ring.classList.remove('active'); }, 700); }
  if (ring) ring.classList.add('active');
}

function simulateHandTracking() {
  const gc = document.getElementById('gesture-canvas'); if (!gc) return;
  let mx = 0.5, my = 0.5, lastMX = 0.5;
  document.addEventListener('mousemove', e => { if (document.getElementById('view-ar').classList.contains('active')) { const r = gc.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width; my = (e.clientY - r.top) / r.height; } });
  setInterval(() => { if (!arGroup || !document.getElementById('view-ar').classList.contains('active')) return; const ctx = gc.getContext('2d'); ctx.clearRect(0, 0, gc.width, gc.height); const cx = mx * gc.width, cy = my * gc.height; ctx.strokeStyle = 'rgba(0,245,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy + 20, 22, 0, Math.PI * 2); ctx.stroke(); const dx = mx - lastMX; if (Math.abs(dx) > 0.002) { arGroup.rotation.y += dx * 4; setTextSafe('hud-gesture', 'ROTATE (MOUSE)'); } lastMX = mx; setTextSafe('hud-hands', 'MOUSE SIM'); }, 33);
}

function toggleHandTracking() {
  if (handActive) stopHandTracking();
  else startHandTracking();
}

function fallbackToMouse() { toast('MediaPipe unavailable — using mouse demo', 'warn', '⚠'); simulateHandTracking(); setTextSafe('hud-hands', 'MOUSE'); }
