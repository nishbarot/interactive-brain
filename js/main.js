import * as THREE from 'three';
import { createScene } from './scene.js';
import { BrainModel } from './brain/BrainModel.js';
import { Labels } from './ui/Labels.js';
import { HandTracker } from './tracking/HandTracker.js';
import { GestureRecognizer } from './tracking/GestureRecognizer.js';
import { GestureControls } from './controls/GestureControls.js';
import { InfoPanel } from './ui/InfoPanel.js';
import { StatusOverlay } from './ui/StatusOverlay.js';

async function init() {
  const canvas = document.getElementById('brain-canvas');
  const { scene, camera, renderer, labelRenderer, handleResize } = createScene(canvas);

  const brain = new BrainModel(scene);
  const labels = new Labels(brain);
  labels.hideAll();

  const infoPanel = new InfoPanel();
  const statusOverlay = new StatusOverlay();

  const handTracker = new HandTracker();
  const gestureRecognizer = new GestureRecognizer();
  const gestureControls = new GestureControls(brain);

  // Wire UI callbacks
  gestureControls.onGestureChange = (gesture) => {
    statusOverlay.setGesture(gesture);
  };

  gestureControls.onRegionSelect = (regionId) => {
    infoPanel.show(regionId);
  };

  gestureControls.onExplosionChange = (amount) => {
    statusOverlay.setExplosion(amount);
  };

  // Hand tracking
  let latestGestureData = null;

  handTracker.onResults = (results) => {
    const gestureData = gestureRecognizer.recognize(results);
    latestGestureData = gestureData;
    statusOverlay.setHandsDetected(gestureData.handsDetected);
  };

  handTracker.init().catch((err) => {
    console.warn('Hand tracking could not start:', err);
  });

  // ===== Keyboard =====
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'd': {
        const sel = brain.selectNext();
        infoPanel.show(sel);
        if (brain.targetExplosion < 0.15) brain.setExplosion(0.2);
        statusOverlay.setExplosion(brain.targetExplosion);
        break;
      }
      case 'ArrowLeft':
      case 'a': {
        const sel = brain.selectPrevious();
        infoPanel.show(sel);
        if (brain.targetExplosion < 0.15) brain.setExplosion(0.2);
        statusOverlay.setExplosion(brain.targetExplosion);
        break;
      }
      case 'ArrowUp':
      case 'w':
        brain.addExplosion(0.1);
        statusOverlay.setExplosion(brain.targetExplosion);
        break;
      case 'ArrowDown':
      case 's':
        brain.addExplosion(-0.1);
        statusOverlay.setExplosion(brain.targetExplosion);
        break;
      case 'r':
        brain.reset();
        infoPanel.show(null);
        statusOverlay.setExplosion(0);
        statusOverlay.setGesture('none');
        break;
      case 'Escape':
        brain.reset();
        infoPanel.show(null);
        statusOverlay.setExplosion(0);
        statusOverlay.setGesture('none');
        break;
    }
  });

  // ===== Mouse =====
  let isDragging = false;
  let dragMoved = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragMoved = false;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    brain.setIdle(false);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved = true;
    brain.group.rotation.y += dx * 0.005;
    brain.group.rotation.x += dy * 0.005;
    brain.group.rotation.x = Math.max(-0.8, Math.min(0.8, brain.group.rotation.x));
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    setTimeout(() => {
      if (!isDragging) brain.setIdle(true);
    }, 2000);
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    brain.addExplosion(e.deltaY * -0.001);
    statusOverlay.setExplosion(brain.targetExplosion);
  }, { passive: false });

  // Click to select
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  canvas.addEventListener('click', (e) => {
    if (dragMoved) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(brain.getMeshArray());

    if (intersects.length > 0) {
      const regionId = intersects[0].object.userData.regionId;
      if (regionId) {
        brain.highlightRegion(regionId);
        infoPanel.show(regionId);
        if (brain.targetExplosion < 0.15) {
          brain.setExplosion(0.2);
          statusOverlay.setExplosion(0.2);
        }
      }
    } else {
      // Click empty space to deselect
      brain.highlightRegion(null);
      infoPanel.show(null);
    }
  });

  // ===== Render Loop =====
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    if (latestGestureData) {
      gestureControls.update(latestGestureData);
      latestGestureData = null;
    }

    brain.update(dt, elapsed);
    labels.update(brain.selectedId, brain.explosionAmount);

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  handleResize();
  animate();
}

init();
