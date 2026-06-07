import mongoose from 'mongoose';

const transcriptEntrySchema = new mongoose.Schema(
  {
    speaker: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    text: { type: String, required: true },
    timestamp: { type: String, required: true },
  },
  { _id: false }
);

const audioRecordingSchema = new mongoose.Schema(
  {
    audioId: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    partyId: { type: Number, required: true },
    role: { type: String, required: true, trim: true },
    partyName: { type: String, required: true, trim: true },
    s3Key: { type: String, required: true },
    s3Bucket: { type: String, required: true },
    mimeType: { type: String, default: 'audio/webm' },
    sizeBytes: { type: Number, default: 0 },
    durationMs: { type: Number, default: null },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const partySchema = new mongoose.Schema(
  {
    partyId: { type: Number, required: true },
    role: {
      type: String,
      required: true,
      enum: ['Claimant', 'Respondent', 'Witness'],
    },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    refNumber: { type: String, required: true, trim: true, index: true },
    sessionDate: { type: String, required: true, trim: true },
    language: {
      type: String,
      required: true,
      enum: ['English', 'Hindi'],
      default: 'English',
    },
    consent: { type: Boolean, required: true, default: false },
    parties: {
      type: [partySchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2,
        message: 'At least two parties are required',
      },
    },
    transcript: {
      type: [transcriptEntrySchema],
      default: [],
    },
    audioRecordings: {
      type: [audioRecordingSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'in_review', 'completed'],
      default: 'active',
      index: true,
    },
    report: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
);

conversationSchema.index({ createdAt: -1 });
conversationSchema.index({ refNumber: 1, createdAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
