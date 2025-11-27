import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';
import type { TablesInsert, Json } from '@/lib/supabase/types';

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0]?.trim();
    if (ip && ip !== '::1' && ip !== '127.0.0.1') {
      return ip;
    }
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp !== '::1' && realIp !== '127.0.0.1') return realIp;
  return null;
}

function getDeviceInfo(userAgent: string | null) {
  const ua = (userAgent || '').toLowerCase();
  let name = 'Unknown device';
  if (ua.includes('iphone') || ua.includes('android') || ua.includes('mobile')) {
    name = 'Mobile device';
  } else if (ua.includes('ipad') || ua.includes('tablet')) {
    name = 'Tablet device';
  } else if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
    name = 'Desktop browser';
  }
  return { name };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;
    const userAgent = request.headers.get('user-agent');
    const ipAddress = getClientIp(request);
    const deviceInfo = getDeviceInfo(userAgent);

    // Best-effort GeoIP lookup (optional)
    let locationInfo: Json | undefined;
    const geoUrl = process.env.GEOIP_SERVICE_URL;
    const geoApiKey = process.env.GEOIP_API_KEY;

    if (ipAddress && geoUrl) {
      try {
        const url = new URL(geoUrl);
        url.searchParams.set('ip', ipAddress);
        if (geoApiKey) {
          url.searchParams.set('apiKey', geoApiKey);
        }

        const geoRes = await fetch(url.toString(), { cache: 'no-store' });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          // Normalize common fields if present
          locationInfo = {
            city: geoData.city || geoData.city_name || null,
            country: geoData.country || geoData.country_name || geoData.countryCode || null,
            region: geoData.region || geoData.region_name || null,
          };
        }
      } catch (error) {
        console.error('GeoIP lookup failed:', error);
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Try to find an existing session for this user + device (UA, and IP when available)
    let existingSessionId: string | null = null;
    if (userAgent) {
      let query = adminClient
        .from('user_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('user_agent', userAgent as string)
        .limit(1);

      // Only include IP in the match if we have a real (non-localhost) address
      if (ipAddress) {
        query = query.eq('ip_address', ipAddress);
      }

      const { data: existing, error: selectError } = await query.maybeSingle();

      if (!selectError && existing) {
        existingSessionId = existing.id as string;
      }
    }

    if (existingSessionId) {
      // Update existing session's last_active and keep it marked current
      const { error: updateError } = await adminClient
        .from('user_sessions')
        .update({
          device_info: deviceInfo,
          location_info: locationInfo,
          is_current: true,
          last_active: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', existingSessionId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating user session:', updateError);
        return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
      }
    } else {
      // Insert new session row for this device
      const insertPayload: TablesInsert<'user_sessions'> = {
        user_id: userId,
        session_token: crypto.randomUUID(),
        device_info: deviceInfo,
        ip_address: ipAddress,
        user_agent: userAgent,
        location_info: locationInfo,
        is_current: true,
        last_active: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      };

      const { error } = await adminClient.from('user_sessions').insert(insertPayload);

      if (error) {
        console.error('Error tracking user session:', error);
        return NextResponse.json({ error: 'Failed to track session' }, { status: 500 });
      }
    }

    // Cleanup: ensure only the most recent session for this user+UA is kept
    if (userAgent) {
      const { data: allSessions, error: listError } = await adminClient
        .from('user_sessions')
        .select('id, last_active')
        .eq('user_id', userId)
        .eq('user_agent', userAgent as string)
        .order('last_active', { ascending: false });

      if (!listError && allSessions && allSessions.length > 1) {
        // Keep the newest; delete everything after index 0
        const idsToDelete = allSessions.slice(1).map((s: any) => s.id as string);
        if (idsToDelete.length > 0) {
          const { error: deleteError } = await adminClient
            .from('user_sessions')
            .delete()
            .in('id', idsToDelete)
            .eq('user_id', userId);

          if (deleteError) {
            console.error('Error cleaning up duplicate user sessions:', deleteError);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/settings/sessions/track:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
