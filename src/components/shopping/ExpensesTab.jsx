import { useState } from "react";
import { C, fonts, displayFont, FLATMATES } from "../../lib/constants";
import settleDebts from "./settleDebts";

export default function ExpensesTab({ currentUser, expenses, onAdd, onDelete }) {
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
