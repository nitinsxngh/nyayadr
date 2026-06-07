import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { Conversation } from '../models/Conversation.js';
import { requireAuth } from '../middleware/auth.js';
import { slugify } from '../utils/slug.js';
import {
  buildAudioS3Key,
  getAudioPlayUrl,
  isS3Configured,
  uploadAudio,
} from '../services/s3.js';
import { mapMongoError, mapS3Error } from '../utils/errors.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.use(requireAuth);

const mapParties = (parties) =>
  parties.map((p) => ({
    partyId: p.id ?? p.partyId,
    role: p.role,
    name: p.name,
    mobile: p.mobile || '',
  }));

router.post('/', async (req, res) => {
  try {
    const { refNumber, sessionDate, language, consent, parties } = req.body;

    if (!refNumber || !sessionDate || !parties?.length) {
      return res.status(400).json({ error: 'refNumber, sessionDate, and parties are required' });
    }

    const conversation = await Conversation.create({
      refNumber,
      sessionDate,
      language: language || 'English',
      consent: Boolean(consent),
      parties: mapParties(parties),
      transcript: [],
      status: 'active',
    });

    res.status(201).json({ id: conversation._id.toString(), conversation });
  } catch (err) {
    console.error('Create conversation error:', err);
    res.status(400).json({ error: err.message || 'Failed to create conversation' });
  }
});

const formatRecording = async (recording) => ({
  audioId: recording.audioId,
  displayName: recording.displayName,
  partyId: recording.partyId,
  role: recording.role,
  partyName: recording.partyName,
  mimeType: recording.mimeType,
  sizeBytes: recording.sizeBytes,
  durationMs: recording.durationMs,
  recordedAt: recording.recordedAt,
  playUrl: await getAudioPlayUrl(recording.s3Key),
});

router.get('/', async (req, res) => {
  try {
    const conversations = await Conversation.find()
      .sort({ createdAt: -1 })
      .lean();

    const sessions = await Promise.all(
      conversations.map(async (c) => {
        const recordings =
          isS3Configured() && c.audioRecordings?.length
            ? await Promise.all(c.audioRecordings.map((r) => formatRecording(r)))
            : [];

        return {
          id: c._id.toString(),
          refNumber: c.refNumber,
          sessionDate: c.sessionDate,
          language: c.language,
          status: c.status,
          parties: c.parties,
          transcript: c.transcript || [],
          transcriptCount: c.transcript?.length || 0,
          recordings,
          recordingCount: recordings.length,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          completedAt: c.completedAt,
        };
      })
    );

    res.json({ sessions });
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

router.post('/:id/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!isS3Configured()) {
      return res.status(503).json({ error: 'AWS S3 is not configured on the server' });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!req.file?.buffer?.length) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const partyId = Number(req.body.partyId);
    const role = req.body.role?.trim();
    const partyName = req.body.partyName?.trim();

    if (!partyId || !role || !partyName) {
      return res.status(400).json({ error: 'partyId, role, and partyName are required' });
    }

    const audioId = randomUUID();
    const displayName = `${slugify(role)}-${slugify(partyName)}`;
    const mimeType = req.file.mimetype || 'audio/webm';
    const s3Key = buildAudioS3Key({
      conversationId: conversation._id.toString(),
      audioId,
      role,
      partyName,
      mimeType,
    });

    const { bucket, key } = await uploadAudio({
      key: s3Key,
      buffer: req.file.buffer,
      contentType: mimeType,
    });

    const recording = {
      audioId,
      displayName,
      partyId,
      role,
      partyName,
      s3Key: key,
      s3Bucket: bucket,
      mimeType,
      sizeBytes: req.file.size,
      durationMs: req.body.durationMs ? Number(req.body.durationMs) : null,
      recordedAt: new Date(),
    };

    conversation.audioRecordings.push(recording);
    await conversation.save();

    res.status(201).json({
      recording: await formatRecording(recording),
    });
  } catch (err) {
    console.error('Audio upload error:', err);
    const message = mapS3Error(err);
    const status = err.name === 'NoSuchBucket' || err.Code === 'NoSuchBucket' ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

router.get('/:id/audio', async (req, res) => {
  try {
    if (!isS3Configured()) {
      return res.status(503).json({ error: 'AWS S3 is not configured on the server' });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const recordings = await Promise.all(
      (conversation.audioRecordings || []).map((r) => formatRecording(r))
    );

    res.json({ recordings });
  } catch (err) {
    res.status(400).json({ error: 'Invalid conversation id' });
  }
});

router.get('/:id/audio/:audioId/play', async (req, res) => {
  try {
    if (!isS3Configured()) {
      return res.status(503).json({ error: 'AWS S3 is not configured on the server' });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const recording = conversation.audioRecordings?.find(
      (r) => r.audioId === req.params.audioId
    );

    if (!recording) {
      return res.status(404).json({ error: 'Audio recording not found' });
    }

    res.json({
      audioId: recording.audioId,
      displayName: recording.displayName,
      role: recording.role,
      partyName: recording.partyName,
      playUrl: await getAudioPlayUrl(recording.s3Key),
    });
  } catch (err) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ conversation });
  } catch (err) {
    res.status(400).json({ error: 'Invalid conversation id' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { transcript, status, report, parties } = req.body;
    const update = {};

    if (transcript !== undefined) update.transcript = transcript;
    if (parties !== undefined) update.parties = mapParties(parties);
    if (status !== undefined) {
      update.status = status;
      if (status === 'completed') update.completedAt = new Date();
    }
    if (report !== undefined) update.report = report;

    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ id: conversation._id.toString(), conversation });
  } catch (err) {
    console.error('Update conversation error:', err);
    const isNetwork =
      err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError';
    res.status(isNetwork ? 503 : 400).json({
      error: isNetwork ? mapMongoError(err) : err.message || 'Failed to update conversation',
    });
  }
});

export default router;
