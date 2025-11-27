'use client';

import { useState } from 'react';
import { 
  Shield, 
  Key, 
  Bell, 
  Globe,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setMessage({ type: 'success', text: 'Settings saved successfully' });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">
          Configure admin panel settings
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/20' 
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <p className={message.type === 'success' ? 'text-green-500' : 'text-red-500'}>
            {message.text}
          </p>
        </div>
      )}

      {/* Settings sections */}
      <div className="space-y-6">
        {/* Security Settings */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-white">Security Settings</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Two-Factor Authentication</p>
                <p className="text-gray-400 text-sm">Require 2FA for all admin accounts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Session Timeout</p>
                <p className="text-gray-400 text-sm">Auto-logout after inactivity</p>
              </div>
              <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="480" selected>8 hours</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">IP Allowlist</p>
                <p className="text-gray-400 text-sm">Restrict admin access to specific IPs</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Password Policy */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex items-center gap-3">
            <Key className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-white">Password Policy</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Minimum Password Length</p>
                <p className="text-gray-400 text-sm">Minimum characters required</p>
              </div>
              <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="8">8 characters</option>
                <option value="10">10 characters</option>
                <option value="12" selected>12 characters</option>
                <option value="16">16 characters</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Password Expiry</p>
                <p className="text-gray-400 text-sm">Force password change after period</p>
              </div>
              <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="0">Never</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90" selected>90 days</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Require Special Characters</p>
                <p className="text-gray-400 text-sm">Password must include special characters</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex items-center gap-3">
            <Bell className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-white">Notification Settings</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Email Notifications</p>
                <p className="text-gray-400 text-sm">Receive email for critical alerts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">High Priority Report Alerts</p>
                <p className="text-gray-400 text-sm">Notify when urgent reports are filed</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Security Alerts</p>
                <p className="text-gray-400 text-sm">Notify on suspicious login attempts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex items-center gap-3">
            <Globe className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-white">Rate Limiting</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Login Attempts</p>
                <p className="text-gray-400 text-sm">Max failed attempts before lockout</p>
              </div>
              <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="3">3 attempts</option>
                <option value="5" selected>5 attempts</option>
                <option value="10">10 attempts</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Lockout Duration</p>
                <p className="text-gray-400 text-sm">Time before retry is allowed</p>
              </div>
              <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="15">15 minutes</option>
                <option value="30" selected>30 minutes</option>
                <option value="60">1 hour</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">API Rate Limit</p>
                <p className="text-gray-400 text-sm">Requests per minute for admin APIs</p>
              </div>
              <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="30">30/min</option>
                <option value="60" selected>60/min</option>
                <option value="100">100/min</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
