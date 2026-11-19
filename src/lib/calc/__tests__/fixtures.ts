import type { Trade } from '../../../types/trade';

let n = 0;
export function mkTrade(p: Partial<Trade> = {}): Trade {
  n++;
  return {
    id: `t${n}`,
    symbol: 'XAUUSD',
    entryAt: `2026-11-${String(2 + n).padStart(2, '0')}T09:30:00+01:00`,
    exitAt: null,
    direction: 'buy',
    entryPrice: 2650,
    stopLoss: 2647,
    takeProfit: 2656,
    exitPrice: 2656,
    outcome: 'tp',
    riskPercent: 1,
    lots: null,
    pnlManual: null,
    eurUsd: null,
    rMultiple: null,
    rManual: false,
    screenshots: { before: null, after: null },
    notes: '',
    emotionBefore: null,
    emotionAfter: null,
    discipline: null,
    errorTags: [],
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    ...p,
  };
}
