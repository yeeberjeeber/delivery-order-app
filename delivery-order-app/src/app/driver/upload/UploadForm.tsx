"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { compressImage, fileToBase64, createPreviewUrl } from "@/lib/image"
import { uploadToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary"

// ─── Types ────────────────────────────────────────────────────────────────────

type MaterialType = "TON" | "TIN" | "DRUM"
interface Vehicle   { id: string; plate_number: string }
interface Supplier  { id: string; name: string }
interface Project   { id: string; code: string; name: string }
interface Supervisor { id: string; full_name: string }

interface FormState {
  vehicleId: string
  doNumber: string
  supplierId: string
  materialType: MaterialType | ""
  quantity: string
  projectId: string
  supervisorId: string
  location: string
  remarks: string
}

interface PhotoState {
  raw: File | null
  preview: string | null
  cloudinaryUrl: string | null
  cloudinaryPublicId: string | null
  uploading: boolean
  uploadError: string | null
}

interface ExtractState {
  status: "idle" | "extracting" | "done" | "error"
}

interface GpsState {
  status: "idle" | "capturing" | "done" | "error"
  lat: number | null
  lng: number | null
}

interface DuplicateState {
  status: "idle" | "checking" | "ok" | "duplicate"
  existingOrder: Record<string, unknown> | null
}

const BLANK_FORM: FormState = {
  vehicleId: "", doNumber: "", supplierId: "", materialType: "",
  quantity: "", projectId: "", supervisorId: "", location: "", remarks: "",
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UploadForm({
  vehicles, suppliers, projects, supervisors,
}: {
  vehicles: Vehicle[]
  suppliers: Supplier[]
  projects: Project[]
  supervisors: Supervisor[]
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>(BLANK_FORM)
  const [photo, setPhoto] = useState<PhotoState>({
    raw: null, preview: null, cloudinaryUrl: null,
    cloudinaryPublicId: null, uploading: false, uploadError: null,
  })
  const [extract, setExtract] = useState<ExtractState>({ status: "idle" })
  const [gps, setGps] = useState<GpsState>({ status: "idle", lat: null, lng: null })
  const [duplicate, setDuplicate] = useState<DuplicateState>({ status: "idle", existingOrder: null })
  const [duplicateOverride, setDuplicateOverride] = useState(false)
  const [duplicateReason, setDuplicateReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  // ── GPS capture on mount ──────────────────────────────────────────────────

  useEffect(() => {
    if (!navigator.geolocation) return
    setGps({ status: "capturing", lat: null, lng: null })
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ status: "done", lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGps({ status: "error", lat: null, lng: null }),
      { timeout: 10_000, enableHighAccuracy: true }
    )
  }, [])

  // ── Duplicate D.O. check (debounced 500ms) ────────────────────────────────

  useEffect(() => {
    if (!form.doNumber || form.doNumber.length < 3) {
      setDuplicate({ status: "idle", existingOrder: null })
      setDuplicateOverride(false)
      return
    }
    const timer = setTimeout(async () => {
      setDuplicate({ status: "checking", existingOrder: null })
      try {
        const res = await fetch(`/api/delivery-orders/check-duplicate?do_number=${encodeURIComponent(form.doNumber)}`)
        const data = await res.json()
        setDuplicate({
          status: data.isDuplicate ? "duplicate" : "ok",
          existingOrder: data.existingOrder ?? null,
        })
        if (!data.isDuplicate) setDuplicateOverride(false)
      } catch {
        setDuplicate({ status: "idle", existingOrder: null })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [form.doNumber])

  // ── Photo processing (shared by file input + drag and drop) ──────────────

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return

    const preview = createPreviewUrl(file)
    setPhoto({ raw: file, preview, cloudinaryUrl: null, cloudinaryPublicId: null, uploading: true, uploadError: null })
    setExtract({ status: "extracting" })

    try {
      const compressed = await compressImage(file)
      const base64 = await fileToBase64(compressed)

      const [cloudResult, extractResult] = await Promise.allSettled([
        isCloudinaryConfigured() ? uploadToCloudinary(compressed) : Promise.resolve(null),
        fetch("/api/ai/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        }).then(r => r.json()),
      ])

      const cloud = cloudResult.status === "fulfilled" ? cloudResult.value : null
      const extracted = extractResult.status === "fulfilled" ? extractResult.value?.extracted : null

      setPhoto((p: PhotoState) => ({
        ...p,
        preview: createPreviewUrl(compressed),
        cloudinaryUrl: cloud?.url ?? null,
        cloudinaryPublicId: cloud?.publicId ?? null,
        uploading: false,
        uploadError: cloudResult.status === "rejected" ? "Photo upload failed — you can still submit." : null,
      }))

      setExtract({ status: extracted ? "done" : "error" })

      if (extracted) {
        setForm((prev: FormState) => ({
          ...prev,
          doNumber:     extracted.do_number     ?? prev.doNumber,
          materialType: (["TON","TIN","DRUM"].includes(extracted.material_type) ? extracted.material_type : prev.materialType) as MaterialType | "",
          quantity:     extracted.quantity != null ? String(extracted.quantity) : prev.quantity,
          location:     extracted.location      ?? prev.location,
          supplierId: suppliers.find(s =>
            s.name.toLowerCase().includes((extracted.supplier_name ?? "").toLowerCase())
          )?.id ?? prev.supplierId,
        }))
      }
    } catch {
      setPhoto((p: PhotoState) => ({ ...p, uploading: false, uploadError: "Something went wrong processing the photo." }))
      setExtract({ status: "error" })
    }
  }, [suppliers])

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    await processFile(file)
  }, [processFile])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await processFile(file)
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }, [])

  // ── Form change ───────────────────────────────────────────────────────────

  const set = (key: keyof FormState) => (value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setError("")
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const missing: string[] = []
    if (!form.vehicleId)    missing.push("Vehicle")
    if (!form.doNumber)     missing.push("D.O. Number")
    if (!form.supplierId)   missing.push("Supplier")
    if (!form.materialType) missing.push("Material Type")
    if (!form.quantity)     missing.push("Quantity")
    if (missing.length > 0) { setError(`Required: ${missing.join(", ")}`); return }

    if (duplicate.status === "duplicate" && !duplicateOverride) {
      setError("This D.O. number already exists. Check the override box below to proceed.")
      return
    }
    if (duplicateOverride && !duplicateReason.trim()) {
      setError("Please enter a reason for the duplicate override.")
      return
    }

    setSubmitting(true)
    setError("")

    const res = await fetch("/api/delivery-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        do_number:                 form.doNumber,
        vehicle_id:                form.vehicleId,
        supplier_id:               form.supplierId,
        material_type:             form.materialType,
        quantity:                  parseFloat(form.quantity),
        project_id:                form.projectId   || null,
        supervisor_id:             form.supervisorId || null,
        location:                  form.location    || null,
        remarks:                   form.remarks     || null,
        photo_url:                 photo.cloudinaryUrl,
        photo_public_id:           photo.cloudinaryPublicId,
        gps_lat:                   gps.lat,
        gps_lng:                   gps.lng,
        is_duplicate_override:     duplicateOverride,
        duplicate_override_reason: duplicateReason || null,
      }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Submission failed. Please try again.")
      return
    }

    router.push("/driver/dashboard")
  }

  const canSubmit =
    !submitting && !photo.uploading &&
    !!form.vehicleId && !!form.doNumber && !!form.supplierId &&
    !!form.materialType && !!form.quantity

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-svh">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4" style={{ backgroundColor: "#1a3a5c" }}>
        <button onClick={() => router.back()} className="text-white/70 hover:text-white transition-colors">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-white">Capture Delivery Order</h1>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

        {/* Photo section */}
        <Section title="Delivery Order Photo">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />

          {photo.preview ? (
            <div
              className="space-y-3"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {/* Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-100" style={{ aspectRatio: "4/3" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.preview} alt="D.O. photo" className="w-full h-full object-cover" />
                {isDragging && (
                  <div className="absolute inset-0 rounded-xl border-2 border-dashed flex items-center justify-center"
                    style={{ backgroundColor: "rgba(26,58,92,0.6)", borderColor: "#fff" }}>
                    <p className="text-white font-semibold text-sm">Drop to replace photo</p>
                  </div>
                )}
                {photo.uploading && !isDragging && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="bg-white rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <Spinner className="text-[#1a3a5c]" />
                      <span className="text-sm font-medium text-gray-700">Uploading…</span>
                    </div>
                  </div>
                )}
              </div>

              {/* AI status */}
              <AIStatus status={extract.status} />

              {/* Upload error */}
              {photo.uploadError && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠ {photo.uploadError}
                </p>
              )}

              {/* Retake */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-semibold underline underline-offset-2"
                style={{ color: "#1a3a5c" }}
              >
                Retake photo
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed gap-3 py-10 active:bg-gray-100 transition-colors"
                style={{
                  borderColor: isDragging ? "#1a3a5c" : "#e5e7eb",
                  backgroundColor: isDragging ? "#eff6ff" : "#f9fafb",
                }}
              >
                <div className="flex items-center justify-center size-14 rounded-2xl" style={{ backgroundColor: isDragging ? "#dbeafe" : "#eef2f7" }}>
                  <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="#1a3a5c"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {isDragging ? (
                      <>
                        <polyline points="16 16 12 12 8 16"/>
                        <line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                      </>
                    ) : (
                      <>
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </>
                    )}
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-700 text-sm">
                    {isDragging ? "Drop photo here" : "Tap to capture D.O. photo"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isDragging ? "Release to upload" : "Or drag and drop an image · AI will auto-fill the form"}
                  </p>
                </div>
              </button>
            </div>
          )}
        </Section>

        {/* GPS status */}
        <GpsBar status={gps.status} lat={gps.lat} lng={gps.lng} />

        {/* Form fields */}
        <Section title="Delivery Details">
          <div className="space-y-4">

            <SelectField
              label="Vehicle Plate"
              required
              value={form.vehicleId}
              onChange={set("vehicleId")}
              placeholder="Select vehicle…"
              options={vehicles.map(v => ({ value: v.id, label: v.plate_number }))}
            />

            <TextField
              label="D.O. Number"
              required
              value={form.doNumber}
              onChange={set("doNumber")}
              placeholder="e.g. D8080507923"
              suffix={<DuplicateIndicator status={duplicate.status} />}
            />

            {/* Duplicate warning */}
            {duplicate.status === "duplicate" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2.5">
                <p className="text-sm font-semibold text-amber-800">⚠ This D.O. number already exists</p>
                <p className="text-xs text-amber-700">
                  Previously submitted on{" "}
                  {duplicate.existingOrder
                    ? new Date(duplicate.existingOrder.submitted_at as string).toLocaleDateString("en-SG", { timeZone: "Asia/Singapore" })
                    : "an earlier date"}.
                </p>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={duplicateOverride}
                    onChange={e => setDuplicateOverride(e.target.checked)}
                    className="mt-0.5 size-4 rounded"
                  />
                  <span className="text-xs font-medium text-amber-800">
                    This is intentional — I confirm it&apos;s a legitimate re-submission
                  </span>
                </label>
                {duplicateOverride && (
                  <input
                    type="text"
                    placeholder="Reason for re-submission…"
                    value={duplicateReason}
                    onChange={e => setDuplicateReason(e.target.value)}
                    className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />
                )}
              </div>
            )}

            <SelectField
              label="Supplier"
              required
              value={form.supplierId}
              onChange={set("supplierId")}
              placeholder="Select supplier…"
              options={suppliers.map(s => ({ value: s.id, label: s.name }))}
            />

            <SelectField
              label="Material Type"
              required
              value={form.materialType}
              onChange={set("materialType")}
              placeholder="Select type…"
              options={[
                { value: "TON",  label: "TON — Tonne (net weight)" },
                { value: "TIN",  label: "TIN — Tin unit" },
                { value: "DRUM", label: "DRUM — Drum unit" },
              ]}
            />

            <TextField
              label="Quantity / Net Weight"
              required
              value={form.quantity}
              onChange={set("quantity")}
              placeholder="e.g. 10.5"
              type="decimal"
            />

            <SelectField
              label="Project Code"
              value={form.projectId}
              onChange={set("projectId")}
              placeholder="Select project…"
              options={projects.map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
            />

            <SelectField
              label="Supervisor"
              value={form.supervisorId}
              onChange={set("supervisorId")}
              placeholder="Select supervisor…"
              options={supervisors.map(s => ({ value: s.id, label: s.full_name }))}
            />

            <TextField
              label="Location"
              value={form.location}
              onChange={set("location")}
              placeholder="Delivery site or address (optional)"
            />

            <TextField
              label="Remarks"
              value={form.remarks}
              onChange={set("remarks")}
              placeholder="Any notes (optional)"
            />
          </div>
        </Section>

        {/* Submit error */}
        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
            <svg className="size-4 shrink-0 mt-px" viewBox="0 0 24 24" fill="none"
              stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-sm text-red-700 leading-snug">{error}</p>
          </div>
        )}

        {/* Submit button — extra bottom padding so it clears the nav */}
        <div className="pb-4">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-14 rounded-2xl text-base font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: "#1a3a5c" }}
          >
            {submitting
              ? <><Spinner /> Submitting…</>
              : photo.uploading
              ? <><Spinner /> Uploading photo…</>
              : "Submit Delivery Order"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</p>
      {children}
    </div>
  )
}

