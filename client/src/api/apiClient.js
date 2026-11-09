const rawApiUrl = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.trim().replace(/\/$/, '')
  : (import.meta.env.PROD ? 'https://swiftfleet.onrender.com' : '');
const apiBase = rawApiUrl.replace(/\/api\/?$/, '');
const BASE_URL = apiBase ? `${apiBase}/api` : '/api';

const DEFAULT_TIMEOUT_MS = 25000;

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('swiftfleet_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const timeoutMs = options.timeout || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const config = {
    ...options,
    headers,
    signal: options.signal || controller.signal
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.message || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const timeoutErr = new Error('Server response timed out. The server may be waking up, please try again.');
      timeoutErr.status = 504;
      timeoutErr.name = 'AbortError';
      throw timeoutErr;
    }
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, error.message);
    throw error;
  }
}

export const api = {
  get: (url, options) => request(url, { method: 'GET', ...options }),
  post: (url, body, options) => request(url, { method: 'POST', body, ...options }),
  put: (url, body, options) => request(url, { method: 'PUT', body, ...options }),
  delete: (url, options) => request(url, { method: 'DELETE', ...options })
};
