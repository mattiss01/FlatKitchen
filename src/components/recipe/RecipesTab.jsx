import { useState } from "react";
import { C, fonts, displayFont } from "../../lib/constants";
import RecipeCard from "./RecipeCard";
import RecipeSearchPanel from "./RecipeSearchPanel";

export default function RecipesTab({ currentUser, favorites, isFavorite, onToggleFav }) {
  const [view, setView] = useState("search");
  const myFavorites = favorites.filter(f => f.name === currentUser);

  return (
    <div>
      <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
        {[
          { id: "search", label: "🔍 Search" },
          { id: "saved", label: `⭐ Saved (${myFavorites.length})` },
        ].map(v => {
          const active = view === v.id;
          return (
            <button key={v.id} className="fk-tag" onClick={() => setView(v.id)} style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 12, whiteSpace: "nowrap",
              border: active ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
              background: active ? C.accentLight : "transparent",
              color: active ? C.accent : C.textMuted,
              cursor: "pointer", fontFamily: fonts, fontWeight: active ? 700 : 500,
            }}>{v.label}</button>
          );
        })}
      </div>

      {view === "search" && (
        <RecipeSearchPanel currentUser={currentUser}
          isFavoriteFor={isFavorite} onToggleFav={onToggleFav} />
      )}

      {view === "saved" && (
        myFavorites.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "36px 24px", color: C.textLight,
            border: `1.5px dashed ${C.border}`, borderRadius: 20,
            background: `${C.card}80`, animation: "fk-fadeUp 0.5s ease",
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
            <div style={{
              fontSize: 16, fontFamily: displayFont, fontWeight: 400,
              color: C.textMuted, fontStyle: "italic",
            }}>No saved recipes yet</div>
            <div style={{ fontSize: 13, marginTop: 4, color: C.textLight }}>Tap the star on a search result to save it.</div>
          </div>
        ) : (
          myFavorites.map((f, i) => (
            <RecipeCard key={f.id}
              recipe={{ id: f.recipe_id, title: f.title, url: f.url, image: f.image }}
              isFav={true}
              onToggleFav={() => onToggleFav({ id: f.recipe_id, title: f.title, url: f.url, image: f.image })}
              delay={i * 0.04} />
          ))
        )
      )}
    </div>
  );
}
