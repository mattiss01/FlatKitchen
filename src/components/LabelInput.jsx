import { useState } from "react";
import { C, fonts } from "../lib/constants";

export default function LabelInput({ selected, onChange, allLabels }) {
  const [inputVal, setInputVal] = useState("");

  const available = (inputVal.trim()
    ? allLabels.filter(l => l.toLowerCase().includes(inputVal.trim().toLowerCase()))
    : allLabels
  ).filter(l => !selected.includes(l));

  const addLabel = (label) => {
    const trimmed = label.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    onChange([...selected, trimmed]);
    setInputVal("");
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && inputVal.trim()) {
      e.preventDefault();
      addLabel(inputVal);
    }
  };

  return (
    <div>
      {selected.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
          {selected.map((label, i) => (
            <span key={i} style={{
              padding: "5px 10px", borderRadius: 20, fontSize: 12,
              background: C.accentLight, border: `1.5px solid ${C.accent}`,
              color: C.accent, fontFamily: fonts, fontWeight: 600,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              {label}
              <button onClick={() => onChange(selected.filter(l => l !== label))} style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, color: C.accent, padding: 0, lineHeight: 1,
              }}>×</button>
            </span>
          ))}
        </div>
      )}
      {available.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
          {available.map((label, i) => (
            <button key={i} className="fk-tag" onClick={() => addLabel(label)} style={{
              padding: "5px 10px", borderRadius: 20, fontSize: 12,
              border: `1px solid ${C.border}`, background: "transparent",
              color: C.textMuted, cursor: "pointer", fontFamily: fonts,
            }}>{label}</button>
          ))}
        </div>
      )}
      <input
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a label and press Enter…"
        className="fk-input"
        style={{
          width: "100%", padding: "9px 14px", borderRadius: 12,
          border: `1.5px solid ${C.border}`, background: C.cardAlt,
          fontSize: 13, fontFamily: fonts, color: C.text, outline: "none",
          boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      />
    </div>
  );
}
