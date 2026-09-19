"use client";
import { Dialog } from "@/components/ui/dialog";
export function Sheet({ open, onOpenChange, title, description, children, className }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: React.ReactNode; className?: string }) {
  return <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description} placement="side" className={className}>{children}</Dialog>;
}
