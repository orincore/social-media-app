'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useUserSessions } from '@/hooks/use-settings';
import { Smartphone, Monitor, Tablet, Trash2, MapPin, Clock, Loader2 } from 'lucide-react';

interface SessionsManagerProps {
  className?: string;
}

export function SessionsManager({ className = '' }: SessionsManagerProps) {
  const { sessions, loading, error, removeSession } = useUserSessions();
  const [removingSession, setRemovingSession] = useState<string | null>(null);

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent?.toLowerCase() || '';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getDeviceName = (userAgent: string, deviceInfo: any) => {
    if (deviceInfo?.name) return deviceInfo.name;
    
    const ua = userAgent?.toLowerCase() || '';
    if (ua.includes('chrome')) return 'Chrome Browser';
    if (ua.includes('firefox')) return 'Firefox Browser';
    if (ua.includes('safari')) return 'Safari Browser';
    if (ua.includes('edge')) return 'Edge Browser';
    return 'Unknown Device';
  };

  const getLocationString = (locationInfo: any) => {
    if (locationInfo?.city && locationInfo?.country) {
      return `${locationInfo.city}, ${locationInfo.country}`;
    }
    if (locationInfo?.country) {
      return locationInfo.country;
    }
    if (locationInfo?.city) {
      return locationInfo.city;
    }
    return 'Unknown location';
  };

  const formatLastActive = (lastActive: string) => {
    const date = new Date(lastActive);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleRemoveSession = async (sessionId: string) => {
    setRemovingSession(sessionId);
    const success = await removeSession(sessionId);
    if (!success) {
      // Error handling is done in the hook
    }
    setRemovingSession(null);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {sessions.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-4">
          No active sessions found
        </p>
      ) : (
        sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-start justify-between rounded-2xl border border-border bg-background p-4"
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="text-primary mt-1">
                {getDeviceIcon(session.userAgent)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground">
                    {getDeviceName(session.userAgent, session.deviceInfo)}
                  </p>
                  {session.isCurrent && (
                    <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{getLocationString(session.locationInfo)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatLastActive(session.lastActive)}</span>
                  </div>
                  {session.ipAddress && (
                    <div className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                      <span>IP: {session.ipAddress}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!session.isCurrent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveSession(session.id)}
                disabled={removingSession === session.id}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2"
              >
                {removingSession === session.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
