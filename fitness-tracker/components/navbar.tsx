const navItems = [
  { label: "Dashboard", href: "#" },
  { label: "Workouts", href: "#" },
  { label: "History", href: "#" },
];

export function Navbar() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="flex items-center justify-between px-4 py-4 sm:px-6 md:justify-end">
        <div className="text-lg font-semibold text-zinc-900 md:hidden">Fitness Tracker</div>
        <ul className="flex items-center gap-4 text-sm font-medium text-zinc-600 sm:gap-6 md:hidden">
          {navItems.map((item) => (
            <li key={item.label}>
              <a className="transition hover:text-zinc-900" href={item.href}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
