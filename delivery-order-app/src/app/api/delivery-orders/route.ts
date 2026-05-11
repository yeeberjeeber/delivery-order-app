import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()

  const {
    do_number, vehicle_id, supplier_id, material_type, quantity,
    project_id, supervisor_id, location, remarks,
    photo_url, photo_public_id, gps_lat, gps_lng,
    is_duplicate_override, duplicate_override_reason,
  } = body

  // Basic validation
  if (!do_number || !vehicle_id || !supplier_id || !material_type || !quantity) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const { data: order, error } = await supabase
    .from("delivery_orders")
    .insert({
      do_number,
      driver_id: user.id,
      vehicle_id,
      supplier_id,
      material_type,
      quantity: Number(quantity),
      project_id: project_id ?? null,
      supervisor_id: supervisor_id ?? null,
      location: location ?? null,
      remarks: remarks ?? null,
      photo_url: photo_url ?? null,
      photo_public_id: photo_public_id ?? null,
      gps_lat: gps_lat ?? null,
      gps_lng: gps_lng ?? null,
      status: "pending",
      is_duplicate_override: is_duplicate_override ?? false,
      duplicate_override_reason: duplicate_override_reason ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error("[delivery-orders POST]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit log
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "upload",
    entity_type: "delivery_order",
    entity_id: order.id,
    metadata: { do_number, vehicle_id, supplier_id },
  })

  return NextResponse.json(order, { status: 201 })
}
