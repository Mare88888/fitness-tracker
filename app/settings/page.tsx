import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
              <p className="mt-2 text-sm text-zinc-600">
                Account and app settings will be available here.
              </p>
            </section>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
