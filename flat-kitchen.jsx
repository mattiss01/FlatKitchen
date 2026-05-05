import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ────────────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ─── Data ────────────────────────────────────────────────────────
const FLATMATES = [
  { name: "Mattis", emoji: "🦊" },
  { name: "Robert", emoji: "🐻" },
  { name: "Jakob", emoji: "🦅" },
];


const ATTENDANCE = { HOME: "home", AWAY: "away", UNSURE: "unsure" };

const ATT_COLORS = {
  home: { bg: "#D9F2D0", border: "#4AAF50", text: "#256D2B" },
  away: { bg: "#FCE0E0", border: "#D94F4F", text: "#A63030" },
  unsure: { bg: "#FFF4CC", border: "#D4A720", text: "#8A6A00" },
  none: { bg: "transparent", border: "#DDD3C4", text: "#B0A090" },
};

// ─── Utilities ───────────────────────────────────────────────────
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

// localStorage for per-device user selection only
function useLocalStore(key, initial) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; }
    catch { return initial; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(val)); }, [key, val]);
  return [val, setVal];
}

// ─── Supabase Hooks ──────────────────────────────────────────────

function groupAttendance(rows) {
  const grouped = {};
  (rows || []).forEach(r => {
    if (!grouped[r.date]) grouped[r.date] = {};
    grouped[r.date][r.name] = r.status;
  });
  return grouped;
}

function groupIdeas(rows) {
  const grouped = {};
  (rows || []).forEach(r => {
    if (!grouped[r.date]) grouped[r.date] = [];
    grouped[r.date].push({
      id: r.id, dish: r.dish, author: r.author,
      tags: r.tags || [], likes: r.likes || [], comments: r.comments || [],
      recipe_url: r.recipe_url || null,
      recipe_image: r.recipe_image || null,
      recipe_title: r.recipe_title || null,
    });
  });
  return grouped;
}

function useAttendance() {
  const [attendance, setAttendance] = useState({});

  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("attendance").select("*");
    setAttendance(groupAttendance(data));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    fetchAll();
    const channel = supabase.channel("attendance-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const toggleAttendance = useCallback(async (date, name) => {
    const current = attendance[date]?.[name];
    let newStatus;
    if (!current) newStatus = "home";
    else if (current === "home") newStatus = "unsure";
    else if (current === "unsure") newStatus = "away";
    else newStatus = null;

    setAttendance(prev => {
      const copy = { ...prev, [date]: { ...(prev[date] || {}) } };
      if (newStatus) copy[date][name] = newStatus;
      else delete copy[date][name];
      return copy;
    });

    if (!supabase) return;
    if (newStatus) {
      await supabase.from("attendance").upsert({ date, name, status: newStatus });
    } else {
      await supabase.from("attendance").delete().eq("date", date).eq("name", name);
    }
  }, [attendance]);

  return { attendance, toggleAttendance };
}

function useIdeas() {
  const [ideas, setIdeas] = useState({});

  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("ideas").select("*").order("created_at", { ascending: true });
    if (error) { console.error("[ideas] fetch failed:", error); return; }
    setIdeas(groupIdeas(data));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    fetchAll();
    const channel = supabase.channel("ideas-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "ideas" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const addIdea = useCallback(async (date, { dish, tags, author, recipe }) => {
    if (!supabase) {
      alert("Backend not configured — cannot save. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Vercel project's Environment Variables, then redeploy.");
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const recipeFields = recipe
      ? { recipe_url: recipe.url || null, recipe_image: recipe.image || null, recipe_title: recipe.title || null }
      : { recipe_url: null, recipe_image: null, recipe_title: null };
    setIdeas(prev => ({
      ...prev,
      [date]: [...(prev[date] || []), { id: tempId, dish, author, tags, likes: [], comments: [], ...recipeFields }],
    }));
    const rollback = () => setIdeas(prev => ({
      ...prev,
      [date]: (prev[date] || []).filter(i => i.id !== tempId),
    }));
    try {
      const { data, error } = await supabase.from("ideas")
        .insert({ date, dish, tags, author, likes: [], comments: [], ...recipeFields })
        .select().single();
      if (error) {
        console.error("[ideas] insert failed:", error);
        alert(`Couldn't save idea: ${error.message}`);
        rollback();
        return;
      }
      setIdeas(prev => ({
        ...prev,
        [date]: (prev[date] || []).map(i => i.id === tempId ? {
          id: data.id, dish: data.dish, author: data.author,
          tags: data.tags || [], likes: data.likes || [], comments: data.comments || [],
          recipe_url: data.recipe_url || null,
          recipe_image: data.recipe_image || null,
          recipe_title: data.recipe_title || null,
        } : i),
      }));
    } catch (e) {
      console.error("[ideas] insert threw:", e);
      alert(`Couldn't save idea: ${e.message || e}`);
      rollback();
    }
  }, []);

  const likeIdea = useCallback(async (date, ideaId, userName) => {
    let prevLikes = null;
    let newLikes = null;
    setIdeas(prev => {
      const idea = prev[date]?.find(i => i.id === ideaId);
      if (!idea) return prev;
      prevLikes = idea.likes || [];
      const liked = prevLikes.includes(userName);
      newLikes = liked ? prevLikes.filter(n => n !== userName) : [...prevLikes, userName];
      return {
        ...prev,
        [date]: prev[date].map(i => i.id === ideaId ? { ...i, likes: newLikes } : i),
      };
    });
    if (!supabase || newLikes === null) return;
    const { error } = await supabase.from("ideas").update({ likes: newLikes }).eq("id", ideaId);
    if (error) {
      console.error("[ideas] like update failed:", error);
      setIdeas(prev => ({
        ...prev,
        [date]: (prev[date] || []).map(i => i.id === ideaId ? { ...i, likes: prevLikes } : i),
      }));
    }
  }, []);

  const commentIdea = useCallback(async (date, ideaId, author, text) => {
    let prevComments = null;
    let newComments = null;
    setIdeas(prev => {
      const idea = prev[date]?.find(i => i.id === ideaId);
      if (!idea) return prev;
      prevComments = idea.comments || [];
      newComments = [...prevComments, { author, text }];
      return {
        ...prev,
        [date]: prev[date].map(i => i.id === ideaId ? { ...i, comments: newComments } : i),
      };
    });
    if (!supabase || newComments === null) return;
    const { error } = await supabase.from("ideas").update({ comments: newComments }).eq("id", ideaId);
    if (error) {
      console.error("[ideas] comment update failed:", error);
      alert(`Couldn't save comment: ${error.message}`);
      setIdeas(prev => ({
        ...prev,
        [date]: (prev[date] || []).map(i => i.id === ideaId ? { ...i, comments: prevComments } : i),
      }));
    }
  }, []);

  const deleteComment = useCallback(async (date, ideaId, commentIndex) => {
    let prevComments = null;
    let newComments = null;
    setIdeas(prev => {
      const idea = prev[date]?.find(i => i.id === ideaId);
      if (!idea) return prev;
      prevComments = idea.comments || [];
      newComments = prevComments.filter((_, idx) => idx !== commentIndex);
      return {
        ...prev,
        [date]: prev[date].map(i => i.id === ideaId ? { ...i, comments: newComments } : i),
      };
    });
    if (!supabase || newComments === null) return;
    const { error } = await supabase.from("ideas").update({ comments: newComments }).eq("id", ideaId);
    if (error) {
      console.error("[ideas] comment delete failed:", error);
      alert(`Couldn't delete comment: ${error.message}`);
      setIdeas(prev => ({
        ...prev,
        [date]: (prev[date] || []).map(i => i.id === ideaId ? { ...i, comments: prevComments } : i),
      }));
    }
  }, []);

  const deleteIdea = useCallback(async (date, ideaId) => {
    setIdeas(prev => ({
      ...prev,
      [date]: (prev[date] || []).filter(i => i.id !== ideaId),
    }));
    if (supabase) await supabase.from("ideas").delete().eq("id", ideaId);
  }, []);

  return { ideas, addIdea, likeIdea, commentIdea, deleteComment, deleteIdea };
}

