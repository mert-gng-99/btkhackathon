export const en = {
  common: {
    appName: "2BMTRADE",
    version: "v0.4",
    openApp: "Open 2BMTRADE",
    home: "Home",
    backToHome: "Back to home",
    loading: "Loading...",
    retry: "Try again",
    showMore: "Show more",
    showLess: "Show less",
    yes: "Yes",
    no: "No",
    ok: "OK",
    cancel: "Cancel",
    close: "Close",
    save: "Save",
    edit: "Edit",
    refresh: "Refresh",
    cached: "From cache",
    generated: "Made at"
  },
  language: {
    toggleLabel: "Language",
    english: "English",
    turkish: "Türkçe",
    short: { en: "EN", tr: "TR" }
  },
  nav: {
    connect: "Connect",
    dashboard: "Dashboard",
    trades: "Trades",
    insights: "Insights",
    aiCoach: "AI Coach",
    traders: "Traders",
    tagline: "Spot & Futures"
  },
  // ---- Home page ----
  home: {
    nav: {
      overview: "Overview",
      security: "Safety",
      analytics: "Charts",
      coach: "AI Coach",
      sync: "Sync"
    },
    hero: {
      eyebrow: "Read-only · No trading",
      title: ["See how you", "really trade."],
      sub: "Connect a read-only Binance key. 2BMTRADE turns your Spot and Futures history into clear charts and a smart AI coach.",
      ctaPrimary: "Analyze my trades",
      ctaSecondary: "Watch 60 second tour",
      trust: {
        noWithdrawals: "No withdrawals",
        noTrading: "No trading",
        secretsDiscarded: "Keys not saved",
        openSource: "Open source friendly"
      },
      scroll: "SCROLL"
    },
    intro: {
      whatItIs: "WHAT IT IS",
      whatItIsBody: "A safe Binance trade viewer. You bring a read-only key. 2BMTRADE shows you how you trade.",
      markets: "MARKETS",
      marketsBody: "Spot · USD-M · COIN-M",
      stack: "STACK",
      stackBody: "Next.js · Prisma · Gemini",
      status: "STATUS",
      statusBody: "v0.4 · public preview"
    },
    security: {
      eyebrow: "SAFETY",
      title: ["Your keys stay", "safe with you."],
      sub: "We check every key before any request. Keys that can trade or withdraw are blocked. Right away. No silent failures.",
      bullets: [
        {
          title: "Key checked before any use",
          desc: "If the key can trade or withdraw, the request never leaves our checker."
        },
        {
          title: "Short session only",
          desc: "Your secret lives in an encrypted, time-limited session. Nothing is saved. Nothing is logged."
        },
        {
          title: "Clear audit trail",
          desc: "Every Binance call is signed, rate-limited, and traced. Keys are hidden in logs."
        }
      ],
      keyCard: {
        apiKey: "API Key",
        accountScope: "Account scope",
        scopeValue: "Spot + Futures (read)",
        enableTrading: "Enable Trading",
        denied: "DENIED",
        enableWithdrawals: "Enable Withdrawals",
        enableReading: "Enable Reading",
        ok: "OK",
        accepted: "READ-ONLY KEY ACCEPTED",
        loopName: "permission-check.loop"
      }
    },
    analytics: {
      eyebrow: "TRADE HABITS",
      title: ["Numbers about how you trade,", "not just profit and loss."],
      sub: "Volume, fees, fast trades, top symbols, buy/sell split, and Spot PnL — all from your own history.",
      callouts: {
        concentration: "Top symbols",
        spotPnl: "Spot PnL (est.)",
        rapidTrades: "Fast trades"
      },
      dash: {
        volume: "Volume (30d)",
        volumeUnit: "K USDT",
        fees: "Fees",
        feesUnit: "USDT",
        rapidTrades: "Fast trades",
        volumeChart: "Volume by day",
        volumeChartSub: "last 14d · USDT",
        peak: "peak",
        symbolConcentration: "Top symbols",
        dominance: "BTC / ETH share",
        loopName: "dashboard.loop",
        spotPnlValue: "Spot PnL (est.) · +1,284 USDT"
      },
      kpiDeltas: {
        volume: "▲ 12.6%",
        feesStable: "— flat",
        rapidClusters: "▲ 9 groups"
      }
    },
    coach: {
      eyebrow: "AI COACH",
      title: ["An AI coach that", "shows its proof."],
      sub: "Every answer comes from your own trades. No guesses. Every point has a link back to the trade it came from.",
      subNote: "No fake history. No trading advice. No claim without proof.",
      bullets: [
        {
          title: "Reads only your data",
          desc: "Each answer uses your trade history — BTCUSDT, ETHUSDT, futures, and fees."
        },
        {
          title: "Sources included",
          desc: "Tap a source to open the trade. If there is no source, the coach says so."
        }
      ],
      footnote: "Powered by Gemini + local RAG.",
      phone: {
        name: "Coach",
        status: "grounded · gemini",
        online: "● online",
        msg1: "Why did my BTCUSDT fees go up in October?",
        msg2Pre: "Your taker volume on BTCUSDT in October was ",
        msg2Mid: " — about ",
        msg2Mid2: " times September. With taker fees at ",
        msg2End: ", this alone adds ",
        msg2End2: " to your fees.",
        msg3: "Did I trade too much around CPI?",
        cite1: "trade #482",
        cite2: "BTCUSDT · Oct",
        cite3: "fee-tier #2",
        loopName: "coach.loop",
        loopSub: "Powered by Gemini + local RAG"
      }
    },
    sync: {
      eyebrow: "FULL SCAN, LIVE",
      title: ["Scans every active", "symbol — without", "blocking your screen."],
      sub: "Background workers scan Spot, USD-M Futures, and COIN-M Futures. You can also filter by quote asset or pick a quick scan.",
      tags: ["Spot", "USD-M Futures", "COIN-M Futures", "USDT", "BTC", "BNB", "TRY"],
      ui: {
        jobId: "SYNC JOB · #2841",
        progress: "Progress",
        symbolsScanned: "Symbols scanned",
        currentSymbol: "Current symbol",
        tradesFound: "Trades found",
        markets: "Markets",
        marketsValue: "Spot · USD-M · COIN-M",
        activeStream: "Active stream",
        loopName: "sync.loop",
        timeLeft: "time left · 02:14"
      }
    },
    footer: {
      eyebrow: "BUILT WITH",
      title: ["A small, simple stack", "for strong promises."],
      stack: ["Next.js 14", "TypeScript", "Tailwind CSS", "Prisma", "PostgreSQL", "Gemini"],
      reassureCards: [
        {
          title: "No keys in logs",
          body: "Keys and signed data are removed before any log is written. We keep the shape, not the secret."
        },
        {
          title: "Anonymous trader registry",
          body: "Each trader gets a random ID. Your name never crosses into our analytics."
        },
        {
          title: "Open architecture",
          body: "Validator, sync, RAG, and coach are separate services with clear contracts."
        }
      ],
      cta: {
        title: ["Bring your read-only key.", "Keep your edge."],
        sub: "Spot · USD-M Futures · COIN-M Futures. Nothing to install.",
        button: "Open 2BMTRADE"
      },
      meta: "© 2026 2BMTRADE · v0.4 · not made by Binance",
      links: { github: "GitHub", security: "security@hackathon.mertgungor.me", disclosure: "Security disclosure" }
    }
  },
  // ---- Connect page ----
  connect: {
    badge: "Short session, no saved keys",
    title: "Connect Binance safely",
    intro:
      "Use a read-only Binance key. We scan your Spot, USD-M Futures, and COIN-M Futures history. We only read — we never trade, transfer, or change anything.",
    summary: {
      storage: "Secret storage",
      storageValue: "Not saved",
      writeActions: "Write actions",
      writeActionsValue: "Not in the app",
      coverage: "Coverage",
      coverageAll: "Full scan",
      coverageQuote: "Broad scan",
      coverageSelected: "Selected"
    },
    rulesTitle: "Safety rules in this app",
    rules: [
      "The secret is only sent to our own server.",
      "This MVP does not save API keys or secrets.",
      "We check Binance permissions. The key must be read-only.",
      "There is no trade, withdrawal, transfer, or write code in this app."
    ],
    warning:
      "Binance only allows symbol-by-symbol scans for Spot and Futures trades. The job shows live progress. Futures history is limited by Binance windows.",
    form: {
      heading: "Analyze once, do not save keys",
      sub: "Broad scan is on by default for speed. Use full scan for the deepest history.",
      apiKey: "Binance API key",
      apiSecret: "Binance API secret",
      apiSecretHint: "Never sent back to the page after you submit.",
      lookback: "Lookback days",
      lookbackHint:
        "Spot can go far back. USD-M Futures user history is limited to about 6 months by Binance.",
      marketsLabel: "Markets to include",
      markets: {
        spot: "Spot",
        spotDetail: "Past spot trades and fees",
        umFutures: "USD-M Futures",
        umFuturesDetail: "USDT/USDC futures fills and realized PnL",
        coinFutures: "COIN-M Futures",
        coinFuturesDetail: "Coin-margined futures fills and realized PnL"
      },
      scanCoverage: "Scan coverage",
      scanModes: {
        all: { title: "Full market scan", detail: "Scans every Spot and Futures symbol. Slow but complete.", meta: "Best for full history" },
        quote: { title: "Broad quote scan", detail: "Quick scan of active futures, top pairs, and your quote assets.", meta: "Fast and balanced" },
        selected: { title: "Quick selected scan", detail: "Scans only the symbols you pick. Fast, may miss some trades.", meta: "Fastest" }
      },
      quoteAssetsLabel: "Quote assets for broad scan",
      prioritySymbols: "Priority symbols",
      validate: "Check key",
      analyze: "Analyze",
      demo: "Demo data",
      validating: "Checking...",
      validated: (perms: string) =>
        `Read-only key confirmed. Allowed: ${perms || "Reading"}.`,
      jobBadge: (scanned: number, total: number | string, withTrades: number, found: number, current?: string) =>
        `${scanned}/${total} symbols · ${withTrades} with trades · ${found} trades${current ? ` · Now: ${current}` : ""}`,
      progress: "progress",
      loadingAll: "Full scan is running. It can take a few minutes. Binance needs symbol-by-symbol queries.",
      loadingQuote: "Broad scan is running over Spot and Futures symbols.",
      loadingSelected: "Your selected symbols are being scanned."
    }
  },
  // ---- Dashboard page ----
  dashboard: {
    ready: "Ready to view",
    expires: "Ends",
    title: "Your trading dashboard",
    intro:
      "Your Binance history is turned into clean charts and clear stats. API secrets are not saved.",
    noMarket: "No market data",
    marketTrades: (count: string) => `${count} trades`,
    totalVolume: "Total volume",
    symbols: "Symbols",
    pnlConfidence: "PnL trust level",
    pnlNote: "Futures PnL is official when Binance returns it. Spot PnL is an estimate.",
    metrics: {
      totalTrades: "Total trades",
      activeDays: (count: string) => `${count} active days`,
      volumeQuote: "Total volume",
      avg: (n: string) => `Avg ${n}`,
      fees: "Quote fees",
      buyRatio: "Buy ratio",
      buysSells: (b: string, s: string) => `${b} buys / ${s} sells`
    },
    behavior: {
      eyebrow: "Behavior snapshot",
      title: (symbols: number) => `Your trades are spread across ${symbols} symbols.`,
      body:
        "This view shows symbol mix, trade speed, fee drag, and PnL trust. Use it to review your habits.",
      rapidFollowUps: "Fast follow-ups",
      lateNightRatio: "Night trade share",
      estPnl: "Est. realized PnL",
      topInsights: "Top notes"
    },
    flags: {
      title: "Behavior flags",
      rapid: "Fast follow-ups",
      lateNight: "Night trades"
    },
    deterministic: "Top rule-based notes",
    severity: {
      risk: "risk",
      warning: "warning",
      info: "info"
    }
  },
  // ---- Trades page ----
  trades: {
    badge: "Clean Binance trades",
    title: "Trade list",
    intro: "Search, filter, sort, and export every trade from this short session.",
    empty: "No trades found for the chosen symbols or date range.",
    table: {
      title: "All clean trades",
      countShown: (shown: number, total: number) => `${shown} of ${total} trades shown`,
      export: "Export CSV",
      searchLabel: "Search",
      searchPlaceholder: "Symbol, order ID, trade ID",
      symbolLabel: "Symbol",
      allSymbols: "All symbols",
      sideLabel: "Side",
      allSides: "All sides",
      buy: "Buy",
      sell: "Sell",
      time: "Time",
      symbol: "Symbol",
      price: "Price",
      qty: "Qty",
      quote: "Quote",
      fee: "Fee",
      sideCol: "Side",
      market: "Market",
      order: "Order",
      truncated: "First 500 rows shown for speed. The CSV export has every row."
    },
    market: { spot: "Spot", um: "USD-M", coin: "COIN-M" }
  },
  // ---- Insights page ----
  insights: {
    badge: "Rule-based + proof from your data",
    title: "Insights",
    intro: "Gemini reads your stats and writes a trader profile. The rule-based cards stay strict and proof-based.",
    profile: {
      title: "Gemini trader profile",
      sub: "Trader type analysis based on your numbers.",
      regenerate: "Regenerate",
      generating: "Gemini is reading your trade behavior...",
      configMissing: "Add `GEMINI_API_KEY` to `.env`, restart the dev server, then regenerate this profile.",
      confidence: { high: "high trust", medium: "medium trust", low: "low trust" },
      cached: "session cache",
      generated: "made",
      sections: {
        evidence: "Proof",
        behavioralTags: "Behavior tags",
        strengths: "Strengths",
        risks: "Risks to review",
        reflection: "Self-check questions"
      },
      empty: "No items generated."
    }
  },
  // ---- AI Coach page ----
  aiCoach: {
    badge: "Gemini with agents",
    title: "AI Trade Coach",
    intro:
      "Ask about your own trade history. The coach uses your trader profile, gives sources, and never tells you to buy or sell.",
    sidebar: {
      traderModel: "Trader model",
      traderModelSub: "Shared with Insights. Cached for this session.",
      loadingProfile: "Loading trader profile...",
      noProfile:
        "No saved trader profile yet. The next coach answer can make one if Gemini is set up.",
      pipeline: "Agent pipeline",
      pipelineSteps: {
        orchestrator: { title: "Gemini orchestrator", detail: "Plans the sub-agents and merges results." },
        rag: { title: "RAG researcher", detail: "Gets the right session chunks and notes." },
        behavior: { title: "Behavior analyst", detail: "Checks fees, timing, and trade speed." },
        profile: { title: "Profile analyst", detail: "Links the answer to your trader profile." },
        revenge: { title: "Revenge-trading scan", detail: "Looks for fast trades after losses." },
        pnl: { title: "PnL quality agent", detail: "Checks if PnL claims have proof." },
        symbol: { title: "Symbol agent", detail: "Looks at top symbols and switching." }
      },
      pipelineUsedBadge: "used",
      planning: "Gemini orchestrator is planning sub-agents...",
      completed: (count: number) =>
        `Done with ${count || 1} sub-agent checks. Green cards show agents used in the last run.`,
      radarTitle: "Behavior risk radar",
      radarSub: "Top rule-based signals before the coach adds notes.",
      radarRefs: (count: number) => `${count} refs`,
      safety:
        "The coach only reads behavior. It must not tell you to buy, sell, or hold any asset."
    },
    chat: {
      title: "AI Trade Coach",
      sub: "Gemini agents grounded in your trade data and RAG notes.",
      stats: { trades: "Trades", activeDays: "Active days", pnlConf: "PnL trust" },
      pdf: "Make PDF",
      pdfMaking: "Making PDF...",
      pdfDone: "PDF made after validator review.",
      placeholder: "Ask about fees, mistakes, trader type, late hours, discipline...",
      send: "Send",
      welcome:
        "Ask about your behavior, fees, timing, fast trades, or top symbols. I will use your trader profile, RAG notes, and sub-agents.",
      thinking:
        "Gemini orchestrator is calling sub-agents and getting proof...",
      subAgentTrace: "Sub-agent trace",
      reportSteps: [
        "Collecting all coach answers and sub-agent notes...",
        "Gemini report writer is making the PDF...",
        "Validator agent is checking the draft...",
        "Adding validator fixes if needed...",
        "Making the final PDF..."
      ]
    }
  },
  // ---- Traders page ----
  traders: {
    badge: "Anonymous trader network",
    storage: { db: "database storage", memory: "memory only" },
    title: "Find traders like you",
    intro:
      "Your peer profile only stores ratios and tags. It does NOT store keys, raw trades, order IDs, times, balances, or secrets.",
    yourProfile: "Your anonymous profile",
    metrics: {
      success: "Success",
      rapid: "Fast",
      night: "Night",
      topSymbol: "Top symbol",
      buyRatio: "Buy ratio",
      lateNight: "Night ratio"
    },
    registering: "Setting up your anonymous profile...",
    searching: "Looking for similar traders...",
    none: {
      title: "No peers yet",
      body:
        "Your profile is set up. More users need to analyze trades before this network helps."
    },
    privacyTag: "privacy first",
    match: (pct: number) => `${pct}% match`,
    topSymbols: "Top symbols",
    behaviorTags: "Behavior tags",
    follow: "Follow",
    following: "Following"
  },
  // ---- Session gate ----
  sessionGate: {
    loading: "Loading your analysis...",
    noSession: "No active analysis session",
    connectCta: "Connect or load demo"
  },
  // ---- Charts / shared ----
  charts: {
    activityOverTime: "Trading activity over time",
    monthlyVolume: "Monthly volume",
    tradedAssetShare: "Traded asset share",
    buyVsSellFees: "Buy vs sell and fees",
    buys: "Buys",
    sells: "Sells",
    hourlyTitle: "Hourly activity and success rate",
    hourlySub: "Trades per UTC hour vs realized-PnL success rate.",
    hourlyTradesScored: (n: number) => `${n} scored futures trades`,
    hourlyFootnote:
      "Success rate uses trades where Binance returned realized PnL — mostly futures. Spot trades without PnL count for activity but not scoring.",
    busiestHour: "Busiest hour",
    bestHour: "Best scored hour",
    weakestHour: "Weakest scored hour",
    successLabel: (pct: string) => `${pct} success`,
    noScored: "No scored trades",
    hourUtcSuffix: "UTC",
    pnl: "PnL",
    heatmapTitle: "Activity heatmap by UTC day and hour",
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  },
  symbolIntel: {
    title: "Symbol view",
    sub: "Where your trades, volume, and PnL are most active.",
    quoteVolume: "quote volume",
    avg: (n: string) => `Avg ${n}`,
    shareOf: (pct: string) => `${pct} of volume`,
    estPnl: (n: string) => `Est. PnL ${n}`,
    last: (when: string) => `Last ${when}`,
    latestTitle: "Latest trades",
    bestWorstTitle: "Best / worst sells (est.)",
    bestWorstEmpty:
      "Not enough buy/sell history to estimate trade-level PnL yet.",
    trades: "trades",
    buys: "buys",
    sells: "sells"
  },
  market: {
    spot: "Spot",
    um: "USD-M Futures",
    coin: "COIN-M Futures"
  }
};

export type Dictionary = typeof en;
