import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';
import aiRoutes from './routes/ai.js';
import { connectDB } from './db.js';
import { getBucketName, isS3Configured } from './services/s3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_PATH = path.join(__dirname, '..', 'dist');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB middleware error:', err.message);
    res.status(503).json({
      error: 'Database unreachable. Check MONGODB_URI and Atlas network access.',
    });
  }
});

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
    ok: dbPing,
    db: dbPing,
    s3: isS3Configured(),
    bucket: getBucketName(),
    region: process.env.AWS_REGION || null,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/ai', aiRoutes);

const indexHtml = path.join(DIST_PATH, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexHtml);
  });
}

export default app;
