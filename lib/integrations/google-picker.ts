"use client";

export interface PickedDocument { id: string; name: string; url?: string }
interface PickerInstance { setVisible(visible: boolean): void; dispose(): void }
interface PickerView { setMimeTypes(types: string): PickerView; setMode(mode: string): PickerView }
interface PickerBuilder {
  setAppId(value: string): PickerBuilder;
  setDeveloperKey(value: string): PickerBuilder;
  setOAuthToken(value: string): PickerBuilder;
  setOrigin(value: string): PickerBuilder;
  addView(value: PickerView): PickerBuilder;
  setCallback(callback: (data: { action: string; docs?: PickedDocument[] }) => void): PickerBuilder;
  build(): PickerInstance;
}
interface PickerApi {
  DocsView: new () => PickerView;
  DocsViewMode: { LIST: string };
  PickerBuilder: new () => PickerBuilder;
  Action: { PICKED: string; CANCEL: string };
}
type GoogleWindow = Window & {
  gapi?: { load(name: string, options: { callback: () => void; onerror: () => void; timeout: number; ontimeout: () => void }): void };
  google?: { picker?: PickerApi };
};
let loading: Promise<PickerApi> | undefined;
function loadPicker(): Promise<PickerApi> {
  const host = window as GoogleWindow;
  if (host.google?.picker) return Promise.resolve(host.google.picker);
  if (loading) return loading;
  loading = new Promise<PickerApi>((resolve, reject) => {
    const timeout = window.setTimeout(() => fail(), 20_000);
    const fail = () => { clearTimeout(timeout); reject(new Error("Google Picker could not load. Check your connection and try again.")); };
    const ready = () => host.gapi?.load("picker", {
      callback: () => { clearTimeout(timeout); host.google?.picker ? resolve(host.google.picker) : fail(); },
      onerror: fail, timeout: 15_000, ontimeout: fail,
    });
    if (host.gapi) { ready(); return; }
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onload = ready;
    script.onerror = () => { script.remove(); fail(); };
    document.head.appendChild(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}

/** User chooses one Google Doc; cancellation is a normal, empty result. */
export async function pickGoogleDocument(): Promise<PickedDocument | null> {
  const response = await fetch("/api/integrations/google/picker", { method: "POST", cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Google Drive could not be opened.");
  const api = await loadPicker();
  return new Promise(resolve => {
    const picker = new api.PickerBuilder()
      .setAppId(data.appId).setDeveloperKey(data.apiKey).setOAuthToken(data.accessToken)
      .setOrigin(window.location.origin)
      .addView(new api.DocsView().setMimeTypes("application/vnd.google-apps.document").setMode(api.DocsViewMode.LIST))
      .setCallback(result => {
        if (result.action !== api.Action.PICKED && result.action !== api.Action.CANCEL) return;
        picker.setVisible(false);
        picker.dispose();
        resolve(result.action === api.Action.PICKED ? result.docs?.[0] ?? null : null);
      }).build();
    picker.setVisible(true);
  });
}
