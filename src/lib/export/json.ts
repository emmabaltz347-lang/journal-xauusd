import type { Trade } from '../../types/trade';
import { parseTradesFile, serializeTrades } from '../github/repository';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportJson(trades: Trade[]) {
  downloadBlob(
    new Blob([serializeTrades(trades)], { type: 'application/json' }),
    `journal-xauusd-${stamp()}.json`,
  );
}

export async function importJson(file: File): Promise<Trade[]> {
  const text = await file.text();
  try {
    return parseTradesFile(text).trades;
  } catch (e) {
    throw new Error(`Fichier JSON invalide : ${e instanceof Error ? e.message.slice(0, 200) : e}`);
  }
}

/** Fusionne par id : les trades importés remplacent ceux qui existent déjà */
export function mergeTrades(current: Trade[], incoming: Trade[]): Trade[] {
  const map = new Map(current.map((t) => [t.id, t]));
  incoming.forEach((t) => map.set(t.id, t));
  return [...map.values()];
}

export { stamp };
