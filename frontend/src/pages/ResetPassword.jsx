import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: '' });

  const getStrength = () => {
    let s = 0;
    if (password.length >= 6) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    return s;
  };

  const strengthColors = ['', 'bg-red-500 w-1/3', 'bg-yellow-500 w-2/3', 'bg-green-500 w-full'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setAlert({ message: 'Passwords do not match', type: 'error' });
      return;
    }
    if (password.length < 6) {
      setAlert({ message: 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    setLoading(true);
    setAlert({ message: '', type: '' });

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json();

      if (response.ok) {
        setAlert({ message: 'Password reset successful! Redirecting to login...', type: 'success' });
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setAlert({ message: data.error || 'Failed to reset password', type: 'error' });
      }
    } catch {
      setAlert({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Invalid Reset Link</h2>
          <p className="text-gray-600 mb-6">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-primary font-semibold hover:underline">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full">
        <div className="bg-gradient-to-br from-primary to-secondary text-white p-10 text-center">
          <h1 className="text-3xl font-bold mb-2">🔐 Reset Password</h1>
          <p className="opacity-90">Create a new password</p>
        </div>

        <div className="p-10">
          <Alert message={alert.message} type={alert.type} show={!!alert.message} />
          
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block mb-2 text-gray-700 font-medium">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
              <div className="h-1 bg-gray-200 rounded mt-2 overflow-hidden">
                <div className={`h-full transition-all ${strengthColors[getStrength()]}`} />
              </div>
              <div className="text-sm text-gray-600 mt-2 space-y-1">
                <div className={password.length >= 6 ? 'text-green-500' : ''}>• At least 6 characters</div>
                <div className={/[A-Z]/.test(password) ? 'text-green-500' : ''}>• One uppercase letter</div>
                <div className={/\d/.test(password) ? 'text-green-500' : ''}>• One number</div>
              </div>
            </div>
            
            <div className="mb-5">
              <label className="block mb-2 text-gray-700 font-medium">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full p-3.5 bg-gradient-to-br from-primary to-secondary text-white rounded-lg font-semibold hover:-translate-y-0.5 transition disabled:opacity-60"
            >
              {loading ? <>Resetting<Spinner /></> : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
