# 🎙️ Apple Watch & iOS 18 Tarzı Akıllı Ses & Toplantı Asistanı

Bu uygulama, Apple'ın en yeni Apple Watch ve iOS 18 güncellemelerinde tanıttığı akıllı ses kaydı, konuşmacı ayrımı (speaker diarization), duygu/ton analizi ve toplantı kaydı üzerinden yapay zeka ile soru-cevap yapabilme özelliklerini doğrudan iPhone'unuzda (ve tarayıcınızda) kullanabilmeniz için geliştirilmiştir.

---

## 🚀 Öne Çıkan Özellikler

1. **Tek Dokunuşla Canlı Ortam Kaydı:**
   - Apple Watch estetiğinde canlı ses dalgası animasyonu (waveform canvas).
   - Duraklatma, devam ettirme ve hassas süre sayacı (milisaniyelik).
2. **Konuşmacı Ayrımı (Speaker Diarization - "Kim Konuştu"):**
   - Ortamdaki farklı sesleri ayırt etme (Ahmet, Can, Zeynep veya Konuşmacı 1, 2 vb.).
   - Her cümlenin başlama ve bitiş zaman damgaları (ör. `00:15 - 00:34`).
3. **Duygu & Konuşma Tarzı Analizi ("Nasıl Konuştu"):**
   - Kararlı 💡, Heyecanlı ⚡, Analitik / Temkinli ⚠️, Destekleyici ✨ gibi ton etiketleri.
4. **Kayıt Üzerinden AI ile Soru-Cevap (Meeting Intelligence):**
   - *"Ahmet bütçe hakkında ne dedi?"*
   - *"Lansman tarihi ne zaman olarak kararlaştırıldı?"*
   - *"Kimin hangi görevleri var?"*
   - Sorulara doğrudan ses kaydından alıntı ve saniye damgasıyla yanıt verir.
5. **Otomatik Çıktılar:**
   - Detaylı toplantı özeti.
   - Alınan kararlar listesi.
   - Görev & Aksiyon maddeleri (etkileşimli onay kutuları ile).
6. **Ses Oynatıcı & Senkronize Takip:**
   - Dökümdeki herhangi bir cümleye dokunduğunuzda ses kaydı tam o saniyeye atlar.
   - Hız kontrolü (1.0x, 1.25x, 1.5x, 2.0x).
   - 15 saniye geri/ileri sarma butonları.
7. **iPhone Sesli Not Dosyası Yükleme:**
   - iPhone'un kendi "Sesli Notlar" (Voice Memos) uygulamasından veya dosyalardan `.m4a`, `.mp3`, `.wav` dosyalarını içeri aktarıp analiz ettirebilme.

---

## 📲 iPhone'da Nasıl Çalıştırılır ve Kullanılır?

### 1. Sunucuyu Başlatın
Terminalde proje dizinine gidip sunucuyu çalıştırın:

```bash
cd /Users/hasan/.gemini/antigravity/scratch/ai-voice-recorder
python3 server.py
```

Terminalde size yerel IP adresinizi verecektir (örneğin: `http://192.168.1.35:8080`).

> **İpucu (iPhone Mikrofon Erişimi İçin HTTPS):**
> iOS Safari yerel ağ üzerinden mikrofon erişimi için HTTPS protokolünü önerir. Otomatik sertifika ile HTTPS modunda başlatmak için:
> ```bash
> python3 server.py --https
> ```
> *(iPhone Safari'de ilk açılışta "Gelişmiş > Bu siteye yine de devam et" seçeneğine dokunmanız yeterlidir.)*

### 2. iPhone'da Ana Ekrana Ekleyin (PWA)
1. iPhone'unuzun Safari tarayıcısını açın.
2. Terminaldeki adresi yazıp girin (ör: `https://192.168.x.x:8080`).
3. Alt kısımdaki **Paylaş** (kare içinden yukarı ok çıkan simge) butonuna dokunun.
4. Listeden **"Ana Ekrana Ekle" (Add to Home Screen)** seçeneğini seçin.
5. Artık ana ekranınızdaki simgeye basarak tıpkı yerel bir iOS uygulaması gibi tam ekran kullanabilirsiniz!

---

## 🔑 Yapay Zeka Ayarları

- Uygulama sağ üstündeki **Çark (Ayarlar)** simgesine dokunarak Google AI Studio'dan alacağınız ücretsiz **Gemini API Anahtarınızı** girebilirsiniz.
- API anahtarı girmediğiniz takdirde uygulama akıllı **demo ve yerel arama modunda** çalışmaya devam eder; hazır toplantı senaryolarını hemen test edebilirsiniz.
