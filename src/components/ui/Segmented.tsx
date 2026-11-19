interface Option<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'sm',
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  size?: 'sm' | 'lg';
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex rounded-xl border border-white/15 bg-white/[0.05] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg font-medium transition ${size === 'lg' ? 'flex-1 px-5 py-3 text-base' : 'px-3 py-1.5 text-xs'} ${
            value === o.value ? 'bg-gold text-onaccent shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
