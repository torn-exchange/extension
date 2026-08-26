import { safeJsonParse } from './api';

export type TradeActionStatus = 'accepted' | 'declined';

export interface TradeActionRecord {
  status: TradeActionStatus;
  timestamp: number;
}

const TRADE_ACTIONS_KEY = 'te_trade_actions';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function loadTradeActions(): Record<string, TradeActionRecord> {
  const raw = GM_getValue<string | null>(TRADE_ACTIONS_KEY, null);
  if (!raw) {
    return {};
  }
  return safeJsonParse<Record<string, TradeActionRecord>>(raw) ?? {};
}

function pruneTradeActions(actions: Record<string, TradeActionRecord>): Record<string, TradeActionRecord> {
  const now = Date.now();
  const pruned: Record<string, TradeActionRecord> = {};
  for (const [tradeId, record] of Object.entries(actions)) {
    if (now - record.timestamp < MAX_AGE_MS) {
      pruned[tradeId] = record;
    }
  }
  return pruned;
}

export function recordTradeAction(tradeId: string, status: TradeActionStatus): void {
  const actions = pruneTradeActions(loadTradeActions());
  actions[tradeId] = { status, timestamp: Date.now() };
  GM_setValue(TRADE_ACTIONS_KEY, JSON.stringify(actions));
}

export function getTradeAction(tradeId: string): TradeActionRecord | undefined {
  return loadTradeActions()[tradeId];
}

export function formatTimeAgo(timestamp: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
