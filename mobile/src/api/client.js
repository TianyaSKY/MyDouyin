import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';

export async function apiFetch(path, token, init = {}) {
  const headers = { ...(init.headers || {}) };

  // Don't set Content-Type for FormData (let fetch set multipart boundary)
  if (!headers['Content-Type'] && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const resolvedToken = token || (await AsyncStorage.getItem('douyin_token'));
  if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`;

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    if (response.status === 401) {
      // Emit a global unauthorized event — handled by AuthContext
      global._authUnauthorizedCallback?.();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response;
}