function TextField({
  label, required, value, onChange, placeholder, type = "text", suffix,
}: {
  label: string; required?: boolean; value: string
  onChange: (v: string) => void; placeholder?: string
  type?: string; suffix?: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#1a3a5c] focus-within:ring-2 focus-within:ring-[#1a3a5c]/10 transition-all">
        <input
          type={type === "decimal" ? "number" : "text"}
          inputMode={type === "decimal" ? "decimal" : undefined}
          step={type === "decimal" ? "0.001" : undefined}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent py-3.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none min-w-0"
        />
        {suffix}
      </div>
    </div>
  )
}

function SelectField({
  label, required, value, onChange, placeholder, options,
}: {
  label: string; required?: boolean; value: string
  onChange: (v: string) => void; placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 pr-10 text-sm text-gray-900 outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/10 transition-all"
          style={{ color: value ? "#111827" : "#9ca3af" }}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    </div>
  )
}

function AIStatus({ status }: { status: ExtractState["status"] }) {
  if (status === "idle") return null

  const config = {
    extracting: { icon: <Spinner />, text: "Reading D.O. with AI…",  color: "#1a3a5c", bg: "#eef2f7" },
    done:       { icon: <CheckIcon />, text: "Fields filled by AI — please review", color: "#15803d", bg: "#dcfce7" },
    error:      { icon: <InfoIcon />,  text: "AI couldn't read this — fill in manually", color: "#a16207", bg: "#fef9c3" },
  }[status]

  if (!config) return null

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium"
      style={{ backgroundColor: config.bg, color: config.color }}>
      {config.icon}
      {config.text}
    </div>
  )
}

