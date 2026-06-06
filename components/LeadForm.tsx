"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROOF_TYPES = ["Asphalt Shingles", "Metal Roofing", "Wood Shake", "Synthetic Slate", "Other"];
const DAMAGE_TYPES = ["Hail", "Wind", "Age", "Storm", "Leak", "Other", "None"];
const STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "estimate_scheduled", label: "Estimate Scheduled" },
  { value: "estimate_sent", label: "Estimate Sent" },
  { value: "sold", label: "Sold" },
  { value: "lost", label: "Lost" },
];

interface FormState {
  first_name: string; last_name: string; email: string; phone: string;
  address: string; city: string; state: string; zip: string;
  roof_type: string; damage_type: string; notes: string; status: string;
  assigned_rep: string; territory: string;
  latitude: string; longitude: string;
}

const EMPTY: FormState = {
  first_name: "", last_name: "", email: "", phone: "",
  address: "", city: "", state: "", zip: "",
  roof_type: "", damage_type: "", notes: "", status: "new",
  assigned_rep: "", territory: "", latitude: "", longitude: "",
};

export default function LeadForm({ initial, id }: { initial?: Partial<FormState>; id?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  function update(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setGpsLoading(false);
      },
      () => setGpsLoading(false)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };
      const res = id
        ? await fetch(`/api/leads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save lead");
      }
      const lead = await res.json();
      router.push(`/leads/${lead.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d1b471]";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">{error}</div>
      )}

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-1 border-b border-gray-200">Contact Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelClass}>First Name *</label>
            <input className={inputClass} required value={form.first_name} onChange={(e) => update("first_name", e.target.value)} /></div>
          <div><label className={labelClass}>Last Name *</label>
            <input className={inputClass} required value={form.last_name} onChange={(e) => update("last_name", e.target.value)} /></div>
          <div><label className={labelClass}>Email</label>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} /></div>
          <div><label className={labelClass}>Phone</label>
            <input type="tel" className={inputClass} value={form.phone} onChange={(e) => update("phone", e.target.value)} /></div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-1 border-b border-gray-200">Property Address</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className={labelClass}>Street Address</label>
            <input className={inputClass} value={form.address} onChange={(e) => update("address", e.target.value)} /></div>
          <div><label className={labelClass}>City</label>
            <input className={inputClass} value={form.city} onChange={(e) => update("city", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>State</label>
              <input className={inputClass} maxLength={2} placeholder="UT" value={form.state} onChange={(e) => update("state", e.target.value.toUpperCase())} /></div>
            <div><label className={labelClass}>ZIP</label>
              <input className={inputClass} value={form.zip} onChange={(e) => update("zip", e.target.value)} /></div>
          </div>
          <div><label className={labelClass}>Territory</label>
            <input className={inputClass} placeholder="e.g. St. George North" value={form.territory} onChange={(e) => update("territory", e.target.value)} /></div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-1 border-b border-gray-200">GPS Coordinates</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Latitude</label>
            <input className={inputClass} placeholder="37.1234" value={form.latitude} onChange={(e) => update("latitude", e.target.value)} /></div>
          <div><label className={labelClass}>Longitude</label>
            <input className={inputClass} placeholder="-113.5678" value={form.longitude} onChange={(e) => update("longitude", e.target.value)} /></div>
        </div>
        <button type="button" onClick={useCurrentLocation} disabled={gpsLoading}
          className="mt-2 text-xs text-[#b89d5f] hover:underline disabled:opacity-50">
          {gpsLoading ? "Getting location…" : "📍 Use my current location"}
        </button>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-1 border-b border-gray-200">Job Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelClass}>Roof Type</label>
            <select className={inputClass} value={form.roof_type} onChange={(e) => update("roof_type", e.target.value)}>
              <option value="">Select…</option>
              {ROOF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div><label className={labelClass}>Damage Type</label>
            <select className={inputClass} value={form.damage_type} onChange={(e) => update("damage_type", e.target.value)}>
              <option value="">Select…</option>
              {DAMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div><label className={labelClass}>Lead Status</label>
            <select className={inputClass} value={form.status} onChange={(e) => update("status", e.target.value)}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select></div>
          <div><label className={labelClass}>Assigned Rep</label>
            <input className={inputClass} value={form.assigned_rep} onChange={(e) => update("assigned_rep", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={labelClass}>Notes</label>
            <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></div>
        </div>
      </section>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 text-sm rounded-md text-black font-semibold disabled:opacity-60"
          style={{ backgroundColor: "#d1b471" }}>
          {saving ? "Saving…" : id ? "Save Changes" : "Save Lead"}
        </button>
      </div>
    </form>
  );
}
