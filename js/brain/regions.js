import * as THREE from 'three';

// ================================================================
// 3D Simplex Noise (compact implementation for realistic cortex folding)
// Based on Stefan Gustavson's simplex noise algorithm
// ================================================================

const F3 = 1.0 / 3.0;
const G3 = 1.0 / 6.0;

const grad3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];

function buildPermTable(seed) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher-Yates shuffle with seed
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod12[i] = perm[i] % 12;
  }
  return { perm, permMod12 };
}

function simplex3D(x, y, z, perm, permMod12) {
  const s = (x + y + z) * F3;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const k = Math.floor(z + s);
  const t = (i + j + k) * G3;

  const X0 = i - t, Y0 = j - t, Z0 = k - t;
  const x0 = x - X0, y0 = y - Y0, z0 = z - Z0;

  let i1, j1, k1, i2, j2, k2;
  if (x0 >= y0) {
    if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
    else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
    else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
  } else {
    if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
    else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
    else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
  }

  const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2*G3, y2 = y0 - j2 + 2*G3, z2 = z0 - k2 + 2*G3;
  const x3 = x0 - 1 + 3*G3, y3 = y0 - 1 + 3*G3, z3 = z0 - 1 + 3*G3;

  const ii = i & 255, jj = j & 255, kk = k & 255;

  let n0 = 0, n1 = 0, n2 = 0, n3 = 0;

  let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
  if (t0 >= 0) {
    t0 *= t0;
    const gi0 = permMod12[ii + perm[jj + perm[kk]]];
    n0 = t0 * t0 * (grad3[gi0][0]*x0 + grad3[gi0][1]*y0 + grad3[gi0][2]*z0);
  }
  let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
  if (t1 >= 0) {
    t1 *= t1;
    const gi1 = permMod12[ii+i1 + perm[jj+j1 + perm[kk+k1]]];
    n1 = t1 * t1 * (grad3[gi1][0]*x1 + grad3[gi1][1]*y1 + grad3[gi1][2]*z1);
  }
  let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
  if (t2 >= 0) {
    t2 *= t2;
    const gi2 = permMod12[ii+i2 + perm[jj+j2 + perm[kk+k2]]];
    n2 = t2 * t2 * (grad3[gi2][0]*x2 + grad3[gi2][1]*y2 + grad3[gi2][2]*z2);
  }
  let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
  if (t3 >= 0) {
    t3 *= t3;
    const gi3 = permMod12[ii+1 + perm[jj+1 + perm[kk+1]]];
    n3 = t3 * t3 * (grad3[gi3][0]*x3 + grad3[gi3][1]*y3 + grad3[gi3][2]*z3);
  }

  return 32.0 * (n0 + n1 + n2 + n3); // range ~[-1, 1]
}

/**
 * Fractal Brownian Motion — layered noise octaves for realistic wrinkle depth.
 */
function fbm(x, y, z, octaves, lacunarity, gain, perm, permMod12) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    sum += simplex3D(x * freq, y * freq, z * freq, perm, permMod12) * amp;
    maxAmp += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / maxAmp;
}

// ================================================================
// Hash helper
// ================================================================
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
}

// ================================================================
// Material creation — flesh-like organic material
// ================================================================

function createCortexMaterial(color) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.72,
    metalness: 0.0,
    clearcoat: 0.15,
    clearcoatRoughness: 0.6,
    sheen: 0.3,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3),
    emissive: new THREE.Color(color).multiplyScalar(0.04),
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 1.0
  });
}

function createInternalMaterial(color) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.6,
    metalness: 0.0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.5,
    emissive: new THREE.Color(color).multiplyScalar(0.06),
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 1.0
  });
}

// ================================================================
// Cortex displacement — creates realistic sulci and gyri
// ================================================================

/**
 * Apply multi-octave fractal noise displacement to create cortex folding.
 * Uses deeper grooves (sulci) with rounded ridges (gyri) in between.
 */
