'use client';
import { useFormState } from 'react-dom';
import { signup } from '@/app/actions';

export default function Signup() {
  const [state, formAction] = useFormState(signup, null);
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="wordmark">Glo<i>.</i></div>
        <form action={formAction} className="auth-form">
          {state?.error && <div style={{ color: '#f4212e', fontSize: 14 }}>{state.error}</div>}
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