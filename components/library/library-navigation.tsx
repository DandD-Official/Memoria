import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

export function LibraryNavigation({ basePath, page, hasNext }: { basePath: string; page: number; hasNext: boolean }) {
  if (page === 1 && !hasNext) return null;
  return (
    <nav aria-label="Library pages" className="flex items-center justify-between gap-3 border-t border-line pt-4 sm:justify-end">
      <span className="text-xs text-ink-faint sm:mr-auto">Page {page}</span>
      <Link aria-disabled={page <= 1} href={page <= 2 ? basePath : `${basePath}?page=${page - 1}`} className={buttonStyles({ variant: "outline", size: "sm" })}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
      </Link>
      <Link aria-disabled={!hasNext} href={`${basePath}?page=${page + 1}`} className={buttonStyles({ variant: "outline", size: "sm" })}>
        Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </nav>
  );
}
