import { C, fonts, displayFont, FLATMATES } from "../lib/constants";

export default function Stats({ meals }) {
  if (!meals.length) return null;
  const avg = (arr, fn) => (arr.reduce((s, m) => s + fn(m), 0) / arr.length).toFixed(1);
  const cookCounts = {};
  FLATMATES.forEach(f => cookCounts[f.name] = 0);
  meals.forEach(m => { if (cookCounts[m.cook] !== undefined) cookCounts[m.cook]++; });
  const topDish = meals.reduce((a, b) => b.tastiness > a.tastiness ? b : a);

  return (
    <div style={{
      background: `linear-gradient(145deg, ${C.dark} 0%, #342B20 60%, #3D3025 100%)`,
      borderRadius: 22, padding: 22, color: "#fff", marginBottom: 16,
      boxShadow: "0 6px 24px rgba(28,23,20,0.2)", animation: "fk-fadeUp 0.5s ease",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", width: 180, height: 180, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.accent}18, transparent 70%)`,
        top: -40, right: -30, pointerEvents: "none",
      }} />
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
        color: C.textLight, fontFamily: fonts, marginBottom: 14,
      }}>Kitchen Stats</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 16 }}>
        {[
          { l: "Meals", v: meals.length, i: "🍽" },
          { l: "Avg Taste", v: avg(meals, m => m.tastiness), i: "😋" },
          { l: "Avg Cost", v: avg(meals, m => m.cost), i: "💸" },
          { l: "Avg Effort", v: avg(meals, m => m.effort), i: "💪" },
        ].map(s => (
          <div key={s.l} style={{ position: "relative" }}>
            <div style={{ fontSize: 9, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: fonts }}>{s.i} {s.l}</div>
            <div style={{ fontSize: 28, fontWeight: 400, fontFamily: displayFont, fontStyle: "italic" }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{
        background: C.darkCard, borderRadius: 14, padding: 12,
        fontSize: 12, fontFamily: fonts, color: C.textLight, border: `1px solid #ffffff08`,
      }}>⭐ Best: <strong style={{ color: "#fff" }}>{topDish.dish}</strong> ({topDish.tastiness}/10) by {topDish.cook}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {FLATMATES.map(fm => (
          <div key={fm.name} style={{
            flex: 1, background: C.darkCard, borderRadius: 12, padding: 10,
            textAlign: "center", border: `1px solid #ffffff08`,
          }}>
            <div style={{ fontSize: 16, marginBottom: 2 }}>{fm.emoji}</div>
            <div style={{ fontSize: 10, color: C.accentLight, fontFamily: fonts }}>{fm.name}</div>
            <div style={{ fontSize: 20, fontWeight: 400, fontFamily: displayFont, color: C.accentLight, fontStyle: "italic" }}>{cookCounts[fm.name]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