function GpsBar({ status, lat, lng }: { status: GpsState["status"]; lat: number | null; lng: number | null }) {
  const config = {
    idle:      { icon: "📍", text: "Requesting location…", color: "#9ca3af" },
    capturing: { icon: "📍", text: "Capturing GPS location…", color: "#f59e0b" },
    done:      { icon: "📍", text: `GPS captured (${lat?.toFixed(5)}, ${lng?.toFixed(5)})`, color: "#15803d" },
    error:     { icon: "⚠",  text: "GPS unavailable — location will not be recorded", color: "#b91c1c" },
  }[status]

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border"
      style={{
        backgroundColor: status === "done" ? "#f0fdf4" : status === "error" ? "#fef2f2" : "#f9fafb",
        borderColor:     status === "done" ? "#bbf7d0" : status === "error" ? "#fecaca" : "#e5e7eb",
      }}>
      <span className="text-sm">{config.icon}</span>
      <span className="text-xs font-medium" style={{ color: config.color }}>{config.text}</span>
    </div>
  )
}

function DuplicateIndicator({ status }: { status: DuplicateState["status"] }) {
  if (status === "idle") return null
  if (status === "checking") return <Spinner className="text-gray-400" />
  if (status === "ok") return <CheckIcon color="#22c55e" />
  if (status === "duplicate") return <WarnIcon />
  return null
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`size-4 animate-spin shrink-0 ${className ?? "text-white"}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

function CheckIcon({ color = "currentColor" }: { color?: string }) {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg className="size-4 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}
