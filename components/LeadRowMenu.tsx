"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  id: number;
  latitude: number | null;
  longitude: number | null;
}

export default function LeadRowMenu({ id, latitude, longitude }: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/leads/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(false);
      setOpen(false);
      setConfirming(false);
    }
  }

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={() => { setOpen((v) => !v); setConfirming(false); }}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label="Options"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 bg-white rounded-xl border border-gray-200 shadow-lg py-1 text-sm">
          <Link
            href={`/leads/${id}`}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            <span>👁</span> View
          </Link>
          <Link
            href={`/leads/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            <span>✏️</span> Edit
          </Link>
          {latitude && longitude ? (
            <Link
              href={`/map?lat=${latitude}&lng=${longitude}&id=${id}`}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              <span>📍</span> Find on Map
            </Link>
          ) : (
            <span className="flex items-center gap-2 px-4 py-2 text-gray-300 cursor-not-allowed select-none">
              <span>📍</span> No pin
            </span>
          )}
          <div className="border-t border-gray-100 my-1" />
          {confirming ? (
            <div className="px-4 py-2 space-y-2">
              <p className="text-xs text-gray-500">Delete this lead?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-2 py-1 rounded bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-60"
                >
                  {deleting ? "…" : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 px-2 py-1 rounded border border-gray-200 text-gray-600 text-xs hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-2 w-full px-4 py-2 text-red-500 hover:bg-red-50"
            >
              <span>🗑</span> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
