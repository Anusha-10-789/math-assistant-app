import { useEffect, useState } from "react";
import {
  getGoogleAuthConfig,
  getOtpConfig,
  getRecoveryOptions,
  googleAuth,
  login,
  loginWithOtp,
  resetPasswordWithCode,
  resetPasswordWithSecurityAnswer,
  sendOtp,
  signup,
  type OtpChannel,
  type RecoveryOptions,
} from "../api";
import { getRememberedUsername, getRememberMe, setStoredCredentials } from "../auth";
import { PASSWORD_REQUIREMENTS_TEXT, validatePasswordStrength } from "../passwordPolicy";
import { SECURITY_QUESTIONS } from "../securityQuestions";
import GoogleSignInButton from "./GoogleSignInButton";
import PasswordInput from "./PasswordInput";
import SchoolBackdrop from "./SchoolBackdrop";

interface LoginGateProps {
  onLogin: () => void;
}

type Mode = "login" | "signup" | "signup-verify" | "forgot" | "forgot-choose" | "forgot-question" | "forgot-code";
type LoginMethod = "password" | "otp";

const INPUT_CLASS =
  "mb-4 w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";
const LABEL_CLASS = "mb-1 block text-sm font-medium text-slate-700";
const OPTION_BUTTON_CLASS =
  "mb-3 w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-left text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50";

const TITLES: Record<Mode, string> = {
  login: "Log in",
  signup: "Create an account",
  "signup-verify": "Verify your account",
  forgot: "Forgot your password?",
  "forgot-choose": "Reset your password",
  "forgot-question": "Answer your security question",
  "forgot-code": "Enter your code",
};

const CHANNEL_LABEL: Record<OtpChannel, string> = { email: "✉️ Email", sms: "📱 Mobile (SMS)" };

