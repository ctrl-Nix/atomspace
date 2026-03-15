# ⚛️ AtomSpace

### Gesture-Controlled Periodic Table — Next Generation Science Interface

A futuristic, fully interactive periodic table with real-time 3D atom visualization and hand gesture control via webcam. No frameworks, no build step — a single HTML file.

**[Live Demo →](https://atomspace.vercel.app)**

---

## Screenshots

> Home screen with live 3D atom preview · Periodic Table with neon UI · 3D Atom Viewer · AR Gesture Mode

---

## Features

### ⊞ Interactive Periodic Table
- All 118 elements in a full 18-column grid including lanthanides and actinides
- Color-coded by 10 element categories (alkali metals, noble gases, transition metals, etc.)
- Hover tooltips showing atomic number, mass, category, and electron configuration
- Live search by name, symbol, atomic number, or use case
- Filter by category — click legend or use the dropdown
- Toggle property display: atomic mass / electron config / shell count
- **Right-click any element** to add it to a side-by-side comparison

### ◎ 3D Atom Viewer
- Realistic nucleus built from packed proton + neutron spheres (Fibonacci sphere distribution)
- Electron shells with correct shell counts per element, each shell tilted at a unique angle
- Glowing electron trails (4 trail particles per electron)
- Ambient particle cloud surrounding the atom
- Nucleus pulse animation
- **Drag** to rotate · **Scroll** to zoom · **Touch pinch** to zoom on mobile
- Viewer controls:
  - ⟳ Auto-rotate toggle
  - ◉ Orbital shell diagram overlay
  - ⬡ Wireframe mode
  - ✦ Explode view (shells drift outward)
  - ♪ Sound effects (each element has a unique pitch)
- Navigate between elements with ◀ ▶ arrows or keyboard `←` `→`

### ◈ AR Gesture Mode
- Live webcam feed as background
- 3D atom rendered over the video in real time
- Hand skeleton overlay with glowing fingertip highlights
- Gesture controls:
  | Gesture | Action |
  |---|---|
  | Pinch (thumb + index) | Zoom in / out |
  | Wave palm | Rotate atom |
  | Two hands spread/close | Expand / contract |
  | Point finger at atom | Push electrons away |
- HUD displays: scale, rotation angle, FPS, hands detected, gesture name
- Falls back to **mouse demo mode** if camera is unavailable

### ⊞ Element Comparison
- Right-click two elements on the table → compare button appears
- Side-by-side modal showing: atomic mass, melting point, boiling point, density, period, group, electron config
- Green/red highlights for higher/lower numeric values

---

## Tech Stack

| Technology | Usage |
|---|---|
| **Three.js r128** | 3D atom rendering, WebGL |
| **MediaPipe Hands** | Real-time hand landmark detection |
| **GSAP 3** | Animation utilities |
| **Orbitron + Share Tech Mono** | Display typography |
| **Vanilla JS / HTML / CSS** | Everything else — zero dependencies |

---

## Running Locally

No install, no build step required.

```bash
# Clone the repo
git clone https://github.com/yourname/atomspace.git
cd atomspace

# Option A — open directly (table + viewer work, camera may not)
open index.html

# Option B — serve over HTTPS for full camera/AR support
npx serve .
# then open https://localhost:3000
```

> **Camera requires HTTPS.** The periodic table and 3D viewer work on any local file. For AR gesture mode you need to serve over HTTPS — `npx serve` handles this automatically.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `1` | Home |
| `2` | Periodic Table |
| `3` | Atom Viewer |
| `4` | AR Mode |
| `←` `→` | Previous / Next element |
| `R` | Toggle auto-rotate |
| `O` | Toggle orbital diagram |
| `W` | Toggle wireframe |
| `X` | Toggle explode view |
| `S` | Toggle sound effects |
| `Esc` | Close modals |

---

## Project Structure

```
atomspace/
├── index.html        # Entire application — single file
└── README.md
```

All logic is organized into clearly commented sections inside `index.html`:

```
// ELEMENT DATABASE       — 118 elements with full atomic data
// STARFIELD              — animated canvas background
// VIEW MANAGEMENT        — page routing with transitions
// PERIODIC TABLE         — grid builder, search, filter, compare
// TOOLTIP SYSTEM         — hover element cards
// ELEMENT COMPARISON     — side-by-side modal
// THREE.JS ATOM BUILDER  — nucleus + shells + particles
// ATOM ANIMATION LOOP    — electron orbital math, explode, trails
// ATOM VIEWER            — drag/scroll/touch interaction
// AR MODE                — camera init, canvas sizing
// HAND TRACKING          — MediaPipe setup, gesture processing
// GESTURE DETECTION      — pinch zoom, wave rotate, electron push
// SOUND ENGINE           — Web Audio API tones per element
```

---

## AR Mode Setup

1. Open the site over HTTPS
2. Click **AR MODE** in the nav
3. Allow camera permission when prompted
4. Click **◈ ENABLE HANDS**
5. Hold your hand in front of the camera

**Supported browsers:** Chrome (recommended), Edge, Firefox  
**Not supported:** Safari on iOS (WebRTC limitations)

---

## Element Data

Each element includes:
- Atomic number, symbol, name, atomic mass
- Electron configuration and shell breakdown
- Melting point, boiling point, density
- Category, period, group
- 3 interesting facts
- Real-world uses

---

## Deployment

Deployed on **Vercel** as a static site. Any static host works.

```bash
# Deploy with Vercel CLI
npm i -g vercel
vercel

# Or push to GitHub — Vercel auto-deploys on every push
git add .
git commit -m "your message"
git push
```

---

## License

MIT — free to use, modify, and distribute.

---

*Built with Three.js · MediaPipe · pure HTML/CSS/JS*