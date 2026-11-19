import type { ComputedTrade } from '../../types/trade';
import type { Theme } from '../theme';
import { hexToChannels, luminance } from '../theme';
import { computeStats } from '../calc/stats';
import type { RecapRow } from '../calc/recap';
import { fmtDate, fmtEur, fmtPF, fmtPct, fmtPips, fmtPrice, fmtR, fmtTime } from '../format';
import { stamp } from './json';

// Les polices standard du PDF ne gèrent pas les espaces fines insécables produites par Intl
const clean = (s: string) => s.replace(/[  ]/g, ' ');
const rgb = (hex: string) => hexToChannels(hex).split(' ').map(Number) as [number, number, number];

interface Options {
  trades: ComputedTrade[];
  recap: RecapRow[];
  recapTitle: string;
  periodLabel: string;
  filtersLabel: string;
  theme: Theme;
}

/** PDF « Récap trades » : synthèse, récap par période et liste détaillée des trades */
export async function exportTradesPdf({ trades, recap, recapTitle, periodLabel, filtersLabel, theme }: Options) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const accent = rgb(theme.accent);
  const gain = rgb(theme.gain);
  const loss = rgb(theme.loss);
  const ink: [number, number, number] = [30, 30, 36];
  const muted: [number, number, number] = [110, 110, 120];
  const W = pdf.internal.pageSize.getWidth();
  const sorted = [...trades].sort((a, b) => a.entryAt.localeCompare(b.entryAt));
  const s = computeStats(sorted);

  // En-tête
  pdf.setFillColor(...accent);
  pdf.rect(0, 0, W, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...ink);
  pdf.text('Récap trades XAUUSD', 14, 16);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...muted);
  pdf.text(clean(`${periodLabel}${filtersLabel ? ` · ${filtersLabel}` : ''}`), 14, 22);
  pdf.text(clean(`Édité le ${fmtDate(new Date().toISOString())}`), W - 14, 16, { align: 'right' });

  // Synthèse
  const kpis: [string, string, [number, number, number]?][] = [
    ['Résultat', fmtR(s.totalR), s.totalR >= 0 ? gain : loss],
    ['Résultat €', fmtEur(s.totalEur, true), s.totalEur >= 0 ? gain : loss],
    ['Trades', String(s.count)],
    ['Winrate', fmtPct(s.winrate)],
    ['Espérance', fmtR(s.expectancy)],
    ['Profit factor', fmtPF(s.profitFactor)],
    ['Drawdown max', `${fmtR(-s.maxDrawdownR)} · ${fmtPct(-s.maxDrawdownPct)}`],
    ['Gain / perte moy.', `${fmtR(s.avgWinR)} / ${fmtR(s.avgLossR)}`],
  ];
  const boxW = (W - 28 - 7 * 3) / 8;
  kpis.forEach(([label, value, color], i) => {
    const x = 14 + i * (boxW + 3);
    pdf.setDrawColor(225, 225, 230);
    pdf.setFillColor(248, 248, 250);
    pdf.roundedRect(x, 27, boxW, 16, 2, 2, 'FD');
    pdf.setFontSize(7);
    pdf.setTextColor(...muted);
    pdf.text(label.toUpperCase(), x + 3, 32);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(value.length > 16 ? 8 : 10.5);
    pdf.setTextColor(...(color ?? ink));
    pdf.text(clean(value), x + 3, 39);
    pdf.setFont('helvetica', 'normal');
  });

  const colorByValue = (v: number) => (v > 0 ? gain : v < 0 ? loss : ink);
  const head = { fillColor: accent, textColor: (luminance(theme.accent) > 0.45 ? [20, 20, 20] : [255, 255, 255]) as [number, number, number], fontStyle: 'bold' as const, fontSize: 8 };

  // Récap par période
  let y = 50;
  if (recap.length) {
    pdf.setFontSize(11);
    pdf.setTextColor(...ink);
    pdf.setFont('helvetica', 'bold');
    pdf.text(recapTitle, 14, y);
    pdf.setFont('helvetica', 'normal');
    autoTable(pdf, {
      startY: y + 3,
      head: [['Période', 'Trades', 'Gagnants', 'Perdants', 'Winrate', 'Résultat R', 'Résultat €', 'Meilleur', 'Pire']],
      body: recap.map((r) => [
        r.label,
        r.count,
        r.wins,
        r.losses,
        clean(fmtPct(r.winrate, 0)),
        clean(fmtR(r.totalR)),
        clean(fmtEur(r.totalEur, true)),
        clean(fmtR(r.bestR)),
        clean(fmtR(r.worstR)),
      ]),
      styles: { fontSize: 8, cellPadding: 1.8, textColor: ink },
      headStyles: head,
      alternateRowStyles: { fillColor: [247, 247, 249] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' }, 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' } },
      didParseCell: (d) => {
        if (d.section === 'body' && (d.column.index === 5 || d.column.index === 6)) {
          d.cell.styles.textColor = colorByValue(recap[d.row.index][d.column.index === 5 ? 'totalR' : 'totalEur']);
        }
      },
      margin: { left: 14, right: 14 },
    });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Détail des trades
  pdf.setFontSize(11);
  pdf.setTextColor(...ink);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Détail des trades (${sorted.length})`, 14, y);
  pdf.setFont('helvetica', 'normal');
  autoTable(pdf, {
    startY: y + 3,
    head: [['Date', 'Heure', 'Sens', 'Entrée', 'SL', 'TP', 'Sortie', 'Risque SL', 'R', '€', 'Émotions', 'Disc.', 'Erreurs', 'Notes']],
    body: sorted.map((t) => [
      fmtDate(t.entryAt),
      fmtTime(t.entryAt),
      t.direction === 'buy' ? 'Achat' : 'Vente',
      clean(fmtPrice(t.entryPrice)),
      clean(fmtPrice(t.stopLoss)),
      clean(fmtPrice(t.takeProfit)),
      clean(fmtPrice(t.exitPrice)),
      clean(fmtPips(t.slPips)),
      t.closed ? clean(fmtR(t.r)) : 'en cours',
      clean(fmtEur(t.pnlEur, true)),
      `${t.emotionBefore ?? '-'} > ${t.emotionAfter ?? '-'}`,
      t.discipline ? `${t.discipline}/5` : '-',
      t.errorTags.join(', '),
      t.notes,
    ]),
    styles: { fontSize: 7, cellPadding: 1.5, textColor: ink, overflow: 'linebreak', valign: 'top' },
    headStyles: head,
    alternateRowStyles: { fillColor: [247, 247, 249] },
    columnStyles: {
      0: { cellWidth: 17 },
      1: { cellWidth: 10 },
      2: { cellWidth: 11 },
      3: { halign: 'right', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 15 },
      5: { halign: 'right', cellWidth: 15 },
      6: { halign: 'right', cellWidth: 15 },
      7: { halign: 'right', cellWidth: 16 },
      8: { halign: 'right', fontStyle: 'bold', cellWidth: 14 },
      9: { halign: 'right', cellWidth: 18 },
      10: { cellWidth: 30 },
      11: { halign: 'center', cellWidth: 10 },
      12: { cellWidth: 28 },
      13: { cellWidth: 'auto' },
    },
    didParseCell: (d) => {
      if (d.section !== 'body') return;
      const t = sorted[d.row.index];
      if (d.column.index === 8) d.cell.styles.textColor = colorByValue(t.r);
      if (d.column.index === 9) d.cell.styles.textColor = colorByValue(t.pnlEur);
      if (d.column.index === 12 && t.errorTags.length) d.cell.styles.textColor = loss;
      if (d.column.index === 2) d.cell.styles.textColor = t.direction === 'buy' ? gain : loss;
    },
    margin: { left: 14, right: 14 },
  });

  // Pied de page
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(...muted);
    pdf.text(`Journal XAUUSD · page ${i}/${pages}`, W - 14, pdf.internal.pageSize.getHeight() - 6, { align: 'right' });
  }
  pdf.save(`journal-xauusd-recap-trades-${stamp()}.pdf`);
}
