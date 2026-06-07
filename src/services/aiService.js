import { getAuthToken } from './apiService';

let cachedStatus = null;

export const fetchAIStatus = async () => {
  const token = getAuthToken();
  if (!token) {
    cachedStatus = { transcriptionAvailable: false, reportAvailable: false };
    return cachedStatus;
  }
  try {
    const res = await fetch('/api/ai/status', {
      headers: { Authorization: `Bearer ${token}` },
    });
    cachedStatus = await res.json();
    return cachedStatus;
  } catch {
    cachedStatus = { transcriptionAvailable: false, reportAvailable: false };
    return cachedStatus;
  }
};

export const hasAITranscription = () =>
  cachedStatus?.transcriptionAvailable ?? Boolean(getAuthToken());

/** @deprecated use hasAITranscription */
export const hasGeminiTranscription = hasAITranscription;

export const transcribeAudio = async (audioBlob, language = 'English') => {
  if (!audioBlob?.size || audioBlob.size < 100) return '';

  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated. Please log in again.');
  }

  const ext = audioBlob.type?.includes('mp4')
    ? 'mp4'
    : audioBlob.type?.includes('ogg')
      ? 'ogg'
      : 'webm';

  const formData = new FormData();
  formData.append('audio', audioBlob, `clip.${ext}`);
  formData.append('language', language);

  const res = await fetch('/api/ai/transcribe', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Transcription failed (${res.status})`);
  }
  return data.text || '';
};

export const generateSettlementReport = async (
  transcript,
  parties,
  refNumber,
  date,
  language = 'English'
) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated. Please log in again.');
  }

  const res = await fetch('/api/ai/report', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transcript, parties, refNumber, date, language }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Report generation failed (${res.status})`);
  }
  return data.report;
};
