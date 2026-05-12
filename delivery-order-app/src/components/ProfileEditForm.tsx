"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ProfileEditForm({
  profile,
  backHref,
}: {
  profile: { full_name: string; email: string | null; phone: string | null; role: string }
  backHref: string
}) {
  const router = useRouter()
  const [fullName, setFullName] = useState(profile.full_name)
  const [phone, setPhone]       = useState(profile.phone ?? "")
  const [newPassword, setNewPassword]     = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState("")
  const [error, setError]       = useState("")

  async function handleSave() {
    if (!fullName.trim()) { setError("Name is required."); return }
    if (newPassword && newPassword !== confirmPassword) { setError("Passwords do not match."); return }
    if (newPassword && newPassword.length < 6) { setError("Password must be at least 6 characters."); return }

    setSaving(true); setError(""); setSuccess("")

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        ...(newPassword ? { password: newPassword } : {}),
      }),
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Save failed. Please try again.")
      return
    }

    setSuccess("Profile updated successfully.")
    setNewPassword("")
    setConfirmPassword("")
    router.refresh()
  }

  const ROLE_LABEL: Record<string, string> = {
    driver: "Driver", supervisor: "Supervisor", finance: "Finance", admin: "Admin",
  }

  return (
    <div className="px-4 mt-5 flex flex-col gap-4 pb-8">

      {/* Avatar */}
      <div className="flex flex-col items-center py-6">
        <div className="size-20 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-3"
          style={{ backgroundColor: "#1a3a5c" }}>
          {profile.full_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <p className="text-xs font-semibold px-3 py-1 rounded-full capitalize"
          style={{ backgroundColor: "#dbeafe", color: "#1d4ed8" }}>
          {ROLE_LABEL[profile.role] ?? profile.role}
        </p>
      </div>

      {/* Feedback */}
      {success && (
        <div className="rounded-xl px-4 py-3 text-sm text-green-700 bg-green-50 border border-green-100">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100">
          {error}
        </div>
      )}

      {/* Profile details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex flex-col gap-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Profile</p>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            value={fullName}
            onChange={e => { setFullName(e.target.value); setError(""); setSuccess("") }}
            placeholder="Your full name"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10 transition-all"
          />
        </div>

        {profile.role !== "driver" && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
            <input
              value={profile.email ?? ""}
              disabled
              className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-400 cursor-not-allowed"
            />
            <p className="text-[11px] text-gray-400 mt-1">Email cannot be changed here</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone</label>
          <input
            value={phone}
            onChange={e => { setPhone(e.target.value); setError(""); setSuccess("") }}
            placeholder="+65 9123 4567"
            type="tel"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10 transition-all"
          />
        </div>
      </div>

      {/* Password change — not shown for drivers (OTP auth) */}
      {profile.role !== "driver" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Change Password</p>
          <button
            onClick={() => { setShowPassword(o => !o); setNewPassword(""); setConfirmPassword("") }}
            className="text-xs font-semibold"
            style={{ color: "#1a3a5c" }}
          >
            {showPassword ? "Cancel" : "Change"}
          </button>
        </div>

        {showPassword && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError("") }}
                placeholder="Min. 6 characters"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError("") }}
                placeholder="Repeat new password"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10 transition-all"
              />
            </div>
          </>
        )}
      </div>}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-13 rounded-2xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
        style={{ backgroundColor: "#1a3a5c" }}
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  )
}
