'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Ban,
  Eye,
  Edit
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status?: string;
  is_verified: boolean;
  followers_count: number;
  posts_count: number;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  // Handle opening the action menu with position calculation
  const handleOpenMenu = (userId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (actionMenuOpen === userId) {
      setActionMenuOpen(null);
      setMenuPosition(null);
      return;
    }
    
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    
    setMenuPosition({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setActionMenuOpen(userId);
  };

  const closeMenu = () => {
    setActionMenuOpen(null);
    setMenuPosition(null);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      
      if (searchQuery) params.set('query', searchQuery);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  const getStatusBadge = (status?: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-500/10 text-green-500',
      suspended: 'bg-yellow-500/10 text-yellow-500',
      banned: 'bg-red-500/10 text-red-500',
      deleted: 'bg-gray-500/10 text-gray-500',
    };
    
    return statusColors[status || 'active'] || statusColors.active;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Users</h1>
          <p className="text-text-secondary mt-1">
            Manage and monitor user accounts
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username, email, or name..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Users table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Posts</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Followers</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Joined</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt="" 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-medium">
                              {user.display_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-text-primary font-medium flex items-center gap-1">
                            {user.display_name}
                            {user.is_verified && (
                              <span className="text-blue-500">✓</span>
                            )}
                          </p>
                          <p className="text-text-tertiary text-sm">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusBadge(user.status)}`}>
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{user.posts_count}</td>
                    <td className="px-4 py-3 text-gray-300">{user.followers_count}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => handleOpenMenu(user.id, e)}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {((currentPage - 1) * pagination.limit) + 1} to{' '}
              {Math.min(currentPage * pagination.limit, pagination.total)} of{' '}
              {pagination.total} users
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

      {/* Fixed position dropdown menu - rendered outside table to avoid overflow clipping */}
      {actionMenuOpen && menuPosition && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={closeMenu}
          />
          {/* Dropdown menu */}
          <div 
            className="fixed w-52 bg-gray-900 rounded-lg shadow-2xl border border-gray-700 py-1"
            style={{ 
              zIndex: 9999,
              top: menuPosition.top,
              right: menuPosition.right,
            }}
          >
            <Link
              href={`/admin/users/${actionMenuOpen}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              onClick={closeMenu}
            >
              <Eye className="w-4 h-4" />
              View Details
            </Link>
            <Link
              href={`/admin/users/${actionMenuOpen}/edit`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              onClick={closeMenu}
            >
              <Edit className="w-4 h-4" />
              Edit User
            </Link>
            <button
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
              onClick={() => {
                // TODO: Implement ban modal
                closeMenu();
              }}
            >
              <Ban className="w-4 h-4" />
              {users.find(u => u.id === actionMenuOpen)?.status === 'banned' ? 'Unban User' : 'Ban User'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
