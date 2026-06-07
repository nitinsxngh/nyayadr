import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';
import aiRoutes from './routes/ai.js';
import { hasAnyAI, hasGemini, hasOpenAI } from './services/aiKeys.js';
import { ensureBucketExists, getBucketName, isS3Configured } from './services/s3.js';

const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required in .env');
  process.exit(1);
}

if (!process.env.PORTAL_ACCESS_KEY) {
  console.error('PORTAL_ACCESS_KEY is required in .env');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  let dbPing = false;
  if (dbReady) {
    try {
      await mongoose.connection.db.admin().ping();
      dbPing = true;
    } catch {
      dbPing = false;
    }
  }
  res.json({
    ok: dbPing && isS3Configured(),
    db: dbPing,
    s3: isS3Configured(),
    bucket: getBucketName(),
    region: process.env.AWS_REGION || null,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/ai', aiRoutes);

async function start() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nyayadr';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    await mongoose.connection.db.admin().ping();
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.error('Check MONGODB_URI and Atlas Network Access / VPN.');
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  if (isS3Configured()) {
    try {
      const { bucket, created } = await ensureBucketExists();
      console.log(
        `S3 ready: bucket=${bucket} region=${process.env.AWS_REGION}${created ? ' (newly created)' : ''}`
      );
    } catch (err) {
      console.error('S3 bucket setup failed:', err.message);
      console.error(
        'Grant s3:CreateBucket + s3:PutObject + s3:GetObject on the bucket, or create it manually in AWS console.'
      );
    }
  } else {
    console.warn('AWS S3 not fully configured — audio upload will fail');
  }

  if (hasAnyAI()) {
    console.log(
      `AI providers: gemini=${hasGemini() ? 'yes' : 'no'} openai=${hasOpenAI() ? 'yes' : 'no'} (OpenAI used as fallback)`
    );
  } else {
    console.warn('No AI keys configured — set GEMINI_API_KEY and/or OPENAI_API_KEY in .env');
  }

  const server = app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Stop the other API process (e.g. lsof -ti :${PORT} | xargs kill) or set PORT to a different value in .env`
      );
    } else {
      console.error('Server failed to start:', err.message);
    }
    process.exit(1);
  });
}

start();
