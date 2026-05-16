import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import HistoryClient from "./HistoryClient"

export default async function DriverHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/driver/login")

  const { data: orders } = await supabase
    .from("delivery_orders")
    .select(`
      id, do_number, status, material_type, quantity, submitted_at,
      suppliers(name), vehicles(plate_number),
      delivery_order_flags(reason, notes, created_at, flagged_by:profiles!delivery_order_flags_flagged_by_fkey(full_name))
    `)
    .eq("driver_id", user.id)
    .order("submitted_at", { ascending: false })

  return <HistoryClient orders={orders ?? []} />
}