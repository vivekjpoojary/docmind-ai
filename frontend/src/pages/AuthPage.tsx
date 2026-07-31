import React, { useState } from 'react';
import { Brain, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const tokens = await authApi.login(email, password);
        await login(tokens);
      } else {
        await authApi.register(email, password, fullName);
        const tokens = await authApi.login(email, password);
        await login(tokens);
      }
    } catch (err: any) {
      console.error('Authentication failed:', err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail) && detail.length > 0) {
        setError(detail.map((item: any) => item.msg || JSON.stringify(item)).join('. '));
      } else {
        setError('Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-void">
      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
        
        {/* Left Side: Hero Branding */}
        <div className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-floor via-[#0F1422] to-slate-900 text-white relative overflow-hidden border-r border-white/10">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyber-cyan/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-cyber-indigo/15 rounded-full blur-3xl" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-br from-cyber-indigo to-cyber-cyan rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.35)]">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold font-display text-gradient-cyan tracking-tight">DocMind AI</span>
            </div>
            
            <h2 className="text-2xl font-extrabold font-display text-slate-100 leading-tight">
              Flagship Document Intelligence Workstation
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Enterprise Retrieval-Augmented Generation (RAG) platform with strict zero-hallucination page citations, FAISS dense vector search, and local model execution.
            </p>
          </div>

          <div className="relative z-10 space-y-2.5 font-mono text-xs">
            <div className="flex items-center space-x-3 text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10">
              <ShieldCheck className="w-4 h-4 text-cyber-cyan shrink-0" />
              <span>Page-accurate citation mapping & quote overlays</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10">
              <Sparkles className="w-4 h-4 text-cyber-indigo shrink-0" />
              <span>FAISS high-performance vector embedding space</span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-8 flex flex-col justify-center bg-[#0D111A]">
          <div className="mb-6">
            <h3 className="text-2xl font-bold font-display text-slate-100">
              {isLogin ? 'Workstation Login' : 'Register Account'}
            </h3>
            <p className="text-xs font-mono text-slate-400 mt-1">
              {isLogin ? 'Sign in to access your document vault & 3-column workstation.' : 'Create an account to begin vectorizing documents.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Mercer"
                    className="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-slate-100 font-sans text-xs focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@docmind.ai"
                  className="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-slate-100 font-sans text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-slate-100 font-sans text-xs focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyber-cyan to-cyber-indigo hover:opacity-90 text-white font-semibold text-xs rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : isLogin ? 'Sign In to Workstation' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs font-mono text-slate-400">
            {isLogin ? "Don't have an account?" : 'Already registered?'}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-cyber-cyan font-bold hover:underline"
            >
              {isLogin ? 'Register now' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
