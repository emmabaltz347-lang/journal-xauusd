import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchEurUsdAt, type FxQuote } from '../../lib/fx';
import { Icon } from '../ui/Icon';
import { DEFAULT_ERROR_TAGS, type Direction, type Emotion, type Trade } from '../../types/trade';
import {
  computePnlEur,
  lotsToEur,
  riskEurFromLots,
  round,
  computeR,
  inferOutcome,
  isStopValid,
  isTakeProfitValid,
  plannedRR,
  priceToPips,
} from '../../lib/calc/trade';
import { isoToLocalInput, localInputToIso, nowLocalInput } from '../../lib/calc/paris';
import { fmtEur, fmtPips, fmtR, parseDecimal, resultClass, toInput } from '../../lib/format';
import { useSettings } from '../../hooks/useSettings';
import { useTrades, type ImageChange } from '../../hooks/useTrades';
import { Segmented } from '../ui/Segmented';
import { StarRating } from '../ui/StarRating';
import { TagInput } from '../ui/TagInput';
import { EmotionPicker } from './EmotionPicker';
import { ScreenshotDrop } from './ScreenshotDrop';
import { GlassCard } from '../ui/GlassCard';

function makeId(entryLocal: string) {
  const [d, t = '0000'] = entryLocal.split('T');
  return `t_${d}_${t.replace(':', '')}_${Math.random().toString(36).slice(2, 6)}`;
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-white/45">{hint}</span>}
    </label>
  );
}

interface Draft {
  direction: Direction;
  entryAt: string;
  exitAt: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  exitPrice: string;
  riskPercent: string;
  lots: string;
  eurUsd: string;
  eurManual: boolean;
  pnlManual: string;
  rManual: boolean;
  rMultiple: string;
  notes: string;
  emotionBefore: Emotion | null;
  emotionAfter: Emotion | null;
  discipline: number | null;
  errorTags: string[];
}

function toDraft(t: Trade | undefined, defaultRisk: number, defaultEurUsd: number): Draft {
  return {
    direction: t?.direction ?? 'buy',
    entryAt: t ? isoToLocalInput(t.entryAt) : nowLocalInput(),
    exitAt: t?.exitAt ? isoToLocalInput(t.exitAt) : '',
    entryPrice: toInput(t?.entryPrice),
    stopLoss: toInput(t?.stopLoss),
    takeProfit: toInput(t?.takeProfit),
    exitPrice: toInput(t?.exitPrice),
    riskPercent: toInput(t?.riskPercent ?? defaultRisk),
    lots: toInput(t?.lots),
    eurUsd: toInput(t?.eurUsd ?? defaultEurUsd),
    eurManual: t?.pnlManual != null,
    pnlManual: toInput(t?.pnlManual),
    rManual: t?.rManual ?? false,
    rMultiple: toInput(t?.rMultiple),
    notes: t?.notes ?? '',
    emotionBefore: t?.emotionBefore ?? null,
    emotionAfter: t?.emotionAfter ?? null,
    discipline: t?.discipline ?? null,
    errorTags: t?.errorTags ?? [],
  };
}

