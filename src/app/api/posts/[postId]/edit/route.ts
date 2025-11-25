import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// PUT - Edit a post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > 280) {
      return NextResponse.json({ error: 'Content must be less than 280 characters' }, { status: 400 });
    }

    // Check if post exists and user owns it
    const { data: post, error: postError } = await adminClient
      .from('posts')
      .select('id, user_id, content')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.user_id !== session.user.id) {
      return NextResponse.json({ error: 'You can only edit your own posts' }, { status: 403 });
    }

    // Extract hashtags and mentions from content
    const hashtags = content.match(/#\w+/g)?.map((tag: string) => tag.slice(1).toLowerCase()) || [];
    const mentions = content.match(/@\w+/g)?.map((mention: string) => mention.slice(1).toLowerCase()) || [];

    // Update the post
    const { data: updatedPost, error: updateError } = await adminClient
      .from('posts')
      .update({
        content: content.trim(),
        hashtags: hashtags.length > 0 ? hashtags : null,
        mentions: mentions.length > 0 ? mentions : null,
        is_edited: true,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
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

    if (updateError) {
      console.error('Error updating post:', updateError);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Post updated successfully'
    });

  } catch (error) {
    console.error('Error in PUT /api/posts/[postId]/edit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
