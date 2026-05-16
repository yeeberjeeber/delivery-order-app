import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["supervisor", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { reason, notes } = await req.json()
  if (!reason) return NextResponse.json({ error: "reason required" }, { status: 400 })

  const { data: order, error: updateError } = await supabase
    .from("delivery_orders")
    .update({ status: "flagged", flagged_at: new Date().toISOString() } as any)
    .eq("id", id)
    .select("do_number")
    .single()

  if (updateError) {
    console.error("[flag]", updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await supabase.from("delivery_order_flags").insert({
    delivery_order_id: id,
    flagged_by: user.id,
    reason,
    notes: notes ?? null,
  })

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "flag",
    entity_type: "delivery_order",
    entity_id: id,
    metadata: { do_number: order.do_number, reason },
  })

  return NextResponse.json({ ok: true })
}
