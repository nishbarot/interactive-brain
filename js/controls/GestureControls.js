/**
 * Maps recognized gestures to BrainModel actions.
 *
 * Intuitive gesture mapping:
 *  - Twist pose        → Rotate brain (lightbulb twist = Y rotation, hand up/down = X tilt)
 *  - Pinch             → Select/cycle region (debounced, single action)
 *  - Fist (hold 800ms) → Reset everything
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

    // --- Rotation (twist_pose + vertical tilt) ---
    // No velocity cap — rotation is proportional to hand twist, full 360+.
    this._rotationVelocityY = 0;
    this._twistSensitivity = 2.8;
    this._twistDeadZone = 0.0012;
    this._twistAccel = 0.45;
    this._twistDecel = 0.15;
    this._smoothTiltDY = 0;
    this._tiltSensitivity = 2.2;
    this._tiltSmoothing = 0.18;
    this._maxTiltStep = 0.01;

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

    // No hands → coast to a stop, then drift to idle
    if (gestureData.handsDetected === 0) {
      this._decayRotation();
      this._pinchTriggered = false;
      this._fistTriggered = false;
      if (now - this._lastActiveTime > this._idleTimeout) {
        this.brain.setIdle(true);
      }
      return;
    }

    this._lastActiveTime = now;

    // ========== Discrete gesture actions ==========
    switch (gesture) {
      case 'pinch':
        this._handlePinch(now);
        // Allow lightbulb rotation to continue while pinching if twist pose
        // confidence is active (user often rotates with thumb+index together).
        if (gestureData.twistPoseActive) {
          this._handleRotation(gestureData);
        } else {
          this._decayRotation();
        }
        break;

      case 'fist':
        this._handleFist(now);
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

      case 'twist_pose':
        this._handleRotation(gestureData);
        break;

      default:
        this._decayRotation();
        break;
    }
  }

  /**
   * Rotation from twist_pose.
   *
   * Y rotation is directly proportional to hand twist — no velocity cap.
   * Twist more = rotate more, full 360 degrees and beyond.
   * X tilt remains tied to vertical hand movement with smoothing and clamping.
   */
  _handleRotation(data) {
    this.brain.setIdle(false);

    // --- Y rotation from twist (lightbulb) — uncapped, proportional ---
    const twistDelta = data.handAngleDelta || 0;
    let targetVel = 0;
    if (Math.abs(twistDelta) > this._twistDeadZone) {
      targetVel = twistDelta * this._twistSensitivity;
    }
    // Ramp toward target velocity (no cap — faster twist = faster spin)
    this._rotationVelocityY += (targetVel - this._rotationVelocityY) * this._twistAccel;
    this.brain.group.rotation.y += this._rotationVelocityY;

    // --- X rotation from vertical hand movement ---
    if (data.palmDelta) {
      this._smoothTiltDY += (data.palmDelta.dy - this._smoothTiltDY) * this._tiltSmoothing;
      if (Math.abs(this._smoothTiltDY) > 0.0015) {
        const tiltStep = Math.max(
          -this._maxTiltStep,
          Math.min(this._maxTiltStep, this._smoothTiltDY * this._tiltSensitivity)
        );
        this.brain.group.rotation.x += tiltStep;
        this.brain.group.rotation.x = Math.max(-0.8, Math.min(0.8, this.brain.group.rotation.x));
      }
    }

    // Sync BrainModel targets to current position so its internal lerp
    // doesn't fight the gesture-driven rotation.
    this.brain.targetRotationY = this.brain.group.rotation.y;
    this.brain.targetRotationX = this.brain.group.rotation.x;

    // Clear pinch/fist flags while rotating
    this._pinchTriggered = false;
    this._fistTriggered = false;
  }

  _decayRotation() {
    this._rotationVelocityY += (0 - this._rotationVelocityY) * this._twistDecel;
    this._smoothTiltDY += (0 - this._smoothTiltDY) * this._twistDecel;

    if (Math.abs(this._rotationVelocityY) > 0.00005) {
      this.brain.group.rotation.y += this._rotationVelocityY;
    } else {
      this._rotationVelocityY = 0;
    }

    // Keep BrainModel targets in sync so its internal lerp doesn't pull
    // the brain back to some old position after gesture ends.
    this.brain.targetRotationY = this.brain.group.rotation.y;
    this.brain.targetRotationX = this.brain.group.rotation.x;
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
