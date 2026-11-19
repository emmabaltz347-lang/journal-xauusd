import { z } from 'zod';

export const EMOTIONS = [
  'calme',
  'confiante',
  'impatiente',
  'stressée',
  'frustrée',
  'euphorique',
  'fatiguée',
] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const EMOTION_EMOJI: Record<Emotion, string> = {
  calme: '😌',
  confiante: '💪',
  impatiente: '⏳',
  stressée: '😰',
  frustrée: '😤',
  euphorique: '🤩',
  fatiguée: '😴',
};

export const DEFAULT_ERROR_TAGS = [
  'entrée trop tôt',
  'entrée trop tard',
  'hors plan',
  'revenge trade',
  'SL déplacé',
  'taille trop grosse',
  'news ignorée',
  'surtrading',
];

export const TradeSchema = z.object({
  id: z.string().min(1),
  symbol: z.literal('XAUUSD'),
  entryAt: z.string(),
  exitAt: z.string().nullable(),
  direction: z.enum(['buy', 'sell']),
  entryPrice: z.number(),
  stopLoss: z.number(),
  takeProfit: z.number(),
  exitPrice: z.number().nullable(),
  outcome: z.enum(['tp', 'sl']).nullable(),
  riskPercent: z.number().positive(),
  /** Taille de position en lots (facultatif, ajouté après la v1) */
  lots: z.number().positive().nullable().default(null),
  /** Résultat en € saisi à la main (montant exact du broker), prioritaire sur le calcul */
  pnlManual: z.number().nullable().default(null),
  /** Taux EUR/USD utilisé pour ce trade (figé à l'enregistrement) */
  eurUsd: z.number().positive().nullable().default(null),
  rMultiple: z.number().nullable(),
  rManual: z.boolean(),
  screenshots: z.object({
    before: z.string().nullable(),
    after: z.string().nullable(),
  }),
  notes: z.string(),
  emotionBefore: z.enum(EMOTIONS).nullable(),
  emotionAfter: z.enum(EMOTIONS).nullable(),
  discipline: z.number().int().min(1).max(5).nullable(),
  errorTags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Trade = z.infer<typeof TradeSchema>;
export type Direction = Trade['direction'];

export const TradesFileSchema = z.object({
  version: z.literal(1),
  trades: z.array(TradeSchema),
});
export type TradesFile = z.infer<typeof TradesFileSchema>;

import type { Theme } from '../lib/theme';

export interface Settings {
  githubToken: string;
  owner: string;
  repo: string;
  branch: string;
  startingCapital: number;
  defaultRiskPercent: number;
  knownErrorTags: string[];
  theme: Theme;
  /** Nombre de pips pour 1 $ de mouvement sur l'or (10 : 3903,56 → 3913,56 = 100 pips) */
  pipsPerDollar: number;
  /** Onces par lot standard (100 chez la plupart des brokers) */
  contractSize: number;
  /** Taux de change EUR/USD utilisé pour convertir les gains en $ en € */
  eurUsd: number;
}

/** Trade enrichi par les calculs (jamais stocké) */
export interface ComputedTrade extends Trade {
  r: number; // R effectif (0 si trade ouvert)
  capitalBefore: number;
  pnlEur: number;
  capitalAfter: number;
  slPips: number;
  closed: boolean;
  /** Montant risqué prévu en € (capital × % de risque saisi) */
  riskEur: number;
  /** Origine du résultat en € */
  pnlSource: 'manual' | 'lots' | 'risk';
}
