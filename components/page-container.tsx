import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
};

export function PageContainer({ children }: PageContainerProps) {
  return <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</main>;
}
