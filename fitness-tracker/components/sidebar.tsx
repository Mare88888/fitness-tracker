const sidebarItems = [
  { label: "Dashboard", href: "#" },
  { label: "Workouts", href: "#" },
  { label: "History", href: "#" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white md:flex md:flex-col">
      <div className="border-b border-zinc-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-zinc-900">Fitness Tracker</h2>
      </div>
      <nav className="px-4 py-4">
        <ul className="space-y-1">
          {sidebarItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
