import { useState } from "react";
import { resetPasswordWithToken } from "../api";
import { PASSWORD_REQUIREMENTS_TEXT, validatePasswordStrength } from "../passwordPolicy";
import PasswordInput from "./PasswordInput";
import SchoolBackdrop from "./SchoolBackdrop";

interface ResetPasswordPageProps {
  token: string;
  onDone: () => void;
}

export default function ResetPasswordPage({ token, onDone }: ResetPasswordPageProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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
      await resetPasswordWithToken(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset the password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <SchoolBackdrop />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border-4 border-amber-300 bg-white/95 p-6 shadow-xl backdrop-blur">
        <h1 className="mb-4 text-lg font-semibold text-slate-900">Set a new password</h1>

        {done ? (
          <>
            <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Password reset. You can now log in with your new password.
            </p>
            <button
              type="button"
              onClick={onDone}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Go to Log In
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="reset-password" className="mb-1 block text-sm font-medium text-slate-700">
              New password
            </label>
            <PasswordInput
              id="reset-password"
              value={password}
              onChange={setPassword}
              placeholder="New password"
              autoFocus
              className="mb-1"
            />
            <p className="mb-4 text-xs text-slate-500">{PASSWORD_REQUIREMENTS_TEXT}</p>

            <label htmlFor="reset-confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <PasswordInput
              id="reset-confirm-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm new password"
            />

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Please wait..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
