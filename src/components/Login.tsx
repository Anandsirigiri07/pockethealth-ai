import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LogIn, Heart, AlertCircle } from 'lucide-react';
import { signInWithGoogle, checkRedirectResult } from '@/src/lib/firebase';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check for redirect result on mount (in case signInWithRedirect was used)
  useEffect(() => {
    checkRedirectResult().then((result) => {
      if (result) {
        // User successfully signed in via redirect - onAuthStateChanged will handle it
        console.log("Redirect sign-in successful");
      }
    }).catch((err: any) => {
      console.error("Redirect result error:", err);
      setError(`Redirect sign-in failed: ${err.code || err.message}`);
    });
  }, []);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login failed:", err);
      
      if (err.code === 'auth/popup-closed-by-user') {
        setError("The login window was closed before completion. Please try again.");
      } else if (err.code === 'auth/cancelled-by-user') {
         setError("Login was cancelled. Please try again if you'd like to sign in.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized for sign-in. Please add 'localhost' to Firebase Auth > Settings > Authorized Domains.");
      } else {
        setError(`Sign-in error (${err.code}): ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 text-slate-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-60" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl opacity-60" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 flex flex-col items-center text-center relative z-10"
      >
        <div className="w-24 h-24 bg-brand rounded-3xl flex items-center justify-center text-white mb-8 shadow-2xl shadow-brand/20 group relative overflow-hidden">
          <Heart size={44} fill="currentColor" className="relative z-10" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20" />
        </div>
        
        <h1 className="font-display font-bold text-4xl mb-3 text-slate-900 tracking-tight">PocketHealth AI</h1>
        <p className="text-slate-500 mb-10 leading-relaxed font-medium">
          Better insights, faster care. Your intelligent companion for medical guidance and emergency assistance.
        </p>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-start gap-3 text-left"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </motion.div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-4 py-4 px-8 rounded-2xl font-bold transition-all active:scale-[0.98] group relative overflow-hidden border-2 ${
            loading 
              ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed shadow-none" 
              : "bg-white border-slate-100 text-slate-700 hover:border-brand/30 hover:bg-brand/[0.02] shadow-sm hover:shadow-xl hover:shadow-brand/5"
          }`}
        >
          {loading ? (
             <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="" className="w-6 h-6" aria-hidden="true" />
          )}
          <span className="text-lg">{loading ? "Connecting..." : "Sign in with Google"}</span>
          {!loading && <LogIn size={20} className="ml-2 text-slate-300 group-hover:text-brand transition-colors" />}
        </button>

        <div className="mt-10 flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
            End-to-End Encrypted
          </p>
        </div>
      </motion.div>
      
      <p className="mt-10 text-xs text-slate-400 max-w-xs text-center font-medium">
        Trusted by individuals seeking reliable health information. Not a substitute for professional medical help.
      </p>
    </div>
  );
}
