'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
import { AdminLoginModal } from '../../components/edit-mode/AdminLoginModal';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const callbackError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    callbackError ? 'Authentication failed or session expired. Please sign in again.' : null
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data?.user) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unexpected sign in error.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-split-page">
      {/* ── Left: Form on a plain surface ── */}
      <div className="login-form-side">
        <div className="login-form-container">
          {/* Logo centered above the form (height 72px) */}
          <div className="login-logo-wrap">
            <Link href="/" aria-label="EduCompass home">
              <img
                src="/assets/brand/ned-logo.png"
                alt="NED University of Engineering & Technology, Karachi"
                className="login-logo-img"
              />
            </Link>
          </div>

          <div className="login-header">
            <h1>Sign in to EduCompass</h1>
            <p>NED University of Engineering &amp; Technology, CISE Department</p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(192, 57, 43, 0.08)',
                border: '1px solid #C0392B',
                color: '#C0392B',
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'grid', gap: 16 }}>
            <div>
              <label
                htmlFor="email-input"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: 'var(--text)',
                }}
              >
                University email or roll number
              </label>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@cloud.neduet.edu.pk"
                autoComplete="email"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label
                  htmlFor="password-input"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text)',
                  }}
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: 12,
                    color: 'var(--primary)',
                    textDecoration: 'none',
                  }}
                >
                  Forgot password
                </Link>
              </div>
              <input
                id="password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 14,
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="button button-primary"
              style={{
                width: '100%',
                marginTop: 8,
                padding: '10px 16px',
                fontSize: 14,
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0', gap: 10 }}>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>or</span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                try {
                  setIsLoading(true);
                  setErrorMsg(null);
                  const supabase = createClient();
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
                    },
                  });
                  if (error) setErrorMsg(error.message);
                } catch (err: unknown) {
                  setErrorMsg(err instanceof Error ? err.message : 'Google sign-in error.');
                } finally {
                  setIsLoading(false);
                }
              }}
              className="button button-secondary"
              style={{
                width: '100%',
                padding: '9px 16px',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  style={{
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Create one now
                </Link>
              </p>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--muted)',
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                🔐 Institutional Admin Sign In (VC, Chairman, Operator)
              </button>
            </div>
          </form>

          <AdminLoginModal
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
          />
        </div>
      </div>

      {/* ── Right: Solid maroon panel with logo and motto ── */}
      <div className="login-panel-side">
        <div className="login-panel-content">
          <img
            src="/assets/brand/ned-logo.png"
            alt="NED University of Engineering & Technology"
            className="login-panel-logo"
          />
          <h2 className="login-panel-text">Your degree, planned with clarity.</h2>
          <p className="login-panel-sub">
            Department of Computer &amp; Information Systems Engineering
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--page)', color: 'var(--muted)', fontSize: 14 }}>
          Loading sign in...
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
