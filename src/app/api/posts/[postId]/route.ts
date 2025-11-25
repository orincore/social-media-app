import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

// GET - Fetch a single post with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { postId } = await params;
    const supabase = await createClient();

    // Fetch post first
    const { data: rawPost, error } = await adminClient
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();
    
    if (error || !rawPost) {
      console.error('Error fetching post:', error);
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Fetch user data separately
    const { data: user } = await adminClient
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified')
      .eq('id', rawPost.user_id)
      .single();

    const post = {
      ...rawPost,
      user: user || null
    };
    
    console.log('Single post user:', post.user);

    // Increment view count
    await supabase
      .from('posts')
      .update({ views_count: (post.views_count || 0) + 1 })
      .eq('id', postId);

    // Check user's interaction status
    let isLiked = false;
    let isReposted = false;
    let isBookmarked = false;

    if (session?.user?.id) {
      // Check if liked
      const { data: like } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('post_id', postId)
        .single();
      isLiked = !!like;

      // Check if reposted
      const { data: repost } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('repost_of_id', postId)
        .single();
      isReposted = !!repost;

      // Check if bookmarked
      const { data: bookmark } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('post_id', postId)
        .single();
      isBookmarked = !!bookmark;
    }

    return NextResponse.json({ 
      post,
      isLiked,
      isReposted,
      isBookmarked
    });
  } catch (error) {
    console.error('Error in GET /api/posts/[postId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a post (only owner)
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

    // Check if user owns the post
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (!post || post.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this post' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting post:', error);
      return NextResponse.json(
        { error: 'Failed to delete post' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/posts/[postId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
