import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// Report reason codes
const VALID_REASON_CODES = [
  'spam',
  'harassment',
  'hate_speech',
  'violence',
  'nudity',
  'misinformation',
  'impersonation',
  'copyright',
  'other'
] as const;

type ReasonCode = typeof VALID_REASON_CODES[number];
type TargetType = 'message' | 'profile' | 'post';

interface ReportRequest {
  target_type: TargetType;
  target_id: string;
  reason_code: ReasonCode;
  reason_text?: string;
}

// POST - Create a new report
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ReportRequest = await request.json();
    const { target_type, target_id, reason_code, reason_text } = body;

    // Validate required fields
    if (!target_type || !target_id || !reason_code) {
      return NextResponse.json(
        { error: 'target_type, target_id, and reason_code are required' },
        { status: 400 }
      );
    }

    // Validate target_type
    if (!['message', 'profile', 'post'].includes(target_type)) {
      return NextResponse.json(
        { error: 'Invalid target_type. Must be message, profile, or post' },
        { status: 400 }
      );
    }

    // Validate reason_code
    if (!VALID_REASON_CODES.includes(reason_code)) {
      return NextResponse.json(
        { error: 'Invalid reason_code' },
        { status: 400 }
      );
    }

    // Verify target exists and get owner info
    let targetOwnerId: string | null = null;

    if (target_type === 'message') {
      const { data: message, error } = await adminClient
        .from('messages')
        .select('id, sender_id')
        .eq('id', target_id)
        .single();

      if (error || !message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      targetOwnerId = message.sender_id;
    } else if (target_type === 'profile') {
      const { data: user, error } = await adminClient
        .from('users')
        .select('id')
        .eq('id', target_id)
        .single();

      if (error || !user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      targetOwnerId = user.id;
    } else if (target_type === 'post') {
      const { data: post, error } = await adminClient
        .from('posts')
        .select('id, user_id')
        .eq('id', target_id)
        .single();

      if (error || !post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
      targetOwnerId = post.user_id;
    }

    // Prevent self-reporting
    if (targetOwnerId === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot report your own content' },
        { status: 400 }
      );
    }

    // Check for duplicate report
    let duplicateQuery = adminClient
      .from('reports')
      .select('id')
      .eq('reporter_id', session.user.id)
      .eq('target_type', target_type);

    if (target_type === 'message') {
      duplicateQuery = duplicateQuery.eq('target_message_id', target_id);
    } else if (target_type === 'profile') {
      duplicateQuery = duplicateQuery.eq('target_profile_id', target_id);
    } else if (target_type === 'post') {
      duplicateQuery = duplicateQuery.eq('target_post_id', target_id);
    }

    const { data: existingReport } = await duplicateQuery.single();

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this content' },
        { status: 400 }
      );
    }

    // Create the report
    const reportData: {
      reporter_id: string;
      target_type: TargetType;
      target_message_id: string | null;
      target_profile_id: string | null;
      target_post_id: string | null;
      reason_code: ReasonCode;
      reason_text: string | null;
      status: 'pending';
      created_at: string;
    } = {
      reporter_id: session.user.id,
      target_type,
      target_message_id: target_type === 'message' ? target_id : null,
      target_profile_id: target_type === 'profile' ? target_id : null,
      target_post_id: target_type === 'post' ? target_id : null,
      reason_code,
      reason_text: reason_text || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data: report, error: insertError } = await adminClient
      .from('reports')
      .insert(reportData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating report:', insertError);
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      );
    }

    // Log for moderation system (placeholder)
    console.log('[MODERATION] New report created:', {
      report_id: report.id,
      reporter_id: session.user.id,
      target_type,
      target_id,
      reason_code,
    });

    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully',
      report_id: report.id,
    });

  } catch (error) {
    console.error('Error in POST /api/reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get reports (admin/moderation use)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check here
    // For now, allow any authenticated user to view their own reports

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || 'pending';
    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'] as const;
    const status = validStatuses.includes(statusParam as typeof validStatuses[number]) 
      ? (statusParam as typeof validStatuses[number])
      : 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get reports created by the current user
    const { data: reports, error, count } = await adminClient
      .from('reports')
      .select(`
        id,
        reporter_id,
        target_type,
        target_message_id,
        target_profile_id,
        target_post_id,
        reason_code,
        reason_text,
        status,
        created_at
      `, { count: 'exact' })
      .eq('reporter_id', session.user.id)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      },
    });

  } catch (error) {
    console.error('Error in GET /api/reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
