import { useState, useEffect, useCallback, useRef } from "react";

// ─── Data ────────────────────────────────────────────────────────
const FLATMATES = [
  { name: "Mattis", emoji: "🦊" },
  { name: "Robert", emoji: "🐻" },
  { name: "Jakob", emoji: "🦅" },
];

const TAGS = [
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "vegetarian", label: "Vegetarian", emoji: "🥚" },
  { id: "meat", label: "Meat", emoji: "🥩" },
  { id: "fish", label: "Fish", emoji: "🐟" },
  { id: "pasta", label: "Pasta", emoji: "🍝" },
  { id: "rice", label: "Rice", emoji: "🍚" },
  { id: "soup", label: "Soup", emoji: "🍲" },
  { id: "salad", label: "Salad", emoji: "🥗" },
  { id: "curry", label: "Curry", emoji: "🍛" },
  { id: "asian", label: "Asian", emoji: "🥢" },
  { id: "italian", label: "Italian", emoji: "🇮🇹" },
  { id: "mexican", label: "Mexican", emoji: "🌮" },
  { id: "indian", label: "Indian", emoji: "🫓" },
  { id: "middleeastern", label: "Middle Eastern", emoji: "🧆" },
  { id: "quick", label: "Quick (<30min)", emoji: "⚡" },
  { id: "mealprep", label: "Meal Prep", emoji: "📦" },
  { id: "comfort", label: "Comfort Food", emoji: "🛋" },
  { id: "healthy", label: "Healthy", emoji: "💚" },
  { id: "spicy", label: "Spicy", emoji: "🌶" },
  { id: "baking", label: "Baking", emoji: "🍞" },
  { id: "bbq", label: "BBQ", emoji: "🔥" },
  { id: "breakfast", label: "Breakfast", emoji: "🥞" },
  { id: "dessert", label: "Dessert", emoji: "🍰" },
  { id: "budget", label: "Budget", emoji: "💸" },
  { id: "fancy", label: "Fancy", emoji: "✨" },
];

const ATTENDANCE = { HOME: "home", AWAY: "away", UNSURE: "unsure" };

// Attendance colors
const ATT_COLORS = {
  home: { bg: "#D6F0D0", border: "#4CAF50", text: "#2E7D32" },
  away: { bg: "#FCDEDE", border: "#E05555", text: "#C62828" },
  unsure: { bg: "#FFF3CD", border: "#E0B830", text: "#9A7B00" },
  none: { bg: "transparent", border: "#EDE6DC", text: "#B8AA9A" },
};

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDate(dk) {
  const [y, m, d] = dk.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDay(dk) {
  const d = parseDate(dk);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return { weekday: days[d.getDay()], day: d.getDate(), month: months[d.getMonth()], full: d };
}
function isToday(dk) { return dk === dateKey(new Date()); }

function useStore(key, initial) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; }
    catch { return initial; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(val)); }, [key, val]);
  return [val, setVal];
}

// ─── Shared Styles ───────────────────────────────────────────────
const fonts = `'Outfit', 'Helvetica Neue', sans-serif`;
const displayFont = `'Fraunces', Georgia, serif`;
const C = {
  bg: "#FAF6F1", card: "#FFFFFF", cardAlt: "#FFF9F3",
  border: "#EDE6DC", borderLight: "#F3EDE5",
  text: "#2C2418", textMuted: "#9A8D7F", textLight: "#B8AA9A",
  accent: "#BF5B3F", accentLight: "#F4DDD5",
  dark: "#2C2418", darkCard: "#362E22",
  green: "#4E7A42", greenLight: "#D2E4CB",
};

// ─── Components ──────────────────────────────────────────────────

