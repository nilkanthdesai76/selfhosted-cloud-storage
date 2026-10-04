import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUser, isAuthenticated } from '../utils/auth';
import { formatFileSize } from '../utils/format';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) navigate('/login');
  }, [navigate]);

  const copySecretKey = () => {
    navigator.clipboard.writeText(user?.secretKey || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const storageUsed = Number(user?.storageUsed || 0);
  const storageLimit = Number(user?.plan?.storageLimit || 5368709120);
  const storagePercent = (storageUsed / storageLimit) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">← Back</Link>
          <h1 className="text-xl font-semibold">👤 Account Settings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Email</label>
              <div className="flex items-center gap-2">
                <span className="font-medium">{user?.email}</span>
                {user?.emailVerified && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">✓ Verified</span>}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Plan</label>
              <span className="font-medium">{user?.plan?.name || 'Free'}</span>
            </div>
          </div>
        </div>

        {/* Secret Key */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">🔑 API Secret Key</h2>
          <p className="text-sm text-gray-600 mb-4">Use this key to authenticate API requests. Keep it secure!</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={user?.secretKey || ''}
              readOnly
              className="flex-1 p-3 bg-gray-50 border rounded-lg font-mono text-sm"
            />
            <button
              onClick={copySecretKey}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">📊 Storage Usage</h2>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>{formatFileSize(storageUsed)} used</span>
              <span>{formatFileSize(storageLimit)} total</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">{storagePercent.toFixed(1)}% of your storage used</p>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/devices" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition">
              <span className="text-2xl">📱</span>
              <div>
                <p className="font-medium">Trusted Devices</p>
                <p className="text-sm text-gray-500">Manage your devices</p>
              </div>
            </Link>
            <Link to="/api-docs" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition">
              <span className="text-2xl">📚</span>
              <div>
                <p className="font-medium">API Documentation</p>
                <p className="text-sm text-gray-500">Learn how to use the API</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
