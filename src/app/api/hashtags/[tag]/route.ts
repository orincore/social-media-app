import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch posts by hashtag
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const normalizedTag = tag.toLowerCase();

    // Get hashtag info
    const { data: hashtagInfo } = await supabase
      .from('hashtags')
      .select('*')
      .eq('name', normalizedTag)
      .single();

    // Get posts with this hashtag
    const { data: posts, error } = await supabase
      .from('posts')
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
      .contains('hashtags', [normalizedTag])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching posts by hashtag:', error);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .contains('hashtags', [normalizedTag]);

    return NextResponse.json({
      hashtag: hashtagInfo || { name: normalizedTag, posts_count: totalCount || 0 },
      posts: posts || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasMore: offset + limit < (totalCount || 0),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/hashtags/[tag]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
