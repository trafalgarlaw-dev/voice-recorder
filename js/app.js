/**
 * Main Application Orchestrator
 * Fully Universal, Real-Time Turkish Speech Recognition & Multi-Speaker Diarization
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const screenRecord = document.getElementById('screenRecord');
  const screenList = document.getElementById('screenList');
  const screenDetail = document.getElementById('screenDetail');
  const tabItems = document.querySelectorAll('.tab-item');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const modelSelect = document.getElementById('modelSelect');

  // Record Controls
  const canvas = document.getElementById('visualizerCanvas');
  const visualizerPlaceholder = document.getElementById('visualizerPlaceholder');
  const timerDisplay = document.getElementById('timerDisplay');
  const recordBtnMain = document.getElementById('recordBtnMain');
  const pauseResumeBtn = document.getElementById('pauseResumeBtn');
  const pauseIcon = document.getElementById('pauseIcon');
  const resumeIcon = document.getElementById('resumeIcon');
  const cancelRecordBtn = document.getElementById('cancelRecordBtn');
  const recordingStatusBadge = document.getElementById('recordingStatusBadge');
  const recordingStatusText = document.getElementById('recordingStatusText');
  const pulsingDot = recordingStatusBadge.querySelector('.pulsing-dot');
  const fileUploadInput = document.getElementById('fileUploadInput');

  // List Controls
  const recordingsListContainer = document.getElementById('recordingsListContainer');
  const recordingCountBadge = document.getElementById('recordingCountBadge');

  // Detail Controls
  const backToListBtn = document.getElementById('backToListBtn');
  const deleteMeetingBtn = document.getElementById('deleteMeetingBtn');
  const playerMeetingTitle = document.getElementById('playerMeetingTitle');
  const nativeAudioPlayer = document.getElementById('nativeAudioPlayer');
  const audioScrubber = document.getElementById('audioScrubber');
  const currentTimeDisplay = document.getElementById('currentTimeDisplay');
  const totalDurationDisplay = document.getElementById('totalDurationDisplay');
  const playPauseAudioBtn = document.getElementById('playPauseAudioBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIconMini = document.getElementById('pauseIconMini');
  const seekBack15Btn = document.getElementById('seekBack15Btn');
  const seekForward15Btn = document.getElementById('seekForward15Btn');
  const speedToggleBtn = document.getElementById('speedToggleBtn');

  // Detail Tabs
  const segmentBtns = document.querySelectorAll('.segment-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const transcriptFeed = document.getElementById('transcriptFeed');
  const transcriptSearchInput = document.getElementById('transcriptSearchInput');
  const summaryText = document.getElementById('summaryText');
  const decisionsCard = document.getElementById('decisionsCard');
  const decisionsList = document.getElementById('decisionsList');
  const actionsCard = document.getElementById('actionsCard');
  const actionItemsList = document.getElementById('actionItemsList');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const promptChips = document.querySelectorAll('.prompt-chip');
  const statDuration = document.getElementById('statDuration');
  const statSpeakers = document.getElementById('statSpeakers');
  const speakerShareList = document.getElementById('speakerShareList');

  // Toast
  const toastMsg = document.getElementById('toastMsg');
  const toastText = document.getElementById('toastText');
  const toastIcon = document.getElementById('toastIcon');

  function showToast(text, icon = '✨') {
    toastText.innerText = text;
    toastIcon.innerText = icon;
    toastMsg.classList.add('show');
    setTimeout(() => toastMsg.classList.remove('show'), 3200);
  }

  // Reanalyze Modal Elements
  const reanalyzeBtn = document.getElementById('reanalyzeBtn');
  const reanalyzeModal = document.getElementById('reanalyzeModal');
  const closeReanalyzeBtn = document.getElementById('closeReanalyzeBtn');
  const startReanalyzeBtn = document.getElementById('startReanalyzeBtn');
  const reanalyzeModelSelect = document.getElementById('reanalyzeModelSelect');

  // Core Services
  const storage = new StorageManager();
  await storage.init();

  const aiEngine = new AIEngine();
  const recorder = new AudioRecorder(canvas);

  let activeRecordingId = null;
  let activeRecordingData = null;
  let currentSpeedIdx = 0;
  const speeds = [1.0, 1.25, 1.5, 2.0];

  // Load Settings
  geminiApiKeyInput.value = aiEngine.getApiKey();

  // Quick Settings Button & API Key Banner
  const quickOpenSettingsBtn = document.getElementById('quickOpenSettingsBtn');
  const apiKeyNoticeBanner = document.getElementById('apiKeyNoticeBanner');

  function updateApiKeyBanner() {
    if (!apiKeyNoticeBanner) return;
    if (aiEngine.getApiKey()) {
      apiKeyNoticeBanner.style.background = 'rgba(48, 209, 88, 0.12)';
      apiKeyNoticeBanner.style.borderColor = 'rgba(48, 209, 88, 0.3)';
      apiKeyNoticeBanner.innerHTML = `
        <div>
          <div style="font-weight: 600; color: #30d158;">✨ Derin Yapay Zeka Aktif (Gemini Audio)</div>
          <div style="color: var(--text-secondary); font-size: 11px; margin-top: 2px;">4+ konuşmacı ses tınısından ayırt edilir, tüm kelimeler eksiksiz dökülür.</div>
        </div>
        <button id="quickEditKeyBtn" style="background: rgba(255,255,255,0.1); color: #fff; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer;">Değiştir</button>
      `;
      const editBtn = document.getElementById('quickEditKeyBtn');
      if (editBtn) editBtn.addEventListener('click', () => settingsModal.classList.add('active'));
    } else {
      apiKeyNoticeBanner.style.background = 'rgba(255, 159, 10, 0.14)';
      apiKeyNoticeBanner.style.borderColor = 'rgba(255, 159, 10, 0.35)';
      apiKeyNoticeBanner.innerHTML = `
        <div>
          <div style="font-weight: 600; color: #ff9f0a;">🔑 4 Konuşmacı & Eksiksiz Kelime Dökümü İçin</div>
          <div style="color: var(--text-secondary); font-size: 11px; margin-top: 2px;">Tüm kelimeleri atlamadan dökmek için ücretsiz Gemini API anahtarı ekleyin.</div>
        </div>
        <button id="quickOpenBtn" style="background: var(--accent-blue); color: #fff; border: none; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;">Anahtar Gir</button>
      `;
      const openBtn = document.getElementById('quickOpenBtn');
      if (openBtn) openBtn.addEventListener('click', () => settingsModal.classList.add('active'));
    }
  }

  updateApiKeyBanner();

  modelSelect.value = aiEngine.modelName;

  // Window resize handler for canvas
  window.addEventListener('resize', () => {
    recorder.setupCanvas();
    if (!recorder.isRecording) recorder.drawIdleWave();
  });

  // Navigation Logic
  function showScreen(screenId) {
    [screenRecord, screenList, screenDetail].forEach(s => s.classList.remove('active'));
    tabItems.forEach(t => t.classList.remove('active'));

    if (screenId === 'screenRecord') {
      screenRecord.classList.add('active');
      document.querySelector('[data-screen="screenRecord"]').classList.add('active');
    } else if (screenId === 'screenList') {
      screenList.classList.add('active');
      document.querySelector('[data-screen="screenList"]').classList.add('active');
      renderRecordingsList();
    } else if (screenId === 'screenDetail') {
      screenDetail.classList.add('active');
    }
  }

  tabItems.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-screen');
      showScreen(target);
    });
  });

  backToListBtn.addEventListener('click', () => {
    if (nativeAudioPlayer) nativeAudioPlayer.pause();
    showScreen('screenList');
  });

  // Settings Handlers
  settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
  closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
  saveSettingsBtn.addEventListener('click', () => {
    aiEngine.setApiKey(geminiApiKeyInput.value);
    aiEngine.setModelName(modelSelect.value);
    settingsModal.classList.remove('active');
    showToast('Ayarlar kaydedildi', '✅');
    updateApiKeyBanner();
  });



  recorder.onTick = (ms) => {
    timerDisplay.innerText = AudioRecorder.formatTime(ms);
  };

  recorder.onStateChange = (state) => {
    if (state === 'recording') {
      recordBtnMain.parentElement.classList.add('recording');
      pulsingDot.style.display = 'block';
      recordingStatusText.innerText = 'Ortam Kaydediliyor & Dinleniyor';
      visualizerPlaceholder.style.display = 'none';
      pauseResumeBtn.disabled = false;
      cancelRecordBtn.disabled = false;
      pauseIcon.style.display = 'block';
      resumeIcon.style.display = 'none';
    } else if (state === 'paused') {
      pulsingDot.style.display = 'none';
      recordingStatusText.innerText = 'Kayıt Duraklatıldı';
      pauseIcon.style.display = 'none';
      resumeIcon.style.display = 'block';
    } else if (state === 'idle') {
      recordBtnMain.parentElement.classList.remove('recording');
      pulsingDot.style.display = 'none';
      recordingStatusText.innerText = 'Kayda Hazır';
      timerDisplay.innerText = '00:00.00';
      visualizerPlaceholder.style.display = 'block';
      pauseResumeBtn.disabled = true;
      cancelRecordBtn.disabled = true;
    }
  };

  // Record Button Click
  recordBtnMain.addEventListener('click', async () => {
    if (!recorder.isRecording) {
      try {
        await recorder.start();
        showToast('Ortam dinleniyor ve kaydediliyor', '🎙️');
      } catch (err) {
        alert(err.message);
      }
    } else {
      recordingStatusText.innerText = 'Yapay Zeka Ses Kaydını İnceliyor...';
      const result = await recorder.stop();
      if (result) {
        await processAndSaveAudio(result.wavBlob, result.durationMs, result.playbackBlob, null);
      }
    }
  });

  pauseResumeBtn.addEventListener('click', () => {
    if (recorder.isPaused) recorder.resume();
    else recorder.pause();
  });

  cancelRecordBtn.addEventListener('click', async () => {
    if (confirm('Mevcut kaydı silip iptal etmek istiyor musunuz?')) {
      await recorder.stop();
      showToast('Kayıt iptal edildi', '🗑️');
    }
  });

  // Audio File Upload
  fileUploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    recordingStatusText.innerText = 'Dosya Yükleniyor...';
    pulsingDot.style.display = 'block';

    const tempAudio = new Audio();
    tempAudio.src = URL.createObjectURL(file);
    tempAudio.onloadedmetadata = async () => {
      const durationMs = Math.round(tempAudio.duration * 1000) || 60000;
      await processAndSaveAudio(file, durationMs, [], file.name);
      fileUploadInput.value = '';
    };
  });

  // Process & Save
  async function processAndSaveAudio(wavBlob, durationMs, playbackBlob = null, customTitle = null) {
    const recId = 'rec-' + Date.now();
    const defaultTitle = customTitle ? customTitle.replace(/\.[^/.]+$/, '') : `Ses Kaydı (${new Date().toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })})`;

    // 1. HER KOŞULDA SES KAYDINI ÖNCE CİHAZA GÜVENLE KAYDET!
    // İnternet kopsa veya Google sunucuları aşırı yoğun olsa bile ses kaydı ASLA kaybolmaz.
    let initialRecord = {
      id: recId,
      title: defaultTitle,
      createdAt: new Date().toISOString(),
      durationMs: durationMs,
      audioBlob: wavBlob, // Master 16kHz PCM WAV
      playbackBlob: playbackBlob || wavBlob,
      speakers: [{ id: 'spk-1', name: 'Konuşmacı 1', avatarColor: '#0a84ff' }],
      summary: 'Ses kaydı cihazınıza güvenle kaydedildi. Çözümleme yapılıyor...',
      decisions: [],
      actionItems: [],
      segments: [],
      chatHistory: [],
      status: 'pending'
    };

    await storage.saveRecording(initialRecord);

    showToast('Ses kaydedildi! Çözümleme yapılıyor...', '⚡');

    try {
      if (!aiEngine.getApiKey()) {
        settingsModal.classList.add('active');
        showToast('Ses cihazınızda saklandı. Lütfen API anahtarınızı girin.', '🔑');
        openRecordingDetail(recId);
        return;
      }

      // 2. Otomatik çözümlemeyi başlat (doğal akustik tespit)
      const aiResult = await aiEngine.processAudioRecording(wavBlob, durationMs);

      initialRecord.title = customTitle ? defaultTitle : (aiResult.title || defaultTitle);
      initialRecord.summary = aiResult.summary || 'Özet oluşturuldu.';
      initialRecord.decisions = aiResult.decisions || [];
      initialRecord.actionItems = aiResult.actionItems || [];
      initialRecord.speakers = aiResult.speakers || initialRecord.speakers;
      initialRecord.segments = aiResult.segments || [];
      initialRecord.status = 'completed';
      initialRecord.usedModel = aiEngine.modelName;
      initialRecord.chatHistory = [
        {
          sender: 'ai',
          text: `Merhaba! "${initialRecord.title}" kaydı incelendi (${initialRecord.speakers.length} konuşmacı ayrıştırıldı). Kayıtla ilgili dilediğinizi sorabilirsiniz.`,
          timestamp: '00:00'
        }
      ];

      await storage.saveRecording(initialRecord);
      showToast('Kayıt başarıyla çözümlendi!', '🎉');
      openRecordingDetail(recId);
    } catch (err) {
      console.warn('Otomatik çözümleme hatası veya yoğunluk:', err);
      initialRecord.summary = 'Google sunucuları şu anda yoğun olduğundan otomatik döküm tamamlanamadı. Sağ üstteki 🔄 "Farklı Modelle Çöz" butonuna basarak dilediğiniz Gemini modeliyle hemen çözdürebilirsiniz.';
      initialRecord.status = 'needs_reanalysis';
      await storage.saveRecording(initialRecord);
      openRecordingDetail(recId);
      alert('Ses kaydınız cihazınıza güvenle kaydedildi! ✅\n\nAncak Google sunucusu şu an aşırı yoğun (' + err.message + ').\n\nSağ üstteki 🔄 butonuna dokunarak dilediğiniz alternatif modeli (Örn: Gemini 2.0 Flash Lite) seçip hemen çözdürebilirsiniz.');
    }
  }

  // Render Recordings List
  async function renderRecordingsList() {
    const list = await storage.getAllRecordings();
    recordingCountBadge.innerText = `${list.length} Kayıt`;

    if (list.length === 0) {
      recordingsListContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎙️</div>
          <p>Henüz kayıt bulunmuyor.</p>
          <span style="font-size: 13px;">"Kayıt" sekmesinden ilk ortam veya toplantı kaydınızı başlatın.</span>
        </div>
      `;
      return;
    }

    recordingsListContainer.innerHTML = list.map(item => {
      const dateStr = new Date(item.createdAt).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      const durationStr = AudioRecorder.formatDurationText(item.durationMs);
      const spkCount = (item.speakers || []).length;

      return `
        <div class="recording-card" data-id="${item.id}">
          <div class="rc-top">
            <div>
              <div class="rc-title">${item.title}</div>
              <div class="rc-meta">
                <span>📅 ${dateStr}</span>
                <span class="rc-duration-badge">${durationStr}</span>
              </div>
            </div>
          </div>

          <div class="rc-preview">${item.summary || 'Özet bulunmuyor.'}</div>

          <div class="rc-tags">
            <span class="rc-tag speaker-tag">👥 ${spkCount} Konuşmacı</span>
            ${(item.decisions && item.decisions.length > 0) ? `<span class="rc-tag">🎯 ${item.decisions.length} Karar</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.recording-card').forEach(card => {
      card.addEventListener('click', () => {
        openRecordingDetail(card.getAttribute('data-id'));
      });
    });
  }

  // Open Detail View
  async function openRecordingDetail(id) {
    activeRecordingId = id;
    const data = await storage.getRecording(id);
    if (!data) return;
    activeRecordingData = data;

    playerMeetingTitle.innerText = data.title;
    const durSec = Math.max(1, Math.round(data.durationMs / 1000));
    totalDurationDisplay.innerText = formatSec(durSec);
    currentTimeDisplay.innerText = '00:00';
    audioScrubber.value = 0;
    audioScrubber.max = durSec;

    if (data.audioBlob) {
      nativeAudioPlayer.src = URL.createObjectURL(data.audioBlob);
    } else {
      nativeAudioPlayer.src = '';
    }

    // Populate Tabs
    renderTranscriptFeed(data.segments, data.speakers);

    summaryText.innerText = data.summary || 'Özet bulunmuyor.';
    
    if (data.decisions && data.decisions.length > 0) {
      decisionsCard.style.display = 'flex';
      decisionsList.innerHTML = data.decisions.map(d => `<div style="margin-bottom: 6px;">• ${d}</div>`).join('');
    } else {
      decisionsCard.style.display = 'none';
    }

    if (data.actionItems && data.actionItems.length > 0) {
      actionsCard.style.display = 'flex';
      actionItemsList.innerHTML = data.actionItems.map((act, idx) => `
        <label class="action-item">
          <input type="checkbox" ${act.done ? 'checked' : ''} data-idx="${idx}">
          <div><strong>${act.assignee}:</strong> ${act.task}</div>
        </label>
      `).join('');
    } else {
      actionsCard.style.display = 'none';
    }

    renderChatMessages(data.chatHistory || []);

    statDuration.innerText = AudioRecorder.formatDurationText(data.durationMs);
    statSpeakers.innerText = `${(data.speakers || []).length} Kişi`;
    renderSpeakerStats(data.segments, data.speakers, durSec);

    showScreen('screenDetail');
  }

  function formatSec(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Render Transcripts Feed with Speaker Reassignment & Renaming
  function renderTranscriptFeed(segments, speakers, searchFilter = '') {
    if (!segments || segments.length === 0) {
      transcriptFeed.innerHTML = '<p style="text-align: center; color: var(--text-tertiary); padding: 20px;">Kayıtta döküm bulunamadı.</p>';
      return;
    }

    const speakerMap = {};
    (speakers || []).forEach(spk => {
      speakerMap[spk.id] = spk;
      speakerMap[spk.name] = spk;
    });

    const filter = searchFilter.toLowerCase().trim();

    transcriptFeed.innerHTML = segments.map((seg, idx) => {
      const spkObj = speakerMap[seg.speakerId] || speakerMap[seg.speakerName] || {
        name: seg.speakerName || 'Konuşmacı',
        avatarColor: '#0a84ff'
      };

      const initial = (spkObj.name || 'K')[0].toUpperCase();
      let textHtml = seg.text;

      if (filter && textHtml.toLowerCase().includes(filter)) {
        const regex = new RegExp(`(${filter})`, 'gi');
        textHtml = textHtml.replace(regex, '<span class="highlight-match">$1</span>');
      }

      // Speaker options dropdown
      const speakerOptions = (speakers || []).map(s => `
        <option value="${s.id}" ${s.id === seg.speakerId ? 'selected' : ''}>${s.name}</option>
      `).join('') + '<option value="new_speaker">+ Yeni Konuşmacı Ekle</option>';

      return `
        <div class="transcript-item" data-start="${seg.startTime}" data-idx="${idx}">
          <div class="ti-header">
            <div class="ti-speaker-wrap">
              <div class="ti-avatar" style="background-color: ${spkObj.avatarColor || '#0a84ff'}">${initial}</div>
              <select class="speaker-select" data-idx="${idx}" style="background: none; border: 1px solid var(--border-subtle); color: #fff; font-size: 13px; font-weight: 600; border-radius: 6px; padding: 2px 6px; outline: none; cursor: pointer;">
                ${speakerOptions}
              </select>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="ti-emotion">${seg.emotionIcon || '💬'} ${seg.emotion || 'Nötr'}</span>
              <span class="ti-time">${seg.timeLabel}</span>
            </div>
          </div>
          <div class="ti-text">${textHtml}</div>
        </div>
      `;
    }).join('');

    // Speaker reassignment listener
    document.querySelectorAll('.speaker-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const idx = parseInt(sel.getAttribute('data-idx'));
        const val = sel.value;

        if (val === 'new_speaker') {
          const newName = prompt('Yeni konuşmacının adı (Örn: Mehmet):');
          if (newName) {
            const newId = `spk-${Date.now()}`;
            const colors = ['#0a84ff', '#ff9f0a', '#30d158', '#bf5af2', '#ff375f', '#ffd60a'];
            const newColor = colors[activeRecordingData.speakers.length % colors.length];
            activeRecordingData.speakers.push({ id: newId, name: newName, avatarColor: newColor });
            activeRecordingData.segments[idx].speakerId = newId;
            activeRecordingData.segments[idx].speakerName = newName;
            await storage.saveRecording(activeRecordingData);
            openRecordingDetail(activeRecordingId);
          }
        } else {
          const found = activeRecordingData.speakers.find(s => s.id === val);
          if (found) {
            activeRecordingData.segments[idx].speakerId = found.id;
            activeRecordingData.segments[idx].speakerName = found.name;
            await storage.saveRecording(activeRecordingData);
            renderTranscriptFeed(activeRecordingData.segments, activeRecordingData.speakers);
          }
        }
      });
    });




    // Seek audio on click
    document.querySelectorAll('.transcript-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'select') return;
        const startTime = parseFloat(item.getAttribute('data-start')) || 0;
        seekAudio(startTime);
      });
    });
  }

  // Audio Playback
  function seekAudio(seconds) {
    if (nativeAudioPlayer.src) {
      nativeAudioPlayer.currentTime = seconds;
      nativeAudioPlayer.play();
      updatePlayButtonState(true);
    } else {
      audioScrubber.value = seconds;
      currentTimeDisplay.innerText = formatSec(seconds);
      highlightActiveSegment(seconds);
    }
  }

  function updatePlayButtonState(isPlaying) {
    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIconMini.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIconMini.style.display = 'none';
    }
  }

  playPauseAudioBtn.addEventListener('click', () => {
    if (nativeAudioPlayer.src) {
      if (nativeAudioPlayer.paused) {
        nativeAudioPlayer.play();
        updatePlayButtonState(true);
      } else {
        nativeAudioPlayer.pause();
        updatePlayButtonState(false);
      }
    }
  });

  nativeAudioPlayer.addEventListener('timeupdate', () => {
    const cur = Math.floor(nativeAudioPlayer.currentTime);
    audioScrubber.value = cur;
    currentTimeDisplay.innerText = formatSec(cur);
    highlightActiveSegment(cur);
  });

  nativeAudioPlayer.addEventListener('ended', () => updatePlayButtonState(false));

  audioScrubber.addEventListener('input', (e) => {
    const targetSec = parseFloat(e.target.value);
    if (nativeAudioPlayer.src) nativeAudioPlayer.currentTime = targetSec;
    currentTimeDisplay.innerText = formatSec(targetSec);
    highlightActiveSegment(targetSec);
  });

  seekBack15Btn.addEventListener('click', () => {
    const cur = parseFloat(audioScrubber.value);
    seekAudio(Math.max(0, cur - 15));
  });

  seekForward15Btn.addEventListener('click', () => {
    const cur = parseFloat(audioScrubber.value);
    const max = parseFloat(audioScrubber.max);
    seekAudio(Math.min(max, cur + 15));
  });

  speedToggleBtn.addEventListener('click', () => {
    currentSpeedIdx = (currentSpeedIdx + 1) % speeds.length;
    const speed = speeds[currentSpeedIdx];
    speedToggleBtn.innerText = `${speed.toFixed(1)}x`;
    nativeAudioPlayer.playbackRate = speed;
  });

  function highlightActiveSegment(currentSec) {
    if (!activeRecordingData || !activeRecordingData.segments) return;
    const items = document.querySelectorAll('.transcript-item');
    items.forEach(el => el.classList.remove('playing'));

    const activeSeg = activeRecordingData.segments.find(s => currentSec >= s.startTime && currentSec <= s.endTime);
    if (activeSeg) {
      const match = document.querySelector(`.transcript-item[data-start="${activeSeg.startTime}"]`);
      if (match) match.classList.add('playing');
    }
  }

  transcriptSearchInput.addEventListener('input', (e) => {
    if (activeRecordingData) {
      renderTranscriptFeed(activeRecordingData.segments, activeRecordingData.speakers, e.target.value);
    }
  });

  // Segmented Tabs
  segmentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      segmentBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(btn.getAttribute('data-tab'));
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Chat
  function renderChatMessages(history) {
    chatMessages.innerHTML = history.map(msg => `
      <div class="chat-bubble ${msg.sender}">
        ${msg.text.replace(/\n/g, '<br>')}
      </div>
    `).join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = chatInput.value.trim();
    if (!query || !activeRecordingData) return;

    chatInput.value = '';
    if (!activeRecordingData.chatHistory) activeRecordingData.chatHistory = [];
    activeRecordingData.chatHistory.push({ sender: 'user', text: query });
    renderChatMessages(activeRecordingData.chatHistory);

    try {
      const answer = await aiEngine.askMeetingQuestion(query, activeRecordingData);
      activeRecordingData.chatHistory.push({ sender: 'ai', text: answer });
      renderChatMessages(activeRecordingData.chatHistory);
      await storage.saveRecording(activeRecordingData);
    } catch (err) {
      activeRecordingData.chatHistory.push({ sender: 'ai', text: 'Hata: ' + err.message });
      renderChatMessages(activeRecordingData.chatHistory);
    }
  });

  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      chatInput.value = chip.getAttribute('data-prompt');
      chatForm.dispatchEvent(new Event('submit'));
    });
  });

  // Speaker Stats & Renaming
  function renderSpeakerStats(segments, speakers, totalSec) {
    if (!speakers || speakers.length === 0) {
      speakerShareList.innerHTML = '<p style="color: var(--text-tertiary)">Konuşmacı bilgisi yok.</p>';
      return;
    }

    const speakerDurations = {};
    (segments || []).forEach(s => {
      const dur = Math.max(1, (s.endTime - s.startTime));
      speakerDurations[s.speakerId] = (speakerDurations[s.speakerId] || 0) + dur;
    });

    speakerShareList.innerHTML = speakers.map(spk => {
      const dur = speakerDurations[spk.id] || 0;
      const pct = Math.min(100, Math.round((dur / (totalSec || 1)) * 100));
      return `
        <div class="speaker-progress-row" style="margin-bottom: 14px; background: var(--bg-tertiary); padding: 10px; border-radius: 10px; border: 1px solid var(--border-subtle);">
          <div class="sp-info">
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong>${spk.name}</strong>
              <button class="rename-spk-btn" data-id="${spk.id}" style="background: none; border: none; color: var(--accent-blue); font-size: 12px; cursor: pointer;">[İsmi Değiştir]</button>
              <button class="merge-spk-btn" data-id="${spk.id}" style="background: none; border: none; color: var(--accent-orange); font-size: 12px; cursor: pointer;" title="Aynı kişi yanlışlıkla farklı numara aldıysa birleştirin">[Biriyle Birleştir]</button>
            </div>
            <span>${dur} sn (%${pct})</span>
          </div>
          ${spk.voiceDescription ? `<div style="font-size: 11px; color: var(--text-secondary); margin: 3px 0 6px 0;">🎙️ <em>${spk.voiceDescription}</em></div>` : ''}
          <div class="sp-bar-bg">
            <div class="sp-bar-fill" style="width: ${pct}%; background-color: ${spk.avatarColor || '#0a84ff'};"></div>
          </div>
        </div>
      `;
    }).join('');

    // Attach rename buttons
    document.querySelectorAll('.rename-spk-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const spk = activeRecordingData.speakers.find(s => s.id === id);
        if (!spk) return;

        const newName = prompt(`"${spk.name}" için yeni isim girin:`, spk.name);
        if (newName && newName.trim()) {
          spk.name = newName.trim();
          (activeRecordingData.segments || []).forEach(seg => {
            if (seg.speakerId === id) seg.speakerName = newName.trim();
          });
          await storage.saveRecording(activeRecordingData);
          openRecordingDetail(activeRecordingId);
          showToast(`Konuşmacı "${newName}" olarak güncellendi`, '👤');
        }
      });
    });

    // Merge Speakers Tool (Fixes Speaker Drift)
    document.querySelectorAll('.merge-spk-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetId = btn.getAttribute('data-id');
        const spk = activeRecordingData.speakers.find(s => s.id === targetId);
        if (!spk) return;

        const otherSpeakers = activeRecordingData.speakers.filter(s => s.id !== targetId);
        if (otherSpeakers.length === 0) {
          alert('Birleştirilebilecek başka konuşmacı bulunmuyor.');
          return;
        }

        const choices = otherSpeakers.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
        const selIdx = prompt(
          `"${spk.name}" aslında hangi konuşmacıydı?\n(Tüm kayıtta o kişinin adıyla birleştirilecektir)\n\n` + choices + `\n\nLütfen numarasını yazın (Örn: 1):`
        );

        if (selIdx) {
          const chosenNum = parseInt(selIdx) - 1;
          const destination = otherSpeakers[chosenNum];
          if (destination) {
            // Reassign all occurrences across the entire transcript
            activeRecordingData.segments.forEach(seg => {
              if (seg.speakerId === targetId) {
                seg.speakerId = destination.id;
                seg.speakerName = destination.name;
              }
            });

            // Remove merged duplicate from speakers list
            activeRecordingData.speakers = activeRecordingData.speakers.filter(s => s.id !== targetId);

            await storage.saveRecording(activeRecordingData);
            openRecordingDetail(activeRecordingId);
            showToast(`"${spk.name}" tüm kayıtta "${destination.name}" ile birleştirildi!`, '🔗');
          }
        }
      });
    });

  }

  // Delete Recording
  deleteMeetingBtn.addEventListener('click', async () => {
    if (confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
      if (activeRecordingId) {
        await storage.deleteRecording(activeRecordingId);
        showToast('Kayıt silindi', '🗑️');
        showScreen('screenList');
      }
    }
  });

  // Initial render
  
  // Reanalyze Modal Listeners
  if (reanalyzeBtn) {
    reanalyzeBtn.addEventListener('click', () => {
      if (reanalyzeModal) reanalyzeModal.classList.add('active');
    });
  }

  if (closeReanalyzeBtn) {
    closeReanalyzeBtn.addEventListener('click', () => {
      if (reanalyzeModal) reanalyzeModal.classList.remove('active');
    });
  }

  if (startReanalyzeBtn) {
    startReanalyzeBtn.addEventListener('click', async () => {
      if (!activeRecordingData || !activeRecordingData.audioBlob) {
        alert('Bu kayda ait ses verisi bulunamadı.');
        return;
      }

      const selectedModel = reanalyzeModelSelect.value;

      reanalyzeModal.classList.remove('active');
      showToast(`${selectedModel} ile çözümleniyor...`, '⏳');

      try {
        const aiResult = await aiEngine.processAudioRecording(
          activeRecordingData.audioBlob,
          activeRecordingData.durationMs,
          selectedModel
        );

        activeRecordingData.title = aiResult.title || activeRecordingData.title;
        activeRecordingData.summary = aiResult.summary || activeRecordingData.summary;
        activeRecordingData.decisions = aiResult.decisions || [];
        activeRecordingData.actionItems = aiResult.actionItems || [];
        activeRecordingData.speakers = aiResult.speakers || activeRecordingData.speakers;
        activeRecordingData.segments = aiResult.segments || [];
        activeRecordingData.status = 'completed';
        activeRecordingData.usedModel = selectedModel;

        await storage.saveRecording(activeRecordingData);
        showToast('Kayıt seçilen modelle başarıyla çözümlendi!', '🎉');
        openRecordingDetail(activeRecordingId);
      } catch (err) {
        alert('Yeniden çözümleme hatası: ' + err.message);
        showToast('Çözümleme başarısız', '⚠️');
      }
    });
  }

  await renderRecordingsList();
});
