import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Fetch user's bookmarked posts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Fetch bookmarked posts with post details and author info
    const { data: bookmarks, error } = await adminClient
      .from('bookmarks')
      .select(`
        id,
        created_at,
        post:post_id (
          id,
          content,
          created_at,
          updated_at,
          likes_count,
          replies_count,
          reposts_count,
          user_id,
          users!posts_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching bookmarks:', error);
      return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
    }

    // Filter out bookmarks where post might be null (deleted posts)
    const validBookmarks = (bookmarks || []).filter(bookmark => bookmark.post);

    // Get total count for pagination
    const { count: totalCount } = await adminClient
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);

    const hasMore = totalCount ? offset + limit < totalCount : false;

    return NextResponse.json({
      bookmarks: validBookmarks,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        hasMore
      }
    });

  } catch (error) {
    console.error('Error in GET /api/bookmarks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a bookmark
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { post_id } = await request.json();

    if (!post_id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Check if bookmark already exists
    const { data: existingBookmark } = await adminClient
      .from('bookmarks')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('post_id', post_id)
      .single();

    if (existingBookmark) {
      return NextResponse.json({ error: 'Post already bookmarked' }, { status: 409 });
    }

    // Create bookmark
    const { data: bookmark, error } = await adminClient
      .from('bookmarks')
      .insert({
        user_id: session.user.id,
        post_id: post_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bookmark:', error);
      return NextResponse.json({ error: 'Failed to create bookmark' }, { status: 500 });
    }

    // Note: Bookmark count can be calculated dynamically when needed

    return NextResponse.json({ bookmark });

  } catch (error) {
    console.error('Error in POST /api/bookmarks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a bookmark
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { post_id } = await request.json();

    if (!post_id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Delete bookmark
    const { error } = await adminClient
      .from('bookmarks')
      .delete()
      .eq('user_id', session.user.id)
      .eq('post_id', post_id);

    if (error) {
      console.error('Error deleting bookmark:', error);
      return NextResponse.json({ error: 'Failed to delete bookmark' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/bookmarks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
