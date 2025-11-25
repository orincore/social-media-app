'use client';

import { useState } from 'react';

interface SettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => Promise<boolean> | boolean;
  disabled?: boolean;
  className?: string;
}

export function SettingsToggle({ 
  checked, 
  onChange, 
  disabled = false, 
  className = '' 
}: SettingsToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    if (disabled || isUpdating) return;
    
    setIsUpdating(true);
    const newValue = !checked;
    
    try {
      const success = await onChange(newValue);
      if (!success) {
        console.error('Toggle update failed');
      }
    } catch (error) {
      console.error('Toggle update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled || isUpdating}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 
        focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed
        ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
        ${isUpdating ? 'opacity-75' : ''}
        ${className}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-1'}
          ${isUpdating ? 'scale-90' : ''}
        `}
      />
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}
    </button>
  );
}
