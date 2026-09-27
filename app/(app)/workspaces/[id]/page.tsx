import type { Metadata } from "next";
import { WorkspaceDetail } from "@/components/workspaces/workspace-detail";
export const metadata: Metadata = { title: "Shared workspace | Memoria", robots: { index: false, follow: false } };
export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) { return <WorkspaceDetail id={(await params).id} />; }
