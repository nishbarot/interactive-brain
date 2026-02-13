import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * Manages webcam access and MediaPipe HandLandmarker for real-time
 * hand landmark detection.
 *
 * Tuned for stability:
 *  - Higher confidence thresholds to reduce phantom detections
 *  - Throttled to ~20fps detection (GPU can't keep up at 60fps anyway)
 *  - Larger landmark rendering for better webcam feedback
 */
export class HandTracker {
  constructor() {
    this.handLandmarker = null;
    this.video = null;
    this.landmarkCanvas = null;
    this.landmarkCtx = null;
    this.isRunning = false;
    this.lastResults = null;
    this.lastTimestamp = -1;

    // Throttle detection to ~20fps (every 50ms)
    this._lastDetectTime = 0;
    this._detectInterval = 50;

    // Callbacks
    this.onResults = null;
  }

  async init() {
    this.video = document.getElementById('webcam');
    this.landmarkCanvas = document.getElementById('landmark-canvas');
    this.landmarkCtx = this.landmarkCanvas.getContext('2d');

    const statusEl = document.getElementById('webcam-status');

    try {
      statusEl.textContent = 'Loading AI...';

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2,
        // Raised thresholds for more stable, confident detections
        minHandDetectionConfidence: 0.65,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      statusEl.textContent = 'Starting camera...';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });

      this.video.srcObject = stream;
      await new Promise((resolve) => {
        this.video.onloadeddata = resolve;
      });

      this.landmarkCanvas.width = this.video.videoWidth;
      this.landmarkCanvas.height = this.video.videoHeight;

      statusEl.style.display = 'none';
      this.isRunning = true;
      this._detect();
    } catch (err) {
      console.error('Hand tracking init failed:', err);
      statusEl.textContent = 'Camera unavailable';
      statusEl.style.color = '#f87171';
    }
  }

  _detect() {
    if (!this.isRunning) return;

    const now = performance.now();

    // Throttle: skip frames if we're running too fast
    if (now - this._lastDetectTime >= this._detectInterval &&
        now !== this.lastTimestamp &&
        this.video.readyState >= 2) {
      this._lastDetectTime = now;
      this.lastTimestamp = now;

      const results = this.handLandmarker.detectForVideo(this.video, now);
      this.lastResults = results;

      this._drawLandmarks(results);

      if (this.onResults) {
        this.onResults(results);
      }
    }

    requestAnimationFrame(() => this._detect());
  }

  /**
   * Draw detected hand landmarks on the webcam preview canvas.
   * Larger dots and thicker lines for better visibility at PiP size.
   */
  _drawLandmarks(results) {
    const ctx = this.landmarkCtx;
    const w = this.landmarkCanvas.width;
    const h = this.landmarkCanvas.height;

    ctx.clearRect(0, 0, w, h);

    if (!results.landmarks || results.landmarks.length === 0) return;

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17]
    ];

    for (const landmarks of results.landmarks) {
      // Draw connections
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)';
      ctx.lineWidth = 2.5;
      for (const [a, b] of connections) {
        const pa = landmarks[a];
        const pb = landmarks[b];
        ctx.beginPath();
        ctx.moveTo(pa.x * w, pa.y * h);
        ctx.lineTo(pb.x * w, pb.y * h);
        ctx.stroke();
      }

      // Draw landmarks — larger dots
      for (let i = 0; i < landmarks.length; i++) {
        const pt = landmarks[i];
        // Fingertips get bigger dots
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const radius = isTip ? 4 : 2.5;
        ctx.fillStyle = isTip
          ? 'rgba(250, 200, 120, 0.95)'
          : 'rgba(167, 139, 250, 0.9)';
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  stop() {
    this.isRunning = false;
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getTracks().forEach((t) => t.stop());
    }
  }
}
