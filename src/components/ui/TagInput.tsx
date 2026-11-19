import { useState } from 'react';

export function TagInput({
  value,
  onChange,
  suggestions,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
}) {
  const [draft, setDraft] = useState('');
  const add = (tag: string) => {
    const t = tag.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  const remaining = suggestions.filter((s) => !value.includes(s));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="chip border-loss/40 bg-loss/10 text-loss"
            aria-label={`Retirer ${t}`}
          >
            {t} <span aria-hidden>×</span>
          </button>
        ))}
        <input
          className="field !w-auto min-w-[10rem] flex-1 !py-2"
          placeholder="Ajouter une erreur…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="chip hover:border-gold/50 hover:text-gold">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
