import { C, fonts, FLATMATES, ATT_COLORS } from "../lib/constants";

export default function AttendanceRow({ currentUser, selectedDate, attendance, onToggle }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "0 16px" }}>
      {FLATMATES.map(fm => {
        const status = attendance[selectedDate]?.[fm.name];
        const isMe = fm.name === currentUser;
        const ac = ATT_COLORS[status] || ATT_COLORS.none;
        const statusLabel = status === "home" ? "Home" : status === "away" ? "Away" : status === "unsure" ? "Unsure" : (isMe ? "Tap" : "—");
        return (
          <button key={fm.name} className="fk-att-btn" onClick={() => { if (isMe) onToggle(selectedDate, fm.name); }} style={{
            flex: 1, padding: "12px 0 10px", borderRadius: 14,
            border: status ? `2px solid ${ac.border}` : `2px dashed ${ac.border}`,
            background: ac.bg,
            cursor: isMe ? "pointer" : "default", textAlign: "center", position: "relative",
          }}>
            <div style={{ fontSize: 16, marginBottom: 2 }}>{fm.emoji}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: ac.text, fontFamily: fonts }}>{fm.name}</div>
            <div style={{
              fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              color: ac.text, fontFamily: fonts, marginTop: 1, opacity: 0.8,
            }}>{statusLabel}</div>
            {isMe && <div style={{
              position: "absolute", top: -4, right: -4, width: 10, height: 10,
              borderRadius: "50%", background: C.accent, border: `2.5px solid ${C.bg}`,
            }} />}
          </button>
        );
      })}
    </div>
  );
}
