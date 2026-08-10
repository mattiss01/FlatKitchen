import { C, fonts } from "../../lib/constants";

export default function ShoppingItemRow({ item, currentUser, onMarkBought, onUnmarkBought, onDelete, delay }) {
  const bought = !!item.bought_at;
  return (
    <div className="fk-card" style={{
      background: C.card, borderRadius: 16, padding: "12px 16px",
      border: `1px solid ${bought ? C.borderLight : C.border}`,
      marginBottom: 8, display: "flex", alignItems: "center", gap: 12,
      opacity: bought ? 0.65 : 1,
      animation: `fk-fadeUp 0.4s ease ${delay || 0}s both`,
    }}>
      <button onClick={() => bought ? onUnmarkBought(item.id) : onMarkBought(item.id, currentUser)}
        style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          border: `2px solid ${bought ? C.green : C.border}`,
          background: bought ? C.greenLight : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 14, color: C.green,
        }}>
        {bought ? "✓" : ""}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 15, fontFamily: fonts,
          textDecoration: bought ? "line-through" : "none",
          color: bought ? C.textMuted : C.text,
        }}>{item.text}</div>
        <div style={{ fontSize: 11, color: C.textLight, fontFamily: fonts, marginTop: 2 }}>
          {bought ? `Bought by ${item.bought_by}` : `Added by ${item.added_by}`}
        </div>
      </div>
      <button onClick={() => onDelete(item.id)} style={{
        background: "none", border: "none", cursor: "pointer",
        fontSize: 14, color: C.textLight, padding: 4,
      }}>✕</button>
    </div>
  );
}
