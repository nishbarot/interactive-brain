import { BRAIN_REGIONS } from '../brain/regionData.js';

/**
 * Manages the floating info card that shows selected region details.
 */
export class InfoPanel {
  constructor() {
    this.card = document.getElementById('info-card');
    this.dotEl = document.getElementById('info-color-dot');
    this.nameEl = document.getElementById('region-name');
    this.descEl = document.getElementById('region-description');
    this.functionsEl = document.getElementById('region-functions');
    this.conditionsEl = document.getElementById('region-conditions');
    this.closeBtn = document.getElementById('info-close');

    this.currentRegionId = null;

    this.closeBtn.addEventListener('click', () => {
      this.show(null);
    });
  }

  /**
   * Show details for a brain region. Pass null to hide.
   */
  show(regionId) {
    if (regionId === this.currentRegionId) return;
    this.currentRegionId = regionId;

    if (!regionId) {
      this.card.classList.add('hidden');
      return;
    }

    const data = BRAIN_REGIONS.find(r => r.id === regionId);
    if (!data) return;

    // Color
    const hex = '#' + data.color.toString(16).padStart(6, '0');

    this.dotEl.style.background = hex;
    this.nameEl.textContent = data.name;
    this.descEl.textContent = data.description;

    // Functions as pills
    this.functionsEl.innerHTML = '';
    for (const fn of data.functions) {
      const li = document.createElement('li');
      li.textContent = fn;
      this.functionsEl.appendChild(li);
    }

    // Conditions as pills
    this.conditionsEl.innerHTML = '';
    for (const cond of data.conditions) {
      const li = document.createElement('li');
      li.textContent = cond;
      this.conditionsEl.appendChild(li);
    }

    // Show with re-trigger animation
    this.card.classList.remove('hidden');
    this.card.style.animation = 'none';
    void this.card.offsetHeight;
    this.card.style.animation = '';
  }
}
