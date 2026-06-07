import LeadForm from "@/components/LeadForm";
import { requirePageUser } from "@/lib/auth";

export default async function NewLeadPage() {
  await requirePageUser();
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Lead</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Fill in the details below. The lead will be saved to Postgres and synced to JobNimbus.
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <LeadForm />
      </div>
    </div>
  );
}
