import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId } = await params;

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch the target comment
    const { data: comment, error: commentError } = await adminClient
      .from('comments')
      .select('id, user_id, post_id, reply_to_id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Fetch the parent post to determine owner and current replies_count
    const { data: post, error: postError } = await adminClient
      .from('posts')
      .select('id, user_id, replies_count')
      .eq('id', comment.post_id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Parent post not found' }, { status: 404 });
    }

    const userId = session.user.id;

    const isCommentAuthor = comment.user_id === userId;
    const isPostOwner = post.user_id === userId;

    if (!isCommentAuthor && !isPostOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this comment' },
        { status: 403 }
      );
    }

    // Collect all descendant comments to keep counts accurate
    const allCommentIds = new Set<string>();
    const queue: string[] = [comment.id];

    while (queue.length > 0) {
      const batch = queue.splice(0, 20);

      batch.forEach((id) => allCommentIds.add(id));

      const { data: children, error: childrenError } = await adminClient
        .from('comments')
        .select('id')
        .in('reply_to_id', batch);

      if (childrenError) {
        return NextResponse.json(
          { error: 'Failed to resolve comment replies for deletion' },
          { status: 500 }
        );
      }

      if (children && children.length > 0) {
        const childIds = children.map((c) => c.id as string);
        queue.push(...childIds.filter((id) => !allCommentIds.has(id)));
      }
    }

    const totalToDelete = allCommentIds.size;

    if (totalToDelete === 0) {
      return NextResponse.json({ success: true, deletedCount: 0 });
    }

    const idsArray = Array.from(allCommentIds);

    // Delete all comments in the subtree
    const { error: deleteError } = await adminClient
      .from('comments')
      .delete()
      .in('id', idsArray);

    if (deleteError) {
      console.error('Error deleting comments:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      );
    }

    // Decrement replies_count on the post
    const postRepliesCount = post.replies_count ?? 0;
    const newPostRepliesCount = Math.max(0, postRepliesCount - totalToDelete);

    const { error: updatePostError } = await supabase
      .from('posts')
      .update({ replies_count: newPostRepliesCount })
      .eq('id', post.id);

    if (updatePostError) {
      console.error('Error updating post replies_count after comment delete:', updatePostError);
    }

    // If this was a reply, decrement replies_count on the parent comment
    if (comment.reply_to_id) {
      const { data: parentComment, error: parentError } = await adminClient
        .from('comments')
        .select('id, replies_count')
        .eq('id', comment.reply_to_id)
        .single();

      if (!parentError && parentComment) {
        const parentRepliesCount = parentComment.replies_count ?? 0;
        const newParentRepliesCount = Math.max(0, parentRepliesCount - totalToDelete);

        const { error: updateParentError } = await adminClient
          .from('comments')
          .update({ replies_count: newParentRepliesCount })
          .eq('id', parentComment.id);

        if (updateParentError) {
          console.error('Error updating parent comment replies_count after delete:', updateParentError);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        deletedCount: totalToDelete,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/comments/[commentId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
