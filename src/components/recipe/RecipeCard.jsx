import { C, fonts, displayFont } from "../../lib/constants";

export default function RecipeCard({ recipe, isFav, onToggleFav, onAttach, delay }) {
  const ingredients = (recipe.ingredientsPreview || []).slice(0, 4).join(" · ");
  return (
    <div className="fk-card" style={{
      background: C.card, borderRadius: 18, padding: 16,
      border: `1px solid ${C.border}`, marginBottom: 10,
      boxShadow: "0 2px 8px rgba(28,23,20,0.04), 0 1px 2px rgba(28,23,20,0.02)",
      animation: `fk-fadeUp 0.4s ease ${delay || 0}s both`,
      display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      {recipe.image && (
        <img src={recipe.image} alt="" style={{
          width: 64, height: 64, borderRadius: 12, objectFit: "cover", flexShrink: 0,
          border: `1px solid ${C.borderLight}`,
        }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <a href={recipe.url} target="_blank" rel="noopener noreferrer" style={{
          fontSize: 17, fontWeight: 400, color: C.text, fontFamily: displayFont,
          lineHeight: 1.25, fontStyle: "italic", textDecoration: "none",
          display: "block", marginBottom: 4,
        }}>{recipe.title} <span style={{ fontSize: 12, color: C.textLight, fontStyle: "normal" }}>↗</span></a>
        {recipe.category && (
          <div style={{ fontSize: 11, color: C.textMuted, fontFamily: fonts, fontWeight: 600, marginBottom: ingredients ? 4 : 0 }}>
            {recipe.category}
          </div>
        )}
        {ingredients && (
          <div style={{ fontSize: 12, color: C.textLight, fontFamily: fonts, lineHeight: 1.4 }}>
            {ingredients}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        {onToggleFav && (
          <button className="fk-btn" onClick={() => onToggleFav(recipe)} style={{
            width: 38, height: 38, borderRadius: 12, border: "none",
            background: isFav ? `linear-gradient(135deg, ${C.accentLight}, #FDD8CE)` : C.cardAlt,
            cursor: "pointer", fontSize: 16, display: "flex",
            alignItems: "center", justifyContent: "center",
            boxShadow: isFav ? `0 2px 8px ${C.accent}22` : "none",
          }} title={isFav ? "Remove favorite" : "Save favorite"}>{isFav ? "⭐" : "☆"}</button>
        )}
        {onAttach && (
          <button className="fk-btn" onClick={() => onAttach(recipe)} style={{
            width: 38, height: 38, borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${C.accent}, #D4593F)`,
            color: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 2px 8px ${C.accent}33`,
          }} title="Attach to dinner idea">+</button>
        )}
      </div>
    </div>
  );
}
