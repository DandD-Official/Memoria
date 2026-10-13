"use client";

import { useState } from "react";
import { Label } from "@/components/ui/input";
import { useDefaultTableView } from "@/components/markdown/table-view-context";
import { isTableView } from "@/lib/table-view";

export function TableViewSettings() {
  const { defaultTableView, setDefaultTableView } = useDefaultTableView();
  const [message, setMessage] = useState("");
  return <div className="mt-5">
    <Label htmlFor="default-table-view">Default table view</Label>
    <p id="default-table-view-description" className="mb-2 mt-1 text-xs text-ink-soft">Choose how tables open. You can still switch each table individually. Saved on this browser.</p>
    <select id="default-table-view" value={defaultTableView} aria-describedby="default-table-view-description" onChange={event => {
      const view = event.target.value;
      if (isTableView(view)) setMessage(setDefaultTableView(view) ? "Saved on this browser." : "Applied for this visit. Browser storage is unavailable.");
    }} className="min-h-11 w-full max-w-sm rounded-lg border border-line bg-surface px-3 text-sm text-ink">
      <option value="scroll">Scroll — keep text readable</option>
      <option value="fit">Fit to width — smaller text and wrapped columns</option>
    </select>
    <p className="mt-1 text-xs text-ink-faint" role="status">{message}</p>
  </div>;
}
