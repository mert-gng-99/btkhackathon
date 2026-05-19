# 2BMTRADE Sunum Konuşması

Toplam süre yaklaşık yedi dakika. Her bölümün üstünde kabaca kaç saniye sürmesi gerektiği yazılı. Ekranda hangi sayfanın açık olması gerektiği parantez içinde belirtildi.

## 1. Giriş ve problem (45 saniye)

Ekran açıkken canlı siteden anasayfa görünür.

Merhaba, ben 2BMTRADE'in geliştiricisiyim. Sizinle önce bir gözlemden başlamak istiyorum. Bireysel kripto işlemcileri Binance üzerinde haftada otuz, kırk, bazen yüzlerce işlem açıyor. Sonra dönüp aylık özetlerine baktıklarında neyi neden yaptıklarını hatırlamıyorlar. Niye o gece yarısı pozisyon açtım. Zarar ettikten sonra hemen üstüne bir tane daha mı girdim. Hep aynı sembolde mi sıkışıyorum. Borsanın kendi paneli bu soruların hiçbirine cevap vermez, sadece işlem listesini gösterir. Trader kendi davranışını okuyabilecek bir araca sahip değil. Tam burası 2BMTRADE'in çıkış noktası.

## 2. Çözümün tek cümlelik özeti (20 saniye)

2BMTRADE, kullanıcının read only Binance anahtarını alır, Spot ve Futures geçmişini tarar, davranışsal kalıpları çıkarır ve kanıt göstererek konuşan bir AI coach sunar. Yatırım tavsiyesi vermez. Almalı satmalı tut demez. Sadece kullanıcının kendi geçmişine bakar ve gördüğünü somut sayılarla aktarır.

## 3. Güvenlik ve bağlanma (45 saniye)

Connect sayfasına geç.

Bağlanma ekranında dikkat etmenizi istediğim ilk şey güvenlik. Burada read only bir API anahtarı istiyoruz. Eğer kullanıcı yanlışlıkla işlem yetkisi olan bir anahtar verirse sunucu taramayı başlatmadan reddediyor. Anahtar sadece tarayıcıdan sunucuya gelir, asla log dosyalarına yazılmaz. Tarama süresi boyunca Upstash Redis üzerinde AES 256 GCM ile şifrelenmiş olarak duruyor. Tarama biter bitmez bu kayıt siliniyor. Hiçbir endpoint hesaba emir göndermez, çekim yapmaz, transfer açamaz. Çünkü o kod yazılmadı.

Üç farklı tarama modu var. Hızlı seçili sadece dokuz öncelikli sembolü tarar. Geniş quote aktif vadeli çiftleri ve seçili quote varlıklarını kapsar. Tam piyasa modu Binance'in tüm aktif sembollerini tarar. Bu sayede hem hızlı demo isteyen kullanıcıya hem de tüm geçmişini görmek isteyen profesyonele aynı ürün cevap veriyor.

## 4. Tarama ve sync mimarisi (60 saniye)

Tarama başladıkça canlı bar yükselir, ekranda "Scanning Spot BTCUSDT 142/2715" gibi metin görünür.

Burada arka planda kritik bir mühendislik kararı var. Vercel Hobby planında bir serverless function en fazla altmış saniye çalışabiliyor. Bu yüzden yüz beş tarama tek bir uzun isteğe sığmaz. Biz polling driven incremental sync deseni kullanıyoruz. POST isteği sadece sembol keşfini yapıyor, her sembolü Upstash Redis kuyruğuna atıyor ve dönüyor. Arayüz altı yüz milisaniyede bir polling endpoint'ini yokluyor. Her yoklamada arka uç on iki sembolü Binance'ten eşzamanlı çekiyor, normalize ediyor, Redis tampon listesine yazıyor. Bu sayede tam piyasa taraması bile çalışıyor, kullanıcı canlı olarak ilerlemeyi görüyor.

Bir ek not. Binance'in IP kısıtlama listesi sebebiyle Vercel'in varsayılan Washington DC region'ı çalışmıyor. Tüm fonksiyonlarımız vercel.json üzerinden Frankfurt region'ına sabitlenmiş. Session state ise Vercel instance'ları arasında paylaşılmadığı için her session Redis üzerinde de tutuluyor. Bu üç karar birlikte sistemi ayakta tutuyor.

## 5. Dashboard ve insights (50 saniye)

Dashboard sayfasına geç, sonra Insights'a.

Tarama bittiğinde kullanıcı önce klasik özete bakıyor. Toplam işlem, aktif gün, hacim, ücret yükü, sembol yoğunluğu, gün bazlı aktivite haritası, saat bazlı performans. Bu kısım hâlâ önemli ama tek başına yeterli değil. Asıl yenilik Insights sayfasında.

Burada Gemini tarafından üretilen bir trader profili görüyorsunuz. Tip, güven seviyesi, davranış etiketleri, izlenmesi gereken riskler. Hemen altında Trading DNA radarı var. Altı eksenli bu radar kullanıcının davranış parmak izini tek bakışta gösteriyor. Revenge trading, overtrading, FOMO, averaging down, timing riski ve fee drag. Bu eksenlerin değerleri hardcoded değil, kullanıcının kendi verisinden hesaplanıyor.

## 6. AI Coach ve tool calling (90 saniye)

AI Coach sayfasına geç. "Neden zarar ettim" sorusunu yaz ve gönder. Cevap geldiğinde tool trace bloğunu göster.

