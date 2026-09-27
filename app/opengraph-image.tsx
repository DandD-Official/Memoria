import { ImageResponse } from "next/og";
export const alt = "Memoria — Capture. Connect. Remember.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", background: "#f7f7ef", color: "#22312b", padding: 64, flexDirection: "column", justifyContent: "space-between" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}><svg width="62" height="62" viewBox="0 0 36 36" fill="none" stroke="#22312b" strokeWidth="2.2" strokeLinecap="round"><path d="M6 26V13a6 6 0 0 1 12 0v10a4 4 0 0 1-8 0v-6a4 4 0 0 1 8 0v6a4 4 0 0 0 8 0V13a6 6 0 0 0-12 0v13" /><circle cx="30" cy="27" r="2.5" fill="#22312b" stroke="none" /></svg><span style={{ fontSize: 36 }}>Memoria</span></div>
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}><div style={{ display: "flex", fontSize: 78, fontWeight: 700, letterSpacing: -4, lineHeight: 1.05, maxWidth: 1000 }}>A home for what you learn.</div><div style={{ display: "flex", fontSize: 27, color: "#52645a", maxWidth: 950 }}>Notes, diagrams, study guides, and shared workspaces.</div></div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid #ced7c9", paddingTop: 28 }}><span style={{ fontSize: 21, letterSpacing: 4 }}>CAPTURE / CONNECT / REMEMBER</span><div style={{ display: "flex", width: 130, height: 16, background: "#c5df75", borderRadius: 8 }} /></div>
  </div>, size);
}
