import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createClient } from '@/lib/supabase/server';

// POST - Repost a post to own feed
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

    // Check if already reposted
    const { data: existingRepost } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('repost_of_id', postId)
      .single();

    // If already reposted, just return success (idempotent)
    if (existingRepost) {
      return NextResponse.json({ reposted: true, alreadyReposted: true });
    }

    // Get original post
    const { data: originalPost } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (!originalPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Create repost
    const { data: repost, error: repostError } = await supabase
      .from('posts')
      .insert({
        user_id: session.user.id,
        content: originalPost.content,
        media_urls: originalPost.media_urls,
        repost_of_id: postId,
        hashtags: originalPost.hashtags,
        mentions: originalPost.mentions,
      })
      .select(`
        *,
        user:users (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .single();

    if (repostError) {
      console.error('Error creating repost:', repostError);
      return NextResponse.json(
        { error: 'Failed to repost' },
        { status: 500 }
      );
    }

    // Increment reposts count on original post
    const { data: post } = await supabase
      .from('posts')
      .select('reposts_count')
      .eq('id', postId)
      .single();

    if (post) {
      await supabase
        .from('posts')
        .update({ reposts_count: post.reposts_count + 1 })
        .eq('id', postId);
    }

    return NextResponse.json({ repost, reposted: true });
  } catch (error) {
    console.error('Error in POST /api/posts/[postId]/repost:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove repost
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

    // Find and delete the repost
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('user_id', session.user.id)
      .eq('repost_of_id', postId);

    if (deleteError) {
      console.error('Error removing repost:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove repost' },
        { status: 500 }
      );
    }

    // Decrement reposts count on original post
    const { data: post } = await supabase
      .from('posts')
      .select('reposts_count')
      .eq('id', postId)
      .single();

    if (post && post.reposts_count > 0) {
      await supabase
        .from('posts')
        .update({ reposts_count: post.reposts_count - 1 })
        .eq('id', postId);
    }

    return NextResponse.json({ reposted: false });
  } catch (error) {
    console.error('Error in DELETE /api/posts/[postId]/repost:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
