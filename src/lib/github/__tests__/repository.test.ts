import { afterEach, describe, expect, it, vi } from 'vitest';
import { base64ToUtf8, utf8ToBase64 } from '../client';
import { mutateTrades, serializeTrades } from '../repository';
import { mkTrade } from '../../calc/__tests__/fixtures';

const cfg = { token: 't', owner: 'moi', repo: 'journal-xauusd', branch: 'main' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe('base64 UTF-8', () => {
  it('aller-retour avec accents et émojis', () => {
    const s = 'stressée 😰 « entrée trop tôt »';
    expect(base64ToUtf8(utf8ToBase64(s))).toBe(s);
  });
});

describe('mutateTrades', () => {
  it('relit, modifie et commit avec le sha courant', async () => {
    const existing = mkTrade({ id: 'a' });
    const calls: { method: string; body?: any }[] = [];
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      calls.push({ method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (method === 'GET') return json({ sha: 'sha1', encoding: 'base64', content: utf8ToBase64(serializeTrades([existing])) });
      return json({ content: { sha: 'sha2' } });
    });
    const added = mkTrade({ id: 'b' });
    const res = await mutateTrades(cfg, (l) => [...l, added], 'ajout');
    expect(res.map((t) => t.id)).toEqual(['a', 'b']);
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(put.body.sha).toBe('sha1');
    expect(put.body.branch).toBe('main');
    expect(JSON.parse(base64ToUtf8(put.body.content)).trades).toHaveLength(2);
  });

  it('réessaie après un conflit 409', async () => {
    let puts = 0;
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'GET') return json({ sha: `sha${puts}`, encoding: 'base64', content: utf8ToBase64(serializeTrades([])) });
      puts++;
      return puts === 1 ? json({ message: 'conflict' }, 409) : json({ content: { sha: 'ok' } });
    });
    await mutateTrades(cfg, (l) => [...l, mkTrade()], 'ajout');
    expect(puts).toBe(2);
  });

  it('remonte une erreur 401 en français', async () => {
    vi.stubGlobal('fetch', async () => json({ message: 'Bad credentials' }, 401));
    await expect(mutateTrades(cfg, (l) => l, 'x')).rejects.toThrow(/Token invalide/);
  });
});
