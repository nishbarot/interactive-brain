/**
 * Classifies hand gestures from MediaPipe landmark arrays.
 *
 * Improvements over v1:
 *  - Curl-ratio finger detection (works at any hand angle)
 *  - Palm-size normalization (works at any distance from camera)
 *  - Gesture stability buffer (eliminates flickering)
 *  - Smoothed two-hand distance tracking
 *  - Swipe detection decoupled from open_palm
 *
 * MediaPipe hand landmarks (21 points per hand):
 *  0 = Wrist
 *  1-4 = Thumb (CMC, MCP, IP, TIP)
 *  5-8 = Index (MCP, PIP, DIP, TIP)
 *  9-12 = Middle (MCP, PIP, DIP, TIP)
 *  13-16 = Ring (MCP, PIP, DIP, TIP)
 *  17-20 = Pinky (MCP, PIP, DIP, TIP)
 */

// Landmark indices
const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_PIP = 14;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_TIP = 20;

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function dist2D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Get the palm size (wrist to middle MCP distance) to normalize all measurements.
 * This makes detection work regardless of hand distance from camera.
 */
function getPalmSize(lm) {
  return dist(lm[WRIST], lm[MIDDLE_MCP]) || 0.001; // avoid div by zero
}

/**
 * Check if a finger is curled using distance ratios.
 * Compares tip-to-wrist distance vs pip-to-wrist distance.
 * If the tip is closer to the wrist than the PIP joint, the finger is curled.
 * Returns a curl amount: 0 = fully extended, 1 = fully curled.
 */
function getFingerCurl(lm, pipIdx, tipIdx) {
  const tipToWrist = dist(lm[tipIdx], lm[WRIST]);
  const pipToWrist = dist(lm[pipIdx], lm[WRIST]);
  // Ratio: when extended, tip is farther than pip. When curled, tip is closer.
  if (pipToWrist < 0.001) return 0;
  const ratio = tipToWrist / pipToWrist;
  // ratio > 1.2 = extended, ratio < 0.9 = curled
  return Math.max(0, Math.min(1, (1.15 - ratio) / 0.5));
}

/**
 * Check if thumb is extended using angle-based approach.
 * Compares thumb tip distance from palm center vs thumb CMC distance.
 */
function isThumbExtended(lm) {
  const palmCenter = {
    x: (lm[WRIST].x + lm[INDEX_MCP].x + lm[PINKY_MCP].x) / 3,
    y: (lm[WRIST].y + lm[INDEX_MCP].y + lm[PINKY_MCP].y) / 3,
    z: (lm[WRIST].z + lm[INDEX_MCP].z + lm[PINKY_MCP].z) / 3
  };
  const tipDist = dist(lm[THUMB_TIP], palmCenter);
  const cmcDist = dist(lm[THUMB_CMC], palmCenter);
  // Thumb extended when tip is significantly farther from palm than CMC
  return tipDist > cmcDist * 1.3;
}

// ================================================================
// Stability buffer — requires majority consensus over recent frames
// ================================================================

const STABILITY_BUFFER_SIZE = 5;

export class GestureRecognizer {
  constructor() {
    // Stability buffer
    this._gestureBuffer = [];

    // Swipe detection
    this._palmHistory = []; // { x, y, time }
    this._lastSwipeTime = 0;

    // Two-hand smoothing
    this._smoothTwoHandDist = null;
    this._twoHandSmoothing = 0.3; // EMA factor (0=no smoothing, 1=no memory)

    // Hand roll angle tracking (for lightbulb-twist rotation)
    this._prevHandAngle = null;
  }

