import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
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
    console.warn('R2 is not configured - missing environment variables');
    return null;
  }

  if (!_r2Client) {
    try {
      const accountId = env.r2AccountId || env.r2AccessKeyId;
      const r2Endpoint = env.r2Endpoint || `https://${accountId}.r2.cloudflarestorage.com`;

      console.log('Initializing R2 client with endpoint:', r2Endpoint);

      _r2Client = new S3Client({
        region: 'auto',
        endpoint: r2Endpoint,
        credentials: {
          accessKeyId: env.r2AccessKeyId!,
          secretAccessKey: env.r2SecretAccessKey!,
        },
        // Use path-style so host stays <account>.r2.cloudflarestorage.com and bucket is in the path.
        // This avoids generating presigned URLs like media.<account>.r2... which can fail TLS.
        forcePathStyle: true,
        // Custom HTTP handler with longer timeouts for mobile/slow connections
        requestHandler: new NodeHttpHandler({
          connectionTimeout: 30000, // 30 seconds to establish connection
          socketTimeout: 120000, // 2 minutes for the request to complete
        }),
      });
    } catch (error) {
      console.error('Failed to initialize R2 client:', error);
      return null;
    }
  }

  return _r2Client;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getR2Client() instead for null-safe access
 */
export const r2Client = (() => {
  // Return a proxy that lazily initializes the client
  // This prevents build-time errors on platforms like AWS Amplify
  if (!isR2Configured) {
    return null as unknown as S3Client;
  }
  
  return new S3Client({
    region: 'auto',
    endpoint: env.r2Endpoint || `https://${env.r2AccountId || env.r2AccessKeyId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId!,
      secretAccessKey: env.r2SecretAccessKey!,
    },
    forcePathStyle: true,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 30000,
      socketTimeout: 120000,
    }),
  });
})();

export const R2_BUCKET_NAME = env.r2BucketName || '';
export const R2_PUBLIC_URL = env.r2PublicUrl || env.r2Endpoint || '';

/**
 * Check if R2 storage is available and properly configured
 */
export function isR2Available(): boolean {
  return isR2Configured && !!R2_BUCKET_NAME;
}
