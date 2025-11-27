import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
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

    const formData = await request.formData();
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
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = `${session.user.id}/${Date.now()}-${nanoid()}.${fileExtension}`;
      
      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Upload directly to R2
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: uniqueFileName,
        Body: buffer,
        ContentType: file.type,
        Metadata: {
          userId: session.user.id,
          originalName: file.name,
        },
      });

      await r2Client.send(command);
      
      // Generate public URL
      const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueFileName}`;
      
      uploadedFiles.push({
        originalName: file.name,
        fileName: uniqueFileName,
        url: publicUrl,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        size: file.size
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading files to R2:', error);
    return NextResponse.json(
      { error: 'Failed to upload files to R2' },
      { status: 500 }
    );
  }
}
