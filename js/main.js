/* Tatva – Main Application Module */

// Globals are in state.js

if (!currentElement && typeof ELEMENTS !== 'undefined') currentElement = ELEMENTS[0];

function showView(name) {
  const views = ['home', 'table', 'atom', 'molecule', 'playground', 'ar'];
  if (!views.includes(name)) return;
  currentView = name;

  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${name}`);
    if (v.id === `view-${name}`) v.classList.add('view-enter');
    else v.classList.remove('view-enter');
  });

  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
  if (typeof _syncMobileNav === 'function') _syncMobileNav(name);

  // Stop AR video if leaving AR view
  const arVideo = document.getElementById('ar-video');
  if (name !== 'ar' && arStream) { arStream.getTracks().forEach(t => t.stop()); arStream = null; if (arVideo) arVideo.srcObject = null; stopHandTracking(); }

  // Init views
  if (name === 'atom') initAtomViewer();
  if (name === 'ar') initARMode();
  if (name === 'molecule') initMoleculeBuilder();
  if (name === 'playground') initPlayground();
  if (name === 'home') initHomeViewer();

  playClickSound();
}

function buildPeriodicTable() {
  const grid = document.getElementById('periodic-grid');
  if (!grid) return;
  grid.innerHTML = '';

  LAYOUT.forEach(row => {
    row.forEach(n => {
      if (n === 0) {
        const spacer = document.createElement('div');
        spacer.className = 'element-cell cell-empty';
        grid.appendChild(spacer);
      } else {
        const el = ELEMENTS.find(e => e.n === n);
        if (el) {
          const cell = document.createElement('div');
          cell.className = `element-cell cat-${el.cat}`;
          cell.dataset.n = el.n;
          cell.innerHTML = `
            <div class="cell-number">${el.n}</div>
            <div class="cell-symbol">${el.s}</div>
            <div class="cell-name">${el.name}</div>
            <div class="cell-prop">${el.m.toFixed(2)}</div>
            <div class="compare-badge" id="cb-${el.n}">COMPARE</div>
          `;
          cell.onclick = () => selectElement(el.n);
          cell.onmouseenter = (e) => showTooltip(e, el);
          cell.onmouseleave = hideTooltip;
          grid.appendChild(cell);
        }
      }
    });
  });
}

function selectElement(n) {
  const el = ELEMENTS.find(e => e.n === n);
  if (!el) return;
  currentElement = el;
  showView('atom');
}

function updateElementDisplay(el) {
  if (!el) return;
  setTextSafe('el-num', el.n);
  setTextSafe('el-symbol', el.s);
  const symEl = document.getElementById('el-symbol');
  if (symEl) symEl.style.color = el.color;
  setTextSafe('el-name', el.name);
  const nameEl = document.getElementById('el-name');
  if (nameEl) nameEl.style.color = el.color;
  setTextSafe('el-cat-label', CAT[el.cat] || el.cat);
  setTextSafe('val-mass', `${el.m} u`);
  setTextSafe('val-config', el.shells.join(', '));
  setTextSafe('val-cat', CAT[el.cat] || el.cat);

  const shellContainer = document.getElementById('shell-badges');
  if (shellContainer) {
    shellContainer.innerHTML = el.shells.map((count, i) => `<span class="shell-badge" style="background:${el.color}22; border:1px solid ${el.color}44; color:${el.color}">Shell ${i + 1}: ${count}e</span>`).join('');
  }

  const factList = document.getElementById('fact-list');
  if (factList) {
    const facts = [
      `Atomic number ${el.n} indicates it has ${el.n} protons.`,
      `Belongs to the ${CAT[el.cat]} category.`,
      `Standard atomic weight is approximately ${el.m} atomic mass units.`
    ];
    factList.innerHTML = facts.map(f => `<div class="fact-item">${f}</div>`).join('');
  }

  if (atomGroup && atomElectrons) buildAtomGeometry(atomGroup, atomElectrons, el);
}

function nextElement() {
  const idx = ELEMENTS.findIndex(e => e.n === currentElement.n);
  const next = ELEMENTS[(idx + 1) % ELEMENTS.length];
  currentElement = next;
  updateElementDisplay(next);
}

function prevElement() {
  const idx = ELEMENTS.findIndex(e => e.n === currentElement.n);
  const prev = ELEMENTS[(idx - 1 + ELEMENTS.length) % ELEMENTS.length];
  currentElement = prev;
  updateElementDisplay(prev);
}

function showTooltip(e, el) {
  const tt = document.getElementById('el-tooltip');
  if (!tt) return;
  tt.innerHTML = `
    <div class="et-sym" style="color:${el.color}">${el.s}</div>
    <div class="et-name">${el.name}</div>
    <div class="et-row">Mass <span>${el.m}</span></div>
    <div class="et-row">Cat <span>${CAT[el.cat]}</span></div>
    <div class="et-hint">Click to view 3D structure</div>
  `;
  tt.classList.add('visible');
  moveTooltip(e);
}

function moveTooltip(e) {
  const tt = document.getElementById('el-tooltip');
  if (!tt) return;
  tt.style.left = (e.clientX + 15) + 'px';
  tt.style.top = (e.clientY + 15) + 'px';
}

function hideTooltip() {
  const tt = document.getElementById('el-tooltip');
  if (tt) tt.classList.remove('visible');
}

document.addEventListener('mousemove', (e) => {
  const tt = document.getElementById('el-tooltip');
  if (tt && tt.classList.contains('visible')) moveTooltip(e);
});

// Comparison logic
function addToCompare() {
  if (compareList.length >= 2) { toast('Maximum 2 elements for comparison', 'warn', '⚠'); return; }
  if (compareList.find(e => e.n === currentElement.n)) { toast('Element already in comparison', 'info', 'ℹ'); return; }
  compareList.push(currentElement);
  updateCompareBar();
  toast(`Added ${currentElement.name} to compare`, 'success', '⚖');
}

function updateCompareBar() {
  const bar = document.getElementById('compare-bar');
  const slots = document.getElementById('compare-slots');
  if (!bar || !slots) return;
  bar.classList.toggle('visible', compareList.length > 0);
  slots.innerHTML = compareList.map(el => `
    <div class="compare-slot">
      <span class="cs-sym" style="color:${el.color}">${el.s}</span>
      <span class="cs-name">${el.name}</span>
      <span class="cs-remove" onclick="removeFromCompare(${el.n})">✕</span>
    </div>
  `).join('');
}

function removeFromCompare(n) {
  compareList = compareList.filter(e => e.n !== n);
  updateCompareBar();
}

function openCompareModal() {
  if (compareList.length < 2) { toast('Add one more element to compare', 'info', '⚖'); return; }
  const modal = document.getElementById('compare-modal');
  const grid = document.getElementById('compare-grid');
  if (!modal || !grid) return;
  const [e1, e2] = compareList;
  grid.innerHTML = [e1, e2].map(el => `
    <div class="compare-col">
      <div class="compare-col-header">
        <div class="compare-col-sym" style="color:${el.color}">${el.s}</div>
        <div class="compare-col-name">${el.name}</div>
      </div>
      <div class="compare-stat-row"><div class="label">Atomic Number</div><div class="val">${el.n}</div></div>
      <div class="compare-stat-row"><div class="label">Atomic Mass</div><div class="val">${el.m} u</div></div>
      <div class="compare-stat-row"><div class="label">Category</div><div class="val">${CAT[el.cat]}</div></div>
      <div class="compare-stat-row"><div class="label">Electrons</div><div class="val">${el.shells.reduce((a, b) => a + b, 0)}</div></div>
      <div class="compare-stat-row"><div class="label">Shells</div><div class="val">${el.shells.length}</div></div>
    </div>
  `).join('');
  modal.classList.add('visible');
}

function closeCompareModal() {
  const modal = document.getElementById('compare-modal');
  if (modal) modal.classList.remove('visible');
}

// Info Modal
function openInfoModal() {
  const modal = document.getElementById('info-modal');
  const body = document.getElementById('info-body');
  if (!modal || !body) return;

  const content = {
    'home': '<b>Welcome to Tatva!</b><br><br>Navigate using the top menu to explore the periodic table in 3D, build molecules, and simulate atomic physics.',
    'table': '<b>Interactive Periodic Table</b><br><br>• Click any element to view its 3D atomic structure.<br>• Right-click elements to add them to the comparison panel.<br>• Use the search bar to find elements by name, symbol, or number.',
    'atom': '<b>3D Atom Viewer</b><br><br>• <b>Rotate</b>: Click and drag.<br>• <b>Zoom</b>: Scroll wheel.<br>• Use the bottom controls to toggle wireframe, orbital diagram, or explode views.<br>• Press <b>← / →</b> keys to cycle elements.',
    'molecule': '<b>Molecule Builder</b><br><br>• <b>Spawn Atom</b>: Double-click anywhere on the grid.<br>• <b>Drag Atom</b>: Click and hold an atom to move it.<br>• <b>Auto-Bond</b>: When enabled, dragging atoms near each other will automatically form realistic chemical bonds.<br>• You can also load presets from the top menu.',
    'playground': '<b>Physics Playground</b><br><br>• <b>Spawn Atom</b>: Double-click on the screen.<br>• <b>Throw Atom</b>: Click, drag, and release to throw.<br>• <b>Change Force</b>: Cycle between Gravity, Zero-G, Magnetic (Orbital mechanics), and Repulsion.<br>• Watch elements interact based on their atomic mass!',
    'ar': '<b>AR Mode</b><br><br>• Requires a webcam.<br>• Click "ENABLE HANDS" to start tracking.<br>• Pinch to zoom, wave hand to rotate the atom, or push to deflect electrons.'
  };

  body.innerHTML = content[currentView] || 'Select a tab to view instructions.';
  modal.style.display = 'flex';
  setTimeout(() => modal.style.opacity = '1', 10);
}

function closeInfoModal() {
  const modal = document.getElementById('info-modal');
  if (!modal) return;
  modal.style.opacity = '0';
  setTimeout(() => modal.style.display = 'none', 300);
}

// Global UI controls
function toggleAutoRotate() { autoRotate = !autoRotate; toast(`Auto-rotate ${autoRotate ? 'ON' : 'OFF'}`, 'info', '⟳'); document.getElementById('btn-rotate').classList.toggle('active', !autoRotate); }
function toggleWireframe() { wireframeMode = !wireframeMode; toast(`Wireframe ${wireframeMode ? 'ON' : 'OFF'}`, 'info', '⛶'); document.getElementById('btn-wire').classList.toggle('active', wireframeMode); }
function toggleExplode() { explodeMode = !explodeMode; toast(`Explode view ${explodeMode ? 'ON' : 'OFF'}`, 'info', '💥'); document.getElementById('btn-explode').classList.toggle('active', explodeMode); }
function toggleOrbitalDiagram() {
  const od = document.getElementById('orbital-diagram'); if (!od) return;
  const visible = od.classList.toggle('visible'); document.getElementById('btn-orbital').classList.toggle('active', visible);
  if (visible) updateOrbitalDiagram(currentElement);
}

function updateOrbitalDiagram(el) {
  const shells = document.getElementById('od-shells'); if (!shells) return;
  shells.innerHTML = el.shells.map((count, i) => {
    const dots = Array.from({ length: 8 }, (_, j) => `<div class="od-e ${j < count ? 'filled' : 'empty'}" style="border-color:${el.color}; background:${j < count ? el.color : 'transparent'}"></div>`).join('');
    return `<div class="od-shell"><div class="od-shell-label">n=${i + 1}</div><div class="od-electrons">${dots}</div></div>`;
  }).join('');
}

// Background Starfield
function initStarfield() {
  const canvas = document.getElementById('starfield'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  window.addEventListener('resize', resize); resize();
  const stars = Array.from({ length: 200 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 1.5, speed: Math.random() * 0.05 + 0.01, o: Math.random() }));
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.y -= s.speed; if (s.y < 0) s.y = canvas.height;
      s.o += 0.01; const alpha = 0.1 + Math.abs(Math.sin(s.o)) * 0.4;
      ctx.fillStyle = `rgba(0, 245, 255, ${alpha})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
    });
    requestAnimationFrame(animate);
  };
  animate();
}

