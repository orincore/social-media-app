import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';
import { nanoid } from 'nanoid';

// Runtime configuration for file uploads
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Media Upload API using Supabase Storage
 * 
 * This endpoint handles file uploads using Supabase Storage which is more reliable
 * than direct R2 uploads on platforms like AWS Amplify that have TLS issues with R2.
 * 
 * Supabase Storage works reliably across all platforms and handles:
 * - Large file uploads
 * - Mobile device uploads
 * - Proper CORS headers
 * - CDN distribution
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
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
      // Validate file type
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
        'video/mov',
      ];

      // Check by extension as fallback for iOS
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'mp4', 'webm', 'mov'];
      
      const isAllowedType = allowedTypes.includes(file.type) || allowedExtensions.includes(ext);

      if (!isAllowedType) {
        return NextResponse.json(
          { error: `File type ${file.type || ext} not allowed` },
          { status: 400 }
        );
      }

      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size too large. Maximum 50MB allowed.' },
          { status: 400 }
        );
      }

      // Generate unique filename
      const fileExtension = ext || 'bin';
      const uniqueFileName = `${session.user.id}/${Date.now()}-${nanoid()}.${fileExtension}`;
      
      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Determine content type
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
        contentType = extToMime[fileExtension] || 'application/octet-stream';
      }

      // Upload to Supabase Storage
      const { data, error } = await adminClient.storage
        .from('media')
        .upload(uniqueFileName, buffer, {
          contentType,
          cacheControl: '31536000', // 1 year cache
          upsert: false,
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        return NextResponse.json(
          { error: 'Failed to upload file. Please try again.' },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = adminClient.storage
        .from('media')
        .getPublicUrl(uniqueFileName);

      uploadedFiles.push({
        originalName: file.name,
        fileName: uniqueFileName,
        url: urlData.publicUrl,
        type: contentType.startsWith('video/') ? 'video' : 'image',
        size: file.size,
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
    });

  } catch (error: any) {
    console.error('Error in media upload:', error.message || error);
    
    let errorMessage = 'Failed to upload files. Please try again.';
    
    if (error.message?.includes('timeout')) {
      errorMessage = 'Upload timed out. Please try with a smaller file.';
    } else if (error.message?.includes('network')) {
      errorMessage = 'Network error. Please check your connection.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
