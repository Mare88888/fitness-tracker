import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { APP_NAME } from "@/lib/constants";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {APP_NAME} Dashboard
              </h1>
              <div className="mt-4">
                <EmptyState
                  title="Dashboard widgets coming soon"
                  description="You can already create workouts, browse history, and manage authentication."
                  actionLabel="Start workout"
                  actionHref="/workouts/start"
                />
              </div>
            </section>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
