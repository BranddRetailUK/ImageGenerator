// ESM module
import fetch from 'node-fetch';

/**
 * Dropbox Service
 * - Supports refresh-token flow when DROPBOX_REFRESH_TOKEN is present.
 * - Falls back to static access token (DROPBOX_ACCESS_TOKEN) if no refresh token.
 * - Provides upload, shared-link/temporary-link creation, delete, and helpers.
 */

const {
  DROPBOX_APP_KEY,
  DROPBOX_APP_SECRET,
  DROPBOX_ACCESS_TOKEN,
  DROPBOX_REFRESH_TOKEN,
  DROPBOX_ROOT = '/GG-Generator',
} = process.env;

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

async function safeText(res) {
  try { return await res.text(); } catch { return ''; }
}

async function refreshAccessTokenIfNeeded() {
  // If using static token only, nothing to refresh.
  if (!tokenState.usingRefresh) {
    if (!tokenState.accessToken) {
      throw new Error('[Dropbox] No access token configured. Set DROPBOX_ACCESS_TOKEN or use a refresh token.');
    }
    return tokenState.accessToken;
  }

  // If we have a valid token, reuse it.
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
  tokenState.accessToken = json.access_token;
  tokenState.expiresAt = now() + (json.expires_in ? (json.expires_in * 1000) : 3_540_000);
  return tokenState.accessToken;
}

function joinRoot(dropboxPath) {
  const clean = dropboxPath.startsWith('/') ? dropboxPath : `/${dropboxPath}`;
  if (DROPBOX_ROOT === '/' || clean.startsWith(DROPBOX_ROOT)) return clean;
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
 * @param {string} destPath - path relative to DROPBOX_ROOT, e.g., "/2025-10-08/img-123.png"
 * @param {object} opts - { mode, autorename, mute, makeSharedLink }
 */
export async function uploadBuffer(buffer, destPath, opts = {}) {
  const {
    mode = 'add',
    autorename = true,
    mute = true,
    makeSharedLink = false, // renamed to avoid shadowing the function createSharedLink
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
    try {
      sharedUrl = await createSharedLink(meta.path_lower);
    } catch (e) {
      // Fallback when app lacks sharing.write or link creation fails — use temporary link
      const msg = String(e?.message || '');
      if (msg.includes("required scope 'sharing.write'") || msg.includes('create_shared_link')) {
        sharedUrl = await getTemporaryLink(meta.path_lower);
      } else {
        throw e;
      }
    }
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

/** Utility to compose a dated, safe path */
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