function useMeals() {
  const [meals, setMeals] = useState([]);

  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("meals").select("*").order("created_at", { ascending: false });
    setMeals((data || []).map(m => ({
      ...m, cost: parseFloat(m.cost) || 0, tags: m.tags || [],
      recipe_url: m.recipe_url || null,
      recipe_image: m.recipe_image || null,
      recipe_title: m.recipe_title || null,
      photo_url: m.photo_url || null,
    })));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    fetchAll();
    const channel = supabase.channel("meals-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "meals" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const addMeal = useCallback(async (meal) => {
    if (!supabase) return;
    const { id, ...rest } = meal; // strip client-side id
    const { data } = await supabase.from("meals").insert(rest).select().single();
    if (data) {
      setMeals(prev => [{ ...data, cost: parseFloat(data.cost) || 0, tags: data.tags || [] }, ...prev]);
    }
  }, []);

  const updateMeal = useCallback(async (meal) => {
    if (!supabase) return;
    const { id, ...rest } = meal;
    await supabase.from("meals").update(rest).eq("id", id);
    setMeals(prev => prev.map(m => m.id === id ? { ...meal, cost: parseFloat(meal.cost) || 0 } : m));
  }, []);

  const deleteMeal = useCallback(async (id) => {
    setMeals(prev => prev.filter(m => m.id !== id));
    if (supabase) await supabase.from("meals").delete().eq("id", id);
  }, []);

  return { meals, addMeal, updateMeal, deleteMeal };
}

function useFavorites() {
  const [favorites, setFavorites] = useState([]);

  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("recipe_favorites")
      .select("*").order("created_at", { ascending: false });
    if (error) { console.error("[favorites] fetch failed:", error); return; }
    setFavorites(data || []);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    fetchAll();
    const channel = supabase.channel("favorites-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "recipe_favorites" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const addFavorite = useCallback(async ({ name, recipe }) => {
    if (!supabase) {
      alert("Backend not configured — cannot save favorites.");
      return;
    }
    const row = {
      name, recipe_id: String(recipe.id),
      title: recipe.title, url: recipe.url, image: recipe.image || null,
    };
    const tempId = `temp-${Date.now()}`;
    setFavorites(prev => [{ id: tempId, ...row, created_at: new Date().toISOString() }, ...prev]);
    const { data, error } = await supabase.from("recipe_favorites")
      .upsert(row, { onConflict: "name,recipe_id" })
      .select().single();
    if (error) {
      console.error("[favorites] insert failed:", error);
      alert(`Couldn't save favorite: ${error.message}`);
      setFavorites(prev => prev.filter(f => f.id !== tempId));
      return;
    }
    setFavorites(prev => prev.map(f => f.id === tempId ? data : f));
  }, []);

  const removeFavorite = useCallback(async (id) => {
    const prev = favorites;
    setFavorites(p => p.filter(f => f.id !== id));
    if (!supabase) return;
    const { error } = await supabase.from("recipe_favorites").delete().eq("id", id);
    if (error) {
      console.error("[favorites] delete failed:", error);
      alert(`Couldn't remove favorite: ${error.message}`);
      setFavorites(prev);
    }
  }, [favorites]);

  const isFavorite = useCallback((recipeId, name) =>
    favorites.some(f => f.name === name && f.recipe_id === String(recipeId)),
  [favorites]);

  const findFavorite = useCallback((recipeId, name) =>
    favorites.find(f => f.name === name && f.recipe_id === String(recipeId)),
  [favorites]);

  return { favorites, addFavorite, removeFavorite, isFavorite, findFavorite };
}

function useShopping() {
  const [items, setItems] = useState([]);

  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("shopping_items").select("*").order("created_at", { ascending: true });
    setItems(data || []);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    fetchAll();
    const channel = supabase.channel("shopping-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const addItem = useCallback(async (text, addedBy) => {
    if (!supabase) return;
    const tempId = `temp-${Date.now()}`;
    setItems(prev => [...prev, { id: tempId, text, added_by: addedBy, bought_by: null, bought_at: null, created_at: new Date().toISOString() }]);
    const { data, error } = await supabase.from("shopping_items").insert({ text, added_by: addedBy }).select().single();
    if (error) {
      console.error("[shopping] insert failed:", error);
      setItems(prev => prev.filter(i => i.id !== tempId));
    } else {
      setItems(prev => prev.map(i => i.id === tempId ? data : i));
    }
  }, []);

  const markBought = useCallback(async (id, boughtBy) => {
    const now = new Date().toISOString();
    setItems(prev => prev.map(i => i.id === id ? { ...i, bought_by: boughtBy, bought_at: now } : i));
    if (supabase) await supabase.from("shopping_items").update({ bought_by: boughtBy, bought_at: now }).eq("id", id);
  }, []);

  const unmarkBought = useCallback(async (id) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, bought_by: null, bought_at: null } : i));
    if (supabase) await supabase.from("shopping_items").update({ bought_by: null, bought_at: null }).eq("id", id);
  }, []);

  const deleteItem = useCallback(async (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (supabase) await supabase.from("shopping_items").delete().eq("id", id);
  }, []);

  return { items, addItem, markBought, unmarkBought, deleteItem };
}

