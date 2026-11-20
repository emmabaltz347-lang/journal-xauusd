import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';
import { TagInput } from '../components/ui/TagInput';
import { AppearanceSettings } from '../components/settings/AppearanceSettings';
import { useSettings } from '../hooks/useSettings';
import { useTrades } from '../hooks/useTrades';
import { useToast } from '../hooks/useToast';
import { testAccess } from '../lib/github/client';
import { exportJson, importJson } from '../lib/export/json';
import { parseDecimal, toInput } from '../lib/format';
import { clearLocalTrades } from '../lib/storage';
import type { Account, Trade } from '../types/trade';
import { newAccount } from '../lib/calc/accounts';
import { APP_VERSION, BUILD_TIME, forceUpdate } from '../lib/pwa';

function Row({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-relaxed text-white/45">{hint}</span>}
    </label>
  );
}

export default function SettingsPage() {
  const { settings, update, updateShared, pullShared, sharedStatus } = useSettings();
  const { trades, computed, mode, importTrades, resetDemo, reload, lastSync, localOnly } = useTrades();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);

  const [gh, setGh] = useState({
    owner: settings.owner,
    repo: settings.repo,
    branch: settings.branch,
    token: settings.githubToken,
  });
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  // comptes en cours d'édition (texte saisi)
  type AccDraft = { id: string; name: string; capital: string; risk: string };
  const toDrafts = (list: Account[]): AccDraft[] =>
    list.map((a) => ({ id: a.id, name: a.name, capital: toInput(a.startingCapital), risk: toInput(a.defaultRiskPercent) }));
  const [accDrafts, setAccDrafts] = useState<AccDraft[]>(() => toDrafts(settings.accounts));
  const setAcc = (id: string, patch: Partial<AccDraft>) => setAccDrafts((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const tradeCount = (id: string) => computed.filter((t) => t.accountId === id).length;
  const addAccount = () => {
    const ref = accDrafts[0];
    const base: Account[] = accDrafts.map((a) => ({
      id: a.id,
      name: a.name,
      startingCapital: parseDecimal(a.capital) ?? settings.accounts[0].startingCapital,
      defaultRiskPercent: parseDecimal(a.risk) ?? settings.accounts[0].defaultRiskPercent,
    }));
    const n = newAccount(base, base.find((a) => a.id === ref?.id));
    setAccDrafts((l) => [...l, ...toDrafts([n])]);
  };
  const removeAccount = (id: string) => {
    const n = tradeCount(id);
    if (n) return toast(`Ce compte contient ${n} trade${n > 1 ? 's' : ''} : déplacez-les d'abord vers un autre compte (Récap → Sélectionner → Modifier → Compte).`, 'error');
    if (accDrafts.length <= 1) return toast('Il faut garder au moins un compte.', 'error');
    setAccDrafts((l) => l.filter((a) => a.id !== id));
  };
  const [pipsPerDollar, setPipsPerDollar] = useState(toInput(settings.pipsPerDollar));
  const [contractSize, setContractSize] = useState(toInput(settings.contractSize));
  const [eurUsd, setEurUsd] = useState(toInput(settings.eurUsd));
  const [pending, setPending] = useState<Trade[]>([]);

  // les champs suivent les réglages reçus d'un autre appareil
  useEffect(() => {
    setAccDrafts(toDrafts(settings.accounts));
    setPipsPerDollar(toInput(settings.pipsPerDollar));
    setContractSize(toInput(settings.contractSize));
    setEurUsd(toInput(settings.eurUsd));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.accounts, settings.pipsPerDollar, settings.contractSize, settings.eurUsd]);
  const [fetchingRate, setFetchingRate] = useState(false);

  /** Taux de référence BCE du jour (api.frankfurter.app, gratuit, sans clé) */
  const fetchRate = async () => {
    setFetchingRate(true);
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD');
      const rate = (await res.json())?.rates?.USD;
      if (typeof rate !== 'number') throw new Error();
      setEurUsd(toInput(rate));
      toast(`Taux BCE du jour : ${toInput(rate)}. Cliquez sur Enregistrer pour l'utiliser.`, 'info');
    } catch {
      toast('Impossible de récupérer le taux du jour. Saisissez-le à la main.', 'error');
    } finally {
      setFetchingRate(false);
    }
  };

  // Trades saisis dans ce navigateur avant la connexion à GitHub
  useEffect(() => {
    if (mode === 'github') void localOnly().then(setPending);
  }, [mode, localOnly]);

  const sendLocal = async () => {
    try {
      await importTrades(pending, false);
      clearLocalTrades();
      setPending([]);
      toast(`${pending.length} trade(s) envoyé(s) sur GitHub`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  const saveGitHub = async () => {
    const cfg = { owner: gh.owner.trim(), repo: gh.repo.trim(), branch: gh.branch.trim() || 'main', token: gh.token.trim() };
    if (!cfg.token || !cfg.owner || !cfg.repo) return toast('Renseignez le propriétaire, le repo et le token.', 'error');
    setTesting(true);
    try {
      const info = await testAccess(cfg);
      if (!info.canPush) throw new Error("Le token peut lire le repo mais pas écrire : ajoutez la permission « Contents : Read and write ».");
      if (
        !info.private &&
        !confirm(`⚠️ Le repo ${cfg.owner}/${cfg.repo} est PUBLIC : vos trades et captures seraient visibles par tout le monde.\n\nIndiquez plutôt votre repo de données privé (ex. journal-xauusd-data).\n\nContinuer quand même ?`)
      ) {
        return;
      }
      update({ owner: cfg.owner, repo: cfg.repo, branch: cfg.branch, githubToken: cfg.token });
      void pullShared(true);
      toast(`Connecté à ${cfg.owner}/${cfg.repo}${info.private ? ' (privé ✓)' : ' — repo PUBLIC'}`, info.private ? 'success' : 'error');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setTesting(false);
    }
  };

  const disconnect = () => {
    update({ githubToken: '' });
    setGh((g) => ({ ...g, token: '' }));
    toast('Token supprimé de ce navigateur', 'info');
  };

  const saveTrading = async () => {
    const accounts: Account[] = [];
    for (const a of accDrafts) {
      const c = parseDecimal(a.capital);
      const r = parseDecimal(a.risk);
      if (!a.name.trim()) return toast('Chaque compte doit avoir un nom.', 'error');
      if (c == null || c <= 0 || r == null || r <= 0) return toast(`${a.name} : capital et risque doivent être positifs.`, 'error');
      accounts.push({ id: a.id, name: a.name.trim(), startingCapital: c, defaultRiskPercent: r });
    }
    if (new Set(accounts.map((a) => a.name.toLowerCase())).size !== accounts.length) return toast('Deux comptes ont le même nom.', 'error');
    const p = parseDecimal(pipsPerDollar);
    const cs = parseDecimal(contractSize);
    const fx = parseDecimal(eurUsd);
    if (p == null || p <= 0 || cs == null || cs <= 0 || fx == null || fx <= 0)
      return toast('Pips, taille de lot et taux EUR/USD doivent être positifs.', 'error');
    try {
      await updateShared({ accounts, pipsPerDollar: p, contractSize: cs, eurUsd: fx });
      toast(mode === 'github' ? 'Réglages enregistrés pour tous vos appareils' : 'Réglages enregistrés', 'success');
    } catch (e) {
      toast(`Enregistré sur cet appareil, mais pas sur GitHub : ${e instanceof Error ? e.message : e}`, 'error');
    }
  };

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const incoming = await importJson(f);
      if (importMode === 'replace' && !confirm(`Remplacer les ${trades.length} trades actuels par les ${incoming.length} du fichier ?`)) return;
      await importTrades(incoming, importMode === 'replace');
      toast(`${incoming.length} trades importés`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="Réglages" subtitle="Comptes, apparence et synchronisation · communs à vos appareils connectés (sauf le token)" />

      <GlassCard
        title="Comptes, capital & risque"
        action={
          mode === 'github' && (
            <span className={`chip ${sharedStatus === 'error' ? 'border-loss/40 text-loss' : 'border-gain/30 text-gain'}`}>
              {sharedStatus === 'error' ? 'Non synchronisé' : sharedStatus === 'loading' ? 'Synchronisation…' : 'Commun à vos appareils'}
            </span>
          )
        }
      >
        <div className="space-y-3">
          {accDrafts.map((a, i) => (
            <div key={a.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_0.8fr_auto] sm:items-end">
                <Row label={i === 0 ? 'Nom du compte (principal)' : 'Nom du compte'}>
                  <input className="field" value={a.name} onChange={(e) => setAcc(a.id, { name: e.target.value })} placeholder="ex. FTMO 100k" />
                </Row>
                <Row label="Capital de départ (€)">
                  <input className="field num" inputMode="decimal" value={a.capital} onChange={(e) => setAcc(a.id, { capital: e.target.value })} />
                </Row>
                <Row label="Risque par défaut (%)">
                  <input className="field num" inputMode="decimal" value={a.risk} onChange={(e) => setAcc(a.id, { risk: e.target.value })} />
                </Row>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <span className="text-[11px] text-white/45 sm:hidden">
                    {tradeCount(a.id)} trade{tradeCount(a.id) > 1 ? 's' : ''}
                  </span>
                  {accDrafts.length > 1 && (
                    <button type="button" className="btn-danger !px-3 !py-2.5" onClick={() => removeAccount(a.id)} aria-label={`Supprimer ${a.name}`}>
                      <Icon name="trash" size={15} />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1.5 hidden text-[11px] text-white/45 sm:block">
                {tradeCount(a.id)} trade{tradeCount(a.id) > 1 ? 's' : ''} · le capital actuel = départ + gains cumulés de ce compte
              </p>
            </div>
          ))}
          <button type="button" className="btn-ghost w-full border-dashed" onClick={addAccount}>
            <Icon name="plus" size={16} /> Ajouter un compte
          </button>
          <p className="text-[11px] text-white/45">
            Un nouveau compte reprend le capital et le % de risque du compte principal (modifiables). Pips, onces par lot et taux EUR/USD ci-dessous
            sont communs à tous les comptes.
          </p>
        </div>
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
          <Row label="Pips pour 1 $" hint="10 : de 3903,56 à 3913,56 = 100 pips">
            <input className="field num" inputMode="decimal" value={pipsPerDollar} onChange={(e) => setPipsPerDollar(e.target.value)} />
          </Row>
          <Row label="Onces par lot" hint="100 chez la plupart des brokers (1 lot = 100 oz)">
            <input className="field num" inputMode="decimal" value={contractSize} onChange={(e) => setContractSize(e.target.value)} />
          </Row>
          <Row label="Taux EUR/USD par défaut" hint="1 € = x $. Pré-rempli dans chaque nouveau trade, modifiable trade par trade.">
            <div className="flex gap-2">
              <input className="field num" inputMode="decimal" value={eurUsd} onChange={(e) => setEurUsd(e.target.value)} />
              <button type="button" className="btn-ghost shrink-0 !px-3" onClick={fetchRate} disabled={fetchingRate}>
                {fetchingRate ? '…' : 'Taux du jour'}
              </button>
            </div>
          </Row>
        </div>
        <button className="btn-gold mt-4" onClick={saveTrading}>
          Enregistrer
        </button>
      </GlassCard>

      <AppearanceSettings />

      <GlassCard
        title={
          <span className="flex items-center gap-2">
            <Icon name="cloud" size={16} /> Synchronisation GitHub
          </span>
        }
        action={
          <span className={`chip ${mode === 'github' ? 'border-gain/40 text-gain' : 'border-gold/40 text-gold'}`}>
            {mode === 'github' ? 'Connecté' : 'Mode démo'}
          </span>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Row label="Propriétaire" hint="Votre identifiant GitHub">
            <input className="field" autoCapitalize="none" autoCorrect="off" value={gh.owner} onChange={(e) => setGh({ ...gh, owner: e.target.value })} placeholder="mon-pseudo" />
          </Row>
          <Row label="Repo de données (privé)" hint="Pas le repo de l'application">
            <input className="field" autoCapitalize="none" autoCorrect="off" value={gh.repo} onChange={(e) => setGh({ ...gh, repo: e.target.value })} />
          </Row>
          <Row label="Branche">
            <input className="field" autoCapitalize="none" value={gh.branch} onChange={(e) => setGh({ ...gh, branch: e.target.value })} />
          </Row>
        </div>
        <div className="mt-3">
          <Row
            label="Token fine-grained"
            hint="Limité à ce seul repo, permission « Contents : Read and write ». Il reste dans le localStorage de ce navigateur et n'est jamais envoyé ailleurs qu'à api.github.com."
          >
            <div className="flex gap-2">
              <input
                className="field num"
                type={showToken ? 'text' : 'password'}
                autoComplete="off"
                autoCapitalize="none"
                value={gh.token}
                onChange={(e) => setGh({ ...gh, token: e.target.value })}
                placeholder="github_pat_…"
              />
              <button type="button" className="btn-ghost shrink-0" onClick={() => setShowToken((s) => !s)}>
                {showToken ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </Row>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-gold" onClick={saveGitHub} disabled={testing}>
            <Icon name="check" size={16} /> {testing ? 'Vérification…' : 'Tester et enregistrer'}
          </button>
          {mode === 'github' && (
            <>
              <button className="btn-ghost" onClick={() => void reload()}>
                <Icon name="refresh" size={16} /> Recharger depuis GitHub
              </button>
              <button className="btn-danger" onClick={disconnect}>
                Oublier le token
              </button>
            </>
          )}
        </div>
        {mode === 'github' && lastSync && (
          <p className="mt-3 text-[11px] text-white/45">
            Dernière synchronisation : {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}. L'app se
            met à jour toute seule quand vous revenez dessus et toutes les minutes.
          </p>
        )}
        {mode === 'github' && pending.length > 0 && (
          <div className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm">
            <p className="text-white/85">
              <strong className="text-gold">{pending.length} trade{pending.length > 1 ? 's' : ''}</strong> ont été saisis dans ce navigateur avant la
              connexion à GitHub : ils ne sont pas encore synchronisés avec vos autres appareils.
            </p>
            <button className="btn-gold mt-3" onClick={sendLocal}>
              Envoyer ces trades sur GitHub
            </button>
          </div>
        )}
      </GlassCard>

      <GlassCard title="Tags d'erreur proposés" delay={0.1}>
        <p className="mb-3 text-xs text-white/50">
          Les tags par défaut et ceux déjà utilisés dans vos trades sont toujours proposés. Ajoutez ici vos propres tags récurrents.
        </p>
        <TagInput
          value={settings.knownErrorTags}
          onChange={(v) => void updateShared({ knownErrorTags: v }).catch(() => toast('Tags enregistrés sur cet appareil seulement', 'error'))}
          suggestions={[]}
        />
      </GlassCard>

      <GlassCard title="Sauvegarde de secours" delay={0.15}>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-ghost" onClick={() => exportJson(trades)}>
            <Icon name="download" size={16} /> Exporter JSON
          </button>
          <button className="btn-ghost" onClick={() => file.current?.click()}>
            <Icon name="upload" size={16} /> Importer JSON
          </button>
          <select className="field !w-auto !py-2" value={importMode} onChange={(e) => setImportMode(e.target.value as typeof importMode)} aria-label="Mode d'import">
            <option value="merge">Fusionner (par id)</option>
            <option value="replace">Remplacer tout</option>
          </select>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <p className="mt-2 text-[11px] text-white/45">
          L'export JSON contient les chemins des captures, pas les images elles-mêmes (elles restent dans <code>data/screenshots/</code>). Les exports PDF et JPG
          sont sur le Dashboard et dans le Récap trades.
        </p>
        {mode === 'local' && (
          <button
            className="btn-danger mt-4"
            onClick={() => confirm('Effacer les trades locaux et recharger la démo ?') && void resetDemo()}
          >
            Réinitialiser la démo
          </button>
        )}
      </GlassCard>
      <div className="flex justify-center">
        <button className="btn-ghost" onClick={() => void forceUpdate()}>
          <Icon name="refresh" size={16} /> Forcer la mise à jour de l'app
        </button>
      </div>
      <p className="pb-4 text-center text-[11px] text-white/35">
        Version {APP_VERSION} du {BUILD_TIME.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} ·{' '}
        {trades.length} trade{trades.length > 1 ? 's' : ''} · {mode === 'github' ? `${settings.owner}/${settings.repo}` : 'mode démo (local)'}
      </p>
    </div>
  );
}
