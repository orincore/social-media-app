'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Flag,
  User,
  MessageCircle,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Trash2,
  Ban,
} from 'lucide-react';

interface ReportDetail {
  id: string;
  reporter_id: string;
  target_profile_id: string | null;
  target_post_id: string | null;
  target_type: 'message' | 'profile' | 'post';
  reason_code: string;
  reason_text: string | null;
  status: string;
  priority: string | null;
  resolution_type: string | null;
  resolution_notes: string | null;
  created_at: string;
}

interface SimpleUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Note {
  id: string;
  admin_id: string;
  content: string;
  created_at: string;
}

interface ReportDetailResponse {
  report: ReportDetail;
  reporter: SimpleUser | null;
  target_user: (SimpleUser & { email?: string; created_at?: string }) | null;
  target_post: { id: string; content: string | null; media_urls: string[] | null; created_at: string; user_id: string } | null;
  notes: Note[];
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-500/10 text-green-400' },
  { value: 'dismissed', label: 'Dismissed', color: 'bg-gray-500/10 text-gray-300' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-500/10 text-gray-300' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500/10 text-blue-400' },
  { value: 'high', label: 'High', color: 'bg-orange-500/10 text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500/10 text-red-400' },
];

const RESOLUTION_OPTIONS = [
  { value: 'no_action', label: 'No Action Needed' },
  { value: 'warning_issued', label: 'Warning Issued' },
  { value: 'content_removed', label: 'Content Removed' },
  { value: 'user_suspended', label: 'User Suspended' },
  { value: 'user_banned', label: 'User Banned' },
  { value: 'false_report', label: 'False Report' },
];

