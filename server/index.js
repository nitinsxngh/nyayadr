import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './db.js';
import { hasAnyAI, hasGemini, hasOpenAI } from './services/aiKeys.js';
import { ensureBucketExists, isS3Configured } from './services/s3.js';

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required in .env');
  process.exit(1);
}

if (!process.env.PORTAL_ACCESS_KEY) {
  console.error('PORTAL_ACCESS_KEY is required in .env');
  process.exit(1);
}

async function start() {
  try {
    await connectDB();
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
    }
  } else {
    console.warn('AWS S3 not fully configured — audio upload will fail');
  }

  if (hasAnyAI()) {
    console.log(
      `AI providers: gemini=${hasGemini() ? 'yes' : 'no'} openai=${hasOpenAI() ? 'yes' : 'no'}`
    );
  } else {
    console.warn('No AI keys configured — set GEMINI_API_KEY and/or OPENAI_API_KEY');
  }

  const server = app.listen(PORT, () => {
    console.log(
      isProduction
        ? `NyayADR running on http://localhost:${PORT}`
        : `API server running on http://localhost:${PORT}`
    );
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is in use. Set PORT in .env or stop the other process.`);
    } else {
      console.error('Server failed to start:', err.message);
    }
    process.exit(1);
  });
}

start();
