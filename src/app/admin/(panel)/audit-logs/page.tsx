'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  AlertCircle,
  Filter,
  Calendar
} from 'lucide-react';

interface AuditLog {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  admin?: {
    id: string;
    username: string;
    display_name: string;
  };
  action_type: string;
  action_category: string;
  target_type: string | null;
  target_id: string | null;
  target_details: Record<string, unknown>;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
      });
      
      if (categoryFilter) params.set('action_category', categoryFilter);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      
      const data = await response.json();
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to load audit logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, categoryFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getCategoryBadge = (category: string) => {
    const categoryColors: Record<string, string> = {
      auth: 'bg-blue-500/10 text-blue-500',
      user_management: 'bg-green-500/10 text-green-500',
      report_management: 'bg-yellow-500/10 text-yellow-500',
      content_moderation: 'bg-orange-500/10 text-orange-500',
      system_settings: 'bg-purple-500/10 text-purple-500',
      admin_management: 'bg-red-500/10 text-red-500',
    };
    
    return categoryColors[category] || 'bg-gray-500/10 text-gray-500';
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-gray-400 mt-1">
            Track all administrative actions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Category filter */}
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Categories</option>
              <option value="auth">Authentication</option>
              <option value="user_management">User Management</option>
              <option value="report_management">Report Management</option>
              <option value="content_moderation">Content Moderation</option>
              <option value="system_settings">System Settings</option>
              <option value="admin_management">Admin Management</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Logs list */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-white font-medium">
                        {formatActionType(log.action_type)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryBadge(log.action_category)}`}>
                        {log.action_category.replace(/_/g, ' ')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                      {log.admin && (
                        <span>
                          By: <span className="text-gray-300">{log.admin.display_name}</span> (@{log.admin.username})
                        </span>
                      )}
                      {log.admin_email && !log.admin && (
                        <span>
                          By: <span className="text-gray-300">{log.admin_email}</span>
                        </span>
                      )}
                      {log.target_type && (
                        <span>
                          Target: <span className="text-gray-300 capitalize">{log.target_type}</span>
                          {log.target_id && ` (${log.target_id.slice(0, 8)}...)`}
                        </span>
                      )}
                      {log.ip_address && (
                        <span>
                          IP: <span className="text-gray-300">{log.ip_address}</span>
                        </span>
                      )}
                    </div>

                    {log.reason && (
                      <p className="mt-2 text-gray-300 text-sm">
                        Reason: {log.reason}
                      </p>
                    )}

                    {log.target_details && Object.keys(log.target_details).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        {Object.entries(log.target_details).slice(0, 3).map(([key, value]) => (
                          <span key={key} className="mr-3">
                            {key}: <span className="text-gray-400">{String(value)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {((currentPage - 1) * pagination.limit) + 1} to{' '}
              {Math.min(currentPage * pagination.limit, pagination.total)} of{' '}
              {pagination.total} logs
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-gray-300">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security notice */}
      <p className="text-center text-gray-500 text-sm">
        Audit logs are immutable and cannot be modified or deleted.
      </p>
    </div>
  );
}
