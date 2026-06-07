"use client";

import { useState } from "react";
import type { AppUser, UserRole } from "@/lib/types";

export default function UserManager({ initialUsers }: { initialUsers: AppUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("rep");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          display_name: displayName,
          password,
          role,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Unable to create user");
      }

      const created = (await res.json()) as AppUser;
      setUsers((prev) => [...prev, created]);
      setUsername("");
      setDisplayName("");
      setPassword("");
      setRole("rep");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to create user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Create User</h2>
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Display Name</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Temporary Password</label>
            <input
              type="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="rep">Sales Rep</option>
              <option value="owner">Owner</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          style={{ backgroundColor: "#d1b471" }}
        >
          {saving ? "Creating..." : "Create User"}
        </button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Users</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                <th className="px-2 py-2">Display Name</th>
                <th className="px-2 py-2">Username</th>
                <th className="px-2 py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100">
                  <td className="px-2 py-2 text-gray-800">{user.display_name}</td>
                  <td className="px-2 py-2 text-gray-600">{user.username}</td>
                  <td className="px-2 py-2 text-gray-600">{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
