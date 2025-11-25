import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createClient } from '@/lib/supabase/server';

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

    // Increment likes count on comment
    const { data: comment } = await supabase
      .from('comments')
      .select('likes_count')
      .eq('id', commentId)
      .single();

    if (comment) {
      await supabase
        .from('comments')
        .update({ likes_count: comment.likes_count + 1 })
        .eq('id', commentId);
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
