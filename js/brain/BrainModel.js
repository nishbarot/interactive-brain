import * as THREE from 'three';
import { BRAIN_REGIONS } from './regionData.js';
import { createRegionMesh, createBrainShell } from './regions.js';

/**
 * Manages the 3D brain model: all region meshes, explosion,
 * highlighting, color changes, selection cycling, and idle animation.
 */
export class BrainModel {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.meshes = new Map();       // regionId -> THREE.Mesh
    this.regionList = [];           // ordered list of region IDs
    this.selectedIndex = -1;
    this.selectedId = null;

    // Explosion state
    this.explosionAmount = 0;       // 0 = collapsed, 1 = fully exploded
    this.targetExplosion = 0;
    this.explosionSpeed = 2.0;      // units per second

    // Rotation state
    this.targetRotationY = 0;
    this.targetRotationX = 0;
    this.idleRotationSpeed = 0.15;  // radians per second
    this.isIdle = true;

    // Pulse state for selected region
    this.pulseTime = 0;

    // Outer brain shell
    this.shell = null;
    this.shellBaseOpacity = 0.18;

    this._buildRegions();
    this._buildShell();
    scene.add(this.group);
  }

  _buildRegions() {
    for (const regionData of BRAIN_REGIONS) {
      const mesh = createRegionMesh(regionData);
      this.group.add(mesh);
      this.meshes.set(regionData.id, mesh);
      this.regionList.push(regionData.id);
    }
  }

  _buildShell() {
    this.shell = createBrainShell();
    this.group.add(this.shell);
  }

  /**
   * Get all region meshes as an array (for raycasting).
   * Excludes the shell so clicks pass through to regions.
   */
  getMeshArray() {
    return Array.from(this.meshes.values());
  }

  /**
   * Get region data by ID.
   */
  getRegionData(regionId) {
    return BRAIN_REGIONS.find(r => r.id === regionId) || null;
  }

  // ==================== Explosion ====================

  /**
   * Set explosion amount (0-1). Will animate toward this value.
   */
  setExplosion(amount) {
    this.targetExplosion = Math.max(0, Math.min(1, amount));
  }

  /**
   * Directly add to the current explosion target.
   */
  addExplosion(delta) {
    this.targetExplosion = Math.max(0, Math.min(1, this.targetExplosion + delta));
  }

  _updateExplosion(dt) {
    // Lerp toward target
    const diff = this.targetExplosion - this.explosionAmount;
    if (Math.abs(diff) < 0.001) {
      this.explosionAmount = this.targetExplosion;
    } else {
      // Spring-like easing
      this.explosionAmount += diff * Math.min(1, this.explosionSpeed * dt * 3);
    }

    const explodeFactor = this.explosionAmount * 1.8; // max distance multiplier

    // Fade the shell as regions explode outward
    if (this.shell) {
      // Shell fully visible at explosion=0, fades to 0 by explosion=0.35
      const shellOpacity = this.shellBaseOpacity * Math.max(0, 1.0 - this.explosionAmount / 0.35);
      this.shell.material.opacity = shellOpacity;
      this.shell.visible = shellOpacity > 0.005;
    }

    for (const [id, mesh] of this.meshes) {
      const data = this.getRegionData(id);
      if (!data) continue;

      const base = mesh.userData.basePosition;
      const dir = data.explodeDir;
      const dirVec = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();

      mesh.position.set(
        base.x + dirVec.x * explodeFactor,
        base.y + dirVec.y * explodeFactor,
        base.z + dirVec.z * explodeFactor
      );
    }
  }

  // ==================== Selection / Highlight ====================

  /**
   * Highlight a specific region by ID. Pass null to deselect.
   */
  highlightRegion(regionId) {
    this.selectedId = regionId;
    this.selectedIndex = regionId ? this.regionList.indexOf(regionId) : -1;

    for (const [id, mesh] of this.meshes) {
      const mat = mesh.material;
      const data = this.getRegionData(id);

      if (regionId === null) {
        // No selection — restore all
        mat.opacity = 1.0;
        mat.emissiveIntensity = 0.3;
        mat.emissive.set(data.color);
        mat.emissive.multiplyScalar(0.05);
      } else if (id === regionId) {
        // Selected region
        mat.opacity = 1.0;
        mat.emissiveIntensity = 0.8;
        mat.emissive.set(data.color);
        mat.emissive.multiplyScalar(0.3);
      } else {
        // Dimmed region
        mat.opacity = 0.35;
        mat.emissiveIntensity = 0.1;
        mat.emissive.set(data.color);
        mat.emissive.multiplyScalar(0.02);
      }
    }
  }

  /**
   * Cycle to the next region.
   */
  selectNext() {
    if (this.regionList.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.regionList.length;
    this.highlightRegion(this.regionList[this.selectedIndex]);
    return this.selectedId;
  }

  /**
   * Cycle to the previous region.
   */
  selectPrevious() {
    if (this.regionList.length === 0) return;
    this.selectedIndex =
      (this.selectedIndex - 1 + this.regionList.length) % this.regionList.length;
    this.highlightRegion(this.regionList[this.selectedIndex]);
    return this.selectedId;
  }

  /**
   * Reset selection and explosion.
   */
  reset() {
    this.highlightRegion(null);
    this.targetExplosion = 0;
    this.targetRotationX = 0;
    this.targetRotationY = 0;
  }

  // ==================== Color Changes ====================

  /**
   * Temporarily change a region's color (animated lerp).
   */
  setRegionColor(regionId, color) {
    const mesh = this.meshes.get(regionId);
    if (!mesh) return;
    mesh.material.color.set(color);
  }

  /**
   * Restore a region's original color.
   */
  restoreRegionColor(regionId) {
    const mesh = this.meshes.get(regionId);
    const data = this.getRegionData(regionId);
    if (!mesh || !data) return;
    mesh.material.color.set(data.color);
  }

  // ==================== Rotation ====================

  /**
   * Set target rotation (for hand-controlled rotation).
   */
  setRotation(rx, ry) {
    this.targetRotationX = rx;
    this.targetRotationY = ry;
    this.isIdle = false;
  }

  /**
   * Enable idle rotation mode.
   */
  setIdle(idle) {
    this.isIdle = idle;
  }

  // ==================== Update ====================

  /**
   * Called each frame with delta time in seconds.
   */
  update(dt, elapsedTime) {
    // Explosion animation
    this._updateExplosion(dt);

    // Rotation
    if (this.isIdle) {
      this.group.rotation.y += this.idleRotationSpeed * dt;
    } else {
      // Smooth lerp toward target rotation
      this.group.rotation.y += (this.targetRotationY - this.group.rotation.y) * Math.min(1, 5 * dt);
      this.group.rotation.x += (this.targetRotationX - this.group.rotation.x) * Math.min(1, 5 * dt);
    }

    // Clamp X rotation
    this.group.rotation.x = Math.max(-0.8, Math.min(0.8, this.group.rotation.x));

    // Pulse selected region
    if (this.selectedId) {
      this.pulseTime += dt;
      const mesh = this.meshes.get(this.selectedId);
      if (mesh) {
        const pulse = 0.6 + Math.sin(this.pulseTime * 3) * 0.4;
        mesh.material.emissiveIntensity = pulse;
      }
    }
  }
}
