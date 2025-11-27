import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

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

    const filesToDelete: string[] = [];

    for (const mediaUrl of mediaUrls) {
      try {
        // Extract the file key from the URL
        const url = new URL(mediaUrl);
        let fileKey: string;
        
        if (url.pathname.includes('/storage/v1/object/public/media/')) {
          // Supabase Storage URL
          fileKey = url.pathname.split('/storage/v1/object/public/media/')[1];
        } else {
          // R2 or other URL format
          fileKey = url.pathname.substring(1);
        }

        // Verify the file belongs to the current user (security check)
        if (!fileKey.startsWith(session.user.id + '/')) {
          console.warn(`Unauthorized cleanup attempt for file: ${fileKey}`);
          continue;
        }

        filesToDelete.push(fileKey);
      } catch (error) {
        console.error(`Failed to parse media URL: ${mediaUrl}`, error);
      }
    }

    // Batch delete from Supabase Storage
    if (filesToDelete.length > 0) {
      const { error } = await adminClient.storage
        .from('media')
        .remove(filesToDelete);

      if (error) {
        console.error('Error deleting files from Supabase Storage:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${filesToDelete.length} media files`,
    });

  } catch (error) {
    console.error('Error during media cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup media' },
      { status: 500 }
    );
  }
}
