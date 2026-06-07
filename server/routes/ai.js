import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { hasAnyAI, hasGemini, hasOpenAI } from '../services/aiKeys.js';
import { generateSettlementReport, transcribeAudio } from '../services/aiProvider.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(requireAuth);

router.get('/status', (_req, res) => {
  res.json({
    transcriptionAvailable: hasAnyAI(),
    reportAvailable: hasAnyAI(),
    gemini: hasGemini(),
    openai: hasOpenAI(),
  });
});

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!hasAnyAI()) {
      return res.status(503).json({
        error: 'No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env',
      });
    }

    if (!req.file?.buffer?.length) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const language = req.body.language || 'English';
    const mimeType = req.file.mimetype || 'audio/webm';

    const { text, provider } = await transcribeAudio(
      req.file.buffer,
      mimeType,
      language,
      req.file.originalname
    );

    res.json({ text, provider });
  } catch (err) {
    console.error('Transcribe error:', err.message);
    res.status(500).json({ error: err.message || 'Transcription failed' });
  }
});

router.post('/report', async (req, res) => {
  try {
    if (!hasAnyAI()) {
      return res.status(503).json({ error: 'No AI provider configured' });
    }

    const { transcript, parties, refNumber, date, language } = req.body;
    if (!transcript || !parties || !refNumber || !date) {
      return res.status(400).json({ error: 'transcript, parties, refNumber, and date are required' });
    }

    const { report, provider } = await generateSettlementReport(
      transcript,
      parties,
      refNumber,
      date,
      language || 'English'
    );

    res.json({ report, provider });
  } catch (err) {
    console.error('Report error:', err.message);
    res.status(500).json({ error: err.message || 'Report generation failed' });
  }
});

export default router;
