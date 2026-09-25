"use client";

import { useEffect, useState } from "react";
import { Cloud, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";

type Provider = "google" | "notion";
export interface IntegrationStatusResponse {
  connections: Array<{ provider: Provider; metadata?: { email?: string; workspaceName?: string } | null }>;
  configured: Record<Provider, boolean>;
}

export function IntegrationConnections({ initialData }: { initialData: IntegrationStatusResponse }) {
  const [data, setData] = useState<IntegrationStatusResponse>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const failure = params.get("integration_error");
    if (connected === "google" || connected === "notion") setNotice(`${connected === "google" ? "Google Drive" : "Notion"} connected. You can now import your documents.`);
    if (failure) {
      const reason = failure.replace(/^(google|notion)_/, "");
      setError(({
        denied: "Connection cancelled. You can try again whenever you're ready.",
        invalid_state: "This connection request expired or belongs to another session. Select Connect again.",
        scope: "Google Drive access was not granted. Reconnect and allow access to selected files.",
        not_configured: "This connection is not available yet. The site owner needs to finish setup.",
      } as Record<string, string>)[reason] || "The account could not be connected. Try again, or ask the site owner to check the OAuth configuration.");
    }
    if (connected || failure) {
      params.delete("connected"); params.delete("integration_error");
      window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}#connections`);
    }
  }, []);

  async function load() {
    const response = await fetch("/api/integrations", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.connections && payload?.configured) setData(payload);
    else setError(payload?.error ?? "Couldn't load connections.");
  }

  async function disconnect(provider: Provider) {
    setBusy(provider);
    setError(null);
    try {
      const response = await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? `Couldn't disconnect ${provider}.`);
      }
      await load();
      if (response.ok) setNotice("Account disconnected from Memoria. Imported notes are still available. You can also remove Memoria in your provider's connected-app settings.");
    } catch { setError("Couldn't reach the server. Please try again."); }
    finally { setBusy(null); }
  }

  return (
    <section id="connections" className="card mt-5 scroll-mt-24 p-5">
      <div className="mb-3 flex items-center gap-2"><Cloud className="h-5 w-5 text-accent" /><h2 className="font-display text-xl text-ink">Connected accounts</h2></div>
      <p className="mb-4 text-sm text-ink-soft">Connect your own Drive or Notion workspace. Credentials are encrypted and available only to your Memoria account.</p>
      <div className="space-y-3">
        {(["google", "notion"] as const).map((provider) => {
          const connection = data.connections.find((item) => item.provider === provider);
          const label = provider === "google" ? "Google Drive" : "Notion";
          const detail = connection?.metadata?.email || connection?.metadata?.workspaceName;
          return (
            <div key={provider} className="flex flex-col items-start justify-between gap-4 rounded-lg border border-line p-4 sm:flex-row sm:items-center">
              <div className="min-w-0"><p className="text-sm font-semibold text-ink">{label}</p><p className="break-words text-xs text-ink-soft">{connection ? detail || "Connected" : data.configured[provider] === false ? "The site owner needs to finish connection setup." : "Not connected"}</p><p className="mt-1 text-xs text-ink-soft">{provider === "google" ? "Import Google Docs you select in Drive." : "Import pages you choose to share from your workspace."}</p></div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">{connection && <Button variant="ghost" size="sm" disabled={busy !== null || !data.configured[provider]} onClick={() => { window.location.href = `/api/integrations/${provider}/connect`; }}>Reconnect</Button>}
              {connection ? <Button variant="outline" size="sm" disabled={busy !== null} loading={busy === provider} onClick={() => void disconnect(provider)}><Unlink className="h-3.5 w-3.5" /> Disconnect</Button> : <Button size="sm" disabled={!data.configured[provider]} onClick={() => { window.location.href = `/api/integrations/${provider}/connect`; }}><Link2 className="h-3.5 w-3.5" /> Connect</Button>}</div>
            </div>
          );
        })}
      </div>
      {notice && <p role="status" className="motion-panel mt-3 text-sm text-success">{notice}</p>}
      {error && <p role="alert" className="motion-panel mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
