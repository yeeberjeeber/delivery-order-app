import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Row = Record<string, string>

async function getAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  return profile?.role === "admin" ? user : null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const user = await getAdmin(supabase)
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { table, rows } = await request.json() as { table: string; rows: Row[] }

  if (!["suppliers", "vehicles", "projects"].includes(table))
    return NextResponse.json({ error: "Invalid table" }, { status: 400 })
  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: "No rows provided" }, { status: 400 })
  if (rows.length > 1000)
    return NextResponse.json({ error: "Maximum 1000 rows per import" }, { status: 400 })

  const errors: string[] = []
  let inserted = 0
  let skipped  = 0

  if (table === "suppliers") {
    const valid = rows.filter((r, i) => {
      if (!r.name?.trim()) { errors.push(`Row ${i + 2}: "name" is required`); return false }
      return true
    })
    const { data: existing } = await supabase.from("suppliers").select("name")
    const existingNames = new Set((existing ?? []).map(s => s.name.toLowerCase()))
    const toInsert = valid.filter(r => {
      if (existingNames.has(r.name.trim().toLowerCase())) { skipped++; return false }
      return true
    }).map(r => ({
      name: r.name.trim(),
      contact_name:  r.contact_name?.trim()  || null,
      contact_phone: r.contact_phone?.trim() || null,
      is_active: true,
    }))
    if (toInsert.length > 0) {
      const { error } = await supabase.from("suppliers").insert(toInsert)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      inserted = toInsert.length
    }
  }

  if (table === "vehicles") {
    const valid = rows.filter((r, i) => {
      if (!r.plate_number?.trim()) { errors.push(`Row ${i + 2}: "plate_number" is required`); return false }
      return true
    })
    const { data: existing } = await supabase.from("vehicles").select("plate_number")
    const existingPlates = new Set((existing ?? []).map(v => v.plate_number.toLowerCase()))
    const toInsert = valid.filter(r => {
      if (existingPlates.has(r.plate_number.trim().toLowerCase())) { skipped++; return false }
      return true
    }).map(r => ({
      plate_number: r.plate_number.trim().toUpperCase(),
      vehicle_type: r.vehicle_type?.trim() || null,
      is_active: true,
    }))
    if (toInsert.length > 0) {
      const { error } = await supabase.from("vehicles").insert(toInsert)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      inserted = toInsert.length
    }
  }

  if (table === "projects") {
    const valid = rows.filter((r, i) => {
      if (!r.name?.trim()) { errors.push(`Row ${i + 2}: "name" is required`); return false }
      return true
    })
    const { data: existing } = await supabase.from("projects").select("name")
    const existingNames = new Set((existing ?? []).map(p => p.name.toLowerCase()))
    const toInsert = valid.filter(r => {
      if (existingNames.has(r.name.trim().toLowerCase())) { skipped++; return false }
      return true
    }).map(r => ({
      name: r.name.trim(),
      code:      r.code?.trim()      || "",
      is_active: true,
    }))
    if (toInsert.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("projects").insert(toInsert as any)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      inserted = toInsert.length
    }
  }

  return NextResponse.json({ inserted, skipped, errors })
}