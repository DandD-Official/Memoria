export type TableView = "scroll" | "fit";
export const TABLE_VIEW_STORAGE_KEY = "memora-default-table-view";

export function isTableView(value: string | null): value is TableView {
  return value === "scroll" || value === "fit";
}

export function readDefaultTableView(): TableView {
  if (typeof window === "undefined") return "scroll";
  try {
    const stored = window.localStorage.getItem(TABLE_VIEW_STORAGE_KEY);
    return isTableView(stored) ? stored : "scroll";
  } catch {
    return "scroll";
  }
}

export function saveDefaultTableView(view: TableView): boolean {
  try {
    window.localStorage.setItem(TABLE_VIEW_STORAGE_KEY, view);
    return true;
  } catch {
    return false;
  }
}
