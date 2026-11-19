/**
 * Client minimal pour l'API "contents" de GitHub.
 * https://docs.github.com/rest/repos/contents
 */
export interface RepoConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const API = 'https://api.github.com';

function headers(cfg: RepoConfig, accept = 'application/vnd.github+json'): HeadersInit {
  return {
    Accept: accept,
    Authorization: `Bearer ${cfg.token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

const encPath = (path: string) => path.split('/').map(encodeURIComponent).join('/');
const url = (cfg: RepoConfig, path: string) =>
  `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${encPath(path)}`;

async function check(res: Response): Promise<Response> {
  if (res.ok) return res;
  let msg = res.statusText;
  try {
    const body = await res.json();
    msg = body.message ?? msg;
  } catch {
    /* corps non JSON */
  }
  const fr: Record<number, string> = {
    401: 'Token invalide ou expiré.',
    403: 'Accès refusé : vérifiez la permission « Contents : Read and write » du token.',
    404: 'Introuvable : vérifiez le propriétaire, le nom du repo, la branche et que le token a accès à ce repo.',
    409: 'Conflit de version (fichier modifié ailleurs).',
    422: 'Requête refusée par GitHub.',
  };
  throw new GitHubError(res.status, `${fr[res.status] ?? 'Erreur GitHub'} (${res.status} : ${msg})`);
}

// --- base64 UTF-8 ---------------------------------------------------------
export function utf8ToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}
export function base64ToUtf8(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// --- opérations -----------------------------------------------------------
export interface TextFile {
  text: string;
  sha: string;
}

/** Lit un fichier texte. Retourne null s'il n'existe pas. Gère les fichiers > 1 Mo. */
export async function getTextFile(cfg: RepoConfig, path: string): Promise<TextFile | null> {
  const res = await fetch(`${url(cfg, path)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: headers(cfg),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  await check(res);
  const meta = await res.json();
  if (meta.content && meta.encoding === 'base64') {
    return { text: base64ToUtf8(meta.content), sha: meta.sha };
  }
  // fichier volumineux : contenu brut demandé séparément
  const raw = await check(
    await fetch(`${url(cfg, path)}?ref=${encodeURIComponent(cfg.branch)}`, {
      headers: headers(cfg, 'application/vnd.github.raw+json'),
      cache: 'no-store',
    }),
  );
  return { text: await raw.text(), sha: meta.sha };
}

/** Crée ou met à jour un fichier (contenu déjà en base64) */
export async function putFile(
  cfg: RepoConfig,
  path: string,
  base64: string,
  message: string,
  sha?: string,
): Promise<string> {
  const res = await check(
    await fetch(url(cfg, path), {
      method: 'PUT',
      headers: { ...headers(cfg), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content: base64, branch: cfg.branch, ...(sha ? { sha } : {}) }),
    }),
  );
  const body = await res.json();
  return body.content.sha as string;
}

export async function getFileSha(cfg: RepoConfig, path: string): Promise<string | null> {
  const res = await fetch(`${url(cfg, path)}?ref=${encodeURIComponent(cfg.branch)}`, {
    method: 'GET',
    headers: headers(cfg),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  await check(res);
  return (await res.json()).sha;
}

export async function deleteFile(cfg: RepoConfig, path: string, message: string): Promise<void> {
  const sha = await getFileSha(cfg, path);
  if (!sha) return;
  await check(
    await fetch(url(cfg, path), {
      method: 'DELETE',
      headers: { ...headers(cfg), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sha, branch: cfg.branch }),
    }),
  );
}

/** Télécharge un fichier binaire (image) authentifié */
export async function getBlob(cfg: RepoConfig, path: string): Promise<Blob> {
  const res = await check(
    await fetch(`${url(cfg, path)}?ref=${encodeURIComponent(cfg.branch)}`, {
      headers: headers(cfg, 'application/vnd.github.raw+json'),
    }),
  );
  const blob = await res.blob();
  // GitHub renvoie parfois application/octet-stream : on corrige le type pour l'affichage
  const ext = path.split('.').pop()?.toLowerCase();
  const type = ext === 'svg' ? 'image/svg+xml' : ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
  return blob.type.startsWith('image/') ? blob : new Blob([blob], { type });
}

/** Vérifie l'accès au repo (page Réglages) */
export async function testAccess(cfg: RepoConfig): Promise<{ private: boolean; canPush: boolean }> {
  const res = await check(
    await fetch(`${API}/repos/${cfg.owner}/${cfg.repo}`, { headers: headers(cfg), cache: 'no-store' }),
  );
  const body = await res.json();
  return { private: Boolean(body.private), canPush: Boolean(body.permissions?.push) };
}
