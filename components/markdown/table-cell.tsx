import { Fragment, type ReactNode } from "react";

/** AI commonly writes <br> inside GFM table cells. Raw HTML is deliberately
 * not enabled in Memoria, so render that small, harmless convention as real
 * line breaks without opening the door to arbitrary HTML. */
export function TableCellContent({ children }: { children: ReactNode }) {
  if (typeof children !== "string") return children;
  const parts = children.split(/<br\s*\/?>/gi);
  return parts.map((part, index) => <Fragment key={index}>{index > 0 && <br />}{part}</Fragment>);
}
