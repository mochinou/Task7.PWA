import { API_BASE_URL } from './config';
import { reportNetworkFailure, reportNetworkSuccess } from './networkMonitor';

export class ApiError extends Error {
  constructor(message, status = 500, details = null, { isOffline = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.isOffline = isOffline;
  }
}

export function isOfflineError(error) {
  return Boolean(error && error.isOffline);
}

const OFFLINE_MESSAGE =
  'You are offline and this data has not been saved for offline use yet.';

/**
 * Performs a request and returns `{ data, meta }`.
 * `meta.source` is "network" for live data or "cache" when the Service Worker
 * answered from its runtime cache (network-first fallback). `meta.cachedAt` is
 * the time the cached copy was saved.
 */
export async function apiRequestWithMeta(
  endpoint,
  { method = 'GET', body, headers = {}, signal } = {}
) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const config = {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    signal,
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    // Cancelled by TanStack Query (newer request replaced it) — not a network problem.
    if (error?.name === 'AbortError') throw error;

    reportNetworkFailure();
    throw new ApiError(
      method === 'GET'
        ? OFFLINE_MESSAGE
        : 'You are offline. Changes can only be saved when the connection returns.',
      0,
      { cause: error?.message || null },
      { isOffline: true }
    );
  }

  const source = response.headers.get('X-SW-Source') || 'network';
  if (source === 'network') {
    reportNetworkSuccess();
  } else {
    reportNetworkFailure();
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : null;
    }
  } catch {
    data = null;
  }

  if (!response.ok) {
    const offline = source === 'offline';
    throw new ApiError(
      offline
        ? OFFLINE_MESSAGE
        : data?.message || `Request failed with status ${response.status}`,
      response.status,
      data,
      { isOffline: offline }
    );
  }

  const cachedAt = Number(response.headers.get('X-SW-Cached-At')) || null;
  return {
    data,
    meta: {
      source: source === 'cache' ? 'cache' : 'network',
      cachedAt: source === 'cache' ? cachedAt : null,
      reason: response.headers.get('X-SW-Fallback-Reason') || null,
      receivedAt: Date.now(),
    },
  };
}

export async function apiRequest(endpoint, options) {
  const { data } = await apiRequestWithMeta(endpoint, options);
  return data;
}