function applyCortrexFolding(geometry, seed, options = {}) {
  const {
    depth = 0.08,        // how deep the sulci carve
    frequency = 3.5,     // base wrinkle frequency
    octaves = 5,         // noise detail layers
    lacunarity = 2.2,    // frequency multiplier per octave
    gain = 0.5,          // amplitude falloff per octave
    ridgeSharpness = 1.6 // >1 = sharper sulci, rounded gyri
  } = options;

  const { perm, permMod12 } = buildPermTable(seed);
  const pos = geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    // Multi-octave noise
    let n = fbm(
      nx * frequency,
      ny * frequency,
      nz * frequency,
      octaves, lacunarity, gain, perm, permMod12
    );

    // Ridge transform: makes grooves sharp, peaks rounded (like real sulci/gyri)
    // abs(noise) creates ridge lines; inverting makes them grooves
    const ridge = 1.0 - Math.pow(Math.abs(n), 1.0 / ridgeSharpness);
    const displacement = -ridge * depth;

    // Add a second layer of finer detail
    const fine = fbm(
      nx * frequency * 3.5 + 100,
      ny * frequency * 3.5 + 100,
      nz * frequency * 3.5 + 100,
      3, 2.0, 0.4, perm, permMod12
    );
    const fineDisp = fine * depth * 0.2;

    pos.setXYZ(
      i,
      x + nx * (displacement + fineDisp),
      y + ny * (displacement + fineDisp),
      z + nz * (displacement + fineDisp)
    );
  }

  geometry.computeVertexNormals();
}

/**
 * Cerebellum-specific displacement: fine horizontal folia (parallel ridges).
 */
function applyCerebellumFolia(geometry, seed) {
  const { perm, permMod12 } = buildPermTable(seed);
  const pos = geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    // Horizontal striations — sin waves along Y axis
    const stripeFreq = 18.0;
    const stripe = Math.sin(ny * stripeFreq + nx * 2.0) * 0.5 + 0.5;
    const foliaDepth = Math.pow(stripe, 0.4) * 0.05;

    // Add subtle noise variation
    const n = fbm(nx * 4, ny * 4, nz * 4, 3, 2.0, 0.5, perm, permMod12);
    const noiseDisp = n * 0.015;

    const displacement = -foliaDepth + noiseDisp;

    pos.setXYZ(
      i,
      x + nx * displacement,
      y + ny * displacement,
      z + nz * displacement
    );
  }

  geometry.computeVertexNormals();
}

// ================================================================
// Shape creation helpers
// ================================================================

/**
 * Create an ellipsoid geometry with proper brain-like proportions.
 * Higher segment count for detailed cortex folding.
 */
function createEllipsoid(rx, ry, rz, wSeg = 64, hSeg = 48) {
  const geom = new THREE.SphereGeometry(1, wSeg, hSeg);
  geom.scale(rx, ry, rz);
  return geom;
}

/**
 * Clip geometry: remove vertices on one side of a plane.
 * This shapes lobes by cutting overlapping regions.
 * Instead of actually removing faces (complex), we push vertices
 * past the clip plane back to the plane — creating a flat cut surface.
 */
function clipGeometry(geometry, planeNormal, planeOffset) {
  const pos = geometry.attributes.position;
  const n = new THREE.Vector3(planeNormal[0], planeNormal[1], planeNormal[2]).normalize();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const dot = x * n.x + y * n.y + z * n.z;
    if (dot > planeOffset) {
      // Push vertex to the clip plane with slight inset
      const excess = dot - planeOffset;
      pos.setXYZ(
        i,
        x - n.x * excess * 0.95,
        y - n.y * excess * 0.95,
        z - n.z * excess * 0.95
      );
    }
  }
}

// ================================================================
// Lobe geometry creators
// ================================================================

function createFrontalLobe(regionData) {
  // Largest lobe: wide, tall, extends to front
  const geom = createEllipsoid(0.72, 0.62, 0.55);

  // Clip the back to create a flat junction with parietal
  clipGeometry(geom, [0, 0, -1], 0.05);
  // Clip the bottom to leave room for temporal lobes
  clipGeometry(geom, [0, -1, 0], 0.25);

  const seed = hashString(regionData.id);
  applyCortrexFolding(geom, seed, {
    depth: 0.07,
    frequency: 3.8,
    octaves: 5,
    ridgeSharpness: 1.8
  });

  const mat = createCortexMaterial(regionData.color);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...regionData.position);
  return mesh;
}

function createParietalLobe(regionData) {
  const geom = createEllipsoid(0.65, 0.45, 0.52);

  // Clip front
  clipGeometry(geom, [0, 0, 1], 0.1);
  // Clip bottom
  clipGeometry(geom, [0, -1, 0], 0.15);

  const seed = hashString(regionData.id);
  applyCortrexFolding(geom, seed, {
    depth: 0.065,
    frequency: 4.0,
    octaves: 5,
    ridgeSharpness: 1.7
  });

  const mat = createCortexMaterial(regionData.color);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...regionData.position);
  return mesh;
}

