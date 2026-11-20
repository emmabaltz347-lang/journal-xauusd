import type { Account, ComputedTrade, Trade } from '../../types/trade';

export const DEFAULT_ACCOUNT_ID = 'principal';

export function defaultAccounts(startingCapital = 10000, defaultRiskPercent = 1): Account[] {
  return [{ id: DEFAULT_ACCOUNT_ID, name: 'Compte principal', startingCapital, defaultRiskPercent }];
}

/** Compte d'un trade : celui enregistré s'il existe encore, sinon le premier compte */
export function accountIdOf(t: Pick<Trade, 'accountId'>, accounts: Account[]): string {
  const id = t.accountId;
  if (id && accounts.some((a) => a.id === id)) return id;
  return accounts[0]?.id ?? DEFAULT_ACCOUNT_ID;
}

/** Nouveau compte : reprend les réglages du compte de référence (capital et % de risque) */
export function newAccount(accounts: Account[], from?: Account): Account {
  const ref = from ?? accounts[0];
  let n = accounts.length + 1;
  const names = new Set(accounts.map((a) => a.name));
  while (names.has(`Compte ${n}`)) n++;
  return {
    id: `cpt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    name: `Compte ${n}`,
    startingCapital: ref?.startingCapital ?? 10000,
    defaultRiskPercent: ref?.defaultRiskPercent ?? 1,
  };
}

/**
 * Capital cumulé des comptes `ids` juste avant la date `at`
 * (capital de départ + résultats des trades antérieurs de chaque compte).
 */
export function capitalAt(computed: ComputedTrade[], accounts: Account[], ids: string[], at: number): number {
  let total = 0;
  for (const id of ids) {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) continue;
    let cap = acc.startingCapital;
    for (const t of computed) {
      if (t.accountId === id && new Date(t.entryAt).getTime() < at) cap = t.capitalAfter;
    }
    total += cap;
  }
  return total;
}

/** Capital actuel et capital de départ des comptes `ids` */
export function currentCapital(computed: ComputedTrade[], accounts: Account[], ids: string[]) {
  const start = accounts.filter((a) => ids.includes(a.id)).reduce((s, a) => s + a.startingCapital, 0);
  return { start, current: capitalAt(computed, accounts, ids, Number.POSITIVE_INFINITY) };
}
