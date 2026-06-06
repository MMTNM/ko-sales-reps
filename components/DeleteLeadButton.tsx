"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteLeadButton({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    router.push("/leads");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-full text-white text-xs font-semibold bg-red-500 hover:bg-red-600 transition-colors"
      >
        Delete
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => !deleting && setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl">
                🗑
              </div>
              <h2 className="text-lg font-bold text-gray-900">Delete this lead?</h2>
              <p className="text-sm text-gray-500">
                This action cannot be undone. The lead and all its data will be permanently removed.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-full text-white text-sm font-semibold bg-red-500 hover:bg-red-600 disabled:opacity-60 transition-colors"
              >
                {deleting ? "Deleting…" : "Yes, delete lead"}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
