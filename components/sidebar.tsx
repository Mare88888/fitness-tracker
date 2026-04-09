"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sidebarItems = [
  { label: "Dashboard", href: "/" },
  { label: "Workouts", href: "/workouts/start" },
  { label: "History", href: "/history" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 md:flex md:flex-col">
      <div className="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Fitness Tracker</h2>
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
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
