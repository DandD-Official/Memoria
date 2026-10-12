"use client";

import { signOut as nextAuthSignOut } from "next-auth/react";
import { lockOffline } from "@/lib/offline/client";

export async function signOut(options: { callbackUrl: string }) {
  await lockOffline();
  if (navigator.onLine) await nextAuthSignOut(options);
  else window.location.replace("/login?offline=1");
}
