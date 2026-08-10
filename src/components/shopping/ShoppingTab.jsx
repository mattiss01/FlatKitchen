import { useState } from "react";
import { C, fonts, displayFont } from "../../lib/constants";
import ShoppingItemRow from "./ShoppingItemRow";
import ExpensesTab from "./ExpensesTab";

export default function ShoppingTab({ currentUser, items, onAdd, onMarkBought, onUnmarkBought, onDelete, expenses, onAddExpense, onDeleteExpense }) {
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
