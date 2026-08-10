import { C, fonts, displayFont, cssAnimation, FLATMATES } from "../lib/constants";

export default function FlatmatePicker({ onSelect }) {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: `radial-gradient(ellipse at 30% 20%, #F9F0E4 0%, #EDE1D1 50%, #DDD0BC 100%)`,
      padding: 32, fontFamily: fonts, position: "relative", overflow: "hidden",
    }}>
      <style>{cssAnimation}</style>
      <div style={{
        position: "absolute", width: 340, height: 340, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.accent}08, transparent 70%)`,
        top: -60, right: -80, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 260, height: 260, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.green}06, transparent 70%)`,
        bottom: -40, left: -60, pointerEvents: "none",
      }} />
      <div style={{ animation: "fk-fadeUp 0.6s ease", position: "relative" }}>
        <div style={{ fontSize: 44, textAlign: "center", marginBottom: 8, animation: "fk-fadeUp 0.5s ease" }}>🍳</div>
        <h1 style={{
          fontFamily: displayFont, fontSize: 42, fontWeight: 400, color: C.text,
          margin: "0 0 4px", letterSpacing: "-0.02em", textAlign: "center", fontStyle: "italic",
        }}>Flat Kitchen</h1>
        <p style={{
          color: C.textMuted, fontSize: 15, margin: "0 0 48px",
          fontFamily: fonts, fontWeight: 500, textAlign: "center", letterSpacing: "0.02em",
        }}>Who's cooking tonight?</p>
      </div>
      <div style={{
        display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 300,
        animation: "fk-fadeUp 0.7s ease 0.1s both",
      }}>
        {FLATMATES.map((fm, i) => (
          <button key={fm.name} className="fk-picker-btn" onClick={() => onSelect(fm.name)} style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "18px 22px", borderRadius: 18, border: `1.5px solid ${C.border}`,
            background: C.card, cursor: "pointer", fontSize: 18, fontWeight: 600,
            fontFamily: fonts, color: C.text,
            boxShadow: "0 2px 12px rgba(28,23,20,0.06)",
            animation: `fk-fadeUp 0.5s ease ${0.15 + i * 0.08}s both`,
          }}>
            <span style={{
              width: 46, height: 46, borderRadius: 14, display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 22,
            }}>{fm.emoji}</span>
            {fm.name}
          </button>
        ))}
      </div>
    </div>
  );
}
