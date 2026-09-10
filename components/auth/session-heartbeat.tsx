"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

// Keep revocation responsive after another session is logged out without
// adding a request on every render or keystroke.
const HEARTBEAT_INTERVAL_MS = 15_000;

export function SessionHeartbeat() {
  const signingOut = useRef(false);

  useEffect(() => {
    const heartbeat = async () => {
      if (document.visibilityState !== "visible" || signingOut.current) return;

      try {
        const response = await fetch("/api/sessions/heartbeat", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });

        // The server removes a revoked session from active_sessions. The JWT
        // callback then reports 401 on the next heartbeat; make that visible
        // to the user instead of leaving a dead tab looking authenticated.
        if (response.status === 401) {
          signingOut.current = true;
          await signOut({ callbackUrl: "/login" });
        }
      } catch {
        // A transient network failure should not sign the user out. The next
        // heartbeat will retry.
      }
    };

    void heartbeat();
    const interval = window.setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", heartbeat);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, []);

  return null;
}
