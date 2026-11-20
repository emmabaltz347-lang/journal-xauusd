import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { TagInput } from '../ui/TagInput';
import { useSettings } from '../../hooks/useSettings';
import { useTrades } from '../../hooks/useTrades';
import { useToast } from '../../hooks/useToast';
import { parseDecimal } from '../../lib/format';
import { DEFAULT_ERROR_TAGS, EMOTIONS, EMOTION_EMOJI, type Emotion, type Trade } from '../../types/trade';

const KEEP = '__keep__';
const NONE = '__none__';

/** Modification simultanée de plusieurs trades : seuls les champs renseignés sont appliqués */
export function BulkEditModal({ ids, open, onClose, onDone }: { ids: string[]; open: boolean; onClose: () => void; onDone: () => void }) {
  const { settings } = useSettings();
  const { trades, updateMany } = useTrades();
  const toast = useToast();
  const [account, setAccount] = useState(KEEP);
  const [risk, setRisk] = useState('');
  const [lots, setLots] = useState('');
  const [eurUsd, setEurUsd] = useState('');
  const [emoBefore, setEmoBefore] = useState(KEEP);
  const [emoAfter, setEmoAfter] = useState(KEEP);
  const [discipline, setDiscipline] = useState(KEEP);
  const [tags, setTags] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<'add' | 'replace' | 'remove'>('add');
  const [saving, setSaving] = useState(false);

  const suggestions = useMemo(
    () => [...new Set([...DEFAULT_ERROR_TAGS, ...settings.knownErrorTags, ...trades.flatMap((t) => t.errorTags)])],
    [settings.knownErrorTags, trades],
  );

  const reset = () => {
    setAccount(KEEP);
    setRisk('');
    setLots('');
    setEurUsd('');
    setEmoBefore(KEEP);
    setEmoAfter(KEEP);
    setDiscipline(KEEP);
    setTags([]);
    setTagMode('add');
  };

  const apply = async () => {
    const r = risk.trim() ? parseDecimal(risk) : null;
    const l = lots.trim() ? parseDecimal(lots) : null;
    const fx = eurUsd.trim() ? parseDecimal(eurUsd) : null;
    if ((risk.trim() && !(r && r > 0)) || (lots.trim() && !(l && l > 0)) || (eurUsd.trim() && !(fx && fx > 0))) {
      toast('Risque, lots et EUR/USD doivent être des nombres positifs.', 'error');
      return;
    }
    const emo = (v: string): Emotion | null | undefined => (v === KEEP ? undefined : v === NONE ? null : (v as Emotion));
    const patch = (t: Trade): Trade => {
      const next: Trade = { ...t };
      if (account !== KEEP) next.accountId = account;
      if (r) next.riskPercent = r;
      if (l) next.lots = l;
      if (fx) next.eurUsd = fx;
      const eb = emo(emoBefore);
      const ea = emo(emoAfter);
      if (eb !== undefined) next.emotionBefore = eb;
      if (ea !== undefined) next.emotionAfter = ea;
      if (discipline !== KEEP) next.discipline = discipline === NONE ? null : Number(discipline);
      if (tagMode === 'replace') next.errorTags = [...tags];
      else if (tagMode === 'add' && tags.length) next.errorTags = [...new Set([...t.errorTags, ...tags])];
      else if (tagMode === 'remove' && tags.length) next.errorTags = t.errorTags.filter((x) => !tags.includes(x));
      return next;
    };
    setSaving(true);
    try {
      await updateMany(ids, patch);
      toast(`${ids.length} trade${ids.length > 1 ? 's' : ''} modifié${ids.length > 1 ? 's' : ''}`, 'success');
      reset();
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const sel = 'field';
  const keepOpt = <option value={KEEP}>— Ne pas modifier —</option>;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div>
          <div className="text-lg font-semibold text-white">
            Modifier {ids.length} trade{ids.length > 1 ? 's' : ''}
          </div>
          <div className="text-sm text-white/50">Seuls les champs que vous remplissez sont modifiés.</div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block">
            <span className="label">Compte</span>
            <select className={sel} value={account} onChange={(e) => setAccount(e.target.value)}>
              {keepOpt}
              {settings.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          {settings.accounts.length < 2 && (
              <span className="mt-1 block text-[11px] text-white/45">
                Un seul compte pour l'instant ·{' '}
                <Link to="/reglages" className="text-gold underline">
                  ajouter un compte
                </Link>
              </span>
            )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="label">Risque (%)</span>
            <input className="field num" inputMode="decimal" placeholder="inchangé" value={risk} onChange={(e) => setRisk(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Lots</span>
            <input className="field num" inputMode="decimal" placeholder="inchangé" value={lots} onChange={(e) => setLots(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">EUR/USD</span>
            <input className="field num" inputMode="decimal" placeholder="inchangé" value={eurUsd} onChange={(e) => setEurUsd(e.target.value)} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ['Émotion avant', emoBefore, setEmoBefore],
              ['Émotion après', emoAfter, setEmoAfter],
            ] as const
          ).map(([label, value, setter]) => (
            <label key={label} className="block">
              <span className="label">{label}</span>
              <select className={sel} value={value} onChange={(e) => setter(e.target.value)}>
                {keepOpt}
                <option value={NONE}>Aucune</option>
                {EMOTIONS.map((e) => (
                  <option key={e} value={e}>
                    {EMOTION_EMOJI[e]} {e}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <label className="block">
          <span className="label">Discipline</span>
          <select className={sel} value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
            {keepOpt}
            <option value={NONE}>Aucune note</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)} ({n}/5)
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="label">Erreurs</span>
          <select className={`${sel} mb-2`} value={tagMode} onChange={(e) => setTagMode(e.target.value as typeof tagMode)}>
            <option value="add">Ajouter ces erreurs aux trades</option>
            <option value="remove">Retirer ces erreurs des trades</option>
            <option value="replace">Remplacer toutes les erreurs par celles-ci</option>
          </select>
          <TagInput value={tags} onChange={setTags} suggestions={suggestions} />
          {tagMode === 'replace' && !tags.length && (
            <p className="mt-1 text-[11px] text-loss">Sans tag, toutes les erreurs des trades sélectionnés seront effacées.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
          <button className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn-gold" onClick={apply} disabled={saving}>
            {saving ? 'Enregistrement…' : `Appliquer à ${ids.length} trade${ids.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
