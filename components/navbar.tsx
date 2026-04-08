"use client";

import { clearAuthToken, getAuthToken, getAuthUsername } from "@/lib/auth/token";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Workouts", href: "/workouts/start" },
  { label: "History", href: "/history" },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAuthToken()));
  const [profileInitial, setProfileInitial] = useState(() => {
    const username = getAuthUsername();
    return username?.trim().charAt(0).toUpperCase() || "P";
  });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleStorageChange = () => {
      setIsAuthenticated(Boolean(getAuthToken()));
      const username = getAuthUsername();
      setProfileInitial(username?.trim().charAt(0).toUpperCase() || "P");
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    setProfileInitial("P");
    setIsMenuOpen(false);
    router.push("/auth/login");
  };

  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="flex items-center justify-between px-4 py-4 sm:px-6 md:justify-end">
        <div className="text-lg font-semibold text-zinc-900 md:hidden">Fitness Tracker</div>
        <ul className="flex items-center gap-4 text-sm font-medium text-zinc-600 sm:gap-6 md:hidden">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link className="transition hover:text-zinc-900" href={item.href}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="relative ml-4" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((previous) => !previous)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
            aria-label="Open profile menu"
          >
            {profileInitial}
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 z-10 mt-2 w-44 rounded-md border border-zinc-200 bg-white p-1 shadow-lg">
              <Link
                href="/settings"
                onClick={() => setIsMenuOpen(false)}
                className="block rounded px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                Settings
              </Link>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
                >
                  Login
                </Link>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
