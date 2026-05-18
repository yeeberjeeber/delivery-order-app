"use client"

import { useOfflineQueue } from "@/hooks/useOfflineQueue"

export default function OfflineBanner() {
  const { isOnline, pendingCount, syncing } = useOfflineQueue()

  if (isOnline && pendingCount === 0) return null

  if (!isOnline) {
    return (
      <div className="fixed top-0 inset-x-0 z-40 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white"
        style={{ backgroundColor: "#b91c1c" }}>
        <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
        You&apos;re offline
        {pendingCount > 0 && (
          <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full">
            {pendingCount} queued
          </span>
        )}
      </div>
    )
  }

  // Online but still has pending items (syncing)
  return (
    <div className="fixed top-0 inset-x-0 z-40 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white"
      style={{ backgroundColor: "#d97706" }}>
      <svg className={`size-3.5 shrink-0 ${syncing ? "animate-spin" : ""}`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      {syncing
        ? `Syncing ${pendingCount} queued upload${pendingCount !== 1 ? "s" : ""}…`
        : `${pendingCount} upload${pendingCount !== 1 ? "s" : ""} pending sync`}
    </div>
  )
}