function createTemporalLobe(regionData) {
  // Elongated front-to-back, sits lower on the sides
  const geom = createEllipsoid(0.35, 0.35, 0.52);

  // Clip top
  clipGeometry(geom, [0, 1, 0], 0.12);

  const seed = hashString(regionData.id);
  applyCortrexFolding(geom, seed, {
    depth: 0.055,
    frequency: 4.2,
    octaves: 4,
    ridgeSharpness: 1.5
  });

  const mat = createCortexMaterial(regionData.color);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...regionData.position);
  return mesh;
}

function createOccipitalLobe(regionData) {
  const geom = createEllipsoid(0.52, 0.45, 0.38);

  // Clip front
  clipGeometry(geom, [0, 0, 1], 0.05);

  const seed = hashString(regionData.id);
  applyCortrexFolding(geom, seed, {
    depth: 0.06,
    frequency: 4.5,
    octaves: 5,
    ridgeSharpness: 1.6
  });

  const mat = createCortexMaterial(regionData.color);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...regionData.position);
  return mesh;
}

function createCerebellum(regionData) {
  // Wider than tall, distinctive fine texture
  const geom = createEllipsoid(0.52, 0.32, 0.35, 64, 48);

  // Clip top where it meets occipital
  clipGeometry(geom, [0, 1, 0], 0.1);

  const seed = hashString(regionData.id);
  applyCerebellumFolia(geom, seed);

  const mat = createCortexMaterial(regionData.color);
  mat.roughness = 0.8;
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...regionData.position);
  return mesh;
}

function createBrainStem(regionData) {
  // Smooth elongated cylinder that tapers downward
  const geom = new THREE.CylinderGeometry(0.1, 0.065, 0.65, 24, 16);

  // Smooth the top into a bulge (pons area)
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const r = Math.sqrt(pos.getX(i) ** 2 + pos.getZ(i) ** 2);

    if (y > 0.15 && r > 0.01) {
      // Pons bulge
      const bulge = 1.0 + Math.sin(((y - 0.15) / 0.17) * Math.PI) * 0.35;
      pos.setX(i, pos.getX(i) * bulge);
      pos.setZ(i, pos.getZ(i) * bulge);
    }
  }

  // Very subtle surface variation
  const seed = hashString(regionData.id);
  const { perm, permMod12 } = buildPermTable(seed);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x*x + y*y + z*z) || 1;
    const n = fbm(x*6, y*6, z*6, 2, 2, 0.5, perm, permMod12);
    pos.setXYZ(i, x + (x/len)*n*0.008, y + (y/len)*n*0.008, z + (z/len)*n*0.008);
  }
  geom.computeVertexNormals();

  const mat = createCortexMaterial(regionData.color);
  mat.roughness = 0.6;
  mat.clearcoat = 0.2;
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...regionData.position);
  return mesh;
}

// ================================================================
// Internal structure creators
// ================================================================

function createThalamus(regionData) {
  // Egg-shaped, slightly left-right elongated (two halves)
  const geom = createEllipsoid(0.18, 0.12, 0.15, 32, 24);
  const seed = hashString(regionData.id);
  const { perm, permMod12 } = buildPermTable(seed);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.sqrt(x*x+y*y+z*z)||1;
    const n = fbm(x*8, y*8, z*8, 3, 2, 0.5, perm, permMod12);
    pos.setXYZ(i, x+(x/len)*n*0.01, y+(y/len)*n*0.01, z+(z/len)*n*0.01);
  }
  geom.computeVertexNormals();

  const mat = createInternalMaterial(regionData.color);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...regionData.position);
  return mesh;
}

function createHypothalamus(regionData) {
  const geom = createEllipsoid(0.1, 0.08, 0.1, 24, 18);
  const seed = hashString(regionData.id);
  const { perm, permMod12 } = buildPermTable(seed);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.sqrt(x*x+y*y+z*z)||1;
    const n = fbm(x*10, y*10, z*10, 2, 2, 0.5, perm, permMod12);
    pos.setXYZ(i, x+(x/len)*n*0.005, y+(y/len)*n*0.005, z+(z/len)*n*0.005);
  }
  geom.computeVertexNormals();

  const mat = createInternalMaterial(regionData.color);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...regionData.position);
  return mesh;
}

