import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2/client';
import { nanoid } from 'nanoid';

// POST - Upload profile avatar directly to R2 and update user profile
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    try {
      // Generate unique file name for avatar
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const uniqueFileName = `avatars/${session.user.id}-${Date.now()}-${nanoid()}.${fileExtension}`;

      // Generate presigned URL directly
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: uniqueFileName,
        ContentType: file.type,
        Metadata: {
          userId: session.user.id,
          originalName: file.name,
          type: 'avatar',
        },
      });

      const uploadUrl = await getSignedUrl(r2Client, command, {
        expiresIn: 300, // 5 minutes
        signableHeaders: new Set(['content-type']),
      });

      // Generate public URL
      const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueFileName}`;

      // Upload file directly to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to R2');
      }

      // Update user's avatar_url in database
      const { data: updatedUser, error: updateError } = await adminClient
        .from('users')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user avatar:', updateError);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        avatar_url: publicUrl,
        user: updatedUser,
        message: 'Avatar updated successfully'
      });

    } catch (error) {
      console.error('Error uploading avatar:', error);
      return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in POST /api/profile/avatar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
