import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, R2_BUCKET_NAME, isR2Available } from '@/lib/r2/client';
import { nanoid } from 'nanoid';

// Increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// For Next.js App Router, we need to set the runtime and size limits
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

export async function POST(request: NextRequest) {
  try {
    // Check if R2 is configured
    if (!isR2Available()) {
      console.error('R2 storage is not configured');
      return NextResponse.json(
        { error: 'Media storage is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const r2Client = getR2Client();
    if (!r2Client) {
      console.error('Failed to initialize R2 client');
      return NextResponse.json(
        { error: 'Media storage is temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('Error parsing form data:', formError);
      return NextResponse.json(
        { error: 'Failed to process upload. Please try with a smaller file.' },
        { status: 400 }
      );
    }

    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate file count
    if (files.length > 4) {
      return NextResponse.json(
        { error: 'Maximum 4 files allowed' },
        { status: 400 }
      );
    }

    const uploadedFiles = [];

    for (const file of files) {
      // Validate file type - include HEIC/HEIF for iOS devices
      const allowedTypes = [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/mov', // iOS video format
      ];

      // Also check by extension for iOS which sometimes sends wrong MIME types
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'mp4', 'webm', 'mov'];
      
      const isAllowedType = allowedTypes.includes(file.type) || 
                            (ext && allowedExtensions.includes(ext));

      if (!isAllowedType) {
        return NextResponse.json(
          { error: `File type ${file.type} not allowed` },
          { status: 400 }
        );
      }

      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size too large. Maximum 50MB allowed.' },
          { status: 400 }
        );
      }

      // Generate unique filename
      const fileExtension = file.name.split('.').pop() || 'bin';
      const uniqueFileName = `${session.user.id}/${Date.now()}-${nanoid()}.${fileExtension}`;
      
      // Convert file to buffer with error handling
      let buffer: Buffer;
      try {
        const bytes = await file.arrayBuffer();
        buffer = Buffer.from(bytes);
      } catch (bufferError) {
        console.error('Error converting file to buffer:', bufferError);
        return NextResponse.json(
          { error: 'Failed to process file. Please try again.' },
          { status: 400 }
        );
      }

      // Determine content type - use extension as fallback for iOS
      let contentType = file.type;
      if (!contentType || contentType === 'application/octet-stream') {
        const extToMime: Record<string, string> = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'heic': 'image/heic',
          'heif': 'image/heif',
          'mp4': 'video/mp4',
          'mov': 'video/quicktime',
          'webm': 'video/webm',
        };
        contentType = extToMime[fileExtension.toLowerCase()] || 'application/octet-stream';
      }
      
      // Upload directly to R2 with retry logic
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: uniqueFileName,
        Body: buffer,
        ContentType: contentType,
        // Don't include metadata that might cause issues
      });

      let uploadSuccess = false;
      let lastError: Error | null = null;
      
      // Retry up to 3 times
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await r2Client.send(command);
          uploadSuccess = true;
          break;
        } catch (uploadError: any) {
          lastError = uploadError;
          console.error(`R2 upload attempt ${attempt} failed:`, uploadError.message || uploadError);
          
          // Wait before retry (exponential backoff)
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (!uploadSuccess) {
        console.error('All R2 upload attempts failed:', lastError);
        return NextResponse.json(
          { error: 'Failed to upload file. Please check your connection and try again.' },
          { status: 500 }
        );
      }
      
      // Generate public URL
      const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueFileName}`;
      
      uploadedFiles.push({
        originalName: file.name,
        fileName: uniqueFileName,
        url: publicUrl,
        type: contentType.startsWith('video/') ? 'video' : 'image',
        size: file.size
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles
    });

  } catch (error: any) {
    console.error('Error in media upload:', error.message || error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to upload files. Please try again.';
    
    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      errorMessage = 'Upload timed out. Please try with a smaller file or check your connection.';
    } else if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.message?.includes('size') || error.message?.includes('too large')) {
      errorMessage = 'File is too large. Please try with a smaller file.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
