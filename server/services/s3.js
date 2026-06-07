import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { slugify } from '../utils/slug.js';

let s3Client = null;

/** S3 bucket names must be lowercase. */
export const getBucketName = () => {
  const raw = process.env.AWS_S3_BUCKET?.trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  if (normalized !== raw) {
    console.warn(`AWS_S3_BUCKET "${raw}" normalized to "${normalized}" (S3 requires lowercase)`);
    process.env.AWS_S3_BUCKET = normalized;
  }
  return normalized;
};

const getS3 = () => {
  if (s3Client) return s3Client;

  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = process.env;
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION) {
    throw new Error('AWS credentials are not configured on the server');
  }

  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  return s3Client;
};

export const isS3Configured = () =>
  Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_REGION &&
      getBucketName()
  );

/** Create the bucket if it does not exist (requires s3:CreateBucket on the IAM user). */
export const ensureBucketExists = async () => {
  const bucket = getBucketName();
  const region = process.env.AWS_REGION;
  if (!bucket || !region) {
    throw new Error('AWS_S3_BUCKET and AWS_REGION are required');
  }

  const client = getS3();

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { bucket, created: false };
  } catch (err) {
    const status = err.$metadata?.httpStatusCode;
    const missing = err.name === 'NotFound' || status === 404;
    if (!missing && status !== 403) {
      throw err;
    }
  }

  const params = { Bucket: bucket };
  if (region !== 'us-east-1') {
    params.CreateBucketConfiguration = { LocationConstraint: region };
  }

  try {
    await client.send(new CreateBucketCommand(params));
    console.log(`Created S3 bucket "${bucket}" in ${region}`);
    return { bucket, created: true };
  } catch (err) {
    if (
      err.name === 'BucketAlreadyOwnedByYou' ||
      err.Code === 'BucketAlreadyOwnedByYou' ||
      err.name === 'BucketAlreadyExists' ||
      err.Code === 'BucketAlreadyExists'
    ) {
      return { bucket, created: false };
    }
    throw err;
  }
};

export const uploadAudio = async ({ key, buffer, contentType }) => {
  const bucket = getBucketName();
  const client = getS3();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return { bucket, key };
};

export const getAudioPlayUrl = async (key, expiresIn = 3600) => {
  const bucket = getBucketName();
  const client = getS3();

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  );
};

export const buildAudioS3Key = ({ conversationId, audioId, role, partyName, mimeType }) => {
  const prefix = (process.env.AWS_S3_PREFIX || 'audios').replace(/\/$/, '');
  const roleSlug = slugify(role);
  const nameSlug = slugify(partyName);
  const ext = mimeType?.includes('mp4') ? 'mp4' : mimeType?.includes('ogg') ? 'ogg' : 'webm';
  return `${prefix}/${conversationId}/${audioId}_${roleSlug}_${nameSlug}.${ext}`;
};
