import { login } from '@/app/actions';
export default function Login() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="wordmark">Glo<i>.</i></div>
        <form action={login} className="auth-form">
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button className="post-btn" type="submit">Log in</button>
        </form>
        <a className="auth-link" href="/signup">New to Glo? Sign up</a>
      </div>
    </div>
  );
}