export function TradeForm({ trade, onDone }: { trade?: Trade; onDone: (t: Trade) => void }) {
  const { settings } = useSettings();
  const { trades, computed, saveTrade, syncing } = useTrades();
  const [d, setD] = useState<Draft>(() => toDraft(trade, settings.defaultRiskPercent, settings.eurUsd));
  const [images, setImages] = useState<{ before?: ImageChange; after?: ImageChange }>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  // Taux EUR/USD à la date et à l'heure d'entrée du trade.
  // Recalculé quand l'entrée change (sauf si le taux a été saisi à la main) ou à la demande (↻).
  const [fx, setFx] = useState<FxQuote | 'loading' | 'error' | null>(null);
  const fxTouched = useRef(false);
  const fxRequest = useRef(0);
  const loadFx = useCallback(async (entryLocal: string, force: boolean) => {
    if (!entryLocal) return;
    const id = ++fxRequest.current;
    setFx('loading');
    try {
      const q = await fetchEurUsdAt(new Date(localInputToIso(entryLocal)));
      if (id !== fxRequest.current) return; // une saisie plus récente a pris le relais
      setFx(q);
      if (force || !fxTouched.current) setD((x) => ({ ...x, eurUsd: toInput(q.rate) }));
    } catch {
      if (id === fxRequest.current) setFx('error');
    }
  }, []);
  const initialEntry = useRef(d.entryAt);
  useEffect(() => {
    // trade existant : on garde son taux tant que l'heure d'entrée n'est pas modifiée
    if (trade && d.entryAt === initialEntry.current) return;
    const timer = setTimeout(() => void loadFx(d.entryAt, false), 600);
    return () => clearTimeout(timer);
  }, [d.entryAt, trade, loadFx]);
  const fmtFxTime = (at: Date) =>
    at.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const fxHint =
    fx === 'loading'
      ? 'recherche du taux…'
      : fx === 'error'
        ? 'introuvable : taux des réglages'
        : fx?.source === 'minute'
          ? `cours du ${fmtFxTime(fx.at)}`
          : fx?.source === 'bce'
            ? `BCE du ${fx.at.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`
            : trade
              ? 'taux enregistré · ↻ pour recalculer'
              : 'taux à l’entrée';

  const entry = parseDecimal(d.entryPrice);
  const sl = parseDecimal(d.stopLoss);
  const tp = parseDecimal(d.takeProfit);
  const exit = parseDecimal(d.exitPrice);
  const risk = parseDecimal(d.riskPercent);

  const slOk = entry != null && sl != null ? isStopValid(d.direction, entry, sl) : null;
  const tpOk = entry != null && tp != null ? isTakeProfitValid(d.direction, entry, tp) : null;
  const autoR = entry != null && sl != null ? computeR(d.direction, entry, sl, exit) : null;
  const rr = entry != null && sl != null && tp != null ? plannedRR(d.direction, entry, sl, tp) : null;
  const r = d.rManual ? parseDecimal(d.rMultiple) : autoR;

  // Capital au moment du trade = capital de départ + € des trades antérieurs
  const capitalBefore = useMemo(() => {
    const at = d.entryAt ? new Date(localInputToIso(d.entryAt)).getTime() : Date.now();
    const prev = computed.filter((t) => t.id !== trade?.id && new Date(t.entryAt).getTime() < at);
    return prev.length ? prev[prev.length - 1].capitalAfter : settings.startingCapital;
  }, [computed, d.entryAt, trade?.id, settings.startingCapital]);
  const rate = parseDecimal(d.eurUsd);
  const calc = { pipsPerDollar: settings.pipsPerDollar, contractSize: settings.contractSize, eurUsd: rate && rate > 0 ? rate : settings.eurUsd };
  const lots = parseDecimal(d.lots);
  const hasLots = lots != null && lots > 0;
  // Le % de risque est celui que vous saisissez ; les lots donnent seulement le risque réel, à titre indicatif
  const plannedRiskEur = risk != null ? round((capitalBefore * risk) / 100, 2) : null;
  const realRiskEur = hasLots && entry != null && sl != null ? riskEurFromLots(entry, sl, lots, calc) : null;
  const realRiskPct = realRiskEur != null && capitalBefore > 0 ? round((realRiskEur / capitalBefore) * 100, 2) : null;
  const effectiveRisk = risk;
  const autoEur =
    hasLots && entry != null && exit != null
      ? lotsToEur((exit - entry) * (d.direction === 'buy' ? 1 : -1), lots, calc)
      : r != null && risk != null ? computePnlEur(capitalBefore, risk, r) : null;
  const eur = d.eurManual ? parseDecimal(d.pnlManual) : autoEur;
  const pips = (dist: number) => fmtPips(priceToPips(dist, settings.pipsPerDollar));

  const tagSuggestions = useMemo(
    () => [...new Set([...DEFAULT_ERROR_TAGS, ...settings.knownErrorTags, ...trades.flatMap((t) => t.errorTags)])],
    [settings.knownErrorTags, trades],
  );

  const setOutcome = (o: 'tp' | 'sl') => {
    const price = o === 'tp' ? d.takeProfit : d.stopLoss;
    setD((x) => ({ ...x, exitPrice: price, exitAt: x.exitAt || nowLocalInput() }));
  };
  const outcome = entry != null && sl != null && tp != null ? inferOutcome(d.direction, entry, sl, tp, exit) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!d.entryAt) return setError('La date d’entrée est obligatoire.');
    if (entry == null || sl == null || tp == null) return setError('Prix d’entrée, SL et TP sont obligatoires.');
    if (!slOk) return setError(`Le stop loss doit être ${d.direction === 'buy' ? 'sous' : 'au-dessus du'} le prix d’entrée.`);
    if (!tpOk) return setError(`Le take profit doit être ${d.direction === 'buy' ? 'au-dessus du' : 'sous le'} prix d’entrée.`);
    if (d.lots.trim() && !hasLots) return setError('Le nombre de lots doit être un nombre positif (ex. 0,10).');
    if (effectiveRisk == null || effectiveRisk <= 0) return setError('Le % de risque doit être positif.');
    if (hasLots && !(rate && rate > 0)) return setError('Indiquez le taux EUR/USD (ex. 1,11).');
    if (d.eurManual && parseDecimal(d.pnlManual) == null) return setError('Saisissez le résultat en € ou décochez « € exact du broker ».');
    if (d.rManual && parseDecimal(d.rMultiple) == null) return setError('Saisissez le R manuel ou repassez en calcul automatique.');

    const now = new Date().toISOString();
    const t: Trade = {
      // on part du trade existant pour ne perdre aucun champ (y compris d'une version plus récente)
      ...(trade ?? {}),
      id: trade?.id ?? makeId(d.entryAt),
      symbol: 'XAUUSD',
      entryAt: localInputToIso(d.entryAt),
      exitAt: d.exitAt ? localInputToIso(d.exitAt) : null,
      direction: d.direction,
      entryPrice: entry,
      stopLoss: sl,
      takeProfit: tp,
      exitPrice: exit,
      outcome,
      riskPercent: effectiveRisk,
      lots: hasLots ? lots : null,
      eurUsd: hasLots && rate && rate > 0 ? rate : null,
      pnlManual: d.eurManual ? parseDecimal(d.pnlManual) : null,
      rMultiple: r,
      rManual: d.rManual,
      screenshots: trade?.screenshots ?? { before: null, after: null },
      notes: d.notes.trim(),
      emotionBefore: d.emotionBefore,
      emotionAfter: d.emotionAfter,
      discipline: d.discipline,
      errorTags: d.errorTags,
      createdAt: trade?.createdAt ?? now,
      updatedAt: now,
    };
    setSaving(true);
    try {
      await saveTrade(t, images);
      onDone(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const priceInput = (k: 'entryPrice' | 'stopLoss' | 'takeProfit' | 'exitPrice', invalid?: boolean | null) => (
    <input
      className={`field num ${invalid === false ? '!border-loss/60' : ''}`}
      inputMode="decimal"
      autoComplete="off"
      placeholder="0,00"
      value={d[k]}
      onChange={(e) => set(k, e.target.value)}
    />
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <GlassCard title="Exécution">
          <div className="space-y-4">
            <div className="flex [&>div]:w-full">
              <Segmented
                size="lg"
                ariaLabel="Sens"
                value={d.direction}
                onChange={(v) => set('direction', v)}
                options={[
                  { value: 'buy', label: '▲ Achat' },
                  { value: 'sell', label: '▼ Vente' },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Entrée (heure de Paris)">
                <input type="datetime-local" className="field" value={d.entryAt} onChange={(e) => set('entryAt', e.target.value)} required />
              </Field>
              <Field label="Sortie (facultatif)">
                <input type="datetime-local" className="field" value={d.exitAt} onChange={(e) => set('exitAt', e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Prix d'entrée">{priceInput('entryPrice')}</Field>
              <Field label="Stop loss" hint={sl != null && entry != null ? pips(entry - sl) : undefined}>
                {priceInput('stopLoss', slOk)}
              </Field>
              <Field label="Take profit" hint={tp != null && entry != null ? pips(tp - entry) : undefined}>
                {priceInput('takeProfit', tpOk)}
              </Field>
            </div>
            <div>
              <span className="label">Issue</span>
              <div className="grid grid-cols-[1fr_1fr_1.3fr] gap-2">
                <button
                  type="button"
                  onClick={() => setOutcome('tp')}
                  disabled={tp == null}
                  className={`btn border py-3 ${outcome === 'tp' && exit != null ? 'border-gain/60 bg-gain/15 text-gain' : 'border-white/15 bg-white/[0.04] text-white/70'}`}
                >
                  TP touché
                </button>
                <button
                  type="button"
                  onClick={() => setOutcome('sl')}
                  disabled={sl == null}
                  className={`btn border py-3 ${outcome === 'sl' && exit != null ? 'border-loss/60 bg-loss/15 text-loss' : 'border-white/15 bg-white/[0.04] text-white/70'}`}
                >
                  SL touché
                </button>
                {priceInput('exitPrice')}
              </div>
              <span className="mt-1 block text-[11px] text-white/40">Laissez le prix de sortie vide pour un trade encore ouvert.</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Taille & résultat" delay={0.05}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Risque (%)" hint={plannedRiskEur != null ? `≈ ${fmtEur(plannedRiskEur)}` : undefined}>
                <input className="field num" inputMode="decimal" value={d.riskPercent} onChange={(e) => set('riskPercent', e.target.value)} />
              </Field>
              <Field label="Lots" hint="ex. 0,20">
                <input
                  className="field num"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0,00"
                  value={d.lots}
                  onChange={(e) => set('lots', e.target.value)}
                />
              </Field>
              <Field label="EUR/USD" hint={fxHint}>
                <div className="relative">
                  <input
                    className="field num !pr-10"
                    inputMode="decimal"
                    value={d.eurUsd}
                    onChange={(e) => {
                      fxTouched.current = true;
                      set('eurUsd', e.target.value);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      fxTouched.current = false;
                      void loadFx(d.entryAt, true);
                    }}
                    disabled={fx === 'loading'}
                    className="absolute inset-y-0 right-1 my-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-gold"
                    aria-label="Actualiser le taux EUR/USD"
                    title="Taux à l’heure d’entrée"
                  >
                    <Icon name="refresh" size={15} className={fx === 'loading' ? 'animate-spin' : ''} />
                  </button>
                </div>
              </Field>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50">
              <span>
                R:R prévu : <span className="num text-white/80">{rr == null ? '—' : fmtR(rr)}</span>
              </span>
              {realRiskEur != null && (
                <span>
                  Risque réel avec ces lots :{' '}
                  <span className={`num ${realRiskPct != null && risk != null && realRiskPct > risk * 1.1 ? 'text-loss' : 'text-white/80'}`}>
                    {fmtEur(realRiskEur)} ({toInput(realRiskPct)} %)
                  </span>
                </span>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="label">Résultat</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {d.rManual ? (
                    <input
                      className="field num text-xl"
                      inputMode="decimal"
                      value={d.rMultiple}
                      onChange={(e) => set('rMultiple', e.target.value)}
                      placeholder="R"
                      aria-label="R manuel"
                    />
                  ) : (
                    <div className={`num text-3xl font-semibold ${r == null ? 'text-white/30' : resultClass(r)}`}>{r == null ? '— R' : fmtR(r)}</div>
                  )}
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-white/60">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-gold"
                      checked={d.rManual}
                      onChange={(e) => setD((x) => ({ ...x, rManual: e.target.checked, rMultiple: x.rMultiple || toInput(autoR) }))}
                    />
                    R manuel
                  </label>
                </div>
                <div>
                  {d.eurManual ? (
                    <input
                      className="field num text-xl"
                      inputMode="decimal"
                      value={d.pnlManual}
                      onChange={(e) => set('pnlManual', e.target.value)}
                      placeholder="-100,00"
                      aria-label="Résultat en € du broker"
                    />
                  ) : (
                    <div className={`num text-3xl font-semibold ${eur == null ? 'text-white/30' : resultClass(eur)}`}>
                      {eur == null ? '— €' : fmtEur(eur, true)}
                    </div>
                  )}
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-white/60">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-gold"
                      checked={d.eurManual}
                      onChange={(e) =>
                        setD((x) => ({ ...x, eurManual: e.target.checked, pnlManual: x.pnlManual || (autoEur != null ? toInput(autoEur) : '') }))
                      }
                    />
                    € exact du broker
                  </label>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-white/40">
                {d.eurManual
                  ? 'Montant saisi à la main (commissions et swap inclus).'
                  : hasLots
                    ? `€ = mouvement en $ × ${toInput(lots)} lot × ${settings.contractSize} oz ÷ ${toInput(calc.eurUsd)} (EUR/USD). Pour le montant exact au centime, cochez « € exact du broker ».`
                    : '€ = capital au moment du trade × % de risque × R (renseignez les lots pour un calcul exact)'}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Captures d'écran" delay={0.1}>
        <div className="grid gap-4 sm:grid-cols-2">
          <ScreenshotDrop
            label="Avant"
            existing={trade?.screenshots.before ?? null}
            change={images.before}
            onChange={(c) => setImages((x) => ({ ...x, before: c }))}
          />
          <ScreenshotDrop
            label="Après"
            existing={trade?.screenshots.after ?? null}
            change={images.after}
            onChange={(c) => setImages((x) => ({ ...x, after: c }))}
          />
        </div>
      </GlassCard>

      <GlassCard title="Psychologie" delay={0.15}>
        <div className="space-y-5">
          <EmotionPicker label="Émotion avant" value={d.emotionBefore} onChange={(v) => set('emotionBefore', v)} />
          <EmotionPicker label="Émotion après" value={d.emotionAfter} onChange={(v) => set('emotionAfter', v)} />
          <div>
            <span className="label">Discipline</span>
            <StarRating value={d.discipline} onChange={(v) => set('discipline', v)} size={34} />
          </div>
          <div>
            <span className="label">Erreurs</span>
            <TagInput value={d.errorTags} onChange={(v) => set('errorTags', v)} suggestions={tagSuggestions} />
          </div>
          <Field label="Notes">
            <textarea
              className="field min-h-[7rem] resize-y"
              value={d.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Contexte, setup, ce que j'ai bien ou mal fait…"
            />
          </Field>
        </div>
      </GlassCard>

      <div
        className="glass-strong sticky z-30 flex flex-wrap items-center gap-2 bg-night-800/70 p-2 md:static md:bg-transparent md:p-0 md:shadow-none md:border-0 md:backdrop-blur-0"
        style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom))' }}
      >
        {error && <p className="w-full px-1 text-sm text-loss md:w-auto md:flex-1" role="alert">{error}</p>}
        <button type="submit" disabled={saving || syncing} className="btn-gold ml-auto w-full py-3 text-base md:w-auto md:px-8">
          {saving ? 'Enregistrement…' : trade ? 'Enregistrer les modifications' : 'Enregistrer le trade'}
        </button>
      </div>
    </form>
  );
}