function FlatmatePicker({ onSelect }) {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: `linear-gradient(180deg, ${C.bg} 0%, #EDE1D3 100%)`,
      padding: 24, fontFamily: fonts,
    }}>
      
      <h1 style={{
        fontFamily: displayFont, fontSize: 36, fontWeight: 800, color: C.text,
        margin: "0 0 4px", letterSpacing: "-0.03em",
      }}>Flat Kitchen</h1>
      <p style={{ color: C.textMuted, fontSize: 15, margin: "0 0 44px" }}>Who's here?</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 280 }}>
        {FLATMATES.map(fm => (
          <button key={fm.name} onClick={() => onSelect(fm.name)} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "16px 20px", borderRadius: 16, border: `1.5px solid ${C.border}`,
            background: C.card, cursor: "pointer", fontSize: 17, fontWeight: 600,
            fontFamily: fonts, color: C.text, transition: "all 0.15s",
            boxShadow: "0 1px 4px rgba(44,36,24,0.04)",
          }}>
            <span style={{
              width: 42, height: 42, borderRadius: 12, display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 18,
              background: C.accentLight, fontWeight: 700, color: C.accent,
              fontFamily: displayFont,
            }}>{fm.name[0]}</span>
            {fm.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function DayStrip({ selectedDate, onSelect }) {
  const days = [];
  for (let i = -2; i <= 4; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(dateKey(d));
  }
  const stripRef = useRef(null);
  useEffect(() => {
    if (stripRef.current) {
      const active = stripRef.current.querySelector('[data-active="true"]');
      if (active) active.scrollIntoView({ inline: "center", behavior: "smooth" });
    }
  }, [selectedDate]);

  return (
    <div ref={stripRef} style={{
      display: "flex", gap: 6, overflowX: "auto", padding: "0 16px 4px",
      scrollbarWidth: "none", msOverflowStyle: "none",
    }}>
      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
      {days.map(dk => {
        const { weekday, day } = formatDay(dk);
        const sel = dk === selectedDate;
        const today = isToday(dk);
        return (
          <button key={dk} data-active={sel ? "true" : "false"} onClick={() => onSelect(dk)} style={{
            flexShrink: 0, width: 52, padding: "8px 0 10px", borderRadius: 14,
            border: sel ? "none" : `1.5px solid ${today ? C.accent + "44" : C.border}`,
            background: sel ? C.dark : "transparent",
            cursor: "pointer", textAlign: "center", transition: "all 0.15s",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 2,
              color: sel ? C.textLight : today ? C.accent : C.textMuted,
              fontFamily: fonts,
            }}>{weekday}</div>
            <div style={{
              fontSize: 20, fontWeight: 700, fontFamily: displayFont,
              color: sel ? "#fff" : C.text,
            }}>{day}</div>
          </button>
        );
      })}
      <button onClick={() => {
        const input = document.createElement("input");
        input.type = "date";
        input.value = selectedDate;
        input.style.position = "fixed";
        input.style.opacity = "0";
        input.style.top = "0";
        document.body.appendChild(input);
        input.addEventListener("change", (e) => {
          onSelect(e.target.value);
          document.body.removeChild(input);
        });
        input.addEventListener("blur", () => {
          setTimeout(() => { if (document.body.contains(input)) document.body.removeChild(input); }, 200);
        });
        input.showPicker ? input.showPicker() : input.focus();
      }} style={{
        flexShrink: 0, width: 52, padding: "8px 0 10px", borderRadius: 14,
        border: `1.5px dashed ${C.border}`, background: "transparent",
        cursor: "pointer", textAlign: "center", fontFamily: fonts,
        color: C.textMuted, fontSize: 18,
      }}>···</button>
    </div>
  );
}

function AttendanceRow({ currentUser, selectedDate, attendance, setAttendance }) {
  const toggle = (name) => {
    setAttendance(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[selectedDate]) copy[selectedDate] = {};
      const cur = copy[selectedDate][name];
      if (!cur) copy[selectedDate][name] = ATTENDANCE.HOME;
      else if (cur === ATTENDANCE.HOME) copy[selectedDate][name] = ATTENDANCE.UNSURE;
      else if (cur === ATTENDANCE.UNSURE) copy[selectedDate][name] = ATTENDANCE.AWAY;
      else delete copy[selectedDate][name];
      return copy;
    });
  };

  return (
    <div style={{ display: "flex", gap: 8, padding: "0 16px" }}>
      {FLATMATES.map(fm => {
        const status = attendance[selectedDate]?.[fm.name];
        const isMe = fm.name === currentUser;
        const ac = ATT_COLORS[status] || ATT_COLORS.none;
        const statusLabel = status === "home" ? "Home" : status === "away" ? "Away" : status === "unsure" ? "Unsure" : (isMe ? "Tap" : "—");
        return (
          <button key={fm.name} onClick={() => { if (isMe) toggle(fm.name); }} style={{
            flex: 1, padding: "10px 0", borderRadius: 12,
            border: status ? `2px solid ${ac.border}` : `2px dashed ${ac.border}`,
            background: ac.bg,
            cursor: isMe ? "pointer" : "default", textAlign: "center", transition: "all 0.15s",
            position: "relative",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: ac.text, fontFamily: fonts }}>
              {fm.name}
            </div>
            <div style={{
              fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              color: ac.text, fontFamily: fonts, marginTop: 2,
            }}>{statusLabel}</div>
            {isMe && <div style={{
              position: "absolute", top: -3, right: -3, width: 8, height: 8,
              borderRadius: "50%", background: C.accent, border: `2px solid ${C.bg}`,
            }} />}
          </button>
        );
      })}
    </div>
  );
}

