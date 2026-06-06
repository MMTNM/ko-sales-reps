"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/types";

const STATUSES: { value: Lead["status"]; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "estimate_scheduled", label: "Estimate Scheduled" },
  { value: "estimate_sent", label: "Estimate Sent" },
  { value: "sold", label: "Sold" },
  { value: "lost", label: "Lost" },
];

export default function LeadStatusUpdater({
  leadId,
  currentStatus,
}: {
  leadId: number;
  currentStatus: Lead["status"];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleChange(newStatus: Lead["status"]) {
    setStatus(newStatus);
    setSaving(true);
    setSaved(false);

    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <select
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d1b471]"
        value={status}
        onChange={(e) => handleChange(e.target.value as Lead["status"])}
        disabled={saving}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      {saving && <span className="text-xs text-gray-400">Saving…</span>}
      {saved && !saving && <span className="text-xs text-green-600">Saved</span>}
    </div>
  );
}
