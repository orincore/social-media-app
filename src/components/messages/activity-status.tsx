'use client';

interface ActivityStatusProps {
  isOnline: boolean;
  lastSeen?: number;
  className?: string;
}

export function ActivityStatus({ isOnline, lastSeen, className = '' }: ActivityStatusProps) {
  const getStatusText = () => {
    if (isOnline) {
      return 'Active now';
    }
    
    if (!lastSeen || lastSeen === 0) {
      return 'Offline';
    }

    const now = Date.now();
    const diffInMinutes = Math.floor((now - lastSeen) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Active now';
    } else if (diffInMinutes < 60) {
      return `Active ${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `Active ${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `Active ${days}d ago`;
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
      <span className="text-xs text-slate-400">
        {getStatusText()}
      </span>
    </div>
  );
}