function createHippocampus(regionData) {
  // Curved seahorse shape
  const points = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const angle = t * Math.PI * 1.2;
    const r = 0.12 - t * 0.04;
    const x = Math.cos(angle) * r * 0.5;
    const y = Math.sin(angle) * r * 0.3 - t * 0.08;
    const z = t * 0.2 - 0.1;
    points.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const geom = new THREE.TubeGeometry(curve, 20, 0.04, 12, false);

  const seed = hashString(regionData.id);
  const { perm, permMod12 } = buildPermTable(seed);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.sqrt(x*x+y*y+z*z)||1;
    const n = fbm(x*12, y*12, z*12, 2, 2, 0.5, perm, permMod12);
    pos.setXYZ(i, x+(x/len)*n*0.006, y+(y/len)*n*0.006, z+(z/len)*n*0.006);
  }
  geom.computeVertexNormals();

  const mat = createInternalMaterial(regionData.color);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...regionData.position);
  return mesh;
}

function createAmygdala(regionData) {
  // Small almond shape
  const geom = createEllipsoid(0.06, 0.07, 0.05, 20, 16);
  const seed = hashString(regionData.id);
  const { perm, permMod12 } = buildPermTable(seed);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.sqrt(x*x+y*y+z*z)||1;
    const n = fbm(x*15, y*15, z*15, 2, 2, 0.5, perm, permMod12);
    pos.setXYZ(i, x+(x/len)*n*0.004, y+(y/len)*n*0.004, z+(z/len)*n*0.004);
  }
  geom.computeVertexNormals();

  const mat = createInternalMaterial(regionData.color);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...regionData.position);
  return mesh;
}

function createCorpusCallosum(regionData) {
  // Arched band connecting hemispheres
  const pts = [];
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = Math.PI * 0.1 + t * Math.PI * 0.8;
    const x = 0;
    const y = Math.sin(angle) * 0.22 + 0.25;
    const z = (t - 0.5) * 1.1;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geom = new THREE.TubeGeometry(curve, 24, 0.04, 10, false);

  // Flatten to be more band-like
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) * 3.0);
  }
  geom.computeVertexNormals();

  const mat = createInternalMaterial(regionData.color);
  mat.roughness = 0.75;
  mat.color.set(0xdde4ee);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...regionData.position);
  return mesh;
}

function createBasalGanglia(regionData) {
  const geom = createEllipsoid(0.14, 0.12, 0.12, 24, 18);
  const seed = hashString(regionData.id);
  const { perm, permMod12 } = buildPermTable(seed);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.sqrt(x*x+y*y+z*z)||1;
    const n = fbm(x*8, y*8, z*8, 3, 2, 0.5, perm, permMod12);
    pos.setXYZ(i, x+(x/len)*n*0.01, y+(y/len)*n*0.01, z+(z/len)*n*0.01);
  }
  geom.computeVertexNormals();

  const mat = createInternalMaterial(regionData.color);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...regionData.position);
  return mesh;
}

// ================================================================
// Outer Brain Shell — transparent anatomical envelope
// ================================================================

/**
 * Create a transparent outer brain shell that looks like a real brain.
 * Features:
 *  - Interhemispheric (longitudinal) fissure down the midline
 *  - Lateral (Sylvian) fissure on the sides
 *  - Temporal lobe bulge on the lower sides
 *  - Flattened base
 *  - Frontal pole rounding, occipital taper
 *  - Cortex folding (sulci & gyri)
 *  - Semi-transparent material so colored regions show through
 */
