"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"

export default function UserMenu({
  name,
  profileHref,
  signOutHref,
}: {
  name: string
  profileHref: string
  signOutHref: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  const initial = name?.[0]?.toUpperCase() ?? "?"

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="size-9 rounded-full flex items-center justify-center text-sm font-bold shadow-md transition-opacity active:opacity-70"
        style={{ backgroundColor: "#1a3a5c", color: "#fff" }}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="size-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Edit Profile
          </Link>
          <div className="h-px bg-gray-100" />
          <form action={signOutHref} method="POST">
            <button
              type="submit"
              className="flex items-center gap-3 px-4 py-3.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
