/**
 * Maps recognized gestures to BrainModel actions.
 *
 * Intuitive gesture mapping:
 *  - Open palm + move  → Rotate brain (relative delta, like grabbing and turning)
 *  - Pinch             → Select/cycle region (debounced, single action)
 *  - Fist (hold 800ms) → Reset everything
 *  - Point             → Highlight nearest region via direction (or idle)
 *  - Two hands apart   → Expand brain regions
 *  - Two hands together→ Collapse brain regions
 *  - Swipe left/right  → Cycle through regions
 *
 * All inputs are smoothed with exponential moving averages.
 */
export class GestureControls {
  constructor(brainModel) {
    this.brain = brainModel;

    // --- Gesture state ---
    this.currentGesture = 'none';
    this.gestureStartTime = 0;
    this.gestureDuration = 0;

    // --- Rotation (relative delta) ---
    this._smoothDX = 0;
    this._smoothDY = 0;
    this._rotationSensitivity = 4.0; // multiplier for hand delta → rotation
    this._rotationSmoothing = 0.25;  // EMA factor (lower = smoother, 0.15-0.35 feels good)

    // --- Pinch debounce ---
    this._pinchTriggered = false;
    this._lastPinchTime = 0;
    this._pinchCooldown = 700; // ms between pinch actions

    // --- Fist debounce ---
    this._fistTriggered = false;
    this._lastFistTime = 0;
    this._fistHoldRequired = 800; // ms to hold fist before reset

    // --- Expansion smoothing ---
    this._expansionSmoothing = 0.3;
    this._smoothExpansionDelta = 0;

    // --- Idle return timer ---
    this._lastActiveTime = 0;
    this._idleTimeout = 2500; // ms before returning to idle rotation

    // --- Callbacks ---
    this.onGestureChange = null;   // (gestureName) => void
    this.onRegionSelect = null;    // (regionId) => void
    this.onExplosionChange = null;  // (amount) => void
  }

  /**
   * Process gesture data each frame.
   */
  update(gestureData) {
    const now = Date.now();
    const gesture = gestureData.gesture;

    // Track gesture transitions
    if (gesture !== this.currentGesture) {
      // Reset gesture-specific flags on transition
      if (this.currentGesture === 'pinch') this._pinchTriggered = false;
      if (this.currentGesture === 'fist') this._fistTriggered = false;

      this.currentGesture = gesture;
      this.gestureStartTime = now;
    }
    this.gestureDuration = now - this.gestureStartTime;

    // Fire UI callback
    if (this.onGestureChange) {
      this.onGestureChange(gesture);
    }

    // No hands → drift to idle
    if (gestureData.handsDetected === 0) {
      this._smoothDX = 0;
      this._smoothDY = 0;
      this._pinchTriggered = false;
      this._fistTriggered = false;
      if (now - this._lastActiveTime > this._idleTimeout) {
        this.brain.setIdle(true);
      }
      return;
    }

    this._lastActiveTime = now;

    // ========== Dispatch by gesture ==========

    switch (gesture) {
      case 'open_palm':
        this._handleRotation(gestureData);
        break;

      case 'pinch':
        this._handlePinch(now);
        break;

      case 'fist':
        this._handleFist(now);
        break;

      case 'point':
        this._handlePoint(gestureData);
        break;

      case 'spread':
        this._handleExpansion(gestureData, 1);
        break;

      case 'squeeze':
        this._handleExpansion(gestureData, -1);
        break;

      case 'swipe_left':
        this._handleSwipe('left');
        break;

      case 'swipe_right':
        this._handleSwipe('right');
        break;

      default:
        break;
    }
  }

  /**
   * Open palm: rotate brain using hand *movement delta*, not absolute position.
   * Feels like physically grabbing and turning the brain.
   */
  _handleRotation(data) {
    this.brain.setIdle(false);

    if (data.palmDelta) {
      // Smooth the delta with EMA
      this._smoothDX += (data.palmDelta.dx - this._smoothDX) * this._rotationSmoothing;
      this._smoothDY += (data.palmDelta.dy - this._smoothDY) * this._rotationSmoothing;

      // Apply as rotation — negative X because webcam is mirrored
      const rotDeltaY = -this._smoothDX * this._rotationSensitivity;
      const rotDeltaX = this._smoothDY * this._rotationSensitivity;

      this.brain.group.rotation.y += rotDeltaY;
      this.brain.group.rotation.x += rotDeltaX;
      this.brain.group.rotation.x = Math.max(-0.8, Math.min(0.8, this.brain.group.rotation.x));
    }

    // Clear pinch/fist flags while palm is open
    this._pinchTriggered = false;
    this._fistTriggered = false;
  }

  /**
   * Pinch: select/cycle to next region.
   * Single debounced action — triggers once per pinch gesture.
   */
  _handlePinch(now) {
    if (this._pinchTriggered) return;
    if (now - this._lastPinchTime < this._pinchCooldown) return;

    this._pinchTriggered = true;
    this._lastPinchTime = now;
    this.brain.setIdle(false);

    const selected = this.brain.selectNext();
    if (this.onRegionSelect) {
      this.onRegionSelect(selected);
    }

    // Auto-expand slightly so regions are visible
    if (this.brain.targetExplosion < 0.15) {
      this.brain.setExplosion(0.2);
      if (this.onExplosionChange) {
        this.onExplosionChange(0.2);
      }
    }
  }

  /**
   * Fist: reset view after holding for 800ms.
   * Requires sustained hold to prevent accidental triggers.
   */
  _handleFist(now) {
    if (this._fistTriggered) return;
    if (this.gestureDuration < this._fistHoldRequired) return;
    if (now - this._lastFistTime < 1500) return; // cooldown after reset

    this._fistTriggered = true;
    this._lastFistTime = now;

    this.brain.reset();
    this.brain.setIdle(true);

    if (this.onRegionSelect) this.onRegionSelect(null);
    if (this.onExplosionChange) this.onExplosionChange(0);
    if (this.onGestureChange) this.onGestureChange('none');
  }

  /**
   * Point: keep the brain still (stop idle rotation) but don't do random region selection.
   * The user can see what they're pointing at via the webcam feedback.
   */
  _handlePoint(_data) {
    this.brain.setIdle(false);
    this._pinchTriggered = false;
    this._fistTriggered = false;
  }

  /**
   * Two-hand expansion / collapse.
   * Uses smoothed delta for fluid motion.
   * @param {number} direction  1 for expand, -1 for collapse
   */
  _handleExpansion(data, direction) {
    this.brain.setIdle(false);

    const rawDelta = Math.abs(data.twoHandDelta) * direction;

    // Smooth the expansion delta
    this._smoothExpansionDelta +=
      (rawDelta - this._smoothExpansionDelta) * this._expansionSmoothing;

    // Apply with sensitivity multiplier
    this.brain.addExplosion(this._smoothExpansionDelta * 3.0);

    if (this.onExplosionChange) {
      this.onExplosionChange(this.brain.targetExplosion);
    }

    this._pinchTriggered = false;
    this._fistTriggered = false;
  }

  /**
   * Swipe: cycle through regions. Already debounced in GestureRecognizer.
   */
  _handleSwipe(direction) {
    const selected = direction === 'right'
      ? this.brain.selectNext()
      : this.brain.selectPrevious();

    if (this.onRegionSelect) {
      this.onRegionSelect(selected);
    }

    // Auto-expand so regions are visible
    if (this.brain.targetExplosion < 0.15) {
      this.brain.setExplosion(0.2);
      if (this.onExplosionChange) {
        this.onExplosionChange(0.2);
      }
    }
  }
}
