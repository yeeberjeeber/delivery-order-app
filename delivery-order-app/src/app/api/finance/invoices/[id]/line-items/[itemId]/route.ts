import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Params = Promise<{ id: string; itemId: string }>

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["finance", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { do_number } = await request.json()
  if (!do_number) return NextResponse.json({ error: "do_number required" }, { status: 400 })

  const { data: item } = await supabase
    .from("invoice_line_items")
    .select("quantity")
    .eq("id", itemId)
    .single()

  const { data: dos } = await supabase
    .from("delivery_orders")
    .select("id, quantity")
    .eq("do_number", do_number)
    .limit(1)

  const doRecord = dos?.[0]
  if (!doRecord) {
    const { error } = await supabase
      .from("invoice_line_items")
      .update({ do_number, match_status: "unmatched", matched_do_id: null, discrepancy_notes: null })
      .eq("id", itemId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, match_status: "unmatched" })
  }

  const qtyDiff = item?.quantity != null && doRecord.quantity != null
    ? Math.abs(item.quantity - doRecord.quantity) / doRecord.quantity
    : 0

  const matchStatus = qtyDiff > 0.05 ? "discrepancy" : "matched"
  const notes = matchStatus === "discrepancy"
    ? `Quantity mismatch: invoice ${item?.quantity}, D.O. ${doRecord.quantity}`
    : null

  const { error } = await supabase
    .from("invoice_line_items")
    .update({
      do_number,
      match_status: matchStatus,
      matched_do_id: doRecord.id,
      discrepancy_notes: notes,
    })
    .eq("id", itemId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, match_status: matchStatus })
}