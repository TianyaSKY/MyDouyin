const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || "18081";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://localhost:${BACKEND_PORT}`;

export async function apiFetch(path, token, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (!headers["Content-Type"] && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response;
}