Şimdi sunumun en kritik yerine geliyoruz. Burada hackathon kurallarındaki AI ve agent kullanımı şartını klasik chatbot'tan ayıran bir uygulama görüyorsunuz. Coach sıradan bir Gemini chat değil. Model gerçek araçlar çağırıyor.

Arka uçta dört tool var. `get_my_worst_trades` belirli bir periyot içindeki en kötü PnL üreten işlemleri döner. `simulate_what_if` verilen işlemler yapılmasaydı PnL'in nasıl olacağını hesaplar. `detect_behavior_patterns` davranışsal örüntü dedektörünü tetikler. `risk_budget_today` o günkü davranışsal risk seviyesini hijyen önerileriyle birlikte sunar.

Şu an ekranda gördüğünüz cevabın altında tool trace bloğu var. Kullanıcı hangi tool'un hangi parametreyle çağrıldığını ve özet çıktıyı görebiliyor. Yani koç "şöyle dedim çünkü" demekle kalmıyor, hangi veriye baktığını da gösteriyor. Bunun yanında sub agent fallback path duruyor. Gemini rate limit'e takılırsa veya tool yolu hata verirse mevcut sub agent boru hattı verimli ve kanıtlı bir cevap üretiyor. Hiçbir koşulda jüriye "Gemini'ye ulaşamadık" demiyoruz.

Bir de şu var. Bu sistem hiçbir yerde al sat tut tavsiyesi vermiyor. System prompt seviyesinde yasaklı. Çünkü ürünün konumu finansal danışman değil, davranışsal koç.

## 7. What If simülatörü (40 saniye)

What If butonuna bas. Sonuçları göster.

AI Coach ekranında What If simülatörü diye küçük bir panel var. Tek tıklamayla "en kötü beş işlemim yapılmasaydı PnL'im nasıl olurdu" sorusunu cevaplıyor. Şu an gördüğünüz örnekte simulated PnL ile baseline arasında pozitif bir fark var. Bu sayı kullanıcı için bir gerçek ısırığı. Çünkü o beş işlemin neredeyse hepsi geç saat veya bir zararın hemen ardından gelen impulsive girişlerdi. Yani sayıyı görmek davranışı değiştirmek için ilk adım.

## 8. Modülerlik ve genişletilebilirlik (45 saniye)

README açıkken modülerlik bölümüne kaydır.

Bu proje hackathon için yazıldı ama bir defalık demo olarak yazılmadı. Her ana katman ya tek bir dosyaya ya da küçük bir klasöre toplandı. Yeni dil eklemek bir sözlük dosyası kopyalamak. Yeni davranışsal pattern eklemek detector'a bir static method eklemek. Yeni Gemini tool eklemek üç satır. Yeni RAG kaynağı sadece bir PDF dosyası bırakmak. Yeni borsa eklemek ise mevcut BinanceService arayüzünü uygulayan ikinci bir servis yazmak. Yani 2BMTRADE bir kapalı uygulama değil, açık bir platform.

## 9. Teknik özet ve kapanış (45 saniye)

Next.js 15, React 19, TypeScript 5.8, Prisma 6 ile Postgres, NextAuth ile Google OAuth, Upstash Redis ile rate limit ve session state, Sentry ile izleme, Vercel Frankfurt region'da yayında. Gemini 2.5 Flash tool calling ile çalışıyor. Tüm sistem hackathon.mertgungor.me adresinden şu an canlı.

Toparlayalım. 2BMTRADE bir read only Binance anahtarını alıp kullanıcının kendi davranışını ona göstermeyi başarıyor. Bir tool calling agent sayesinde Gemini sadece konuşmuyor, gerçek araçlar çağırıyor. Trading DNA radarı, What If simülatörü ve davranışsal pattern detector sayesinde kullanıcı kendi imzasını tek ekranda görüyor. Polling driven incremental sync sayesinde 2700 sembollük tam piyasa taraması Vercel Hobby planında bile sorunsuz çalışıyor. Ve tüm bunlar yatırım tavsiyesi vermeden, sadece kullanıcının kendi verisine bakarak yapılıyor.

Beni dinlediğiniz için teşekkür ederim. Sorularınızı almaktan mutluluk duyarım.

## Konuşmacı için kısa notlar

* Sahnedeki ekran her zaman canlı site `hackathon.mertgungor.me` olsun. Slayt değil ekran demosu.
* Tarama başlatırken Hızlı seçili modu seç. Demo süresinde 5 ila 10 saniye içinde biter.
* AI Coach kısmında "neden zarar ettim" yazısını tek seferde gönder, jürinin tool trace bloğunu rahat okuyabilmesi için sayfayı aşağı kaydır.
* What If butonunu mutlaka iki saniye boş bırak, jüri sayıları okusun.
* Süre az kalırsa modülerlik bölümünü atla, doğrudan teknik özete geç.
* Sorulara yedek cevaplar
  * Niye yatırım tavsiyesi vermiyoruz. Çünkü ürün davranışsal koç, finansal danışman değil ve regülasyon dışı kalmak ürünü yayında tutar.
  * Neden Frankfurt. Çünkü Binance Washington DC IP bloklarını reddediyor, Vercel Hobby planı tek region olduğu için ürün için en kararlı bölge Frankfurt.
  * Neden polling driven. Çünkü Vercel Hobby fonksiyonları altmış saniyede biter ve background promise döndüğünde Vercel onu öldürür. Polling sayesinde sistem sınırsız sürede çalışabiliyor.
