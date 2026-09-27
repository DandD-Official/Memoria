import { MemoryMark } from "@/components/layout/brand";
import { LoadingState } from "@/components/ui/loading-state";
export default function Loading() { return <div className="mx-auto min-h-dvh max-w-4xl px-page py-16"><div className="flex items-center gap-4"><MemoryMark className="h-12 w-12" /><p className="font-display text-2xl">Opening Memoria</p></div><LoadingState variant="page" label="Loading Memoria" /></div>; }
