import { redirect } from "next/navigation";

export default function OfflinePage() {
  redirect("/login?offline=1");
}
