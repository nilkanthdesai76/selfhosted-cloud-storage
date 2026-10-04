import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { getAccessToken, isAuthenticated } from '../utils/auth';

export default function Devices() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) navigate('/login');
    else loadDevices();
  }, [navigate]);

  const loadDevices = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/trusted-devices`, {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeDevice = async (deviceId) => {
    if (!confirm('Remove this device? You will need to verify with OTP next time you login from it.')) return;
    try {
      const response = await fetch(`${API_URL}/auth/trusted-devices/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getAccessToken()}` },
      });
      if (response.ok) {
        setDevices(devices.filter(d => d.deviceId !== deviceId));
      }
    } catch (error) {
      console.error('Error removing device:', error);
    }
  };

  const currentDeviceId = localStorage.getItem('deviceId');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">← Back</Link>
          <h1 className="text-xl font-semibold">📱 Trusted Devices</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-600 mb-6">
            These devices can sign in without OTP verification. Remove any device you don't recognize.
          </p>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-2">📱</p>
              <p>No trusted devices yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map(device => (
                <div key={device.id} className={`flex items-center justify-between p-4 rounded-lg border ${device.deviceId === currentDeviceId ? 'border-primary bg-blue-50' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">💻</span>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {device.deviceName}
                        {device.deviceId === currentDeviceId && (
                          <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">Current</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">Last used: {new Date(device.lastUsedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeDevice(device.deviceId)}
                    className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
