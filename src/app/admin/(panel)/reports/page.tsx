'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface Report {
  id: string;
  reporter_id: string;
  reporter?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  target_type: 'message' | 'profile' | 'post';
  target_profile_id: string | null;
  target_post_id: string | null;
  target_user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  reason_code: string;
  reason_text: string | null;
  status: string;
  priority?: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (targetTypeFilter) params.set('target_type', targetTypeFilter);

      const response = await fetch(`/api/admin/reports?${params}`);
      if (!response.ok) throw new Error('Failed to fetch reports');
      
      const data = await response.json();
      setReports(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to load reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, priorityFilter, targetTypeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'investigating':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'dismissed':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500',
      investigating: 'bg-orange-500/10 text-orange-500',
      reviewed: 'bg-blue-500/10 text-blue-500',
      resolved: 'bg-green-500/10 text-green-500',
      dismissed: 'bg-gray-500/10 text-gray-500',
    };
    
    return statusColors[status] || statusColors.pending;
  };

  const getPriorityBadge = (priority?: string) => {
    const priorityColors: Record<string, string> = {
      low: 'bg-gray-500/10 text-gray-400',
      normal: 'bg-blue-500/10 text-blue-400',
      high: 'bg-orange-500/10 text-orange-400',
      urgent: 'bg-red-500/10 text-red-400',
    };
    
    return priorityColors[priority || 'normal'] || priorityColors.normal;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-gray-400 mt-1">
            Review and manage user reports
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status filter */}
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="relative flex-1">
            <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Target type filter */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={targetTypeFilter}
              onChange={(e) => {
                setTargetTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Types</option>
              <option value="post">Post</option>
              <option value="profile">Profile</option>
              <option value="message">Message</option>
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

      {/* Reports list */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <p>No reports found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/admin/reports/${report.id}`}
                className="block p-4 hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(report.status)}
                      <span className="text-white font-medium capitalize">
                        {report.reason_code.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(report.status)}`}>
                        {report.status}
                      </span>
                      {report.priority && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(report.priority)}`}>
                          {report.priority}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="capitalize">{report.target_type} report</span>
                      {report.reporter && (
                        <span>
                          Reported by @{report.reporter.username}
                        </span>
                      )}
                      {report.target_user && (
                        <span>
                          Against @{report.target_user.username}
                        </span>
                      )}
                    </div>

                    {report.reason_text && (
                      <p className="mt-2 text-gray-300 text-sm line-clamp-2">
                        {report.reason_text}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-gray-500 text-sm">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {new Date(report.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {((currentPage - 1) * pagination.limit) + 1} to{' '}
              {Math.min(currentPage * pagination.limit, pagination.total)} of{' '}
              {pagination.total} reports
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
    </div>
  );
}
