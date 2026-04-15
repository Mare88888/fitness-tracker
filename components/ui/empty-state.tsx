import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="surface-soft border-dashed p-6 text-center">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="btn btn-primary mt-4 inline-block"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
