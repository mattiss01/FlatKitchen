import { useState, useRef } from "react";
import supabase from "../lib/supabase";
import { C, fonts, displayFont, labelSt, fieldSt, FLATMATES } from "../lib/constants";
import { dateKey } from "../lib/utils";
import LabelInput from "./LabelInput";
import Slider from "./Slider";
import RecipePickerModal from "./recipe/RecipePickerModal";

export default function MealForm({ currentUser, onSubmit, onCancel, initial, allLabels, isFavorite, onToggleFav }) {
  const [dish, setDish] = useState(initial?.dish || "");
  const [date, setDate] = useState(initial?.date || dateKey(new Date()));
  const [cook, setCook] = useState(initial?.cook || currentUser);
  const [tastiness, setTastiness] = useState(initial?.tastiness || 7);
  const [effort, setEffort] = useState(initial?.effort || 5);
  const [cost, setCost] = useState(initial?.cost || 5);
  const [comment, setComment] = useState(initial?.comment || "");
  const [tags, setTags] = useState(initial?.tags || []);
  const [recipe, setRecipe] = useState(
    initial?.recipe_url ? { url: initial.recipe_url, image: initial.recipe_image, title: initial.recipe_title } : null
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url || null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    setPhotoUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { data, error } = await supabase.storage.from("meal-photos").upload(path, file);
    if (error) {
      console.error("[photo] upload failed:", error);
    } else {
      const { data: { publicUrl } } = supabase.storage.from("meal-photos").getPublicUrl(data.path);
      setPhotoUrl(publicUrl);
    }
    setPhotoUploading(false);
  };

  return (
    <div style={{
      background: C.card, borderRadius: 22, padding: 22,
      border: `1px solid ${C.border}`,
      boxShadow: "0 4px 20px rgba(28,23,20,0.06)", animation: "fk-scaleIn 0.25s ease",
    }}>
      <div style={{
        fontSize: 24, fontWeight: 400, color: C.text, fontFamily: displayFont,
        marginBottom: 20, fontStyle: "italic",
      }}>{initial ? "Edit Meal" : "Log a Meal"}</div>

      <input value={dish} onChange={e => setDish(e.target.value)} placeholder="What did you cook?"
        className="fk-input"
        style={{
          width: "100%", padding: "13px 16px", borderRadius: 14, marginBottom: 12,
          border: `1.5px solid ${C.border}`, background: C.cardAlt,
          fontSize: 15, fontFamily: fonts, color: C.text, outline: "none",
          boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
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
          }}>✕</button>
        </div>
      ) : (
        <button className="fk-btn" type="button" onClick={() => setPickerOpen(true)} style={{
          width: "100%", padding: "10px 14px", borderRadius: 12,
          border: `1.5px dashed ${C.border}`, background: "transparent",
          color: C.textMuted, fontSize: 13, fontWeight: 600,
          fontFamily: fonts, cursor: "pointer", marginBottom: 14,
        }}>🔍 Link Chefkoch recipe (optional)</button>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div>
          <label style={labelSt}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="fk-input" style={fieldSt} />
        </div>
        <div>
          <label style={labelSt}>Cook</label>
          <select value={cook} onChange={e => setCook(e.target.value)} className="fk-input" style={fieldSt}>
            {FLATMATES.map(fm => <option key={fm.name} value={fm.name}>{fm.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{
        fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: fonts,
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
      }}>Labels</div>
      <div style={{ marginBottom: 16 }}>
        <LabelInput selected={tags} onChange={setTags} allLabels={allLabels || []} />
      </div>

      <Slider value={tastiness} onChange={setTastiness} label="Tastiness" color={C.accent} icon="😋" />
      <Slider value={effort} onChange={setEffort} label="Effort" color={C.green} icon="💪" />
      <Slider value={cost} onChange={setCost} label="Cost" color="#7A6A3B" icon="💸" />

      <div style={{ marginBottom: 20 }}>
        <label style={labelSt}>Notes</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Recipe link, tweaks..." className="fk-input"
          rows={2} style={{ ...fieldSt, resize: "vertical" }} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelSt}>Photo</label>
        <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange}
          style={{ display: "none" }} />
        {photoUrl ? (
          <div style={{ position: "relative", display: "inline-block" }}>
            <img src={photoUrl} alt="meal" style={{
              width: "100%", maxHeight: 200, objectFit: "cover",
              borderRadius: 12, border: `1px solid ${C.border}`,
            }} />
            <button onClick={() => setPhotoUrl(null)} style={{
              position: "absolute", top: 6, right: 6,
              background: "rgba(28,23,20,0.6)", border: "none", borderRadius: 8,
              color: "#fff", fontSize: 13, cursor: "pointer", padding: "3px 7px",
            }}>✕</button>
          </div>
        ) : (
          <button className="fk-btn" type="button" onClick={() => photoInputRef.current?.click()}
            disabled={photoUploading} style={{
              width: "100%", padding: "10px 14px", borderRadius: 12,
              border: `1.5px dashed ${C.border}`, background: "transparent",
              color: photoUploading ? C.textLight : C.textMuted, fontSize: 13,
              fontWeight: 600, fontFamily: fonts, cursor: "pointer",
            }}>{photoUploading ? "Uploading…" : "📷 Add photo (optional)"}</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="fk-btn" onClick={() => {
          if (!dish.trim()) return;
          onSubmit({
            id: initial?.id, dish: dish.trim(), date, cook,
            tastiness, effort, cost, comment: comment.trim(), tags,
            recipe_url: recipe?.url || null,
            recipe_image: recipe?.image || null,
            recipe_title: recipe?.title || null,
            photo_url: photoUrl || null,
          });
        }} style={{
          flex: 1, padding: "14px", borderRadius: 14, border: "none",
          background: `linear-gradient(135deg, ${C.accent}, #D4593F)`,
          color: "#fff", fontSize: 15, fontWeight: 600,
          fontFamily: fonts, cursor: "pointer", boxShadow: `0 4px 16px ${C.accent}33`,
        }}>{initial ? "Update" : "Save"}</button>
        <button className="fk-btn" onClick={onCancel} style={{
          padding: "14px 20px", borderRadius: 14, border: `1.5px solid ${C.border}`,
          background: "transparent", color: C.textMuted, fontSize: 15,
          fontFamily: fonts, cursor: "pointer",
        }}>Cancel</button>
      </div>

      {pickerOpen && (
        <RecipePickerModal currentUser={currentUser}
          isFavorite={isFavorite} onToggleFav={onToggleFav}
          onPick={(r) => { setRecipe(r); if (!dish.trim()) setDish(r.title || ""); }}
          onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}
