import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { ComputedTrade } from '../../types/trade';
import { EMOTION_EMOJI } from '../../types/trade';
import { fmtDateLong, fmtEur, fmtPips, fmtPrice, fmtR, fmtTime, resultClass } from '../../lib/format';
import { plannedRR } from '../../lib/calc/trade';
import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import { StarRating } from '../ui/StarRating';
import { Screenshot } from './Thumbnail';
import { useTrades } from '../../hooks/useTrades';
import { useToast } from '../../hooks/useToast';

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white/45">{label}</div>
      <div className="num mt-0.5 text-sm text-white">{children}</div>
    </div>
  );
}

export function DirectionBadge({ d }: { d: 'buy' | 'sell' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        d === 'buy' ? 'bg-gain/15 text-gain' : 'bg-loss/15 text-loss'
      }`}
    >
      <Icon name={d === 'buy' ? 'up' : 'down'} size={12} strokeWidth={2.5} />
      {d === 'buy' ? 'Achat' : 'Vente'}
    </span>
  );
}

export function TradeDetailModal({ trade, onClose }: { trade: ComputedTrade | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { deleteTrade } = useTrades();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const t = trade;

  const onDelete = async () => {
    if (!t) return;
    try {
      onClose();
      await deleteTrade(t.id);
      toast('Trade supprimé', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  return (
    <Modal
      open={!!t}
      onClose={() => {
        setConfirm(false);
        onClose();
      }}
      wide
      title={
        t && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <DirectionBadge d={t.direction} />
              <span className={`num text-2xl font-semibold ${resultClass(t.r)}`}>{t.closed ? fmtR(t.r) : 'En cours'}</span>
              {t.closed && (
                <span className={`num text-sm ${resultClass(t.pnlEur)}`} title={t.pnlSource === 'manual' ? 'Montant saisi (broker)' : t.pnlSource === 'lots' ? 'Calculé avec les lots' : 'Calculé avec le % de risque'}>
                  {fmtEur(t.pnlEur, true)}
                </span>
              )}
              {t.outcome && <span className="chip">{t.outcome === 'tp' ? 'Take profit' : 'Stop loss'}</span>}
            </div>
            <div className="mt-1 text-sm text-white/55 first-letter:uppercase">
              {fmtDateLong(t.entryAt)}
              {t.exitAt && <span> → sortie {fmtTime(t.exitAt)}</span>}
            </div>
          </div>
        )
      }
    >
      {t && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Screenshot path={t.screenshots.before} label="Avant" />
            <Screenshot path={t.screenshots.after} label="Après" />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Info label="Entrée">{fmtPrice(t.entryPrice)}</Info>
            <Info label="Stop loss">{fmtPrice(t.stopLoss)}</Info>
            <Info label="Take profit">{fmtPrice(t.takeProfit)}</Info>
            <Info label="Sortie">{fmtPrice(t.exitPrice)}</Info>
            <Info label="Risque SL">{fmtPips(t.slPips)}</Info>
            <Info label="R:R prévu">{(() => { const rr = plannedRR(t.direction, t.entryPrice, t.stopLoss, t.takeProfit); return rr == null ? '—' : fmtR(rr); })()}</Info>
            <Info label="Lots">{t.lots != null ? String(t.lots).replace('.', ',') : '—'}</Info>
            <Info label="Risque">
              {fmtEur(t.riskEur)} · {String(t.riskPercent).replace('.', ',')} %
            </Info>
            <Info label="Capital avant">{fmtEur(t.capitalBefore)}</Info>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="label">Émotions</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="chip">{t.emotionBefore ? `${EMOTION_EMOJI[t.emotionBefore]} ${t.emotionBefore}` : '—'}</span>
                <span className="text-white/35">→</span>
                <span className="chip">{t.emotionAfter ? `${EMOTION_EMOJI[t.emotionAfter]} ${t.emotionAfter}` : '—'}</span>
              </div>
            </div>
            <div>
              <div className="label">Discipline</div>
              <StarRating value={t.discipline} size={20} />
            </div>
            <div>
              <div className="label">Erreurs</div>
              <div className="flex flex-wrap gap-1.5">
                {t.errorTags.length ? (
                  t.errorTags.map((e) => (
                    <span key={e} className="chip border-loss/30 text-loss">
                      {e}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gain">Aucune ✓</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="label">Notes</div>
            <p className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-relaxed text-white/80">
              {t.notes || <span className="text-white/35">Aucune note.</span>}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
            {confirm ? (
              <>
                <span className="mr-auto self-center text-sm text-loss">Supprimer définitivement ce trade ?</span>
                <button className="btn-ghost" onClick={() => setConfirm(false)}>
                  Annuler
                </button>
                <button className="btn-danger" onClick={onDelete}>
                  Oui, supprimer
                </button>
              </>
            ) : (
              <>
                <button className="btn-danger" onClick={() => setConfirm(true)}>
                  <Icon name="trash" size={16} /> Supprimer
                </button>
                <button className="btn-gold" onClick={() => navigate(`/modifier/${t.id}`)}>
                  <Icon name="edit" size={16} /> Modifier
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
