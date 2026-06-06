"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Lead } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6",
  contacted: "#eab308",
  estimate_scheduled: "#a855f7",
  estimate_sent: "#f97316",
  sold: "#22c55e",
  lost: "#ef4444",
};

function getInitials(rep: string | null | undefined): string {
  if (!rep) return "";
  return rep
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function makePinHtml(color: string, initials: string): string {
  if (initials) {
    return `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      font-size:9px;font-weight:700;color:white;font-family:sans-serif;
      line-height:1;
    ">${initials}</div>`;
  }
  return `<div style="
    width:14px;height:14px;border-radius:50%;
    background:${color};border:2px solid white;
    box-shadow:0 1px 4px rgba(0,0,0,0.4);
  "></div>`;
}

interface Props {
  leads: Pick<Lead, "id" | "first_name" | "last_name" | "address" | "city" | "state" | "status" | "latitude" | "longitude" | "territory" | "doors_knocked" | "assigned_rep" | "created_at" | "updated_at">[];
}

export default function DoorKnockMap({ leads }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const focusLat = parseFloat(searchParams.get("lat") ?? "");
  const focusLng = parseFloat(searchParams.get("lng") ?? "");
  const focusId  = parseInt(searchParams.get("id") ?? "", 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);
  const [clickCoords, setClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapInstance, setMapInstance] = useState<unknown>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [knockStatus, setKnockStatus] = useState<"new" | "contacted" | "estimate_scheduled" | "estimate_sent" | "sold">("new");
  const [knockFirstName, setKnockFirstName] = useState("");
  const [knockLastName, setKnockLastName] = useState("");
  const [knockPhone, setKnockPhone] = useState("");
  const [knockEmail, setKnockEmail] = useState("");
  const [knockRep, setKnockRep] = useState("");
  const [knockAddress, setKnockAddress] = useState("");

  useEffect(() => {
    if (!mapRef.current || mapInstance) return;

    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // Fix default marker icons
      // @ts-expect-error leaflet internal
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (cancelled || !mapRef.current) return;

      // Start at St. George fallback; fly to current location if available
      const map = L.map(mapRef.current).setView([37.0965, -113.5684], 12);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!cancelled) map.setView([pos.coords.latitude, pos.coords.longitude], 15);
          },
          () => { /* permission denied – keep fallback */ },
          { timeout: 8000 }
        );
      }

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add existing leads as color-coded pins
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let focusMarker: any = null;
      for (const lead of leads) {
        if (!lead.latitude || !lead.longitude) continue;

        const color = STATUS_COLORS[lead.status] ?? "#6b7280";
        const initials = getInitials(lead.assigned_rep);
        const size = initials ? 28 : 14;
        const icon = L.divIcon({
          html: makePinHtml(color, initials),
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([lead.latitude, lead.longitude], { icon });
        const pinCreated = new Date(lead.created_at).toLocaleString();
        const pinUpdated = lead.updated_at !== lead.created_at ? new Date(lead.updated_at).toLocaleString() : null;
        marker.bindPopup(`
          <div style="min-width:180px;font-family:sans-serif;font-size:13px">
            <strong>${lead.first_name} ${lead.last_name}</strong><br/>
            ${lead.address ?? ""}${lead.city ? ", " + lead.city : ""}<br/>
            ${lead.territory ? "<em>" + lead.territory + "</em><br/>" : ""}
            Status: <strong>${lead.status.replace(/_/g, " ")}</strong><br/>
            Doors knocked: ${lead.doors_knocked}<br/>
            <hr style="margin:6px 0;border-color:#e5e7eb"/>
            <span style="color:#9ca3af;font-size:11px">📅 Pinned: ${pinCreated}</span><br/>
            ${pinUpdated ? `<span style="color:#9ca3af;font-size:11px">✏️ Updated: ${pinUpdated}</span><br/>` : ""}
            <a href="/leads/${lead.id}" style="color:#b89d5f;font-size:12px">Edit lead →</a>
          </div>
        `);
        marker.addTo(map);
        if (lead.id === focusId) {
          focusMarker = marker;
        }
      }

      // If navigated from leads page, fly to that pin and open its popup
      if (!cancelled && !isNaN(focusLat) && !isNaN(focusLng)) {
        map.setView([focusLat, focusLng], 19);
        if (focusMarker) focusMarker.openPopup();
      }

      // Single click = add pin, double-click = zoom in
      // Disable built-in double-click zoom so we can handle it manually
      map.doubleClickZoom.disable();
      let clickTimer: ReturnType<typeof setTimeout> | null = null;

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        if (clickTimer) return; // second click of a double-click — ignore
        clickTimer = setTimeout(() => {
          clickTimer = null;
          setClickCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        }, 250);
      });

      map.on("dblclick", (e: { latlng: { lat: number; lng: number } }) => {
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
        map.setView(e.latlng, map.getZoom() + 1);
      });

      leafletRef.current = L;
      setMapInstance(map);
      leafletMapRef.current = map;
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q || !leafletMapRef.current) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (!data.length) {
        setSearchError("Location not found. Try a more specific address.");
        return;
      }
      const { lat, lon } = data[0];
      leafletMapRef.current.setView([parseFloat(lat), parseFloat(lon)], 15);
    } catch {
      setSearchError("Search failed. Check your connection.");
    } finally {
      setSearchLoading(false);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setSearchError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setSearchError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        if (!leafletMapRef.current) return;
        leafletMapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 15);
      },
      () => {
        setGeoLoading(false);
        setSearchError("Unable to get your location. Check browser permissions.");
      },
      { timeout: 10000 }
    );
  }

  async function handleDoorKnock() {
    if (!clickCoords) return;
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: knockFirstName.trim() || "Door",
          last_name: knockLastName.trim() || "Knock",
          phone: knockPhone.trim() || null,
          email: knockEmail.trim() || null,
          assigned_rep: knockRep.trim() || null,
          address: knockAddress.trim() || null,
          latitude: clickCoords.lat,
          longitude: clickCoords.lng,
          doors_knocked: 1,
          status: knockStatus,
        }),
      });
      if (res.ok) {
        const lead = await res.json();
        // Add the new pin directly to the live map
        const L = leafletRef.current;
        const map = leafletMapRef.current;
        if (L && map && lead.latitude && lead.longitude) {
          const color = STATUS_COLORS[lead.status] ?? STATUS_COLORS["new"];
          const initials = getInitials(lead.assigned_rep);
          const size = initials ? 28 : 14;
          const icon = L.divIcon({
            html: makePinHtml(color, initials),
            className: "",
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
          const marker = L.marker([lead.latitude, lead.longitude], { icon });
          const now = new Date().toLocaleString();
          marker.bindPopup(`
            <div style="min-width:180px;font-family:sans-serif;font-size:13px">
              <strong>${lead.first_name} ${lead.last_name}</strong><br/>
              Status: <strong>${lead.status.replace(/_/g, " ")}</strong><br/>
              Doors knocked: ${lead.doors_knocked}<br/>
              <hr style="margin:6px 0;border-color:#e5e7eb"/>
              <span style="color:#9ca3af;font-size:11px">📅 Pinned: ${now}</span><br/>
              <a href="/leads/${lead.id}" style="color:#b89d5f;font-size:12px">Edit lead →</a>
            </div>
          `);
          marker.addTo(map);
          map.setView([lead.latitude, lead.longitude], map.getZoom());
          marker.openPopup();
        }
      }
    } finally {
      setSaving(false);
      setClickCoords(null);
      setKnockStatus("new");
      setKnockFirstName("");
      setKnockLastName("");
      setKnockPhone("");
      setKnockEmail("");
      setKnockRep("");
      setKnockAddress("");
    }
  }

  const KNOCK_OPTIONS: { value: typeof knockStatus; label: string }[] = [
    { value: "new", label: "No Answer" },
    { value: "contacted", label: "Contacted" },
    { value: "estimate_scheduled", label: "Estimate Scheduled" },
    { value: "estimate_sent", label: "Estimate Sent" },
    { value: "sold", label: "Sold" },
  ];

  return (
    <div className="space-y-3">
      {/* Search / locate bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setSearchError(null); }}
          placeholder="Search address or place…"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d1b471]"
        />
        <button
          type="submit"
          disabled={searchLoading || !searchQuery.trim()}
          className="px-4 py-2 rounded-lg text-black text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: "#d1b471" }}
        >
          {searchLoading ? "…" : "Search"}
        </button>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={geoLoading}
          title="Use my current location"
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-sm disabled:opacity-50 shadow-sm"
        >
          {geoLoading ? "…" : "📍 My Location"}
        </button>
      </form>
      {searchError && (
        <p className="text-xs text-red-500">{searchError}</p>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
            {status.replace("_", " ")}
          </span>
        ))}
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="rounded-xl border border-gray-200 shadow-sm"
        style={{ height: "calc(100vh - 260px)", minHeight: "480px" }}
      />

      <p className="text-xs text-gray-400 text-center">
        Click anywhere on the map to record a door knock at that location
      </p>

      {/* Door Knock Lightbox */}
      {clickCoords && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={() => setClickCoords(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Record Door Knock</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  A new lead will be created at this location
                </p>
              </div>
              <button
                onClick={() => setClickCoords(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none -mt-1"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-700 flex items-center gap-2">
              <span className="text-base">📍</span>
              <span>
                {clickCoords.lat.toFixed(5)}, {clickCoords.lng.toFixed(5)}
              </span>
            </div>

            {/* Contact info */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600">Contact Info <span className="font-normal text-gray-400">(optional)</span></p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="First name"
                  value={knockFirstName}
                  onChange={(e) => setKnockFirstName(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d1b471]"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={knockLastName}
                  onChange={(e) => setKnockLastName(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d1b471]"
                />
              </div>
              <input
                type="tel"
                placeholder="Phone"
                value={knockPhone}
                onChange={(e) => setKnockPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d1b471]"
              />
              <input
                type="email"
                placeholder="Email"
                value={knockEmail}
                onChange={(e) => setKnockEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d1b471]"
              />
              <input
                type="text"
                placeholder="Sales Rep"
                value={knockRep}
                onChange={(e) => setKnockRep(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d1b471]"
              />
              <input
                type="text"
                placeholder="Address"
                value={knockAddress}
                onChange={(e) => setKnockAddress(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d1b471]"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">What happened?</p>
              <div className="relative">
                <select
                  value={knockStatus}
                  onChange={(e) => setKnockStatus(e.target.value as typeof knockStatus)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#d1b471] pr-8"
                  style={{ borderColor: STATUS_COLORS[knockStatus], backgroundColor: STATUS_COLORS[knockStatus] + "12" }}
                >
                  {KNOCK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <span
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[knockStatus] }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDoorKnock}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-black text-sm font-semibold disabled:opacity-60 transition-opacity"
                style={{ backgroundColor: "#d1b471" }}
              >
                {saving ? "Saving…" : "Record Door Knock"}
              </button>
              <button
                onClick={() => setClickCoords(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
