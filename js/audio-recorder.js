/**
 * AudioRecorder: High-Fidelity Audio Capture with Direct 16kHz PCM WAV Export
 * Solves iOS Safari speech truncation and ensures 100% verbatim audio delivery to Gemini AI.
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
    this.processor = null;
    this.animationId = null;
    this.recordedChunks = [];
    this.pcmDataChunks = []; // Raw PCM float samples
    this.startTime = null;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.isRecording = false;
    this.isPaused = false;
    this.onTick = null;
    this.onStateChange = null;

    if (this.canvas) {
      this.setupCanvas();
      this.drawIdleWave();
    }
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

  async start() {
    try {
      this.recordedChunks = [];
      this.pcmDataChunks = [];

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
          const httpsUrl = `https://${location.hostname}:8443${location.pathname}`;
          throw new Error(`iOS Safari mikrofon izni için HTTPS gerektirir.\nLütfen güvenli bağlantıya geçin: ${httpsUrl}`);
        }
        throw new Error('Tarayıcınız mikrofon kaydını desteklemiyor veya izin verilmedi.');
      }

      // Voice settings: do not suppress other speakers in the room
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Ensure audio context is running on iOS Safari
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source.connect(this.analyser);

      // Direct raw PCM recording via ScriptProcessorNode
      // Captures 100% of raw microphone sound without browser voice cuts
      const bufferSize = 4096;
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording || this.isPaused) return;
        const inputData = e.inputBuffer.getChannelData(0);
        this.pcmDataChunks.push(new Float32Array(inputData));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // MediaRecorder for native browser playback
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        mimeType = 'audio/aac';
      }

      try {
        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
        };
        this.mediaRecorder.start(250);
      } catch (mrErr) {
        console.warn('MediaRecorder init fallback:', mrErr);
      }

      this.isRecording = true;
      this.isPaused = false;
      this.startTime = Date.now() - this.elapsedTime;

      this.timerInterval = setInterval(() => {
        this.elapsedTime = Date.now() - this.startTime;
        if (this.onTick) this.onTick(this.elapsedTime);
      }, 50);

      this.drawActiveWave();
      if (this.onStateChange) this.onStateChange('recording');
      return true;
    } catch (err) {
      console.error('Microphone start error:', err);
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

      const duration = this.elapsedTime;
      const inputSampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;

      // Disconnect processor
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }

      // Convert raw PCM chunks to standard 16kHz mono WAV Blob (perfect for Gemini)
      const wavBlob = this.exportWavBlob(this.pcmDataChunks, inputSampleRate, 16000);

      const finishCleanup = (playbackBlob) => {
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }

        this.isRecording = false;
        this.isPaused = false;
        this.elapsedTime = 0;
        this.drawIdleWave();
        if (this.onStateChange) this.onStateChange('idle');

        resolve({
          playbackBlob: playbackBlob || wavBlob,
          wavBlob: wavBlob,
          durationMs: duration,
          mimeType: 'audio/wav'
        });
      };

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const mime = this.mediaRecorder.mimeType || 'audio/mp4';
          const pBlob = new Blob(this.recordedChunks, { type: mime });
          finishCleanup(pBlob);
        };
        try {
          this.mediaRecorder.stop();
        } catch (e) {
          finishCleanup(wavBlob);
        }
      } else {
        finishCleanup(wavBlob);
      }
    });
  }

  // Concatenate Float32 PCM arrays and downsample to 16kHz WAV
  exportWavBlob(chunks, inputRate, outputRate = 16000) {
    let totalLength = 0;
    for (let i = 0; i < chunks.length; i++) {
      totalLength += chunks[i].length;
    }

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (let i = 0; i < chunks.length; i++) {
      merged.set(chunks[i], offset);
      offset += chunks[i].length;
    }

    // Downsample to 16kHz
    let samples;
    if (inputRate === outputRate) {
      samples = merged;
    } else {
      const ratio = inputRate / outputRate;
      const newLength = Math.round(merged.length / ratio);
      samples = new Float32Array(newLength);
      for (let i = 0; i < newLength; i++) {
        const idx = Math.floor(i * ratio);
        samples[i] = merged[idx] || 0;
      }
    }

    // Create 16-bit PCM WAV container
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    function writeStr(pos, s) {
      for (let i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i));
    }

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono channel
    view.setUint32(24, outputRate, true); // 16000 Hz
    view.setUint32(28, outputRate * 2, true); // byte rate (16000 * 1 * 2)
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // 16-bit
    writeStr(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Studio-grade Dynamic Range Normalization & Soft Limiter
    // Boosts quiet voices / whispers so Gemini hears every word clearly
    let maxPeak = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > maxPeak) maxPeak = abs;
    }

    let gain = 1.0;
    if (maxPeak > 0.0005) {
      // Scale so quiet voices become loud & clear, max 8x gain boost
      gain = Math.min(8.0, 0.92 / maxPeak);
    }

    let p = 44;
    for (let i = 0; i < samples.length; i++) {
      // Soft saturation limiter to prevent digital clipping
      const boosted = Math.tanh(samples[i] * gain);
      const s = Math.max(-1, Math.min(1, boosted));
      view.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      p += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
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
