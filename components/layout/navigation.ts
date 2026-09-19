import { Archive, Bell, BookOpen, FileText, GraduationCap, House, Layers3, LineChart, ListChecks, Search, Settings, Share2, Star, Workflow, type LucideIcon } from "lucide-react";

export interface NavigationItem { href: string; label: string; shortLabel?: string; icon: LucideIcon }
export interface NavigationGroup { label: string; items: NavigationItem[] }
export const primaryNavigation: NavigationItem[] = [
  { href: "/dashboard", label: "Desk", icon: House },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/study", label: "Practice", icon: GraduationCap },
  { href: "/books", label: "Together", icon: Share2 },
];
export const libraryNavigation: NavigationItem[] = [
  { href: "/library", label: "Everything", icon: BookOpen },
  { href: "/notes", label: "Source notes", icon: FileText },
  { href: "/reviewers", label: "Study guides", icon: Layers3 },
  { href: "/diagrams", label: "Diagrams", icon: Workflow },
  { href: "/quizzes", label: "Quizzes & exams", icon: ListChecks },
  { href: "/favorites", label: "Favorites", icon: Star },
  { href: "/archive", label: "Archive", icon: Archive },
];
export const navigationGroups: NavigationGroup[] = [
  { label: "Workspace", items: primaryNavigation },
  { label: "Knowledge library", items: libraryNavigation.slice(1) },
  { label: "Your learning", items: [{ href: "/progress", label: "Learning progress", icon: LineChart }, { href: "/shared", label: "Shared with me", icon: Share2 }] },
];
export const togetherNavigation: NavigationItem[] = [
  { href: "/books", label: "Books & study spaces", icon: BookOpen },
  { href: "/shared", label: "Shared with me", icon: Share2 },
];
export const utilityNavigation: NavigationItem[] = [{ href: "/settings", label: "Preferences & account", icon: Settings }];
export const mobilePrimaryNavigation = primaryNavigation;
export const mobileMoreNavigation: NavigationItem[] = [{ href: "/search", label: "Search everything", icon: Search }, { href: "/notifications", label: "Notifications", icon: Bell }, ...navigationGroups.flatMap(group => group.items).filter(item => !primaryNavigation.includes(item)), ...utilityNavigation];
export function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/library") return libraryNavigation.some(item => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (href === "/books") return pathname.startsWith("/books") || pathname.startsWith("/shared");
  if (href === "/study") return pathname.startsWith("/study") || pathname.startsWith("/progress");
  return pathname === href || pathname.startsWith(`${href}/`);
}
