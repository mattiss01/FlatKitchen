import { useRef, useEffect } from "react";
import { C, fonts, displayFont } from "../lib/constants";
import { dateKey, formatDay, isToday } from "../lib/utils";

export default function DayStrip({ selectedDate, onSelect }) {
  const days = [];
  for (let i = -2; i <= 4; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(dateKey(d));
  }
  const stripRef = useRef(null);
  useEffect(() => {
    if (stripRef.current) {
      const active = stripRef.current.querySelector('[data-active="true"]');
      if (active) active.scrollIntoView({ inline: "center", behavior: "smooth" });
    }
  }, [selectedDate]);

  return (
    <div ref={stripRef} style={{
      display: "flex", gap: 6, overflowX: "auto", padding: "0 16px 4px", scrollbarWidth: "none",
    }}>
      {days.map(dk => {
        const { weekday, day } = formatDay(dk);
        const sel = dk === selectedDate;
        const today = isToday(dk);
        return (
          <button key={dk} data-active={sel ? "true" : "false"} onClick={() => onSelect(dk)} style={{
            flexShrink: 0, width: 54, padding: "10px 0 12px", borderRadius: 16,
            border: sel ? "none" : `1.5px solid ${today ? C.accent + "33" : C.border}`,
            background: sel
              ? `linear-gradient(135deg, ${C.dark} 0%, #3D3228 100%)`
              : today ? C.accent + "08" : "transparent",
            cursor: "pointer", textAlign: "center",
            transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            boxShadow: sel ? "0 4px 16px rgba(28,23,20,0.15)" : "none",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 3,
              color: sel ? C.accentSoft : today ? C.accent : C.textMuted, fontFamily: fonts,
            }}>{weekday}</div>
            <div style={{
              fontSize: 21, fontWeight: 400, fontFamily: displayFont,
              color: sel ? "#fff" : C.text, fontStyle: "italic",
            }}>{day}</div>
          </button>
        );
      })}
      <button onClick={() => {
        const input = document.createElement("input");
        input.type = "date"; input.value = selectedDate;
        input.style.position = "fixed"; input.style.opacity = "0"; input.style.top = "0";
        document.body.appendChild(input);
        input.addEventListener("change", (e) => { onSelect(e.target.value); document.body.removeChild(input); });
        input.addEventListener("blur", () => {
          setTimeout(() => { if (document.body.contains(input)) document.body.removeChild(input); }, 200);
        });
        input.showPicker ? input.showPicker() : input.focus();
      }} style={{
        flexShrink: 0, width: 54, padding: "10px 0 12px", borderRadius: 16,
        border: `1.5px dashed ${C.border}`, background: "transparent",
        cursor: "pointer", textAlign: "center", fontFamily: fonts,
        color: C.textMuted, fontSize: 18, transition: "all 0.15s ease",
      }}>···</button>
    </div>
  );
}