function useExpenses() {
  const [expenses, setExpenses] = useState([]);

  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
    setExpenses((data || []).map(e => ({ ...e, amount: parseFloat(e.amount) || 0 })));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    fetchAll();
    const channel = supabase.channel("expenses-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const addExpense = useCallback(async (amount, paidBy, description, splitBetween) => {
    if (!supabase) return;
    const tempId = `temp-${Date.now()}`;
    setExpenses(prev => [{ id: tempId, amount, paid_by: paidBy, description, split_between: splitBetween, created_at: new Date().toISOString() }, ...prev]);
    const { data, error } = await supabase.from("expenses").insert({ amount, paid_by: paidBy, description, split_between: splitBetween }).select().single();
    if (error) {
      console.error("[expenses] insert failed:", error);
      setExpenses(prev => prev.filter(e => e.id !== tempId));
    } else {
      setExpenses(prev => prev.map(e => e.id === tempId ? { ...data, amount: parseFloat(data.amount) || 0 } : e));
    }
  }, []);

  const deleteExpense = useCallback(async (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (supabase) await supabase.from("expenses").delete().eq("id", id);
  }, []);

  return { expenses, addExpense, deleteExpense };
}

function useChefkochSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (q) => {
    if (!supabase) { setError("Backend not configured."); return; }
    if (!q || !q.trim()) { setResults([]); setError(null); return; }
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("chefkoch-search", { body: { q: q.trim() } });
      if (error) {
        console.error("[chefkoch-search] invoke failed:", error);
        setError(error.message || "Search failed");
        setResults([]);
      } else if (data && data.error) {
        setError(data.error);
        setResults([]);
      } else {
        setResults(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("[chefkoch-search] threw:", e);
      setError(e.message || String(e));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setResults([]); setError(null); }, []);

  return { results, loading, error, search, reset };
}

// ─── Design System ───────────────────────────────────────────────
const fonts = `'DM Sans', 'Helvetica Neue', sans-serif`;
const displayFont = `'Instrument Serif', Georgia, serif`;
const C = {
  bg: "#F4EDE4", card: "#FFFFFF", cardAlt: "#FBF7F1",
  border: "#DDD3C4", borderLight: "#EBE4DA",
  text: "#1C1714", textMuted: "#857668", textLight: "#AEA090",
  accent: "#C24530", accentLight: "#FBEAE4", accentSoft: "#E8907E",
  dark: "#1C1714", darkCard: "#2E251D",
  green: "#3B7A48", greenLight: "#D6EDD9",
};

const cssAnimation = `
@keyframes fk-fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fk-scaleIn {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes fk-popIn {
  0% { transform: scale(1); }
  40% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
.fk-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.fk-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(28,23,20,0.08);
}
.fk-btn {
  transition: all 0.15s ease;
}
.fk-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.06);
}
.fk-btn:active {
  transform: translateY(0) scale(0.97);
}
.fk-input:focus {
  border-color: ${C.accent} !important;
  box-shadow: 0 0 0 3px ${C.accent}18;
}
.fk-picker-btn {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fk-picker-btn:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 12px 28px rgba(28,23,20,0.1);
}
.fk-picker-btn:active {
  transform: translateY(0) scale(0.98);
}
.fk-like-pop {
  animation: fk-popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fk-tag {
  transition: all 0.12s ease;
}
.fk-tag:hover {
  transform: scale(1.04);
}
.fk-att-btn {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fk-att-btn:active {
  transform: scale(0.94);
}
div::-webkit-scrollbar { display: none; }
* { scrollbar-width: none; }
`;

// ─── Components ──────────────────────────────────────────────────

function FlatmatePicker({ onSelect }) {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: `radial-gradient(ellipse at 30% 20%, #F9F0E4 0%, #EDE1D1 50%, #DDD0BC 100%)`,
      padding: 32, fontFamily: fonts, position: "relative", overflow: "hidden",
    }}>
      <style>{cssAnimation}</style>
      <div style={{
        position: "absolute", width: 340, height: 340, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.accent}08, transparent 70%)`,
        top: -60, right: -80, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 260, height: 260, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.green}06, transparent 70%)`,
        bottom: -40, left: -60, pointerEvents: "none",
      }} />
      <div style={{ animation: "fk-fadeUp 0.6s ease", position: "relative" }}>
        <div style={{ fontSize: 44, textAlign: "center", marginBottom: 8, animation: "fk-fadeUp 0.5s ease" }}>🍳</div>
        <h1 style={{
          fontFamily: displayFont, fontSize: 42, fontWeight: 400, color: C.text,
          margin: "0 0 4px", letterSpacing: "-0.02em", textAlign: "center", fontStyle: "italic",
        }}>Flat Kitchen</h1>
        <p style={{
          color: C.textMuted, fontSize: 15, margin: "0 0 48px",
          fontFamily: fonts, fontWeight: 500, textAlign: "center", letterSpacing: "0.02em",
        }}>Who's cooking tonight?</p>
      </div>
      <div style={{
        display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 300,
        animation: "fk-fadeUp 0.7s ease 0.1s both",
      }}>
        {FLATMATES.map((fm, i) => (
          <button key={fm.name} className="fk-picker-btn" onClick={() => onSelect(fm.name)} style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "18px 22px", borderRadius: 18, border: `1.5px solid ${C.border}`,
            background: C.card, cursor: "pointer", fontSize: 18, fontWeight: 600,
            fontFamily: fonts, color: C.text,
            boxShadow: "0 2px 12px rgba(28,23,20,0.06)",
            animation: `fk-fadeUp 0.5s ease ${0.15 + i * 0.08}s both`,
          }}>
            <span style={{
              width: 46, height: 46, borderRadius: 14, display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 22,
            }}>{fm.emoji}</span>
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
      display: "flex", gap: 6, overflowX: "auto", padding: "0 16px 4px", scrollbarWidth: "none",
    }}>
      {days.map(dk => {
        const { weekday, day } = formatDay(dk);
        const sel = dk === selectedDate;
        const today = isToday(dk);
        return (
          <button key={dk} data-active={sel ? "true" : "false"} onClick={() => onSelect(dk)} style={{
            flexShrink: 0, width: 54, padding: "10px 0 12px", borderRadius: 16,
            border: sel ? "none" : `1.5px solid ${today ? C.accent + "33" : C.border}`,
            background: sel
              ? `linear-gradient(135deg, ${C.dark} 0%, #3D3228 100%)`
              : today ? C.accent + "08" : "transparent",
            cursor: "pointer", textAlign: "center",
            transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            boxShadow: sel ? "0 4px 16px rgba(28,23,20,0.15)" : "none",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 3,
              color: sel ? C.accentSoft : today ? C.accent : C.textMuted, fontFamily: fonts,
            }}>{weekday}</div>
            <div style={{
              fontSize: 21, fontWeight: 400, fontFamily: displayFont,
              color: sel ? "#fff" : C.text, fontStyle: "italic",
            }}>{day}</div>
          </button>
        );
      })}
      <button onClick={() => {
        const input = document.createElement("input");
        input.type = "date"; input.value = selectedDate;
        input.style.position = "fixed"; input.style.opacity = "0"; input.style.top = "0";
        document.body.appendChild(input);
        input.addEventListener("change", (e) => { onSelect(e.target.value); document.body.removeChild(input); });
        input.addEventListener("blur", () => {
          setTimeout(() => { if (document.body.contains(input)) document.body.removeChild(input); }, 200);
        });
        input.showPicker ? input.showPicker() : input.focus();
      }} style={{
        flexShrink: 0, width: 54, padding: "10px 0 12px", borderRadius: 16,
        border: `1.5px dashed ${C.border}`, background: "transparent",
        cursor: "pointer", textAlign: "center", fontFamily: fonts,
        color: C.textMuted, fontSize: 18, transition: "all 0.15s ease",
      }}>···</button>
    </div>
  );
}

