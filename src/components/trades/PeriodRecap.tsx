import type { RecapKind, RecapRow } from '../../lib/calc/recap';
import { fmtEur, fmtPct, fmtR, resultClass } from '../../lib/format';
import { Segmented } from '../ui/Segmented';

export const RECAP_TITLES: Record<RecapKind, string> = {
  week: 'Récap par semaine',
  month: 'Récap par mois',
  quarter: 'Récap par trimestre',
};

export function PeriodRecap({
  rows,
  kind,
  onKind,
  onPick,
}: {
  rows: RecapRow[];
  kind: RecapKind;
  onKind: (k: RecapKind) => void;
  onPick: (r: RecapRow) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.totalR)));
  return (
    <div className="glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-3">
        <h2 className="text-sm font-semibold text-title/90">{RECAP_TITLES[kind]}</h2>
        <Segmented
          ariaLabel="Regrouper par"
          value={kind}
          onChange={onKind}
          options={[
            { value: 'week', label: 'Semaine' },
            { value: 'month', label: 'Mois' },
            { value: 'quarter', label: 'Trimestre' },
          ]}
        />
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-white/40">Aucun trade clôturé sur cette sélection.</div>
      ) : (
        <div className="max-h-[22rem] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-night-800/90 backdrop-blur">
              <tr className="text-left text-[11px] uppercase tracking-wider text-white/45">
                <th className="px-3 py-2.5 font-medium">Période</th>
                <th className="px-3 py-2.5 text-right font-medium">Trades</th>
                <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Winrate</th>
                <th className="hidden w-[30%] px-3 py-2.5 font-medium md:table-cell" />
                <th className="px-3 py-2.5 text-right font-medium">R</th>
                <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">€</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  onClick={() => onPick(r)}
                  title="Filtrer sur cette période"
                  className="cursor-pointer border-t border-white/[0.06] transition hover:bg-white/[0.05]"
                >
                  <td className="px-3 py-2.5 text-white/85">{r.label}</td>
                  <td className="num px-3 py-2.5 text-right text-white/70">
                    {r.count}
                    <span className="ml-1 text-[11px] text-white/35">
                      ({r.wins}/{r.losses})
                    </span>
                  </td>
                  <td className="num hidden px-3 py-2.5 text-right text-white/70 sm:table-cell">{fmtPct(r.winrate, 0)}</td>
                  <td className="hidden px-3 py-2.5 md:table-cell">
                    <div className="relative h-2 rounded-full bg-white/[0.05]">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
                      <div
                        className={`absolute inset-y-0 rounded-full ${r.totalR >= 0 ? 'left-1/2 bg-gain' : 'right-1/2 bg-loss'}`}
                        style={{ width: `${(Math.abs(r.totalR) / max) * 50}%` }}
                      />
                    </div>
                  </td>
                  <td className={`num px-3 py-2.5 text-right font-semibold ${resultClass(r.totalR)}`}>{fmtR(r.totalR)}</td>
                  <td className={`num hidden px-3 py-2.5 text-right sm:table-cell ${resultClass(r.totalEur)}`}>{fmtEur(r.totalEur, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
