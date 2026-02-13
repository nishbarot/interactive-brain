# Interactive 3D Brain

A real-time, gesture-controlled 3D brain visualization powered by **Three.js** and **MediaPipe** hand tracking. Designed for therapists, medical students, and educators to explore brain anatomy interactively.

## Features

- **Real-time 3D rendering** — High-fidelity procedurally-generated brain mesh with realistic materials
- **Hand gesture control** — Uses your webcam to detect hand positions and recognize gestures:
  - **Twist pose** — Rotate the brain by twisting your hand like screwing a lightbulb
  - **Pinch** — Select and cycle through brain regions
  - **Fist (hold 800ms)** — Reset to default view
  - **Spread** (two hands apart) — Expand and explode brain regions
  - **Squeeze** (two hands together) — Collapse brain regions
  - **Swipe** — Cycle through regions left/right
- **Labeled brain regions** — 10+ anatomically accurate brain regions with color coding, descriptions, functions, and associated conditions
- **Floating info panel** — Tap a region to see detailed neuroscience information
- **Smooth, fluid controls** — Responsive rotation with zero velocity caps and momentum decay
- **Minimalist UI** — Full-bleed canvas with glass-morphism floating controls

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A modern browser with WebGL support (Chrome, Firefox, Safari, Edge)
- Webcam access (required for hand tracking)

### Installation

```bash
# Clone or navigate to the project directory
cd interactive-brain

# Install dependencies
npm install
```

### Running the Development Server

```bash
npm run dev
```

The application will start on `http://localhost:5173` (or the next available port).

Open the URL in your browser. **Allow camera access** when prompted — this is required for hand gesture tracking.

### Building for Production

```bash
npm build
npm run preview
```

## How to Use

### Gesture Controls

1. **Position yourself** — Sit about 1–2 feet from your webcam
2. **Twist to rotate** — Make a fist with your hand, then rotate your wrist left/right like twisting a lightbulb. The brain rotates smoothly 360° in correlation with your motion.
3. **Pinch to select** — Bring your thumb and index finger together to select and cycle through brain regions. The info panel appears on the right.
4. **Spread to expand** — Hold both hands in front of the camera and move them apart to explode the brain regions.
5. **Squeeze to collapse** — Move both hands together to collapse regions back to normal.
6. **Hold fist to reset** — Hold a closed fist for 800ms to return the brain to its default orientation and state.
7. **Swipe to cycle** — Swipe your hand left or right to cycle through regions.

### Keyboard Shortcuts

- **R** — Reset to default view
- **Q** — Toggle webcam visibility (useful for testing hand tracking)

### Info Card

When you select a region, an info card appears showing:
- Region name and color
- Anatomical description
- Key functions
- Associated medical conditions

Click the ✕ button to close the card.

## Architecture

### Core Files

- **`js/main.js`** — Application entry point; initializes Three.js scene, MediaPipe hand tracking, and the update loop
- **`js/brain/BrainModel.js`** — 3D brain model with region meshes, explosion animations, and selection logic
- **`js/brain/regions.js`** — Procedural geometry generation for realistic brain shape and colored region meshes
- **`js/brain/regionData.js`** — Anatomical data: region definitions, names, descriptions, functions, and conditions
- **`js/tracking/GestureRecognizer.js`** — MediaPipe integration; converts raw hand landmarks into discrete gestures
- **`js/controls/GestureControls.js`** — Maps gestures to brain model actions (rotation, expansion, selection)
- **`js/ui/StatusOverlay.js`** — Floating gesture status pill and cheat-sheet
- **`css/styles.css`** — Glass-morphism styling, responsive layout

### Key Technologies

- **Three.js** (v0.182.0) — 3D rendering engine
- **MediaPipe Tasks Vision** (v0.10.18) — Real-time hand landmark detection
- **Vite** (v6.2.1) — Development server and build tool
- **CSS3** — Glass-morphism effects, animations, responsive design

### Gesture Recognition Pipeline

1. Webcam feed → MediaPipe HandLandmarker → 21 landmarks per hand
2. Landmarks → GestureRecognizer → Gesture classification (twist_pose, pinch, fist, spread, squeeze, swipe)
3. Gesture + metadata → GestureControls → Brain model updates
4. Brain model → Three.js rendering → canvas display

### Rotation Control Details

The twist-pose rotation uses:
- **Hand roll angle** — Calculated from index MCP to pinky MCP line
- **Dual-axis twist signal** — Palm axis (primary) + pinch axis (secondary, for thumb+index twists)
- **Outlier rejection & adaptive deadzone** — Removes jitter and camera noise
- **EMA smoothing** — Smooth, fluid motion without lag
- **Uncapped velocity** — Full 360° rotation proportional to hand twist speed
- **Target sync** — Gesture and decay phases keep BrainModel targets in sync, preventing fighting/restrictive feel

## Customization

### Sensitivity Parameters

Edit `js/controls/GestureControls.js`:

```javascript
this._twistSensitivity = 2.8;      // Twist speed multiplier (lower = slower)
this._tiltSensitivity = 2.2;       // Vertical tilt speed multiplier
this._twistAccel = 0.45;           // Acceleration toward target twist velocity
this._twistDecel = 0.15;           // Deceleration when gesture ends
this._expansionSmoothing = 0.3;    // Spread/squeeze smoothing
```

### Brain Colors & Regions

Edit `js/brain/regionData.js` to add, remove, or customize regions:

```javascript
{
  id: 'prefrontal_cortex',
  name: 'Prefrontal Cortex',
  color: 0xff6b9d,
  description: '...',
  functions: ['...'],
  conditions: ['...']
}
```

### Gesture Thresholds

Edit `js/tracking/GestureRecognizer.js` to adjust gesture detection sensitivity:

```javascript
this._twistPoseEnterThreshold = 0.58;
this._twistPoseExitThreshold = 0.42;
// ... other gesture thresholds
```

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome  | ✓ Full  |
| Firefox | ✓ Full  |
| Safari  | ✓ Full  |
| Edge    | ✓ Full  |

**Note:** Requires WebGL support and modern JavaScript (ES2020+).

## Performance

- Runs at 60 FPS on most devices (WebGL-capable laptops, desktops)
- Hand tracking latency ~100–150ms
- Optimized Three.js rendering with culling and material pooling
- Responsive to slow hand movements and fast twists

## Known Limitations

- Hand tracking works best in well-lit environments
- Occlusion (hands behind body/objects) may cause tracking loss
- Single or dual-hand tracking only (3+ hands not supported)
- Mobile browsers with limited WebGL support may experience reduced performance

## Future Enhancements

- [ ] Brain slicing / cross-section views
- [ ] Neural connectivity visualization
- [ ] Multi-language support for region names/descriptions
- [ ] Recording and playback of gestures
- [ ] VR/AR support
- [ ] Educational quiz mode
- [ ] Accessibility improvements (keyboard-only mode, screen reader support)

## License

MIT

## Support

For issues, feedback, or feature requests, please refer to the project's issue tracker or contact the development team.

---

**Made for educators, therapists, and curious minds. Explore the brain, one gesture at a time.**