  /**
   * Classify gestures from MediaPipe results.
   * Returns a stable, smoothed gesture state.
   */
  recognize(results) {
    const output = {
      gesture: 'none',
      confidence: 0,
      handPosition: null,
      palmDelta: null,       // { dx, dy } frame-to-frame movement
      handAngle: 0,          // hand roll angle in radians (index→pinky line)
      handAngleDelta: 0,     // frame-to-frame twist amount (lightbulb rotation)
      handsDetected: 0,
      twoHandDistance: null,
      twoHandDelta: 0,
      fingerCurls: null      // { index, middle, ring, pinky, thumbExtended }
    };

    if (!results || !results.landmarks || results.landmarks.length === 0) {
      this._palmHistory = [];
      this._smoothTwoHandDist = null;
      this._gestureBuffer = [];
      this._prevHandAngle = null;
      return output;
    }

    output.handsDetected = results.landmarks.length;
    const lm = results.landmarks[0]; // primary hand
    const palmSize = getPalmSize(lm);

    // Palm center
    const palmX = (lm[WRIST].x + lm[INDEX_MCP].x + lm[PINKY_MCP].x) / 3;
    const palmY = (lm[WRIST].y + lm[INDEX_MCP].y + lm[PINKY_MCP].y) / 3;
    output.handPosition = { x: palmX, y: palmY };

    // Compute palm delta from previous frame
    const now = Date.now();
    if (this._palmHistory.length > 0) {
      const prev = this._palmHistory[this._palmHistory.length - 1];
      const dt = now - prev.time;
      if (dt > 0 && dt < 200) { // only if recent enough
        output.palmDelta = {
          dx: palmX - prev.x,
          dy: palmY - prev.y
        };
      }
    }
    this._palmHistory.push({ x: palmX, y: palmY, time: now });
    // Keep only last 20 entries
    if (this._palmHistory.length > 20) this._palmHistory.shift();

    // ========= Hand roll angle (lightbulb twist) =========
    // The angle of the line from INDEX_MCP → PINKY_MCP measures wrist roll.
    // Twisting your hand like screwing a lightbulb changes this angle.
    const handAngle = Math.atan2(
      lm[PINKY_MCP].y - lm[INDEX_MCP].y,
      lm[PINKY_MCP].x - lm[INDEX_MCP].x
    );
    output.handAngle = handAngle;

    if (this._prevHandAngle !== null) {
      let angleDelta = handAngle - this._prevHandAngle;
      // Handle ±PI wraparound (e.g. going from 3.1 to -3.1 is a tiny change, not 6.2)
      if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
      if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
      output.handAngleDelta = angleDelta;
    }
    this._prevHandAngle = handAngle;

    // Finger curl states (0 = extended, 1 = curled)
    const indexCurl = getFingerCurl(lm, INDEX_PIP, INDEX_TIP);
    const middleCurl = getFingerCurl(lm, MIDDLE_PIP, MIDDLE_TIP);
    const ringCurl = getFingerCurl(lm, RING_PIP, RING_TIP);
    const pinkyCurl = getFingerCurl(lm, PINKY_PIP, PINKY_TIP);
    const thumbExt = isThumbExtended(lm);

    output.fingerCurls = { index: indexCurl, middle: middleCurl, ring: ringCurl, pinky: pinkyCurl, thumbExtended: thumbExt };

    const indexExtended = indexCurl < 0.4;
    const middleExtended = middleCurl < 0.4;
    const ringExtended = ringCurl < 0.4;
    const pinkyExtended = pinkyCurl < 0.4;
    const extendedCount = [thumbExt, indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    // Pinch distance normalized by palm size
    const pinchDist = dist(lm[THUMB_TIP], lm[INDEX_TIP]) / palmSize;

    // ========= Two-hand gestures (highest priority) =========
    if (results.landmarks.length >= 2) {
      const lm2 = results.landmarks[1];
      const palm1 = { x: lm[WRIST].x, y: lm[WRIST].y };
      const palm2 = { x: lm2[WRIST].x, y: lm2[WRIST].y };
      const rawDist = dist2D(palm1, palm2);

      // Smooth the two-hand distance with EMA
      if (this._smoothTwoHandDist === null) {
        this._smoothTwoHandDist = rawDist;
      } else {
        const prevSmooth = this._smoothTwoHandDist;
        this._smoothTwoHandDist += (rawDist - this._smoothTwoHandDist) * this._twoHandSmoothing;
        output.twoHandDelta = this._smoothTwoHandDist - prevSmooth;
      }
      output.twoHandDistance = this._smoothTwoHandDist;

      // Only trigger if meaningful movement (normalized by initial distance)
      if (Math.abs(output.twoHandDelta) > 0.003) {
        const rawGesture = output.twoHandDelta > 0 ? 'spread' : 'squeeze';
        output.confidence = Math.min(1, Math.abs(output.twoHandDelta) * 15);
        return this._stabilize(rawGesture, output);
      }
    } else {
      this._smoothTwoHandDist = null;
    }

    // ========= Single-hand classification =========

    let rawGesture = 'none';

    // Pinch: thumb + index close together, middle not extended
    // Use normalized distance — threshold ~0.35 of palm size
    if (pinchDist < 0.35 && middleCurl > 0.3) {
      rawGesture = 'pinch';
      output.confidence = Math.max(0, 1 - pinchDist / 0.35);
    }
    // Fist: all fingers curled
    else if (extendedCount <= 1 && !indexExtended && !middleExtended && !ringExtended) {
      rawGesture = 'fist';
      output.confidence = 1 - extendedCount / 5;
    }
    // Point: only index extended
    else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      rawGesture = 'point';
      output.confidence = 0.9;
    }
    // Open palm: 4+ fingers extended
    else if (extendedCount >= 4) {
      rawGesture = 'open_palm';
      output.confidence = extendedCount / 5;
    }

    // Check for swipe (independent of gesture — uses velocity)
    const swipe = this._detectSwipe();
    if (swipe) {
      rawGesture = swipe;
      output.confidence = 0.85;
    }

    return this._stabilize(rawGesture, output);
  }

