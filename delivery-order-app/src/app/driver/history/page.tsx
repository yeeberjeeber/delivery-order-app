import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import HistoryClient from "./HistoryClient"

export default async function DriverHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/driver/login")

  const { data: orders } = await supabase
    .from("delivery_orders")
    .select("id, do_number, status, material_type, quantity, submitted_at, suppliers(name), vehicles(plate_number)")
    .eq("driver_id", user.id)
    .order("submitted_at", { ascending: false })

  return <HistoryClient orders={orders ?? []} />
}