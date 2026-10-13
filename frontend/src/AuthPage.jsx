import { useState } from 'react';
import { login, registerAccount } from './api.js';

function Mark() {
  return (
    <span className="auth-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3.5 8.25A2.25 2.25 0 0 1 5.75 6h12.5a2.25 2.25 0 0 1 2.25 2.25v9.5A2.25 2.25 0 0 1 18.25 20H5.75a2.25 2.25 0 0 1-2.25-2.25v-9.5Z" />
        <path d="M3.75 9h16.5M16 14.5h.01M6 6V4.75A1.75 1.75 0 0 1 7.75 3h9l2 3" />
      </svg>
    </span>
  );
}

function AuthPage({ onAuthenticated, initialError, onRetry }) {
  const [mode, setMode] = useState('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isRegistering = mode === 'register';

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (isRegistering && password !== confirmPassword) {
      setError('Your passwords do not match. Please check and try again.');
      return;
    }

    setBusy(true);
    try {
      const account = isRegistering
        ? await registerAccount({ name, email, password })
        : await login({ email, password });
      onAuthenticated(account);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="About VaultUnit">
        <a className="auth-brand" href="/" aria-label="VaultUnit home">
          <Mark />
          <span>vault<span>unit</span></span>
        </a>

        <div className="auth-story-copy">
          <span className="auth-kicker"><i /> A CALMER WAY TO YOUR GOALS</span>
          <h1>Make room for<br />what <span>matters.</span></h1>
          <p>One clear view of your money. A little more confidence in every decision.</p>
        </div>

        <div className="auth-preview" aria-label="Example of a VaultUnit personal dashboard">
          <div className="preview-heading">
            <span className="preview-icon"><Mark /></span>
            <span><strong>Your finances, together</strong><small>A snapshot of your progress</small></span>
            <i className="preview-live" />
          </div>
          <div className="preview-stats">
            <div><small>MONTHLY SAVINGS</small><strong>₹ 12,840</strong><span>↑ 12.8% this month</span></div>
            <div className="preview-mini-chart" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
          <div className="preview-goal">
            <span className="preview-goal-icon">↗</span>
            <span><strong>A little progress, every day.</strong><small>Your goals are closer than you think.</small></span>
            <span className="preview-arrow">↗</span>
          </div>
          <div className="preview-decoration decoration-one" />
          <div className="preview-decoration decoration-two" />
        </div>

        <div className="auth-story-foot"><span>01</span> YOUR MONEY, IN FOCUS <i /> PRIVATE BY DESIGN</div>
      </section>

      <section className="auth-main" aria-label={isRegistering ? 'Create your VaultUnit account' : 'Sign in to VaultUnit'}>
        <div className="auth-mobile-brand"><Mark /><span>vault<span>unit</span></span></div>
        <div className="auth-form-wrap">
          <div className="auth-welcome">
            <span className="auth-form-kicker">{isRegistering ? 'A FRESH START' : 'WELCOME BACK'}</span>
            <h2>{isRegistering ? 'Create your account' : 'Good to see you again.'}</h2>
            <p>{isRegistering ? 'Start building a clearer picture of your money.' : 'Sign in to pick up where you left off.'}</p>
          </div>

          <div className="auth-mode-switch" role="tablist" aria-label="Account action">
            <button className={isRegistering ? 'selected' : ''} role="tab" aria-selected={isRegistering} onClick={() => changeMode('register')} type="button">Create account</button>
            <button className={!isRegistering ? 'selected' : ''} role="tab" aria-selected={!isRegistering} onClick={() => changeMode('login')} type="button">Sign in</button>
          </div>

          {(error || initialError) && (
            <div className="auth-error" role="alert">
              <span className="auth-error-icon">!</span>
              <span>{error || initialError}</span>
              {initialError && <button type="button" onClick={onRetry}>Retry</button>}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegistering && (
              <label className="auth-field">
                <span>Your name</span>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Jordan Lee"
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
            )}

            <label className="auth-field">
              <span>Email address</span>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <span className="auth-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder={isRegistering ? 'At least 8 characters' : 'Enter your password'}
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  minLength={isRegistering ? 8 : 1}
                  maxLength={72}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
              {isRegistering && <small className="auth-field-hint">Use 8 or more characters to keep your account secure.</small>}
            </label>

            {isRegistering && (
              <label className="auth-field">
                <span>Confirm password</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </label>
            )}

            <button className="auth-submit" type="submit" disabled={busy}>
              <span>{busy ? (isRegistering ? 'Creating your account…' : 'Signing you in…') : (isRegistering ? 'Create my account' : 'Sign in securely')}</span>
              {!busy && <span className="auth-submit-arrow">→</span>}
            </button>
          </form>

          <div className="auth-security-note"><span>▣</span> Your password is securely hashed, never stored as plain text. This device stays signed in for up to 10 years unless you log out sooner.</div>
          <p className="auth-switch-note">
            {isRegistering ? 'Already have a VaultUnit account?' : 'New to VaultUnit?'}
            {' '}
            <button type="button" onClick={() => changeMode(isRegistering ? 'login' : 'register')}>{isRegistering ? 'Sign in' : 'Create an account'}</button>
          </p>
        </div>

        <footer className="auth-footer"><span>© 2026 VaultUnit</span><span>Built for a clearer financial future</span></footer>
      </section>
    </main>
  );
}

export default AuthPage;
