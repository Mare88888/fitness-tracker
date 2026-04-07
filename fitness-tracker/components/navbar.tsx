const navLinks = [
  { label: "Dashboard", href: "#" },
  { label: "Workouts", href: "#" },
  { label: "History", href: "#" },
];

export function Navbar() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="text-lg font-semibold text-zinc-900">Fitness Tracker</div>
        <ul className="flex items-center gap-6 text-sm font-medium text-zinc-600">
          {navLinks.map((link) => (
            <li key={link.label}>
              <a className="transition hover:text-zinc-900" href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
