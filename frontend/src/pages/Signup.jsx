import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue } from 'framer-motion';
import { API_URL } from '../config';
import { setAuthData, isAuthenticated } from '../utils/auth';
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

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempUserId, setTempUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [countdown, setCountdown] = useState(600);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => { if (isAuthenticated()) navigate('/dashboard'); }, [navigate]);

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

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert({ message: '', type: '' });
    try {
      const response = await fetch(`${API_URL}/auth/signup/request-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setTempUserId(data.tempUserId);
        setStep(2);
        setCountdown(600);
        setCanResend(false);
        setAlert({ message: 'Verification code sent!', type: 'success' });
      } else {
        setAlert({ message: data.error || 'Failed to send code', type: 'error' });
      }
    } catch {
      setAlert({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setAlert({ message: 'Please enter all 6 digits', type: 'error' }); return; }
    setStep(3);
    setAlert({ message: '', type: '' });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { setAlert({ message: 'Passwords do not match', type: 'error' }); return; }
    if (password.length < 6) { setAlert({ message: 'Password must be at least 6 characters', type: 'error' }); return; }
    setLoading(true);
    setAlert({ message: '', type: '' });
    try {
      const response = await fetch(`${API_URL}/auth/signup/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp, password, tempUserId }),
      });
      const data = await response.json();
      if (response.ok) {
        setAuthData(data.accessToken, data.refreshToken, data.user);
        setAlert({ message: 'Account created! Redirecting...', type: 'success' });
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        setAlert({ message: data.error || 'Signup failed', type: 'error' });
        if (data.error?.includes('OTP')) setTimeout(() => setStep(2), 2000);
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
      const response = await fetch(`${API_URL}/auth/signup/request-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) { setTempUserId(data.tempUserId); setOtp(''); setCountdown(600); setCanResend(false); setAlert({ message: 'New code sent!', type: 'success' }); }
    } catch {
      setAlert({ message: 'Failed to resend code', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    return strength;
  };

  const strengthColors = ['bg-white/10', 'bg-red-500', 'bg-yellow-500', 'bg-green-500'];
  const strengthWidths = ['w-0', 'w-1/3', 'w-2/3', 'w-full'];
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#000] text-white overflow-hidden relative flex items-center justify-center p-5">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <GradientBlob className="w-[600px] h-[600px] -top-[200px] -right-[100px] opacity-30" color1="#8b5cf6" color2="#ec4899" />
        <GradientBlob className="w-[500px] h-[500px] bottom-[10%] -left-[100px] opacity-20" color1="#06b6d4" color2="#3b82f6" delay={5} />
        <GradientBlob className="w-[400px] h-[400px] top-[40%] right-[20%] opacity-20" color1="#3b82f6" color2="#8b5cf6" delay={10} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>

      {/* Nav */}
      <motion.nav initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="fixed top-0 left-0 right-0 z-40 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/"><img src="/applogo_white_text.png" alt="NDX Cloud" className="h-20 w-auto object-contain" /></Link>
          <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm">Already have an account? <span className="text-white font-medium">Sign in</span></Link>
        </div>
      </motion.nav>

      {/* Signup Card */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative z-10 w-full max-w-md">
        <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/10 p-10 shadow-2xl">
          <div className="text-center mb-8">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-3xl font-bold mb-2">Create account</motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-gray-400">Join NDX Cloud today</motion.p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3].map(i => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.1 }}
                className={`h-2 rounded-full transition-all duration-300 ${step === i ? 'w-8 bg-gradient-to-r from-cyan-400 to-blue-500' : step > i ? 'w-2 bg-green-500' : 'w-2 bg-white/20'}`} />
            ))}
          </div>

          <Alert message={alert.message} type={alert.type} show={!!alert.message} />

          {step === 1 && (
            <motion.form onSubmit={handleEmailSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <h2 className="text-lg font-semibold mb-1">Enter your email</h2>
              <p className="text-gray-400 text-sm mb-5">We'll send you a verification code</p>
              <div className="mb-5">
                <label className="block mb-2 text-gray-300 text-sm font-medium">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" autoComplete="email"
                  className="w-full p-4 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all" />
              </div>
              <MagneticButton type="submit" disabled={loading}
                className="w-full p-4 bg-white text-black rounded-xl font-semibold hover:shadow-lg hover:shadow-white/20 transition-all disabled:opacity-60">
                {loading ? <span className="flex items-center justify-center gap-2">Sending code<Spinner /></span> : 'Continue'}
              </MagneticButton>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form onSubmit={handleOTPSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-lg font-semibold mb-1">Verify your email</h2>
              <p className="text-gray-400 text-sm mb-5">Enter the code sent to <span className="text-white">{email}</span></p>
              <div className="mb-5">
                <OTPInput value={otp} onChange={setOtp} />
              </div>
              <div className={`text-center text-sm mb-5 ${countdown === 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {countdown > 0 ? <>Code expires in <span className="text-white font-medium">{formatTime(countdown)}</span></> : <span className="text-red-400 font-medium">Code expired!</span>}
              </div>
              <MagneticButton type="submit" disabled={loading}
                className="w-full p-4 bg-white text-black rounded-xl font-semibold hover:shadow-lg hover:shadow-white/20 transition-all disabled:opacity-60">
                Verify Code
              </MagneticButton>
              <button type="button" onClick={resendOTP} disabled={!canResend || loading}
                className="w-full p-4 mt-3 bg-transparent text-white border border-white/20 rounded-xl font-medium hover:bg-white/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                Resend Code
              </button>
              <div className="text-center mt-5">
                <button type="button" onClick={() => setStep(1)} className="text-gray-400 hover:text-white transition-colors text-sm">← Change Email</button>
              </div>
            </motion.form>
          )}

          {step === 3 && (
            <motion.form onSubmit={handlePasswordSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-lg font-semibold mb-1">Create password</h2>
              <p className="text-gray-400 text-sm mb-5">Choose a strong password</p>
              <div className="mb-5">
                <label className="block mb-2 text-gray-300 text-sm font-medium">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6}
                  className="w-full p-4 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all" />
                <div className="h-1 bg-white/10 rounded mt-3 overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${strengthColors[getPasswordStrength()]} ${strengthWidths[getPasswordStrength()]}`} />
                </div>
                <div className="text-xs text-gray-500 mt-3 space-y-1">
                  <div className={password.length >= 6 ? 'text-green-400' : ''}>• At least 6 characters</div>
                  <div className={/[A-Z]/.test(password) ? 'text-green-400' : ''}>• One uppercase letter</div>
                  <div className={/\d/.test(password) ? 'text-green-400' : ''}>• One number</div>
                </div>
              </div>
              <div className="mb-6">
                <label className="block mb-2 text-gray-300 text-sm font-medium">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="••••••••" minLength={6}
                  className="w-full p-4 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all" />
              </div>
              <MagneticButton type="submit" disabled={loading}
                className="w-full p-4 bg-white text-black rounded-xl font-semibold hover:shadow-lg hover:shadow-white/20 transition-all disabled:opacity-60">
                {loading ? <span className="flex items-center justify-center gap-2">Creating account<Spinner /></span> : 'Create Account'}
              </MagneticButton>
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