function IdeaCard({ idea, currentUser, onLike, onComment, onDeleteComment, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const fm = FLATMATES.find(f => f.name === idea.author);
  const liked = idea.likes?.includes(currentUser);
  const likeCount = idea.likes?.length || 0;

  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: 16,
      border: `1px solid ${C.border}`, marginBottom: 10,
      boxShadow: "0 1px 3px rgba(44,36,24,0.03)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 16, fontWeight: 700, color: C.text, fontFamily: displayFont,
            marginBottom: 4, lineHeight: 1.3,
          }}>{idea.dish}</div>
          <div style={{ fontSize: 12, color: C.textMuted, fontFamily: fonts }}>
            <span style={{ color: C.text, fontWeight: 600 }}>{idea.author}</span>
          </div>
          {idea.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
              {idea.tags.map(tid => {
                const t = TAGS.find(x => x.id === tid);
                return t ? (
                  <span key={tid} style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 20,
                    background: C.cardAlt, border: `1px solid ${C.borderLight}`,
                    color: C.textMuted, fontFamily: fonts, whiteSpace: "nowrap",
                  }}>{t.emoji} {t.label}</span>
                ) : null;
              })}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginLeft: 12 }}>
          <button onClick={() => onLike(idea.id)} style={{
            width: 44, height: 44, borderRadius: 12, border: "none",
            background: liked ? C.accentLight : C.cardAlt,
            cursor: "pointer", fontSize: 18, display: "flex",
            alignItems: "center", justifyContent: "center",
            transition: "all 0.15s", transform: liked ? "scale(1.05)" : "none",
          }}>{liked ? "❤️" : "🤍"}</button>
          <span style={{ fontSize: 12, fontWeight: 700, color: liked ? C.accent : C.textLight, fontFamily: fonts }}>
            {likeCount}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <button onClick={() => setShowComments(!showComments)} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 12, color: C.textMuted, fontFamily: fonts, fontWeight: 600,
          padding: 0, display: "flex", alignItems: "center", gap: 4,
        }}>
          💬 {idea.comments?.length || 0} comment{(idea.comments?.length || 0) !== 1 ? "s" : ""}
          <span style={{ fontSize: 10, transition: "transform 0.15s", display: "inline-block", transform: showComments ? "rotate(180deg)" : "none" }}>▾</span>
        </button>

        {showComments && (
          <div style={{ marginTop: 8 }}>
            {idea.comments?.map((c, i) => {
              const cfm = FLATMATES.find(f => f.name === c.author);
              return (
                <div key={i} style={{
                  padding: "8px 0", borderTop: i > 0 ? `1px solid ${C.borderLight}` : "none",
                  fontSize: 13, color: C.text, fontFamily: fonts, lineHeight: 1.4,
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8,
                }}>
                  <div>
                    <span style={{ fontWeight: 700, color: C.text }}>{c.author}</span>{" "}
                    {c.text}
                  </div>
                  {c.author === currentUser && (
                    <button onClick={() => onDeleteComment(idea.id, i)} style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 11, color: C.textLight, fontFamily: fonts, padding: "2px 4px",
                      flexShrink: 0,
                    }}>✕</button>
                  )}
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={e => {
                  if (e.key === "Enter" && newComment.trim()) {
                    onComment(idea.id, newComment.trim());
                    setNewComment("");
                  }
                }}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.cardAlt,
                  fontSize: 13, fontFamily: fonts, color: C.text, outline: "none",
                }} />
              <button onClick={() => {
                if (newComment.trim()) { onComment(idea.id, newComment.trim()); setNewComment(""); }
              }} style={{
                padding: "8px 14px", borderRadius: 10, border: "none",
                background: C.accent, color: "#fff", fontSize: 13,
                fontWeight: 600, fontFamily: fonts, cursor: "pointer",
              }}>Send</button>
            </div>
          </div>
        )}
      </div>

      {idea.author === currentUser && (
        <button onClick={() => onDelete(idea.id)} style={{
          marginTop: 8, background: "none", border: "none", cursor: "pointer",
          fontSize: 11, color: C.textLight, fontFamily: fonts, padding: 0,
        }}>Delete idea</button>
      )}
    </div>
  );
}