function AttendanceRow({ currentUser, selectedDate, attendance, onToggle }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "0 16px" }}>
      {FLATMATES.map(fm => {
        const status = attendance[selectedDate]?.[fm.name];
        const isMe = fm.name === currentUser;
        const ac = ATT_COLORS[status] || ATT_COLORS.none;
        const statusLabel = status === "home" ? "Home" : status === "away" ? "Away" : status === "unsure" ? "Unsure" : (isMe ? "Tap" : "—");
        return (
          <button key={fm.name} className="fk-att-btn" onClick={() => { if (isMe) onToggle(selectedDate, fm.name); }} style={{
            flex: 1, padding: "12px 0 10px", borderRadius: 14,
            border: status ? `2px solid ${ac.border}` : `2px dashed ${ac.border}`,
            background: ac.bg,
            cursor: isMe ? "pointer" : "default", textAlign: "center", position: "relative",
          }}>
            <div style={{ fontSize: 16, marginBottom: 2 }}>{fm.emoji}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: ac.text, fontFamily: fonts }}>{fm.name}</div>
            <div style={{
              fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              color: ac.text, fontFamily: fonts, marginTop: 1, opacity: 0.8,
            }}>{statusLabel}</div>
            {isMe && <div style={{
              position: "absolute", top: -4, right: -4, width: 10, height: 10,
              borderRadius: "50%", background: C.accent, border: `2.5px solid ${C.bg}`,
            }} />}
          </button>
        );
      })}
    </div>
  );
}

function IdeaCard({ idea, currentUser, onLike, onComment, onDeleteComment, onDelete, delay }) {
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

function LabelInput({ selected, onChange, allLabels }) {
  const [inputVal, setInputVal] = useState("");

  const available = (inputVal.trim()
    ? allLabels.filter(l => l.toLowerCase().includes(inputVal.trim().toLowerCase()))
    : allLabels
  ).filter(l => !selected.includes(l));

  const addLabel = (label) => {
    const trimmed = label.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    onChange([...selected, trimmed]);
    setInputVal("");
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && inputVal.trim()) {
      e.preventDefault();
      addLabel(inputVal);
    }
  };

  return (
    <div>
      {selected.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
          {selected.map((label, i) => (
            <span key={i} style={{
              padding: "5px 10px", borderRadius: 20, fontSize: 12,
              background: C.accentLight, border: `1.5px solid ${C.accent}`,
              color: C.accent, fontFamily: fonts, fontWeight: 600,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              {label}
              <button onClick={() => onChange(selected.filter(l => l !== label))} style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, color: C.accent, padding: 0, lineHeight: 1,
              }}>×</button>
            </span>
          ))}
        </div>
      )}
      {available.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
          {available.map((label, i) => (
            <button key={i} className="fk-tag" onClick={() => addLabel(label)} style={{
              padding: "5px 10px", borderRadius: 20, fontSize: 12,
              border: `1px solid ${C.border}`, background: "transparent",
              color: C.textMuted, cursor: "pointer", fontFamily: fonts,
            }}>{label}</button>
          ))}
        </div>
      )}
      <input
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a label and press Enter…"
        className="fk-input"
        style={{
          width: "100%", padding: "9px 14px", borderRadius: 12,
          border: `1.5px solid ${C.border}`, background: C.cardAlt,
          fontSize: 13, fontFamily: fonts, color: C.text, outline: "none",
          boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      />
    </div>
  );
}

function NewIdeaForm({ currentUser, onSubmit, onCancel, isFavorite, onToggleFav, allLabels }) {
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

function Slider({ value, onChange, label, color, icon }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: fonts }}>{icon} {label}</span>
        <span style={{ fontSize: 22, fontWeight: 400, color, fontFamily: displayFont, fontStyle: "italic" }}>{value}</span>
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

