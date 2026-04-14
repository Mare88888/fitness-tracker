"use client";

import { Navbar } from "@/components/navbar";
import { PageContainer } from "@/components/page-container";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmModal } from "@/components/ui/confirm-modal";
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
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Routines & Templates</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                View your saved templates and weekly routine assignments.
              </p>

              {isLoading ? (
                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading routines...</p>
              ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Templates</h2>
                    {templates.length === 0 ? (
                      <EmptyState
                        title="No templates yet"
                        description="Create templates on the Start Workout page."
                      />
                    ) : (
                      <ul className="mt-2 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                        {templates.map((template) => (
                          <li
                            key={template.id}
                            className="rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>
                                {template.name} ({template.exercises.length} exercise(s))
                              </span>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/routines/templates/${template.id}`}
                                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                >
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => setTemplatePendingDelete(template)}
                                  className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40"
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

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Weekly plan</h2>
                    {weeklyPlan.length === 0 ? (
                      <EmptyState
                        title="No weekly plan yet"
                        description="Assign templates to days on the Start Workout page."
                      />
                    ) : (
                      <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {weeklyPlan.map((entry) => (
                          <li key={entry.id}>
                            {dayLabels[entry.dayOfWeek] ?? `Day ${entry.dayOfWeek}`}: {entry.templateName}
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
