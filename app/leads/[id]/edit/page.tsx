export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { queryOne } from "@/lib/db";
import type { Lead } from "@/lib/types";
import LeadForm from "@/components/LeadForm";
import { canAccessLead, requirePageUser } from "@/lib/auth";

type Props = { params: Promise<{ id: string }> };

export default async function EditLeadPage({ params }: Props) {
  const user = await requirePageUser();
  const { id } = await params;
  const lead = await queryOne<Lead>("SELECT * FROM leads WHERE id = $1", [id]);
  if (!lead) notFound();
  if (!canAccessLead(user, lead.assigned_rep)) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href={`/leads/${lead.id}`} className="text-sm text-[#b89d5f] hover:underline">
        ← Back to Lead
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Lead</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {lead.first_name} {lead.last_name} · Lead #{lead.id}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <LeadForm
          id={lead.id}
          initial={{
            first_name: lead.first_name,
            last_name: lead.last_name,
            email: lead.email ?? "",
            phone: lead.phone ?? "",
            address: lead.address ?? "",
            city: lead.city ?? "",
            state: lead.state ?? "",
            zip: lead.zip ?? "",
            territory: lead.territory ?? "",
            roof_type: lead.roof_type ?? "",
            damage_type: lead.damage_type ?? "",
            notes: lead.notes ?? "",
            status: lead.status,
            assigned_rep: lead.assigned_rep ?? "",
            latitude: lead.latitude != null ? String(lead.latitude) : "",
            longitude: lead.longitude != null ? String(lead.longitude) : "",
          }}
        />
      </div>
    </div>
  );
}
