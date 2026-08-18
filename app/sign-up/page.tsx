'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/core';
import { signup } from '@/app/actions';

export default function Signup() {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction] = useFormState(signup, null);

  useEffect(() => {
    if (state?.error) {
      toast(state.error);
    }
  }, [state, toast]);

  return (
    <div className="auth-wrap">
      <div className="auth-top">
        <button className="icon-btn" onClick={() => router.push('/')} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="auth-card">
        <div className="wordmark">Glo<i>.</i></div>

        <form action={formAction} className="auth-form">
          <input name="display_name" placeholder="Display name" required />
          <input name="username" placeholder="Username" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" minLength={6} required />
          <button className="post-btn" type="submit">Sign up</button>
        </form>

        <a className="auth-link" href="/login">Already have an account? Log in</a>
      </div>
    </div>
  );
}