import { useEffect, useRef, useState } from 'react';
import { compressImage, type CompressedImage } from '../../lib/image/compress';
import { useScreenshot } from '../../hooks/useScreenshot';
import { Icon } from '../ui/Icon';
import type { ImageChange } from '../../hooks/useTrades';

const kb = (n: number) => `${Math.round(n / 1024).toLocaleString('fr-FR')} Ko`;

export function ScreenshotDrop({
  label,
  existing,
  change,
  onChange,
}: {
  label: string;
  existing: string | null;
  change: ImageChange;
  onChange: (c: ImageChange) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const remote = useScreenshot(change === undefined ? existing : null);

  useEffect(() => {
    if (change && change !== 'remove') {
      const url = URL.createObjectURL(change.blob);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [change]);

  const handle = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Ce fichier n’est pas une image.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onChange(await compressImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image illisible');
    } finally {
      setBusy(false);
    }
  };

  const shown = preview ?? (change === 'remove' ? null : remote.url);
  const info = change && change !== 'remove' ? (change as CompressedImage) : null;

  return (
    <div>
      <div className="label">{label}</div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handle(e.dataTransfer.files[0]);
        }}
        onPaste={(e) => void handle(e.clipboardData.files[0])}
        className={`relative flex aspect-[16/10] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed transition ${
          over ? 'border-gold bg-gold/10' : 'border-white/20 bg-white/[0.04] hover:border-gold/50'
        }`}
      >
        {shown ? (
          <img src={shown} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 p-4 text-center text-white/45">
            <Icon name="camera" size={28} />
            <span className="text-sm">{busy ? 'Compression…' : 'Photo, galerie ou glisser-déposer'}</span>
            <span className="hidden text-[11px] text-white/30 md:block">Collage (⌘V) accepté</span>
          </div>
        )}
        {busy && <div className="absolute inset-0 animate-pulse bg-night-900/50" />}
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handle(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      <div className="mt-1.5 flex min-h-[1.5rem] items-center justify-between gap-2 text-[11px] text-white/40">
        <span>
          {error ? <span className="text-loss">{error}</span> : info ? `${info.ext.toUpperCase()} · ${info.width}×${info.height} · ${kb(info.blob.size)}` : ''}
        </span>
        {shown && (
          <button type="button" className="text-loss hover:underline" onClick={() => onChange(existing ? 'remove' : undefined)}>
            Retirer
          </button>
        )}
      </div>
    </div>
  );
}
