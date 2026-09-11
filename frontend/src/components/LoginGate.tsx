import { useEffect, useState } from "react";
import { getGoogleAuthConfig, googleAuth, login, requestPasswordReset, signup } from "../api";
import { setStoredCredentials } from "../auth";
import { PASSWORD_REQUIREMENTS_TEXT, validatePasswordStrength } from "../passwordPolicy";
import GoogleSignInButton from "./GoogleSignInButton";
import PasswordInput from "./PasswordInput";

interface LoginGateProps {
  onLogin: () => void;
}

type Mode = "login" | "signup" | "forgot";

export default function LoginGate({ onLogin }: LoginGateProps) {
  const [mode, setMode] = useState<Mode>("login");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");

  useEffect(() => {
    let cancelled = false;
    getGoogleAuthConfig().then(({ configured, clientId }) => {
      if (!cancelled && configured) setGoogleClientId(clientId);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGoogleCredential(idToken: string) {
    setError("");
    setLoading(true);
    try {
      const credentials = await googleAuth(idToken);
      setStoredCredentials(credentials);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      setStoredCredentials({ username, password });
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect username or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signup(username, email, password);
      await login(username, password);
      setStoredCredentials({ username, password });
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create the account.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    setLoading(true);
    try {
      await requestPasswordReset(username, email);
      setNotice(`If that username and email match an account, a reset link has been sent to ${email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send the reset email.");
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Mode, string> = {
    login: "Log in",
    signup: "Create an account",
    forgot: "Reset your password",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={mode === "login" ? handleLoginSubmit : mode === "signup" ? handleSignupSubmit : handleForgotSubmit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-4 text-lg font-semibold text-slate-900">{titles[mode]}</h1>

        {mode === "forgot" && !notice && (
          <p className="mb-4 text-sm text-slate-500">
            Enter your username and the email you registered with, and we'll send a link to reset
            your password.
          </p>
        )}

        {notice && (
          <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
        )}

        {mode === "login" && googleClientId && (
          <>
            <GoogleSignInButton clientId={googleClientId} onCredential={handleGoogleCredential} />
            <div className="my-4 flex items-center gap-3 text-xs font-medium text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              or
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        )}

        {!(mode === "forgot" && notice) && (
          <>
            <label htmlFor="login-username" className="mb-1 block text-sm font-medium text-slate-700">
              {mode === "login" ? "Username or email" : "Username"}
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === "login" ? "Username or email" : "Username"}
              autoFocus
              className="mb-4 w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </>
        )}

        {(mode === "signup" || mode === "forgot") && !(mode === "forgot" && notice) && (
          <>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="mb-4 w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </>
        )}

        {mode !== "forgot" && (
          <>
            <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={setPassword}
              placeholder="Password"
              className={mode === "signup" ? "mb-1" : "mb-4"}
            />
            {mode === "signup" && <p className="mb-4 text-xs text-slate-500">{PASSWORD_REQUIREMENTS_TEXT}</p>}
          </>
        )}

        {mode === "signup" && (
          <>
            <label htmlFor="login-confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <PasswordInput
              id="login-confirm-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm password"
            />
          </>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {!(mode === "forgot" && notice) && (
          <button
            type="submit"
            disabled={loading}
            className="mb-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Log In"
                : mode === "signup"
                  ? "Create Account"
                  : "Send Reset Link"}
          </button>
        )}

        <div className="flex flex-col gap-1 text-center text-sm text-indigo-600">
          {mode === "login" && (
            <>
              <button type="button" onClick={() => switchMode("signup")} className="hover:underline">
                Create an account
              </button>
              <button type="button" onClick={() => switchMode("forgot")} className="hover:underline">
                Forgot password?
              </button>
            </>
          )}
          {mode !== "login" && (
            <button type="button" onClick={() => switchMode("login")} className="hover:underline">
              Back to log in
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
