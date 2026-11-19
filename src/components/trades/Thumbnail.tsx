import { useScreenshot } from '../../hooks/useScreenshot';
import { Icon } from '../ui/Icon';

export function Thumbnail({ path, className = 'h-10 w-14', alt = '' }: { path: string | null; className?: string; alt?: string }) {
  const { url, loading } = useScreenshot(path);
  return (
    <div className={`overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] ${className}`}>
      {url ? (
        <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className={`flex h-full w-full items-center justify-center text-white/25 ${loading ? 'animate-pulse' : ''}`}>
          <Icon name="image" size={16} />
        </div>
      )}
    </div>
  );
}

export function Screenshot({ path, label }: { path: string | null; label: string }) {
  const { url, loading, error } = useScreenshot(path);
  return (
    <figure className="min-w-0">
      <figcaption className="label">{label}</figcaption>
      <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="h-full w-full" title="Ouvrir en plein écran">
            <img src={url} alt={label} className="h-full w-full object-contain" />
          </a>
        ) : (
          <span className={`text-sm text-white/35 ${loading ? 'animate-pulse' : ''}`}>
            {loading ? 'Chargement…' : error ? 'Capture introuvable' : 'Pas de capture'}
          </span>
        )}
      </div>
    </figure>
  );
}
