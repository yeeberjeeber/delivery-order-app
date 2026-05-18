import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GEMINI_MODEL = "gemini-2.5-flash"
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const EXTRACTION_PROMPT = `You are analyzing a Delivery Order (D.O.) document from a Singapore construction or building materials company.
Extract the following fields from the image. Return ONLY valid JSON, no markdown, no explanation.

Fields to extract:
{
  "do_number": "string | null — the D.O. or delivery order reference number, often printed near the top of the document",
  "vehicle_plate": "string | null — Singapore vehicle plate number (e.g. GBE1234A). If only a truck number is shown, return null",
  "supplier_name": "string | null — name of the supplier or company issuing the document (check header, logo, footer)",
  "material_type": "TON | TIN | DRUM | M3 | null — unit type: use M3 for concrete or cement deliveries measured in cubic metres (m³), TON for tonnage, TIN for tins, DRUM for drums",
  "quantity": "number | null — the quantity for THIS delivery trip only. For concrete DOs look for 'This Load' field, not 'Total Order' or 'Progressive Total'",
  "location": "string | null — delivery site name or address if visible",
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
        generationConfig: { temperature: 0, maxOutputTokens: 2048 }
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      console.error("[ai/extract] Gemini error:", res.status, JSON.stringify(errBody))
      return NextResponse.json({ extracted: null, fallback: true, debug: errBody })
    }

    const gemini = await res.json()
    const raw = gemini?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    console.log("[ai/extract] Gemini raw response:", raw)

    // Extract the JSON object directly — handles markdown fences, leading whitespace, trailing text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const json = jsonMatch ? jsonMatch[0] : raw.trim()

    try {
      const extracted = JSON.parse(json)

      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "ai_extract",
        entity_type: "delivery_order",
        metadata: { do_number: extracted.do_number ?? null },
      })

      return NextResponse.json({ extracted })
    } catch {
      console.error("[ai/extract] JSON parse failed, raw was:", raw)
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