// Resize handling
function handleResize() {
  if (atomRenderer && atomCamera) {
    const c = document.getElementById('atom-canvas-container'); const W = c.clientWidth > 10 ? c.clientWidth : window.innerWidth; const H = c.clientHeight > 10 ? c.clientHeight : Math.round(window.innerHeight * 0.55);
    atomRenderer.setSize(W, H); atomCamera.aspect = W / H; atomCamera.updateProjectionMatrix();
  }
  if (arRenderer && arCamera) { arRenderer.setSize(window.innerWidth, window.innerHeight); arCamera.aspect = window.innerWidth / window.innerHeight; arCamera.updateProjectionMatrix(); }
  if (molRenderer && molCamera) { const w = document.getElementById('mol-canvas-wrap'); const W = w.clientWidth || window.innerWidth, H = w.clientHeight || window.innerHeight - 56; molRenderer.setSize(W, H); molCamera.aspect = W / H; molCamera.updateProjectionMatrix(); }
  if (pgRenderer && pgCamera) { const W = window.innerWidth, H = window.innerHeight - 56; pgRenderer.setSize(W, H); pgCamera.aspect = W / H; pgCamera.updateProjectionMatrix(); }
}
window.addEventListener('resize', handleResize);

// Keyboard shortcuts
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') nextElement(); if (e.key === 'ArrowLeft') prevElement();
  if (['1', '2', '3', '4', '5', '6'].includes(e.key)) { const map = { '1': 'home', '2': 'table', '3': 'atom', '4': 'ar', '5': 'molecule', '6': 'playground' }; showView(map[e.key]); }
  if (e.key.toLowerCase() === 'r') toggleAutoRotate(); if (e.key.toLowerCase() === 'o') toggleOrbitalDiagram(); if (e.key.toLowerCase() === 'w') toggleWireframe(); if (e.key.toLowerCase() === 'x') toggleExplode(); if (e.key.toLowerCase() === 's') toggleSound(); if (e.key.toLowerCase() === 'e') exciteElectron(); if (e.key.toLowerCase() === 'f') pgExplodeAll(); if (e.key.toLowerCase() === 'g') pgToggleGravity(); if (e.key === 'Escape') closeCompareModal();
});

// Boot
window.addEventListener('load', () => {
  initStarfield(); buildPeriodicTable(); showView('home');
  toast('Tatva — The AtomSpace initialized ⚛', 'success', '◆');
  initAudio();
});

// Sync mobile nav
function _syncMobileNav(name) {
  document.querySelectorAll('#mobile-nav button').forEach(b => {
    const active = b.dataset.mview === name;
    b.classList.toggle('active', active);
  });
}

function filterTable() {
  const query = document.getElementById('el-search').value.toLowerCase();
  const cat = document.getElementById('filter-cat').value;
  document.querySelectorAll('.element-cell').forEach(cell => {
    if (cell.classList.contains('cell-empty')) return;
    const n = parseInt(cell.dataset.n);
    const el = ELEMENTS.find(e => e.n === n);
    if (!el) return;
    const matchesQuery = el.name.toLowerCase().includes(query) || el.s.toLowerCase().includes(query) || el.n.toString().includes(query);
    const matchesCat = cat === 'all' || el.cat === cat;
    cell.style.display = (matchesQuery && matchesCat) ? 'flex' : 'none';
  });
}

function updateClock() {
  const el = document.getElementById('nav-clock');
  if (el) el.textContent = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();
