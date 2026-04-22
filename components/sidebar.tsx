"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/constants";

const sidebarItems = [
  { label: "Dashboard", href: "/" },
  { label: "Workouts", href: "/workouts/start" },
  { label: "Exercise Library", href: "/exercises" },
  { label: "Progress", href: "/progress" },
  { label: "History", href: "/history" },
  { label: "Routines", href: "/routines" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-800 bg-zinc-950/90 backdrop-blur md:flex md:flex-col">
      <div className="border-b border-zinc-800 px-6 py-5">
        <h2 className="text-lg font-semibold text-emerald-300">{APP_NAME}</h2>
      </div>
      <nav className="px-4 py-4">
        <ul className="space-y-1">
          {sidebarItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                  pathname === item.href
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-emerald-300"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
