"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/constants";
import { deleteTemplate, getTemplates, getWeeklyPlan } from "@/lib/services/template-service";
import Link from "next/link";
import type { WorkoutTemplate } from "@/types/template";
import type { WeeklyPlan } from "@/types/weekly-plan";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const dayLabels: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export default function RoutinesPage() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [templatePendingDelete, setTemplatePendingDelete] = useState<WorkoutTemplate | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [templateData, weeklyPlanData] = await Promise.all([getTemplates(), getWeeklyPlan()]);
        setTemplates(templateData);
        setWeeklyPlan(weeklyPlanData);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load routines.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const handleDeleteTemplate = async () => {
    if (!templatePendingDelete) return;
    try {
      await deleteTemplate(templatePendingDelete.id);
      setTemplates((prev) => prev.filter((template) => template.id !== templatePendingDelete.id));
      setWeeklyPlan((prev) => prev.filter((entry) => entry.templateId !== templatePendingDelete.id));
      toast.success("Template deleted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete template.";
      toast.error(message);
    } finally {
      setTemplatePendingDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar />
          <PageContainer>
            <section className="surface-page">
              <div className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">{APP_NAME}</p>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Routines & templates</h1>
                <p className="max-w-xl text-sm text-zinc-400">Templates and weekly slots.</p>
              </div>

              {isLoading ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <Skeleton className="h-56 w-full rounded-xl border border-zinc-800/80" />
                  <Skeleton className="h-56 w-full rounded-xl border border-zinc-800/80" />
                </div>
              ) : (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="surface-card">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold tracking-wide text-zinc-100">Templates</h2>
                      <span className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300">
                        {templates.length}
                      </span>
                    </div>
                    {templates.length === 0 ? (
                      <EmptyState
                        title="No templates yet"
                        description="Create templates on the Start Workout page."
                      />
                    ) : (
                      <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                        {templates.map((template) => (
                          <li
                            key={template.id}
                            className="surface-soft border-zinc-700/50 px-3 py-2 transition-colors hover:border-zinc-600"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">
                                {template.name} ({template.exercises.length} exercise{template.exercises.length === 1 ? "" : "s"})
                              </span>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/routines/templates/${template.id}`}
                                  className="btn btn-secondary px-3 py-1.5 text-xs"
                                >
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => setTemplatePendingDelete(template)}
                                  className="btn btn-danger px-3 py-1.5 text-xs"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="surface-card">
                    <h2 className="text-sm font-semibold tracking-wide text-zinc-100">Weekly plan</h2>
                    {weeklyPlan.length === 0 ? (
                      <EmptyState
                        title="No weekly plan yet"
                        description="Assign templates to days on the Start Workout page."
                      />
                    ) : (
                      <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                        {weeklyPlan.map((entry) => (
                          <li
                            key={entry.id}
                            className="surface-soft border-zinc-700/50 px-3 py-2 transition-colors hover:border-zinc-600"
                          >
                            <span className="font-medium">{dayLabels[entry.dayOfWeek] ?? `Day ${entry.dayOfWeek}`}</span>:{" "}
                            {entry.templateName}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>
          </PageContainer>
        </div>
      </div>
      <ConfirmModal
        isOpen={templatePendingDelete !== null}
        title="Delete template?"
        description={
          templatePendingDelete
            ? `This will remove "${templatePendingDelete.name}" and any weekly plan assignment using it.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteTemplate}
        onCancel={() => setTemplatePendingDelete(null)}
      />
    </div>
  );
}
