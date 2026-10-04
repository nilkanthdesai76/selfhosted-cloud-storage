import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useInView } from 'framer-motion';

// Mouse position hook
function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  return position;
}

// Magnetic button
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

// Text reveal
function RevealText({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div initial={{ y: '100%' }} animate={isInView ? { y: 0 } : {}} transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
    </div>
  );
}

// Gradient blob
function GradientBlob({ className, color1, color2, delay = 0 }) {
  return (
    <motion.div className={`absolute rounded-full blur-[100px] ${className}`} style={{ background: `radial-gradient(circle, ${color1}, ${color2})` }}
      animate={{ scale: [1, 1.3, 1], x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 15, repeat: Infinity, delay, ease: 'easeInOut' }} />
  );
}

// 3D tilt card
function TiltCard({ children, className = '' }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [3, -3]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-3, 3]);
  const handleMouse = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) { x.set((e.clientX - rect.left) / rect.width - 0.5); y.set((e.clientY - rect.top) / rect.height - 0.5); }
  };
  return (
    <motion.div ref={ref} onMouseMove={handleMouse} onMouseLeave={() => { x.set(0); y.set(0); }} style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }} className={className}>{children}</motion.div>
  );
}

// Animated number
function AnimatedNumber({ value, suffix = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (isInView) {
      const num = parseFloat(value);
      const duration = 2000;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setCount(num * eased);
        if (progress < 1) requestAnimationFrame(animate);
      };
      animate();
    }
  }, [isInView, value]);
  return <span ref={ref}>{value.includes('.') ? count.toFixed(2) : Math.floor(count)}{suffix}</span>;
}

// Horizontal scroll section
function HorizontalScroll({ children }) {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: targetRef });
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-66.666%']);
  return (
    <section ref={targetRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <motion.div style={{ x }} className="flex gap-8">{children}</motion.div>
      </div>
    </section>
  );
}

