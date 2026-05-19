# 2BMTRADE

**Canlı Site** [hackathon.mertgungor.me](https://hackathon.mertgungor.me)

Binance üzerinde gerçekten nasıl işlem yaptığını sade ve kanıta dayalı şekilde gösteren, yapay zeka destekli işlem analitik panelidir. Read only API bağlantısı ister, hiçbir zaman emir göndermez, çekim yapmaz, hesap ayarlarına dokunmaz.

Tarayıcıdan doğrudan açıp deneyebilirsin. Kendi Binance hesabını bağlamak istemiyorsan sayfanın altındaki Demo veri butonu sentetik bir oturumla tüm ekranları açar.

## Çözdüğü Problem

Bireysel kripto işlemcileri Binance üzerinde haftada onlarca işlem açıyor, sonra dönüp bakınca neyi neden yaptığını hatırlamıyor. Borsanın kendi paneli işlem listesi gösterir ama davranışsal yorumlama yapmaz. Açık olmayan örüntüler para kaybettirir, geç saatte alınan kararlar yarın gözden geçirilemez, fazla işlem komisyon olarak akar gider.

2BMTRADE bu boşluğu kapatıyor. Read only API anahtarını alır, Spot ile Futures geçmişini tarar, ham veriyi analitik öze indirir, davranışsal kalıpları çıkarır, kanıt göstererek konuşan bir koç sunar. Yatırım tavsiyesi vermez. Almalı satmalı tut gibi yönlendirmeler yapmaz. Sadece kullanıcının kendi davranışı hakkında somut sayılarla geri bildirim üretir.

## Öne Çıkan Yetenekler

* Spot, USD-M Futures ve COIN-M Futures geçmişlerinin tek seferde okunması.
* Üç farklı tarama modu; hızlı seçili, geniş quote, tam piyasa.
* Polling tabanlı artırımlı senkronizasyon. Tam piyasa taraması bile Vercel Hobby plan sınırlarına takılmadan tamamlanır.
* Gerçek tool çağıran Gemini agent. Coach, sorulara cevap üretirken arka uçtaki dört tool'u tetikler ve sonuçlarını kanıtlı şekilde aktarır.
* Behavior pattern detector. Revenge trading, overtrading, FOMO, averaging down için skor ve kanıt üretir.
* Trading DNA radarı. Altı eksenli görsel parmak izi, kullanıcının davranış imzasını tek bakışta gösterir.
* What If simülatörü. En kötü beş işlem yapılmasaydı PnL nasıl değişirdi sorusunu anlık olarak hesaplar.
* Anonim trader ağı. Kullanıcı kendine benzeyen veya tamamlayan profilleri sadece oranlar üzerinden eşleştirebilir, ham veri paylaşımı yoktur.
* Kanıt sergileyen RAG. Yanıtların altında hangi parçanın hangi belgeden geldiği görünür, doğrulanabilirlik korunur.
* Doğrulayıcı içeren PDF rapor hattı. Üretilen taslak otomatik denetimden geçer, kanıt sayısı eksikse uyarı ile dönmez.
* Türkçe ve İngilizce arayüz. Tüm metinler iki dilde uyumlu sözlükten gelir.

## Güvenlik Modeli

* Anahtarın doğrudan tarayıcıdan sunucuya gelir, log dosyalarına asla yazılmaz.
* Sunucu, anahtarın read only olduğunu doğrulamadan tarama başlatmaz. İşlem veya çekim yetkisi tespit edilirse istek reddedilir.
* Anahtar geçici bir oturum süresince Upstash Redis üzerinde AES 256 GCM ile şifrelenmiş halde saklanır, oturum biter bitmez silinir.
* Veritabanı bağlantısı şifreli kanal üzerinden çalışır.
* Production üzerinde HSTS, X Frame Options ve diğer başlıklar uygulanır.
* Tüm yazma uç noktaları kullanıcı oturumuna bağlı olarak çalışır, kimliksiz çağrı yapılamaz.
* Her uç nokta için ayrı kova üzerinden rate limit uygulanır. Upstash yoksa bellek içi yedek devreye girer.
* Anonim trader ağı sadece oran ve etiketleri saklar. Ham işlem, anahtar, kimlik bilgisi, zaman damgası veya bakiye verisi bu katmana asla geçmez.

## Yapay Zeka Katmanı

### Coach Agent

Gemini 2.5 Flash modeli iki ayrı yolla çalıştırılır. Birinci yol klasik anlatım üretir. İkinci yol tool calling agent yoludur ve şu dört aracı kullanır.

* `get_my_worst_trades` belirli bir periyot içinde en kötü PnL üreten işlemleri döner.
* `simulate_what_if` verilen işlem kimlikleri yapılmasaydı PnL nasıl olurdu hesabını çıkarır.
* `detect_behavior_patterns` dört davranışsal örüntü için skor, güven seviyesi ve kanıt döner.
* `risk_budget_today` o günkü davranışsal risk seviyesini hijyen önerileri ile birlikte sunar.

Model bir tool çağırdığında arka uç deterministik şekilde sonucu üretir, model bu çıktıya sözlü cevabı dayandırır. Tüm çağrılar arayüzde tool trace bloğu olarak görünür. Kullanıcı koçun hangi tool'a hangi parametreyle gittiğini ve özet çıktıyı görebilir.

Eğer Gemini yapılandırılmamışsa veya tool yolu hata verirse mevcut sub agent boru hattı devreye girer ve kullanıcı yine kanıtlı bir cevap alır. Hiçbir koşulda kullanıcı yanıtsız kalmaz.

### RAG Boru Hattı

Coach, kullanıcının kendi oturum verisinden çıkarılan parçaları ve `rag-materials` klasöründeki işlem psikolojisi kitaplarından çıkartılan parçaları aynı vektör indeksinde tutar. İlgili sorgu çağırıldığında ilk sekiz parça çekilir, bunlardan beşi kullanıcı arayüzünde kanıt kartı olarak gösterilir. Her kartın altında parçanın geldiği kaynak ve özet görünür.

### Trader Profili

Insights sayfası açıldığında Gemini bir kerelik trader profili üretir. Çıktı şu yapıdadır. Trader tipi, güven seviyesi, kanıt listesi, güçlü yönler, izlenmesi gereken riskler, davranışsal etiketler, öz değerlendirme soruları. Profil tarayıcı oturumunda önbelleğe alınır.

## Davranışsal Analiz

`lib/analytics/BehaviorPatternDetector` saf bir TypeScript modülüdür ve dört örüntü için skor üretir.

* Revenge trading. Zarar sonrası altmış dakika içinde gelen takip işlemlerinin oranı ile hızlı işlem oranını birleştirir.
* Overtrading. Aktif gün başına ortalama işlem sayısı ile hızlı işlem oranını birleştirir.
* FOMO. Aynı sembolde on beş dakika içinde ardışık ve büyüyen alım dizilerini sayar. Fiyat verisi olmadığı için güven seviyesi orta ile sınırlandırılır.
* Averaging down. Aynı sembolde yirmi dört saatlik pencerede ardışık alım dizilerinin en uzununu ölçer.

Bu skorlar üç farklı katmanda kullanılır.

* Insights sayfasında 6 eksenli Trading DNA radarında görünür.
* AI Coach tool katmanında pattern detector olarak sunulur.
* Insight üretici, en yüksek skorlu örüntüleri kural tabanlı içgörüler ile birleştirir, çift kayıt oluşmaz.

## What If Simülatörü

Kullanıcı AI Coach ekranında atılacak işlemleri seçer ve baseline PnL değerinin nasıl değiştiğini görür. Hesap, baseline değerinden seçilen işlemlerin PnL toplamı çıkarılarak yapılır. Kullanıcı hızlı kararlarının uzun vadeli etkisini somut bir sayıya bağlı olarak deneyimler.

API ucu `app/api/ai-coach/what-if` adresinden çalışır. Gövde boşsa varsayılan olarak en kötü beş işlem üzerinden simülasyon koşar.

## Mimari ve Veri Akışı

### Veri Akışı

1. Kullanıcı `/connect` üzerinde read only anahtarını ve tarama tercihlerini gönderir.
2. Arka uç POST isteği içinde anahtarın read only olduğunu doğrular.
3. Seçili piyasalar üzerinden sembol keşfi yapar ve her sembolü Upstash Redis kuyruğuna ekler.
4. Anahtar AES 256 GCM ile şifrelenir, kuyruk meta verisi ile birlikte saklanır.
5. Arayüz yarım saniyenin biraz altında bir aralıkla polling endpoint'ini yoklar.
6. Her poll on iki sembollik bir batch'i eşzamanlı şekilde Binance üzerinden çeker, normalleştirir, Redis tampon listesine yazar.
7. Kuyruk boşaldığında tampon `TradingSession` nesnesine boşaltılır, analitik hesaplanır, RAG parçaları üretilir, oturum hem bellek hem Redis üzerinde saklanır.
8. Kullanıcı `/dashboard` adresine yönlendirilir. Bu uç farklı bir Vercel instance'ına düşse bile oturum Redis üzerinden çekilir.

### Mimari Tercihler

Vercel Hobby planı tek bir region'a kilitlidir. Varsayılan region Washington DC olduğu için Binance kısıtlama listesine takılır. Tüm fonksiyonlar `vercel.json` üzerinden Frankfurt region'ına sabitlenir. Function timeout altmış saniyedir, bu yüzden tarama tek bir uzun istek yerine polling tabanlı incremental sync deseniyle çalışır. Session state Vercel instance'ları arasında paylaşılmadığı için her oturum Redis üzerinde de tutulur. Bu üç karar birlikte sistemi ayakta tutar.

### Teknoloji Yığını

| Katman | Tercih |
| --- | --- |
| Framework | Next.js 15 App Router ve React 19 |
| Dil | TypeScript 5.8 |
| Stil | Tailwind 3.4 ve özel tasarım sistemi |
| Database | PostgreSQL Neon üzerinde Prisma 6 ile |
| Auth | NextAuth v5 ve Google OAuth |
| Rate limit ve session state | Upstash Redis ile @upstash/ratelimit |
| Yapay zeka | Google Gemini 2.5 Flash |
| Grafikler | Recharts 2.15 |
| İzleme | Sentry ve Vercel Analytics |
| Hosting | Vercel Frankfurt region |
| Şifreleme | Node üzerinde AES 256 GCM |

## Klasör Düzeni

```
app/
  ai-coach          AI Coach ekranı ve What If paneli
  connect           Anahtar bağlama ve tarama formu
  dashboard         Özet panel
  insights          Notlar ve Trading DNA radarı
  trades            Ham işlem listesi
  traders           Anonim trader ağı
  api/
    ai-coach        Coach chat ve what if uçları
    binance         Doğrulama, sync başlatma, polling
    analytics       Session analitik okuma
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
  db                sessionStore, sessionResolver, Prisma client
  jobs              binanceSyncJobs polling tabanlı sync hattı
  rag               AICoachService, VectorStoreService, ChunkBuilder
  security          AES şifreleme, rate limit, log redaksiyonu
  traders           AnonymousTraderRegistry
  i18n              Türkçe ve İngilizce sözlükler

rag-materials       İşlem psikolojisi PDF kaynakları
docs/superpowers    Tasarım kararları ve uygulama planları
prisma              Şema ve migration
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

Tarayıcıdan `http://localhost:3000` adresini açın. Demo veri butonu read only anahtara sahip olmayan ziyaretçiler için sentetik veri yükler.

## Yayın

Proje Vercel üzerinde Neon Postgres, Upstash Redis ve Sentry ile birlikte çalışır.

1. Neon üzerinde proje açılır, hem pooled hem direct bağlantı adresleri kopyalanır. Şema yayını için `DATABASE_URL` direct bağlantıya geçici olarak ayarlanıp `npx prisma db push` koşulur.
2. Google Cloud Console üzerinden OAuth client oluşturulur, yetkili dönüş adresleri lokal ve canlı domain için eklenir.
3. Upstash üzerinde Redis database açılır, REST adresi ve token kopyalanır.
4. Sentry üzerinde Next.js projesi açılır, DSN değeri alınır.
5. Vercel üzerinden repo içe aktarılır. Tüm çevre değişkenleri panel üzerinden tanımlanır.
6. Vercel proje ayarlarında function region Frankfurt olarak seçilir. Repo içindeki `vercel.json` zaten bunu zorunlu kılar.
7. Yeni deploy üzerinden Binance bağlantısı denenir.

## Çevre Değişkenleri

| Değişken | Amaç |
| --- | --- |
| DATABASE_URL | Neon pooled bağlantı adresi |
| DIRECT_URL | Migration için Neon direct bağlantı adresi |
| AUTH_SECRET | NextAuth session imzası |
| AUTH_GOOGLE_ID | Google OAuth client kimliği |
| AUTH_GOOGLE_SECRET | Google OAuth gizli anahtarı |
| GEMINI_API_KEY | Gemini API anahtarı |
| GEMINI_MODEL | Varsayılan model adı, boş bırakılırsa `gemini-2.5-flash` |
| APP_ENCRYPTION_KEY | AES 256 GCM için base64 kodlu 32 bayt anahtar |
| UPSTASH_REDIS_REST_URL | Upstash Redis REST adresi |
| UPSTASH_REDIS_REST_TOKEN | Upstash Redis REST token |
| SENTRY_DSN | Sunucu tarafı izleme DSN |
| NEXT_PUBLIC_SENTRY_DSN | İstemci tarafı izleme DSN |
| BINANCE_ADVANCE_BATCH | Her poll'da işlenecek sembol sayısı, varsayılan 12 |
| BINANCE_MAX_PAGES_PER_SYMBOL | Sembol başına maksimum sayfa, varsayılan 5 |

## Komutlar

```bash
npm run dev          # yerel geliştirme sunucusu
npm run build        # production build
npm run start        # production sunucusu
npm run typecheck    # TypeScript denetimi
npm run db:push      # şema yayını
npm run db:migrate   # migration uygulama
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
* Resend ile haftalık özet email.
* Vercel cron job ile arka planda profil yenileme.
* TradingView grafik ekran görüntülerini yorumlayan Gemini Vision katmanı.
* Türkiye kripto vergi raporu PDF çıktısı.

## Lisans ve Sorumluluk

Bu proje sıfırdan geliştirilmiştir. Üretilen analiz davranışsal yorumdur, finansal tavsiye değildir. Kullanıcı kendi kararlarından sorumludur. Binance markaları ilgili sahiplerine aittir, bu proje Binance ile resmi bir bağa sahip değildir.
