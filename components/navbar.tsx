"use client";

import { clearAuthToken, getAuthUsername } from "@/lib/auth/token";
import { logout } from "@/lib/services/auth-service";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Workouts", href: "/workouts/start" },
  { label: "History", href: "/history" },
  { label: "Routines", href: "/routines" },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileInitial, setProfileInitial] = useState("P");
  const [isDarkApplied, setIsDarkApplied] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const applyThemeToDom = (mode: "light" | "dark" | "system") => {
    if (typeof window === "undefined") {
      return;
    }
    const root = window.document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = mode === "dark" || (mode === "system" && prefersDark);
    root.classList.toggle("dark", shouldUseDark);
    window.localStorage.setItem("fitness_theme_mode", mode);
    return shouldUseDark;
  };

  const applyTheme = (mode: "light" | "dark" | "system") => {
    const darkApplied = applyThemeToDom(mode);
    setIsDarkApplied(darkApplied);
  };

  useEffect(() => {
    const syncAuthState = () => {
      const username = getAuthUsername();
      setIsAuthenticated(Boolean(username));
      setProfileInitial(username?.trim().charAt(0).toUpperCase() || "P");
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsDrawerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setIsDrawerOpen(false);
      }
    };

    const initialSyncTimeout = window.setTimeout(syncAuthState, 0);
    const savedTheme = window.localStorage.getItem("fitness_theme_mode");
    let darkApplied: boolean;
    if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
      darkApplied = applyThemeToDom(savedTheme);
    } else {
      darkApplied = applyThemeToDom("system");
    }
    const initialThemeTimeout = window.setTimeout(() => setIsDarkApplied(darkApplied), 0);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      const currentMode = window.localStorage.getItem("fitness_theme_mode");
      if (currentMode === "system") {
        const currentDarkApplied = applyThemeToDom("system");
        setIsDarkApplied(currentDarkApplied);
      }
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("storage", syncAuthState);
    window.addEventListener("fitness-auth-changed", syncAuthState);
    return () => {
      window.clearTimeout(initialSyncTimeout);
      window.clearTimeout(initialThemeTimeout);
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("fitness-auth-changed", syncAuthState);
    };
  }, []);

  const handleLogout = async () => {
    await logout().catch(() => {
      clearAuthToken();
    });
    setIsAuthenticated(false);
    setProfileInitial("P");
    setIsMenuOpen(false);
    setIsDrawerOpen(false);
    router.push("/auth/login");
  };

  return (
    <header className="relative z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <nav className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => setIsDrawerOpen((previous) => !previous)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Toggle navigation menu"
            aria-expanded={isDrawerOpen}
            aria-controls="mobile-nav-drawer"
          >
            Menu
          </button>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Fitness Tracker
          </div>
        </div>
        <div className="hidden text-lg font-semibold text-zinc-900 dark:text-zinc-100 md:block">
          Fitness Tracker
        </div>
        <div className="relative ml-auto" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((previous) => !previous)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            aria-label="Open profile menu"
            aria-expanded={isMenuOpen}
            aria-controls="profile-menu"
          >
            {profileInitial}
          </button>
          {isMenuOpen && (
            <div
              id="profile-menu"
              className="absolute right-0 z-50 mt-2 w-52 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            >
              <button
                type="button"
                onClick={() => applyTheme(isDarkApplied ? "light" : "dark")}
                className="block w-full rounded px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                {isDarkApplied ? "Switch to light mode" : "Switch to dark mode"}
              </button>
              <button
                type="button"
                onClick={() => applyTheme("system")}
                className="block w-full rounded px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                Use system theme
              </button>
              <Link
                href="/settings"
                onClick={() => setIsMenuOpen(false)}
                className="block rounded px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                Settings
              </Link>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  Login
                </Link>
              )}
            </div>
          )}
        </div>
      </nav>
      {isDrawerOpen && (
        <div className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
          <nav id="mobile-nav-drawer" ref={drawerRef} aria-label="Mobile navigation">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setIsDrawerOpen(false)}
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
        </div>
      )}
    </header>
  );
}
