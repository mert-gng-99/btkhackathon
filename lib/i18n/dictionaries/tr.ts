import type { Dictionary } from "./en";

export const tr: Dictionary = {
  common: {
    appName: "2BMTRADE",
    version: "v0.4",
    openApp: "Başlat",
    home: "Anasayfa",
    backToHome: "Anasayfaya dön",
    loading: "Yükleniyor...",
    retry: "Tekrar dene",
    showMore: "Daha fazla göster",
    showLess: "Daha az göster",
    yes: "Evet",
    no: "Hayır",
    ok: "Tamam",
    cancel: "İptal",
    close: "Kapat",
    save: "Kaydet",
    edit: "Düzenle",
    refresh: "Yenile",
    cached: "Önbellekten",
    generated: "Oluşturuldu"
  },
  language: {
    toggleLabel: "Dil",
    english: "English",
    turkish: "Türkçe",
    short: { en: "EN", tr: "TR" }
  },
  theme: {
    toggleLabel: "Tema",
    cinematic: "Sinematik",
    sand: "Kum",
    short: { cinematic: "SİN", sand: "KUM" }
  },
  nav: {
    connect: "Bağlan",
    dashboard: "Panel",
    trades: "İşlemler",
    insights: "Notlar",
    aiCoach: "AI Koç",
    traders: "Trader'lar",
    tagline: "Spot ve Vadeli"
  },
  home: {
    nav: {
      overview: "Genel",
      security: "Güvenlik",
      analytics: "Grafikler",
      coach: "AI Koç",
      sync: "Senkron"
    },
    hero: {
      eyebrow: "Sadece okuma · İşlem yok",
      title: ["Gerçekte nasıl", "işlem yaptığını gör."],
      sub: "Sadece okuma yetkili bir Binance anahtarı bağla. 2BMTRADE senin Spot ve Vadeli geçmişini net grafiklere ve akıllı bir AI koça çevirir.",
      ctaPrimary: "İşlemlerimi analiz et",
      ctaSecondary: "60 saniyelik turu izle",
      trust: {
        noWithdrawals: "Para çekme yok",
        noTrading: "İşlem yok",
        secretsDiscarded: "Anahtar saklanmaz",
        openSource: "Açık kaynak dostu"
      },
      scroll: "KAYDIR"
    },
    intro: {
      whatItIs: "NE BU",
      whatItIsBody: "Güvenli bir Binance işlem görüntüleyici. Sadece okuma anahtarını verirsin, 2BMTRADE nasıl işlem yaptığını gösterir.",
      markets: "PİYASALAR",
      marketsBody: "Spot · USD-M · COIN-M",
      stack: "TEKNOLOJİ",
      stackBody: "Next.js · Prisma · Gemini",
      status: "DURUM",
      statusBody: "v0.4 · genel önizleme"
    },
    security: {
      eyebrow: "GÜVENLİK",
      title: ["Anahtarın", "sende kalır."],
      sub: "Her anahtarı önce kontrol ederiz. İşlem veya para çekme yetkisi olan anahtar hemen reddedilir. Sessiz hata olmaz.",
      bullets: [
        {
          title: "Kullanımdan önce kontrol",
          desc: "Anahtarın işlem veya para çekme yetkisi varsa, istek hiç çıkmaz."
        },
        {
          title: "Sadece kısa oturum",
          desc: "Anahtar şifreli ve süreli bir oturumda yaşar. Kaydedilmez, loglanmaz."
        },
        {
          title: "Net denetim izi",
          desc: "Her Binance çağrısı imzalı, limitli ve izlenebilir. Anahtarlar loglarda gizlidir."
        }
      ],
      keyCard: {
        apiKey: "API Anahtarı",
        accountScope: "Hesap yetkisi",
        scopeValue: "Spot + Vadeli (okuma)",
        enableTrading: "İşlem yetkisi",
        denied: "REDDEDİLDİ",
        enableWithdrawals: "Çekim yetkisi",
        enableReading: "Okuma yetkisi",
        ok: "TAMAM",
        accepted: "SADECE OKUMA ANAHTARI KABUL EDİLDİ",
        loopName: "yetki-kontrol.loop"
      }
    },
    analytics: {
      eyebrow: "İŞLEM ALIŞKANLIĞI",
      title: ["Sadece kâr/zarar değil,", "nasıl işlem yaptığın da."],
      sub: "Hacim, ücret, hızlı işlemler, en çok kullandığın semboller, al/sat oranı ve Spot PnL — hepsi senin geçmişinden.",
      callouts: {
        concentration: "Top semboller",
        spotPnl: "Spot PnL (tahmini)",
        rapidTrades: "Hızlı işlemler"
      },
      dash: {
        volume: "Hacim (30g)",
        volumeUnit: "K USDT",
        fees: "Ücretler",
        feesUnit: "USDT",
        rapidTrades: "Hızlı işlemler",
        volumeChart: "Günlük hacim",
        volumeChartSub: "son 14g · USDT",
        peak: "tepe",
        symbolConcentration: "Top semboller",
        dominance: "BTC / ETH payı",
        loopName: "panel.loop",
        spotPnlValue: "Spot PnL (tahmini) · +1,284 USDT"
      },
      kpiDeltas: {
        volume: "▲ %12.6",
        feesStable: "— sabit",
        rapidClusters: "▲ 9 grup"
      }
    },
    coach: {
      eyebrow: "AI KOÇ",
      title: ["Kaynağını gösteren", "bir AI koç."],
      sub: "Her cevap senin işlemlerinden gelir. Tahmin yok. Her notun, geldiği işleme bağlı bir linki var.",
      subNote: "Uydurma geçmiş yok. Yatırım tavsiyesi yok. Kaynaksız iddia yok.",
      bullets: [
        {
          title: "Sadece senin verini okur",
          desc: "Her cevap senin işlem geçmişini kullanır — BTCUSDT, ETHUSDT, vadeli ve ücretler."
        },
        {
          title: "Kaynaklar gösterilir",
          desc: "Bir kaynağa dokun, işlemi aç. Kaynak yoksa koç söyler."
        }
      ],
      footnote: "Gemini + yerel RAG ile çalışır.",
      phone: {
        name: "Koç",
        status: "kaynaklı · gemini",
        online: "● çevrimiçi",
        msg1: "Ekim'de BTCUSDT ücretlerim neden arttı?",
        msg2Pre: "Ekim'de BTCUSDT taker hacmin ",
        msg2Mid: " — yaklaşık ",
        msg2Mid2: " kat Eylül. Taker ücreti ",
        msg2End: " iken, sadece bu ",
        msg2End2: " ücret ekledi.",
        msg3: "CPI etrafında çok mu işlem yaptım?",
        cite1: "işlem #482",
        cite2: "BTCUSDT · Eki",
        cite3: "ücret kademe #2",
        loopName: "koc.loop",
        loopSub: "Gemini + yerel RAG ile çalışır"
      }
    },
    sync: {
      eyebrow: "TAM TARAMA, CANLI",
      title: ["Tüm aktif sembolleri", "tarar — ekranı", "kilitlemeden."],
      sub: "Arka plan işçileri Spot, USD-M Vadeli ve COIN-M Vadeli'yi tarar. Quote varlığa göre filtreleyebilir veya hızlı tarama yapabilirsin.",
      tags: ["Spot", "USD-M Vadeli", "COIN-M Vadeli", "USDT", "BTC", "BNB", "TRY"],
      ui: {
        jobId: "SENKRON İŞİ · #2841",
        progress: "İlerleme",
        symbolsScanned: "Taranan semboller",
        currentSymbol: "Şu anki sembol",
        tradesFound: "Bulunan işlem",
        markets: "Piyasalar",
        marketsValue: "Spot · USD-M · COIN-M",
        activeStream: "Aktif akış",
        loopName: "senkron.loop",
        timeLeft: "kalan süre · 02:14"
      }
    },
    footer: {
      eyebrow: "İLE YAPILDI",
      title: ["Küçük ve basit bir teknoloji yığını,", "güçlü garantiler için."],
      stack: ["Next.js 14", "TypeScript", "Tailwind CSS", "Prisma", "PostgreSQL", "Gemini"],
      reassureCards: [
        {
          title: "Loglarda anahtar yok",
          body: "Anahtarlar ve imzalı veri log yazılmadan önce silinir. Şeklini tutarız, sırrını değil."
        },
        {
          title: "Anonim trader kaydı",
          body: "Her trader rastgele bir ID alır. İsmin analiz katmanına geçmez."
        },
        {
          title: "Açık mimari",
          body: "Doğrulayıcı, senkron, RAG ve koç ayrı servisler. Aralarındaki sözleşmeler net."
        }
      ],
      cta: {
        title: ["Sadece okuma anahtarını getir.", "Avantajını koru."],
        sub: "Spot · USD-M Vadeli · COIN-M Vadeli. Kurulum yok.",
        button: "Başlat"
      },
      meta: "© 2026 2BMTRADE · v0.4 · Binance bağlı değildir",
      links: { github: "GitHub", security: "security@hackathon.mertgungor.me", disclosure: "Güvenlik bildirimi" }
    }
  },
  connect: {
    badge: "Kısa oturum, anahtar kaydedilmez",
    title: "Binance'i güvenle bağla",
    intro:
      "Sadece okuma yetkili bir Binance anahtarı kullan. Spot, USD-M ve COIN-M Vadeli geçmişini tararız. Sadece okuruz — hiç işlem, transfer veya değişiklik yapmayız.",
    summary: {
      storage: "Anahtar saklama",
      storageValue: "Kaydedilmez",
      writeActions: "Yazma işlemleri",
      writeActionsValue: "Uygulamada yok",
      coverage: "Kapsam",
      coverageAll: "Tam tarama",
      coverageQuote: "Geniş tarama",
      coverageSelected: "Seçili"
    },
    rulesTitle: "Uygulamadaki güvenlik kuralları",
    rules: [
      "Anahtar sadece bizim sunucumuza gönderilir.",
      "Bu MVP API anahtarlarını veya secret'i kaydetmez.",
      "Binance yetkilerini kontrol ederiz. Anahtar sadece okuma olmalı.",
      "Bu uygulamada işlem, çekim, transfer veya yazma kodu yok."
    ],
    warning:
      "Binance, Spot ve Vadeli işlemlerde sembol sembol tarama ister. İş devam ederken canlı ilerleme görürsün. Vadeli geçmişi Binance pencereleriyle sınırlı.",
    form: {
      heading: "Tek seferlik analiz, anahtar kaydı yok",
      sub: "Hız için geniş tarama varsayılan. En derin geçmiş için tam tarama'yı kullan.",
      apiKey: "Binance API anahtarı",
      apiSecret: "Binance API secret",
      apiSecretHint: "Gönderdikten sonra sayfaya geri dönmez.",
      lookback: "Geriye gün sayısı",
      lookbackHint:
        "Spot daha eskiye gidebilir. USD-M Vadeli'de Binance yaklaşık 6 ayla sınırlar.",
      marketsLabel: "Dahil edilecek piyasalar",
      markets: {
        spot: "Spot",
        spotDetail: "Geçmiş spot işlemleri ve ücretler",
        umFutures: "USD-M Vadeli",
        umFuturesDetail: "USDT/USDC vadeli işlemler ve gerçekleşen PnL",
        coinFutures: "COIN-M Vadeli",
        coinFuturesDetail: "Coin marjlı vadeli işlemler ve gerçekleşen PnL"
      },
      scanCoverage: "Tarama kapsamı",
      scanModes: {
        all: { title: "Tam piyasa taraması", detail: "Tüm Spot ve Vadeli sembollerini tarar. Yavaş ama tam.", meta: "En kapsamlı" },
        quote: { title: "Geniş quote taraması", detail: "Aktif vadeli + öncelikli çiftler + seçtiğin quote varlıkları.", meta: "Hızlı ve dengeli" },
        selected: { title: "Hızlı seçili tarama", detail: "Sadece seçtiğin sembolleri tarar. Hızlı, bazılarını atlayabilir.", meta: "En hızlı" }
      },
      quoteAssetsLabel: "Geniş tarama için quote varlıkları",
      prioritySymbols: "Öncelikli semboller",
      validate: "Anahtarı kontrol et",
      analyze: "Analiz et",
      demo: "Demo veri",
      validating: "Kontrol ediliyor...",
      validated: (perms: string) =>
        `Sadece okuma anahtarı onaylandı. İzinler: ${perms || "Okuma"}.`,
      jobBadge: (scanned: number, total: number | string, withTrades: number, found: number, current?: string) =>
        `${scanned}/${total} sembol · ${withTrades} işlemli · ${found} işlem${current ? ` · Şimdi: ${current}` : ""}`,
      progress: "ilerleme",
      loadingAll: "Tam tarama çalışıyor. Birkaç dakika sürebilir. Binance sembol sembol istek ister.",
      loadingQuote: "Geniş tarama Spot ve Vadeli sembollerinde çalışıyor.",
      loadingSelected: "Seçtiğin semboller taranıyor."
    }
  },
  dashboard: {
    ready: "Görüntülemeye hazır",
    expires: "Sonlanma",
    title: "İşlem panelin",
    intro:
      "Binance geçmişin temiz grafiklere ve net istatistiklere dönüştürüldü. API secret'leri kaydedilmez.",
    noMarket: "Piyasa verisi yok",
    marketTrades: (count: string) => `${count} işlem`,
    totalVolume: "Toplam hacim",
    symbols: "Semboller",
    pnlConfidence: "PnL güven seviyesi",
    pnlNote: "Vadeli PnL Binance'ten geldiğinde resmidir. Spot PnL tahmindir.",
    metrics: {
      totalTrades: "Toplam işlem",
      activeDays: (count: string) => `${count} aktif gün`,
      volumeQuote: "Toplam hacim",
      avg: (n: string) => `Ort. ${n}`,
      fees: "Quote ücretleri",
      buyRatio: "Alış oranı",
      buysSells: (b: string, s: string) => `${b} alış / ${s} satış`
    },
    behavior: {
      eyebrow: "Davranış özeti",
      title: (symbols: number) => `İşlemlerin ${symbols} sembole yayılmış.`,
      body:
        "Bu görünüm sembol dağılımı, işlem hızı, ücret yükü ve PnL güvenini gösterir. Alışkanlıklarını gözden geçirmek için kullan.",
      rapidFollowUps: "Hızlı takip",
      lateNightRatio: "Gece işlem oranı",
      estPnl: "Tah. gerçekleşen PnL",
      topInsights: "Üst notlar"
    },
    flags: {
      title: "Davranış bayrakları",
      rapid: "Hızlı takip",
      lateNight: "Gece işlemleri"
    },
    deterministic: "Kural tabanlı en üst notlar",
    severity: {
      risk: "risk",
      warning: "uyarı",
      info: "bilgi"
    }
  },
  trades: {
    badge: "Temiz Binance işlemleri",
    title: "İşlem listesi",
    intro: "Bu kısa oturumdaki her işlemi ara, filtrele, sırala ve dışa aktar.",
    empty: "Seçilen sembol veya tarih aralığında işlem bulunamadı.",
    table: {
      title: "Tüm temiz işlemler",
      countShown: (shown: number, total: number) => `${shown} / ${total} işlem gösteriliyor`,
      export: "CSV dışa aktar",
      searchLabel: "Ara",
      searchPlaceholder: "Sembol, sipariş ID, işlem ID",
      symbolLabel: "Sembol",
      allSymbols: "Tüm semboller",
      sideLabel: "Yön",
      allSides: "Tüm yönler",
      buy: "Alış",
      sell: "Satış",
      time: "Zaman",
      symbol: "Sembol",
      price: "Fiyat",
      qty: "Adet",
      quote: "Quote",
      fee: "Ücret",
      sideCol: "Yön",
      market: "Piyasa",
      order: "Sipariş",
      truncated: "Hız için ilk 500 satır gösteriliyor. CSV'de tümü var."
    },
    market: { spot: "Spot", um: "USD-M", coin: "COIN-M" }
  },
  insights: {
    badge: "Kural tabanlı + senin verinden kanıt",
    title: "Notlar",
    intro: "Gemini istatistiklerini okur ve bir trader profili yazar. Kural tabanlı kartlar sıkı ve kanıt tabanlı kalır.",
    profile: {
      title: "Gemini trader profili",
      sub: "İstatistiklerine dayalı trader türü analizi.",
      regenerate: "Yeniden oluştur",
      generating: "Gemini işlem davranışını okuyor...",
      configMissing: "`.env` dosyasına `GEMINI_API_KEY` ekle, dev sunucuyu yeniden başlat ve profili yeniden oluştur.",
      confidence: { high: "yüksek güven", medium: "orta güven", low: "düşük güven" },
      cached: "oturum önbelleği",
      generated: "oluşturuldu",
      sections: {
        evidence: "Kanıt",
        behavioralTags: "Davranış etiketleri",
        strengths: "Güçlü yönler",
        risks: "Riskler",
        reflection: "Öz-değerlendirme soruları"
      },
      empty: "Öğe oluşturulamadı."
    },
    sceneLabel: "insight-radar.loop",
    signalsLabel: (n: number) => `${n} sinyal`,
    dna: {
      title: "Trading DNA",
      subtitle: "Senin oturumundan altı davranış ekseni.",
      axes: {
        revenge: "İntikam",
        overtrading: "Aşırı işlem",
        fomo: "FOMO",
        averaging: "Ortalama düşürme",
        timing: "Zamanlama riski",
        feeDrag: "Komisyon yükü"
      },
      empty: "Henüz yeterli işlem verisi yok."
    }
  },
  aiCoach: {
    badge: "Gemini ajan grubu",
    title: "AI İşlem Koçu",
    intro:
      "Kendi işlem geçmişin hakkında sor. Koç trader profilini kullanır, kaynak verir ve sana al/sat demez.",
    sidebar: {
      traderModel: "Trader modeli",
      traderModelSub: "Notlar ile ortak. Bu oturum için önbelleklenmiş.",
      loadingProfile: "Trader profili yükleniyor...",
      noProfile:
        "Henüz kayıtlı trader profili yok. Gemini ayarlıysa sonraki cevap bir profil oluşturabilir.",
      pipeline: "Ajan hattı",
      pipelineSteps: {
        orchestrator: { title: "Gemini orkestratör", detail: "Alt ajanları planlar ve sonuçları birleştirir." },
        rag: { title: "RAG araştırmacı", detail: "Doğru oturum parçalarını ve notları getirir." },
        behavior: { title: "Davranış analisti", detail: "Ücret, zamanlama ve işlem hızını kontrol eder." },
        profile: { title: "Profil analisti", detail: "Cevabı trader profiline bağlar." },
        revenge: { title: "İntikam-işlem taraması", detail: "Zarardan sonraki hızlı işlemleri arar." },
        pnl: { title: "PnL kalitesi", detail: "PnL iddialarının kanıtı var mı bakar." },
        symbol: { title: "Sembol analisti", detail: "Top sembollere ve değişimlere bakar." }
      },
      pipelineUsedBadge: "kullanıldı",
      planning: "Gemini orkestratör alt ajanları planlıyor...",
      completed: (count: number) =>
        `${count || 1} alt ajan kontrolü tamam. Yeşil kartlar son çalıştırmadaki ajanları gösterir.`,
      radarTitle: "Davranış risk radarı",
      radarSub: "Koç notları eklemeden önce en üst kural tabanlı sinyaller.",
      radarRefs: (count: number) => `${count} kaynak`,
      safety:
        "Koç sadece davranışı okur. Sana herhangi bir varlığı al, sat veya tut demez."
    },
    chat: {
      title: "AI İşlem Koçu",
      sub: "Senin işlem verine ve RAG notlarına dayalı Gemini ajanları.",
      stats: { trades: "İşlem", activeDays: "Aktif gün", pnlConf: "PnL güven" },
      pdf: "PDF yap",
      pdfMaking: "PDF yapılıyor...",
      pdfDone: "Doğrulamadan sonra PDF hazır.",
      placeholder: "Ücret, hata, trader türü, geç saat, disiplin sor...",
      send: "Gönder",
      welcome:
        "Davranışın, ücretlerin, zamanlama, hızlı işlemler veya top sembollerini sor. Trader profilini, RAG notlarını ve alt ajanları kullanırım.",
      thinking:
        "Gemini orkestratör alt ajanları çağırıyor ve kanıt topluyor...",
      subAgentTrace: "Alt ajan izi",
      reportSteps: [
        "Tüm koç cevapları ve alt ajan notları toplanıyor...",
        "Gemini rapor yazarı PDF taslağı hazırlıyor...",
        "Doğrulayıcı ajan taslağı kontrol ediyor...",
        "Gerekirse doğrulayıcı düzeltmeleri uygulanıyor...",
        "Son PDF hazırlanıyor..."
      ],
      reportFlow: {
        title: "Kanıta dayalı raporun hazırlanıyor",
        sub: "Beş adımlı bir hat. Doğrulayıcı adımı, PDF imzalanmadan önce her iddiayı senin işlem verinle çapraz kontrol eder.",
        stages: [
          { title: "Topla", sub: "Koç cevapları + alt ajan izleri" },
          { title: "Taslak", sub: "Gemini rapor bölümlerini yazar" },
          { title: "Doğrula", sub: "Her iddia senin verine karşı kontrol edilir" },
          { title: "Düzelt", sub: "Doğrulayıcı düzeltmeleri uygulanır" },
          { title: "Bitir", sub: "PDF imzalanır ve paketlenir" }
        ],
        validatorBadge: "DOĞRULAYICI",
        scanLabel: "İddialar taranıyor",
        claimVerified: "doğrulandı",
        claimsCounter: (verified: number, total: number) => `${verified} / ${total} iddia doğrulandı`,
        sampleClaims: [
          "En çok BTCUSDT ücretleri · Ekim",
          "Hızlı işlem grupları · 9 vuruş",
          "Spot PnL tahmini · +1,284 USDT",
          "Gece işlem oranı · %18",
          "Sembol yoğunluğu · %62"
        ],
        done: "Doğrulandı. PDF hazır."
      },
      whatIf: {
        title: "Ya yapmasaydım?",
        skipWorst5: "En kötü 5 trade'i atla",
        baseline: "Mevcut PnL",
        simulated: "Atlandıktan sonra",
        delta: "Fark",
        empty: "Henüz analiz edilecek en kötü trade yok.",
        loading: "Hesaplanıyor…"
      },
      toolTrace: "Koç'un kullandığı araçlar"
    }
  },
  traders: {
    badge: "Anonim trader ağı",
    storage: { db: "veritabanı", memory: "sadece bellek" },
    title: "Sana benzer trader'ları bul",
    intro:
      "Profilin sadece oran ve etiket tutar. Anahtar, ham işlem, sipariş ID, saat, bakiye veya secret SAKLANMAZ.",
    yourProfile: "Senin anonim profilin",
    metrics: {
      success: "Başarı",
      rapid: "Hızlı",
      night: "Gece",
      topSymbol: "Top sembol",
      buyRatio: "Alış oranı",
      lateNight: "Gece oranı"
    },
    registering: "Anonim profilin hazırlanıyor...",
    searching: "Benzer trader'lar aranıyor...",
    none: {
      title: "Henüz eşleşme yok",
      body:
        "Profilin hazır. Bu ağın yardımcı olması için daha çok kullanıcı analiz yapmalı."
    },
    privacyTag: "önce gizlilik",
    match: (pct: number) => `%${pct} uyum`,
    topSymbols: "Top semboller",
    behaviorTags: "Davranış etiketleri",
    follow: "Takip et",
    following: "Takipte",
    sceneLabel: "trader-network.loop",
    peersLabel: (n: number) => `${n} eş`
  },
  auth: {
    signIn: "Giriş yap",
    signOut: "Çıkış yap",
    accountFallback: "Hesap",
    welcome: {
      title: "Tekrar hoş geldin",
      sub: "Sadece okuma yetkili Binance anahtarlarını bağlamak ve AI koçu açmak için giriş yap.",
      continueWithGoogle: "Google ile devam et",
      consent: "Giriş yaparak trader profilinin sadece anonim olarak paylaşılmasını kabul ediyorsun."
    },
    demo: {
      divider: "veya",
      tryDemo: "Demo veriyle dene",
      tryDemoSub: "Giriş gerekmez. Yapay Binance geçmişi.",
      loading: "Demo oturumu hazırlanıyor...",
      failed: "Demo başarısız. Tekrar dene."
    }
  },
  errors: {
    unknownError: "Bir şeyler ters gitti.",
    validationFailed: "Doğrulama başarısız.",
    syncFailed: "Senkronizasyon başarısız.",
    syncProgressRead: "Senkron ilerlemesi okunamadı.",
    syncNoSession: "Senkron oturum oluşturmadan tamamlandı.",
    demoFailed: "Demo başarısız.",
    profileGenerationFailed: "Trader profili oluşturulamadı.",
    profileRequestFailed: "Trader profili isteği başarısız.",
    coachRequestFailed: "Koç isteği başarısız.",
    pdfGenerationFailed: "PDF rapor oluşturma başarısız.",
    similarTradersFailed: "Benzer trader'lar yüklenemedi."
  },
  a11y: {
    mainNav: "Ana menü",
    mobileNav: "Mobil menü",
    menu: "Menü"
  },
  sessionGate: {
    loading: "Analizin yükleniyor...",
    noSession: "Aktif analiz oturumu yok",
    connectCta: "Bağlan veya demo yükle"
  },
  charts: {
    activityOverTime: "Zamana göre işlem aktivitesi",
    monthlyVolume: "Aylık hacim",
    tradedAssetShare: "İşlem yapılan varlık payı",
    buyVsSellFees: "Alış vs satış ve ücretler",
    buys: "Alışlar",
    sells: "Satışlar",
    hourlyTitle: "Saatlik aktivite ve başarı oranı",
    hourlySub: "UTC saat başına işlem ve gerçekleşen PnL başarı oranı.",
    hourlyTradesScored: (n: number) => `${n} skorlu vadeli işlem`,
    hourlyFootnote:
      "Başarı oranı, Binance'in gerçekleşen PnL döndürdüğü işlemleri kullanır — çoğunlukla vadeli. PnL'siz spot işlemler aktivitede sayılır, skorda değil.",
    busiestHour: "En yoğun saat",
    bestHour: "En iyi skorlu saat",
    weakestHour: "En zayıf skorlu saat",
    successLabel: (pct: string) => `${pct} başarı`,
    noScored: "Skorlu işlem yok",
    hourUtcSuffix: "UTC",
    pnl: "PnL",
    heatmapTitle: "UTC gün/saat aktivite ısı haritası",
    days: ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]
  },
  symbolIntel: {
    title: "Sembol görünümü",
    sub: "İşlemlerin, hacmin ve PnL'in en aktif olduğu yerler.",
    quoteVolume: "quote hacmi",
    avg: (n: string) => `Ort. ${n}`,
    shareOf: (pct: string) => `hacmin %${pct.replace("%", "")}`,
    estPnl: (n: string) => `Tah. PnL ${n}`,
    last: (when: string) => `Son ${when}`,
    latestTitle: "Son işlemler",
    bestWorstTitle: "En iyi / en kötü satışlar (tahmini)",
    bestWorstEmpty:
      "İşlem seviyesi PnL tahmini için yeterli alış/satış geçmişi yok.",
    trades: "işlem",
    buys: "alış",
    sells: "satış"
  },
  market: {
    spot: "Spot",
    um: "USD-M Vadeli",
    coin: "COIN-M Vadeli"
  }
};
