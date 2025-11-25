'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

interface RateLimitStatus {
  remaining: number;
  resetTime: number;
  isLimited: boolean;
}

interface ModerationStats {
  rateLimitStatus: RateLimitStatus;
  dailyLimit: number;
  modelUsed: string;
}

export default function ModerationDashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/moderation/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch moderation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const testModeration = async () => {
    setTestLoading(true);
    try {
      const response = await fetch('/api/admin/moderation/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'This is a test message for content moderation.' })
      });
      
      if (response.ok) {
        const result = await response.json();
        setTestResult(result);
        // Refresh stats after test
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to test moderation:', error);
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Access denied. Admin privileges required.</p>
      </div>
    );
  }

  const formatResetTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusColor = (isLimited: boolean, remaining: number) => {
    if (isLimited) return 'destructive';
    if (remaining < 50) return 'warning';
    return 'success';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Content Moderation Dashboard</h1>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Rate Limit Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Quota Status</CardTitle>
              {stats.rateLimitStatus.isLimited ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.rateLimitStatus.remaining}/{stats.dailyLimit}
              </div>
              <p className="text-xs text-muted-foreground">
                Requests remaining today
              </p>
              <Badge 
                variant={getStatusColor(stats.rateLimitStatus.isLimited, stats.rateLimitStatus.remaining)}
                className="mt-2"
              >
                {stats.rateLimitStatus.isLimited ? 'Rate Limited' : 'Active'}
              </Badge>
            </CardContent>
          </Card>

          {/* Model Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Model</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.modelUsed}</div>
              <p className="text-xs text-muted-foreground">
                Current Gemini model
              </p>
              <div className="mt-2 text-sm">
                <div>Daily Limit: {stats.dailyLimit} RPD</div>
                <div>Rate Limit: 10 RPM</div>
              </div>
            </CardContent>
          </Card>

          {/* Reset Time */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quota Reset</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {formatResetTime(stats.rateLimitStatus.resetTime)}
              </div>
              <p className="text-xs text-muted-foreground">
                Next quota reset time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Moderation */}
      <Card>
        <CardHeader>
          <CardTitle>Test Moderation System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testModeration} 
            disabled={testLoading}
            className="w-full md:w-auto"
          >
            {testLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Testing...
              </>
            ) : (
              'Run Test Moderation'
            )}
          </Button>

          {testResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Test Result:</h4>
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Free Tier Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm space-y-1">
            <p><strong>Gemini 2.5 Flash:</strong> 250 requests/day, 10 requests/minute</p>
            <p><strong>Strategy:</strong> Keyword filtering first, AI for uncertain cases</p>
            <p><strong>Fallback:</strong> Pure keyword filtering when quota exceeded</p>
            <p><strong>Reset:</strong> Quota resets every 24 hours</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
