import { useMemo, useState } from "react";
import { C, displayFont, fonts } from "../../lib/constants";
import { dateKey, formatDay } from "../../lib/utils";
import { addDays, isHabitDue, weekDates, weekStart } from "../../lib/habits";
import HabitCard from "./HabitCard";
import HabitForm from "./HabitForm";

export default function HabitsTab({ ownerName, habitState }) {
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [weekAnchor, setWeekAnchor] = useState(dateKey(new Date()));
  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const today = dateKey(new Date());
  const {
    habits, entriesByHabit, loading, saving, error, clearError,
    createHabit, updateHabit, setArchived, moveHabit, toggleSimple, toggleRoutineStep,
  } = habitState;

  const activeHabits = useMemo(() => habits.filter(habit => !habit.is_archived), [habits]);
  const archivedHabits = useMemo(() => habits.filter(habit => habit.is_archived), [habits]);
  const dueHabits = useMemo(() => activeHabits.filter(habit => isHabitDue(habit, selectedDate)), [activeHabits, selectedDate]);
  const selectedEntries = useMemo(() => new Map(dueHabits.map(habit => [
    habit.id,
    (entriesByHabit[habit.id] || []).find(entry => entry.entry_date === selectedDate),
  ])), [dueHabits, entriesByHabit, selectedDate]);
  const completed = dueHabits.filter(habit => selectedEntries.get(habit.id)?.completed).length;
  const dates = weekDates(weekAnchor);
  const selectedInfo = formatDay(selectedDate);
  const future = selectedDate > today;

  const submitForm = async values => {
    const success = editing
      ? await updateHabit(editing.id, values)
      : await createHabit(values);
    if (success) {
      setShowForm(false);
      setEditing(null);
    }
  };

  const openEdit = habit => {
    setEditing(habit);
    setShowForm(true);
  };

  if (showForm) {
    return (
      <div style={{ padding: "12px 16px 34px" }}>
        <HabitForm key={editing?.id || "new"} initial={editing} saving={saving} error={error}
          onSubmit={submitForm} onCancel={() => { setShowForm(false); setEditing(null); }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "6px 16px 34px" }}>
      <section style={{
        position: "relative", overflow: "hidden", borderRadius: 26, padding: "22px 20px 18px",
        color: "#fff", background: `linear-gradient(145deg, ${C.dark}, #3E392E 62%, #46533D)`,
        boxShadow: "0 12px 32px rgba(28,23,20,0.17)", marginBottom: 14,
        animation: "fk-fadeUp 0.4s ease",
      }}>
        <div aria-hidden="true" style={{
          position: "absolute", width: 160, height: 160, right: -40, top: -70,
          borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 0 24px rgba(255,255,255,0.025), 0 0 0 48px rgba(255,255,255,0.018)",
        }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "#C9D6C0" }}>
              {ownerName}'s rhythm
            </div>
            <h1 style={{ margin: "5px 0 2px", fontFamily: displayFont, fontWeight: 400, fontStyle: "italic", fontSize: 34 }}>
              Small things, often.
            </h1>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", fontWeight: 600 }}>
              {future ? "Future days are for looking, not checking." : `${selectedInfo.weekday}, ${selectedInfo.month} ${selectedInfo.day}`}
            </div>
          </div>
          <div style={{ alignSelf: "flex-end", textAlign: "right", minWidth: 58 }}>
            <div style={{ fontFamily: displayFont, fontSize: 33, lineHeight: 1 }}>{completed}<span style={{ fontSize: 17, opacity: 0.55 }}>/{dueHabits.length}</span></div>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.62, marginTop: 3 }}>complete</div>
          </div>
        </div>
      </section>

      <section aria-label="Week navigator" style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 20,
        padding: "10px 9px 9px", marginBottom: 15, boxShadow: "0 3px 14px rgba(28,23,20,0.04)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 5px 8px" }}>
          <button type="button" onClick={() => {
            const next = addDays(weekAnchor, -7); setWeekAnchor(next); setSelectedDate(weekStart(next));
          }} style={navButton} aria-label="Previous week">←</button>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.textMuted, textTransform: "uppercase" }}>
            {formatDay(dates[0]).month} {formatDay(dates[0]).day} — {formatDay(dates[6]).month} {formatDay(dates[6]).day}
          </div>
          <button type="button" disabled={weekStart(weekAnchor) >= weekStart(today)} onClick={() => {
            const next = addDays(weekAnchor, 7); setWeekAnchor(next); setSelectedDate(next > today ? today : weekStart(next));
          }} style={navButton} aria-label="Next week">→</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {dates.map(date => {
            const info = formatDay(date);
            const selected = date === selectedDate;
            const dateFuture = date > today;
            const hasCompletion = activeHabits.some(habit => (
              (entriesByHabit[habit.id] || []).some(entry => entry.entry_date === date && entry.completed)
            ));
            return (
              <button type="button" key={date} disabled={dateFuture} onClick={() => setSelectedDate(date)}
                aria-label={`${info.weekday}, ${info.month} ${info.day}`} aria-pressed={selected} style={{
                  minWidth: 0, minHeight: 58, border: "none", borderRadius: 13,
                  background: selected ? C.accent : "transparent", color: selected ? "#fff" : dateFuture ? C.border : C.text,
                  cursor: dateFuture ? "default" : "pointer", fontFamily: fonts, position: "relative",
                }}>
                <div style={{ fontSize: 9, fontWeight: 800, opacity: selected ? 0.75 : 0.55 }}>{info.weekday.slice(0, 1)}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{info.day}</div>
                {hasCompletion && <span aria-hidden="true" style={{
                  position: "absolute", width: 4, height: 4, borderRadius: "50%", bottom: 6, left: "50%",
                  transform: "translateX(-50%)", background: selected ? "#fff" : C.green,
                }} />}
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div role="alert" style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
          borderRadius: 15, padding: "11px 12px", marginBottom: 12,
          background: C.accentLight, color: C.accent, fontSize: 12, fontWeight: 700,
        }}>
          <span>{error}</span>
          <button type="button" aria-label="Dismiss error" onClick={clearError} style={{ border: "none", background: "transparent", color: C.accent, cursor: "pointer" }}>×</button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 3px 10px" }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.13em", color: C.textMuted }}>
          {managing ? "Your habits" : dueHabits.length ? `${dueHabits.length} due` : "A clear day"}
        </div>
        <button type="button" onClick={() => setManaging(value => !value)} style={{
          minHeight: 40, border: "none", borderRadius: 12, background: managing ? C.dark : C.card,
          color: managing ? "#fff" : C.green, padding: "7px 12px", cursor: "pointer",
          fontFamily: fonts, fontSize: 12, fontWeight: 800,
        }}>{managing ? "Done" : "Manage"}</button>
      </div>

      {loading ? (
        <div style={emptyStyle}><div style={{ fontFamily: displayFont, fontSize: 22, fontStyle: "italic" }}>Gathering your rhythm…</div></div>
      ) : managing ? (
        <ManagementList habits={activeHabits} archived={archivedHabits} saving={saving}
          onAdd={() => { setEditing(null); setShowForm(true); }} onEdit={openEdit}
          onMove={moveHabit} onArchive={habit => setArchived(habit.id, true)}
          onRestore={habit => setArchived(habit.id, false)} />
      ) : dueHabits.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ width: 48, height: 48, margin: "0 auto 10px", borderRadius: "50%", border: `1px solid ${C.border}`, display: "grid", placeItems: "center", color: C.green, fontSize: 22 }}>○</div>
          <div style={{ fontFamily: displayFont, color: C.textMuted, fontSize: 22, fontStyle: "italic" }}>
            {activeHabits.length ? "Nothing scheduled here." : "Your rhythm starts quietly."}
          </div>
          <div style={{ fontSize: 12, color: C.textLight, marginTop: 5 }}>
            {activeHabits.length ? "Choose another day or enjoy the pause." : "Create a habit or a step-by-step routine."}
          </div>
          {!activeHabits.length && (
            <button type="button" onClick={() => setShowForm(true)} style={primaryButton}>Create your first habit</button>
          )}
        </div>
      ) : (
        dueHabits.map((habit, index) => (
          <HabitCard key={habit.id} habit={habit} entry={selectedEntries.get(habit.id)}
            entries={entriesByHabit[habit.id] || []} entryDate={selectedDate} disabled={future || saving}
            onToggle={() => toggleSimple(habit, selectedDate)}
            onToggleStep={stepId => toggleRoutineStep(habit, selectedDate, stepId)} delay={index * 0.055} />
        ))
      )}
    </div>
  );
}

