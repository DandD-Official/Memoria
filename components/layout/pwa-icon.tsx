export function PwaIcon({ size = 512 }: { size?: number }) {
  return <div style={{ alignItems: "center", background: "#f6f6ef", border: `${Math.max(1, Math.round(size / 180))}px solid #d9dfd2`, color: "#22312b", display: "flex", height: size, justifyContent: "center", position: "relative", width: size }}>
    <span style={{ fontFamily: "Georgia, serif", fontSize: Math.round(size * 0.62), fontWeight: 500, lineHeight: 1, marginTop: -Math.round(size * 0.04) }}>M</span>
    <span style={{ background: "#22312b", borderRadius: "50%", bottom: `${Math.round(size * 0.24)}px`, height: `${Math.round(size * 0.09)}px`, position: "absolute", right: `${Math.round(size * 0.21)}px`, width: `${Math.round(size * 0.09)}px` }} />
  </div>;
}
