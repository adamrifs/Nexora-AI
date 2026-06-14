import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import InputField from './components/InputField';
import GlassLoader from './components/GlassLoader';
import multiSphere from '../../assets/multiSphere.png';
import sphere from '../../assets/sphere.png';

const LoginPage = () => {
  const phrases = [
    "Your Intelligent Conversation Partner. Experience the future of dialogue.",
    "Analyze data, draft emails, and research faster. Your ultimate productivity boost.",
    "Unleash the power of AI to synthesize complex information instantly.",
    "Seamlessly integrated with your workflow. Work smarter, not harder.",
    "Transform ideas into actionable insights. Nexora AI is always ready."
  ];

  const [currentPhrase, setCurrentPhrase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % phrases.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex overflow-hidden bg-[#FAF9FD] bg-[radial-gradient(at_0%_0%,_#FCE7EC_0px,_transparent_50%),radial-gradient(at_100%_0%,_#E6D8FA_0px,_transparent_50%),radial-gradient(at_0%_100%,_#CDE4FF_0px,_transparent_50%),radial-gradient(at_100%_100%,_#ECC2DF_0px,_transparent_50%)]">
      
      {/* Absolute Background Layer (Mesh Gradients matching Dashboard) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-200px] left-[-200px] w-[800px] h-[800px] rounded-full bg-[#FCDCCB] blur-[150px] opacity-80" />
        <div className="absolute top-[-200px] right-[-200px] w-[900px] h-[900px] rounded-full bg-[#D1C5F4] blur-[150px] opacity-80" />
        <div className="absolute bottom-[-300px] left-[-200px] w-[1000px] h-[1000px] rounded-full bg-[#C0E8FE] blur-[160px] opacity-80" />
        <div className="absolute bottom-[-200px] right-[-200px] w-[800px] h-[800px] rounded-full bg-[#F3D0E7] blur-[150px] opacity-80" />
        <div className="absolute top-[20%] left-[10%] w-[600px] h-[600px] rounded-full bg-[#E5D9F2] blur-[150px] opacity-70" />
      </div>

      {/* Floating Background Spheres */}
      <img src={sphere} alt="" className="absolute top-[15%] right-[30%] w-28 h-28 object-cover blur-[2px] opacity-70 animate-float-lg" style={{ animationDelay: '1s' }} />
      <img src={sphere} alt="" className="absolute top-[40%] left-[40%] w-20 h-20 object-cover blur-[4px] opacity-60 animate-float-xl" style={{ animationDelay: '2s' }} />
      <img src={sphere} alt="" className="absolute top-[-5%] right-[15%] w-64 h-64 object-cover blur-[3px] opacity-60 animate-float-lg" style={{ animationDelay: '0s' }} />
      <img src={sphere} alt="" className="absolute bottom-[20%] right-[10%] w-32 h-32 object-cover blur-[5px] opacity-50 animate-float-xl" style={{ animationDelay: '3s' }} />
      <img src={sphere} alt="" className="absolute top-[5%] left-[10%] w-48 h-48 object-cover blur-[2px] opacity-80 animate-float-lg" style={{ animationDelay: '1.5s' }} />

      {/* Top Center Space Fillers */}
      <div className="absolute top-[10%] left-[45%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#A573FF]/20 to-[#C0E8FE]/30 blur-[80px] animate-float-xl mix-blend-overlay" style={{ animationDelay: '4s' }} />
      <img src={sphere} alt="" className="absolute top-[12%] left-[48%] w-36 h-36 object-cover blur-[1px] opacity-85 animate-float-lg" style={{ animationDelay: '2.5s' }} />
      <img src={sphere} alt="" className="absolute top-[25%] left-[60%] w-12 h-12 object-cover blur-[4px] opacity-40 animate-float-xl" style={{ animationDelay: '0.5s' }} />

      {/* Main MultiSphere */}
      <img
        src={multiSphere}
        alt="Decorative Spheres"
        className="absolute bottom-[-18%] left-[-2%] w-[1100px] h-auto object-contain drop-shadow-2xl z-0 pointer-events-none animate-float-xl"
      />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between p-4 py-8 sm:p-8 lg:p-24 min-h-screen">

        {/* Left Side Branding */}
        <div className="flex-1 w-full text-center lg:text-left mb-8 lg:mb-0 lg:pr-12 pt-4 lg:pt-0 flex flex-col items-center lg:items-start justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/30 backdrop-blur-md border border-white/40 shadow-sm mb-6 animate-slide-up">
            <Sparkles className="w-4 h-4 text-[#8C52FF]" />
            <span className="text-sm font-semibold text-[#362758] tracking-wide">Nexora Intelligence</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl lg:text-[7.5rem] font-outfit font-extrabold tracking-tight mb-6 bg-gradient-to-r from-[#1b1238] via-[#3c2a63] to-[#1b1238] bg-clip-text text-transparent leading-none animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Nexora AI
          </h1>
          
          <div className="relative h-20 lg:h-24 w-full max-w-lg mx-auto lg:mx-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {phrases.map((phrase, index) => (
              <p 
                key={index}
                className={`absolute inset-0 text-lg md:text-2xl text-gray-800/80 leading-relaxed font-sans font-medium transition-all duration-1000 ease-in-out ${currentPhrase === index ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 -translate-y-4 blur-sm pointer-events-none'}`}
              >
                {phrase}
              </p>
            ))}
          </div>
        </div>

        {/* Right Side Glassmorphism Panel */}
        <div className="w-full max-w-md lg:mr-12 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="relative group">
            {/* Animated border glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#A573FF] to-[#8C52FF] rounded-[2.5rem] blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
              {/* Subtle top glare/gradient for glass effect */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>

              <div className="relative z-10">
                {/* Header Badges */}
                <div className="flex flex-col gap-2 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#A573FF] to-[#8C52FF] flex items-center justify-center shadow-lg transform -rotate-6">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                      <p className="text-gray-600 font-medium text-sm">Sign in to continue to Nexora</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-md border border-red-100 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                    {error}
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <InputField
                      icon={Mail}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Email Address"
                    />

                    <div>
                      <InputField
                        icon={Lock}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Password"
                      />
                      <div className="flex justify-end mt-2">
                        <a href="#" className="text-sm font-medium text-gray-500 hover:text-[#8C52FF] transition-colors">Forgot Password?</a>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 mt-6 bg-gradient-to-r from-[#1b1238] to-[#3c2a63] hover:from-[#251a3d] hover:to-[#4a347a] text-white rounded-2xl font-semibold transition-all shadow-[0_8px_20px_rgba(27,18,56,0.2)] hover:shadow-[0_8px_25px_rgba(27,18,56,0.3)] disabled:opacity-70 flex justify-center items-center gap-2 group"
                  >
                    Sign In
                    {!isSubmitting && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </button>
                </form>

                <div className="mt-6 flex items-center justify-between">
                  <hr className="w-full border-gray-300/50" />
                  <span className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">OR</span>
                  <hr className="w-full border-gray-300/50" />
                </div>

                {/* Social Login Options */}
                <div className="mt-6 flex justify-center w-full">
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      setIsSubmitting(true);
                      setError('');
                      try {
                        await loginWithGoogle(credentialResponse.credential);
                        navigate('/');
                      } catch (err) {
                        setError(err.response?.data?.message || 'Google login failed');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    onError={() => setError('Google login failed')}
                    theme="outline"
                    size="large"
                    shape="pill"
                  />
                </div>

                {/* Footer Links */}
                <div className="mt-8 text-center">
                  <p className="text-[15px] font-medium text-gray-600">
                    New to Nexora?{' '}
                    <Link to="/signup" className="text-[#8C52FF] hover:text-[#A573FF] font-bold transition-colors underline decoration-transparent hover:decoration-[#A573FF] underline-offset-4">
                      Create an account
                    </Link>
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Glassmorphism Loader Overlay */}
      {isSubmitting && <GlassLoader title="Authenticating" subtitle="Please wait a moment…" />}
    </div>
  );
};

export default LoginPage;
