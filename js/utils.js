/* AtomSpace – Utilities Module */

// Audio variables are already in window/state.js if needed, 
// but audioCtx and soundEnabled were local to this file. 
// I'll keep them as window properties or just remove let if I added them to state.
// Actually audioCtx and soundEnabled were NOT in state.js. I'll add them there too.

function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn("AudioContext not supported");
  }
}

function playTone(freq, type = 'sine', vol = 0.1, duration = 0.1) {
  if (!soundEnabled || !audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function playClickSound() { playTone(600, 'sine', 0.05, 0.05); }
function playGestureSound(type) {
  if (type === 'rotate') playTone(200 + Math.random() * 100, 'sine', 0.03, 0.1);
  else if (type === 'zoom-in') playTone(800, 'sine', 0.05, 0.15);
  else if (type === 'zoom-out') playTone(400, 'sine', 0.05, 0.15);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  if (soundEnabled) initAudio();
  const icon = soundEnabled ? '🔊' : '🔇';
  toast(`Sound ${soundEnabled ? 'ON' : 'OFF'}`, 'info', icon);
  document.getElementById('btn-sound').classList.toggle('active', !soundEnabled);
}

function toast(msg, type = 'info', icon = '◆') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('removing');
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

function setTextSafe(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// Particle system shared state is in state.js

function spawnImpactParticles(position, color, intensity) {
  let targetScene = null;
  if (currentView === 'molecule') targetScene = molScene;
  else if (currentView === 'playground') targetScene = pgScene;
  if (!targetScene) return;

  const count = Math.min(12, Math.floor(intensity * 60 + 4));
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 5, 5);
    const mat = new THREE.MeshBasicMaterial({
      color: color || '#00f5ff', transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3 * intensity,
      Math.random() * 0.25 * intensity + 0.05,
      (Math.random() - 0.5) * 0.3 * intensity
    );
    targetScene.add(mesh);
    pgImpactParticles.push({ mesh, vel, life: 0.8 + Math.random() * 0.4, scene: targetScene });
  }
}

function updateImpactParticles() {
  pgImpactParticles.forEach((p, idx) => {
    p.mesh.position.add(p.vel);
    p.vel.y -= 0.005;
    p.life -= 0.02;
    p.mesh.material.opacity = p.life;
    if (p.life <= 0) {
      if (p.scene) p.scene.remove(p.mesh);
      pgImpactParticles.splice(idx, 1);
    }
  });
}
