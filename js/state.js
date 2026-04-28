/* AtomSpace – Global State */

// 3D Engine State
window.atomScene_ = null; window.atomCamera = null; window.atomRenderer = null; window.atomGroup = null; window.atomElectrons = []; window.atomFrame = null;
window.arScene_ = null; window.arCamera = null; window.arRenderer = null; window.arGroup = null; window.arElectrons = []; window.arFrame = null;
window.molScene = null; window.molCamera = null; window.molRenderer = null; window.molFrame = null;
window.pgScene = null; window.pgCamera = null; window.pgRenderer = null; window.pgFrame = null;
window.homeRenderer = null; window.homeGroup = null; window.homeElectrons = []; window.homeFrame = null;

// App State
window.currentElement = null;
window.currentView = 'home';
window.compareList = [];
window.explodeMode = false;
window.explodeFactor = 0;
window.autoRotate = true;
window.wireframeMode = false;
window.isDraggingAtom = false;

// AR/Hand State
window.handActive = false;
window.arStream = null;
window.mediapipeHands = null;
window.mpCamera = null;
window.gs = { scale: 1, prevPinch: null, prevX: null, prevY: null, prevTwo: null };
window.fpsCount = 0;
window.fps = 0;
window.lastFpsTime = 0;

// Molecule Builder State
window.molAtoms = [];
window.molBonds = [];
window.molSelectedElement = 'H';
window.molAutoBond = true;
window.molDragAtom = null;
window.molDragOffset = new THREE.Vector3();
window.molMouse = new THREE.Vector2();
window.molRaycaster = new THREE.Raycaster();
window.molAutoRotate = false;
window.molCurrentPreset = null;

// Playground State
window.pgAtoms = [];
window.pgImpactParticles = [];
window.pgForceMode = 0;
window.pgTrails = false;
window.pgSelectedElement = 'H';
window.pgCollisions = true;
window.pgDragAtom = null;
window.pgMouse = new THREE.Vector2();
window.pgRaycaster = new THREE.Raycaster();
window.pgFps = 0;
window.pgFpsCount = 0;
window.pgFpsLast = 0;

// Audio State
window.audioCtx = null;
window.soundEnabled = true;
