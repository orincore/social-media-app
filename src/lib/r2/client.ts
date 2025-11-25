import { S3Client } from '@aws-sdk/client-s3';

if (!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID) {
  throw new Error('CLOUDFLARE_R2_ACCESS_KEY_ID is required');
}

if (!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
  throw new Error('CLOUDFLARE_R2_SECRET_ACCESS_KEY is required');
}

if (!process.env.CLOUDFLARE_R2_ENDPOINT) {
  throw new Error('CLOUDFLARE_R2_ENDPOINT is required');
}

// Use the account-specific R2 endpoint format
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: false,
});

export const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
export const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_ENDPOINT;
