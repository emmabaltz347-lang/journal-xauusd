import { GlassCard } from '../ui/GlassCard';
import { Segmented } from '../ui/Segmented';
import { useSettings } from '../../hooks/useSettings';
import {
  DEFAULT_THEME,
  FONTS_NUM,
  FONTS_TEXT,
  PRESETS,
  themeFromPreset,
  type FontNum,
  type FontText,
  type Theme,
} from '../../lib/theme';

const COLOR_FIELDS: { key: keyof Theme; label: string; hint: string }[] = [
  { key: 'accent', label: 'Accent', hint: 'Chiffres clés, boutons' },
  { key: 'gain', label: 'Gains', hint: 'Résultats positifs' },
  { key: 'loss', label: 'Pertes', hint: 'Résultats négatifs' },
  { key: 'bgFrom', label: 'Fond 1', hint: 'Haut du dégradé' },
  { key: 'bgTo', label: 'Fond 2', hint: 'Bas du dégradé' },
  { key: 'glow', label: 'Halo', hint: 'Lueur animée' },
];

function Swatches({ c }: { c: Pick<Theme, 'bgFrom' | 'bgTo' | 'accent' | 'gain' | 'loss'> }) {
  return (
    <div className="relative h-14 overflow-hidden rounded-xl" style={{ background: `linear-gradient(135deg, ${c.bgFrom}, ${c.bgTo})` }}>
      <div className="absolute bottom-2 left-2 flex gap-1.5">
        {[c.accent, c.gain, c.loss].map((x, i) => (
          <span key={i} className="h-4 w-4 rounded-full ring-1 ring-white/20" style={{ background: x }} />
        ))}
      </div>
    </div>
  );
}

export function AppearanceSettings() {
  const { settings, updateShared, sharedStatus, repo } = useSettings();
  const update = (patch: { theme: Theme }) => void updateShared(patch).catch(() => {});
  const t = settings.theme;
  const set = (patch: Partial<Theme>, custom = true) => update({ theme: { ...t, ...patch, ...(custom ? { preset: 'custom' } : {}) } });

  return (
    <GlassCard title="Apparence du dashboard" delay={0.05}>
      <div className="space-y-6">
        <div>
          <span className="label">Thèmes prêts à l'emploi</span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(PRESETS).map(([id, p]) => (
              <button
                key={id}
                type="button"
                onClick={() => update({ theme: themeFromPreset(id, t.scale) })}
                className={`rounded-2xl border p-2 text-left transition ${
                  t.preset === id ? 'border-gold bg-white/[0.08]' : 'border-white/10 hover:border-white/30'
                }`}
                aria-pressed={t.preset === id}
              >
                <Swatches c={p.colors} />
                <div className="mt-2 flex items-center justify-between gap-2 px-1">
                  <span className="text-sm text-white" style={{ fontFamily: FONTS_TEXT[p.fontText].family }}>
                    {p.label}
                  </span>
                  <span className="truncate text-[10px] text-white/40">{FONTS_TEXT[p.fontText].label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">
            Couleurs {t.preset === 'custom' && <span className="normal-case tracking-normal text-gold">· personnalisées</span>}
          </span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {COLOR_FIELDS.map((f) => (
              <label key={f.key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 hover:bg-white/[0.07]">
                <input
                  type="color"
                  value={t[f.key] as string}
                  onChange={(e) => set({ [f.key]: e.target.value })}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                />
                <span className="min-w-0">
                  <span className="block text-sm text-white">{f.label}</span>
                  <span className="block truncate text-[11px] text-white/45">{f.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Police du texte</span>
            <select className="field" value={t.fontText} onChange={(e) => set({ fontText: e.target.value as FontText }, false)}>
              {Object.entries(FONTS_TEXT).map(([id, f]) => (
                <option key={id} value={id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Police des chiffres</span>
            <select className="field" value={t.fontNum} onChange={(e) => set({ fontNum: e.target.value as FontNum }, false)}>
              {Object.entries(FONTS_NUM).map(([id, f]) => (
                <option key={id} value={id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="label">Taille du texte</span>
            <Segmented
              ariaLabel="Taille du texte"
              value={t.scale}
              onChange={(v) => set({ scale: v }, false)}
              options={[
                { value: 'sm', label: 'Petite' },
                { value: 'md', label: 'Normale' },
                { value: 'lg', label: 'Grande' },
              ]}
            />
          </div>
          <button type="button" className="btn-ghost" onClick={() => update({ theme: DEFAULT_THEME })}>
            Thème par défaut
          </button>
        </div>

        <div>
          <span className="label">Aperçu</span>
          <div className="glass grid grid-cols-3 gap-3 p-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/50">Résultat</div>
              <div className="num mt-1 text-xl font-semibold text-gain md:text-2xl">+18,00 R</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/50">Capital</div>
              <div className="num mt-1 text-xl font-semibold text-gold md:text-2xl">11 828 €</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/50">Drawdown</div>
              <div className="num mt-1 text-xl font-semibold text-loss md:text-2xl">−2,00 R</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-white/40">
            S'applique tout de suite{repo ? ' et sur tous vos appareils connectés' : ''}.
            {sharedStatus === 'saving' && ' Enregistrement…'}
            {sharedStatus === 'error' && ' ⚠️ Non synchronisé (réseau ou token).'}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
