import { C, fonts, displayFont } from "../../lib/constants";
import RecipeSearchPanel from "./RecipeSearchPanel";

export default function RecipePickerModal({ currentUser, isFavorite, onToggleFav, onPick, onClose }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(28,23,20,0.45)", zIndex: 50,
      display: "flex", justifyContent: "center", alignItems: "flex-start",
      padding: "20px 0", overflowY: "auto",
    }} onClick={onClose}>
      <div style={{
        width: "100%", maxWidth: 480, margin: "0 auto",
        background: C.bg, borderRadius: 22, padding: 18,
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        animation: "fk-scaleIn 0.2s ease",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{
            fontSize: 22, fontWeight: 400, color: C.text, fontFamily: displayFont,
            fontStyle: "italic",
          }}>Pick a recipe</div>
          <button className="fk-btn" onClick={onClose} style={{
            padding: "8px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`,
            background: "transparent", color: C.textMuted, fontSize: 14,
            fontFamily: fonts, cursor: "pointer",
          }}>✕</button>
        </div>
        <RecipeSearchPanel currentUser={currentUser}
          isFavoriteFor={isFavorite}
          onToggleFav={onToggleFav}
          onPick={(recipe) => { onPick(recipe); onClose(); }} />
      </div>
    </div>
  );
}
