export const getApiBase = () => {
  const base = import.meta.env.VITE_API_URL || '/api';
  return base.replace(/\/$/, '');
};

const TOKEN_KEY = 'nyay_portal_token';

export const getAuthToken = () => sessionStorage.getItem(TOKEN_KEY);

export const setAuthToken = (token) => {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
};

export const clearAuth = () => setAuthToken(null);

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getApiBase()}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const loginWithAccessKey = async (accessKey) => {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ accessKey }),
  });
  setAuthToken(data.token);
  return data;
};

export const verifyAuthSession = async () => {
  const token = getAuthToken();
  if (!token) return false;
  try {
    await apiFetch('/auth/verify');
    return true;
  } catch {
    clearAuth();
    return false;
  }
};

export const fetchAllSessions = async () => {
  const data = await apiFetch('/conversations');
  return data.sessions || [];
};

export const createConversation = async (payload) => {
  const data = await apiFetch('/conversations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.id;
};

export const updateConversation = async (conversationId, payload) => {
  return apiFetch(`/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

export const uploadPartyAudio = async (conversationId, formData) => {
  const token = getAuthToken();
  const res = await fetch(`${getApiBase()}/conversations/${conversationId}/audio`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return data;
};

export const fetchAudioRecordings = async (conversationId) => {
  const data = await apiFetch(`/conversations/${conversationId}/audio`);
  return data.recordings || [];
};

export const getAudioPlayUrl = async (conversationId, audioId) => {
  return apiFetch(`/conversations/${conversationId}/audio/${audioId}/play`);
};
