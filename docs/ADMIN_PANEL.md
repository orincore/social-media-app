# Admin Panel Documentation

## Overview

The Admin Panel is a secure, enterprise-grade administrative interface for managing the social media application. It operates independently from the user-facing UI and requires elevated authentication.

## Features

### 1. Admin Authentication & Authorization
- **Separate Admin Accounts**: Admin users are stored in a dedicated `admin_users` table
- **Email/Password Login**: Secure login with bcrypt password hashing
- **Optional 2FA**: TOTP-based two-factor authentication support
- **Session Management**: JWT-like session tokens with configurable timeout
- **RBAC**: Role-based access control with granular permissions

### 2. User Management
- **Search & Filter**: Search users by username, email, or display name
- **View User Details**: Complete user profile, activity, and session history
- **Edit Users**: Modify user profiles and settings
- **Ban/Unban**: Temporary or permanent user bans with reason tracking
- **Session Management**: Force logout and session invalidation

### 3. Reports Management
- **View Reports**: List all user reports with filtering and sorting
- **Report Details**: Full context including reporter, target, and evidence
- **Status Management**: Track report lifecycle (pending → investigating → resolved)
- **Priority Levels**: Low, Normal, High, Urgent
- **Resolution Tracking**: Document actions taken and outcomes

### 4. Activity Logs & Auditing
- **Comprehensive Logging**: All admin actions are logged
- **Immutable Audit Trail**: Logs cannot be modified or deleted
- **Filtering**: Filter by admin, action type, category, or date range
- **Export**: Export logs for compliance and review

### 5. Dashboard & Analytics
- **Real-time Metrics**: User counts, post counts, report statistics
- **Growth Charts**: User growth and report trends over time
- **Recent Activity**: Latest reports and new user registrations
- **Auto-refresh**: Dashboard updates every 30 seconds

## Security Features

### Authentication Security
- **Password Hashing**: bcrypt with 12 rounds
- **Session Tokens**: Cryptographically secure random tokens (SHA-256 hashed)
- **Session Expiry**: 8-hour default session duration
- **Account Lockout**: 5 failed attempts triggers 30-minute lockout

### Rate Limiting
- **Login Endpoint**: 5 requests per minute per IP
- **API Endpoints**: 60 requests per minute per IP
- **Configurable Limits**: Adjustable via settings

### Security Headers
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cache-Control: no-store` - Prevents caching of sensitive data

### IP Allowlist (Optional)
- Restrict admin access to specific IP addresses
- Configurable expiry for temporary access

## Database Schema

### Admin Tables
- `admin_roles` - Role definitions with permissions
- `admin_users` - Admin user accounts
- `admin_sessions` - Active admin sessions
- `admin_audit_logs` - Immutable audit trail
- `admin_ip_allowlist` - IP allowlist entries
- `report_notes` - Internal notes on reports
- `system_alerts` - System-wide alerts

### User Table Extensions
The following columns are added to the `users` table:
- `status` - User status (active, suspended, banned, deleted)
- `banned_at` - Ban timestamp
- `banned_by` - Admin who issued the ban
- `ban_reason` - Reason for ban
- `ban_expires_at` - Ban expiry (null for permanent)
- `suspension_count` - Number of times suspended

## API Endpoints

### Authentication
- `POST /api/admin/auth/login` - Admin login
- `POST /api/admin/auth/logout` - Admin logout
- `GET /api/admin/auth/session` - Get current session

### Users
- `GET /api/admin/users` - List/search users
- `GET /api/admin/users/[userId]` - Get user details
- `PATCH /api/admin/users/[userId]` - Update user
- `DELETE /api/admin/users/[userId]` - Delete user (soft delete)
- `POST /api/admin/users/[userId]/ban` - Ban user
- `DELETE /api/admin/users/[userId]/ban` - Unban user

### Reports
- `GET /api/admin/reports` - List reports
- `GET /api/admin/reports/[reportId]` - Get report details
- `PATCH /api/admin/reports/[reportId]` - Update report status

### Analytics
- `GET /api/admin/analytics/dashboard` - Dashboard statistics

### Audit Logs
- `GET /api/admin/audit-logs` - List audit logs

## Roles & Permissions

### Default Roles

#### Super Admin
- Full access to all features
- Can manage other admins
- Can modify system settings

#### Admin
- User management (view, edit, ban)
- Report management (view, manage, resolve)
- Analytics access
- Audit log viewing

#### Moderator
- View users (no edit/ban)
- Report management (view, manage)
- Limited analytics access

### Permission Structure
```typescript
{
  users: { view, edit, ban, delete, export },
  reports: { view, manage, assign, resolve },
  posts: { view, edit, delete, moderate },
  comments: { view, edit, delete, moderate },
  analytics: { view, export },
  settings: { view, edit },
  admins: { view, create, edit, delete },
  audit_logs: { view, export }
}
```

## Setup Instructions

### 1. Run Database Migration
Execute the SQL schema in your Supabase project:
```bash
psql -f sql/admin_schema.sql
```

### 2. Create Initial Super Admin
The schema creates a default super admin account:
- Email: `admin@example.com`
- Password: `changeme123!` (CHANGE THIS IMMEDIATELY)

### 3. Configure Environment
Ensure these environment variables are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Access Admin Panel
Navigate to `/admin/login` and sign in with admin credentials.

## Best Practices

### Security
1. Change the default admin password immediately
2. Enable 2FA for all admin accounts
3. Use IP allowlist in production
4. Regularly review audit logs
5. Rotate admin passwords every 90 days

### Operations
1. Assign appropriate roles based on job function
2. Document all moderation decisions
3. Use internal notes for context
4. Escalate urgent reports promptly
5. Regular training on policies

## Troubleshooting

### Common Issues

**Login fails with "Invalid credentials"**
- Verify email and password
- Check if account is locked (wait 30 minutes or reset)
- Ensure admin account exists in `admin_users` table

**"Insufficient permissions" error**
- Verify role has required permission
- Check role assignment in `admin_users` table
- Review `admin_roles` permissions JSON

**Session expires unexpectedly**
- Check session timeout settings
- Verify server time is synchronized
- Check for session cleanup cron job

## Support

For issues or feature requests, contact the development team.
