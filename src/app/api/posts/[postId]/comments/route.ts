import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

// GET - Fetch comments for a post with pagination (includes replies)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { postId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0') || (page - 1) * limit;
    const parentId = searchParams.get('parentId');

    // If parentId is provided, fetch replies for that specific comment
    if (parentId) {
      const { data: rawComments, error } = await adminClient
        .from('comments')
        .select('*')
        .eq('reply_to_id', parentId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching replies:', error);
        return NextResponse.json(
          { error: 'Failed to fetch replies' },
          { status: 500 }
        );
      }

      // Get user IDs and fetch user data
      const userIds = [...new Set(rawComments?.map(c => c.user_id).filter(Boolean) || [])];
      let userMap = new Map<string, any>();
      
      if (userIds.length > 0) {
        const { data: users } = await adminClient
          .from('users')
          .select('id, username, display_name, avatar_url, is_verified')
          .in('id', userIds);
        
        if (users) {
          userMap = new Map(users.map(u => [u.id, u]));
        }
      }

      // Build comments with user data
      const comments = (rawComments || []).map(comment => ({
        ...comment,
        user: userMap.get(comment.user_id) || null,
        replies: [],
        hasMoreReplies: false
      }));

      // Get liked comment IDs for the current user
      let likedCommentIds: string[] = [];
      if (session?.user?.id) {
        const { data: likes } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', session.user.id)
          .in('post_id', comments.map(c => c.id));
        
        likedCommentIds = likes?.map(like => like.post_id).filter((id): id is string => Boolean(id)) || [];
      }

      // Check if there are more replies
      const { count } = await adminClient
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('reply_to_id', parentId);

      const hasMore = (count || 0) > offset + limit;

      return NextResponse.json({
        comments,
        likedCommentIds,
        hasMore,
        pagination: {
          page,
          limit,
          offset,
          total: count || 0,
          hasMore
        }
      });
    }

    // Fetch top-level comments
    const { data: rawComments, error } = await adminClient
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .is('reply_to_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    // Collect all user IDs from comments
    const commentUserIds = rawComments?.map(c => c.user_id).filter(Boolean) || [];
    
    // Fetch replies for each top-level comment
    const commentIds = rawComments?.map(c => c.id) || [];
    const { data: allReplies } = await adminClient
      .from('comments')
      .select('*')
      .in('reply_to_id', commentIds)
      .order('created_at', { ascending: true });
    
    // Collect reply user IDs
    const replyUserIds = allReplies?.map(r => r.user_id).filter(Boolean) || [];
    
    // Fetch all users at once
    const allUserIds = [...new Set([...commentUserIds, ...replyUserIds])];
    let userMap = new Map<string, any>();
    
    if (allUserIds.length > 0) {
      const { data: users } = await adminClient
        .from('users')
        .select('id, username, display_name, avatar_url, is_verified')
        .in('id', allUserIds);
      
      if (users) {
        userMap = new Map(users.map(u => [u.id, u]));
      }
      console.log('Comments - Fetched users:', users?.length, 'Sample:', users?.[0]);
    }

    // Build comments with user data and replies
    const commentsWithReplies = (rawComments || []).map(comment => {
      const commentReplies = (allReplies || [])
        .filter(r => r.reply_to_id === comment.id)
        .slice(0, 3)
        .map(reply => ({
          ...reply,
          user: userMap.get(reply.user_id) || null
        }));

      return {
        ...comment,
        user: userMap.get(comment.user_id) || null,
        replies: commentReplies,
        hasMoreReplies: (comment.replies_count || 0) > 3
      };
    });

    // Get liked comment IDs for current user
    let likedCommentIds: string[] = [];
    if (session?.user?.id && commentsWithReplies.length > 0) {
      const allCommentIds = commentsWithReplies.flatMap(c => [
        c.id,
        ...c.replies.map((r: { id: string }) => r.id)
      ]);

      const { data: likes } = await supabase
        .from('likes')
        .select('comment_id')
        .eq('user_id', session.user.id)
        .in('comment_id', allCommentIds);

      if (likes) {
        likedCommentIds = likes.map(l => l.comment_id).filter((id): id is string => id !== null);
      }
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .is('reply_to_id', null);

    return NextResponse.json({
      comments: commentsWithReplies,
      likedCommentIds,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasMore: offset + limit < (totalCount || 0),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/posts/[postId]/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new comment
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
    const body = await request.json();
    const { content, replyToId } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > 280) {
      return NextResponse.json(
        { error: 'Content exceeds 280 characters' },
        { status: 400 }
      );
    }

    // Create the comment
    const commentData: {
      post_id: string;
      user_id: string;
      content: string;
      reply_to_id?: string;
    } = {
      post_id: postId,
      user_id: session.user.id,
      content: content.trim(),
    };

    if (replyToId) {
      commentData.reply_to_id = replyToId;
    }

    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert(commentData)
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

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    // Increment replies count on post
    const { data: post } = await supabase
      .from('posts')
      .select('replies_count, user_id')
      .eq('id', postId)
      .single();

    if (post) {
      await supabase
        .from('posts')
        .update({ replies_count: post.replies_count + 1 })
        .eq('id', postId);

      // Create comment notification (only if not commenting on own post)
      if (post.user_id !== session.user.id) {
        const { data: commenterData } = await supabase
          .from('users')
          .select('display_name, username')
          .eq('id', session.user.id)
          .single();

        if (commenterData) {
          const { error: notificationError } = await adminClient
            .from('notifications')
            .insert({
              user_id: post.user_id,
              actor_id: session.user.id,
              type: 'comment',
              content: `${commenterData.display_name} (@${commenterData.username}) commented on your post`,
              post_id: postId,
              comment_id: comment.id,
              is_read: false,
              created_at: new Date().toISOString()
            });

          if (notificationError) {
            console.error('Error creating comment notification:', notificationError);
          } else {
            console.log('Comment notification created successfully for user:', post.user_id);
          }
        }
      }
    }

    // If this is a reply to another comment, increment that comment's replies_count
    if (replyToId) {
      const { data: parentComment } = await supabase
        .from('comments')
        .select('replies_count, user_id')
        .eq('id', replyToId)
        .single();

      if (parentComment) {
        await supabase
          .from('comments')
          .update({ replies_count: parentComment.replies_count + 1 })
          .eq('id', replyToId);

        // Create reply notification (only if not replying to own comment)
        if (parentComment.user_id !== session.user.id) {
          const { data: replierData } = await supabase
            .from('users')
            .select('display_name, username')
            .eq('id', session.user.id)
            .single();

          if (replierData) {
            const { error: replyNotificationError } = await adminClient
              .from('notifications')
              .insert({
                user_id: parentComment.user_id,
                actor_id: session.user.id,
                type: 'comment',
                content: `${replierData.display_name} (@${replierData.username}) replied to your comment`,
                post_id: postId,
                comment_id: comment.id,
                is_read: false,
                created_at: new Date().toISOString()
              });

            if (replyNotificationError) {
              console.error('Error creating reply notification:', replyNotificationError);
            } else {
              console.log('Reply notification created successfully for user:', parentComment.user_id);
            }
          }
        }
      }
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/posts/[postId]/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
