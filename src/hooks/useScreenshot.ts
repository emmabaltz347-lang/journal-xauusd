import { useEffect, useState } from 'react';
import { fetchScreenshot } from '../lib/github/repository';
import { useSettings } from './useSettings';

const cache = new Map<string, Promise<string>>();

/** Résout le chemin d'une capture en URL affichable (blob authentifié, data URL ou fichier démo) */
export function useScreenshot(path: string | null | undefined): { url: string | null; loading: boolean; error: boolean } {
  const { repo } = useSettings();
  const [state, setState] = useState<{ url: string | null; loading: boolean; error: boolean }>({
    url: null,
    loading: !!path,
    error: false,
  });

  useEffect(() => {
    if (!path) {
      setState({ url: null, loading: false, error: false });
      return;
    }
    if (path.startsWith('data:') || path.startsWith('blob:')) {
      setState({ url: path, loading: false, error: false });
      return;
    }
    if (!repo) {
      // mode démo / local : les captures d'exemple sont servies avec l'application
      const name = path.split('/').pop();
      setState({ url: `${import.meta.env.BASE_URL}demo/screenshots/${name}`, loading: false, error: false });
      return;
    }
    let alive = true;
    const key = `${repo.owner}/${repo.repo}@${repo.branch}:${path}`;
    if (!cache.has(key)) {
      cache.set(
        key,
        fetchScreenshot(repo, path).then((b) => URL.createObjectURL(b)),
      );
    }
    setState((s) => ({ ...s, loading: true, error: false }));
    cache
      .get(key)!
      .then((url) => alive && setState({ url, loading: false, error: false }))
      .catch(() => {
        cache.delete(key);
        if (alive) setState({ url: null, loading: false, error: true });
      });
    return () => {
      alive = false;
    };
  }, [path, repo]);

  return state;
}
