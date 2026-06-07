export const dynamic = "force-dynamic";

import { queryRows } from "@/lib/db";
import type { Lead } from "@/lib/types";
import DoorKnockMap from "@/components/DoorKnockMap";
import { requirePageUser } from "@/lib/auth";

export default async function MapPage() {
  const user = await requirePageUser();
  const leads = user.role === "owner"
    ? await queryRows<Lead>("SELECT id, first_name, last_name, address, city, state, status, latitude, longitude, territory, doors_knocked, assigned_rep, created_at, updated_at FROM leads ORDER BY created_at DESC")
    : await queryRows<Lead>("SELECT id, first_name, last_name, address, city, state, status, latitude, longitude, territory, doors_knocked, assigned_rep, created_at, updated_at FROM leads WHERE assigned_rep = $1 ORDER BY created_at DESC", [user.display_name]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Door-Knocking Map</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Live territory view — click the map to record a new door knock
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {leads.filter((l) => l.latitude && l.longitude).length} pinned ·{" "}
          {leads.reduce((s, l) => s + l.doors_knocked, 0)} doors knocked
        </div>
      </div>
      <DoorKnockMap leads={leads} />
    </div>
  );
}