export function createBrainShell() {
  // High-detail base sphere
  const segments = 96;
  const geom = new THREE.SphereGeometry(1, segments, segments);

  // Scale into brain proportions (wider left-right than front-back)
  // Centered to encompass all region positions
  const scaleX = 1.08;  // left-right width
  const scaleY = 0.82;  // height
  const scaleZ = 1.0;   // front-back depth
  geom.scale(scaleX, scaleY, scaleZ);

  const pos = geom.attributes.position;
  const seed = 42;
  const { perm, permMod12 } = buildPermTable(seed);

  // ---- Pass 1: Anatomical shaping ----
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    // Normalized direction from center
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    // 1) Interhemispheric fissure — groove down the top along z-axis
    //    Strongest at the top (y>0), weaker at front/back poles
    const distFromMidline = Math.abs(nx); // 0 at midline, 1 at sides
    if (ny > -0.1) {
      const fissureStrength = Math.max(0, 1.0 - distFromMidline * 6.0); // narrow band
      const topFactor = Math.max(0, ny + 0.1); // stronger when higher
      // Don't apply at the very front or very back poles
      const poleFade = 1.0 - Math.pow(Math.abs(nz), 3.0);
      const indent = fissureStrength * topFactor * poleFade * 0.12;
      y -= indent;
    }

    // 2) Flatten the base
    if (ny < -0.3) {
      const flatFactor = (-0.3 - ny) * 0.5;
      y += flatFactor * 0.4;
    }

    // 3) Temporal lobe bulge — outward push on lower sides
    if (ny < 0.05 && ny > -0.5 && Math.abs(nx) > 0.3) {
      const sideFactor = (Math.abs(nx) - 0.3) / 0.7;
      const heightFactor = 1.0 - Math.abs((ny + 0.2) / 0.3);
      const bulge = sideFactor * Math.max(0, heightFactor) * 0.06;
      x += Math.sign(nx) * bulge;
      y -= bulge * 0.3; // push slightly down too
    }

    // 4) Lateral (Sylvian) fissure — groove on sides between upper and lower lobes
    if (Math.abs(nx) > 0.35 && ny > -0.2 && ny < 0.15) {
      const sideFactor = Math.max(0, Math.abs(nx) - 0.35) / 0.65;
      const bandWidth = 1.0 - Math.pow((ny + 0.025) / 0.15, 2);
      const sylvian = sideFactor * Math.max(0, bandWidth) * 0.04;
      // Push inward (toward center)
      x -= Math.sign(nx) * sylvian;
      y -= sylvian * 0.3;
    }

    // 5) Frontal pole — slightly more rounded/bulbous
    if (nz > 0.5) {
      const frontFactor = (nz - 0.5) / 0.5;
      z += frontFactor * 0.03;
    }

    // 6) Occipital taper — slightly narrower at back
    if (nz < -0.5) {
      const backFactor = (-0.5 - nz) / 0.5;
      x *= 1.0 - backFactor * 0.08;
    }

    pos.setXYZ(i, x, y, z);
  }

  // ---- Pass 2: Cortex folding (sulci & gyri) ----
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    // Multi-octave noise for folding
    const freq = 3.2;
    let n = fbm(nx * freq, ny * freq, nz * freq, 5, 2.2, 0.5, perm, permMod12);

    // Ridge transform — sharp grooves, rounded ridges
    const ridge = 1.0 - Math.pow(Math.abs(n), 0.6);
    let displacement = -ridge * 0.055;

    // Finer detail layer
    const fine = fbm(
      nx * freq * 3.5 + 50,
      ny * freq * 3.5 + 50,
      nz * freq * 3.5 + 50,
      3, 2.0, 0.4, perm, permMod12
    );
    displacement += fine * 0.012;

    // Reduce folding on the base (flatter underside)
    if (ny < -0.3) {
      const dampen = 1.0 - Math.min(1.0, (-0.3 - ny) * 3.0);
      displacement *= dampen;
    }

    pos.setXYZ(
      i,
      x + nx * displacement,
      y + ny * displacement,
      z + nz * displacement
    );
  }

  geom.computeVertexNormals();

  // Semi-transparent flesh-toned material
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xd4a0a0,
    roughness: 0.7,
    metalness: 0.0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.5,
    sheen: 0.2,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(0xe8c8c8),
    transparent: true,
    opacity: 0.18,
    depthWrite: false,       // so colored regions show through cleanly
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geom, mat);
  // Center the shell to encompass all regions
  mesh.position.set(0, 0.0, -0.1);

  return mesh;
}

// ================================================================
// Public API
// ================================================================

const CREATORS = {
  frontal_lobe: createFrontalLobe,
  parietal_lobe: createParietalLobe,
  temporal_lobe_left: createTemporalLobe,
  temporal_lobe_right: createTemporalLobe,
  occipital_lobe: createOccipitalLobe,
  cerebellum: createCerebellum,
  brain_stem: createBrainStem,
  thalamus: createThalamus,
  hypothalamus: createHypothalamus,
  hippocampus: createHippocampus,
  amygdala: createAmygdala,
  corpus_callosum: createCorpusCallosum,
  basal_ganglia: createBasalGanglia
};

/**
 * Create a mesh for a given region data object.
 * Returns a THREE.Mesh with userData.regionId set.
 */
export function createRegionMesh(regionData) {
  const creator = CREATORS[regionData.id];
  const mesh = creator
    ? creator(regionData)
    : createDefaultInternal(regionData);

  mesh.userData.regionId = regionData.id;
  mesh.userData.regionData = regionData;
  mesh.userData.basePosition = mesh.position.clone();

  return mesh;
}

function createDefaultInternal(regionData) {
  const [sx, sy, sz] = regionData.scale;
  const geom = createEllipsoid(sx * 0.3, sy * 0.3, sz * 0.3, 24, 18);
  const mat = createInternalMaterial(regionData.color);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(...regionData.position);
  return mesh;
}
