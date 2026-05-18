export type Exchange = "binance";

export type MarketType = "spot" | "um_futures" | "coin_futures";

export type TradeSide = "BUY" | "SELL";

export type InsightSeverity = "info" | "warning" | "risk";

export type ReportType = "daily" | "weekly" | "monthly" | "ad_hoc";

export interface NormalizedTrade {
  id: string;
  sessionId: string;
  exchange: Exchange;
  marketType: MarketType;
  symbol: string;
  orderId: string;
  tradeId: string;
  side: TradeSide;
  price: number;
  quantity: number;
  quoteQuantity: number;
  fee: number;
  feeAsset: string;
  timestamp: string;
  isBuyer: boolean;
  isMaker: boolean;
  realizedPnl?: number;
  positionSide?: string;
}

export interface FeeSummary {
  asset: string;
  amount: number;
}

export interface SymbolSummary {
  symbol: string;
  trades: number;
  buys: number;
  sells: number;
  volume: number;
  averageTradeSize: number;
  firstTradeAt?: string;
  lastTradeAt?: string;
  realizedPnlEstimate?: number;
}

export interface ActivityPoint {
  label: string;
  trades: number;
  volume: number;
}

export interface HeatmapPoint {
  dayOfWeek: number;
  hour: number;
  trades: number;
}

export interface HourlyBehaviorPoint {
  hour: number;
  label: string;
  trades: number;
  buyTrades: number;
  sellTrades: number;
  volume: number;
  realizedPnl: number;
  pnlSamples: number;
  winningTrades: number;
  losingTrades: number;
  successRate: number | null;
}

export interface EstimatedTradePnl {
  symbol: string;
  tradeId: string;
  timestamp: string;
  side: TradeSide;
  pnl: number;
  quantity: number;
}

export interface PnlEstimate {
  realized: number;
  matchedSellTrades: number;
  unmatchedSellTrades: number;
  confidence: "none" | "low" | "medium" | "high";
}

export interface GeneratedInsight {
  id: string;
  title: string;
  message: string;
  severity: InsightSeverity;
  category: "frequency" | "fees" | "timing" | "symbols" | "pnl" | "discipline" | "data";
  evidence: string[];
}

export interface AnalyticsData {
  totalTrades: number;
  totalVolume: number;
  averageTradeSize: number;
  buySell: {
    buys: number;
    sells: number;
    buyRatio: number;
    sellRatio: number;
  };
  feesByAsset: FeeSummary[];
  quoteFeeEstimate: number;
  marketBreakdown: Array<{
    marketType: MarketType;
    trades: number;
    volume: number;
  }>;
  mostTradedSymbols: SymbolSummary[];
  symbolSummaries: SymbolSummary[];
  activityByDate: ActivityPoint[];
  activityByMonth: ActivityPoint[];
  activityByHour: ActivityPoint[];
  hourlyBehavior: HourlyBehaviorPoint[];
  heatmap: HeatmapPoint[];
  rapidTradeCount: number;
  lateNightTradeCount: number;
  activeDays: number;
  pnlEstimate: PnlEstimate;
  bestTrades: EstimatedTradePnl[];
  worstTrades: EstimatedTradePnl[];
  generatedInsights: GeneratedInsight[];
}

export interface RagChunk {
  id: string;
  sessionId: string;
  sourceType: "analytics" | "symbol" | "period" | "insight" | "trade_cluster" | "material" | "report";
  sourceRef: string;
  content: string;
  metadata: Record<string, string | number | boolean>;
  embedding?: number[];
}

export interface AiEvidence {
  title: string;
  detail: string;
  sourceRef: string;
}

export interface CoachKeyFinding {
  title: string;
  detail: string;
  severity: InsightSeverity;
  evidenceRef?: string;
}

export interface CoachSubAgentResult {
  id: string;
  agent: string;
  objective: string;
  status: "completed" | "skipped";
  result: string;
  findings: string[];
  evidenceRefs: string[];
  confidence: "low" | "medium" | "high";
}

export interface AiCoachAnswer {
  answer: string;
  keyFindings: CoachKeyFinding[];
  evidence: AiEvidence[];
  retrievedChunks: RagChunk[];
  subAgentResults: CoachSubAgentResult[];
  traderProfile?: TraderProfile;
  disclaimer: string;
  structuredVersion: "agentic-v1";
}

export interface AiReport {
  id: string;
  sessionId: string;
  type: ReportType;
  title: string;
  summary: string;
  metrics: string[];
  observations: string[];
  reflectionQuestions: string[];
  createdAt: string;
}

export interface TraderProfile {
  traderType: string;
  confidence: "low" | "medium" | "high";
  summary: string;
  evidence: string[];
  strengths: string[];
  risks: string[];
  behavioralTags: string[];
  reflectionQuestions: string[];
  insufficientData?: boolean;
}

export interface StoredSession {
  id: string;
  source: Exchange;
  createdAt: string;
  expiresAt: string;
  trades: NormalizedTrade[];
  analytics: AnalyticsData;
  chunks: RagChunk[];
  reports: AiReport[];
  warnings: string[];
  traderProfile?: TraderProfile;
  traderProfileGeneratedAt?: string;
}

export interface SyncJobProgress {
  totalSymbols: number;
  scannedSymbols: number;
  symbolsWithTrades: number;
  tradesFound: number;
  currentMarket?: MarketType;
  currentSymbol?: string;
  message: string;
}

export interface SyncJob {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  progress: SyncJobProgress;
  sessionId?: string;
  error?: string;
  warnings: string[];
}
