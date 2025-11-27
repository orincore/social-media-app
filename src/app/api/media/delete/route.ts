import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

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
    // Supabase URL format: https://<project>.supabase.co/storage/v1/object/public/media/userId/timestamp-nanoid.ext
    // R2 URL format: https://pub-xxx.r2.dev/userId/timestamp-nanoid.ext
    let fileKey: string;
    
    try {
      const url = new URL(mediaUrl);
      
      if (url.pathname.includes('/storage/v1/object/public/media/')) {
        // Supabase Storage URL
        fileKey = url.pathname.split('/storage/v1/object/public/media/')[1];
      } else {
        // R2 or other URL format
        fileKey = url.pathname.substring(1); // Remove leading slash
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid media URL' },
        { status: 400 }
      );
    }

    // Verify the file belongs to the current user (security check)
    if (!fileKey.startsWith(session.user.id + '/')) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this file' },
        { status: 403 }
      );
    }

    // Delete from Supabase Storage
    const { error } = await adminClient.storage
      .from('media')
      .remove([fileKey]);

    if (error) {
      console.error('Error deleting from Supabase Storage:', error);
      // Don't fail if file doesn't exist
      if (!error.message?.includes('not found')) {
        return NextResponse.json(
          { error: 'Failed to delete media' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}