function MealForm({ currentUser, onSubmit, onCancel, initial, allLabels, isFavorite, onToggleFav }) {
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

function MealCard({ meal, onEdit, onDelete, delay }) {
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

function Stats({ meals }) {
  if (!meals.length) return null;
  const avg = (arr, fn) => (arr.reduce((s, m) => s + fn(m), 0) / arr.length).toFixed(1);
  const cookCounts = {};
  FLATMATES.forEach(f => cookCounts[f.name] = 0);
  meals.forEach(m => { if (cookCounts[m.cook] !== undefined) cookCounts[m.cook]++; });
  const topDish = meals.reduce((a, b) => b.tastiness > a.tastiness ? b : a);

  return (
    <div style={{
      background: `linear-gradient(145deg, ${C.dark} 0%, #342B20 60%, #3D3025 100%)`,
      borderRadius: 22, padding: 22, color: "#fff", marginBottom: 16,
      boxShadow: "0 6px 24px rgba(28,23,20,0.2)", animation: "fk-fadeUp 0.5s ease",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", width: 180, height: 180, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.accent}18, transparent 70%)`,
        top: -40, right: -30, pointerEvents: "none",
      }} />
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
        color: C.textLight, fontFamily: fonts, marginBottom: 14,
      }}>Kitchen Stats</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 16 }}>
        {[
          { l: "Meals", v: meals.length, i: "🍽" },
          { l: "Avg Taste", v: avg(meals, m => m.tastiness), i: "😋" },
          { l: "Avg Cost", v: avg(meals, m => m.cost), i: "💸" },
          { l: "Avg Effort", v: avg(meals, m => m.effort), i: "💪" },
        ].map(s => (
          <div key={s.l} style={{ position: "relative" }}>
            <div style={{ fontSize: 9, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: fonts }}>{s.i} {s.l}</div>
            <div style={{ fontSize: 28, fontWeight: 400, fontFamily: displayFont, fontStyle: "italic" }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{
        background: C.darkCard, borderRadius: 14, padding: 12,
        fontSize: 12, fontFamily: fonts, color: C.textLight, border: `1px solid #ffffff08`,
      }}>⭐ Best: <strong style={{ color: "#fff" }}>{topDish.dish}</strong> ({topDish.tastiness}/10) by {topDish.cook}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {FLATMATES.map(fm => (
          <div key={fm.name} style={{
            flex: 1, background: C.darkCard, borderRadius: 12, padding: 10,
            textAlign: "center", border: `1px solid #ffffff08`,
          }}>
            <div style={{ fontSize: 16, marginBottom: 2 }}>{fm.emoji}</div>
            <div style={{ fontSize: 10, color: C.accentLight, fontFamily: fonts }}>{fm.name}</div>
            <div style={{ fontSize: 20, fontWeight: 400, fontFamily: displayFont, color: C.accentLight, fontStyle: "italic" }}>{cookCounts[fm.name]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tiny styles ─────────────────────────────────────────────────
const labelSt = {
  display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted,
  marginBottom: 5, fontFamily: fonts, textTransform: "uppercase", letterSpacing: "0.06em",
};
const fieldSt = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: `1.5px solid ${C.border}`, background: C.cardAlt,
  fontSize: 14, fontFamily: fonts, color: C.text, outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};
const smallBtn = {
  padding: "6px 14px", borderRadius: 10, background: "transparent",
  border: `1.5px solid ${C.green}`, fontSize: 12, fontWeight: 600,
  color: C.green, cursor: "pointer", fontFamily: fonts,
};

// ─── Recipes ─────────────────────────────────────────────────────

function RecipeCard({ recipe, isFav, onToggleFav, onAttach, delay }) {
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

function RecipeSearchPanel({ currentUser, onPick, isFavoriteFor, onToggleFav }) {
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

function RecipesTab({ currentUser, favorites, isFavorite, onToggleFav }) {
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

function RecipePickerModal({ currentUser, isFavorite, onToggleFav, onPick, onClose }) {
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

// ─── Shopping ────────────────────────────────────────────────────

function ShoppingItemRow({ item, currentUser, onMarkBought, onUnmarkBought, onDelete, delay }) {
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

function settleDebts(expenses) {
  const balances = {};
  FLATMATES.forEach(f => { balances[f.name] = 0; });
  expenses.forEach(e => {
    const participants = (e.split_between && e.split_between.length > 0)
      ? e.split_between
      : FLATMATES.map(f => f.name);
    const share = e.amount / participants.length;
    balances[e.paid_by] = (balances[e.paid_by] || 0) + e.amount;
    participants.forEach(name => { balances[name] = (balances[name] || 0) - share; });
  });

  const debtors = FLATMATES.filter(f => balances[f.name] < -0.01).map(f => ({ name: f.name, amount: -balances[f.name] }));
  const creditors = FLATMATES.filter(f => balances[f.name] > 0.01).map(f => ({ name: f.name, amount: balances[f.name] }));
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0, j = 0;
  const d = debtors.map(x => ({ ...x }));
  const c = creditors.map(x => ({ ...x }));
  while (i < d.length && j < c.length) {
    const amt = Math.min(d[i].amount, c[j].amount);
    transactions.push({ from: d[i].name, to: c[j].name, amount: amt });
    d[i].amount -= amt;
    c[j].amount -= amt;
    if (d[i].amount < 0.01) i++;
    if (c[j].amount < 0.01) j++;
  }
  return { balances, transactions };
}

function ExpensesTab({ currentUser, expenses, onAdd, onDelete }) {
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(currentUser);
  const [description, setDescription] = useState("");
  const [splitBetween, setSplitBetween] = useState(FLATMATES.map(f => f.name));

  const toggleParticipant = (name) => {
    setSplitBetween(prev =>
      prev.includes(name)
        ? prev.length > 1 ? prev.filter(n => n !== name) : prev
        : [...prev, name]
    );
  };

  const handleAdd = () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) return;
    onAdd(a, paidBy, description.trim(), splitBetween);
    setAmount("");
    setDescription("");
    setSplitBetween(FLATMATES.map(f => f.name));
  };

  const { transactions } = settleDebts(expenses);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      {/* Add expense form */}
      <div style={{
        background: C.card, borderRadius: 18, padding: 16,
        border: `1px solid ${C.border}`, marginBottom: 16,
        boxShadow: "0 2px 8px rgba(28,23,20,0.04)",
      }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={amount} onChange={e => setAmount(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
            type="number" step="0.01" min="0" placeholder="Amount (€)" className="fk-input"
            style={{
              flex: 1, padding: "11px 14px", borderRadius: 12,
              border: `1.5px solid ${C.border}`, background: C.cardAlt,
              fontSize: 15, fontFamily: fonts, color: C.text, outline: "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }} />
          <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="fk-input"
            style={{
              padding: "11px 12px", borderRadius: 12,
              border: `1.5px solid ${C.border}`, background: C.cardAlt,
              fontSize: 14, fontFamily: fonts, color: C.text, outline: "none",
            }}>
            {FLATMATES.map(f => <option key={f.name} value={f.name}>{f.emoji} {f.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={description} onChange={e => setDescription(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
            placeholder="What was bought? (optional)" className="fk-input"
            style={{
              flex: 1, padding: "11px 14px", borderRadius: 12,
              border: `1.5px solid ${C.border}`, background: C.cardAlt,
              fontSize: 14, fontFamily: fonts, color: C.text, outline: "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }} />
          <button className="fk-btn" onClick={handleAdd} style={{
            padding: "11px 18px", borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${C.accent}, #D4593F)`,
            color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: fonts,
            cursor: "pointer", boxShadow: `0 4px 16px ${C.accent}33`,
          }}>+</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, fontFamily: fonts, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Split between</span>
          <div style={{ display: "flex", gap: 5 }}>
            {FLATMATES.map(f => {
              const active = splitBetween.includes(f.name);
              return (
                <button key={f.name} className="fk-tag" onClick={() => toggleParticipant(f.name)} style={{
                  padding: "5px 10px", borderRadius: 20, fontSize: 12,
                  border: active ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                  background: active ? C.accentLight : "transparent",
                  color: active ? C.accent : C.textMuted,
                  cursor: "pointer", fontFamily: fonts, fontWeight: active ? 700 : 500,
                }}>{f.emoji} {f.name}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Settlement summary */}
      {expenses.length > 0 && (
        <div style={{
          background: `linear-gradient(145deg, ${C.dark} 0%, #342B20 100%)`,
          borderRadius: 18, padding: 16, marginBottom: 16,
          boxShadow: "0 4px 16px rgba(28,23,20,0.15)",
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.12em", color: C.textLight, fontFamily: fonts, marginBottom: 12,
          }}>Who owes whom</div>
          {transactions.length === 0 ? (
            <div style={{ fontSize: 14, color: C.textLight, fontFamily: fonts, fontStyle: "italic" }}>
              Everyone is settled up ✓
            </div>
          ) : (
            transactions.map((t, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: i < transactions.length - 1 ? 8 : 0,
              }}>
                <span style={{ fontSize: 13, color: "#fff", fontFamily: fonts }}>
                  <span style={{ fontWeight: 700 }}>{t.from}</span>
                  <span style={{ color: C.textLight }}> owes </span>
                  <span style={{ fontWeight: 700 }}>{t.to}</span>
                </span>
                <span style={{
                  marginLeft: "auto", fontSize: 16, fontWeight: 400,
                  fontFamily: displayFont, fontStyle: "italic", color: C.accentLight,
                }}>€{t.amount.toFixed(2)}</span>
              </div>
            ))
          )}
          <div style={{
            marginTop: 12, paddingTop: 12, borderTop: "1px solid #ffffff10",
            fontSize: 11, color: C.textLight, fontFamily: fonts,
          }}>Total spent: €{totalSpent.toFixed(2)}</div>
        </div>
      )}

      {/* Expense history */}
      {expenses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 24px", color: C.textLight, animation: "fk-fadeUp 0.5s ease" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💶</div>
          <div style={{ fontSize: 18, fontFamily: displayFont, color: C.textMuted, fontStyle: "italic" }}>No expenses yet</div>
          <div style={{ fontSize: 13, marginTop: 6, color: C.textLight }}>Add the first expense above</div>
        </div>
      ) : (
        <>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.12em", color: C.textMuted, fontFamily: fonts, marginBottom: 10,
          }}>History</div>
          {expenses.map((e, i) => {
            const fm = FLATMATES.find(f => f.name === e.paid_by);
            return (
              <div key={e.id} className="fk-card" style={{
                background: C.card, borderRadius: 14, padding: "12px 14px",
                border: `1px solid ${C.border}`, marginBottom: 8,
                display: "flex", alignItems: "center", gap: 10,
                animation: `fk-fadeUp 0.4s ease ${i * 0.04}s both`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 400, fontFamily: displayFont, fontStyle: "italic", color: C.text }}>
                      €{e.amount.toFixed(2)}
                    </span>
                    <span style={{ fontSize: 12, color: C.textMuted, fontFamily: fonts }}>
                      paid by <span style={{ fontWeight: 700, color: C.text }}>{fm?.emoji} {e.paid_by}</span>
                    </span>
                  </div>
                  {e.description && (
                    <div style={{ fontSize: 12, color: C.textLight, fontFamily: fonts, marginTop: 2 }}>{e.description}</div>
                  )}
                  {e.split_between && e.split_between.length > 0 && e.split_between.length < FLATMATES.length && (
                    <div style={{ fontSize: 11, color: C.textLight, fontFamily: fonts, marginTop: 2 }}>
                      split between {e.split_between.join(", ")}
                    </div>
                  )}
                </div>
                <button onClick={() => onDelete(e.id)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 14, color: C.textLight, padding: 4,
                }}>✕</button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function ShoppingTab({ currentUser, items, onAdd, onMarkBought, onUnmarkBought, onDelete, expenses, onAddExpense, onDeleteExpense }) {
  const [subTab, setSubTab] = useState("list");
  const [newItem, setNewItem] = useState("");

  const pending = items.filter(i => !i.bought_at);
  const bought = items.filter(i => !!i.bought_at);

  const handleAdd = () => {
    const t = newItem.trim();
    if (!t) return;
    onAdd(t, currentUser);
    setNewItem("");
  };

  return (
    <div style={{ padding: "12px 16px 28px" }}>
      {/* Sub-tab switcher */}
      <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
        {[{ id: "list", label: "🛒 List" }, { id: "expenses", label: "💶 Expenses" }].map(st => {
          const active = subTab === st.id;
          return (
            <button key={st.id} className="fk-tag" onClick={() => setSubTab(st.id)} style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 13, whiteSpace: "nowrap",
              border: active ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
              background: active ? C.accentLight : "transparent",
              color: active ? C.accent : C.textMuted,
              cursor: "pointer", fontFamily: fonts, fontWeight: active ? 700 : 500,
            }}>{st.label}</button>
          );
        })}
      </div>

      {subTab === "list" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
              placeholder="Add item…" className="fk-input"
              style={{
                flex: 1, padding: "13px 16px", borderRadius: 14,
                border: `1.5px solid ${C.border}`, background: C.cardAlt,
                fontSize: 15, fontFamily: fonts, color: C.text, outline: "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }} />
            <button className="fk-btn" onClick={handleAdd} style={{
              padding: "13px 20px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${C.accent}, #D4593F)`,
              color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: fonts,
              cursor: "pointer", boxShadow: `0 4px 16px ${C.accent}33`,
            }}>+</button>
          </div>

          {pending.length === 0 && bought.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 24px", color: C.textLight, animation: "fk-fadeUp 0.5s ease" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🛒</div>
              <div style={{ fontSize: 18, fontFamily: displayFont, color: C.textMuted, fontStyle: "italic" }}>
                Shopping list is empty
              </div>
              <div style={{ fontSize: 13, marginTop: 6, color: C.textLight }}>Add the first item above</div>
            </div>
          )}

          {pending.map((item, i) => (
            <ShoppingItemRow key={item.id} item={item} currentUser={currentUser}
              onMarkBought={onMarkBought} onUnmarkBought={onUnmarkBought} onDelete={onDelete}
              delay={i * 0.04} />
          ))}

          {bought.length > 0 && (
            <>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.12em", color: C.textMuted, fontFamily: fonts,
                marginTop: 20, marginBottom: 10,
              }}>Bought ({bought.length})</div>
              {bought.map((item, i) => (
                <ShoppingItemRow key={item.id} item={item} currentUser={currentUser}
                  onMarkBought={onMarkBought} onUnmarkBought={onUnmarkBought} onDelete={onDelete}
                  delay={i * 0.04} />
              ))}
            </>
          )}
        </>
      )}

      {subTab === "expenses" && (
        <ExpensesTab currentUser={currentUser}
          expenses={expenses} onAdd={onAddExpense} onDelete={onDeleteExpense} />
      )}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────
export default function FlatKitchen() {
  const [currentUser, setCurrentUser] = useLocalStore("fk_user3", null);
  const [tab, setTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);
  const [editMeal, setEditMeal] = useState(null);
  const [mealSearch, setMealSearch] = useState("");
  const [cookbookSubTab, setCookbookSubTab] = useState("meals");

  const { attendance, toggleAttendance } = useAttendance();
  const { ideas, addIdea, likeIdea, commentIdea, deleteComment, deleteIdea } = useIdeas();
  const { meals, addMeal, updateMeal, deleteMeal } = useMeals();
  const { favorites, addFavorite, removeFavorite, isFavorite, findFavorite } = useFavorites();
  const { items: shoppingItems, addItem: addShoppingItem, markBought, unmarkBought, deleteItem: deleteShoppingItem } = useShopping();
  const { expenses, addExpense, deleteExpense } = useExpenses();

  if (!currentUser) return <FlatmatePicker onSelect={setCurrentUser} />;

  const dayIdeas = ideas[selectedDate] || [];

  const handleAddIdea = ({ dish, tags, recipe }) => {
    addIdea(selectedDate, { dish, tags, author: currentUser, recipe });
    setShowIdeaForm(false);
  };

  const handleToggleFav = (recipe) => {
    const existing = findFavorite(recipe.id, currentUser);
    if (existing) removeFavorite(existing.id);
    else addFavorite({ name: currentUser, recipe });
  };

  const handleLikeIdea = (id) => {
    likeIdea(selectedDate, id, currentUser);
  };

  const handleCommentIdea = (id, text) => {
    commentIdea(selectedDate, id, currentUser, text);
  };

  const handleDeleteComment = (ideaId, commentIndex) => {
    deleteComment(selectedDate, ideaId, commentIndex);
  };

  const handleDeleteIdea = (id) => {
    deleteIdea(selectedDate, id);
  };

  const submitMeal = (meal) => {
    if (editMeal) updateMeal(meal);
    else addMeal(meal);
    setShowMealForm(false);
    setEditMeal(null);
  };

  const allLabels = [...new Set([
    ...meals.flatMap(m => m.tags || []),
    ...Object.values(ideas).flat().flatMap(i => i.tags || []),
  ])];
  const sortedMeals = [...meals]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(m => !mealSearch.trim() || m.dish.toLowerCase().includes(mealSearch.trim().toLowerCase()));

  const { weekday, day, month } = formatDay(selectedDate);
  const today = isToday(selectedDate);

  return (
    <div style={{
      minHeight: "100dvh",
      background: `linear-gradient(180deg, ${C.bg} 0%, #EDE4D8 100%)`,
      fontFamily: fonts, maxWidth: 480, margin: "0 auto", position: "relative",
    }}>
      <style>{cssAnimation}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />

      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0.025, pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "256px 256px",
      }} />

      {!supabase && (
        <div style={{
          background: "#C24530", color: "#fff", padding: "10px 16px",
          fontSize: 12, fontFamily: fonts, fontWeight: 600, textAlign: "center",
          position: "relative", zIndex: 2,
        }}>
          ⚠ Backend not configured — changes won't save. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel and redeploy.
        </div>
      )}

      {/* Header */}
      <div style={{
        padding: "16px 20px", display: "flex", justifyContent: "space-between",
        alignItems: "center", position: "relative", zIndex: 1,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🍳</span>
          <span style={{
            fontSize: 22, fontWeight: 400, color: C.text, fontFamily: displayFont,
            letterSpacing: "-0.01em", fontStyle: "italic",
          }}>Flat Kitchen</span>
        </div>
        <button className="fk-btn" onClick={() => setCurrentUser(null)} style={{
          background: C.accentLight, border: `1.5px solid ${C.accent}20`,
          borderRadius: 24, padding: "6px 16px", cursor: "pointer",
          fontSize: 13, fontWeight: 600, color: C.accent, fontFamily: fonts,
        }}>{currentUser}</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "0 20px 12px", gap: 4, position: "relative", zIndex: 1 }}>
        <div style={{
          display: "flex", width: "100%",
          background: C.card, borderRadius: 14, padding: 4,
          border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(28,23,20,0.03)",
        }}>
          {[
            { id: "today", label: "Today", icon: "📅" },
            { id: "cookbook", label: "Cookbook", icon: "📖" },
            { id: "shopping", label: "Shopping", icon: "🛒" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "10px 0", border: "none", borderRadius: 11,
              background: tab === t.id ? `linear-gradient(135deg, ${C.dark}, #3D3228)` : "transparent",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              color: tab === t.id ? "#fff" : C.textMuted, fontFamily: fonts,
              transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
              boxShadow: tab === t.id ? "0 2px 8px rgba(28,23,20,0.12)" : "none",
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ─── TODAY TAB ─── */}
        {tab === "today" && (
          <div>
            <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
            <div style={{ padding: "18px 20px 8px", textAlign: "center" }}>
              <div style={{
                fontSize: 32, fontWeight: 400, color: C.text, fontFamily: displayFont,
                lineHeight: 1.1, fontStyle: "italic",
              }}>{today ? "Today" : `${weekday}, ${month} ${day}`}</div>
            </div>

            <div style={{ padding: "14px 0 18px" }}>
              <div style={{
                padding: "0 20px 10px", fontSize: 10, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.12em",
                color: C.textMuted, fontFamily: fonts,
              }}>Who's home for dinner?</div>
              <AttendanceRow currentUser={currentUser} selectedDate={selectedDate}
                attendance={attendance} onToggle={toggleAttendance} />
            </div>

            <div style={{ padding: "0 16px 28px" }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.12em", color: C.textMuted, fontFamily: fonts,
                }}>Dinner ideas ({dayIdeas.length})</div>
                {!showIdeaForm && (
                  <button className="fk-btn" onClick={() => setShowIdeaForm(true)} style={{
                    padding: "6px 14px", borderRadius: 12, border: "none",
                    background: `linear-gradient(135deg, ${C.accent}, #D4593F)`,
                    color: "#fff", fontSize: 12,
                    fontWeight: 700, fontFamily: fonts, cursor: "pointer",
                    boxShadow: `0 2px 10px ${C.accent}30`,
                  }}>+ Idea</button>
                )}
              </div>

              {showIdeaForm && (
                <NewIdeaForm currentUser={currentUser} onSubmit={handleAddIdea}
                  onCancel={() => setShowIdeaForm(false)}
                  isFavorite={isFavorite} onToggleFav={handleToggleFav}
                  allLabels={allLabels} />
              )}

              {dayIdeas.length === 0 && !showIdeaForm && (
                <div style={{
                  textAlign: "center", padding: "36px 24px", color: C.textLight,
                  border: `1.5px dashed ${C.border}`, borderRadius: 20,
                  background: `${C.card}80`, animation: "fk-fadeUp 0.5s ease",
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💡</div>
                  <div style={{
                    fontSize: 16, fontFamily: displayFont, fontWeight: 400,
                    color: C.textMuted, fontStyle: "italic",
                  }}>No ideas yet</div>
                  <div style={{ fontSize: 13, marginTop: 4, color: C.textLight }}>Suggest what to cook tonight!</div>
                </div>
              )}

              {[...dayIdeas].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)).map((idea, i) => (
                <IdeaCard key={idea.id} idea={idea} currentUser={currentUser}
                  onLike={handleLikeIdea} onComment={handleCommentIdea}
                  onDeleteComment={handleDeleteComment} onDelete={handleDeleteIdea}
                  delay={i * 0.06} />
              ))}
            </div>
          </div>
        )}

        {/* ─── COOKBOOK TAB ─── */}
        {tab === "cookbook" && (
          <div style={{ padding: "12px 16px 28px" }}>
            {/* Sub-tab switcher */}
            <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
              {[{ id: "meals", label: "🍽 Meals" }, { id: "recipes", label: "📚 Recipes" }].map(st => {
                const active = cookbookSubTab === st.id;
                return (
                  <button key={st.id} className="fk-tag" onClick={() => setCookbookSubTab(st.id)} style={{
                    padding: "7px 16px", borderRadius: 20, fontSize: 13, whiteSpace: "nowrap",
                    border: active ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                    background: active ? C.accentLight : "transparent",
                    color: active ? C.accent : C.textMuted,
                    cursor: "pointer", fontFamily: fonts, fontWeight: active ? 700 : 500,
                  }}>{st.label}</button>
                );
              })}
            </div>

            {cookbookSubTab === "meals" && (
              <>
                {showMealForm ? (
                  <MealForm currentUser={currentUser} onSubmit={submitMeal}
                    onCancel={() => { setShowMealForm(false); setEditMeal(null); }}
                    initial={editMeal} allLabels={allLabels}
                    isFavorite={isFavorite} onToggleFav={handleToggleFav} />
                ) : (
                  <>
                    <button className="fk-btn" onClick={() => setShowMealForm(true)} style={{
                      width: "100%", padding: "14px", borderRadius: 16, border: "none",
                      background: `linear-gradient(135deg, ${C.accent}, #D4593F)`,
                      color: "#fff", fontSize: 15, fontWeight: 700,
                      fontFamily: fonts, cursor: "pointer", marginBottom: 12,
                      boxShadow: `0 6px 20px ${C.accent}30`,
                    }}>+ Log a Meal</button>

                    <input value={mealSearch} onChange={e => setMealSearch(e.target.value)}
                      placeholder="Search meals…" className="fk-input"
                      style={{
                        width: "100%", padding: "11px 16px", borderRadius: 14,
                        border: `1.5px solid ${C.border}`, background: C.cardAlt,
                        fontSize: 14, fontFamily: fonts, color: C.text, outline: "none",
                        boxSizing: "border-box", marginBottom: 14,
                        transition: "border-color 0.15s, box-shadow 0.15s",
                      }} />

                    {sortedMeals.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 24px", color: C.textLight, animation: "fk-fadeUp 0.5s ease" }}>
                        <div style={{ fontSize: 40, marginBottom: 10 }}>🍳</div>
                        <div style={{
                          fontSize: 18, fontFamily: displayFont, fontWeight: 400,
                          color: C.textMuted, fontStyle: "italic",
                        }}>{mealSearch ? "No meals match your search" : "No meals yet"}</div>
                        <div style={{ fontSize: 13, marginTop: 6, color: C.textLight }}>
                          {mealSearch ? "Try a different search" : "Cook something and log it!"}
                        </div>
                      </div>
                    ) : (
                      sortedMeals.map((m, i) => (
                        <MealCard key={m.id} meal={m} delay={i * 0.05}
                          onEdit={m => { setEditMeal(m); setShowMealForm(true); }}
                          onDelete={deleteMeal} />
                      ))
                    )}
                  </>
                )}
              </>
            )}

            {cookbookSubTab === "recipes" && (
              <RecipesTab currentUser={currentUser}
                favorites={favorites}
                isFavorite={isFavorite}
                onToggleFav={handleToggleFav} />
            )}
          </div>
        )}

        {/* ─── SHOPPING TAB ─── */}
        {tab === "shopping" && (
          <ShoppingTab currentUser={currentUser}
            items={shoppingItems}
            onAdd={addShoppingItem}
            onMarkBought={markBought}
            onUnmarkBought={unmarkBought}
            onDelete={deleteShoppingItem}
            expenses={expenses}
            onAddExpense={addExpense}
            onDeleteExpense={deleteExpense} />
        )}
      </div>
    </div>
  );
}
