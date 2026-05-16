import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: "#fef9c3", text: "#a16207",  label: "Pending" },
  verified: { bg: "#dcfce7", text: "#15803d",  label: "Verified" },
  flagged:  { bg: "#fee2e2", text: "#b91c1c",  label: "Flagged" },
}

export default async function DriverOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/driver/login")

  const [orderRes, flagsRes] = await Promise.all([
    supabase
      .from("delivery_orders")
      .select(`
        id, do_number, status, material_type, quantity, submitted_at,
        verified_at, location, remarks, photo_url, gps_lat, gps_lng,
        supplier:suppliers(name),
        vehicle:vehicles(plate_number, vehicle_type),
        project:projects(name, code),
        supervisor:profiles!delivery_orders_supervisor_id_fkey(full_name),
        verifier:profiles!delivery_orders_verified_by_fkey(full_name)
      `)
      .eq("id", id)
      .eq("driver_id", user.id)
      .single(),
    supabase
      .from("delivery_order_flags")
      .select("reason, notes, created_at, flagged_by:profiles!delivery_order_flags_flagged_by_fkey(full_name)")
      .eq("delivery_order_id", id)
      .order("created_at", { ascending: false }),
  ])

  if (!orderRes.data) notFound()
  const order = orderRes.data
  const flags = flagsRes.data ?? []

  const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending
  const supplier   = Array.isArray(order.supplier)   ? order.supplier[0]   : order.supplier
  const vehicle    = Array.isArray(order.vehicle)     ? order.vehicle[0]    : order.vehicle
  const project    = Array.isArray(order.project)     ? order.project[0]    : order.project
  const supervisor = Array.isArray(order.supervisor)  ? order.supervisor[0] : order.supervisor
  const verifier   = Array.isArray(order.verifier)    ? order.verifier[0]   : order.verifier

  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-SG", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Asia/Singapore",
    })

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <div className="px-5 pt-14 pb-5 flex items-center gap-3" style={{ backgroundColor: "#1a3a5c" }}>
        <Link href="/driver/history"
          className="size-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
          <svg className="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white truncate">D.O. #{order.do_number}</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            {fmtDateTime(order.submitted_at)}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ backgroundColor: s.bg, color: s.text }}>
          {s.label}
        </span>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">

        {/* Flagged reason — prominent if flagged */}
        {order.status === "flagged" && flags.length > 0 && (
          <div className="rounded-2xl border px-4 py-4 flex flex-col gap-3"
            style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
            <div className="flex items-center gap-2">
              <svg className="size-4 shrink-0" style={{ color: "#dc2626" }} viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p className="text-sm font-bold" style={{ color: "#991b1b" }}>This order was flagged</p>
            </div>
            {flags.map((flag, i) => {
              const by = Array.isArray(flag.flagged_by) ? flag.flagged_by[0] : flag.flagged_by
              return (
                <div key={i} className="flex flex-col gap-1">
                  <p className="text-sm font-semibold" style={{ color: "#b91c1c" }}>{flag.reason}</p>
                  {flag.notes && (
                    <p className="text-xs" style={{ color: "#dc2626" }}>{flag.notes}</p>
                  )}
                  <p className="text-[11px]" style={{ color: "#ef4444" }}>
                    by {by?.full_name ?? "Supervisor"} · {fmtDateTime(flag.created_at)}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* Photo */}
        {order.photo_url && (
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-100"
            style={{ aspectRatio: "4/3" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={order.photo_url} alt="D.O. photo" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Delivery details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Delivery Details</p>
          <Row label="Supplier"      value={supplier?.name} />
          <Row label="Material"      value={order.material_type} />
          <Row label="Quantity"      value={String(order.quantity)} />
          <Row label="Vehicle"       value={vehicle?.plate_number} />
          <Row label="Project"       value={project ? `${project.code} — ${project.name}` : null} />
          <Row label="Supervisor"    value={supervisor?.full_name} />
          <Row label="Location"      value={order.location} />
          <Row label="Remarks"       value={order.remarks} />
        </div>

        {/* Verification */}
        {order.status === "verified" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Verification</p>
            <Row label="Verified by"  value={verifier?.full_name} />
            <Row label="Verified at"  value={order.verified_at ? fmtDateTime(order.verified_at) : null} />
          </div>
        )}

        {/* GPS */}
        {(order.gps_lat != null && order.gps_lng != null) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">GPS Location</p>
            <Row label="Coordinates" value={`${order.gps_lat.toFixed(5)}, ${order.gps_lng.toFixed(5)}`} />
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-400 shrink-0 pt-px">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
    </div>
  )
}