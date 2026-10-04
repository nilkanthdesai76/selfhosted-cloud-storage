import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue } from 'framer-motion';
import { API_URL } from '../config';
import { getDeviceId, getDeviceName, setAuthData, isAuthenticated } from '../utils/auth';
import Alert from '../components/Alert';
import OTPInput from '../components/OTPInput';
import Spinner from '../components/Spinner';

function GradientBlob({ className, color1, color2, delay = 0 }) {
  return (
    <motion.div className={`absolute rounded-full blur-[100px] ${className}`} style={{ background: `radial-gradient(circle, ${color1}, ${color2})` }}
      animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, 20, 0] }} transition={{ duration: 15, repeat: Infinity, delay, ease: 'easeInOut' }} />
  );
}

function MagneticButton({ children, className, ...props }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const handleMouse = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) { x.set((e.clientX - rect.left - rect.width / 2) * 0.1); y.set((e.clientY - rect.top - rect.height / 2) * 0.1); }
  };
  return (
    <motion.button ref={ref} style={{ x, y }} onMouseMove={handleMouse} onMouseLeave={() => { x.set(0); y.set(0); }} className={className} {...props}>{children}</motion.button>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [countdown, setCountdown] = useState(600);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) navigate('/dashboard');
  }, [navigate]);

  useEffect(() => {
    if (step !== 2) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); setCanResend(true); return 0; }
        if (prev <= 540) setCanResend(true);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert({ message: '', type: '' });
    try {
      const response = await fetch(`${API_URL}/auth/login/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, deviceId: rememberDevice ? getDeviceId() : null }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.skipOTP) {
          setAuthData(data.accessToken, data.refreshToken, data.user);
          setAlert({ message: 'Welcome back! Redirecting...', type: 'success' });
          setTimeout(() => navigate('/dashboard'), 1000);
        } else {
          setStep(2);
          setCountdown(600);
          setCanResend(false);
          setAlert({ message: 'Verification code sent to your email!', type: 'info' });
        }
      } else {
        setAlert({ message: data.error || 'Login failed', type: 'error' });
      }
    } catch {
      setAlert({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setAlert({ message: 'Please enter all 6 digits', type: 'error' }); return; }
    setLoading(true);
    setAlert({ message: '', type: '' });
    try {
      const response = await fetch(`${API_URL}/auth/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, rememberDevice, deviceId: rememberDevice ? getDeviceId() : null, deviceName: rememberDevice ? getDeviceName() : null }),
      });
      const data = await response.json();
      if (response.ok) {
        setAuthData(data.accessToken, data.refreshToken, data.user);
        setAlert({ message: 'Login successful! Redirecting...', type: 'success' });
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        setAlert({ message: data.error || 'Invalid code', type: 'error' });
        setOtp('');
      }
    } catch {
      setAlert({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, deviceId: null }),
      });
      if (response.ok) { setOtp(''); setCountdown(600); setCanResend(false); setAlert({ message: 'New code sent!', type: 'success' }); }
    } catch {
      setAlert({ message: 'Failed to resend code', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#000] text-white overflow-hidden relative flex items-center justify-center p-5">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <GradientBlob className="w-[600px] h-[600px] -top-[200px] -left-[100px] opacity-30" color1="#06b6d4" color2="#3b82f6" />
        <GradientBlob className="w-[500px] h-[500px] top-[30%] -right-[100px] opacity-20" color1="#8b5cf6" color2="#ec4899" delay={5} />
        <GradientBlob className="w-[400px] h-[400px] -bottom-[100px] left-[20%] opacity-20" color1="#3b82f6" color2="#06b6d4" delay={10} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>

      {/* Nav */}
      <motion.nav initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="fixed top-0 left-0 right-0 z-40 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/"><img src="/applogo_white_text.png" alt="NDX Cloud" className="h-20 w-auto object-contain" /></Link>
          <Link to="/signup" className="text-gray-400 hover:text-white transition-colors text-sm">Don't have an account? <span className="text-white font-medium">Sign up</span></Link>
        </div>
      </motion.nav>

      {/* Login Card */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative z-10 w-full max-w-md">
        <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/10 p-10 shadow-2xl">
          <div className="text-center mb-8">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-3xl font-bold mb-2">Welcome back</motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-gray-400">Sign in to your account</motion.p>
          </div>

          <Alert message={alert.message} type={alert.type} show={!!alert.message} />

          {step === 1 && (
            <motion.form onSubmit={handleLoginSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <div className="mb-5">
                <label className="block mb-2 text-gray-300 text-sm font-medium">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" autoComplete="email"
                  className="w-full p-4 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all" />
              </div>
              <div className="mb-5">
                <label className="block mb-2 text-gray-300 text-sm font-medium">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" autoComplete="current-password"
                  className="w-full p-4 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all" />
              </div>
              <label className="flex items-center gap-3 mb-6 cursor-pointer group">
                <input type="checkbox" checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50 cursor-pointer" />
                <span className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">Remember this device</span>
              </label>
              <MagneticButton type="submit" disabled={loading}
                className="w-full p-4 bg-white text-black rounded-xl font-semibold hover:shadow-lg hover:shadow-white/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? <span className="flex items-center justify-center gap-2">Signing in<Spinner /></span> : 'Sign In'}
              </MagneticButton>
              <div className="flex justify-between mt-6 text-sm">
                <Link to="/forgot-password" className="text-gray-400 hover:text-white transition-colors">Forgot Password?</Link>
              </div>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form onSubmit={handleOTPSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl mb-6">
                <div className="flex items-center gap-2 text-cyan-400 font-medium mb-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Security Check
                </div>
                <p className="text-sm text-gray-400">Code sent to <span className="text-white">{email}</span></p>
              </div>
              <div className="mb-5">
                <label className="block mb-2 text-gray-300 text-sm font-medium">Enter 6-Digit Code</label>
                <OTPInput value={otp} onChange={setOtp} />
              </div>
              <div className={`text-center text-sm mb-5 ${countdown === 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {countdown > 0 ? <>Code expires in <span className="text-white font-medium">{formatTime(countdown)}</span></> : <span className="text-red-400 font-medium">Code expired!</span>}
              </div>
              <MagneticButton type="submit" disabled={loading}
                className="w-full p-4 bg-white text-black rounded-xl font-semibold hover:shadow-lg hover:shadow-white/20 transition-all disabled:opacity-60">
                {loading ? <span className="flex items-center justify-center gap-2">Verifying<Spinner /></span> : 'Verify & Sign In'}
              </MagneticButton>
              <button type="button" onClick={resendOTP} disabled={!canResend || loading}
                className="w-full p-4 mt-3 bg-transparent text-white border border-white/20 rounded-xl font-medium hover:bg-white/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? 'Sending...' : 'Resend Code'}
              </button>
              <div className="text-center mt-6">
                <button type="button" onClick={() => setStep(1)} className="text-gray-400 hover:text-white transition-colors text-sm">← Back to Login</button>
              </div>
            </motion.form>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          <Link to="/" className="hover:text-white transition-colors">← Back to Home</Link>
        </p>
      </motion.div>
    </div>
  );
}
