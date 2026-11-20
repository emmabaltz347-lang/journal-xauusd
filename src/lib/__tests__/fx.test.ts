import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchEurUsd } from '../fx';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.unstubAllGlobals());

describe('fetchEurUsd', () => {
  it('cours en direct', async () => {
    vi.stubGlobal('fetch', async () => json({ data: { currency: 'EUR', rates: { USD: '1.110634' } } }));
    const q = await fetchEurUsd();
    expect(q).toMatchObject({ rate: 1.1106, source: 'live' });
  });
  it('repli sur la BCE si le direct échoue', async () => {
    vi.stubGlobal('fetch', async (url: string) =>
      url.includes('coinbase') ? json({}, 503) : json({ date: '2026-11-19', rates: { USD: 1.1112 } }),
    );
    expect(await fetchEurUsd()).toMatchObject({ rate: 1.1112, source: 'bce' });
  });
  it('refuse un taux aberrant', async () => {
    vi.stubGlobal('fetch', async () => json({ data: { rates: { USD: '0' } }, rates: { USD: 0 } }));
    await expect(fetchEurUsd()).rejects.toThrow();
  });
  it('échec réseau total', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('offline');
    });
    await expect(fetchEurUsd()).rejects.toThrow();
  });
});
