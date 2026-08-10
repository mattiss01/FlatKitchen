import { useState } from "react";
import { C, fonts, displayFont } from "../lib/constants";
import LabelInput from "./LabelInput";
import RecipePickerModal from "./recipe/RecipePickerModal";

export default function NewIdeaForm({ currentUser, onSubmit, onCancel, isFavorite, onToggleFav, allLabels }) {
  const [dish, setDish] = useState("");
  const [tags, setTags] = useState([]);
  const [recipe, setRecipe] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePick = (r) => {
    setRecipe(r);
    if (!dish.trim()) setDish(r.title || "");
  };

  return (
    <div style={{
      background: C.card, borderRadius: 20, padding: 22,
      border: `1px solid ${C.border}`, marginBottom: 12,
      boxShadow: "0 4px 20px rgba(28,23,20,0.06)", animation: "fk-scaleIn 0.25s ease",
    }}>
      <div style={{
        fontSize: 20, fontWeight: 400, color: C.text, fontFamily: displayFont,
        marginBottom: 16, fontStyle: "italic",
      }}>Suggest a dish</div>
      <input value={dish} onChange={e => setDish(e.target.value)} placeholder="e.g. Thai Green Curry"
        autoFocus className="fk-input"
        style={{
          width: "100%", padding: "13px 16px", borderRadius: 14,
          border: `1.5px solid ${C.border}`, background: C.cardAlt,
          fontSize: 15, fontFamily: fonts, color: C.text, outline: "none",
          boxSizing: "border-box", marginBottom: 12,
          transition: "border-color 0.15s, box-shadow 0.15s",
        }} />

      {recipe ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          background: C.accentLight, borderRadius: 12,
          border: `1px solid ${C.accent}30`, marginBottom: 14,
        }}>
          {recipe.image && (
            <img src={recipe.image} alt="" style={{
              width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0,
            }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, fontFamily: fonts, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Chefkoch recipe
            </div>
            <div style={{
              fontSize: 13, color: C.text, fontFamily: fonts, fontWeight: 600,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{recipe.title}</div>
          </div>
          <button className="fk-btn" onClick={() => setRecipe(null)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 14, color: C.textMuted, fontFamily: fonts, padding: 4,
          }} title="Detach recipe">✕</button>
        </div>
      ) : (
        <button className="fk-btn" type="button" onClick={() => setPickerOpen(true)} style={{
          width: "100%", padding: "10px 14px", borderRadius: 12,
          border: `1.5px dashed ${C.border}`, background: "transparent",
          color: C.textMuted, fontSize: 13, fontWeight: 600,
          fontFamily: fonts, cursor: "pointer", marginBottom: 14,
        }}>🔍 Search Chefkoch (optional)</button>
      )}

      <div style={{
        fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: fonts,
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
      }}>Labels</div>
      <LabelInput selected={tags} onChange={setTags} allLabels={allLabels || []} />
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button className="fk-btn" onClick={() => { if (dish.trim()) onSubmit({ dish: dish.trim(), tags, recipe }); }} style={{
          flex: 1, padding: "13px", borderRadius: 14, border: "none",
          background: dish.trim() ? `linear-gradient(135deg, ${C.accent}, #D4593F)` : C.border,
          color: "#fff", fontSize: 15, fontWeight: 600,
          fontFamily: fonts, cursor: dish.trim() ? "pointer" : "default",
          boxShadow: dish.trim() ? `0 4px 16px ${C.accent}33` : "none",
        }}>Add Idea</button>
        <button className="fk-btn" onClick={onCancel} style={{
          padding: "13px 20px", borderRadius: 14, border: `1.5px solid ${C.border}`,
          background: "transparent", color: C.textMuted, fontSize: 15,
          fontFamily: fonts, cursor: "pointer",
        }}>✕</button>
      </div>

      {pickerOpen && (
        <RecipePickerModal currentUser={currentUser}
          isFavorite={isFavorite} onToggleFav={onToggleFav}
          onPick={handlePick} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}
