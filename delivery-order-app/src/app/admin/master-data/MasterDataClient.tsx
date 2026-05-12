"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Supplier = { id: string; name: string; contact_name: string | null; contact_phone: string | null; is_active: boolean }
type Vehicle  = { id: string; plate_number: string; vehicle_type: string | null; is_active: boolean }
type Project  = { id: string; name: string; code: string | null; is_active: boolean }

type Tab = "suppliers" | "vehicles" | "projects"

export default function MasterDataClient({
  suppliers, vehicles, projects,
}: {
  suppliers: Supplier[]
  vehicles: Vehicle[]
  projects: Project[]
}) {
  const router  = useRouter()
  const [tab, setTab] = useState<Tab>("suppliers")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState<string | null>(null)

  // Form state for adding new records
  const [newSupplier, setNewSupplier] = useState({ name: "", contact_name: "", contact_phone: "" })
  const [newVehicle,  setNewVehicle]  = useState({ plate_number: "", vehicle_type: "" })
  const [newProject,  setNewProject]  = useState({ name: "", code: "" })

  async function post(table: string, body: object) {
    setLoading("new"); setError("")
    const res = await fetch(`/api/admin/master-data/${table}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setLoading(null)
    if (!res.ok) { setError("Save failed. Please try again."); return false }
    router.refresh()
    return true
  }

  async function toggle(table: string, id: string, is_active: boolean) {
    setLoading(id); setError("")
    const res = await fetch(`/api/admin/master-data/${table}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active }),
    })
    setLoading(null)
    if (!res.ok) { setError("Update failed."); return }
    router.refresh()
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "suppliers", label: "Suppliers" },
    { key: "vehicles",  label: "Vehicles"  },
    { key: "projects",  label: "Projects"  },
  ]

  return (
    <div className="px-4 mt-4 flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setError("") }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
            style={tab === t.key
              ? { backgroundColor: "#1a3a5c", color: "#fff", borderColor: "#1a3a5c" }
              : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100">{error}</div>
      )}

      {/* Suppliers */}
      {tab === "suppliers" && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Add Supplier</p>
            <input value={newSupplier.name} onChange={e => setNewSupplier(p => ({ ...p, name: e.target.value }))}
              placeholder="Supplier name *" className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <input value={newSupplier.contact_name} onChange={e => setNewSupplier(p => ({ ...p, contact_name: e.target.value }))}
              placeholder="Contact name" className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <input value={newSupplier.contact_phone} onChange={e => setNewSupplier(p => ({ ...p, contact_phone: e.target.value }))}
              placeholder="Contact phone" className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <button disabled={!newSupplier.name || loading === "new"}
              onClick={async () => {
                const ok = await post("suppliers", { name: newSupplier.name, contact_name: newSupplier.contact_name || null, contact_phone: newSupplier.contact_phone || null })
                if (ok) setNewSupplier({ name: "", contact_name: "", contact_phone: "" })
              }}
              className="h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: "#1a3a5c" }}>
              {loading === "new" ? "Saving…" : "Add Supplier"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {suppliers.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                  {s.contact_name && <p className="text-xs text-gray-400 truncate">{s.contact_name} · {s.contact_phone ?? "—"}</p>}
                </div>
                <button disabled={loading === s.id}
                  onClick={() => toggle("suppliers", s.id, !s.is_active)}
                  className="shrink-0 ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-50"
                  style={s.is_active
                    ? { backgroundColor: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" }
                    : { backgroundColor: "#dcfce7", color: "#15803d", borderColor: "#bbf7d0" }}>
                  {loading === s.id ? "…" : s.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
            {suppliers.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No suppliers yet</p>}
          </div>
        </>
      )}

      {/* Vehicles */}
      {tab === "vehicles" && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Add Vehicle</p>
            <input value={newVehicle.plate_number} onChange={e => setNewVehicle(p => ({ ...p, plate_number: e.target.value }))}
              placeholder="Plate number *" className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <input value={newVehicle.vehicle_type} onChange={e => setNewVehicle(p => ({ ...p, vehicle_type: e.target.value }))}
              placeholder="Vehicle type (e.g. lorry, dump truck)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <button disabled={!newVehicle.plate_number || loading === "new"}
              onClick={async () => {
                const ok = await post("vehicles", { plate_number: newVehicle.plate_number, vehicle_type: newVehicle.vehicle_type || null })
                if (ok) setNewVehicle({ plate_number: "", vehicle_type: "" })
              }}
              className="h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: "#1a3a5c" }}>
              {loading === "new" ? "Saving…" : "Add Vehicle"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {vehicles.map(v => (
              <div key={v.id} className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{v.plate_number}</p>
                  {v.vehicle_type && <p className="text-xs text-gray-400 capitalize">{v.vehicle_type}</p>}
                </div>
                <button disabled={loading === v.id}
                  onClick={() => toggle("vehicles", v.id, !v.is_active)}
                  className="shrink-0 ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-50"
                  style={v.is_active
                    ? { backgroundColor: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" }
                    : { backgroundColor: "#dcfce7", color: "#15803d", borderColor: "#bbf7d0" }}>
                  {loading === v.id ? "…" : v.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
            {vehicles.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No vehicles yet</p>}
          </div>
        </>
      )}

      {/* Projects */}
      {tab === "projects" && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Add Project</p>
            <input value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
              placeholder="Project name *" className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <input value={newProject.code} onChange={e => setNewProject(p => ({ ...p, code: e.target.value }))}
              placeholder="Project code (e.g. PRJ-001)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <button disabled={!newProject.name || loading === "new"}
              onClick={async () => {
                const ok = await post("projects", { name: newProject.name, code: newProject.code || null })
                if (ok) setNewProject({ name: "", code: "" })
              }}
              className="h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: "#1a3a5c" }}>
              {loading === "new" ? "Saving…" : "Add Project"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {projects.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  {p.code && <p className="text-xs text-gray-400">{p.code}</p>}
                </div>
                <button disabled={loading === p.id}
                  onClick={() => toggle("projects", p.id, !p.is_active)}
                  className="shrink-0 ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-50"
                  style={p.is_active
                    ? { backgroundColor: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" }
                    : { backgroundColor: "#dcfce7", color: "#15803d", borderColor: "#bbf7d0" }}>
                  {loading === p.id ? "…" : p.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
            {projects.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No projects yet</p>}
          </div>
        </>
      )}
    </div>
  )
}