import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  _req: Request,
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

  const { data: order, error } = await supabase
    .from("delivery_orders")
    .update({ status: "pending", verified_by: null, verified_at: null })
    .eq("id", id)
    .select("do_number")
    .single()

  if (error) {
    console.error("[reopen]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "reopen",
    entity_type: "delivery_order",
    entity_id: id,
    metadata: { do_number: order.do_number },
  })

  return NextResponse.json({ ok: true })
}
