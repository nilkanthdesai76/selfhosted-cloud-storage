import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert({ message: '', type: '' });

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSent(true);
      } else {
        const data = await response.json();
        setAlert({ message: data.error || 'Failed to send reset email', type: 'error' });
      }
    } catch {
      setAlert({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full">
        <div className="bg-gradient-to-br from-primary to-secondary text-white p-10 text-center">
          <h1 className="text-3xl font-bold mb-2">🔐 Forgot Password</h1>
          <p className="opacity-90">We'll help you reset it</p>
        </div>

        <div className="p-10">
          {sent ? (
            <div className="text-center animate-fadeIn">
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-xl font-semibold mb-2">Check Your Email</h2>
              <p className="text-gray-600 mb-6">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive it? Check your spam folder or try again.
              </p>
              <Link to="/login" className="text-primary font-semibold hover:underline">
                ← Back to Login
              </Link>
            </div>
          ) : (
            <>
              <Alert message={alert.message} type={alert.type} show={!!alert.message} />
              <p className="text-gray-600 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit}>
                <div className="mb-5">
                  <label className="block mb-2 text-gray-700 font-medium">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-3.5 bg-gradient-to-br from-primary to-secondary text-white rounded-lg font-semibold hover:-translate-y-0.5 transition disabled:opacity-60"
                >
                  {loading ? <>Sending<Spinner /></> : 'Send Reset Link'}
                </button>
              </form>
              <div className="text-center mt-5">
                <Link to="/login" className="text-primary hover:underline">← Back to Login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
