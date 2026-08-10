import { useState } from "react";
import { C, fonts, displayFont } from "../lib/constants";

export default function IdeaCard({ idea, currentUser, onLike, onComment, onDeleteComment, onDelete, delay }) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const liked = idea.likes?.includes(currentUser);
  const likeCount = idea.likes?.length || 0;
  const [justLiked, setJustLiked] = useState(false);

  const handleLike = (id) => {
    onLike(id);
    if (!liked) { setJustLiked(true); setTimeout(() => setJustLiked(false), 400); }
  };

  return (
    <div className="fk-card" style={{
      background: C.card, borderRadius: 18, padding: 18,
      border: `1px solid ${C.border}`, marginBottom: 10,
      boxShadow: "0 2px 8px rgba(28,23,20,0.04), 0 1px 2px rgba(28,23,20,0.02)",
      animation: `fk-fadeUp 0.4s ease ${delay || 0}s both`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 18, fontWeight: 400, color: C.text, fontFamily: displayFont,
            marginBottom: 5, lineHeight: 1.3, fontStyle: "italic",
          }}>{idea.dish}</div>
          <div style={{ fontSize: 12, color: C.textMuted, fontFamily: fonts }}>
            <span style={{ color: C.text, fontWeight: 600 }}>{idea.author}</span>
          </div>
          {idea.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
              {idea.tags.map((label, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: "3px 9px", borderRadius: 20,
                  background: C.cardAlt, border: `1px solid ${C.borderLight}`,
                  color: C.textMuted, fontFamily: fonts, whiteSpace: "nowrap",
                }}>{label}</span>
              ))}
            </div>
          )}
          {idea.recipe_url && (
            <a href={idea.recipe_url} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginTop: 10,
              padding: "6px 10px", borderRadius: 10,
              background: C.accentLight, border: `1px solid ${C.accent}25`,
              color: C.accent, fontSize: 12, fontWeight: 600, fontFamily: fonts,
              textDecoration: "none", maxWidth: "100%",
            }}>
              {idea.recipe_image && (
                <img src={idea.recipe_image} alt="" style={{
                  width: 22, height: 22, borderRadius: 6, objectFit: "cover", flexShrink: 0,
                }} />
              )}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                📖 {idea.recipe_title || "View on Chefkoch"} ↗
              </span>
            </a>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, marginLeft: 14 }}>
          <button className={justLiked ? "fk-like-pop" : ""} onClick={() => handleLike(idea.id)} style={{
            width: 48, height: 48, borderRadius: 14, border: "none",
            background: liked ? `linear-gradient(135deg, ${C.accentLight}, #FDD8CE)` : C.cardAlt,
            cursor: "pointer", fontSize: 20, display: "flex",
            alignItems: "center", justifyContent: "center",
            transition: "all 0.2s ease",
            boxShadow: liked ? `0 2px 8px ${C.accent}22` : "none",
          }}>{liked ? "❤️" : "🤍"}</button>
          <span style={{ fontSize: 12, fontWeight: 700, color: liked ? C.accent : C.textLight, fontFamily: fonts }}>{likeCount}</span>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={() => setShowComments(!showComments)} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 12, color: C.textMuted, fontFamily: fonts, fontWeight: 600,
          padding: 0, display: "flex", alignItems: "center", gap: 4,
        }}>
          💬 {idea.comments?.length || 0} comment{(idea.comments?.length || 0) !== 1 ? "s" : ""}
          <span style={{ fontSize: 10, transition: "transform 0.2s ease", display: "inline-block", transform: showComments ? "rotate(180deg)" : "none" }}>▾</span>
        </button>

        {showComments && (
          <div style={{ marginTop: 10, animation: "fk-scaleIn 0.2s ease" }}>
            {idea.comments?.map((c, i) => (
              <div key={i} style={{
                padding: "8px 0", borderTop: i > 0 ? `1px solid ${C.borderLight}` : "none",
                fontSize: 13, color: C.text, fontFamily: fonts, lineHeight: 1.5,
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8,
              }}>
                <div><span style={{ fontWeight: 700, color: C.text }}>{c.author}</span>{" "}{c.text}</div>
                {c.author === currentUser && (
                  <button onClick={() => onDeleteComment(idea.id, i)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 11, color: C.textLight, fontFamily: fonts, padding: "2px 4px", flexShrink: 0,
                  }}>✕</button>
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input value={newComment} onChange={e => setNewComment(e.target.value)}
                className="fk-input" placeholder="Add a comment..."
                onKeyDown={e => {
                  if (e.key === "Enter" && newComment.trim()) { onComment(idea.id, newComment.trim()); setNewComment(""); }
                }}
                style={{
                  flex: 1, padding: "9px 14px", borderRadius: 12,
                  border: `1.5px solid ${C.border}`, background: C.cardAlt,
                  fontSize: 13, fontFamily: fonts, color: C.text, outline: "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }} />
              <button className="fk-btn" onClick={() => {
                if (newComment.trim()) { onComment(idea.id, newComment.trim()); setNewComment(""); }
              }} style={{
                padding: "9px 16px", borderRadius: 12, border: "none",
                background: C.accent, color: "#fff", fontSize: 13,
                fontWeight: 600, fontFamily: fonts, cursor: "pointer",
              }}>Send</button>
            </div>
          </div>
        )}
      </div>

      {idea.author === currentUser && (
        <button onClick={() => onDelete(idea.id)} style={{
          marginTop: 10, background: "none", border: "none", cursor: "pointer",
          fontSize: 11, color: C.textLight, fontFamily: fonts, padding: 0, transition: "color 0.15s",
        }}>Delete idea</button>
      )}
    </div>
  );
}
