import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

/**
 * Creates and manages the Three.js scene, camera, renderers, and lighting.
 * Studio-quality lighting designed to showcase organic brain surface detail.
 */
export function createScene(canvas) {
  // Scene
  const scene = new THREE.Scene();

  // Camera — slightly elevated angle for anatomical view
  const camera = new THREE.PerspectiveCamera(
    55,
    1, // aspect updated on resize
    0.1,
    100
  );
  camera.position.set(0, 0.6, 4.2);
  camera.lookAt(0, 0, 0);

  // WebGL Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // CSS2D Renderer (for labels)
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.id = 'label-renderer';
  const container = canvas.parentElement;
  container.appendChild(labelRenderer.domElement);

  // ===== Studio Lighting for Anatomical Model =====

  // Soft ambient fill — avoids completely dark shadows
  const ambientLight = new THREE.AmbientLight(0x606880, 0.6);
  scene.add(ambientLight);

  // Key light — warm, upper-right, like an exam lamp
  const keyLight = new THREE.DirectionalLight(0xfff5e8, 1.4);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);

  // Fill light — cooler, from left to reveal surface detail in shadows
  const fillLight = new THREE.DirectionalLight(0xb8c8e0, 0.6);
  fillLight.position.set(-4, 2, 2);
  scene.add(fillLight);

  // Rim/back light — highlights the brain silhouette edge
  const rimLight = new THREE.DirectionalLight(0xdda0dd, 0.4);
  rimLight.position.set(0, 1, -5);
  scene.add(rimLight);

  // Bottom fill — very subtle, prevents underside from going black
  const bottomFill = new THREE.DirectionalLight(0x8090a0, 0.2);
  bottomFill.position.set(0, -3, 1);
  scene.add(bottomFill);

  // Hemisphere light for natural ambient gradient (sky/ground)
  const hemiLight = new THREE.HemisphereLight(0x8899aa, 0x443344, 0.3);
  scene.add(hemiLight);

  // Dark background sphere
  const bgGeom = new THREE.SphereGeometry(50, 32, 32);
  const bgMat = new THREE.MeshBasicMaterial({
    color: 0x08090d,
    side: THREE.BackSide
  });
  const bgSphere = new THREE.Mesh(bgGeom, bgMat);
  scene.add(bgSphere);

  // Resize handling
  function handleResize() {
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
  }

  window.addEventListener('resize', handleResize);
  requestAnimationFrame(handleResize);

  return {
    scene,
    camera,
    renderer,
    labelRenderer,
    handleResize
  };
}
