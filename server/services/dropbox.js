// ESM module
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';

/**
 * Dropbox Service
 * - Uses refresh-token flow when DROPBOX_REFRESH_TOKEN is present.
 * - Falls back to static access token (DROPBOX_ACCESS_TOKEN) if no refresh token.
 */

const {
  DROPBOX_APP_KEY,
  DROPBOX_APP_SECRET,
  DROPBOX_ACCESS_TOKEN,
  DROPBOX_REFRESH_TOKEN,
  DROPBOX_ROOT = '/GG-Generator',
} = process.env;

if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
  console.warn('[Dropbox] Missing APP KEY/SECRET — set DROPBOX_APP_KEY and DROPBOX_APP_SECRET');
}

const TOKEN_ENDPOINT = 'https://api.dropboxapi.com/oauth2/token';
const CONTENT_API = 'https://content.dropboxapi.com/2';
const RPC_API = 'https://api.dropboxapi.com/2';

const tokenState = {
  accessToken: DROPBOX_ACCESS_TOKEN || null,
  expiresAt: 0, // epoch ms
  usingRefresh: Boolean(DROPBOX_REFRESH_TOKEN),
};

function now() {
  return Date.now();
}

async function refreshAccessTokenIfNeeded() {
  // If using static access token, nothing to do.
  if (!tokenState.usingRefresh) {
    if (!tokenState.accessToken) {
      throw new Error('[Dropbox] No access token configured. Set DROPBOX_ACCESS_TOKEN or use a refresh token.');
    }
    return tokenState.accessToken;
  }

  // If we have a valid token, reuse.
  if (tokenState.accessToken && tokenState.expiresAt && tokenState.expiresAt - now() > 60_000) {
    return tokenState.accessToken;
  }

  // Refresh using refresh_token
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', DROPBOX_REFRESH_TOKEN);

  const basic = Buffer.from(`${DROPBOX_APP_KEY}:${DROPBOX_APP_SECRET}`).toString('base64');
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const t = await safeText(res);
    throw new Error(`[Dropbox] Refresh failed (${res.status}): ${t}`);
  }

  const json = await res.json();
  // returns: access_token, token_type, expires_in (seconds), scope, ...
  tokenState.accessToken = json.access_token;
  tokenState.expiresAt = now() + (json.expires_in ? (json.expires_in * 1000) : 3_540_000);
  return tokenState.accessToken;
}

async function safeText(res) {
  try { return await res.text(); } catch { return ''; }
}

function joinRoot(dropboxPath) {
  // Ensure leading slash and root prefix
  const clean = dropboxPath.startsWith('/') ? dropboxPath : `/${dropboxPath}`;
  if (DROPBOX_ROOT === '/' || dropboxPath.startsWith(DROPBOX_ROOT)) return clean;
  const root = DROPBOX_ROOT.endsWith('/') ? DROPBOX_ROOT.slice(0, -1) : DROPBOX_ROOT;
  return `${root}${clean}`;
}

export async function ensureFolder(folderPath) {
  const pathWithRoot = joinRoot(folderPath);
  const token = await refreshAccessTokenIfNeeded();

  const res = await fetch(`${RPC_API}/files/create_folder_v2`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: pathWithRoot, autorename: false }),
  });

  if (res.status === 409) {
    // Already exists
    return { ok: true, alreadyExists: true, path: pathWithRoot };
  }
  if (!res.ok) {
    const t = await safeText(res);
    throw new Error(`[Dropbox] ensureFolder failed (${res.status}): ${t}`);
  }
  return { ok: true, created: true, path: pathWithRoot };
}

/**
 * Upload a file buffer to Dropbox.
 * @param {Buffer|Uint8Array} buffer - file data
 * @param {string} destPath - path relative to DROPBOX_ROOT, e.g. "/2025-10-08/img-123.png"
 * @param {object} opts - { mode, autorename, mute, createSharedLink }
 */
export async function uploadBuffer(buffer, destPath, opts = {}) {
const {
  mode = 'add',
  autorename = true,
  mute = true,
  makeSharedLink = false,  
} = opts;


  const token = await refreshAccessTokenIfNeeded();
  const pathWithRoot = joinRoot(destPath);

  const res = await fetch(`${CONTENT_API}/files/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path: pathWithRoot,
        mode,
        autorename,
        mute,
        strict_conflict: false,
      }),
    },
    body: buffer,
  });

  if (!res.ok) {
    const t = await safeText(res);
    throw new Error(`[Dropbox] upload failed (${res.status}): ${t}`);
  }

  const meta = await res.json();

  let sharedUrl = null;
  if (makeSharedLink) {
    sharedUrl = await createSharedLink(meta.path_lower);
  }

  return {
    id: meta.id,
    pathLower: meta.path_lower,
    clientModified: meta.client_modified,
    serverModified: meta.server_modified,
    size: meta.size,
    sharedUrl,
  };
}

export async function createSharedLink(pathLower, visibility = 'public') {
  const token = await refreshAccessTokenIfNeeded();

  // Try to create; if already has a link, Dropbox returns 409; we can list existing.
  const body = {
    path: pathLower,
    settings: { requested_visibility: visibility },
  };

  let res = await fetch(`${RPC_API}/sharing/create_shared_link_with_settings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 409) {
    // Already shared — list and return the first.
    res = await fetch(`${RPC_API}/sharing/list_shared_links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: pathLower, direct_only: true }),
    });
    if (!res.ok) {
      const t = await safeText(res);
      throw new Error(`[Dropbox] list_shared_links failed (${res.status}): ${t}`);
    }
    const data = await res.json();
    return data.links?.[0]?.url || null;
  }

  if (!res.ok) {
    const t = await safeText(res);
    throw new Error(`[Dropbox] create_shared_link failed (${res.status}): ${t}`);
  }

  const link = await res.json();
  return link?.url || null;
}

export async function getTemporaryLink(pathLower) {
  const token = await refreshAccessTokenIfNeeded();
  const res = await fetch(`${RPC_API}/files/get_temporary_link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: pathLower }),
  });
  if (!res.ok) {
    const t = await safeText(res);
    throw new Error(`[Dropbox] get_temporary_link failed (${res.status}): ${t}`);
  }
  const json = await res.json();
  return json.link;
}


export async function deleteFile(pathLower) {
  const token = await refreshAccessTokenIfNeeded();
  const res = await fetch(`${RPC_API}/files/delete_v2`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: pathLower }),
  });
  if (!res.ok) {
    const t = await safeText(res);
    throw new Error(`[Dropbox] delete failed (${res.status}): ${t}`);
  }
  return true;
}

/**
 * Utility to build a dated path with optional subfolders.
 * Example: buildDatedPath('2025-10-08', 'user@example.com', 'img.png')
 * -> "/GG-Generator/2025-10-08/user_example.com/img.png"
 */
export function buildDatedPath(dateStr, subfolder, filename) {
  const safeSub = subfolder ? `/${String(subfolder).replace(/[^a-z0-9._-]+/gi, '_')}` : '';
  const safeFile = String(filename).replace(/[^a-z0-9._-]+/gi, '_');
  return joinRoot(`/${dateStr}${safeSub}/${safeFile}`);
}

export default {
  ensureFolder,
  uploadBuffer,
  createSharedLink,
  getTemporaryLink,
  deleteFile,
  buildDatedPath,
};
