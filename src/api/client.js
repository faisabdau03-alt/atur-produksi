export function getAuthHeaders(includeContentType = true) {
  const token = localStorage.getItem('jw_session_token') || '';
  const headers = {};
  if (includeContentType) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

export async function apiRequest(endpoint, options = {}) {
  const includeJson = options.body && typeof options.body === 'object';
  const headers = {
    ...getAuthHeaders(includeJson),
    ...(options.headers || {}),
  };
  const config = {
    ...options,
    headers,
  };
  if (includeJson) {
    config.body = JSON.stringify(options.body);
  }
  const res = await fetch('/api' + endpoint, config);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}
