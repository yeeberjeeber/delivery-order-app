"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
type Role = "driver" | "supervisor" | "finance" | "admin"
type Mode = "signin" | "signup" | "forgot"

const ROLE_HOME: Record<Role, string> = {
  driver:     "/driver/dashboard",
  supervisor: "/supervisor/dashboard",
  finance:    "/finance/dashboard",
  admin:      "/admin/dashboard",
}

export default function StaffLoginForm() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>("signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [signUpDone, setSignUpDone] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError("")
    setName("")
    setPassword("")
    setConfirmPassword("")
    setShowPassword(false)
    setShowConfirm(false)
    setSignUpDone(false)
    setResetSent(false)
    // Keep email so user doesn't have to retype it
  }

  async function handleSignIn() {
    if (!email || !password) { setError("Please enter your email and password."); return }
    setLoading(true)
    setError("")
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setLoading(false); setError(err.message); return }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single()
    const role = profile?.role as Role | undefined
    // Reset inactivity timer so InactivityGuard doesn't immediately sign out
    localStorage.setItem("lastActiveAt", Date.now().toString())
    router.push(role ? ROLE_HOME[role] : "/")
  }

  async function handleSignUp() {
    if (!name.trim()) { setError("Please enter your full name."); return }
    if (!email)       { setError("Please enter your email."); return }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return }
    if (password !== confirmPassword) { setError("Passwords do not match."); return }
    setLoading(true)
    setError("")
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name.trim(), role: "supervisor" },
      },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSignUpDone(true)
  }

  async function handleForgotPassword() {
    if (!email) { setError("Please enter your email address."); return }
    setLoading(true)
    setError("")
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setResetSent(true)
  }

  return (
    <div className="min-h-svh flex flex-col" style={{ backgroundColor: "#f5f7fa" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col items-center justify-center px-6 pt-14 pb-10"
        style={{ backgroundColor: "#1a3a5c" }}
      >
        <div
          className="mb-4 flex items-center justify-center size-14 rounded-2xl"
          style={{ backgroundColor: "#8B5E3C" }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <path d="M16 8h4l3 5v3h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">D.O. Tracker</h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Staff Portal</p>
      </div>

      {/* ── Card ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-4 pt-6 pb-10">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Mode tabs — only shown when not in forgot-password sub-flow */}
          {mode !== "forgot" && (
            <div className="flex border-b border-gray-100">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className="flex-1 py-3.5 text-sm font-semibold transition-colors relative"
                  style={{
                    color: mode === m ? "#1a3a5c" : "#9ca3af",
                    backgroundColor: "white",
                  }}
                >
                  {m === "signin" ? "Sign In" : "Sign Up"}
                  {mode === m && (
                    <span
                      className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                      style={{ backgroundColor: "#1a3a5c" }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="p-6">
            {mode === "signin" && (
              <SignInFields
                email={email}
                password={password}
                showPassword={showPassword}
                loading={loading}
                error={error}
                onEmailChange={(v) => { setError(""); setEmail(v) }}
                onPasswordChange={(v) => { setError(""); setPassword(v) }}
                onTogglePassword={() => setShowPassword((s) => !s)}
                onSubmit={handleSignIn}
                onForgot={() => switchMode("forgot")}
              />
            )}

            {mode === "signup" && (
              <SignUpFields
                name={name}
                email={email}
                password={password}
                confirmPassword={confirmPassword}
                showPassword={showPassword}
                showConfirm={showConfirm}
                loading={loading}
                error={error}
                done={signUpDone}
                onNameChange={(v) => { setError(""); setName(v) }}
                onEmailChange={(v) => { setError(""); setEmail(v) }}
                onPasswordChange={(v) => { setError(""); setPassword(v) }}
                onConfirmChange={(v) => { setError(""); setConfirmPassword(v) }}
                onTogglePassword={() => setShowPassword((s) => !s)}
                onToggleConfirm={() => setShowConfirm((s) => !s)}
                onSubmit={handleSignUp}
                onSignIn={() => switchMode("signin")}
              />
            )}

            {mode === "forgot" && (
              <ForgotFields
                email={email}
                loading={loading}
                error={error}
                sent={resetSent}
                onEmailChange={(v) => { setError(""); setEmail(v) }}
                onSubmit={handleForgotPassword}
                onBack={() => switchMode("signin")}
              />
            )}
          </div>
        </div>

        <p className="mt-5 text-xs text-gray-400">
          Driver?{" "}
          <a href="/driver/login" className="font-semibold underline underline-offset-2" style={{ color: "#1a3a5c" }}>
            Use mobile OTP login
          </a>
        </p>
      </div>
    </div>
  )
}

// ─── Sign in ──────────────────────────────────────────────────────────────────

function SignInFields({
  email, password, showPassword, loading, error,
  onEmailChange, onPasswordChange, onTogglePassword, onSubmit, onForgot,
}: {
  email: string; password: string; showPassword: boolean
  loading: boolean; error: string
  onEmailChange: (v: string) => void; onPasswordChange: (v: string) => void
  onTogglePassword: () => void; onSubmit: () => void; onForgot: () => void
}) {
  return (
    <>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome back</h2>
      <p className="text-sm text-gray-500 mb-6">Sign in with your work email.</p>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email</label>
        <input type="email" placeholder="you@company.com" value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          autoFocus autoComplete="email"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10"
        />
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
          <button onClick={onForgot} className="text-xs font-semibold underline underline-offset-2" style={{ color: "#1a3a5c" }}>
            Forgot password?
          </button>
        </div>
        <PasswordInput value={password} show={showPassword} placeholder="••••••••"
          autoComplete="current-password"
          onChange={onPasswordChange} onToggle={onTogglePassword}
          onEnter={onSubmit} />
      </div>

      {error && <ErrorBox message={error} />}

      <Button onClick={onSubmit} disabled={loading}
        className="w-full h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
        style={{ backgroundColor: "#1a3a5c" }}>
        {loading ? <><Spinner /> Signing in…</> : "Sign In"}
      </Button>
    </>
  )
}

// ─── Sign up ──────────────────────────────────────────────────────────────────

function SignUpFields({
  name, email, password, confirmPassword,
  showPassword, showConfirm, loading, error, done,
  onNameChange, onEmailChange, onPasswordChange, onConfirmChange,
  onTogglePassword, onToggleConfirm, onSubmit, onSignIn,
}: {
  name: string; email: string; password: string; confirmPassword: string
  showPassword: boolean; showConfirm: boolean; loading: boolean; error: string; done: boolean
  onNameChange: (v: string) => void; onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void; onConfirmChange: (v: string) => void
  onTogglePassword: () => void; onToggleConfirm: () => void
  onSubmit: () => void; onSignIn: () => void
}) {
  if (done) {
    return (
      <div className="py-2">
        <div className="flex items-start gap-3 rounded-xl px-4 py-4 border mb-5"
          style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}>
          <svg className="size-5 shrink-0 mt-px" viewBox="0 0 24 24" fill="none"
            stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-green-800">Check your inbox</p>
            <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
              A confirmation link was sent to <span className="font-medium">{email}</span>.
              Click it to activate your account.
            </p>
          </div>
        </div>
        <Button onClick={onSignIn} className="w-full h-12 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: "#1a3a5c" }}>
          Back to Sign In
        </Button>
      </div>
    )
  }

  return (
    <>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Create an account</h2>
      <p className="text-sm text-gray-500 mb-6">Register with your work email to get started.</p>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Full name</label>
        <input type="text" placeholder="Ahmad bin Razali" value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus autoComplete="name"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email</label>
        <input type="email" placeholder="you@company.com" value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          autoComplete="email"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password</label>
        <PasswordInput value={password} show={showPassword} placeholder="Min. 8 characters"
          autoComplete="new-password"
          onChange={onPasswordChange} onToggle={onTogglePassword} />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Confirm password</label>
        <PasswordInput value={confirmPassword} show={showConfirm} placeholder="Re-enter password"
          autoComplete="new-password"
          onChange={onConfirmChange} onToggle={onToggleConfirm}
          onEnter={onSubmit} />
      </div>

      {error && <ErrorBox message={error} />}

      <Button onClick={onSubmit} disabled={loading}
        className="w-full h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
        style={{ backgroundColor: "#1a3a5c" }}>
        {loading ? <><Spinner /> Creating account…</> : "Create Account"}
      </Button>

      <p className="mt-4 text-center text-xs text-gray-400">
        Your account will need admin approval before access is granted.
      </p>
    </>
  )
}

// ─── Forgot password ──────────────────────────────────────────────────────────

function ForgotFields({
  email, loading, error, sent,
  onEmailChange, onSubmit, onBack,
}: {
  email: string; loading: boolean; error: string; sent: boolean
  onEmailChange: (v: string) => void; onSubmit: () => void; onBack: () => void
}) {
  return (
    <>
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-semibold mb-5"
        style={{ color: "#1a3a5c" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back to sign in
      </button>

      <h2 className="text-lg font-semibold text-gray-900 mb-1">Reset your password</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter your work email and we&apos;ll send you a reset link.
      </p>

      {sent ? (
        <div className="flex items-start gap-3 rounded-xl px-4 py-4 border"
          style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}>
          <svg className="size-5 shrink-0 mt-px" viewBox="0 0 24 24" fill="none"
            stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-green-800">Check your inbox</p>
            <p className="text-xs text-green-700 mt-0.5">
              A reset link was sent to <span className="font-medium">{email}</span>
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email</label>
            <input type="email" placeholder="you@company.com" value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              autoFocus autoComplete="email"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10"
            />
          </div>
          {error && <ErrorBox message={error} />}
          <Button onClick={onSubmit} disabled={loading}
            className="w-full h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: "#1a3a5c" }}>
            {loading ? <><Spinner /> Sending…</> : "Send Reset Link"}
          </Button>
        </>
      )}
    </>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function PasswordInput({
  value, show, placeholder, autoComplete, onChange, onToggle, onEnter,
}: {
  value: string; show: boolean; placeholder: string; autoComplete?: string
  onChange: (v: string) => void; onToggle: () => void; onEnter?: () => void
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 pr-12 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10"
      />
      <button type="button" onClick={onToggle} tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
        {show ? <EyeOff /> : <EyeOn />}
      </button>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 mb-4 px-3.5 py-3 rounded-xl bg-red-50 border border-red-100">
      <svg className="size-4 shrink-0 mt-px" viewBox="0 0 24 24" fill="none"
        stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="text-sm text-red-700 leading-snug">{message}</p>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin mr-1.5" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

function EyeOn() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOff() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
