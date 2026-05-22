import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import DriverNav from "./DriverNav"
import DriverShell from "./DriverShell"
import UserMenu from "@/components/UserMenu"
import OfflineBanner from "@/components/OfflineBanner"
import InactivityGuard from "@/components/InactivityGuard"

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

function todayStartSGT(): string {
  const now = new Date()
  const sgt = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return new Date(`${sgt.toISOString().split("T")[0]}T00:00:00+08:00`).toISOString()
}

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/driver/login")

  const todayStart = todayStartSGT()

  // Fetch all tab data in parallel — keeps tab switching instant (no server round-trip)
  const [profileRes, todayRes, vehiclesRes, suppliersRes, projectsRes, supervisorsRes, historyRes] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("delivery_orders")
        .select("id, do_number, status, material_type, quantity, submitted_at, suppliers(name), vehicles(plate_number)")
        .eq("driver_id", user.id)
        .gte("submitted_at", todayStart)
        .order("submitted_at", { ascending: false }),
      supabase
        .from("driver_vehicle_assignments")
        .select("vehicles(id, plate_number)")
        .eq("driver_id", user.id),
      supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
      supabase.from("projects").select("id, code, name").eq("is_active", true).order("code"),
      supabase.from("profiles").select("id, full_name").eq("role", "supervisor").eq("is_active", true).order("full_name"),
      supabase
        .from("delivery_orders")
        .select(`
          id, do_number, status, material_type, quantity, submitted_at,
          suppliers(name), vehicles(plate_number),
          delivery_order_flags(reason, notes, created_at,
            flagged_by:profiles!delivery_order_flags_flagged_by_fkey(full_name))
        `)
        .eq("driver_id", user.id)
        .order("submitted_at", { ascending: false }),
    ])

  const firstName   = profileRes.data?.full_name?.split(" ")[0] ?? "Driver"
  const hour        = new Date().getUTCHours() + 8
  const greeting    = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const todayOrders = (todayRes.data ?? []) as Parameters<typeof DriverShell>[0]["todayOrders"]
  const vehicles    = (vehiclesRes.data ?? [])
    .map(a => a.vehicles)
    .filter((v): v is { id: string; plate_number: string } => !!v && !Array.isArray(v))
  const historyOrders = (historyRes.data ?? []) as Parameters<typeof DriverShell>[0]["historyOrders"]
  const stats = {
    total:    todayOrders.length,
    pending:  todayOrders.filter(o => o.status === "pending").length,
    verified: todayOrders.filter(o => o.status === "verified").length,
    flagged:  todayOrders.filter(o => o.status === "flagged").length,
  }

  return (
    <>
      <InactivityGuard timeoutMs={SEVEN_DAYS} loginHref="/driver/login" />
      <OfflineBanner />
      <div className="fixed top-4 right-4 z-50">
        <UserMenu name={firstName} profileHref="/driver/profile" signOutHref="/api/auth/sign-out?next=/driver/login" />
      </div>
      {/* h-svh = viewport height excluding browser chrome — creates the app shell */}
      <div className="flex flex-col overflow-x-hidden" style={{ height: "100svh", paddingBottom: "72px", backgroundColor: "#f5f7fa" }}>
        <DriverShell
          firstName={firstName} greeting={greeting} stats={stats}
          todayOrders={todayOrders} vehicles={vehicles}
          suppliers={suppliersRes.data ?? []} projects={projectsRes.data ?? []}
          supervisors={supervisorsRes.data ?? []} historyOrders={historyOrders}
        >
          {children}
        </DriverShell>
        <DriverNav />
      </div>
    </>
  )
}