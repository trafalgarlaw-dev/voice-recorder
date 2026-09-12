/**
 * AudioRecorder: High-Fidelity Audio Capture with Native MediaRecorder & Screen WakeLock
 * Fully supports long-duration recording (minutes/hours) on iOS Safari, Android, and Desktop.
 * Prevents screen auto-lock sleep and eliminates WebKit ScriptProcessor truncation bugs.
 */
class AudioRecorder {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.animationId = null;
    this.recordedChunks = [];
    this.startTime = null;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.isRecording = false;
    this.isPaused = false;
    this.wakeLock = null;
    this.recordedMimeType = 'audio/mp4';
    this.onTick = null;
    this.onStateChange = null;

    if (this.canvas) {
      this.setupCanvas();
      this.drawIdleWave();
    }

    // Re-acquire WakeLock if user switches back to Safari while recording
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && this.isRecording && !this.wakeLock) {
        await this.requestWakeLock();
      }
    });
  }

  setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = (rect.width || 340) * dpr;
    this.canvas.height = (rect.height || 110) * dpr;
    this.ctx.scale(dpr, dpr);
    this.displayWidth = rect.width || 340;
    this.displayHeight = rect.height || 110;
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator && navigator.wakeLock) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('Screen WakeLock active: recording will not be interrupted by screen sleep');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      } catch (e) {
        console.warn('WakeLock not granted:', e);
      }
    }
  }

  async releaseWakeLock() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch (e) {}
      this.wakeLock = null;
    }
  }

  async start() {
    try {
      this.recordedChunks = [];

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
          const httpsUrl = `https://${location.hostname}:8443${location.pathname}`;
          throw new Error(`iOS Safari mikrofon izni için HTTPS gerektirir.
Lütfen güvenli bağlantıya geçin: ${httpsUrl}`);
        }
        throw new Error('Tarayıcınız mikrofon kaydını desteklemiyor veya izin verilmedi.');
      }

      // Voice settings: preserve all voices in the room, disable artificial noise cancelling
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Keep screen awake while recording so iOS doesn't sleep at 30 seconds
      await this.requestWakeLock();

      // AudioContext ONLY for real-time waveform visualizer (NOT connected to destination)
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        this.source = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.source.connect(this.analyser);
      } catch (acErr) {
        console.warn('Visualizer AudioContext init fallback:', acErr);
      }

      // Determine best audio container supported by browser
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        const candidates = [
          'audio/mp4',               // Native iOS Safari hardware AAC
          'audio/webm;codecs=opus',  // Chrome / Android Opus
          'audio/webm',
          'audio/aac',
          'audio/ogg'
        ];
        for (const cand of candidates) {
          if (MediaRecorder.isTypeSupported(cand)) {
            mimeType = cand;
            break;
          }
        }
      }

      const recorderOptions = mimeType ? { mimeType } : {};
      this.mediaRecorder = new MediaRecorder(this.stream, recorderOptions);
      this.recordedMimeType = this.mediaRecorder.mimeType || mimeType || 'audio/mp4';

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      // Start continuous recording without small timeslices (prevents WebKit Bug 215884)
      this.mediaRecorder.start();

      this.isRecording = true;
      this.isPaused = false;
      this.elapsedTime = 0;
      this.startTime = Date.now();

      this.timerInterval = setInterval(() => {
        this.elapsedTime = Date.now() - this.startTime;
        if (this.onTick) this.onTick(this.elapsedTime);
      }, 50);

      this.drawActiveWave();
      if (this.onStateChange) this.onStateChange('recording');
      return true;
    } catch (err) {
      console.error('Microphone start error:', err);
      await this.releaseWakeLock();
      throw err;
    }
  }

  pause() {
    if (this.isRecording && !this.isPaused) {
      this.isPaused = true;
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.pause();
      }
      clearInterval(this.timerInterval);
      if (this.onStateChange) this.onStateChange('paused');
    }
  }

  resume() {
    if (this.isRecording && this.isPaused) {
      this.isPaused = false;
      if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
        this.mediaRecorder.resume();
      }
      this.startTime = Date.now() - this.elapsedTime;
      this.timerInterval = setInterval(() => {
        this.elapsedTime = Date.now() - this.startTime;
        if (this.onTick) this.onTick(this.elapsedTime);
      }, 50);
      if (this.onStateChange) this.onStateChange('recording');
    }
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.isRecording) {
        resolve(null);
        return;
      }

      clearInterval(this.timerInterval);
      cancelAnimationFrame(this.animationId);
      this.releaseWakeLock();

      const duration = this.elapsedTime;

      const finishAndCleanup = () => {
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
          try { this.audioContext.close(); } catch (e) {}
        }

        const finalMime = (this.mediaRecorder ? this.mediaRecorder.mimeType : '') || this.recordedMimeType || 'audio/mp4';
        const finalBlob = new Blob(this.recordedChunks, { type: finalMime });

        this.isRecording = false;
        this.isPaused = false;
        this.elapsedTime = 0;
        this.drawIdleWave();
        if (this.onStateChange) this.onStateChange('idle');

        console.log(`Audio recording finalized: ${finalBlob.size} bytes, type: ${finalMime}, duration: ${duration}ms`);

        resolve({
          audioBlob: finalBlob,
          durationMs: duration,
          mimeType: finalMime
        });
      };

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          finishAndCleanup();
        };

        try {
          this.mediaRecorder.stop();
        } catch (e) {
          console.warn('MediaRecorder stop warning:', e);
          finishAndCleanup();
        }
      } else {
        finishAndCleanup();
      }
    });
  }

  drawIdleWave() {
    if (!this.ctx) return;
    const w = this.displayWidth;
    const h = this.displayHeight;
    this.ctx.clearRect(0, 0, w, h);

    const bars = 48;
    const barWidth = 3;
    const gap = (w - (bars * barWidth)) / (bars - 1);
    const midY = h / 2;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < bars; i++) {
      const x = i * (barWidth + gap);
      const barH = 6 + Math.sin(i * 0.4) * 4;
      this.ctx.beginPath();
      this.ctx.roundRect(x, midY - barH / 2, barWidth, barH, 2);
      this.ctx.fill();
    }
  }

  drawActiveWave() {
    if (!this.analyser || !this.ctx) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const w = this.displayWidth;
    const h = this.displayHeight;
    const midY = h / 2;

    const render = () => {
      if (!this.isRecording) return;
      this.animationId = requestAnimationFrame(render);
      if (this.isPaused) return;

      this.analyser.getByteFrequencyData(dataArray);
      this.ctx.clearRect(0, 0, w, h);

      const bars = 48;
      const barWidth = 3.5;
      const gap = (w - (bars * barWidth)) / (bars - 1);

      const gradient = this.ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, '#ff453a');
      gradient.addColorStop(0.5, '#ff9f0a');
      gradient.addColorStop(1, '#ff375f');

      this.ctx.fillStyle = gradient;

      for (let i = 0; i < bars; i++) {
        const freqIndex = Math.floor((i / bars) * (bufferLength / 1.5));
        const val = dataArray[freqIndex] || 0;
        const normalized = val / 255;
        const barH = Math.max(6, normalized * (h * 0.85));
        const x = i * (barWidth + gap);

        this.ctx.beginPath();
        this.ctx.roundRect(x, midY - barH / 2, barWidth, barH, 2);
        this.ctx.fill();
      }
    };

    render();
  }

  static formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  }

  static formatDurationText(ms) {
    const totalSec = Math.round(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins === 0) return `${secs} sn`;
    return `${mins} dk ${secs} sn`;
  }
}
