import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2/client';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { fileName, fileType, fileSize } = await request.json();

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ];

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 50MB allowed.' },
        { status: 400 }
      );
    }

    // Generate unique file name
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${session.user.id}/${Date.now()}-${nanoid()}.${fileExtension}`;

    // Generate presigned URL with proper headers
    const contentDisposition = `attachment; filename="${fileName}"`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: fileType,
      // Instruct browsers to download instead of inline preview when hitting the public URL
      ContentDisposition: contentDisposition,
      Metadata: {
        userId: session.user.id,
        originalName: fileName,
      },
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 300, // 5 minutes
      signableHeaders: new Set(['content-type']),
    });

    // Generate public URL for accessing the file
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueFileName}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      fileName: uniqueFileName,
      contentDisposition,
    });

  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
