import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

// POST - Bookmark a post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { postId } = await params;
    const supabase = await createClient();

    // Check if already bookmarked
    const { data: existingBookmark } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('post_id', postId)
      .single();

    // If already bookmarked, return success (idempotent)
    if (existingBookmark) {
      return NextResponse.json({ bookmarked: true, alreadyBookmarked: true });
    }

    // Create bookmark using adminClient to bypass RLS
    const { error: bookmarkError } = await adminClient
      .from('bookmarks')
      .insert({
        user_id: session.user.id,
        post_id: postId,
      });

    if (bookmarkError) {
      console.error('Error creating bookmark:', bookmarkError);
      return NextResponse.json(
        { error: 'Failed to bookmark post' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookmarked: true });
  } catch (error) {
    console.error('Error in POST /api/posts/[postId]/bookmark:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove bookmark
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { postId } = await params;
    const supabase = await createClient();

    // Delete bookmark using adminClient to bypass RLS
    const { error: deleteError } = await adminClient
      .from('bookmarks')
      .delete()
      .eq('user_id', session.user.id)
      .eq('post_id', postId);

    if (deleteError) {
      console.error('Error deleting bookmark:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove bookmark' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookmarked: false });
  } catch (error) {
    console.error('Error in DELETE /api/posts/[postId]/bookmark:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
