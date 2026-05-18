"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

type Mode = "signin" | "signup"
type Step = "details" | "otp"

const RESEND_COOLDOWN = 60

function sanitizePhone(raw: string) {
  let digits = raw.replace(/\D/g, "")
  // Strip +65 / 65 country code if autofilled by iOS
  if (digits.startsWith("65") && digits.length > 8) digits = digits.slice(2)
  return digits.slice(0, 8)
}

function formatDisplay(digits: string) {
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)} ${digits.slice(4)}`
}

export default function DriverLoginForm() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>("signin")
  const [step, setStep] = useState<Step>("details")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(0)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const fullPhone = `+65${phone}`

  function switchMode(next: Mode) {
    setMode(next)
    setStep("details")
    setError("")
    setName("")
    setPhone("")
    setOtp(["", "", "", "", "", ""])
    setCountdown(0)
  }

  async function sendOtp() {
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your full name.")
      return
    }
    if (phone.length !== 8) {
      setError("Please enter a valid 8-digit Singapore mobile number.")
      return
    }
    setLoading(true)
    setError("")
    const { error: err } = await supabase.auth.signInWithOtp({ phone: fullPhone })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep("otp")
    setCountdown(RESEND_COOLDOWN)
    setTimeout(() => otpRefs.current[0]?.focus(), 80)
  }

  async function verifyOtp() {
    const token = otp.join("")
    if (token.length !== 6) {
      setError("Please enter the complete 6-digit code.")
      return
    }
    setLoading(true)
    setError("")

    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token,
      type: "sms",
    })
    if (err) { setLoading(false); setError(err.message); return }

    // On sign-up, save the name they entered to their profile
    if (mode === "signup" && data.user) {
      await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("id", data.user.id)
    }

    router.push("/driver/dashboard")
  }

  function handleOtpChange(i: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1)
    const next = [...otp]
    next[i] = digit
    setOtp(next)
    setError("")
    if (digit && i < 5) otpRefs.current[i + 1]?.focus()
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const next = ["", "", "", "", "", ""]
    digits.split("").forEach((d, i) => { next[i] = d })
    setOtp(next)
    otpRefs.current[Math.min(digits.length, 5)]?.focus()
  }

  async function resendOtp() {
    if (countdown > 0) return
    setLoading(true)
    setError("")
    const { error: err } = await supabase.auth.signInWithOtp({ phone: fullPhone })
    setLoading(false)
    if (err) { setError(err.message); return }
    setCountdown(RESEND_COOLDOWN)
    setOtp(["", "", "", "", "", ""])
    setTimeout(() => otpRefs.current[0]?.focus(), 80)
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
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Driver Portal</p>
      </div>

      {/* ── Card ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-4 pt-6 pb-10">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Mode tabs */}
          <div className="flex border-b border-gray-100">
            {(["signin", "signup"] as Mode[]).map((m) => (
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

          <div className="p-6">
            {step === "details" ? (
              <DetailsStep
                mode={mode}
                name={name}
                phone={phone}
                loading={loading}
                error={error}
                onNameChange={(v) => { setError(""); setName(v) }}
                onPhoneChange={(v) => { setError(""); setPhone(v) }}
                onSubmit={sendOtp}
              />
            ) : (
              <OtpStep
                phone={phone}
                otp={otp}
                loading={loading}
                error={error}
                countdown={countdown}
                refs={otpRefs}
                onChange={handleOtpChange}
                onKeyDown={handleOtpKeyDown}
                onPaste={handleOtpPaste}
                onVerify={verifyOtp}
                onResend={resendOtp}
                onBack={() => { setStep("details"); setError(""); setOtp(["","","","","",""]); setCountdown(0) }}
              />
            )}
          </div>
        </div>

        <p className="mt-5 text-xs text-gray-400">
          Supervisor or office staff?{" "}
          <a href="/login" className="font-semibold underline underline-offset-2" style={{ color: "#1a3a5c" }}>
            Use email login
          </a>
        </p>
      </div>
    </div>
  )
}

// ─── Details step (name + phone) ──────────────────────────────────────────────

function DetailsStep({
  mode, name, phone, loading, error,
  onNameChange, onPhoneChange, onSubmit,
}: {
  mode: Mode
  name: string
  phone: string
  loading: boolean
  error: string
  onNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        {mode === "signin" ? "Enter your mobile number" : "Create your account"}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {mode === "signin"
          ? "We'll send a one-time code via SMS to verify your identity."
          : "Enter your details and we'll verify your mobile number."}
      </p>

      {/* Name — sign-up only */}
      {mode === "signup" && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Full name
          </label>
          <input
            type="text"
            placeholder="Ahmad bin Razali"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            autoFocus
            autoComplete="name"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10"
          />
        </div>
      )}

      {/* Phone */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Singapore mobile number
        </label>
        <div
          className="flex items-center overflow-hidden rounded-xl border bg-gray-50 transition-colors"
          style={{ borderColor: error && !name ? "#ef4444" : "#e5e7eb" }}
        >
          <span className="flex items-center gap-2 px-3.5 py-3.5 text-sm font-semibold text-gray-600 bg-gray-100 border-r border-gray-200 shrink-0 select-none">
            <SgFlag />
            +65
          </span>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="8123 4567"
            value={formatDisplay(phone)}
            onChange={(e) => onPhoneChange(sanitizePhone(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            autoFocus={mode === "signin"}
            autoComplete="tel-national"
            className="flex-1 bg-transparent px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
          />
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      <Button
        onClick={onSubmit}
        disabled={loading || phone.length < 8 || (mode === "signup" && !name.trim())}
        className="w-full h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
        style={{ backgroundColor: "#1a3a5c" }}
      >
        {loading ? <><Spinner /> Sending…</> : "Send OTP"}
      </Button>
    </>
  )
}

// ─── OTP step ─────────────────────────────────────────────────────────────────

function OtpStep({
  phone, otp, loading, error, countdown, refs,
  onChange, onKeyDown, onPaste, onVerify, onResend, onBack,
}: {
  phone: string
  otp: string[]
  loading: boolean
  error: string
  countdown: number
  refs: React.RefObject<(HTMLInputElement | null)[]>
  onChange: (i: number, v: string) => void
  onKeyDown: (i: number, e: React.KeyboardEvent<HTMLInputElement>) => void
  onPaste: (e: React.ClipboardEvent) => void
  onVerify: () => void
  onResend: () => void
  onBack: () => void
}) {
  const filled = otp.filter(Boolean).length

  return (
    <>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-semibold mb-5"
        style={{ color: "#1a3a5c" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Change number
      </button>

      <h2 className="text-lg font-semibold text-gray-900 mb-1">Enter verification code</h2>
      <p className="text-sm text-gray-500 mb-6">
        Sent to <span className="font-semibold text-gray-800">+65 {formatDisplay(phone)}</span>
      </p>

      <div className="flex gap-2 justify-between mb-2" onPaste={onPaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            autoComplete={i === 0 ? "one-time-code" : "off"}
            className="w-12 h-14 rounded-xl border-2 text-center text-xl font-bold text-gray-900 outline-none transition-all caret-transparent"
            style={{
              borderColor: error ? "#ef4444" : digit ? "#1a3a5c" : "#e5e7eb",
              backgroundColor: digit ? "#eef2f7" : "white",
            }}
          />
        ))}
      </div>

      <div className="flex justify-center gap-1.5 mb-5">
        {otp.map((d, i) => (
          <div key={i} className="size-1.5 rounded-full transition-all"
            style={{ backgroundColor: d ? "#1a3a5c" : "#e5e7eb" }} />
        ))}
      </div>

      {error && <ErrorBox message={error} />}

      <Button
        onClick={onVerify}
        disabled={loading || filled !== 6}
        className="w-full h-12 rounded-xl text-sm font-semibold text-white mb-4 disabled:opacity-40"
        style={{ backgroundColor: "#1a3a5c" }}
      >
        {loading ? <><Spinner /> Verifying…</> : "Verify & Log In"}
      </Button>

      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-sm text-gray-400">
            Resend in <span className="tabular-nums font-semibold text-gray-600">{countdown}s</span>
          </p>
        ) : (
          <button
            onClick={onResend}
            disabled={loading}
            className="text-sm font-semibold underline underline-offset-2 disabled:opacity-40"
            style={{ color: "#1a3a5c" }}
          >
            Resend code
          </button>
        )}
      </div>
    </>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────

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

function SgFlag() {
  return (
    <svg width="18" height="13" viewBox="0 0 18 13" fill="none">
      <rect width="18" height="6.5" rx="1.5" fill="#EE2536"/>
      <rect y="6.5" width="18" height="6.5" fill="white"/>
      <circle cx="5.2" cy="3.8" r="1.8" fill="white"/>
      <circle cx="6.6" cy="3.8" r="1.5" fill="#EE2536"/>
      <g fill="white">
        <circle cx="7.5" cy="2.4" r="0.55"/>
        <circle cx="8.4" cy="3.5" r="0.55"/>
        <circle cx="7.9" cy="4.8" r="0.55"/>
        <circle cx="6.7" cy="5.0" r="0.55"/>
        <circle cx="6.0" cy="4.1" r="0.55"/>
      </g>
    </svg>
  )
}
