export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { queryOne } from "@/lib/db";
import type { Lead } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import LeadStatusUpdater from "@/components/LeadStatusUpdater";
import DeleteLeadButton from "@/components/DeleteLeadButton";
import { canAccessLead, requirePageUser } from "@/lib/auth";

type Props = { params: Promise<{ id: string }> };

export default async function LeadDetailPage({ params }: Props) {
  const user = await requirePageUser();
  const { id } = await params;
  const lead = await queryOne<Lead>("SELECT * FROM leads WHERE id = $1", [id]);
  if (!lead) notFound();
  if (!canAccessLead(user, lead.assigned_rep)) notFound();

  const field = (label: string, value: string | number | null | undefined) =>
    value !== null && value !== undefined && value !== "" ? (
      <div key={label}>
        <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
        <dd className="mt-0.5 text-sm text-gray-800">{String(value)}</dd>
      </div>
    ) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/leads" className="text-sm text-[#b89d5f] hover:underline">← All Leads</Link>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{lead.first_name} {lead.last_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Lead #{lead.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={lead.status} />
            <Link
              href={`/leads/${lead.id}/edit`}
              className="px-3 py-1.5 rounded-md text-black text-xs font-semibold hover:opacity-90"
              style={{ backgroundColor: "#d1b471" }}
            >
              Edit Lead
            </Link>
            <DeleteLeadButton id={lead.id} />
          </div>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Contact</h2>
          <dl className="grid grid-cols-2 gap-3">{field("Email", lead.email)}{field("Phone", lead.phone)}</dl>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Property</h2>
          <dl className="grid grid-cols-2 gap-3">
            {field("Address", lead.address)}{field("City", lead.city)}
            {field("State", lead.state)}{field("ZIP", lead.zip)}
            {field("Territory", lead.territory)}
          </dl>
        </section>

        {(lead.latitude || lead.longitude) && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">GPS</h2>
            <dl className="grid grid-cols-2 gap-3">{field("Latitude", lead.latitude)}{field("Longitude", lead.longitude)}</dl>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Job Details</h2>
          <dl className="grid grid-cols-2 gap-3">
            {field("Roof Type", lead.roof_type)}{field("Damage Type", lead.damage_type)}
            {field("Assigned Rep", lead.assigned_rep)}{field("Doors Knocked", lead.doors_knocked)}
            {field("Notes", lead.notes)}
          </dl>
        </section>

        {(lead.jobnimbus_contact_id || lead.jobnimbus_job_id) && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">JobNimbus</h2>
            <dl className="grid grid-cols-2 gap-3">
              {field("Contact ID", lead.jobnimbus_contact_id)}{field("Job ID", lead.jobnimbus_job_id)}
            </dl>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Update Status</h2>
          <LeadStatusUpdater leadId={lead.id} currentStatus={lead.status} />
        </section>

        <p className="text-xs text-gray-400">
          Created {new Date(lead.created_at).toLocaleString()} · Updated {new Date(lead.updated_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