export default function Landing() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [cursorVariant, setCursorVariant] = useState('default');
  const mousePosition = useMousePosition();
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const setCursor = (variant) => () => setCursorVariant(variant);

  const features = [
    { icon: '⚡', title: 'Lightning Fast', desc: 'Upload and access files instantly with our global CDN', color: 'from-yellow-500 to-orange-500' },
    { icon: '🔒', title: 'Bank-Grade Security', desc: 'End-to-end encryption keeps your data safe', color: 'from-green-500 to-emerald-500' },
    { icon: '🤖', title: 'AI Powered', desc: 'Smart organization and search with machine learning', color: 'from-purple-500 to-pink-500' },
    { icon: '🌍', title: 'Access Anywhere', desc: 'Sync across all your devices seamlessly', color: 'from-blue-500 to-cyan-500' },
    { icon: '👥', title: 'Team Collaboration', desc: 'Real-time editing and sharing with your team', color: 'from-pink-500 to-rose-500' },
    { icon: '📊', title: 'Advanced Analytics', desc: 'Insights into your storage usage and patterns', color: 'from-indigo-500 to-purple-500' },
  ];

  const testimonials = [
    { name: 'Sarah Chen', role: 'CEO at TechFlow', text: 'NDX Cloud transformed how our team collaborates. The speed is unmatched.', avatar: '👩‍💼' },
    { name: 'Marcus Johnson', role: 'Creative Director', text: 'Finally, a cloud storage that understands designers. The preview feature is incredible.', avatar: '👨‍🎨' },
    { name: 'Emily Rodriguez', role: 'Startup Founder', text: 'We moved our entire company to NDX Cloud. Best decision we made this year.', avatar: '👩‍💻' },
  ];

  const plans = [
    { name: 'Starter', price: '0', storage: '15 GB', features: ['Basic file sharing', 'Mobile apps', 'Email support'], popular: false },
    { name: 'Pro', price: '12', storage: '2 TB', features: ['Advanced sharing', 'Version history', 'Priority support', 'AI organization'], popular: true },
    { name: 'Enterprise', price: '29', storage: 'Unlimited', features: ['Custom branding', 'Admin controls', 'SSO integration', 'Dedicated support', 'API access'], popular: false },
  ];

  return (
    <div className="bg-[#000] text-white overflow-x-hidden">
      {/* Custom Cursor */}
      <motion.div className="fixed w-5 h-5 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference hidden md:block"
        animate={{ x: mousePosition.x - 10, y: mousePosition.y - 10, scale: cursorVariant === 'hover' ? 2.5 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }} />

      {/* Progress Bar */}
      <motion.div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 origin-left z-50" style={{ scaleX: smoothProgress }} />

      {/* Navigation */}
      <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${isScrolled ? 'bg-black/70 backdrop-blur-2xl border-b border-white/5' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" onMouseEnter={setCursor('hover')} onMouseLeave={setCursor('default')}>
            <img src="/applogo_white_text.png" alt="NDX Cloud" className="h-20 w-auto object-contain" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Security', 'Pricing'].map((item, i) => (
              <motion.a key={item} href={`#${item.toLowerCase()}`} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="text-[15px] text-gray-400 hover:text-white transition-all relative group" onMouseEnter={setCursor('hover')} onMouseLeave={setCursor('default')}>
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300" />
              </motion.a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"><motion.span whileHover={{ scale: 1.05 }} className="text-[15px] text-gray-400 hover:text-white transition-colors px-4 py-2 hidden sm:block" onMouseEnter={setCursor('hover')} onMouseLeave={setCursor('default')}>Sign in</motion.span></Link>
            <Link to="/signup">
              <MagneticButton className="px-5 py-2.5 bg-white text-black text-[15px] font-semibold rounded-full hover:shadow-lg hover:shadow-white/20 transition-all" onMouseEnter={setCursor('hover')} onMouseLeave={setCursor('default')}>Get Started</MagneticButton>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0">
          <GradientBlob className="w-[900px] h-[900px] -top-[300px] -left-[200px] opacity-40" color1="#06b6d4" color2="#3b82f6" />
          <GradientBlob className="w-[700px] h-[700px] top-[20%] -right-[100px] opacity-30" color1="#8b5cf6" color2="#ec4899" delay={5} />
          <GradientBlob className="w-[600px] h-[600px] -bottom-[200px] left-[30%] opacity-30" color1="#3b82f6" color2="#06b6d4" delay={10} />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        </div>

        <div className="relative z-10 text-center px-6 max-w-6xl">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5 }} className="mb-8">
              <span className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-full text-sm">
                <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50" />
                <span className="text-gray-300">Now with AI-powered organization</span>
              </span>
            </motion.div>

            <div className="space-y-2 mb-10">
              <RevealText delay={0.6}><h1 className="text-[clamp(3rem,12vw,10rem)] font-bold tracking-[-0.04em] leading-[0.85] bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent">Store.</h1></RevealText>
              <RevealText delay={0.7}><h1 className="text-[clamp(3rem,12vw,10rem)] font-bold tracking-[-0.04em] leading-[0.85] bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-500 bg-clip-text text-transparent">Share.</h1></RevealText>
              <RevealText delay={0.8}><h1 className="text-[clamp(3rem,12vw,10rem)] font-bold tracking-[-0.04em] leading-[0.85] bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent">Succeed.</h1></RevealText>
            </div>

            <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.1 }} className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
              The next generation of cloud storage. Secure, lightning-fast, and beautifully designed.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.3 }} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/signup">
                <MagneticButton className="group relative px-8 py-4 bg-white text-black font-semibold rounded-full text-lg overflow-hidden h-14 flex items-center justify-center" onMouseEnter={setCursor('hover')} onMouseLeave={setCursor('default')}>
                  <span className="relative z-10 flex items-center gap-2">Start free<motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span></span>
                  <motion.div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500" initial={{ x: '-100%' }} whileHover={{ x: 0 }} transition={{ duration: 0.3 }} />
                  <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 font-semibold">Start free →</span>
                </MagneticButton>
              </Link>
              <MagneticButton className="px-8 py-4 border border-white/20 rounded-full text-lg font-medium hover:bg-white/5 transition-all flex items-center gap-3 h-14" onMouseEnter={setCursor('hover')} onMouseLeave={setCursor('default')}>
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0"><svg className="w-3 h-3 ml-0.5" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
                Watch demo
              </MagneticButton>
            </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="mt-20 flex flex-col items-center gap-3">
            <span className="text-[11px] text-gray-500 uppercase tracking-[0.2em]">Scroll to explore</span>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="w-5 h-8 border border-gray-600 rounded-full flex justify-center pt-1.5">
              <motion.div className="w-1 h-2 bg-gray-500 rounded-full" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Showcase Section - Apple Style */}
      <section className="relative py-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a1a] to-black" />
        
        <div className="relative z-10 max-w-[90rem] mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-32">
            <motion.span initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="inline-block text-cyan-400 text-sm font-semibold uppercase tracking-[0.3em] mb-6">Introducing</motion.span>
            <RevealText><h2 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8">A new way to work</h2></RevealText>
            <motion.p initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Experience cloud storage reimagined. Powerful enough for professionals. Simple enough for everyone.
            </motion.p>
          </motion.div>

          {/* Large Product Image with Parallax */}
          <motion.div initial={{ opacity: 0, y: 100 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} className="relative">
            <div className="absolute -inset-20 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-3xl opacity-50" />
            <TiltCard className="relative">
              <div className="relative bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-[2.5rem] p-3 border border-white/10 shadow-2xl shadow-cyan-500/10">
                <div className="bg-[#111] rounded-[2rem] overflow-hidden">
                  <div className="bg-[#1a1a1a] px-6 py-4 flex items-center gap-4 border-b border-white/5">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-[#ff5f57] rounded-full" />
                      <div className="w-3 h-3 bg-[#febc2e] rounded-full" />
                      <div className="w-3 h-3 bg-[#28c840] rounded-full" />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-black/50 rounded-lg">
                        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        <span className="text-xs text-gray-400">ndxcloud.app</span>
                      </div>
                    </div>
                  </div>
                  <div className="aspect-[16/10] bg-gradient-to-br from-[#0f0f1a] to-[#0a0a12] p-8 flex">
                    <div className="w-64 bg-white/[0.02] rounded-2xl p-4 mr-6 border border-white/5">
                      <div className="flex items-center gap-3 mb-8">
                        <img src="/applogo_white_text.png" alt="NDX Cloud" className="h-12 w-auto object-contain" />
                      </div>
                      {['My Files', 'Shared', 'Recent', 'Starred'].map((item, i) => (
                        <motion.div key={item} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 + i * 0.1 }}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 ${i === 0 ? 'bg-white/10' : 'hover:bg-white/5'} transition-colors`}>
                          <span className="text-lg">{['📁', '👥', '🕐', '⭐'][i]}</span>
                          <span className="text-sm text-gray-300">{item}</span>
                        </motion.div>
                      ))}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold">My Files</h3>
                        <div className="flex gap-2">
                          <div className="w-8 h-8 bg-white/5 rounded-lg" />
                          <div className="w-8 h-8 bg-white/5 rounded-lg" />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { name: 'Projects', icon: '📁', color: 'from-blue-500/20 to-cyan-500/20' },
                          { name: 'Design.fig', icon: '🎨', color: 'from-purple-500/20 to-pink-500/20' },
                          { name: 'Report.pdf', icon: '📄', color: 'from-red-500/20 to-orange-500/20' },
                          { name: 'Photos', icon: '🖼️', color: 'from-green-500/20 to-emerald-500/20' },
                          { name: 'Videos', icon: '🎬', color: 'from-pink-500/20 to-rose-500/20' },
                          { name: 'Music', icon: '🎵', color: 'from-yellow-500/20 to-orange-500/20' },
                          { name: 'Archive.zip', icon: '📦', color: 'from-gray-500/20 to-slate-500/20' },
                          { name: 'Notes.md', icon: '📝', color: 'from-cyan-500/20 to-blue-500/20' },
                        ].map((file, i) => (
                          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.7 + i * 0.05 }}
                            className={`bg-gradient-to-br ${file.color} rounded-2xl p-4 border border-white/5 hover:border-white/20 transition-all hover:scale-105 cursor-pointer`}>
                            <div className="text-3xl mb-3">{file.icon}</div>
                            <div className="text-sm font-medium truncate">{file.name}</div>
                            <div className="text-xs text-gray-500 mt-1">2.4 MB</div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* Stats Section - Dramatic Numbers */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5" />
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-white/5" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} />
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" animate={{ rotate: -360 }} transition={{ duration: 45, repeat: Infinity, ease: 'linear' }} />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '50', suffix: 'M+', label: 'Active Users', color: 'text-cyan-400' },
              { value: '99.99', suffix: '%', label: 'Uptime SLA', color: 'text-green-400' },
              { value: '150', suffix: '+', label: 'Countries', color: 'text-purple-400' },
              { value: '10', suffix: 'PB', label: 'Data Stored', color: 'text-pink-400' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.8 }} className="text-center">
                <div className={`text-5xl md:text-7xl font-bold ${stat.color} mb-2`}>
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-gray-500 text-sm uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="relative py-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050510] to-black" />
        <GradientBlob className="w-[600px] h-[600px] top-0 right-0 opacity-20" color1="#8b5cf6" color2="#ec4899" delay={2} />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-20">
            <motion.span initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="inline-block text-purple-400 text-sm font-semibold uppercase tracking-[0.3em] mb-6">Features</motion.span>
            <RevealText><h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Everything you need</h2></RevealText>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-xl text-gray-400 max-w-2xl mx-auto">
              Powerful features designed to make your workflow seamless
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}>
                <TiltCard>
                  <div className="group relative h-full bg-gradient-to-br from-white/[0.05] to-white/[0.02] rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden min-h-[280px] flex flex-col">
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                    <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg flex-shrink-0`}>
                      {feature.icon}
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-gray-400 leading-relaxed flex-grow">{feature.desc}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section - Dramatic Visual */}
      <section id="security" className="relative py-40 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-black to-black" />
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            {[...Array(3)].map((_, i) => (
              <motion.div key={i} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-green-500/20"
                style={{ width: 300 + i * 200, height: 300 + i * 200 }}
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 4, delay: i * 0.5, repeat: Infinity }} />
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
              <span className="inline-block text-green-400 text-sm font-semibold uppercase tracking-[0.3em] mb-6">Security</span>
              <RevealText><h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-8">Your data is<br /><span className="text-green-400">fortress-protected</span></h2></RevealText>
              <p className="text-xl text-gray-400 mb-10 leading-relaxed">Military-grade encryption, zero-knowledge architecture, and compliance with global security standards.</p>
              
              <div className="space-y-6">
                {[
                  { icon: '🔐', title: 'End-to-End Encryption', desc: 'AES-256 encryption for all files' },
                  { icon: '🛡️', title: 'Zero-Knowledge', desc: 'We can never see your data' },
                  { icon: '✅', title: 'SOC 2 Certified', desc: 'Enterprise-grade compliance' },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-green-500/30 transition-colors">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} className="relative">
              <div className="relative w-80 h-80 mx-auto">
                <motion.div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 4, repeat: Infinity }} />
                <div className="absolute inset-0 rounded-full border-2 border-green-500/30 flex items-center justify-center">
                  <motion.div className="w-40 h-40 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30"
                    animate={{ boxShadow: ['0 0 60px rgba(34, 197, 94, 0.3)', '0 0 100px rgba(34, 197, 94, 0.5)', '0 0 60px rgba(34, 197, 94, 0.3)'] }}
                    transition={{ duration: 3, repeat: Infinity }}>
                    <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials - Horizontal Scroll */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0510] to-black" />
        
        <div className="relative z-10">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-20 px-6">
            <motion.span initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="inline-block text-pink-400 text-sm font-semibold uppercase tracking-[0.3em] mb-6">Testimonials</motion.span>
            <RevealText><h2 className="text-5xl md:text-7xl font-bold tracking-tight">Loved by millions</h2></RevealText>
          </motion.div>

          <div className="relative">
            <motion.div className="flex gap-8 px-6" animate={{ x: [0, -1000] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
              {[...testimonials, ...testimonials, ...testimonials].map((t, i) => (
                <motion.div key={i} whileHover={{ scale: 1.02, y: -5 }} className="flex-shrink-0 w-[400px] p-8 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-pink-500/30 transition-all">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-2xl">{t.avatar}</div>
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-sm text-gray-500">{t.role}</div>
                    </div>
                  </div>
                  <p className="text-gray-300 text-lg leading-relaxed">"{t.text}"</p>
                  <div className="flex gap-1 mt-6">
                    {[...Array(5)].map((_, j) => <span key={j} className="text-yellow-400">★</span>)}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050510] to-black" />
        <GradientBlob className="w-[800px] h-[800px] -bottom-[400px] left-1/2 -translate-x-1/2 opacity-30" color1="#3b82f6" color2="#8b5cf6" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-20">
            <motion.span initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="inline-block text-blue-400 text-sm font-semibold uppercase tracking-[0.3em] mb-6">Pricing</motion.span>
            <RevealText><h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Simple, transparent pricing</h2></RevealText>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-xl text-gray-400 max-w-2xl mx-auto">
              Start free, upgrade when you need more
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {plans.map((plan, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6 }} className="flex">
                <TiltCard className="w-full">
                  <div className={`relative h-full p-8 rounded-3xl border transition-all duration-500 flex flex-col ${plan.popular ? 'bg-gradient-to-b from-blue-500/10 to-purple-500/10 border-blue-500/50 shadow-2xl shadow-blue-500/20' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}>
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-sm font-semibold">Most Popular</div>
                    )}
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-bold">${plan.price}</span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      <div className="text-gray-400 mt-2">{plan.storage} storage</div>
                    </div>
                    <ul className="space-y-4 mb-8 flex-grow">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-3 text-gray-300">
                          <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link to="/signup" className="mt-auto">
                      <MagneticButton className={`w-full py-4 rounded-2xl font-semibold transition-all ${plan.popular ? 'bg-white text-black hover:shadow-lg hover:shadow-white/20' : 'bg-white/10 hover:bg-white/20'}`} onMouseEnter={setCursor('hover')} onMouseLeave={setCursor('default')}>
                        Get Started
                      </MagneticButton>
                    </Link>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-40 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-[#0a0a1a] to-black" />
          <motion.div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)' }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity }} />
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1 }}>
            <RevealText><h2 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8">Ready to get started?</h2></RevealText>
            <motion.p initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-12">
              Join millions of users who trust NDX Cloud with their most important files.
            </motion.p>
            
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <MagneticButton className="group relative px-10 py-5 bg-white text-black font-semibold rounded-full text-lg overflow-hidden" onMouseEnter={setCursor('hover')} onMouseLeave={setCursor('default')}>
                  <span className="relative z-10 flex items-center gap-2">Start for free<motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span></span>
                  <motion.div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" initial={{ x: '-100%' }} whileHover={{ x: 0 }} transition={{ duration: 0.4 }} />
                  <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 font-semibold">Start for free →</span>
                </MagneticButton>
              </Link>
              <MagneticButton className="px-10 py-5 border border-white/20 rounded-full text-lg font-medium hover:bg-white/5 transition-all" onMouseEnter={setCursor('hover')} onMouseLeave={setCursor('default')}>
                Contact Sales
              </MagneticButton>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.7 }} className="text-gray-500 text-sm mt-8">
              No credit card required • 15GB free forever • Cancel anytime
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-3 mb-6">
                <img src="/applogo_white_text.png" alt="NDX Cloud" className="h-32 w-auto object-contain" />
              </Link>
              <p className="text-gray-500 max-w-xs leading-relaxed">The next generation of cloud storage. Secure, fast, and beautifully designed.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Security', 'Pricing', 'Updates'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
              { title: 'Support', links: ['Help Center', 'Contact', 'Status', 'API'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link, j) => (
                    <li key={j}><a href="#" className="text-gray-500 hover:text-white transition-colors text-sm">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5">
            <p className="text-gray-500 text-sm">© 2026 NDX Cloud. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              {['Twitter', 'GitHub', 'LinkedIn'].map((social, i) => (
                <a key={i} href="#" className="text-gray-500 hover:text-white transition-colors text-sm">{social}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
