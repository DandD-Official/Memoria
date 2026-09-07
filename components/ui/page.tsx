import { cn } from "@/lib/utils";

export function PageShell({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("page-shell", className)} {...props} />;
}

export function PageHeader({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)} {...props} />;
}

export function PageHeaderContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("max-w-2xl", className)} {...props} />;
}

export function PageEyebrow({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("eyebrow mb-2", className)} {...props} />;
}

export function PageTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn("page-heading", className)} {...props} />;
}

export function PageDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft sm:text-base", className)} {...props} />;
}

export function PageActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end", className)} {...props} />;
}

export function SectionHeader({ title, description, action, className }: { title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        <h2 className="section-heading">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}
