"use client";

import { clearAuthToken, getAuthUsername } from "@/lib/auth/token";
import { logout } from "@/lib/services/auth-service";
import { APP_NAME } from "@/lib/constants";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Workouts", href: "/workouts/start" },
  { label: "Exercise Library", href: "/exercises" },
  { label: "Calendar", href: "/calendar" },
  { label: "Progress", href: "/progress" },
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
      return false;
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
    <header className="relative z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <nav className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => setIsDrawerOpen((previous) => !previous)}
            className="btn btn-secondary px-2 py-1"
            aria-label="Toggle navigation menu"
            aria-expanded={isDrawerOpen}
            aria-controls="mobile-nav-drawer"
          >
            Menu
          </button>
          <div className="text-lg font-semibold text-emerald-300">{APP_NAME}</div>
        </div>
        <div className="relative ml-auto" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((previous) => !previous)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-700 bg-zinc-900 text-sm font-semibold text-emerald-200 transition hover:bg-zinc-800"
            aria-label="Open profile menu"
            aria-expanded={isMenuOpen}
            aria-controls="profile-menu"
          >
            {profileInitial}
          </button>
          {isMenuOpen && (
            <div
              id="profile-menu"
              className="absolute right-0 z-50 mt-2 w-52 rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-lg"
            >
              <button
                type="button"
                onClick={() => applyTheme(isDarkApplied ? "light" : "dark")}
                className="btn btn-ghost block w-full justify-start px-3 py-2 text-left"
              >
                {isDarkApplied ? "Switch to light mode" : "Switch to dark mode"}
              </button>
              <button
                type="button"
                onClick={() => applyTheme("system")}
                className="btn btn-ghost block w-full justify-start px-3 py-2 text-left"
              >
                Use system theme
              </button>
              <Link
                href="/settings"
                onClick={() => setIsMenuOpen(false)}
                className="btn btn-ghost block w-full justify-start px-3 py-2"
              >
                Settings
              </Link>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-ghost block w-full justify-start px-3 py-2 text-left"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="btn btn-ghost block w-full justify-start px-3 py-2"
                >
                  Login
                </Link>
              )}
            </div>
          )}
        </div>
      </nav>
      {isDrawerOpen && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 md:hidden">
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
        </div>
      )}
    </header>
  );
}