export default function AdminReportDetailPage() {
  const params = useParams<{ reportId: string }>();
  const router = useRouter();
  const reportId = params.reportId;

  const [data, setData] = useState<ReportDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchReport = useCallback(async () => {
    if (!reportId) return;
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch report');
      }
      const payload = (await res.json()) as ReportDetailResponse;
      setData(payload);
      setResolutionNotes(payload.report.resolution_notes || '');
    } catch (err) {
      console.error(err);
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const updateReport = async (updates: Record<string, unknown>) => {
    if (!reportId) return;
    setActionLoading('update');
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to update report');
      }

      setActionMessage({ type: 'success', text: 'Report updated successfully' });
      await fetchReport();
    } catch (err: any) {
      console.error(err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to update report' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = (status: string) => {
    updateReport({ status });
  };

  const handlePriorityChange = (priority: string) => {
    updateReport({ priority });
  };

  const handleResolve = (resolutionType: string) => {
    updateReport({
      status: 'resolved',
      resolution_type: resolutionType,
      resolution_notes: resolutionNotes || null,
    });
  };

  const handleDismiss = () => {
    updateReport({
      status: 'dismissed',
      resolution_type: 'false_report',
      resolution_notes: resolutionNotes || 'Dismissed by admin',
    });
  };

  const handleBanUser = async () => {
    if (!data?.target_user?.id) return;
    if (!window.confirm(`Ban user @${data.target_user.username}? This will restrict their access.`)) return;

    setActionLoading('ban');
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${data.target_user.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: `Report #${reportId}: ${data.report.reason_code}`,
          // Omit duration_days to create a permanent ban.
          // The API's Zod schema expects a number when provided,
          // so sending null would fail validation.
          notify_user: false,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to ban user');
      }

      setActionMessage({ type: 'success', text: 'User banned successfully' });
      // Also resolve the report
      await updateReport({
        status: 'resolved',
        resolution_type: 'user_banned',
        resolution_notes: resolutionNotes || 'User banned via report action',
      });
    } catch (err: any) {
      console.error(err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to ban user' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePost = async () => {
    if (!data?.target_post?.id) return;
    if (!window.confirm('Delete this post? This action cannot be undone.')) return;

    setActionLoading('delete_post');
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/posts/${data.target_post.id}`, {
        method: 'DELETE',
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to delete post');
      }

      setActionMessage({ type: 'success', text: 'Post deleted successfully' });
      // Also resolve the report
      await updateReport({
        status: 'resolved',
        resolution_type: 'content_removed',
        resolution_notes: resolutionNotes || 'Post deleted via report action',
      });
    } catch (err: any) {
      console.error(err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete post' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/admin/reports')}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to reports
        </button>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-500">{error || 'Report not found'}</p>
        </div>
      </div>
    );
  }

  const { report, reporter, target_user, target_post, notes } = data;

  const statusIcon = () => {
    switch (report.status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'investigating':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'dismissed':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-text-tertiary" />;
    }
  };

  const statusBadgeClass = (() => {
    switch (report.status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'investigating':
        return 'bg-orange-500/10 text-orange-400';
      case 'resolved':
        return 'bg-green-500/10 text-green-400';
      case 'dismissed':
        return 'bg-gray-500/10 text-gray-300';
      default:
        return 'bg-blue-500/10 text-blue-400';
    }
  })();

  const priorityBadgeClass = (() => {
    switch (report.priority) {
      case 'high':
        return 'bg-orange-500/10 text-orange-400';
      case 'urgent':
        return 'bg-red-500/10 text-red-400';
      case 'low':
        return 'bg-gray-500/10 text-gray-300';
      default:
        return 'bg-blue-500/10 text-blue-400';
    }
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/reports')}
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-3 py-1 text-sm text-text-secondary hover:text-text-primary hover:bg-accent"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Reports
          </button>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Flag className="w-6 h-6 text-red-500" />
            Report
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass}`}>
            {statusIcon()}
            <span className="capitalize">{report.status}</span>
          </span>
          {report.priority && (
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${priorityBadgeClass}`}>
              Priority: <span className="capitalize">{report.priority}</span>
            </span>
          )}
        </div>
      </div>

      {/* Top section: report summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report info */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">Reason:</span>{' '}
            <span className="capitalize">{report.reason_code.replace(/_/g, ' ')}</span>
          </p>
          {report.reason_text && (
            <div className="mt-2">
              <p className="text-xs text-text-tertiary mb-1">Reporter message</p>
              <p className="text-sm text-text-secondary whitespace-pre-line bg-muted/40 rounded-md p-3 border border-border/60">
                {report.reason_text}
              </p>
            </div>
          )}
          <p className="text-xs text-text-tertiary mt-2">
            Created at {new Date(report.created_at).toLocaleString()}
          </p>
        </div>

        {/* Reporter */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <User className="w-4 h-4" />
            Reporter
          </h2>
          {reporter ? (
            <Link
              href={`/admin/users/${reporter.id}`}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden">
                {reporter.avatar_url ? (
                  <img
                    src={reporter.avatar_url}
                    alt={reporter.display_name || reporter.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-background font-medium">
                    {(reporter.display_name || reporter.username || 'U').charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {reporter.display_name || reporter.username}
                </p>
                <p className="text-xs text-text-tertiary truncate">@{reporter.username}</p>
              </div>
            </Link>
          ) : (
            <p className="text-sm text-text-tertiary">Reporter account not available.</p>
          )}
        </div>

        {/* Target */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            {report.target_type === 'profile' ? <User className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
            Target
          </h2>
          {report.target_type === 'profile' && target_user && (
            <Link
              href={`/admin/users/${target_user.id}`}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden">
                {target_user.avatar_url ? (
                  <img
                    src={target_user.avatar_url}
                    alt={target_user.display_name || target_user.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-background font-medium">
                    {(target_user.display_name || target_user.username || 'U').charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {target_user.display_name || target_user.username}
                </p>
                <p className="text-xs text-text-tertiary truncate">@{target_user.username}</p>
              </div>
            </Link>
          )}
          {report.target_type === 'post' && target_post && (
            <div className="space-y-2 text-sm text-text-secondary">
              <p className="text-xs text-text-tertiary">Reported post content</p>
              <p className="bg-muted/40 rounded-md p-3 border border-border/60 text-sm whitespace-pre-line">
                {target_post.content || '[No content]'}
              </p>
              <p className="text-xs text-text-tertiary">
                Posted at {new Date(target_post.created_at).toLocaleString()}
              </p>
            </div>
          )}
          {!target_user && !target_post && (
            <p className="text-sm text-text-tertiary">Target is no longer available.</p>
          )}
        </div>
      </div>

      {/* Action Messages */}
      {actionMessage && (
        <div className={`rounded-lg p-3 flex items-center gap-2 text-sm ${
          actionMessage.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/20' 
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          {actionMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <span className={actionMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}>
            {actionMessage.text}
          </span>
        </div>
      )}

      {/* Admin Actions */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Admin Actions
        </h2>

        {/* Status & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Status */}
          <div>
            <label className="block text-xs text-text-tertiary mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  disabled={actionLoading !== null}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    report.status === opt.value
                      ? `${opt.color} ring-2 ring-offset-1 ring-offset-background ring-current`
                      : 'bg-muted/40 text-text-secondary hover:bg-muted'
                  } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs text-text-tertiary mb-2">Priority</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handlePriorityChange(opt.value)}
                  disabled={actionLoading !== null}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    report.priority === opt.value
                      ? `${opt.color} ring-2 ring-offset-1 ring-offset-background ring-current`
                      : 'bg-muted/40 text-text-secondary hover:bg-muted'
                  } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resolution Notes */}
        <div>
          <label className="block text-xs text-text-tertiary mb-2">Resolution Notes</label>
          <textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Add notes about the resolution..."
            className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
        </div>

        {/* Quick Resolution Actions */}
        <div>
          <label className="block text-xs text-text-tertiary mb-2">Quick Resolve</label>
          <div className="flex flex-wrap gap-2">
            {RESOLUTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleResolve(opt.value)}
                disabled={actionLoading !== null}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  report.resolution_type === opt.value
                    ? 'bg-green-500/20 text-green-400 ring-2 ring-offset-1 ring-offset-background ring-green-500'
                    : 'bg-muted/40 text-text-secondary hover:bg-green-500/10 hover:text-green-400'
                } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Destructive Actions */}
        <div className="pt-4 border-t border-border">
          <label className="block text-xs text-text-tertiary mb-2">Enforcement Actions</label>
          <div className="flex flex-wrap gap-3">
            {/* Dismiss Report */}
            <button
              onClick={handleDismiss}
              disabled={actionLoading !== null || report.status === 'dismissed'}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors
                bg-gray-700 hover:bg-gray-600 text-gray-300
                ${actionLoading || report.status === 'dismissed' ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <XCircle className="w-4 h-4" />
              Dismiss Report
            </button>

            {/* Delete Post (if target is a post) */}
            {target_post && (
              <button
                onClick={handleDeletePost}
                disabled={actionLoading !== null}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors
                  bg-orange-600 hover:bg-orange-500 text-white
                  ${actionLoading === 'delete_post' ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {actionLoading === 'delete_post' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Post
              </button>
            )}

            {/* Ban User (if target is a user or post) */}
            {(target_user || target_post) && (
              <button
                onClick={handleBanUser}
                disabled={actionLoading !== null || !target_user}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors
                  bg-red-600 hover:bg-red-500 text-white
                  ${actionLoading === 'ban' || !target_user ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {actionLoading === 'ban' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                Ban User
              </button>
            )}
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            Enforcement actions are logged in the audit log and will automatically resolve this report.
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Internal Notes
          </h2>
          <span className="text-xs text-text-tertiary">{notes.length} note{notes.length === 1 ? '' : 's'}</span>
        </div>
        <div className="divide-y divide-border">
          {notes.length === 0 ? (
            <p className="px-4 py-6 text-center text-text-tertiary text-sm">No notes have been added for this report yet.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="px-4 py-3 text-sm text-text-secondary">
                <p className="whitespace-pre-line">{note.content}</p>
                <p className="text-xs text-text-tertiary mt-1">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
