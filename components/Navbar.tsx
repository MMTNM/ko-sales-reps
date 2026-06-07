"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "All Leads" },
  { href: "/map", label: "Map" },
  { href: "/leads/new", label: "+ New Lead" },
  { href: "/users", label: "Users" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-black text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-wide" style={{ color: "#d1b471" }}>
            KO Roofing
          </span>
          <span className="text-sm text-gray-400 hidden sm:inline">Sales App</span>
        </Link>
        <div className="flex items-center gap-2">
        <ul className="flex gap-1">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    active ? "text-black" : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                  style={active ? { backgroundColor: "#d1b471" } : {}}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
          <button
            type="button"
            onClick={logout}
            className="px-3 py-1.5 rounded text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
