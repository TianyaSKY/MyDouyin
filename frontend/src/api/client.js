export async function apiFetch(path, token, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (!headers["Content-Type"] && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(path, { ...init, headers });
}
