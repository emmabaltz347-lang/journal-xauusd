import { EMOTIONS, EMOTION_EMOJI, type Emotion } from '../../types/trade';

export function EmotionPicker({ value, onChange, label }: { value: Emotion | null; onChange: (e: Emotion | null) => void; label: string }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {EMOTIONS.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={value === e}
            onClick={() => onChange(value === e ? null : e)}
            className={`rounded-xl border px-3 py-2 text-sm transition active:scale-95 ${
              value === e ? 'border-gold/70 bg-gold/15 text-gold' : 'border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
            }`}
          >
            <span className="mr-1">{EMOTION_EMOJI[e]}</span>
            {e}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
