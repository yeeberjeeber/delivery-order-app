import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GEMINI_MODEL    = "gemini-2.5-flash"
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const PROMPT = `You are analysing a supplier invoice from a Singapore construction company.
Extract all data and return ONLY valid JSON, no markdown, no explanation.

{
  "invoice_number": "string | null",
  "invoice_date": "string | null — YYYY-MM-DD",
  "supplier_name": "string | null",
  "total_amount": "number | null — numeric value in SGD",
  "line_items": [
    {
      "do_number": "string | null — delivery order reference number on this line",
      "description": "string | null",
      "quantity": "number | null",
      "unit_price": "number | null",
      "amount": "number | null"
    }
  ]
}`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ extracted: null, fallback: true })

  const { imageBase64, mimeType = "image/jpeg" } = await request.json()
  if (!imageBase64) return NextResponse.json({ error: "imageBase64 required" }, { status: 400 })

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ]}],
        generationConfig: { temperature: 0, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) return NextResponse.json({ extracted: null, fallback: true })

    const gemini = await res.json()
    const raw = gemini?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    const json = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim()
    const extracted = JSON.parse(json)
    return NextResponse.json({ extracted })
  } catch {
    return NextResponse.json({ extracted: null, fallback: true })
  }
}