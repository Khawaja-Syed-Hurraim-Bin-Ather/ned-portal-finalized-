'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [program, setProgram] = useState<'CSE' | 'CS' | 'SE'>('CSE');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email || !password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            program_code: program,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data?.session) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setSuccessMsg(
          'Registration successful! Please check your email inbox to confirm your account, then sign in.'
        );
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unexpected registration error.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-split-page">
      {/* ── Left: Form styled with official EduCompass theme ── */}
      <div className="login-form-side">
        <div className="login-form-container">
          {/* Logo centered above the form */}
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
            <h1>Create your account</h1>
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

          {successMsg ? (
            <div
              role="status"
              style={{
                padding: '16px',
                borderRadius: 8,
                backgroundColor: 'rgba(39, 174, 96, 0.08)',
                border: '1px solid #27AE60',
                color: '#27AE60',
                fontSize: 13,
                lineHeight: 1.5,
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Verification email sent!</p>
              <p style={{ marginBottom: 16 }}>{successMsg}</p>
              <Link
                href="/login"
                className="button button-primary"
                style={{
                  display: 'inline-block',
                  padding: '8px 20px',
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSignup} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label
                  htmlFor="fullname-input"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: 'var(--text)',
                  }}
                >
                  Full Name
                </label>
                <input
                  id="fullname-input"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Syed Hurraim"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

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
                  University Email
                </label>
                <input
                  id="email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@cloud.neduet.edu.pk"
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="program-select"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: 'var(--text)',
                  }}
                >
                  Academic Program
                </label>
                <select
                  id="program-select"
                  value={program}
                  onChange={(e) => setProgram(e.target.value as 'CSE' | 'CS' | 'SE')}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 14,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="CSE">Computer Systems Engineering (CSE)</option>
                  <option value="CS">Computer Science (CS)</option>
                  <option value="SE">Software Engineering (SE)</option>
                </select>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  EduCompass covers computing fields only.
                </span>
              </div>

              <div>
                <label
                  htmlFor="password-input"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: 'var(--text)',
                  }}
                >
                  Password (min 8 characters)
                </label>
                <input
                  id="password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password-input"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: 'var(--text)',
                  }}
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password-input"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 14,
                    outline: 'none',
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
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>

              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    style={{
                      color: 'var(--primary)',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Right: Solid maroon panel with NED logo and motto ── */}
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
