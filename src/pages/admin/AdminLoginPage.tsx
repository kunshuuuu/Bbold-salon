import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../../components/common/BrandLogo';
import { isSupabaseConfigured } from '../../lib/supabase';
import { SITE_CONFIG } from '../../config/site';

export const AdminLoginPage: React.FC = () => {
  const {
    user,
    isAdmin,
    isLoading,
    unauthorizedMessage,
    signIn,
    signOut,
    sendPasswordReset,
    enablePreviewAdminSession,
  } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 60-second client lockout after 5 failures
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);

  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [isLoading, user, isAdmin, navigate]);

  useEffect(() => {
    if (lockoutSecondsLeft <= 0) return;
    const t = window.setInterval(() => {
      setLockoutSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [lockoutSecondsLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSecondsLeft > 0) return;

    setErrorMsg(null);
    setResetMsg(null);
    setSubmitting(true);

    const res = await signIn(email, password);
    setSubmitting(false);

    if (res.isAdmin) {
      setFailedAttempts(0);
      navigate('/admin', { replace: true });
      return;
    }

    const nextFailures = failedAttempts + 1;
    setFailedAttempts(nextFailures);
    if (nextFailures >= 5) {
      setLockoutSecondsLeft(60);
      setFailedAttempts(0);
    }

    setErrorMsg(res.error || 'Incorrect email or password');
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMsg('Enter your email address above first, then click Forgot password.');
      return;
    }
    setErrorMsg(null);
    setResetMsg(null);
    const res = await sendPasswordReset(email);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setResetMsg('If that email is registered, a password reset link has been sent.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] dot-bg bg-[#F6F4F0] text-[#15110F] flex items-center justify-center font-sans text-sm">
        Checking session and administrator permissions...
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] dot-bg bg-[#F6F4F0] text-[#15110F] font-sans flex flex-col justify-center items-center p-4">
      <Helmet>
        <title>Admin Sign In — {SITE_CONFIG.brandName}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="w-full max-w-[420px] rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] p-6 sm:p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <BrandLogo variant="dark" sizeClass="h-11" badge="Admin Portal" />
            <p className="text-[14px] leading-[20px] text-[#6B6560] mt-2">
              Sign in to manage appointments and website content
            </p>
          </div>
          <div className="w-10 h-10 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] flex items-center justify-center text-[#C4262E] shrink-0">
            <Lock size={18} />
          </div>
        </div>

        {/* Non-admin signed-in user notice */}
        {(unauthorizedMessage || (user && !isAdmin)) && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-[8px] bg-[#B3261E]/10 border border-[#B3261E]/30 text-[#B3261E] text-[14px] leading-[20px]"
          >
            <p className="font-medium">
              You are signed in, but you are not authorized as an admin.
            </p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-2 text-[12px] underline font-medium cursor-pointer"
            >
              Sign out and try another account
            </button>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-[8px] bg-[#B3261E]/10 border border-[#B3261E]/30 text-[#B3261E] text-[14px] leading-[20px]"
          >
            {errorMsg}
          </div>
        )}

        {resetMsg && (
          <div
            role="status"
            className="mb-4 p-3 rounded-[8px] bg-[#1E7B4F]/10 border border-[#1E7B4F]/30 text-[#1E7B4F] text-[14px] leading-[20px]"
          >
            {resetMsg}
          </div>
        )}

        {lockoutSecondsLeft > 0 && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-[8px] bg-[#B7791F]/15 border border-[#B7791F]/40 text-[#15110F] text-[14px] leading-[20px]"
          >
            Too many failed sign-in attempts. Please wait{' '}
            <strong className="font-mono">{lockoutSecondsLeft}s</strong> before trying again.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-[12px] leading-[16px] font-medium text-[#15110F] mb-1.5"
            >
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={lockoutSecondsLeft > 0}
              className="w-full px-3.5 py-2.5 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px] leading-[20px] text-[#15110F] focus:outline-none focus:border-[#C4262E]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="admin-password"
                className="block text-[12px] leading-[16px] font-medium text-[#15110F]"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => void handleForgotPassword()}
                className="text-[12px] leading-[16px] text-[#6B6560] hover:text-[#15110F] underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={lockoutSecondsLeft > 0}
              className="w-full px-3.5 py-2.5 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px] leading-[20px] text-[#15110F] focus:outline-none focus:border-[#C4262E]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || lockoutSecondsLeft > 0}
            className="w-full py-2.5 px-4 rounded-[8px] bg-[#C4262E] text-white text-[14px] leading-[20px] font-medium hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E6E2DB] flex items-center justify-between text-[12px] text-[#6B6560]">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-[#15110F]">
            <ArrowLeft size={14} />
            <span>Back to website</span>
          </Link>
          <span>Authorized staff only</span>
        </div>
      </div>
    </div>
  );
};
