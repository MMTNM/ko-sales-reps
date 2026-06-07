export const dynamic = "force-dynamic";

import Link from "next/link";
import getDb from "@/lib/db";
import type { Lead } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import LeadRowMenu from "@/components/LeadRowMenu";
import { requirePageUser } from "@/lib/auth";

export default async function LeadsPage() {
  const user = await requirePageUser();
  const db = getDb();
  const leads = user.role === "owner"
    ? (db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all() as Lead[])
    : (db.prepare("SELECT * FROM leads WHERE assigned_rep = ? ORDER BY created_at DESC").all(user.display_name) as Lead[]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">All Leads</h1>
        <Link
          href="/leads/new"
          className="px-4 py-2 rounded-md text-sm font-semibold text-black hover:opacity-90"
          style={{ backgroundColor: "#d1b471" }}
        >
          + New Lead
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No leads yet.</p>
          <Link href="/leads/new" className="mt-3 inline-block text-[#b89d5f] underline text-sm">
            Create your first lead
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Name","Phone","Address","Territory","Roof Type","Doors","Status","Rep","Date",""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-[#b89d5f]">
                      {lead.first_name} {lead.last_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.city ? `${lead.city}, ${lead.state ?? ""}` : lead.address ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.territory ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.roof_type ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 text-center">{lead.doors_knocked}</td>
                  <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                  <td className="px-4 py-3 text-gray-600">{lead.assigned_rep ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(lead.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-3">
                    <LeadRowMenu id={lead.id} latitude={lead.latitude} longitude={lead.longitude} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