function TagPicker({ selected, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? TAGS : TAGS.slice(0, 8);
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {shown.map(t => {
        const active = selected.includes(t.id);
        return (
          <button key={t.id} onClick={() => {
            onChange(active ? selected.filter(x => x !== t.id) : [...selected, t.id]);
          }} style={{
            padding: "5px 10px", borderRadius: 20, fontSize: 12,
            border: active ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
            background: active ? C.accentLight : "transparent",
            color: active ? C.accent : C.textMuted, cursor: "pointer",
            fontFamily: fonts, fontWeight: active ? 700 : 500,
            transition: "all 0.12s", whiteSpace: "nowrap",
          }}>{t.emoji} {t.label}</button>
        );
      })}
      {!expanded && (
        <button onClick={() => setExpanded(true)} style={{
          padding: "5px 12px", borderRadius: 20, fontSize: 12,
          border: `1px dashed ${C.border}`, background: "transparent",
          color: C.textMuted, cursor: "pointer", fontFamily: fonts,
        }}>+{TAGS.length - 8} more</button>
      )}
      {expanded && (
        <button onClick={() => setExpanded(false)} style={{
          padding: "5px 12px", borderRadius: 20, fontSize: 12,
          border: `1px dashed ${C.border}`, background: "transparent",
          color: C.textMuted, cursor: "pointer", fontFamily: fonts,
        }}>Show less</button>
      )}
    </div>
  );
}

function NewIdeaForm({ currentUser, onSubmit, onCancel }) {
  const [dish, setDish] = useState("");
  const [tags, setTags] = useState([]);
  return (
    <div style={{
      background: C.card, borderRadius: 20, padding: 20,
      border: `1px solid ${C.border}`, marginBottom: 12,
    }}>
      <div style={{
        fontSize: 17, fontWeight: 700, color: C.text, fontFamily: displayFont, marginBottom: 14,
      }}>Suggest a dish</div>
      <input value={dish} onChange={e => setDish(e.target.value)} placeholder="e.g. Thai Green Curry"
        autoFocus
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 12,
          border: `1.5px solid ${C.border}`, background: C.cardAlt,
          fontSize: 15, fontFamily: fonts, color: C.text, outline: "none",
          boxSizing: "border-box", marginBottom: 12,
        }} />
      <div style={{
        fontSize: 12, fontWeight: 700, color: C.textMuted, fontFamily: fonts,
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
      }}>Tags</div>
      <TagPicker selected={tags} onChange={setTags} />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={() => { if (dish.trim()) onSubmit({ dish: dish.trim(), tags }); }} style={{
          flex: 1, padding: "12px", borderRadius: 12, border: "none",
          background: C.accent, color: "#fff", fontSize: 15, fontWeight: 600,
          fontFamily: fonts, cursor: "pointer", opacity: dish.trim() ? 1 : 0.4,
        }}>Add Idea</button>
        <button onClick={onCancel} style={{
          padding: "12px 18px", borderRadius: 12, border: `1px solid ${C.border}`,
          background: "transparent", color: C.textMuted, fontSize: 15,
          fontFamily: fonts, cursor: "pointer",
        }}>✕</button>
      </div>
    </div>
  );
}

