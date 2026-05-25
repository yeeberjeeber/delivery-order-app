import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import OrderActions from "./OrderActions"

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: "#fef9c3", text: "#a16207", label: "Pending" },
  verified: { bg: "#dcfce7", text: "#15803d", label: "Verified" },
  flagged:  { bg: "#fee2e2", text: "#b91c1c", label: "Flagged" },
}

const FLAG_REASON_LABELS: Record<string, string> = {
  quantity_mismatch: "Quantity mismatch",
  photo_unclear:     "Photo unclear or unreadable",
  wrong_do_number:   "Wrong D.O. number",
  missing_info:      "Missing required information",
  suspicious_entry:  "Suspicious entry",
  other:             "Other",
}

type PageProps = { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: order } = await supabase
    .from("delivery_orders")
    .select(`
      id, do_number, status, material_type, quantity, amount, unit_price,
      submitted_at, verified_at, photo_url, location, remarks,
      gps_lat, gps_lng, is_duplicate_override, duplicate_override_reason,
      driver:profiles!delivery_orders_driver_id_fkey(id, full_name),
      supplier:suppliers(id, name),
      vehicle:vehicles(id, plate_number),
      project:projects(id, code, name),
      verified_by_profile:profiles!delivery_orders_verified_by_fkey(full_name),
      delivery_order_flags(id, reason, notes, created_at, flagged_by)
    `)
    .eq("id", id)
    .eq("supervisor_id", user.id)
    .single()

  if (!order) notFound()

  const driver    = Array.isArray(order.driver)    ? order.driver[0]    : order.driver
  const supplier  = Array.isArray(order.supplier)  ? order.supplier[0]  : order.supplier
  const vehicle   = Array.isArray(order.vehicle)   ? order.vehicle[0]   : order.vehicle
  const project   = Array.isArray(order.project)   ? order.project[0]   : order.project
  const verifier  = Array.isArray(order.verified_by_profile) ? order.verified_by_profile[0] : order.verified_by_profile
  const flags     = (order.delivery_order_flags ?? []) as Array<{
    id: string; reason: string; notes: string | null; created_at: string; flagged_by: string
  }>
  const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending

  const submittedAt = new Date(order.submitted_at).toLocaleString("en-SG", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore",
  })
  const verifiedAt = order.verified_at
    ? new Date(order.verified_at).toLocaleString("en-SG", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore",
      })
    : null

  return (
    <div className="flex flex-col pb-4">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-5 pt-14 pb-5" style={{ backgroundColor: "#1a3a5c" }}>
        <div className="flex items-center gap-3">
          <Link href="/supervisor/dashboard"
            className="size-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
            <svg className="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">D.O. #{order.do_number}</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{submittedAt}</p>
          </div>
          <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: s.bg, color: s.text }}>
            {s.label}
          </span>
        </div>
      </div>

      {/* ── Photo ──────────────────────────────────────────────────────── */}
      {order.photo_url && (
        <a href={order.photo_url} target="_blank" rel="noopener noreferrer"
          className="block mx-4 mt-4 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={order.photo_url}
            alt={`D.O. photo for ${order.do_number}`}
            className="w-full object-contain max-h-64"
          />
          <div className="flex items-center justify-center gap-1.5 py-2.5 border-t border-gray-100">
            <svg className="size-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            <span className="text-xs text-gray-400">Tap to view full size</span>
          </div>
        </a>
      )}

      {!order.photo_url && (
        <div className="mx-4 mt-4 rounded-2xl border border-dashed border-gray-200 py-10
          flex flex-col items-center justify-center text-gray-300">
          <svg className="size-10 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <p className="text-sm text-gray-400">No photo uploaded</p>
        </div>
      )}

      {/* ── Flag alert ─────────────────────────────────────────────────── */}
      {order.status === "flagged" && flags.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="size-4 shrink-0" style={{ color: "#dc2626" }} viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p className="text-sm font-semibold" style={{ color: "#dc2626" }}>Flagged</p>
          </div>
          {flags.map((flag) => (
            <div key={flag.id}>
              <p className="text-sm text-red-700 font-medium">
                {FLAG_REASON_LABELS[flag.reason] ?? flag.reason}
              </p>
              {flag.notes && (
                <p className="text-xs text-red-600 mt-1">{flag.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Details card ───────────────────────────────────────────────── */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</p>
        </div>

        <div className="divide-y divide-gray-50">
          <Row label="D.O. Number"    value={order.do_number} />
          <Row label="Driver"         value={driver?.full_name ?? "—"} />
          <Row label="Vehicle"        value={vehicle?.plate_number ?? "—"} />
          <Row label="Supplier"       value={supplier?.name ?? "—"} />
          <Row label="Material"       value={order.material_type} />
          <Row label="Quantity"       value={String(order.quantity)} />
          {order.unit_price != null && (
            <Row label="Unit Price"   value={`S$${order.unit_price.toFixed(2)}`} />
          )}
          {order.amount != null && (
            <Row label="Amount"       value={`S$${order.amount.toFixed(2)}`} highlight />
          )}
          {project && (
            <Row label="Project"      value={`[${project.code}] ${project.name}`} />
          )}
          {order.location && (
            <Row label="Location"     value={order.location} />
          )}
          {order.remarks && (
            <Row label="Remarks"      value={order.remarks} />
          )}
          <Row label="Submitted"      value={submittedAt} />
          {verifiedAt && (
            <Row label="Verified"     value={`${verifiedAt}${verifier ? ` by ${verifier.full_name}` : ""}`} />
          )}
          {order.gps_lat != null && order.gps_lng != null && (
            <Row
              label="GPS"
              value={`${order.gps_lat.toFixed(5)}, ${order.gps_lng.toFixed(5)}`}
              link={`https://maps.google.com/?q=${order.gps_lat},${order.gps_lng}`}
            />
          )}
        </div>
      </div>

      {/* ── Duplicate override notice ──────────────────────────────────── */}
      {order.is_duplicate_override && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Duplicate Override</p>
          <p className="text-sm text-amber-700">{order.duplicate_override_reason ?? "No reason provided"}</p>
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="mt-4">
        <OrderActions orderId={order.id} status={order.status} />
      </div>
    </div>
  )
}

function Row({
  label, value, highlight, link
}: {
  label: string; value: string; highlight?: boolean; link?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-xs text-gray-400 shrink-0 pt-0.5 w-24">{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer"
          className="text-sm text-right flex-1 font-medium text-blue-600 underline underline-offset-2">
          {value}
        </a>
      ) : (
        <span className={`text-sm text-right flex-1 ${highlight ? "font-bold text-gray-900" : "text-gray-700"}`}>
          {value}
        </span>
      )}
    </div>
  )
}
