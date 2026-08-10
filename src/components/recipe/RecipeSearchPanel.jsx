import { useState, useEffect } from "react";
import { C, fonts, displayFont } from "../../lib/constants";
import useChefkochSearch from "../../hooks/useChefkochSearch";
import RecipeCard from "./RecipeCard";

export default function RecipeSearchPanel({ currentUser, onPick, isFavoriteFor, onToggleFav }) {
  const [query, setQuery] = useState("");
  const { results, loading, error, search } = useChefkochSearch();

  useEffect(() => {
    const t = setTimeout(() => { search(query); }, 350);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)}
        autoFocus className="fk-input" placeholder="Search Chefkoch (e.g. carbonara, curry)"
        style={{
          width: "100%", padding: "13px 16px", borderRadius: 14,
          border: `1.5px solid ${C.border}`, background: C.cardAlt,
          fontSize: 15, fontFamily: fonts, color: C.text, outline: "none",
          boxSizing: "border-box", marginBottom: 14,
          transition: "border-color 0.15s, box-shadow 0.15s",
        }} />

      {loading && (
        <div style={{ textAlign: "center", padding: 18, color: C.textMuted, fontFamily: fonts, fontSize: 13 }}>
          Searching chefkoch.de…
        </div>
      )}

      {error && !loading && (
        <div style={{
          textAlign: "center", padding: 14, color: C.accent,
          background: C.accentLight, borderRadius: 12,
          fontFamily: fonts, fontSize: 13, marginBottom: 10,
        }}>{error}</div>
      )}

      {!loading && !error && query.trim() && results.length === 0 && (
        <div style={{
          textAlign: "center", padding: "28px 20px", color: C.textLight,
          border: `1.5px dashed ${C.border}`, borderRadius: 18,
          background: `${C.card}80`,
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>
          <div style={{ fontSize: 15, fontFamily: displayFont, color: C.textMuted, fontStyle: "italic" }}>
            No recipes found
          </div>
        </div>
      )}

      {!loading && !query.trim() && (
        <div style={{
          textAlign: "center", padding: "28px 20px", color: C.textLight,
          border: `1.5px dashed ${C.border}`, borderRadius: 18,
          background: `${C.card}80`,
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📚</div>
          <div style={{ fontSize: 15, fontFamily: displayFont, color: C.textMuted, fontStyle: "italic" }}>
            Type to search Chefkoch
          </div>
        </div>
      )}

      {results.map((r, i) => (
        <RecipeCard key={r.id || r.url || i} recipe={r}
          isFav={isFavoriteFor ? isFavoriteFor(r.id, currentUser) : false}
          onToggleFav={onToggleFav}
          onAttach={onPick}
          delay={i * 0.04} />
      ))}
    </div>
  );
}
