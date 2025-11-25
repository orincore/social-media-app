import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Get user's strikes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: strikes, error } = await adminClient
      .from('content_strikes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching strikes:', error);
      return NextResponse.json({ error: 'Failed to fetch strikes' }, { status: 500 });
    }

    // Count active strikes (within 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const activeStrikes = strikes?.filter(strike => 
      new Date(strike.created_at) > threeMonthsAgo
    ) || [];

    return NextResponse.json({
      strikes: strikes || [],
      activeStrikes: activeStrikes.length,
      totalStrikes: strikes?.length || 0
    });

  } catch (error) {
    console.error('Error in GET /api/strikes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a strike for content violation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      user_id, 
      violation_type, 
      content, 
      post_id, 
      reason 
    } = await request.json();

    if (!user_id || !violation_type || !content) {
      return NextResponse.json({ 
        error: 'user_id, violation_type, and content are required' 
      }, { status: 400 });
    }

    // Add strike to database
    const { data: strike, error: strikeError } = await adminClient
      .from('content_strikes')
      .insert({
        user_id,
        violation_type,
        content,
        post_id,
        reason,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (strikeError) {
      console.error('Error creating strike:', strikeError);
      return NextResponse.json({ error: 'Failed to create strike' }, { status: 500 });
    }

    // Check how many active strikes the user has (within 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: activeStrikes, error: countError } = await adminClient
      .from('content_strikes')
      .select('id')
      .eq('user_id', user_id)
      .gte('created_at', threeMonthsAgo.toISOString());

    if (countError) {
      console.error('Error counting strikes:', countError);
    }

    const strikeCount = activeStrikes?.length || 0;

    // Send notification to user about the violation
    await adminClient
      .from('notifications')
      .insert({
        user_id: user_id,
        type: 'content_violation',
        content: `Your post violated our community guidelines: ${reason}. Strike ${strikeCount}/3.`,
        is_read: false,
        created_at: new Date().toISOString()
      });

    // If user has 3 or more strikes, suspend the account
    if (strikeCount >= 3) {
      await adminClient
        .from('users')
        .update({ 
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspension_reason: 'Multiple community guideline violations'
        })
        .eq('id', user_id);

      // Send suspension notification
      await adminClient
        .from('notifications')
        .insert({
          user_id: user_id,
          type: 'account_suspended',
          content: 'Your account has been permanently suspended due to repeated violations of our community guidelines.',
          is_read: false,
          created_at: new Date().toISOString()
        });

      return NextResponse.json({ 
        strike,
        strikeCount,
        accountSuspended: true,
        message: 'Account suspended due to repeated violations'
      });
    }

    return NextResponse.json({ 
      strike,
      strikeCount,
      accountSuspended: false,
      message: `Strike ${strikeCount}/3 added`
    });

  } catch (error) {
    console.error('Error in POST /api/strikes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
