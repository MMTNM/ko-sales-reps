"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface Props {
  reps: string[];
}

export default function DashboardFilters({ reps }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const rep = searchParams.get("rep") ?? "";

  const hasFilters = from || to || rep;

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => update("from", e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d1b471] bg-white"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => update("to", e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d1b471] bg-white"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Sales Rep</label>
        <select
          value={rep}
          onChange={(e) => update("rep", e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d1b471] bg-white min-w-[140px]"
        >
          <option value="">All reps</option>
          {reps.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      {hasFilters && (
        <button
          onClick={clearAll}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors self-end"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
