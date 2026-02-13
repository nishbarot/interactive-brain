import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/**
 * Manages CSS2D labels attached to brain region meshes.
 */
export class Labels {
  constructor(brainModel) {
    this.brainModel = brainModel;
    this.labels = new Map(); // regionId -> CSS2DObject
    this._createLabels();
  }

  _createLabels() {
    for (const [regionId, mesh] of this.brainModel.meshes) {
      const data = this.brainModel.getRegionData(regionId);
      if (!data) continue;

      const div = document.createElement('div');
      div.className = 'brain-label';
      div.textContent = data.name;

      const label = new CSS2DObject(div);
      // Position label slightly above the mesh center
      label.position.set(0, 0.12, 0);
      label.center.set(0.5, 1); // anchor bottom-center
      mesh.add(label);

      this.labels.set(regionId, { object: label, element: div });
    }
  }

  /**
   * Update label states based on current selection and explosion.
   * @param {string|null} selectedId - currently selected region ID
   * @param {number} explosionAmount - 0 to 1
   */
  update(selectedId, explosionAmount) {
    // Show labels when brain is somewhat expanded, or when a region is selected
    const showLabels = explosionAmount > 0.05 || selectedId !== null;

    for (const [regionId, { element }] of this.labels) {
      if (!showLabels) {
        element.style.display = 'none';
        continue;
      }

      element.style.display = '';

      // Reset classes
      element.classList.remove('active', 'dimmed');

      if (selectedId === null) {
        // No selection — all labels normal
        element.style.opacity = Math.min(1, explosionAmount * 3 + 0.2);
      } else if (regionId === selectedId) {
        element.classList.add('active');
        element.style.opacity = '1';
      } else {
        element.classList.add('dimmed');
        element.style.opacity = '0.3';
      }
    }
  }

  /**
   * Force all labels visible (e.g., for initial state).
   */
  showAll() {
    for (const [, { element }] of this.labels) {
      element.style.display = '';
      element.style.opacity = '1';
      element.classList.remove('active', 'dimmed');
    }
  }

  /**
   * Hide all labels.
   */
  hideAll() {
    for (const [, { element }] of this.labels) {
      element.style.display = 'none';
    }
  }
}
