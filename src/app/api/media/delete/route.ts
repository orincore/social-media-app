import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2/client';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { mediaUrl } = await request.json();

    if (!mediaUrl) {
      return NextResponse.json(
        { error: 'Media URL is required' },
        { status: 400 }
      );
    }

    // Extract the file key from the URL
    // URL format: https://pub-7cdefa14faf6454ea30945af925888a8.r2.dev/userId/timestamp-nanoid.ext
    const url = new URL(mediaUrl);
    const fileKey = url.pathname.substring(1); // Remove leading slash

    // Verify the file belongs to the current user (security check)
    if (!fileKey.startsWith(session.user.id + '/')) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this file' },
        { status: 403 }
      );
    }

    // Delete from R2 bucket
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    });

    await r2Client.send(deleteCommand);

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting media from R2:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}
