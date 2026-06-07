export const dynamic = "force-dynamic";

import Link from "next/link";
import getDb from "@/lib/db";
import type { Lead } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import DashboardFilters from "@/components/DashboardFilters";
import { requirePageUser } from "@/lib/auth";

type SearchParams = Promise<{ from?: string; to?: string; rep?: string }>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePageUser();
  const db = getDb();
  const allLeads = user.role === "owner"
    ? (db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all() as Lead[])
    : (db.prepare("SELECT * FROM leads WHERE assigned_rep = ? ORDER BY created_at DESC").all(user.display_name) as Lead[]);

  // Collect distinct reps for the filter dropdown
  const reps = [...new Set(allLeads.map((l) => l.assigned_rep).filter(Boolean) as string[])].sort();

  // Apply filters
  const { from, to, rep } = await searchParams;
  const fromDate = from ? new Date(from + "T00:00:00") : null;
  const toDate = to ? new Date(to + "T23:59:59") : null;

  const leads = allLeads.filter((l) => {
    const created = new Date(l.created_at);
    if (fromDate && created < fromDate) return false;
    if (toDate && created > toDate) return false;
    if (user.role === "owner" && rep && l.assigned_rep !== rep) return false;
    return true;
  });

  const total = leads.length;
  const sold = leads.filter((l) => l.status === "sold").length;
  const active = leads.filter((l) => !["sold", "lost"].includes(l.status)).length;
  const doorsKnocked = leads.reduce((sum, l) => sum + (l.doors_knocked ?? 0), 0);
  const recent = leads.slice(0, 5);
  const isFiltered = from || to || (user.role === "owner" ? rep : undefined);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">KO Roofing Sales Overview</p>
        </div>
        <Link
          href="/leads/new"
          className="px-4 py-2 rounded-md text-sm font-semibold text-black hover:opacity-90"
          style={{ backgroundColor: "#d1b471" }}
        >
          + New Lead
        </Link>
      </div>

      {/* Filters */}
      {user.role === "owner" && <DashboardFilters reps={reps} />}

      {isFiltered && (
        <p className="text-xs text-gray-400 -mt-4">
          Showing {leads.length} lead{leads.length !== 1 ? "s" : ""}
          {rep ? ` for ${rep}` : ""}
          {from ? ` from ${from}` : ""}
          {to ? ` to ${to}` : ""}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: total, color: "text-gray-900" },
          { label: "Active Pipeline", value: active, color: "text-blue-700" },
          { label: "Sold", value: sold, color: "text-green-700" },
          { label: "Doors Knocked", value: doorsKnocked, color: "text-purple-700" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Recent Leads</h2>
          <Link href="/leads" className="text-sm text-[#b89d5f] hover:underline">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">
            No leads yet.{" "}
            <Link href="/leads/new" className="text-[#b89d5f] underline">Create your first lead</Link>
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recent.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{lead.first_name} {lead.last_name}</p>
                    <p className="text-xs text-gray-400">
                      {lead.city ? `${lead.city}, ${lead.state ?? ""}` : lead.address ?? "No address"}
                      {lead.territory ? ` · ${lead.territory}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={lead.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
