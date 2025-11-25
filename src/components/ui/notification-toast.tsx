'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

interface NotificationToastProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

export function NotificationToast({ show, message, onClose }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show && !isVisible) return null;

  return (
    <div className={`
      fixed top-4 right-4 z-50 
      bg-gradient-to-r from-blue-500 to-purple-600 
      text-white rounded-lg shadow-lg 
      p-4 max-w-sm min-w-[300px]
      transform transition-all duration-300 ease-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Bell className="h-5 w-5 text-white animate-pulse" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">New Notification</p>
          <p className="text-xs text-blue-100 mt-1">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
