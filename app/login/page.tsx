'use client';
import { useFormState } from 'react-dom';
import { login } from '@/app/actions';

export default function Login() {
  const [state, formAction] = useFormState(login, null);
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="wordmark">Glo<i>.</i></div>
        <form action={formAction} className="auth-form">
          {state?.error && <div style={{ color: '#f4212e', fontSize: 14 }}>{state.error}</div>}
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button className="post-btn" type="submit">Log in</button>
        </form>
        <a className="auth-link" href="/sign-up">New to Glo? Sign up</a>
      </div>
    </div>
  );
}