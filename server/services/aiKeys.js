export const getGeminiKey = () =>
  process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

export const getOpenAIKey = () => process.env.OPENAI_API_KEY || '';

export const hasGemini = () => Boolean(getGeminiKey());

export const hasOpenAI = () => Boolean(getOpenAIKey());

export const hasAnyAI = () => hasGemini() || hasOpenAI();
