"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readDefaultTableView, saveDefaultTableView, TABLE_VIEW_STORAGE_KEY, type TableView } from "@/lib/table-view";

interface TableViewContextValue {
  defaultTableView: TableView;
  setDefaultTableView: (view: TableView) => boolean;
}

export const TableViewContext = createContext<TableViewContextValue>({
  defaultTableView: "scroll",
  setDefaultTableView: () => false,
});

export function TableViewProvider({ children }: { children: React.ReactNode }) {
  const [defaultTableView, setView] = useState<TableView>("scroll");
  useEffect(() => {
    setView(readDefaultTableView());
    const sync = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage && (event.key === TABLE_VIEW_STORAGE_KEY || event.key === null)) setView(readDefaultTableView());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const setDefaultTableView = useCallback((view: TableView) => {
    setView(view);
    return saveDefaultTableView(view);
  }, []);
  const value = useMemo(() => ({ defaultTableView, setDefaultTableView }), [defaultTableView, setDefaultTableView]);
  return <TableViewContext.Provider value={value}>{children}</TableViewContext.Provider>;
}

export function useDefaultTableView() {
  return useContext(TableViewContext);
}
