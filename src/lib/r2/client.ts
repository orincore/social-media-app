import { S3Client } from '@aws-sdk/client-s3';
import { env } from '@/lib/env';

/**
 * Cloudflare R2 Client Configuration
 * 
 * R2 is optional - the app will work without it but media uploads will be disabled.
 * This is useful for development or deployments that don't need media storage.
 */

// Check if R2 is configured
export const isR2Configured = env.hasR2;

// Lazy initialization of R2 client to prevent build-time errors
let _r2Client: S3Client | null = null;

/**
 * Get the R2 client instance
 * Returns null if R2 is not configured
 */
export function getR2Client(): S3Client | null {
  if (!isR2Configured) {
    return null;
  }

  if (!_r2Client) {
    const accountId = env.r2AccountId || env.r2AccessKeyId;
    const r2Endpoint = env.r2Endpoint || `https://${accountId}.r2.cloudflarestorage.com`;

    _r2Client = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: env.r2AccessKeyId!,
        secretAccessKey: env.r2SecretAccessKey!,
      },
      forcePathStyle: false,
    });
  }

  return _r2Client;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getR2Client() instead for null-safe access
 */
export const r2Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: env.r2Endpoint || `https://${env.r2AccountId || env.r2AccessKeyId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2AccessKeyId!,
        secretAccessKey: env.r2SecretAccessKey!,
      },
      forcePathStyle: false,
    })
  : (null as unknown as S3Client); // Type assertion for backward compatibility

export const R2_BUCKET_NAME = env.r2BucketName || '';
export const R2_PUBLIC_URL = env.r2PublicUrl || env.r2Endpoint || '';

/**
 * Check if R2 storage is available and properly configured
 */
export function isR2Available(): boolean {
  return isR2Configured && !!R2_BUCKET_NAME;
}
