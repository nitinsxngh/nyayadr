export const mapS3Error = (err) => {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || 'ap-south-1';

  if (err.name === 'NoSuchBucket' || err.Code === 'NoSuchBucket') {
    return `S3 bucket "${bucket}" was not found in ${region}. Create the bucket in AWS S3 (same region as AWS_REGION) and set AWS_S3_BUCKET to its exact name. Use lowercase only (e.g. nyay-adr).`;
  }
  if (err.name === 'InvalidAccessKeyId' || err.Code === 'InvalidAccessKeyId') {
    return 'Invalid AWS_ACCESS_KEY_ID. Check credentials in .env.';
  }
  if (err.name === 'SignatureDoesNotMatch' || err.Code === 'SignatureDoesNotMatch') {
    return 'Invalid AWS_SECRET_ACCESS_KEY. Check credentials in .env.';
  }
  if (err.name === 'AccessDenied' || err.Code === 'AccessDenied') {
    return `AWS denied access to bucket "${bucket}". Ensure the IAM user has s3:CreateBucket, s3:PutObject, and s3:GetObject on arn:aws:s3:::${bucket}/*`;
  }
  return err.message || 'S3 upload failed';
};

export const mapMongoError = (err) => {
  if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
    return 'MongoDB is unreachable. Check MONGODB_URI, your internet/VPN, and MongoDB Atlas Network Access (IP whitelist).';
  }
  return err.message || 'Database operation failed';
};
