"use client";

import { cloneElement, isValidElement, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface ConfirmDialogProps {
  trigger: React.ReactElement<{ onClick?: React.MouseEventHandler }>;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({ trigger, title, description, confirmLabel = "Confirm", destructive, onConfirm }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderedTrigger = isValidElement(trigger)
    ? cloneElement(trigger, {
        onClick: (event: React.MouseEvent) => {
          trigger.props.onClick?.(event);
          if (!event.defaultPrevented) { setError(null); setOpen(true); }
        },
      })
    : trigger;

  return <>
    {renderedTrigger}
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!loading) setOpen(next); }}
      title={title}
      description={description}
      className="max-w-sm"
      footer={<>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
        <Button
          variant={destructive ? "danger" : "primary"}
          loading={loading}
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              await onConfirm();
              setOpen(false);
            } catch {
              setError("That action could not be completed. Please try again.");
            } finally {
              setLoading(false);
            }
          }}
        >
          {confirmLabel}
        </Button>
      </>}
    >
      {error ? <p className="rounded-control border border-danger/25 bg-danger/5 p-3 text-sm text-danger" role="alert">{error}</p> : <span className="sr-only">Choose cancel to return without making changes.</span>}
    </Dialog>
  </>;
}
