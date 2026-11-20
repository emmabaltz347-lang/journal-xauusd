import { GlassCard } from '../ui/GlassCard';
import { Segmented } from '../ui/Segmented';
import { useSettings } from '../../hooks/useSettings';
import { Icon } from '../ui/Icon';
import {
  DEFAULT_GLASS,
  FONTS_NUM,
  contrastRatio,
  luminance,
  mixHex,
  FONTS_TEXT,
  defaultThemeLibrary,
  newThemeId,
  sameStyle,
  styleOf,
  themeFromSaved,
  type FontNum,
  type FontText,
  type SavedTheme,
  type Theme,
} from '../../lib/theme';

const COLOR_FIELDS: { key: keyof Theme; label: string; hint: string }[] = [
  { key: 'accent', label: 'Accent', hint: 'Chiffres clés, boutons' },
  { key: 'gain', label: 'Gains', hint: 'Résultats positifs' },
  { key: 'loss', label: 'Pertes', hint: 'Résultats négatifs' },
  { key: 'bgFrom', label: 'Fond 1', hint: 'Haut du dégradé' },
  { key: 'bgTo', label: 'Fond 2', hint: 'Bas du dégradé' },
  { key: 'glow', label: 'Halo', hint: 'Lueur animée' },
  { key: 'title', label: 'Titres', hint: 'Titres et libellés' },
  { key: 'text', label: 'Textes', hint: 'Texte courant, axes' },
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

function glassLabel(g: number) {
  if (g <= 5) return 'Très transparent';
  if (g < DEFAULT_GLASS) return 'Transparent';
  if (g === DEFAULT_GLASS) return "Verre d'origine";
  if (g < 70) return 'Dépoli';
  if (g < 100) return 'Presque opaque';
  return 'Opaque';
}

export function AppearanceSettings() {
  const { settings, updateShared, sharedStatus, repo } = useSettings();
  const save = (patch: { theme?: Theme; themeLibrary?: SavedTheme[] }) => void updateShared(patch).catch(() => {});
  const update = (patch: { theme: Theme }) => save(patch);
  const t = settings.theme;
  const library = settings.themeLibrary;
  // les retouches gardent le thème d'origine sélectionné (pour pouvoir les enregistrer dedans)
  const set = (patch: Partial<Theme>) => update({ theme: { ...t, ...patch } });

  // le curseur bouge vite : affichage immédiat, enregistrement groupé (updateShared regroupe déjà les envois)
  const setGlass = (glass: number) => set({ glass });

  // lisibilité : contraste des titres et textes sur le fond
  const bgMid = mixHex(t.bgFrom, t.bgTo, 0.5);
  const lowContrast = (['title', 'text'] as const).filter((k) => Math.min(contrastRatio(t[k] ?? '#ffffff', t.bgFrom), contrastRatio(t[k] ?? '#ffffff', bgMid)) < 4.5);

  const active = library.find((x) => x.id === t.preset) ?? null;
  const modified = active ? !sameStyle(active.style, styleOf(t)) : true;

  const apply = (x: SavedTheme) => update({ theme: themeFromSaved(x, t.scale) });
  const saveInto = (x: SavedTheme) =>
    save({ themeLibrary: library.map((y) => (y.id === x.id ? { ...y, style: styleOf(t) } : y)), theme: { ...t, preset: x.id } });
  const saveAsNew = () => {
    const name = prompt('Nom du nouveau thème :', active ? `${active.name} (perso)` : 'Mon thème')?.trim();
    if (!name) return;
    const x: SavedTheme = { id: newThemeId(), name: name.slice(0, 40), style: styleOf(t) };
    save({ themeLibrary: [...library, x], theme: { ...t, preset: x.id } });
  };
  const rename = (x: SavedTheme) => {
    const name = prompt('Nouveau nom du thème :', x.name)?.trim();
    if (name) save({ themeLibrary: library.map((y) => (y.id === x.id ? { ...y, name: name.slice(0, 40) } : y)) });
  };
  const remove = (x: SavedTheme) => {
    if (library.length <= 1) return;
    if (!confirm(`Supprimer le thème « ${x.name} » ?`)) return;
    save({ themeLibrary: library.filter((y) => y.id !== x.id), ...(t.preset === x.id ? { theme: { ...t, preset: 'custom' } } : {}) });
  };
  const restore = () => {
    if (!confirm("Remettre les thèmes d'origine tels qu'ils étaient au départ ? Vos thèmes personnels sont conservés.")) return;
    const originals = defaultThemeLibrary();
    const ids = new Set(originals.map((o) => o.id));
    save({ themeLibrary: [...originals, ...library.filter((y) => !ids.has(y.id))] });
  };

  return (
    <GlassCard title="Apparence du dashboard" delay={0.05}>
      <div className="space-y-6">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="label !mb-0">Mes thèmes</span>
            <button type="button" className="text-[11px] text-white/45 hover:text-gold" onClick={restore}>
              Restaurer les thèmes d'origine
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {library.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => apply(x)}
                className={`rounded-2xl border p-2 text-left transition ${
                  t.preset === x.id ? 'border-gold bg-white/[0.08]' : 'border-white/10 hover:border-white/30'
                }`}
                aria-pressed={t.preset === x.id}
              >
                <Swatches c={x.style} />
                <div className="mt-2 flex items-center justify-between gap-2 px-1">
                  <span className="truncate text-sm text-white" style={{ fontFamily: FONTS_TEXT[x.style.fontText]?.family }}>
                    {x.name}
                  </span>
                  <span className="shrink-0 truncate text-[10px] text-white/40">{FONTS_TEXT[x.style.fontText]?.label}</span>
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={saveAsNew}
              className="flex min-h-[6.5rem] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/20 p-2 text-sm text-white/60 transition hover:border-gold/60 hover:text-gold"
            >
              <Icon name="plus" size={20} />
              Nouveau thème
              <span className="text-[10px] text-white/40">avec les couleurs actuelles</span>
            </button>
          </div>

          {/* Actions sur le thème actif */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm">
            <span className="mr-auto text-white/70">
              {active ? (
                <>
                  Thème actif : <strong className="text-white">{active.name}</strong>
                  {modified && <span className="text-gold"> · modifié, non enregistré</span>}
                </>
              ) : (
                <span className="text-gold">Couleurs personnalisées, non enregistrées</span>
              )}
            </span>
            {active && modified && (
              <button type="button" className="btn-gold !px-3 !py-1.5 !text-xs" onClick={() => saveInto(active)}>
                Enregistrer dans « {active.name} »
              </button>
            )}
            {modified && (
              <button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={saveAsNew}>
                Enregistrer comme nouveau thème
              </button>
            )}
            {active && modified && (
              <button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => apply(active)}>
                Annuler les retouches
              </button>
            )}
            {active && (
              <>
                <button type="button" className="btn-ghost !px-2.5 !py-1.5" onClick={() => rename(active)} aria-label="Renommer le thème" title="Renommer">
                  <Icon name="edit" size={14} />
                </button>
                {library.length > 1 && (
                  <button type="button" className="btn-danger !px-2.5 !py-1.5" onClick={() => remove(active)} aria-label="Supprimer le thème" title="Supprimer">
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div>
          <span className="label">
            Couleurs du thème {active && <span className="normal-case tracking-normal text-white/40">· retouchez-les puis enregistrez</span>}
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
          {lowContrast.length > 0 && (
            <p className="mt-2 rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-[12px] text-loss">
              ⚠️ {lowContrast.map((k) => (k === 'title' ? 'les titres' : 'les textes')).join(' et ')} risquent d'être difficiles à lire sur ce fond. Choisissez une couleur plus {luminance(t.bgFrom) < 0.2 ? 'claire' : 'foncée'}.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Police du texte</span>
            <select className="field" value={t.fontText} onChange={(e) => set({ fontText: e.target.value as FontText })}>
              {Object.entries(FONTS_TEXT).map(([id, f]) => (
                <option key={id} value={id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Police des chiffres</span>
            <select className="field" value={t.fontNum} onChange={(e) => set({ fontNum: e.target.value as FontNum })}>
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
              onChange={(v) => set({ scale: v })}
              options={[
                { value: 'sm', label: 'Petite' },
                { value: 'md', label: 'Normale' },
                { value: 'lg', label: 'Grande' },
              ]}
            />
          </div>
          <div className="min-w-[14rem] flex-1">
            <div className="flex items-center justify-between">
              <span className="label">Transparence des cartes</span>
              <span className="num text-xs text-gold">{glassLabel(t.glass ?? DEFAULT_GLASS)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={t.glass ?? DEFAULT_GLASS}
              onChange={(e) => setGlass(Number(e.target.value))}
              className="w-full accent-gold"
              aria-label="Transparence des cartes"
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>Très transparent</span>
              <button type="button" className="hover:text-gold" onClick={() => setGlass(DEFAULT_GLASS)}>
                Verre d'origine
              </button>
              <span>Opaque</span>
            </div>
          </div>
        </div>

        <div>
          <span className="label">Aperçu</span>
          <div className="glass grid grid-cols-3 gap-3 p-4">
            <div className="col-span-3">
              <div className="text-sm font-semibold text-title/90">Titre d'une carte</div>
              <p className="mt-0.5 text-xs text-white/60">Exemple de texte courant : 11 gagnants · 9 perdants</p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-title/60">Résultat</div>
              <div className="num mt-1 text-xl font-semibold text-gain md:text-2xl">+18,00 R</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-title/60">Capital</div>
              <div className="num mt-1 text-xl font-semibold text-gold md:text-2xl">11 828 €</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-title/60">Drawdown</div>
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
