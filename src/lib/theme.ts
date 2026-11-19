/** Thème visuel du dashboard : couleurs et typographie, réglables dans les Réglages */

export type FontText = 'inter' | 'manrope' | 'jakarta' | 'dmsans' | 'outfit' | 'sora' | 'spacegrotesk';
export type FontNum = 'same' | 'jetbrains' | 'plexmono' | 'dmmono' | 'robotomono';
export type TextScale = 'sm' | 'md' | 'lg';

export interface Theme {
  preset: string;
  accent: string; // chiffres clés, boutons, sélection
  gain: string;
  loss: string;
  bgFrom: string; // dégradé de fond : haut gauche
  bgTo: string; // bas droite
  glow: string; // halo coloré du fond
  fontText: FontText;
  fontNum: FontNum;
  scale: TextScale;
}

export const FONTS_TEXT: Record<FontText, { label: string; family: string }> = {
  manrope: { label: 'Manrope', family: "'Manrope'" },
  inter: { label: 'Inter', family: "'Inter'" },
  jakarta: { label: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans'" },
  dmsans: { label: 'DM Sans', family: "'DM Sans'" },
  outfit: { label: 'Outfit', family: "'Outfit'" },
  sora: { label: 'Sora', family: "'Sora'" },
  spacegrotesk: { label: 'Space Grotesk', family: "'Space Grotesk'" },
};

export const FONTS_NUM: Record<FontNum, { label: string; family: string | null }> = {
  same: { label: 'Comme le texte (chiffres alignés)', family: null },
  jetbrains: { label: 'JetBrains Mono', family: "'JetBrains Mono'" },
  plexmono: { label: 'IBM Plex Mono', family: "'IBM Plex Mono'" },
  dmmono: { label: 'DM Mono', family: "'DM Mono'" },
  robotomono: { label: 'Roboto Mono', family: "'Roboto Mono'" },
};

type PresetColors = Omit<Theme, 'preset' | 'fontText' | 'fontNum' | 'scale'>;

export const PRESETS: Record<string, { label: string; colors: PresetColors; fontText: FontText; fontNum: FontNum }> = {
  graphite: {
    label: 'Graphite',
    colors: { accent: '#d9b56c', gain: '#3ecf8e', loss: '#f2706b', bgFrom: '#0e0f13', bgTo: '#1c1d24', glow: '#3a3326' },
    fontText: 'manrope',
    fontNum: 'same',
  },
  nuit: {
    label: 'Or de nuit',
    colors: { accent: '#e6c068', gain: '#34d399', loss: '#ff6b6b', bgFrom: '#070a1f', bgTo: '#2a1250', glow: '#4a2078' },
    fontText: 'inter',
    fontNum: 'jetbrains',
  },
  ocean: {
    label: 'Océan',
    colors: { accent: '#5ec8e5', gain: '#4ade80', loss: '#fb7185', bgFrom: '#03121c', bgTo: '#0b2a3d', glow: '#0e4a5e' },
    fontText: 'dmsans',
    fontNum: 'same',
  },
  rose: {
    label: 'Or rose',
    colors: { accent: '#e8b4a0', gain: '#6ee7b7', loss: '#f87171', bgFrom: '#140b12', bgTo: '#2d1623', glow: '#5a2a3d' },
    fontText: 'jakarta',
    fontNum: 'same',
  },
  foret: {
    label: 'Forêt',
    colors: { accent: '#e2c275', gain: '#86efac', loss: '#fca5a5', bgFrom: '#06110d', bgTo: '#12261c', glow: '#1f4a35' },
    fontText: 'outfit',
    fontNum: 'dmmono',
  },
  minuit: {
    label: 'Noir absolu',
    colors: { accent: '#f5f5f4', gain: '#22c55e', loss: '#ef4444', bgFrom: '#000000', bgTo: '#0a0a0a', glow: '#1c1c1c' },
    fontText: 'sora',
    fontNum: 'plexmono',
  },
};

export function themeFromPreset(id: string, scale: TextScale = 'md'): Theme {
  const p = PRESETS[id] ?? PRESETS.graphite;
  return { preset: id, ...p.colors, fontText: p.fontText, fontNum: p.fontNum, scale };
}

export const DEFAULT_THEME: Theme = themeFromPreset('graphite');

/** "#e6c068" → "230 192 104" (format attendu par Tailwind avec <alpha-value>) */
export function hexToChannels(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const n = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return '0 0 0';
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Mélange deux couleurs hex (t = 0 → a, 1 → b) */
export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToChannels(a).split(' ').map(Number);
  const cb = hexToChannels(b).split(' ').map(Number);
  return '#' + ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

const SCALE: Record<TextScale, string> = { sm: '15px', md: '16px', lg: '17.5px' };

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set('--c-accent', hexToChannels(t.accent));
  set('--c-accent-light', hexToChannels(mixHex(t.accent, '#ffffff', 0.35)));
  set('--c-accent-dark', hexToChannels(mixHex(t.accent, '#000000', 0.25)));
  set('--c-gain', hexToChannels(t.gain));
  set('--c-loss', hexToChannels(t.loss));
  set('--c-bg-from', hexToChannels(t.bgFrom));
  set('--c-bg-to', hexToChannels(t.bgTo));
  set('--c-bg-mid', hexToChannels(mixHex(t.bgFrom, t.bgTo, 0.5)));
  set('--c-glow', hexToChannels(t.glow));
  set('--c-on-accent', hexToChannels(luminance(t.accent) > 0.45 ? '#111111' : '#ffffff'));
  set('--font-text', `${FONTS_TEXT[t.fontText].family}, system-ui, sans-serif`);
  const num = FONTS_NUM[t.fontNum].family;
  set('--font-num', num ? `${num}, ui-monospace, monospace` : 'var(--font-text)');
  root.style.fontSize = SCALE[t.scale];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bgFrom);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToChannels(hex)
    .split(' ')
    .map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
