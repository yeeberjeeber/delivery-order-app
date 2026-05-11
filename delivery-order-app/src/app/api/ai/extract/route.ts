import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GEMINI_MODEL = "gemini-2.5-flash"
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const EXTRACTION_PROMPT = `You are analyzing a Delivery Order (D.O.) document from a Singapore construction company.
Extract the following fields from the image. Return ONLY valid JSON, no markdown, no explanation.

Fields to extract:
{
  "do_number": "string | null — the D.O. reference number",
  "vehicle_plate": "string | null — Singapore vehicle plate number",
  "supplier_name": "string | null — name of the supplier/company on the document",
  "material_type": "TON | TIN | DRUM | null — unit type used",
  "quantity": "number | null — numeric net weight or quantity",
  "location": "string | null — delivery site or address if visible",
  "date": "string | null — date in YYYY-MM-DD format"
}`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // Graceful fallback — no key configured yet
    return NextResponse.json({ extracted: null, fallback: true })
  }

  const { imageBase64 } = await request.json()
  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 required" }, { status: 400 })
  }

  const attemptExtract = async (): Promise<NextResponse> => {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: EXTRACTION_PROMPT },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          ],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 512 },
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return NextResponse.json({ extracted: null, fallback: true })
    }

    const gemini = await res.json()
    const raw = gemini?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

    // Strip any markdown fences Gemini might add
    const json = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim()

    try {
      const extracted = JSON.parse(json)

      // Log extraction attempt to audit log
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "ai_extract",
        entity_type: "delivery_order",
        metadata: { do_number: extracted.do_number ?? null },
      })

      return NextResponse.json({ extracted })
    } catch {
      return NextResponse.json({ extracted: null, fallback: true })
    }
  }

  // 2 retries with exponential backoff
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await attemptExtract()
    } catch {
      if (attempt < 1) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
    }
  }

  return NextResponse.json({ extracted: null, fallback: true })
}
