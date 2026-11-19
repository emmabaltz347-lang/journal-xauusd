export function StarRating({
  value,
  onChange,
  size = 28,
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
  size?: number;
}) {
  return (
    <div className="flex gap-1" role={onChange ? 'radiogroup' : undefined} aria-label="Discipline sur 5">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = (value ?? 0) >= n;
        const Star = (
          <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z"
              style={{ fill: on ? 'rgb(var(--c-accent))' : 'transparent', stroke: on ? 'rgb(var(--c-accent))' : 'rgba(255,255,255,0.3)' }}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        );
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} sur 5`}
            onClick={() => onChange(value === n ? null : n)}
            className="rounded-lg p-0.5 transition active:scale-90"
          >
            {Star}
          </button>
        ) : (
          <span key={n}>{Star}</span>
        );
      })}
    </div>
  );
}
