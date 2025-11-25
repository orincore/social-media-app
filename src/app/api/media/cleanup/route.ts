import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { mediaUrls } = await request.json();

    if (!mediaUrls || !Array.isArray(mediaUrls)) {
      return NextResponse.json(
        { error: 'Media URLs array is required' },
        { status: 400 }
      );
    }

    const deletionResults = [];

    for (const mediaUrl of mediaUrls) {
      try {
        // Extract the file key from the URL
        const url = new URL(mediaUrl);
        const fileKey = url.pathname.substring(1); // Remove leading slash

        // Verify the file belongs to the current user (security check)
        if (!fileKey.startsWith(session.user.id + '/')) {
          console.warn(`Unauthorized cleanup attempt for file: ${fileKey}`);
          continue;
        }

        // Delete from R2 bucket
        const deleteCommand = new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: fileKey,
        });

        await r2Client.send(deleteCommand);
        deletionResults.push({ url: mediaUrl, status: 'deleted' });
        
      } catch (error) {
        console.error(`Failed to delete media: ${mediaUrl}`, error);
        deletionResults.push({ url: mediaUrl, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletionResults.filter(r => r.status === 'deleted').length} media files`,
      results: deletionResults,
    });

  } catch (error) {
    console.error('Error during media cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup media' },
      { status: 500 }
    );
  }
}
