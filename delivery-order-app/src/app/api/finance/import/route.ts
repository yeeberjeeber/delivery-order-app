import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type RawRow = Record<string, string>

function parseSGTDate(val: string): string | null {
  if (!val?.trim()) return null
  // Accept YYYY-MM-DD or YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS
  const clean = val.trim()
  const d = new Date(`${clean.length === 10 ? clean + "T00:00:00" : clean}+08:00`)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

async function getFinance(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  return profile?.role === "finance" || profile?.role === "admin" ? user : null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const user = await getFinance(supabase)
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { rows } = await request.json() as { rows: RawRow[] }
  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: "No rows provided" }, { status: 400 })
  if (rows.length > 1000)
    return NextResponse.json({ error: "Maximum 1000 rows per import" }, { status: 400 })

  // Load lookup tables once
  const [suppliersRes, driversRes, vehiclesRes, existingDOsRes] = await Promise.all([
    supabase.from("suppliers").select("id, name"),
    supabase.from("profiles").select("id, full_name").eq("role", "driver"),
    supabase.from("vehicles").select("id, plate_number"),
    supabase.from("delivery_orders").select("do_number"),
  ])

  const supplierMap = new Map(
    (suppliersRes.data ?? []).map(s => [s.name.toLowerCase().trim(), s.id])
  )
  const driverMap = new Map(
    (driversRes.data ?? []).map(d => [d.full_name.toLowerCase().trim(), d.id])
  )
  const vehicleMap = new Map(
    (vehiclesRes.data ?? []).map(v => [v.plate_number.toLowerCase().trim(), v.id])
  )
  const existingDOs = new Set(
    (existingDOsRes.data ?? []).map(d => d.do_number.toLowerCase().trim())
  )

  const rowErrors: Array<{ row: number; reason: string }> = []
  const toInsert: object[] = []

  rows.forEach((r, i) => {
    const rowNum = i + 2

    // Required fields
    if (!r.do_number?.trim()) {
      rowErrors.push({ row: rowNum, reason: '"do_number" is required' }); return
    }
    if (!r.supplier_name?.trim()) {
      rowErrors.push({ row: rowNum, reason: '"supplier_name" is required' }); return
    }
    if (!r.material_type?.trim()) {
      rowErrors.push({ row: rowNum, reason: '"material_type" is required' }); return
    }
    if (!r.quantity?.trim() || isNaN(Number(r.quantity))) {
      rowErrors.push({ row: rowNum, reason: '"quantity" must be a number' }); return
    }

    // Duplicate check
    if (existingDOs.has(r.do_number.trim().toLowerCase())) {
      rowErrors.push({ row: rowNum, reason: `D.O. "${r.do_number.trim()}" already exists — skipped` }); return
    }

    // FK resolution
    const supplierId = supplierMap.get(r.supplier_name.trim().toLowerCase())
    if (!supplierId) {
      rowErrors.push({ row: rowNum, reason: `Supplier "${r.supplier_name.trim()}" not found` }); return
    }

    const driverId  = r.driver_name?.trim()
      ? driverMap.get(r.driver_name.trim().toLowerCase()) ?? null
      : null

    const vehicleId = r.vehicle_plate?.trim()
      ? vehicleMap.get(r.vehicle_plate.trim().toLowerCase()) ?? null
      : null

    const submittedAt = parseSGTDate(r.submitted_at) ?? new Date().toISOString()
    const verifiedAt  = parseSGTDate(r.verified_at)  ?? submittedAt

    const allowedStatuses = ["pending", "verified", "flagged"]
    const status = allowedStatuses.includes(r.status?.trim().toLowerCase())
      ? r.status.trim().toLowerCase()
      : "verified"

    toInsert.push({
      do_number:     r.do_number.trim(),
      supplier_id:   supplierId,
      driver_id:     driverId,
      vehicle_id:    vehicleId,
      material_type: r.material_type.trim(),
      quantity:      Number(r.quantity),
      unit_price:    r.unit_price?.trim() ? Number(r.unit_price) : null,
      amount:        r.amount?.trim()     ? Number(r.amount)     : null,
      remarks:       r.remarks?.trim()    || null,
      submitted_at:  submittedAt,
      verified_at:   verifiedAt,
      status,
    })
  })

  if (toInsert.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("delivery_orders").insert(toInsert as any)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    inserted:  toInsert.length,
    skipped:   rows.length - toInsert.length,
    rowErrors,
  })
}