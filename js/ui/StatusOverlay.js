/**
 * Manages the gesture pill indicator.
 */
export class StatusOverlay {
  constructor() {
    this.gesturePill = document.getElementById('gesture-pill');
    this.gestureNameEl = document.getElementById('gesture-name');
    this.expansionValueEl = document.getElementById('expansion-value');
    this.handsDetectedEl = document.getElementById('hands-detected');
  }

  static GESTURE_LABELS = {
    none: 'Ready',
    open_palm: 'Rotating',
    pinch: 'Selecting',
    fist: 'Resetting',
    point: 'Highlighting',
    spread: 'Expanding',
    squeeze: 'Collapsing',
    swipe_left: 'Previous',
    swipe_right: 'Next'
  };

  setGesture(gesture) {
    const label = StatusOverlay.GESTURE_LABELS[gesture] || gesture;
    this.gestureNameEl.textContent = label;

    if (gesture !== 'none') {
      this.gesturePill.classList.add('active');
    } else {
      this.gesturePill.classList.remove('active');
    }
  }

  setExplosion(amount) {
    const pct = Math.round(amount * 100);
    this.expansionValueEl.textContent = `${pct}%`;
  }

  setHandsDetected(count) {
    this.handsDetectedEl.textContent = count;
  }
}
