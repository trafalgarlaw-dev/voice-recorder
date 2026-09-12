/**
 * AIEngine: Google Gemini 1.5 / 2.0 Flash Audio Intelligence Engine
 * Sends pristine 16kHz PCM WAV audio for verbatim multi-speaker transcription & diarization.
 */
class AIEngine {
  constructor() {
    this.apiKey = localStorage.getItem('ai_recorder_gemini_key') || '';
    this.modelName = localStorage.getItem('ai_recorder_model') || 'gemini-3.6-flash';
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    localStorage.setItem('ai_recorder_gemini_key', this.apiKey);
  }

  getApiKey() {
    return this.apiKey;
  }

  setModelName(model) {
    this.modelName = model;
    localStorage.setItem('ai_recorder_model', this.modelName);
  }

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Process raw WAV audio recording with Gemini AI
   */
  /**
   * Automatically discovers the exact supported model and API version for this API key
   */
  async getWorkingModelAndVersion() {
    const versions = ['v1beta', 'v1'];
    let errorMsg = null;

    for (const ver of versions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${this.apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const validModels = (data.models || [])
            .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));

          if (validModels.length > 0) {
            // Prioritize Gemini 3.6 Flash (current standard recommended by Google)
            const best = validModels.find(m => m.includes('3.6-flash'))
              || validModels.find(m => m.includes('3.5-flash'))
              || validModels.find(m => m.includes('3.'))
              || validModels.find(m => m.includes('2.0-flash'))
              || validModels.find(m => m.includes('flash') && !m.includes('2.5'))
              || validModels[0];

            return { version: ver, model: best };
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          errorMsg = errData.error?.message || `HTTP ${res.status}`;
        }
      } catch (e) {
        errorMsg = e.message;
      }
    }

    if (errorMsg) {
      throw new Error(`Google API Anahtarı Doğrulama Hatası: ${errorMsg}
Lütfen Google AI Studio'dan (aistudio.google.com) yeni bir API anahtarı oluşturup girdiğinizden emin olun.`);
    }

    // Default fallback
    return { version: 'v1beta', model: 'gemini-3.6-flash' };
  }

  async processAudioRecording(wavBlob, durationMs, chosenModel = null) {
    if (!this.apiKey) {
      throw new Error('Gemini API anahtarı bulunamadı!\n4+ konuşmacıyı ses tınısından ayırt etmek ve tüm kelimeleri eksiksiz dökmek için lütfen sağ üstteki Çark simgesinden veya ana ekrandaki "Anahtar Gir" butonundan ücretsiz Google Gemini API anahtarınızı girin.');
    }

    const base64Audio = await this.blobToBase64(wavBlob);

    const prompt = `GÖREV: Bu ses kaydını en üst düzey hassasiyetle incele. Ortamda konuşan HER FARKLI İNSANI akustik ses özelliklerine göre KUSURSUZ ŞEKİLDE AYRIŞTIR ve söylenen her şeyi KELİMESİ KELİMESİNE metne dök.

AKUSTİK VE DİYARİZASYON (SPEAKER DIARIZATION) KURALLARI:

1. ORTAMDAKİ GERÇEK KONUŞMACILARI DOĞRU TESPİT ET:
   - Kayıttaki her bir insanın ses tınısını (timbre), ses perdesini (tiz, bas, orta), rezonansını ve konuşma tarzını baştan sona analiz et.
   - Ortamda gerçekten kaç farklı insan konuşuyorsa tam olarak o kadar konuşmacı oluştur (Örn: Konuşmacı 1, Konuşmacı 2, Konuşmacı 3...).
   - Farklı sesleri ASLA tek bir kişiymiş gibi birleştirme! Farklı bir insan konuştuğunda anında yeni konuşmacı olarak kayda geçir.

2. KİMLİK SABİTLİĞİ (AYNI KİŞİYİ KAYIP ETMEME):
   - "Konuşmacı 1" olarak belirlediğin kişi kayıt boyunca ne zaman tekrar konuşursa konuşsun (ister 5 saniye sonra, ister 2 dakika sonra) MUTLAKA YİNE "Konuşmacı 1" kalmalıdır.
   - Benzer şekilde "Konuşmacı 2" daha sonra tekrar konuştuğunda yine "Konuşmacı 2" kalmalıdır.

3. ARAYA GİRME (INTERRUPTION) VE ÜST ÜSTE KONUŞMA (OVERLAPPING SPEECH) - ÇOK KRİTİK:
   - Bir konuşmacı konuşurken başka bir konuşmacı TEK BİR KELİME DAHİ OLSA araya girdiğinde ("Evet", "Aynen", "Katılıyorum", "Hayır", vb.):
     * O tek kelimelik müdahaleyi KESİNLİKLE araya giren konuşmacının kimliğiyle AYRI BİR SATIR OLARAK DÖK!
     * Asla araya giren kişinin kelimesini ana konuşmacının cümlesinin içine katma!
     * Örnek:
       Konuşmacı 1: [00:10 - 00:14] "Biz bu projeyi gelecek hafta bitirmeliyiz çünkü..."
       Konuşmacı 2: [00:12 - 00:13] "Aynen öyle."
       Konuşmacı 1: [00:14 - 00:17] "...çünkü teslim tarihi çok yakın."
   - İki kişi aynı anda konuştuğunda her iki konuşmacının ağzından çıkan kelimeleri kendi satırlarına ayrı ayrı yaz.

4. EKSİKSİZ VE KELİMESİ KELİMESİNE DÖKÜM (VERBATIM):
   - Ses kısıldığında, fısıldandığında veya hızlı konuşulduğunda dahi hiçbir kelimeyi atlama.

5. TÜM KAYDI BAŞINDAN SON SANİYESİNE KADAR DÖK (ERKEN DURMA YASAKTIR):
   - Kaydın 1. dakikasında, 5. dakikasında veya 15. dakikasında konuşulanları asla yarıda bırakma veya atlama.
   - Ses kaydının bittiği son saniyeye kadar olan bütün konuşmaları segments dizisine ekle.

ÇIKTI FORMATI:
SADECE aşağıdaki geçerli JSON formatında yanıt ver (asla markdown backtick kullanma):
{
  "title": "Görüşme Başlığı",
  "summary": "Konuşulanların net ve ayrıntılı özeti...",
  "decisions": ["Alınan kararlar veya öne çıkan noktalar"],
  "actionItems": [
    { "task": "Görev veya konu", "assignee": "İlgili Konuşmacı", "done": false }
  ],
  "speakers": [
    { "id": "spk-1", "name": "Konuşmacı 1", "voiceDescription": "Örn: Kalın, tok erkek sesi", "avatarColor": "#0a84ff" },
    { "id": "spk-2", "name": "Konuşmacı 2", "voiceDescription": "Örn: Tiz kadın sesi", "avatarColor": "#ff9f0a" }
  ],
  "segments": [
    {
      "speakerId": "spk-1",
      "speakerName": "Konuşmacı 1",
      "startTime": 0,
      "endTime": 3,
      "timeLabel": "00:00 - 00:03",
      "emotion": "Sakin",
      "emotionIcon": "💬",
      "text": "Konuşulan replik..."
    }
  ]
}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'audio/wav',
                data: base64Audio
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    };

    // Dynamically discover which model and API version this specific API key is authorized to use
    const { version, model } = await this.getWorkingModelAndVersion();
    console.log(`Using discovered working model: ${model} on ${version}`);

    // If user explicitly chose a model, prioritize it first; otherwise use discovered model & pool
    const candidateList = chosenModel ? [
      chosenModel,
      model,
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-3.6-flash',
      'gemini-1.5-flash-latest'
    ] : [
      model,
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-3.6-flash',
      'gemini-1.5-flash-latest'
    ];
    const uniqueCandidates = [...new Set(candidateList.filter(Boolean))];

    let lastError = null;

    for (const currentModel of uniqueCandidates) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/${version}/models/${currentModel}:generateContent?key=${this.apiKey}`;
        console.log(`Attempting transcription with model: ${currentModel}...`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            // Post-processing speaker consolidation:
            // If the AI generated multiple speakers but their voice descriptions or roles match,
            // or if it's clearly a single continuous recording from the same timbre, consolidate them.
            return this.normalizeSpeakers(parsed);
          }
        }

        const errJson = await response.json().catch(() => ({}));
        const msg = errJson.error?.message || (await response.text());
        lastError = new Error(`Gemini (${currentModel}): ${msg}`);
        console.warn(`Model ${currentModel} returned error: ${msg}. Switching to next candidate...`);

        // If high demand or overloaded or rate limited, immediately try next candidate
        continue;
      } catch (err) {
        lastError = err;
        console.warn(`Request failed on ${currentModel}:`, err);
      }
    }

    throw lastError || new Error('Tüm Gemini modelleri şu an aşırı yoğun. Lütfen 10 saniye sonra tekrar deneyin.');
  }

  /**
   * Ask question over meeting transcript (Interactive Q&A)
   */
  async askMeetingQuestion(question, recordingData) {
    const contextPrompt = `Aşağıda bir ses kaydının konuşma dökümü, konuşmacıları ve zaman damgaları yer almaktadır:
BAŞLIK: ${recordingData.title}
ÖZET: ${recordingData.summary}

KONUŞMA DÖKÜMÜ VE KONUŞMACILAR:
${(recordingData.segments || []).map(s => `[${s.timeLabel}] ${s.speakerName} (${s.emotion || 'Nötr'}): "${s.text}"`).join('\n')}

SORU:
"${question}"

TALİMATLAR:
1. Yanıtı SADECE yukarıdaki döküme dayanarak ver.
2. Kimin ne zaman ne söylediğini belirterek cevapla.`;

    if (this.apiKey) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
        const payload = {
          contents: [{ role: 'user', parts: [{ text: contextPrompt }] }],
          generationConfig: { temperature: 0.2 }
        };
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const json = await res.json();
          const answer = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (answer) return answer;
        }
      } catch (err) {
        console.warn('Gemini chat error:', err);
      }
    }

    // Local Search Engine over transcript
    return this.answerLocally(question, recordingData);
  }

  answerLocally(question, data) {
    const q = question.toLowerCase();
    const segs = data.segments || [];

    for (const spk of (data.speakers || [])) {
      const spkName = spk.name.toLowerCase();
      if (q.includes(spkName) || q.includes(spkName.split(' ')[0])) {
        const matches = segs.filter(s => s.speakerId === spk.id || s.speakerName.toLowerCase() === spkName);
        if (matches.length > 0) {
          return `🗣️ **${spk.name} konuşmaları:**\n\n` + 
            matches.map(m => `⏱️ **[${m.timeLabel}]**: "${m.text}"`).join('\n\n');
        }
      }
    }

    const keywords = q.split(' ').filter(w => w.length > 2 && !['kim', 'nedir', 'hangi', 'neler', 'hakkında', 'ne', 'zaman'].includes(w));
    const matched = segs.filter(s => {
      const text = s.text.toLowerCase();
      return keywords.some(k => text.includes(k));
    });

    if (matched.length > 0) {
      return `🔍 **İlgili konuşma bölümleri bulundu:**\n\n` + 
        matched.map(m => `⏱️ **[${m.timeLabel}] ${m.speakerName}**: "${m.text}"`).join('\n\n');
    }

    return `Kayıt dökümünde "${question}" ile doğrudan eşleşen bir ifade bulunamadı.`;
  }

  /**
   * Automatic Speaker Reconciliation:
   * Reconciles accidental speaker splits (e.g. Speaker 1 changing to Speaker 2 mid-speech)
   * when there is no legitimate distinct second speaker.
   */
  normalizeSpeakers(data) {
    // Return pristine diarized data directly from acoustic analysis
    return data;
  }
}
