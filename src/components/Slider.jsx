import { C, fonts, displayFont } from "../lib/constants";

export default function Slider({ value, onChange, label, color, icon }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: fonts }}>{icon} {label}</span>
        <span style={{ fontSize: 22, fontWeight: 400, color, fontFamily: displayFont, fontStyle: "italic" }}>{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={e => onChange(+e.target.value)}
        style={{
          width: "100%", height: 5, appearance: "none", WebkitAppearance: "none",
          borderRadius: 3, outline: "none", cursor: "pointer",
          background: `linear-gradient(to right, ${color} ${(value - 1) / 9 * 100}%, ${C.border} ${(value - 1) / 9 * 100}%)`,
          accentColor: color,
        }} />
    </div>
  );
}
