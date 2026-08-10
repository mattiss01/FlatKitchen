import { useState, useMemo } from "react";
import { C, fonts, displayFont, cssAnimation } from "./lib/constants";
import { dateKey, formatDay, isToday, useLocalStore } from "./lib/utils";
import supabase from "./lib/supabase";
import useAttendance from "./hooks/useAttendance";
import useIdeas from "./hooks/useIdeas";
import useMeals from "./hooks/useMeals";
import useFavorites from "./hooks/useFavorites";
import useShopping from "./hooks/useShopping";
import useExpenses from "./hooks/useExpenses";
import useHabits from "./hooks/useHabits";
import FlatmatePicker from "./components/FlatmatePicker";
import DayStrip from "./components/DayStrip";
import AttendanceRow from "./components/AttendanceRow";
import IdeaCard from "./components/IdeaCard";
import NewIdeaForm from "./components/NewIdeaForm";
import MealForm from "./components/MealForm";
import MealCard from "./components/MealCard";
import RecipesTab from "./components/recipe/RecipesTab";
import ShoppingTab from "./components/shopping/ShoppingTab";
import HabitsTab from "./components/habits/HabitsTab";

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
  const habitState = useHabits(currentUser);

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

  const allLabels = useMemo(() => [...new Set([
    ...meals.flatMap(m => m.tags || []),
    ...Object.values(ideas).flat().flatMap(i => i.tags || []),
  ])], [meals, ideas]);

  const sortedMeals = useMemo(() => [...meals]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(m => !mealSearch.trim() || m.dish.toLowerCase().includes(mealSearch.trim().toLowerCase())),
  [meals, mealSearch]);

  if (!currentUser) return <FlatmatePicker onSelect={setCurrentUser} />;

  const dayIdeas = ideas[selectedDate] || [];

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

      <div style={{ display: "flex", padding: "0 20px 12px", gap: 4, position: "relative", zIndex: 1 }}>
        <div style={{
          display: "flex", width: "100%",
          background: C.card, borderRadius: 14, padding: 4,
          border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(28,23,20,0.03)",
        }}>
          {[
            { id: "today", label: "Today", icon: "📅" },
            { id: "habits", label: "Habits", icon: "✓" },
            { id: "cookbook", label: "Cookbook", icon: "📖" },
            { id: "shopping", label: "Shopping", icon: "🛒" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, minWidth: 0, padding: "7px 2px", border: "none", borderRadius: 11,
              background: tab === t.id ? `linear-gradient(135deg, ${C.dark}, #3D3228)` : "transparent",
              cursor: "pointer", fontSize: 11, fontWeight: 700,
              color: tab === t.id ? "#fff" : C.textMuted, fontFamily: fonts,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
              transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
              boxShadow: tab === t.id ? "0 2px 8px rgba(28,23,20,0.12)" : "none",
            }}><span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1.1 }}>{t.icon}</span><span>{t.label}</span></button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
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

        {tab === "cookbook" && (
          <div style={{ padding: "12px 16px 28px" }}>
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

        {tab === "habits" && (
          <HabitsTab ownerName={currentUser} habitState={habitState} />
        )}
      </div>
    </div>
  );
}