function Slider({ value, onChange, label, color, icon }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: fonts }}>{icon} {label}</span>
        <span style={{ fontSize: 20, fontWeight: 800, color, fontFamily: displayFont }}>{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={e => onChange(+e.target.value)}
        style={{
          width: "100%", height: 5, appearance: "none", WebkitAppearance: "none",
          borderRadius: 3, outline: "none", cursor: "pointer",
          background: `linear-gradient(to right, ${color} ${(value - 1) / 9 * 100}%, ${C.border} ${(value - 1) / 9 * 100}%)`,
          accentColor: color,
        }} />
    </div>
  );
}

function MealForm({ currentUser, onSubmit, onCancel, initial }) {
  const [dish, setDish] = useState(initial?.dish || "");
  const [date, setDate] = useState(initial?.date || dateKey(new Date()));
  const [cook, setCook] = useState(initial?.cook || currentUser);
  const [tastiness, setTastiness] = useState(initial?.tastiness || 7);
  const [effort, setEffort] = useState(initial?.effort || 5);
  const [cost, setCost] = useState(initial?.cost?.toString() || "");
  const [comment, setComment] = useState(initial?.comment || "");
  const [tags, setTags] = useState(initial?.tags || []);

  return (
    <div style={{
      background: C.card, borderRadius: 20, padding: 20,
      border: `1px solid ${C.border}`,
    }}>
      <div style={{
        fontSize: 20, fontWeight: 800, color: C.text, fontFamily: displayFont, marginBottom: 18,
      }}>{initial ? "Edit Meal" : "Log a Meal"}</div>

      <input value={dish} onChange={e => setDish(e.target.value)} placeholder="What did you cook?"
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 12, marginBottom: 12,
          border: `1.5px solid ${C.border}`, background: C.cardAlt,
          fontSize: 15, fontFamily: fonts, color: C.text, outline: "none",
          boxSizing: "border-box",
        }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div>
          <label style={labelSt}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldSt} />
        </div>
        <div>
          <label style={labelSt}>Cook</label>
          <select value={cook} onChange={e => setCook(e.target.value)} style={fieldSt}>
            {FLATMATES.map(fm => <option key={fm.name} value={fm.name}>{fm.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{
        fontSize: 12, fontWeight: 700, color: C.textMuted, fontFamily: fonts,
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
      }}>Tags</div>
      <div style={{ marginBottom: 14 }}>
        <TagPicker selected={tags} onChange={setTags} />
      </div>

      <Slider value={tastiness} onChange={setTastiness} label="Tastiness" color={C.accent} icon="😋" />
      <Slider value={effort} onChange={setEffort} label="Effort" color={C.green} icon="💪" />

      <div style={{ marginBottom: 12 }}>
        <label style={labelSt}>Cost (€)</label>
        <input type="number" step="0.5" min="0" value={cost} onChange={e => setCost(e.target.value)}
          placeholder="0.00" style={fieldSt} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelSt}>Notes</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Recipe link, tweaks..."
          rows={2} style={{ ...fieldSt, resize: "vertical" }} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => {
          if (!dish.trim()) return;
          onSubmit({
            id: initial?.id || Date.now(), dish: dish.trim(), date, cook,
            tastiness, effort, cost: parseFloat(cost) || 0, comment: comment.trim(), tags,
          });
        }} style={{
          flex: 1, padding: "13px", borderRadius: 12, border: "none",
          background: C.accent, color: "#fff", fontSize: 15, fontWeight: 600,
          fontFamily: fonts, cursor: "pointer",
        }}>{initial ? "Update" : "Save"}</button>
        <button onClick={onCancel} style={{
          padding: "13px 18px", borderRadius: 12, border: `1px solid ${C.border}`,
          background: "transparent", color: C.textMuted, fontSize: 15,
          fontFamily: fonts, cursor: "pointer",
        }}>Cancel</button>
      </div>
    </div>
  );
}