export default function LoginGate({ onLogin }: LoginGateProps) {
  const rememberedUsername = getRememberedUsername();
  const [mode, setMode] = useState<Mode>("login");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("password");
  const [otpConfig, setOtpConfig] = useState({ email: false, sms: false });

  // Email or mobile number — the one field used to log in.
  const [identifier, setIdentifier] = useState(rememberedUsername);
  const [rememberMe, setRememberMe] = useState(() => getRememberMe());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [verifyChannel, setVerifyChannel] = useState<OtpChannel>("email");

  const [recovery, setRecovery] = useState<RecoveryOptions | null>(null);
  const [resetChannel, setResetChannel] = useState<OtpChannel>("email");

  // One-time code shared by every flow: where it was sent, and what was typed.
  const [otpSentTo, setOtpSentTo] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");

  const otpAvailable = otpConfig.email || otpConfig.sms;
  const channels = (["email", "sms"] as OtpChannel[]).filter((c) => otpConfig[c]);

  useEffect(() => {
    let cancelled = false;
    getGoogleAuthConfig().then(({ configured, clientId }) => {
      if (!cancelled && configured) setGoogleClientId(clientId);
    });
    getOtpConfig().then((config) => {
      if (cancelled) return;
      setOtpConfig(config);
      if (!config.email && config.sms) setVerifyChannel("sms");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function switchMode(next: Mode, keepNotice = false) {
    setMode(next);
    setError("");
    if (!keepNotice) setNotice("");
    setPassword("");
    setConfirmPassword("");
    setSecurityAnswer("");
    setOtpCode("");
    setOtpSentTo("");
  }

  function checkNewPassword(): boolean {
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      setError(passwordError);
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    return true;
  }

  function checkCode(): boolean {
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError("Please enter the 6-digit code.");
      return false;
    }
    return true;
  }

  async function run(action: () => Promise<void>, fallbackError: string) {
    setError("");
    setLoading(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackError);
    } finally {
      setLoading(false);
    }
  }

  function codeSentNotice(sentTo: string) {
    setOtpCode("");
    setOtpSentTo(sentTo);
    setNotice(`We've sent a 6-digit code to ${sentTo}. It expires in 10 minutes.`);
  }

  async function handleGoogleCredential(idToken: string) {
    await run(async () => {
      const credentials = await googleAuth(idToken);
      setStoredCredentials(credentials, rememberMe);
      onLogin();
    }, "Google sign-in failed.");
  }

  // ---------- log in ----------

  function handleLoginSubmit() {
    const loginName = identifier.trim();
    if (!loginName) {
      setError("Please enter your email or mobile number.");
      return;
    }

    if (loginMethod === "otp") {
      if (!otpSentTo) {
        run(async () => codeSentNotice(await sendOtp("login", loginName)), "Failed to send the code.");
        return;
      }
      if (!checkCode()) return;
      run(async () => {
        const credentials = await loginWithOtp(loginName, otpCode.trim());
        setStoredCredentials(credentials, rememberMe);
        onLogin();
      }, "That code didn't work.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }
    run(async () => {
      await login(loginName, password);
      setStoredCredentials({ username: loginName, password }, rememberMe);
      onLogin();
    }, "Incorrect email, mobile number or password.");
  }

  // ---------- sign up ----------

  async function createAccount(channel: OtpChannel | "", code: string) {
    await signup({ email: email.trim(), phone, password, securityQuestion, securityAnswer, otpChannel: channel, otpCode: code });
    await login(email.trim(), password);
    setStoredCredentials({ username: email.trim(), password }, rememberMe);
    onLogin();
  }

  function handleSignupSubmit() {
    if (!email.trim() || !phone.trim()) {
      setError("Please enter your email address and mobile number.");
      return;
    }
    if (!checkNewPassword()) return;
    if (securityAnswer.trim().length < 2) {
      setError("Please answer your security question — it lets you reset your password later.");
      return;
    }
    if (!otpAvailable) {
      run(() => createAccount("", ""), "Failed to create the account.");
      return;
    }
    run(async () => {
      const sentTo = await sendOtp("signup", verifyChannel === "sms" ? phone : email.trim());
      // Not switchMode — the details just typed must survive for the final step.
      setMode("signup-verify");
      codeSentNotice(sentTo);
    }, "Failed to send the verification code.");
  }

  function handleSignupVerifySubmit() {
    if (!checkCode()) return;
    run(() => createAccount(verifyChannel, otpCode.trim()), "Failed to create the account.");
  }

  // ---------- forgot password ----------

  function handleForgotSubmit() {
    if (!identifier.trim()) {
      setError("Please enter your email or mobile number.");
      return;
    }
    run(async () => {
      const options = await getRecoveryOptions(identifier.trim());
      setRecovery(options);
      const count = [options.securityQuestion, options.emailAvailable, options.smsAvailable].filter(Boolean).length;
      if (count === 0) {
        setError(
          "This account has no security question, and codes by email or SMS aren't set up on this server. Please ask your teacher or the site admin for help.",
        );
      } else if (count > 1) {
        switchMode("forgot-choose");
      } else if (options.securityQuestion) {
        switchMode("forgot-question");
      } else {
        await startResetCode(options.emailAvailable ? "email" : "sms");
      }
    }, "Couldn't find that account.");
  }

  async function startResetCode(channel: OtpChannel) {
    const sentTo = await sendOtp("reset", identifier.trim(), channel);
    setResetChannel(channel);
    switchMode("forgot-code");
    codeSentNotice(sentTo);
  }

  function finishReset() {
    switchMode("login", true);
    setLoginMethod("password");
    setNotice("Your password has been reset. Log in with your new password.");
  }

  function handleSecurityAnswerSubmit() {
    if (!securityAnswer.trim()) {
      setError("Please enter your answer.");
      return;
    }
    if (!checkNewPassword()) return;
    run(async () => {
      await resetPasswordWithSecurityAnswer(identifier.trim(), securityAnswer, password);
      finishReset();
    }, "Failed to reset the password.");
  }

  function handleResetCodeSubmit() {
    if (!checkCode() || !checkNewPassword()) return;
    run(async () => {
      await resetPasswordWithCode(identifier.trim(), resetChannel, otpCode.trim(), password);
      finishReset();
    }, "Failed to reset the password.");
  }

  function handleResend() {
    const [purpose, destination, channel] =
      mode === "signup-verify"
        ? (["signup", verifyChannel === "sms" ? phone : email.trim(), ""] as const)
        : mode === "forgot-code"
          ? (["reset", identifier.trim(), resetChannel] as const)
          : (["login", identifier.trim(), ""] as const);
    run(async () => codeSentNotice(await sendOtp(purpose, destination, channel)), "Failed to send the code.");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "login") handleLoginSubmit();
    else if (mode === "signup") handleSignupSubmit();
    else if (mode === "signup-verify") handleSignupVerifySubmit();
    else if (mode === "forgot") handleForgotSubmit();
    else if (mode === "forgot-question") handleSecurityAnswerSubmit();
    else if (mode === "forgot-code") handleResetCodeSubmit();
  }

  // ---------- pieces ----------

  const newPasswordFields = (
    <>
      <label htmlFor="new-password" className={LABEL_CLASS}>
        {mode === "signup" ? "Password" : "New password"}
      </label>
      <PasswordInput
        id="new-password"
        value={password}
        onChange={setPassword}
        placeholder={mode === "signup" ? "Password" : "New password"}
        autoComplete="new-password"
        className="mb-1"
      />
      <p className="mb-4 text-xs text-slate-500">{PASSWORD_REQUIREMENTS_TEXT}</p>

      <label htmlFor="confirm-password" className={LABEL_CLASS}>
        Confirm password
      </label>
      <PasswordInput
        id="confirm-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Confirm password"
        autoComplete="new-password"
      />
    </>
  );

  const codeField = (
    <>
      <label htmlFor="otp-code" className={LABEL_CLASS}>
        6-digit code
      </label>
      <input
        id="otp-code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={otpCode}
        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
        placeholder="123456"
        autoFocus
        className={`${INPUT_CLASS} text-center text-lg font-bold tracking-[0.5em]`}
      />
    </>
  );

  const rememberMeCheckbox = (
    <label className="mb-4 flex items-start gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={rememberMe}
        onChange={(e) => setRememberMe(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span>
        Remember me on this device
        <span className="block text-xs text-slate-500">
          Keeps you logged in. Leave unticked on a shared computer — we'll still remember your email
          or mobile number.
        </span>
      </span>
    </label>
  );

  const identifierField = (id: string) => (
    <>
      <label htmlFor={id} className={LABEL_CLASS}>
        Email or mobile number
      </label>
      <input
        id={id}
        name="username"
        type="text"
        inputMode="email"
        autoComplete="username"
        value={identifier}
        onChange={(e) => {
          setIdentifier(e.target.value);
          setOtpSentTo("");
        }}
        placeholder="you@example.com or 98765 43210"
        autoFocus={!identifier}
        className={INPUT_CLASS}
      />
    </>
  );

  const submitLabel: Partial<Record<Mode, string>> = {
    login: loginMethod === "otp" && !otpSentTo ? "Send Code" : "Log In",
    signup: otpAvailable ? "Send Verification Code" : "Create Account",
    "signup-verify": "Verify & Create Account",
    forgot: "Continue",
    "forgot-question": "Reset Password",
    "forgot-code": "Reset Password",
  };

  const showResend =
    Boolean(otpSentTo) && (mode === "signup-verify" || mode === "forgot-code" || (mode === "login" && loginMethod === "otp"));

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-start px-4 py-8 sm:justify-center">
      <SchoolBackdrop />
      <p className="relative z-10 mb-4 rounded-full bg-white/85 px-5 py-2 text-center text-lg font-extrabold text-indigo-700 shadow-md sm:text-xl">
        🎒 AI Assistant for Kids
      </p>
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm rounded-2xl border-4 border-amber-300 bg-white/95 p-6 shadow-xl backdrop-blur"
      >
        <h1 className="mb-4 text-lg font-semibold text-slate-900">{TITLES[mode]}</h1>

        {mode === "login" && otpAvailable && (
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
            {(["password", "otp"] as LoginMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => {
                  setLoginMethod(method);
                  setError("");
                  setNotice("");
                  setOtpSentTo("");
                  setOtpCode("");
                }}
                className={`rounded-md px-3 py-2 transition ${
                  loginMethod === method ? "bg-white text-indigo-700 shadow" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {method === "password" ? "🔑 Password" : "📩 One-time code"}
              </button>
            ))}
          </div>
        )}

        {notice && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

        {mode === "login" && (
          <>
            {rememberedUsername && identifier === rememberedUsername && !notice && (
              <p className="mb-4 text-sm text-slate-500">Welcome back!</p>
            )}
            {googleClientId && (
              <>
                <GoogleSignInButton clientId={googleClientId} onCredential={handleGoogleCredential} />
                <div className="my-4 flex items-center gap-3 text-xs font-medium text-slate-400">
                  <div className="h-px flex-1 bg-slate-200" />
                  or
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              </>
            )}
            {identifierField("login-identifier")}
            {loginMethod === "password" ? (
              <>
                <label htmlFor="login-password" className={LABEL_CLASS}>
                  Password
                </label>
                <PasswordInput
                  id="login-password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Password"
                  autoComplete="current-password"
                  autoFocus={Boolean(identifier)}
                />
              </>
            ) : otpSentTo ? (
              codeField
            ) : (
              <p className="mb-4 text-xs text-slate-500">
                {otpConfig.sms
                  ? "Type your email to get the code by email, or your mobile number to get it by SMS."
                  : "We'll email a code to the address on your account."}
              </p>
            )}
            {rememberMeCheckbox}
          </>
        )}

        {mode === "signup" && (
          <>
            <p className="mb-4 text-sm text-slate-500">
              You'll log in with your email or mobile number. You only need to do this once.
            </p>
            <label htmlFor="signup-email" className={LABEL_CLASS}>
              Email address
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className={INPUT_CLASS}
            />
            <label htmlFor="signup-phone" className={LABEL_CLASS}>
              Mobile number
            </label>
            <input
              id="signup-phone"
              name="tel"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className={INPUT_CLASS}
            />
            {newPasswordFields}
            <label htmlFor="signup-question" className={LABEL_CLASS}>
              Security question
            </label>
            <select
              id="signup-question"
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              className={INPUT_CLASS}
            >
              {SECURITY_QUESTIONS.map((question) => (
                <option key={question} value={question}>
                  {question}
                </option>
              ))}
            </select>
            <label htmlFor="signup-answer" className={LABEL_CLASS}>
              Your answer
            </label>
            <input
              id="signup-answer"
              type="text"
              autoComplete="off"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder="Used to reset your password if you forget it"
              className={INPUT_CLASS}
            />
            {channels.length > 1 && (
              <fieldset className="mb-4">
                <legend className={LABEL_CLASS}>Send my verification code to</legend>
                <div className="grid grid-cols-2 gap-2">
                  {channels.map((channel) => (
                    <label
                      key={channel}
                      className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-semibold transition ${
                        verifyChannel === channel
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="verify-channel"
                        value={channel}
                        checked={verifyChannel === channel}
                        onChange={() => setVerifyChannel(channel)}
                        className="sr-only"
                      />
                      {CHANNEL_LABEL[channel]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {rememberMeCheckbox}
          </>
        )}

        {mode === "signup-verify" && codeField}

        {mode === "forgot" && (
          <>
            <p className="mb-4 text-sm text-slate-500">Enter the email address or mobile number you signed up with.</p>
            {identifierField("forgot-identifier")}
          </>
        )}

        {mode === "forgot-choose" && recovery && (
          <>
            <p className="mb-4 text-sm text-slate-500">How would you like to reset your password?</p>
            {recovery.securityQuestion && (
              <button type="button" onClick={() => switchMode("forgot-question")} className={OPTION_BUTTON_CLASS}>
                🔐 Answer my security question
              </button>
            )}
            {recovery.emailAvailable && (
              <button
                type="button"
                disabled={loading}
                onClick={() => run(() => startResetCode("email"), "Failed to send the code.")}
                className={OPTION_BUTTON_CLASS}
              >
                ✉️ Email a code to {recovery.maskedEmail}
              </button>
            )}
            {recovery.smsAvailable && (
              <button
                type="button"
                disabled={loading}
                onClick={() => run(() => startResetCode("sms"), "Failed to send the code.")}
                className={OPTION_BUTTON_CLASS}
              >
                📱 Text a code to {recovery.maskedPhone}
              </button>
            )}
          </>
        )}

        {mode === "forgot-question" && recovery && (
          <>
            <p className="mb-1 text-sm font-semibold text-slate-800">{recovery.securityQuestion}</p>
            <input
              id="forgot-answer"
              type="text"
              autoComplete="off"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder="Your answer"
              autoFocus
              className={INPUT_CLASS}
            />
            {newPasswordFields}
          </>
        )}

        {mode === "forgot-code" && (
          <>
            {codeField}
            {newPasswordFields}
          </>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {submitLabel[mode] && (
          <button
            type="submit"
            disabled={loading}
            className="mb-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Please wait..." : submitLabel[mode]}
          </button>
        )}

        <div className="flex flex-col gap-1 text-center text-sm text-indigo-600">
          {showResend && (
            <button type="button" disabled={loading} onClick={handleResend} className="hover:underline disabled:opacity-50">
              Didn't get it? Send the code again
            </button>
          )}
          {mode === "login" && (
            <>
              <button type="button" onClick={() => switchMode("forgot")} className="hover:underline">
                Forgot password?
              </button>
              <button type="button" onClick={() => switchMode("signup")} className="hover:underline">
                New here? Create an account
              </button>
            </>
          )}
          {mode === "signup-verify" && (
            <button
              type="button"
              onClick={() => {
                // Back to the filled-in form, keeping what was typed.
                setMode("signup");
                setError("");
                setNotice("");
                setOtpCode("");
                setOtpSentTo("");
              }}
              className="hover:underline"
            >
              ← Change my details
            </button>
          )}
          {mode === "forgot-code" && recovery?.securityQuestion && (
            <button type="button" onClick={() => switchMode("forgot-question")} className="hover:underline">
              Answer my security question instead
            </button>
          )}
          {mode !== "login" && (
            <button type="button" onClick={() => switchMode("login")} className="hover:underline">
              {mode === "signup" ? "Already have an account? Log in" : "Back to log in"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
