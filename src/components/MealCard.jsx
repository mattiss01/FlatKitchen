import { useState } from "react";
import { C, fonts, displayFont, smallBtn } from "../lib/constants";

export default function MealCard({ meal, onEdit, onDelete, delay }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fk-card" style={{
      background: C.card, borderRadius: 18, padding: 16,
      border: `1px solid ${C.border}`, marginBottom: 10,
      boxShadow: "0 2px 8px rgba(28,23,20,0.04), 0 1px 2px rgba(28,23,20,0.02)",
      animation: `fk-fadeUp 0.4s ease ${delay || 0}s both`,
    }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 10 }}>
        {meal.photo_url && (
          <img src={meal.photo_url} alt="" style={{
            width: 52, height: 52, borderRadius: 10, objectFit: "cover",
            flexShrink: 0, border: `1px solid ${C.borderLight}`,
          }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 400, color: C.text, fontFamily: displayFont, lineHeight: 1.3, fontStyle: "italic" }}>{meal.dish}</div>
          <div style={{ fontSize: 12, color: C.textMuted, fontFamily: fonts, marginTop: 3 }}>
            <span style={{ color: C.text, fontWeight: 600 }}>{meal.cook}</span>
            {" · "}{meal.date}{meal.cost > 0 && ` · 💸${meal.cost}/10`}
          </div>
          {meal.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 7 }}>
              {meal.tags.slice(0, 4).map((label, i) => (
                <span key={i} style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 10,
                  background: C.cardAlt, color: C.textMuted, fontFamily: fonts,
                }}>{label}</span>
              ))}
              {meal.tags.length > 4 && (
                <span style={{ fontSize: 10, color: C.textLight, fontFamily: fonts }}>+{meal.tags.length - 4}</span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginLeft: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 400, color: C.accent, fontFamily: displayFont, fontStyle: "italic" }}>{meal.tastiness}</div>
            <div style={{ fontSize: 8, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: fonts, fontWeight: 700 }}>taste</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 400, color: C.green, fontFamily: displayFont, fontStyle: "italic" }}>{meal.effort}</div>
            <div style={{ fontSize: 8, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: fonts, fontWeight: 700 }}>effort</div>
          </div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.borderLight}`, animation: "fk-scaleIn 0.2s ease" }}>
          {meal.photo_url && (
            <img src={meal.photo_url} alt={meal.dish} style={{
              width: "100%", maxHeight: 220, objectFit: "cover",
              borderRadius: 12, marginBottom: 12,
              border: `1px solid ${C.borderLight}`,
            }} />
          )}
          {meal.comment && <p style={{
            margin: "0 0 12px", fontSize: 13, color: C.textMuted, fontFamily: fonts,
            fontStyle: "italic", lineHeight: 1.6,
            padding: "10px 14px", background: C.cardAlt, borderRadius: 12,
            borderLeft: `3px solid ${C.accent}30`,
          }}>"{meal.comment}"</p>}
          {meal.recipe_url && (
            <a href={meal.recipe_url} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12,
              padding: "6px 10px", borderRadius: 10,
              background: C.accentLight, border: `1px solid ${C.accent}25`,
              color: C.accent, fontSize: 12, fontWeight: 600, fontFamily: fonts,
              textDecoration: "none", maxWidth: "100%",
            }}>
              {meal.recipe_image && (
                <img src={meal.recipe_image} alt="" style={{
                  width: 22, height: 22, borderRadius: 6, objectFit: "cover", flexShrink: 0,
                }} />
              )}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                📖 {meal.recipe_title || "View on Chefkoch"} ↗
              </span>
            </a>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="fk-btn" onClick={() => onEdit(meal)} style={smallBtn}>Edit</button>
            <button className="fk-btn" onClick={() => onDelete(meal.id)} style={{ ...smallBtn, color: C.accent, borderColor: C.accent }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}
