import { Archive, Bell, BookOpen, FileText, GraduationCap, LayoutDashboard, Layers3, ListChecks, Search, Settings, Share2, Star, Workflow, type LucideIcon } from "lucide-react";

export interface NavigationItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
      { href: "/notes", label: "Memories", icon: FileText },
      { href: "/books", label: "Books", icon: BookOpen },
      { href: "/favorites", label: "Favorites", icon: Star },
    ],
  },
  {
    label: "Study",
    items: [
      { href: "/reviewers", label: "Reviewers", icon: Layers3 },
      { href: "/quizzes", label: "Quizzes", icon: ListChecks },
      { href: "/study", label: "Study", icon: GraduationCap },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/diagrams", label: "Diagrams", icon: Workflow },
      { href: "/shared", label: "Shared with Me", icon: Share2 },
    ],
  },
];

export const utilityNavigation: NavigationItem[] = [
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const mobilePrimaryNavigation: NavigationItem[] = [
  navigationGroups[0].items[0],
  navigationGroups[0].items[1],
  navigationGroups[0].items[2],
  navigationGroups[1].items[2],
];

export const mobileMoreNavigation: NavigationItem[] = [
  navigationGroups[0].items[3],
  navigationGroups[1].items[0],
  navigationGroups[1].items[1],
  navigationGroups[2].items[0],
  navigationGroups[2].items[1],
  { href: "/search", label: "Search", icon: Search },
  { href: "/notifications", label: "Notifications", icon: Bell },
  ...utilityNavigation,
];

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
