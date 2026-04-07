import { Navbar } from "@/components/navbar";
import { APP_NAME } from "@/lib/constants";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">{APP_NAME} Dashboard</h1>
          <p className="mt-2 text-zinc-600">
            Placeholder dashboard. Upcoming: log workouts, track sets/reps, rest timer, and history.
          </p>
        </section>
      </main>
    </div>
  );
}
