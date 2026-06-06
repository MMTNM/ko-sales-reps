import type { Lead } from "@/lib/types";

const STATUS_LABELS: Record<Lead["status"], string> = {
  new: "New",
  contacted: "Contacted",
  estimate_scheduled: "Est. Scheduled",
  estimate_sent: "Est. Sent",
  sold: "Sold",
  lost: "Lost",
};

const STATUS_COLORS: Record<Lead["status"], string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  estimate_scheduled: "bg-purple-100 text-purple-800",
  estimate_sent: "bg-orange-100 text-orange-800",
  sold: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

export default function StatusBadge({ status }: { status: Lead["status"] }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
