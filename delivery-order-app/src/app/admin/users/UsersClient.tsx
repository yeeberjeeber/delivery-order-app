"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type User = {
  id: string
  full_name: string | null
  email: string | null
  role: string
  is_active: boolean
  created_at: string
}

const ROLES = ["driver", "supervisor", "finance", "admin"]

const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
  driver:     { bg: "#dbeafe", text: "#1d4ed8" },
  supervisor: { bg: "#dcfce7", text: "#15803d" },
  finance:    { bg: "#fef9c3", text: "#a16207" },
  admin:      { bg: "#f3e8ff", text: "#7e22ce" },
}

export default function UsersClient({ users }: { users: User[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState("")

  const filtered = users.filter(u => {
    const matchRole   = filter === "all" || u.role === filter
    const matchSearch = !search || (u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
    return matchRole && matchSearch
  })

  async function updateUser(id: string, patch: { role?: string; is_active?: boolean }) {
    setLoading(id); setError("")
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    setLoading(null)
    if (!res.ok) { setError("Update failed. Please try again."); return }
    router.refresh()
  }

  return (
    <div className="px-4 mt-4 flex flex-col gap-4 pb-4">
      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400 bg-white"
      />

      {/* Role filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", ...ROLES].map(r => (
          <button key={r} onClick={() => setFilter(r)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize transition-colors"
            style={filter === r
              ? { backgroundColor: "#1a3a5c", color: "#fff", borderColor: "#1a3a5c" }
              : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
            {r === "all" ? "All Roles" : r}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100">{error}</div>
      )}

      <p className="text-xs text-gray-400">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>

      {/* User cards */}
      {filtered.map(u => {
        const roleStyle = ROLE_COLOR[u.role] ?? { bg: "#f3f4f6", text: "#6b7280" }
        return (
          <div key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
              <div className="size-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ backgroundColor: "#1a3a5c" }}>
                {u.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name ?? "—"}</p>
                <p className="text-xs text-gray-400 truncate">{u.email ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                  style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}>
                  {u.role}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={u.is_active
                    ? { backgroundColor: "#dcfce7", color: "#15803d" }
                    : { backgroundColor: "#f3f4f6", color: "#9ca3af" }}>
                  {u.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-4 py-3">
              {/* Role selector */}
              <select
                defaultValue={u.role}
                disabled={loading === u.id}
                onChange={e => updateUser(u.id, { role: e.target.value })}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white capitalize">
                {ROLES.map(r => (
                  <option key={r} value={r} className="capitalize">{r}</option>
                ))}
              </select>

              {/* Toggle active */}
              <button
                disabled={loading === u.id}
                onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50"
                style={u.is_active
                  ? { backgroundColor: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" }
                  : { backgroundColor: "#dcfce7", color: "#15803d", borderColor: "#bbf7d0" }}>
                {loading === u.id ? "…" : u.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">No users found</p>
      )}
    </div>
  )
}