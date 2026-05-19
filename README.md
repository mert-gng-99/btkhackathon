# 2BMTRADE

**Canlı Site** [hackathon.mertgungor.me](https://hackathon.mertgungor.me)

Binance üzerinde gerçekten nasıl işlem yaptığını sade ve kanıta dayalı şekilde gösteren, yapay zeka destekli işlem analitik panelidir. Salt okunur API bağlantısı ister, hiçbir zaman emir göndermez, çekim yapmaz, hesap ayarlarına dokunmaz.

Tarayıcıdan doğrudan açıp deneyebilirsin. Kendi Binance hesabını bağlamak istemiyorsan sayfanın altındaki Demo veri butonu sentetik bir oturumla tüm ekranları açar.

## Çözdüğü Problem

Bireysel kripto işlemcileri Binance üzerinde haftada onlarca işlem açıyor, sonra dönüp bakınca neyi neden yaptığını hatırlamıyor. Borsanın kendi paneli işlem listesi gösterir ama davranışsal yorumlama yapmaz. Açık olmayan örüntüler para kaybettirir, geç saatte alınan kararlar yarın gözden geçirilemez, fazla işlem komisyon olarak akar gider.

2BMTRADE bu boşluğu kapatıyor. Salt okunur API anahtarını alır, Spot ile Vadeli geçmişini tarar, ham veriyi analitik öze indirir, davranışsal kalıpları çıkarır, jüri huzurunda kanıt göstererek konuşan bir koç sunar. Yatırım tavsiyesi vermez. Almalı satmalı tut gibi yönlendirmeler yapmaz. Sadece kullanıcının kendi davranışı hakkında somut sayılarla geri bildirim üretir.

## Öne Çıkan Yetenekler

Aşağıdaki yetenekler hackathon değerlendirme başlıklarını birebir karşılar.

* Spot, USD-M Vadeli ve COIN-M Vadeli geçmişlerinin tek seferde okunması.
* Üç farklı tarama modu; hızlı seçili, geniş quote, tam piyasa.
* Anket tabanlı artırımlı senkronizasyon. Tam piyasa taraması bile Vercel Hobby plan sınırlarına takılmadan tamamlanır.
* Gerçek araç çağıran Gemini agent. Koç, sorulara cevap üretirken arka uçtaki dört aracı tetikler ve sonuçlarını kanıtlı şekilde aktarır.
* Davranışsal örüntü dedektörü. Intikam işlemi, aşırı işlem, FOMO girişi, ortalama düşürme tuzağı için skor ve kanıt üretir.
* Trading DNA radarı. Altı eksenli görsel parmak izi, kullanıcının davranış imzasını tek bakışta gösterir.
* What If simülatörü. En kötü beş işlem yapılmasaydı PnL nasıl değişirdi sorusunu anlık olarak hesaplar.
* Anonim trader ağı. Kullanıcı kendine benzeyen veya tamamlayan profilleri sadece oranlar üzerinden eşleştirebilir, ham veri paylaşımı yoktur.
* Kanıt sergileyen RAG. Yanıtların altında hangi parçanın hangi belgeden geldiği görünür, doğrulanabilirlik korunur.
* Doğrulayıcı içeren PDF rapor hattı. Üretilen taslak otomatik denetimden geçer, kanıt sayısı eksikse uyarı ile dönmez.
* Türkçe ve İngilizce arayüz. Tüm metinler iki dilde uyumlu sözlükten gelir.

## Güvenlik Modeli

Güvenlik yan değil ana özelliktir.

* Anahtarın doğrudan tarayıcıdan sunucuya gelir, log dosyalarına asla yazılmaz.
* Sunucu, anahtarın salt okunur olduğunu doğrulamadan tarama başlatmaz. İşlem veya çekim yetkisi tespit edilirse istek reddedilir.
* Anahtar geçici bir oturum süresince Upstash Redis üzerinde AES 256 GCM ile şifrelenmiş halde saklanır, oturum biter bitmez silinir.
* Veritabanı bağlantısı şifreli kanal üzerinden çalışır.
* Production üzerinde HSTS, X Frame Options ve diğer başlıklar uygulanır.
* Tüm yazma uç noktaları kullanıcı oturumuna bağlı olarak çalışır, kimliksiz çağrı yapılamaz.
* Her uç nokta için ayrı kova üzerinden hız sınırı uygulanır. Upstash yoksa bellek içi yedek devreye girer.
* Anonim trader ağı sadece oran ve etiketleri saklar. Ham işlem, anahtar, kimlik bilgisi, zaman damgası veya bakiye verisi bu katmana asla geçmez.

## Yapay Zeka Katmanı

### Koç Agent

Gemini 2.5 Flash modeli iki ayrı yolla çalıştırılır. Birinci yol klasik anlatım üretir. İkinci yol araç çağıran agent yoludur ve şu dört aracı kullanır.

* `get_my_worst_trades` belirli bir periyot içinde en kötü PnL üreten işlemleri döner.
* `simulate_what_if` verilen işlem kimlikleri yapılmasaydı PnL nasıl olurdu hesabını çıkarır.
* `detect_behavior_patterns` dört davranışsal örüntü için skor, güven seviyesi ve kanıt döner.
* `risk_budget_today` o günkü davranışsal risk seviyesini hijyen önerileri ile birlikte sunar.

Model bir araç çağırdığında arka uç deterministik şekilde sonucu üretir, model bu çıktıya sözlü cevabı dayandırır. Tüm çağrılar arayüzde araç izi bloğu olarak görünür. Kullanıcı koçun hangi araca hangi parametreyle gittiğini ve özet çıktıyı görebilir.

Eğer Gemini yapılandırılmamışsa veya araç yolu hata verirse mevcut alt agent boru hattı devreye girer ve kullanıcı yine kanıtlı bir cevap alır. Hiçbir koşulda demo boyunca yanıtsız kalınmaz.

### RAG Boru Hattı

Koç, kullanıcının kendi oturum verisinden çıkarılan parçaları ve `rag-materials` klasöründeki işlem psikolojisi kitaplarından çıkartılan parçaları aynı vektör indeksinde tutar. İlgili sorgu çağırıldığında ilk sekiz parça çekilir, bunlardan beşi kullanıcı arayüzünde kanıt kartı olarak gösterilir. Her kartın altında parçanın geldiği kaynak ve özet görünür.

### Trader Profili

Insights sayfası açıldığında Gemini bir kerelik trader profili üretir. Çıktı şu yapıdadır. Trader tipi, güven seviyesi, kanıt listesi, güçlü yönler, izlenmesi gereken riskler, davranışsal etiketler, öz değerlendirme soruları. Profil tarayıcı oturumunda önbelleğe alınır.

## Davranışsal Analiz

`lib/analytics/BehaviorPatternDetector` saf bir TypeScript modülüdür ve dört örüntü için skor üretir.

* Intikam işlemi. Zarar sonrası altmış dakika içinde gelen takip işlemlerinin oranı ile hızlı işlem oranını birleştirir.
* Aşırı işlem. Aktif gün başına ortalama işlem sayısı ile hızlı işlem oranını birleştirir.
* FOMO. Aynı sembolde on beş dakika içinde ardışık ve büyüyen alım dizilerini sayar. Fiyat verisi olmadığı için güven seviyesi orta ile sınırlandırılır.
* Ortalama düşürme. Aynı sembolde yirmi dört saatlik pencerede ardışık alım dizilerinin en uzununu ölçer.

Bu skorlar üç farklı katmanda kullanılır.

* Insights sayfasında 6 eksenli Trading DNA radarında görünür.
* AI Koç araç katmanında patern detektörü olarak sunulur.
* Insight üretici, en yüksek skorlu örüntüleri kural tabanlı içgörüler ile birleştirir, çift kayıt oluşmaz.

## What If Simülatörü

Kullanıcı AI Koç ekranında atılacak işlemleri seçer ve baseline PnL değerinin nasıl değiştiğini görür. Hesap baseline değerinden seçilen işlemlerin PnL toplamı çıkarılarak yapılır. Kullanıcı hızlı kararlarının uzun vadeli etkisini somut bir sayıya bağlı olarak deneyimler.

API ucu `app/api/ai-coach/what-if` adresinden çalışır. Gövde boşsa varsayılan olarak en kötü beş işlem üzerinden simülasyon koşar.

## Mimari ve Veri Akışı

### Veri Akışı

1. Kullanıcı `/connect` üzerinde salt okunur anahtarını ve tarama tercihlerini gönderir.
2. Arka uç POST isteği içinde anahtarın salt okunur olduğunu doğrular.
3. Seçili piyasalar üzerinden sembol keşfi yapar ve her sembolü Upstash Redis kuyruğuna ekler.
4. Anahtar AES 256 GCM ile şifrelenir, kuyruk meta verisi ile birlikte saklanır.
5. Arayüz yarım saniyenin biraz altında bir aralıkla ilerleme uç noktasını yoklar.
6. Her yoklama on iki sembollik bir grubu eşzamanlı şekilde Binance üzerinden çeker, normalleştirir, Redis tampon listesine yazar.
7. Kuyruk boşaldığında tampon `TradingSession` nesnesine boşaltılır, analitik hesaplanır, RAG parçaları üretilir, oturum hem bellek hem Redis üzerinde saklanır.
8. Kullanıcı `/dashboard` adresine yönlendirilir. Bu uç farklı bir Vercel örneğine düşse bile oturum Redis üzerinden çekilir.

### Mimari Tercihler

Vercel Hobby planı tek bir bölgeye kilitlidir. Varsayılan bölge Washington DC olduğu için Binance kısıtlama listesine takılır. Tüm fonksiyonlar `vercel.json` üzerinden Frankfurt bölgesine sabitlenir. Fonksiyon süresi sınırı altmış saniyedir, bu yüzden tarama tek bir uzun istek yerine yoklama tabanlı ilerletme deseniyle çalışır. Oturum durumu Vercel örnekleri arasında paylaşılmadığı için her oturum Redis üzerinde de tutulur. Bu üç karar birlikte hackathon koşullarında ürünü ayakta tutar.

### Teknoloji Yığını

| Katman | Tercih |
| --- | --- |
| Çerçeve | Next.js 15 App Router ve React 19 |
| Dil | TypeScript 5.8 |
| Stil | Tailwind 3.4 ve özel tasarım sistemi |
| Veritabanı | PostgreSQL Neon üzerinde Prisma 6 ile |
| Kimlik | NextAuth v5 ve Google OAuth |
| Hız limiti ve oturum durumu | Upstash Redis ile @upstash/ratelimit |
| Yapay zeka | Google Gemini 2.5 Flash |
| Grafikler | Recharts 2.15 |
| İzleme | Sentry ve Vercel Analytics |
| Barındırma | Vercel Frankfurt bölgesi |
| Şifreleme | Düğüm üzerinde AES 256 GCM |

## Klasör Düzeni

```
app/
  ai-coach          AI Koç ekranı ve What If paneli
  connect           Anahtar bağlama ve tarama formu
  dashboard         Özet panel
  insights          Notlar ve Trading DNA radarı
  trades            Ham işlem listesi
  traders           Anonim trader ağı
  api/
    ai-coach        Koç sohbet ve what if uçları
    binance         Doğrulama, senkron başlatma, yoklama
    analytics       Oturum analitik okuma
    insights        Trader profili üretme
    traders         Anonim profil yazma ve eşleştirme

components/
  ai-coach          CoachChat ve PDF ilerleme bileşeni
  charts            Recharts sarmalayıcıları
  insights          TraderProfileCard ve TradingDnaRadar
  layout            Sayfa başlığı, navigasyon, sahne efektleri
  ui                Buton, Badge, Card temel parçalar

lib/
  ai                GeminiService, CoachToolService, PDF rapor hattı
  analytics         AnalyticsService, InsightGenerator, BehaviorPatternDetector
  binance           BinanceService ve TradeNormalizer
  db                sessionStore, sessionResolver, Prisma istemcisi
  jobs              binanceSyncJobs anket tabanlı senkronizasyon hattı
  rag               AICoachService, VectorStoreService, ChunkBuilder
  security          AES şifreleme, hız limiti, log redaksiyonu
  traders           AnonymousTraderRegistry
  i18n              Türkçe ve İngilizce sözlükler

rag-materials       İşlem psikolojisi PDF kaynakları
docs/superpowers    Tasarım kararları ve uygulama planları
prisma              Şema ve migrasyon
```

## Yerel Kurulum

```bash
npm install
cp .env.example .env
# .env içine DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID,
# AUTH_GOOGLE_SECRET, GEMINI_API_KEY, APP_ENCRYPTION_KEY,
# UPSTASH_REDIS_REST_URL ve UPSTASH_REDIS_REST_TOKEN değerlerini girin.
npm run db:push
npm run dev
```

Tarayıcıdan `http://localhost:3000` adresini açın. Demo veri butonu salt okunur anahtara sahip olmayan ziyaretçiler için sentetik veri yükler.

## Yayın

Proje Vercel üzerinde Neon Postgres, Upstash Redis ve Sentry ile birlikte çalışır.

1. Neon üzerinde proje açılır, hem havuz hem doğrudan bağlantı adresleri kopyalanır. Şema yayını için `DATABASE_URL` doğrudan bağlantıya geçici olarak ayarlanıp `npx prisma db push` koşulur.
2. Google Cloud Console üzerinden OAuth istemcisi oluşturulur, yetkili dönüş adresleri lokal ve canlı alan adı için eklenir.
3. Upstash üzerinde Redis veritabanı açılır, REST adresi ve token kopyalanır.
4. Sentry üzerinde Next.js projesi açılır, DSN değeri alınır.
5. Vercel üzerinden depo içe aktarılır. Tüm çevre değişkenleri panel üzerinden tanımlanır.
6. Vercel proje ayarlarında fonksiyon bölgesi Frankfurt olarak seçilir. Repo içindeki `vercel.json` zaten bunu zorunlu kılar.
7. Yeni dağıtım üzerinden Binance bağlantısı denenir.

## Çevre Değişkenleri

| Değişken | Amaç |
| --- | --- |
| DATABASE_URL | Neon havuz bağlantı adresi |
| DIRECT_URL | Migrasyon için Neon doğrudan bağlantı adresi |
| AUTH_SECRET | NextAuth oturum imzası |
| AUTH_GOOGLE_ID | Google OAuth istemci kimliği |
| AUTH_GOOGLE_SECRET | Google OAuth gizli anahtarı |
| GEMINI_API_KEY | Gemini API anahtarı |
| GEMINI_MODEL | Varsayılan model adı, boş bırakılırsa `gemini-2.5-flash` |
| APP_ENCRYPTION_KEY | AES 256 GCM için base64 kodlu 32 bayt anahtar |
| UPSTASH_REDIS_REST_URL | Upstash Redis REST adresi |
| UPSTASH_REDIS_REST_TOKEN | Upstash Redis REST token |
| SENTRY_DSN | Sunucu tarafı izleme DSN |
| NEXT_PUBLIC_SENTRY_DSN | İstemci tarafı izleme DSN |
| BINANCE_ADVANCE_BATCH | Her yoklamada işlenecek sembol sayısı, varsayılan 12 |
| BINANCE_MAX_PAGES_PER_SYMBOL | Sembol başına maksimum sayfa, varsayılan 5 |

## Komutlar

```bash
npm run dev          # yerel geliştirme sunucusu
npm run build        # production yapım
npm run start        # production sunucusu
npm run typecheck    # TypeScript denetimi
npm run db:push      # şema yayını
npm run db:migrate   # migrasyon uygulama
```

## Tarama Modları ve Beklenen Süreler

| Mod | Sembol Sayısı | Tipik Süre |
| --- | --- | --- |
| Hızlı seçili | 9 öncelikli çift | beş ila on saniye |
| Geniş quote | 30 ile 80 çift | yarım ila bir dakika |
| Tam piyasa | 2700 üzeri çift | sekiz ile on iki dakika |

Tarama sırasında arayüz canlı olarak hangi sembolde olduğunu, kaç sembolün tarandığını ve şu ana kadar bulunan işlem sayısını gösterir.

## Yol Haritası

Bu sürümde yer almayan ancak mimari olarak hazır olan başlıklar şu şekildedir.

* Telegram bildirim botu üzerinden günlük drawdown alarmı.
* Resend ile haftalık özet e postası.
* Vercel cron işi ile arka planda profil yenileme.
* TradingView grafik ekran görüntülerini yorumlayan Gemini Vision katmanı.
* Türkiye kripto vergi raporu PDF çıktısı.

## Lisans ve Sorumluluk

Bu proje yarışma için sıfırdan geliştirilmiştir. Üretilen analiz davranışsal yorumdur, finansal tavsiye değildir. Kullanıcı kendi kararlarından sorumludur. Binance markaları ilgili sahiplerine aittir, bu proje Binance ile resmi bir bağa sahip değildir.
