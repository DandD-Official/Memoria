import type { Metadata } from "next";
import { WorkspaceList } from "@/components/workspaces/workspace-list";
export const metadata: Metadata = { title: "Workspaces | Memoria", robots: { index: false, follow: false } };
export default function WorkspacesPage() { return <WorkspaceList />; }