function ManagementList({ habits, archived, saving, onAdd, onEdit, onMove, onArchive, onRestore }) {
  return (
    <div style={{ animation: "fk-fadeUp 0.28s ease" }}>
      <button type="button" onClick={onAdd} disabled={saving} style={{ ...primaryButton, width: "100%", margin: "0 0 12px" }}>+ Add a habit</button>
      {habits.map((habit, index) => (
        <div key={habit.id} style={{
          display: "flex", gap: 8, alignItems: "center", background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 16, padding: "10px 10px 10px 14px", marginBottom: 7,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.text, fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{habit.title}</div>
            <div style={{ color: C.textLight, fontSize: 10, fontWeight: 700, marginTop: 2 }}>{habit.habit_type === "routine" ? `${habit.habit_steps.length} step routine` : "Single habit"}</div>
          </div>
          <button type="button" disabled={index === 0 || saving} onClick={() => onMove(habit.id, -1)} aria-label={`Move ${habit.title} up`} style={manageButton}>↑</button>
          <button type="button" disabled={index === habits.length - 1 || saving} onClick={() => onMove(habit.id, 1)} aria-label={`Move ${habit.title} down`} style={manageButton}>↓</button>
          <button type="button" disabled={saving} onClick={() => onEdit(habit)} style={{ ...manageButton, width: "auto", padding: "0 9px" }}>Edit</button>
          <button type="button" disabled={saving} onClick={() => onArchive(habit)} aria-label={`Archive ${habit.title}`} style={{ ...manageButton, color: C.accent }}>×</button>
        </div>
      ))}
      {archived.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: "pointer", color: C.textMuted, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Archived ({archived.length})
          </summary>
          <div style={{ marginTop: 8 }}>
            {archived.map(habit => (
              <div key={habit.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", borderBottom: `1px solid ${C.borderLight}` }}>
                <span style={{ color: C.textMuted, fontSize: 13, fontWeight: 700 }}>{habit.title}</span>
                <button type="button" disabled={saving} onClick={() => onRestore(habit)} style={{ ...manageButton, width: "auto", padding: "0 10px", color: C.green }}>Restore</button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

const navButton = {
  width: 38, height: 38, border: "none", borderRadius: 12, background: C.cardAlt,
  color: C.textMuted, cursor: "pointer", fontSize: 16,
};

const primaryButton = {
  minHeight: 46, border: "none", borderRadius: 15, background: C.green, color: "#fff",
  padding: "11px 18px", fontFamily: fonts, fontWeight: 800, fontSize: 13,
  cursor: "pointer", marginTop: 16, boxShadow: `0 5px 16px ${C.green}28`,
};

const manageButton = {
  width: 36, height: 38, flexShrink: 0, border: "none", borderRadius: 10,
  background: C.cardAlt, color: C.textMuted, cursor: "pointer", fontSize: 12, fontWeight: 800,
};

const emptyStyle = {
  textAlign: "center", padding: "42px 22px", color: C.textMuted,
  border: `1.5px dashed ${C.border}`, borderRadius: 22, background: `${C.card}99`,
  animation: "fk-fadeUp 0.38s ease",
};
