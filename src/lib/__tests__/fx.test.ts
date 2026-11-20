import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchEurUsdAt } from '../fx';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.unstubAllGlobals());

const entry = new Date('2026-11-18T09:30:27+01:00'); // 08:30:27 UTC

describe('fetchEurUsdAt', () => {
  it('cours de la minute d’entrée (Binance EUR/USDT)', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      return json([[Date.parse('2026-11-18T08:30:00Z'), '1.11063', '1.1107', '1.1105', '1.1106', '100']]);
    });
    const q = await fetchEurUsdAt(entry);
    expect(q).toMatchObject({ rate: 1.1106, source: 'minute' });
    expect(q.at.toISOString()).toBe('2026-11-18T08:30:00.000Z');
    expect(urls[0]).toContain('symbol=EURUSDT');
    expect(urls[0]).toContain(`startTime=${Date.parse('2026-11-18T08:30:00Z')}`);
  });

  it('second domaine Binance si le premier échoue', async () => {
    vi.stubGlobal('fetch', async (url: string) =>
      url.includes('binance.vision') ? json({}, 451) : json([[Date.parse('2026-11-18T08:30:00Z'), '1.1111']]),
    );
    expect((await fetchEurUsdAt(entry)).rate).toBe(1.1111);
  });

  it('repli sur le taux BCE du jour de l’entrée', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      return url.includes('frankfurter') ? json({ date: '2026-11-18', rates: { USD: 1.1098 } }) : json([], 200);
    });
    const q = await fetchEurUsdAt(entry);
    expect(q).toMatchObject({ rate: 1.1098, source: 'bce' });
    expect(urls.at(-1)).toContain('frankfurter.app/2026-11-18');
  });

  it('échec réseau total', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('offline');
    });
    await expect(fetchEurUsdAt(entry)).rejects.toThrow();
  });
});
