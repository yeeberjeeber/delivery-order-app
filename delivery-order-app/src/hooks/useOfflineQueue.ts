"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getAllQueued, dequeue, getQueueCount } from "@/lib/offline-queue"
import { uploadToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary"

export function useOfflineQueue() {
  const [isOnline,     setIsOnline]     = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing,      setSyncing]      = useState(false)
  const [syncedCount,  setSyncedCount]  = useState(0)
  const syncingRef = useRef(false)

  const refreshCount = useCallback(async () => {
    try { setPendingCount(await getQueueCount()) } catch { /* IndexedDB unavailable */ }
  }, [])

  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    try {
      const items = await getAllQueued()
      for (const item of items) {
        try {
          let payload = { ...item.payload }

          // If photo wasn't uploaded yet, try Cloudinary now
          if (!payload.photo_url && item.photoBase64 && isCloudinaryConfigured()) {
            try {
              const blob = await fetch(`data:image/jpeg;base64,${item.photoBase64}`).then(r => r.blob())
              const file = new File([blob], "photo.jpg", { type: "image/jpeg" })
              const cloud = await uploadToCloudinary(file)
              payload = { ...payload, photo_url: cloud.url, photo_public_id: cloud.publicId }
            } catch { /* submit without photo if Cloudinary still fails */ }
          }

          const res = await fetch("/api/delivery-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

          if (res.ok) {
            await dequeue(item.id)
            setPendingCount(c => Math.max(0, c - 1))
            setSyncedCount(c => c + 1)
          }
        } catch { /* network error — leave in queue, try next time */ }
      }
    } finally {
      syncingRef.current = false
      setSyncing(false)
      refreshCount()
    }
  }, [refreshCount])

  useEffect(() => {
    setIsOnline(navigator.onLine)
    refreshCount()

    const handleOnline = () => { setIsOnline(true); syncQueue() }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online",  handleOnline)
    window.addEventListener("offline", handleOffline)

    // Drain any leftover queue on mount if already online
    if (navigator.onLine) syncQueue()

    return () => {
      window.removeEventListener("online",  handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [syncQueue, refreshCount])

  return { isOnline, pendingCount, syncing, syncedCount, refreshCount }
}