  /**
   * Stability buffer: require majority agreement over recent frames.
   * Prevents flickering between gestures.
   */
  _stabilize(rawGesture, output) {
    this._gestureBuffer.push(rawGesture);
    if (this._gestureBuffer.length > STABILITY_BUFFER_SIZE) {
      this._gestureBuffer.shift();
    }

    // Count occurrences of each gesture in the buffer
    const counts = {};
    for (const g of this._gestureBuffer) {
      counts[g] = (counts[g] || 0) + 1;
    }

    // Find the most common gesture
    let best = 'none';
    let bestCount = 0;
    for (const [g, c] of Object.entries(counts)) {
      if (c > bestCount) {
        best = g;
        bestCount = c;
      }
    }

    // Require at least 3 out of 5 frames (60% consensus)
    const threshold = Math.ceil(STABILITY_BUFFER_SIZE * 0.6);
    if (bestCount >= threshold) {
      output.gesture = best;
    } else {
      // Keep previous stable gesture if no clear winner
      output.gesture = this._lastStableGesture || 'none';
    }

    // Swipe gestures bypass stability (they're already debounced internally)
    if (rawGesture === 'swipe_left' || rawGesture === 'swipe_right') {
      output.gesture = rawGesture;
    }

    this._lastStableGesture = output.gesture;
    return output;
  }

  /**
   * Detect horizontal swipe from palm velocity over recent history.
   * Decoupled from any specific gesture — works with any hand shape.
   */
  _detectSwipe() {
    const now = Date.now();
    if (now - this._lastSwipeTime < 700) return null; // cooldown
    if (this._palmHistory.length < 5) return null;

    // Look at last 250ms of movement
    const cutoff = now - 250;
    const recent = this._palmHistory.filter(p => p.time >= cutoff);
    if (recent.length < 4) return null;

    const first = recent[0];
    const last = recent[recent.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dt = last.time - first.time;

    if (dt < 50) return null; // too fast to be real

    // Need significant horizontal velocity, minimal vertical
    const velocityX = dx / (dt / 1000); // units per second
    const absVelX = Math.abs(velocityX);

    if (absVelX > 0.8 && Math.abs(dy) < Math.abs(dx) * 0.5) {
      this._lastSwipeTime = now;
      this._palmHistory = []; // reset after swipe
      return dx > 0 ? 'swipe_right' : 'swipe_left';
    }

    return null;
  }
}
