"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import DashboardTab from "./DashboardTab"
import UploadForm from "./upload/UploadForm"
import HistoryClient from "./history/HistoryClient"

const TABS = ["/driver/dashboard", "/driver/upload", "/driver/history"]
const COMMIT_THRESHOLD = 80   // px to trigger tab change
const EDGE_RESISTANCE  = 0.18 // drag factor when at first/last tab

// ── Types ────────────────────────────────────────────────────────────────────

type DashboardOrder = {
  id: string; do_number: string; status: string
  material_type: string; quantity: number | null; submitted_at: string
  suppliers: { name: string } | { name: string }[] | null
  vehicles:  { plate_number: string } | { plate_number: string }[] | null
}

type HistoryOrder = DashboardOrder & {
  delivery_order_flags: {
    reason: string; notes: string | null; created_at: string
    flagged_by: { full_name: string } | { full_name: string }[] | null
  }[] | null
}

export type DriverShellProps = {
  children: React.ReactNode
  firstName: string
  greeting: string
  stats: { total: number; pending: number; verified: number; flagged: number }
  todayOrders: DashboardOrder[]
  vehicles:    { id: string; plate_number: string }[]
  suppliers:   { id: string; name: string }[]
  projects:    { id: string; code: string; name: string }[]
  supervisors: { id: string; full_name: string }[]
  historyOrders: HistoryOrder[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DriverShell({
  children,
  firstName, greeting, stats, todayOrders,
  vehicles, suppliers, projects, supervisors,
  historyOrders,
}: DriverShellProps) {
  const router   = useRouter()
  const pathname = usePathname()

  const tabIdx   = TABS.indexOf(pathname)
  const isMainTab = tabIdx !== -1

  const [activeIdx, setActiveIdx] = useState(Math.max(0, tabIdx))
  const [offset,    setOffset]    = useState(0)
  const [dragging,  setDragging]  = useState(false)

  const containerRef  = useRef<HTMLDivElement>(null)
  const startXY       = useRef<{ x: number; y: number } | null>(null)
  const swipeDir      = useRef<"horizontal" | "vertical" | null>(null)
  const activeIdxRef  = useRef(activeIdx)
  const offsetRef     = useRef(0)

  useEffect(() => { activeIdxRef.current = activeIdx }, [activeIdx])
  useEffect(() => { offsetRef.current = offset }, [offset])

  // Sync URL → active tab (DriverNav taps, "Capture D.O." link, browser back)
  useEffect(() => {
    if (tabIdx !== -1 && tabIdx !== activeIdxRef.current) {
      setActiveIdx(tabIdx)
      setOffset(0)
      setDragging(false)
    }
  }, [tabIdx])

  // Non-passive touch handlers so we can call preventDefault on horizontal swipes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      if (!isMainTab) return
      const t = e.touches[0]
      startXY.current  = { x: t.clientX, y: t.clientY }
      swipeDir.current = null
      setDragging(true)
    }

    function onTouchMove(e: TouchEvent) {
      if (!startXY.current) return
      const dx = e.touches[0].clientX - startXY.current.x
      const dy = e.touches[0].clientY - startXY.current.y

      // Determine direction from first meaningful movement
      if (!swipeDir.current) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        swipeDir.current = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical"
      }

      if (swipeDir.current !== "horizontal") {
        setDragging(false)
        return
      }

      // Stop the page from also scrolling vertically during a horizontal swipe
      e.preventDefault()

      const idx = activeIdxRef.current
      let d = dx
      if (dx > 0 && idx === 0)                d = dx * EDGE_RESISTANCE
      if (dx < 0 && idx === TABS.length - 1)  d = dx * EDGE_RESISTANCE
      setOffset(d)
    }

    function onTouchEnd() {
      startXY.current = null
      const dir = swipeDir.current
      swipeDir.current = null

      setDragging(false) // re-enable CSS transition before releasing

      if (dir !== "horizontal") {
        setOffset(0)
        return
      }

      const idx  = activeIdxRef.current
      const curr = offsetRef.current
      const newIdx =
        curr < -COMMIT_THRESHOLD && idx < TABS.length - 1 ? idx + 1 :
        curr >  COMMIT_THRESHOLD && idx > 0               ? idx - 1 :
        idx

      setActiveIdx(newIdx)
      setOffset(0)
      if (newIdx !== idx) router.replace(TABS[newIdx], { scroll: false })
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true  })
    el.addEventListener("touchmove",  onTouchMove,  { passive: false })
    el.addEventListener("touchend",   onTouchEnd,   { passive: true  })
    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove",  onTouchMove)
      el.removeEventListener("touchend",   onTouchEnd)
    }
  }, [isMainTab, router])

  // Non-tab route (history detail, profile, etc.) — just render the page normally
  if (!isMainTab) {
    return <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
  }

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden">
      {/* 300vw strip — one screen-width slot per tab */}
      <div
        style={{
          display: "flex",
          width: "300vw",
          height: "100%",
          transform: `translateX(calc(${-activeIdx * 100}vw + ${offset}px))`,
          transition: dragging
            ? "none"
            : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          willChange: "transform",
        }}
      >
        {/* Tab 0 — Dashboard */}
        <div style={{ width: "100vw", flexShrink: 0, height: "100%", overflowY: "auto" }}>
          <DashboardTab
            firstName={firstName} greeting={greeting}
            stats={stats} orders={todayOrders}
          />
        </div>

        {/* Tab 1 — Upload */}
        <div style={{ width: "100vw", flexShrink: 0, height: "100%", overflowY: "auto" }}>
          <UploadForm
            vehicles={vehicles} suppliers={suppliers}
            projects={projects} supervisors={supervisors}
          />
        </div>

        {/* Tab 2 — History */}
        <div style={{ width: "100vw", flexShrink: 0, height: "100%", overflowY: "auto" }}>
          <HistoryClient orders={historyOrders} />
        </div>
      </div>
    </div>
  )
}