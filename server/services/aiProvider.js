import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiKey, getOpenAIKey, hasGemini, hasOpenAI } from './aiKeys.js';
import { buildReportPrompt, parseReportJson } from './reportPrompt.js';

const SILENCE = /^\[SILENCE\]$/i;

const langInstruction = (language) =>
  language === 'Hindi'
    ? 'Transcribe only the spoken words in Hindi (Devanagari).'
    : 'Transcribe only the spoken words in English.';

export const transcribeWithGemini = async (buffer, mimeType, language) => {
  const genAI = new GoogleGenerativeAI(getGeminiKey());
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const base64 = buffer.toString('base64');

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64 } },
    {
      text: `${langInstruction(language)} Return ONLY the transcript. If silent or unintelligible, return exactly: [SILENCE]`,
    },
  ]);

  const text = result.response.text().trim();
  if (!text || SILENCE.test(text)) return '';
  return text;
};

export const transcribeWithOpenAI = async (buffer, mimeType, language, filename) => {
  const ext = mimeType?.includes('mp4') ? 'mp4' : mimeType?.includes('ogg') ? 'ogg' : 'webm';
  const name = filename || `audio.${ext}`;
  const form = new FormData();
  form.append('file', new File([buffer], name, { type: mimeType || 'audio/webm' }));
  form.append('model', 'whisper-1');
  form.append('language', language === 'Hindi' ? 'hi' : 'en');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getOpenAIKey()}` },
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI transcription failed (${res.status})`);
  }
  return (data.text || '').trim();
};

export const transcribeAudio = async (buffer, mimeType, language, filename) => {
  if (!buffer?.length || buffer.length < 100) return { text: '', provider: null };

  const errors = [];

  if (hasGemini()) {
    try {
      const text = await transcribeWithGemini(buffer, mimeType, language);
      return { text, provider: 'gemini' };
    } catch (err) {
      console.warn('Gemini transcription failed, trying OpenAI:', err.message);
      errors.push(`Gemini: ${err.message}`);
    }
  }

  if (hasOpenAI()) {
    try {
      const text = await transcribeWithOpenAI(buffer, mimeType, language, filename);
      return { text, provider: 'openai' };
    } catch (err) {
      console.warn('OpenAI transcription failed:', err.message);
      errors.push(`OpenAI: ${err.message}`);
    }
  }

  throw new Error(
    errors.length
      ? `Transcription failed. ${errors.join(' | ')}`
      : 'No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env'
  );
};

const generateReportWithGemini = async (prompt) => {
  const genAI = new GoogleGenerativeAI(getGeminiKey());
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction:
      'You are an AI legal assistant for the Ghaziabad Police ADR. Given a transcript of a dispute mediation and the parties involved, generate a settlement report in JSON format.',
  });
  const result = await model.generateContent(prompt);
  return parseReportJson(result.response.text());
};

const generateReportWithOpenAI = async (prompt) => {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_REPORT_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an AI legal assistant for the Ghaziabad Police ADR. Output valid JSON only for settlement reports.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI report failed (${res.status})`);
  }
  const content = data.choices?.[0]?.message?.content || '';
  return parseReportJson(content);
};

export const generateSettlementReport = async (
  transcript,
  parties,
  refNumber,
  date,
  language = 'English'
) => {
  const prompt = buildReportPrompt(transcript, parties, refNumber, date, language);
  const errors = [];

  if (hasGemini()) {
    try {
      const report = await generateReportWithGemini(prompt);
      return { report, provider: 'gemini' };
    } catch (err) {
      console.warn('Gemini report failed, trying OpenAI:', err.message);
      errors.push(`Gemini: ${err.message}`);
    }
  }

  if (hasOpenAI()) {
    try {
      const report = await generateReportWithOpenAI(prompt);
      return { report, provider: 'openai' };
    } catch (err) {
      console.warn('OpenAI report failed:', err.message);
      errors.push(`OpenAI: ${err.message}`);
    }
  }

  throw new Error(
    errors.length
      ? `Report generation failed. ${errors.join(' | ')}`
      : 'No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env'
  );
};
