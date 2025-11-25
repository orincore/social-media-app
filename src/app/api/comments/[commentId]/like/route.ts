import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

// POST - Like a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { commentId } = await params;
    const supabase = await createClient();

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('comment_id', commentId)
      .single();

    // If already liked, return success (idempotent)
    if (existingLike) {
      return NextResponse.json({ liked: true, alreadyLiked: true });
    }

    // Create like
    const { error: likeError } = await supabase
      .from('likes')
      .insert({
        user_id: session.user.id,
        comment_id: commentId,
      });

    if (likeError) {
      console.error('Error creating comment like:', likeError);
      return NextResponse.json(
        { error: 'Failed to like comment' },
        { status: 500 }
      );
    }

    // Increment likes count on comment and get comment details
    const { data: comment } = await supabase
      .from('comments')
      .select('likes_count, user_id, post_id')
      .eq('id', commentId)
      .single();

    if (comment) {
      await supabase
        .from('comments')
        .update({ likes_count: comment.likes_count + 1 })
        .eq('id', commentId);

      // Create comment like notification (only if not liking own comment)
      if (comment.user_id !== session.user.id) {
        const { data: likerData } = await supabase
          .from('users')
          .select('display_name, username')
          .eq('id', session.user.id)
          .single();

        if (likerData) {
          const { error: notificationError } = await adminClient
            .from('notifications')
            .insert({
              user_id: comment.user_id,
              actor_id: session.user.id,
              type: 'like',
              content: `${likerData.display_name} (@${likerData.username}) liked your comment`,
              post_id: comment.post_id,
              comment_id: commentId,
              is_read: false,
              created_at: new Date().toISOString()
            });

          if (notificationError) {
            console.error('Error creating comment like notification:', notificationError);
          } else {
            console.log('Comment like notification created successfully for user:', comment.user_id);
          }
        }
      }
    }

    return NextResponse.json({ liked: true });
  } catch (error) {
    console.error('Error in POST /api/comments/[commentId]/like:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Unlike a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { commentId } = await params;
    const supabase = await createClient();

    // Delete like
    const { error: deleteError } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', session.user.id)
      .eq('comment_id', commentId);

    if (deleteError) {
      console.error('Error deleting comment like:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unlike comment' },
        { status: 500 }
      );
    }

    // Decrement likes count on comment
    const { data: comment } = await supabase
      .from('comments')
      .select('likes_count')
      .eq('id', commentId)
      .single();

    if (comment && comment.likes_count > 0) {
      await supabase
        .from('comments')
        .update({ likes_count: comment.likes_count - 1 })
        .eq('id', commentId);
    }

    return NextResponse.json({ liked: false });
  } catch (error) {
    console.error('Error in DELETE /api/comments/[commentId]/like:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
