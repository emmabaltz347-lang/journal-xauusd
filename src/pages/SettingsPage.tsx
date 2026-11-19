import { useRef, useState, type ReactNode } from 'react';
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
  const { settings, update } = useSettings();
  const { trades, mode, importTrades, resetDemo, reload } = useTrades();
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
  const [capital, setCapital] = useState(toInput(settings.startingCapital));
  const [risk, setRisk] = useState(toInput(settings.defaultRiskPercent));
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

  const saveTrading = () => {
    const c = parseDecimal(capital);
    const r = parseDecimal(risk);
    if (c == null || c <= 0 || r == null || r <= 0) return toast('Capital et risque doivent être positifs.', 'error');
    update({ startingCapital: c, defaultRiskPercent: r });
    toast('Réglages enregistrés', 'success');
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
      <PageHeader title="Réglages" subtitle="Capital, risque, apparence et synchronisation · stockés dans ce navigateur" />

      <GlassCard title="Capital & risque" >
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="Capital de départ (€)" hint="Le capital actuel = départ + gains cumulés. Les € de chaque trade sont recalculés.">
            <input className="field num" inputMode="decimal" value={capital} onChange={(e) => setCapital(e.target.value)} />
          </Row>
          <Row label="Risque par défaut (%)" hint="Pré-rempli dans le formulaire, modifiable trade par trade.">
            <input className="field num" inputMode="decimal" value={risk} onChange={(e) => setRisk(e.target.value)} />
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
      </GlassCard>

      <GlassCard title="Tags d'erreur proposés" delay={0.1}>
        <p className="mb-3 text-xs text-white/50">
          Les tags par défaut et ceux déjà utilisés dans vos trades sont toujours proposés. Ajoutez ici vos propres tags récurrents.
        </p>
        <TagInput
          value={settings.knownErrorTags}
          onChange={(v) => update({ knownErrorTags: v })}
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
    </div>
  );
}
