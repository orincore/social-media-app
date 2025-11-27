import { useState, useEffect, useCallback } from 'react';

interface NotificationPreferences {
  mentions: boolean;
  community: boolean;
  product: boolean;
  login_alerts: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

interface PrivacySettings {
  safety_prompts: boolean;
  profile_visibility: boolean;
  discoverability: boolean;
  show_online_status: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  font_size: 'small' | 'medium' | 'large';
  density: 'compact' | 'comfortable' | 'spacious';
}

interface UserSession {
  id: string;
  deviceInfo: any;
  ipAddress: string;
  userAgent: string;
  locationInfo: any;
  isCurrent: boolean;
  lastActive: string;
  createdAt: string;
}

export function useNotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/notifications');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }
      
      const data = await response.json();
      setPreferences(data.preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      setError(null);
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: newPreferences }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, []);

  const togglePreference = useCallback(async (key: keyof NotificationPreferences) => {
    if (!preferences) return false;
    
    const newValue = !preferences[key];
    return await updatePreferences({ [key]: newValue });
  }, [preferences, updatePreferences]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    togglePreference,
    refetch: fetchPreferences,
  };
}

export function usePrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/privacy');
      
      if (!response.ok) {
        throw new Error('Failed to fetch privacy settings');
      }
      
      const data = await response.json();
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<PrivacySettings>) => {
    try {
      setError(null);
      const response = await fetch('/api/settings/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: newSettings }),
      });

      if (!response.ok) {
        throw new Error('Failed to update privacy settings');
      }

      const data = await response.json();
      setSettings(data.settings);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, []);

  const toggleSetting = useCallback(async (key: keyof PrivacySettings) => {
    if (!settings) return false;
    
    const newValue = !settings[key];
    return await updateSettings({ [key]: newValue });
  }, [settings, updateSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    toggleSetting,
    refetch: fetchSettings,
  };
}

export function useAppearanceSettings() {
  const [settings, setSettings] = useState<AppearanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/appearance');
      
      if (!response.ok) {
        throw new Error('Failed to fetch appearance settings');
      }
      
      const data = await response.json();
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<AppearanceSettings>) => {
    try {
      setError(null);
      const response = await fetch('/api/settings/appearance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: newSettings }),
      });

      if (!response.ok) {
        throw new Error('Failed to update appearance settings');
      }

      const data = await response.json();
      setSettings(data.settings);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings,
  };
}

export function useUserSessions() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      // Best-effort: ensure current device session is recorded before fetching
      try {
        await fetch('/api/settings/sessions/track', { method: 'POST' });
      } catch {
        // Ignore tracking errors; we still try to load any existing sessions
      }

      const response = await fetch('/api/settings/sessions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user sessions');
      }
      
      const data = await response.json();
      setSessions(data.sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const removeSession = useCallback(async (sessionId: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/settings/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove session');
      }

      // Refresh sessions list
      await fetchSessions();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchSessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    removeSession,
    refetch: fetchSessions,
  };
}