function MealCard({ meal, onEdit, onDelete }) {
  const fm = FLATMATES.find(f => f.name === meal.cook);
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: 14,
      border: `1px solid ${C.border}`, marginBottom: 10,
      boxShadow: "0 1px 3px rgba(44,36,24,0.03)",
    }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: displayFont, lineHeight: 1.3 }}>
            {meal.dish}
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, fontFamily: fonts, marginTop: 2 }}>
            <span style={{ color: C.text, fontWeight: 600 }}>{meal.cook}</span>
            {" · "}{meal.date}{meal.cost > 0 && ` · €${meal.cost.toFixed(2)}`}
          </div>
          {meal.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
              {meal.tags.slice(0, 4).map(tid => {
                const t = TAGS.find(x => x.id === tid);
                return t ? (
                  <span key={tid} style={{
                    fontSize: 10, padding: "1px 6px", borderRadius: 10,
                    background: C.cardAlt, color: C.textMuted, fontFamily: fonts,
                  }}>{t.emoji} {t.label}</span>
                ) : null;
              })}
              {meal.tags.length > 4 && (
                <span style={{ fontSize: 10, color: C.textLight, fontFamily: fonts }}>+{meal.tags.length - 4}</span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.accent, fontFamily: displayFont }}>{meal.tastiness}</div>
            <div style={{ fontSize: 8, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: fonts }}>taste</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.green, fontFamily: displayFont }}>{meal.effort}</div>
            <div style={{ fontSize: 8, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: fonts }}>effort</div>
          </div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.borderLight}` }}>
          {meal.comment && <p style={{
            margin: "0 0 10px", fontSize: 13, color: C.textMuted, fontFamily: fonts,
            fontStyle: "italic", lineHeight: 1.5,
          }}>"{meal.comment}"</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onEdit(meal)} style={smallBtn}>Edit</button>
            <button onClick={() => onDelete(meal.id)} style={{ ...smallBtn, color: C.accent, borderColor: C.accent }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stats({ meals }) {
  if (!meals.length) return null;
  const avg = (arr, fn) => (arr.reduce((s, m) => s + fn(m), 0) / arr.length).toFixed(1);
  const cookCounts = {};
  FLATMATES.forEach(f => cookCounts[f.name] = 0);
  meals.forEach(m => { if (cookCounts[m.cook] !== undefined) cookCounts[m.cook]++; });
  const topDish = meals.reduce((a, b) => b.tastiness > a.tastiness ? b : a);

  return (
    <div style={{
      background: C.dark, borderRadius: 20, padding: 20, color: "#fff", marginBottom: 16,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
        color: C.textLight, fontFamily: fonts, marginBottom: 12,
      }}>Kitchen Stats</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 14 }}>
        {[
          { l: "Meals", v: meals.length, i: "🍽" },
          { l: "Avg Taste", v: avg(meals, m => m.tastiness), i: "😋" },
          { l: "Total €", v: `€${meals.reduce((s, m) => s + m.cost, 0).toFixed(0)}`, i: "💰" },
          { l: "Avg Effort", v: avg(meals, m => m.effort), i: "💪" },
        ].map(s => (
          <div key={s.l}>
            <div style={{ fontSize: 9, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: fonts }}>{s.i} {s.l}</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: displayFont }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{
        background: C.darkCard, borderRadius: 12, padding: 10,
        fontSize: 12, fontFamily: fonts, color: C.textLight,
      }}>⭐ Best: <strong style={{ color: "#fff" }}>{topDish.dish}</strong> ({topDish.tastiness}/10) by {topDish.cook}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {FLATMATES.map(fm => (
          <div key={fm.name} style={{
            flex: 1, background: C.darkCard, borderRadius: 10, padding: 8, textAlign: "center",
          }}>
            <div style={{ fontSize: 10, color: C.accentLight, fontFamily: fonts }}>{fm.name}</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: displayFont, color: C.accentLight }}>{cookCounts[fm.name]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tiny styles ─────────────────────────────────────────────────
const labelSt = {
  display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted,
  marginBottom: 4, fontFamily: fonts, textTransform: "uppercase", letterSpacing: "0.05em",
};
const fieldSt = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: `1.5px solid ${C.border}`, background: C.cardAlt,
  fontSize: 14, fontFamily: fonts, color: C.text, outline: "none", boxSizing: "border-box",
};
const smallBtn = {
  padding: "5px 12px", borderRadius: 8, background: "transparent",
  border: `1px solid ${C.green}`, fontSize: 12, fontWeight: 600,
  color: C.green, cursor: "pointer", fontFamily: fonts,
};

// ─── Main App ────────────────────────────────────────────────────
export default function FlatKitchen() {
  const [currentUser, setCurrentUser] = useStore("fk_user3", null);
  const [tab, setTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [attendance, setAttendance] = useStore("fk_att3", {});
  const [ideas, setIdeas] = useStore("fk_ideas3", {});
  const [meals, setMeals] = useStore("fk_meals3", []);
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);
  const [editMeal, setEditMeal] = useState(null);
  const [filterTag, setFilterTag] = useState(null);

  if (!currentUser) return <FlatmatePicker onSelect={setCurrentUser} />;
  const fm = FLATMATES.find(f => f.name === currentUser);

  const dayIdeas = ideas[selectedDate] || [];
  const setDayIdeas = (fn) => setIdeas(prev => ({
    ...prev, [selectedDate]: typeof fn === "function" ? fn(prev[selectedDate] || []) : fn,
  }));

  const addIdea = ({ dish, tags }) => {
    setDayIdeas(prev => [...prev, {
      id: Date.now(), dish, tags, author: currentUser, likes: [], comments: [],
    }]);
    setShowIdeaForm(false);
  };

  const likeIdea = (id) => {
    setDayIdeas(prev => prev.map(i => {
      if (i.id !== id) return i;
      const liked = i.likes.includes(currentUser);
      return { ...i, likes: liked ? i.likes.filter(n => n !== currentUser) : [...i.likes, currentUser] };
    }));
  };

  const commentIdea = (id, text) => {
    setDayIdeas(prev => prev.map(i => {
      if (i.id !== id) return i;
      return { ...i, comments: [...(i.comments || []), { author: currentUser, text }] };
    }));
  };

  const deleteComment = (ideaId, commentIndex) => {
    setDayIdeas(prev => prev.map(i => {
      if (i.id !== ideaId) return i;
      return { ...i, comments: i.comments.filter((_, idx) => idx !== commentIndex) };
    }));
  };

  const deleteIdea = (id) => {
    setDayIdeas(prev => prev.filter(i => i.id !== id));
  };

  const submitMeal = (meal) => {
    if (editMeal) setMeals(prev => prev.map(m => m.id === meal.id ? meal : m));
    else setMeals(prev => [meal, ...prev]);
    setShowMealForm(false);
    setEditMeal(null);
  };

  const filteredMeals = filterTag ? meals.filter(m => m.tags?.includes(filterTag)) : meals;
  const sortedMeals = [...filteredMeals].sort((a, b) => b.date.localeCompare(a.date));

  const { weekday, day, month } = formatDay(selectedDate);
  const today = isToday(selectedDate);

  return (
    <div style={{
      minHeight: "100dvh", background: C.bg, fontFamily: fonts,
      maxWidth: 480, margin: "0 auto",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700;800&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          
          <span style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: displayFont, letterSpacing: "-0.02em" }}>
            Flat Kitchen
          </span>
        </div>
        <button onClick={() => setCurrentUser(null)} style={{
          background: C.accentLight, border: "none", borderRadius: 20,
          padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700,
          color: C.accent, fontFamily: fonts,
        }}>{currentUser}</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "0 16px 8px", gap: 0 }}>
        {[
          { id: "today", label: "Today", icon: "📅" },
          { id: "cookbook", label: "Cookbook", icon: "📖" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "9px 0", border: "none",
            borderBottom: tab === t.id ? `2.5px solid ${C.accent}` : `2.5px solid transparent`,
            background: "transparent", cursor: "pointer",
            fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? C.text : C.textMuted, fontFamily: fonts,
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ─── TODAY TAB ─── */}
      {tab === "today" && (
        <div>
          <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} />

          <div style={{ padding: "16px 16px 6px", textAlign: "center" }}>
            <div style={{
              fontSize: 28, fontWeight: 800, color: C.text, fontFamily: displayFont, lineHeight: 1.1,
            }}>{today ? "Today" : `${weekday}, ${month} ${day}`}</div>
          </div>

          <div style={{ padding: "12px 0 16px" }}>
            <div style={{
              padding: "0 16px 8px", fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em",
              color: C.textMuted, fontFamily: fonts,
            }}>Who's home for dinner?</div>
            <AttendanceRow currentUser={currentUser} selectedDate={selectedDate}
              attendance={attendance} setAttendance={setAttendance} />
          </div>

          <div style={{ padding: "0 16px 24px" }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.1em", color: C.textMuted, fontFamily: fonts,
              }}>Dinner ideas ({dayIdeas.length})</div>
              {!showIdeaForm && (
                <button onClick={() => setShowIdeaForm(true)} style={{
                  padding: "5px 12px", borderRadius: 10, border: "none",
                  background: C.accent, color: "#fff", fontSize: 12,
                  fontWeight: 700, fontFamily: fonts, cursor: "pointer",
                }}>+ Idea</button>
              )}
            </div>

            {showIdeaForm && (
              <NewIdeaForm currentUser={currentUser} onSubmit={addIdea} onCancel={() => setShowIdeaForm(false)} />
            )}

            {dayIdeas.length === 0 && !showIdeaForm && (
              <div style={{
                textAlign: "center", padding: "30px 20px", color: C.textLight,
                border: `1.5px dashed ${C.border}`, borderRadius: 16,
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>💡</div>
                <div style={{ fontSize: 14, fontFamily: displayFont, fontWeight: 700, color: C.textMuted }}>No ideas yet</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>Suggest what to cook tonight!</div>
              </div>
            )}

            {[...dayIdeas].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)).map(idea => (
              <IdeaCard key={idea.id} idea={idea} currentUser={currentUser}
                onLike={likeIdea} onComment={commentIdea} onDeleteComment={deleteComment} onDelete={deleteIdea} />
            ))}
          </div>
        </div>
      )}

      {/* ─── COOKBOOK TAB ─── */}
      {tab === "cookbook" && (
        <div style={{ padding: "12px 16px 24px" }}>
          <Stats meals={meals} />

          {showMealForm ? (
            <MealForm currentUser={currentUser} onSubmit={submitMeal}
              onCancel={() => { setShowMealForm(false); setEditMeal(null); }} initial={editMeal} />
          ) : (
            <>
              <button onClick={() => setShowMealForm(true)} style={{
                width: "100%", padding: "13px", borderRadius: 14, border: "none",
                background: C.accent, color: "#fff", fontSize: 15, fontWeight: 700,
                fontFamily: fonts, cursor: "pointer", marginBottom: 14,
                boxShadow: `0 4px 14px ${C.accent}33`,
              }}>+ Log a Meal</button>

              {meals.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{
                    display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4,
                    scrollbarWidth: "none",
                  }}>
                    <button onClick={() => setFilterTag(null)} style={{
                      padding: "4px 10px", borderRadius: 20, fontSize: 11, whiteSpace: "nowrap",
                      border: !filterTag ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                      background: !filterTag ? C.accentLight : "transparent",
                      color: !filterTag ? C.accent : C.textMuted,
                      cursor: "pointer", fontFamily: fonts, fontWeight: !filterTag ? 700 : 500,
                    }}>All</button>
                    {[...new Set(meals.flatMap(m => m.tags || []))].map(tid => {
                      const t = TAGS.find(x => x.id === tid);
                      if (!t) return null;
                      const active = filterTag === tid;
                      return (
                        <button key={tid} onClick={() => setFilterTag(active ? null : tid)} style={{
                          padding: "4px 10px", borderRadius: 20, fontSize: 11, whiteSpace: "nowrap",
                          border: active ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                          background: active ? C.accentLight : "transparent",
                          color: active ? C.accent : C.textMuted,
                          cursor: "pointer", fontFamily: fonts, fontWeight: active ? 700 : 500,
                        }}>{t.emoji} {t.label}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {sortedMeals.length === 0 ? (
                <div style={{ textAlign: "center", padding: "36px 20px", color: C.textLight }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🍳</div>
                  <div style={{ fontSize: 17, fontFamily: displayFont, fontWeight: 700, color: C.textMuted }}>
                    {filterTag ? "No meals with this tag" : "No meals yet"}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    {filterTag ? "Try a different filter" : "Cook something and log it!"}
                  </div>
                </div>
              ) : (
                sortedMeals.map(m => (
                  <MealCard key={m.id} meal={m}
                    onEdit={m => { setEditMeal(m); setShowMealForm(true); }}
                    onDelete={id => setMeals(prev => prev.filter(x => x.id !== id))} />
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
