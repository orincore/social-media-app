import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

// POST - Like a post
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

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('post_id', postId)
      .single();

    // If already liked, just return success (idempotent)
    if (existingLike) {
      return NextResponse.json({ liked: true, alreadyLiked: true });
    }

    // Create like
    const { error: likeError } = await supabase
      .from('likes')
      .insert({
        user_id: session.user.id,
        post_id: postId,
      });

    if (likeError) {
      console.error('Error creating like:', likeError);
      return NextResponse.json(
        { error: 'Failed to like post' },
        { status: 500 }
      );
    }

    // Increment likes count on post
    const { data: post } = await supabase
      .from('posts')
      .select('likes_count, user_id')
      .eq('id', postId)
      .single();

    if (post) {
      await supabase
        .from('posts')
        .update({ likes_count: post.likes_count + 1 })
        .eq('id', postId);

      // Create like notification (only if not liking own post)
      if (post.user_id !== session.user.id) {
        const { data: likerData } = await supabase
          .from('users')
          .select('display_name, username')
          .eq('id', session.user.id)
          .single();

        if (likerData) {
          const { error: notificationError } = await adminClient
            .from('notifications')
            .insert({
              user_id: post.user_id,
              actor_id: session.user.id,
              type: 'like',
              content: `${likerData.display_name} (@${likerData.username}) liked your post`,
              post_id: postId,
              is_read: false,
              created_at: new Date().toISOString()
            });

          if (notificationError) {
            console.error('Error creating like notification:', notificationError);
          } else {
            console.log('Like notification created successfully for user:', post.user_id);
          }
        }
      }
    }

    return NextResponse.json({ liked: true });
  } catch (error) {
    console.error('Error in POST /api/posts/[postId]/like:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Unlike a post
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

    // Delete like
    const { error: deleteError } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', session.user.id)
      .eq('post_id', postId);

    if (deleteError) {
      console.error('Error deleting like:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unlike post' },
        { status: 500 }
      );
    }

    // Decrement likes count on post
    const { data: post } = await supabase
      .from('posts')
      .select('likes_count')
      .eq('id', postId)
      .single();

    if (post && post.likes_count > 0) {
      await supabase
        .from('posts')
        .update({ likes_count: post.likes_count - 1 })
        .eq('id', postId);
    }

    return NextResponse.json({ liked: false });
  } catch (error) {
    console.error('Error in DELETE /api/posts/[postId]/like:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
