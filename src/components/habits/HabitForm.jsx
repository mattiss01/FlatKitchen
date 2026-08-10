import { useState } from "react";
import { C, displayFont, fieldSt, fonts, labelSt } from "../../lib/constants";
import { dateKey } from "../../lib/utils";
import { HABIT_TYPES, SCHEDULE_TYPES, WEEKDAYS } from "../../lib/habits";

const choiceStyle = active => ({
  flex: 1,
  minHeight: 44,
  padding: "9px 10px",
  borderRadius: 12,
  border: active ? `1.5px solid ${C.green}` : `1px solid ${C.border}`,
  background: active ? C.greenLight : C.cardAlt,
  color: active ? C.green : C.textMuted,
  fontFamily: fonts,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
});

export default function HabitForm({ initial, saving, error, onSubmit, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [habitType, setHabitType] = useState(initial?.habit_type || HABIT_TYPES.SIMPLE);
  const [scheduleType, setScheduleType] = useState(initial?.schedule_type || SCHEDULE_TYPES.DAILY);
  const [weekdays, setWeekdays] = useState((initial?.weekdays || []).map(Number));
  const [weeklyTarget, setWeeklyTarget] = useState(Number(initial?.weekly_target) || 3);
  const [startDate, setStartDate] = useState(initial?.start_date || dateKey(new Date()));
  const [steps, setSteps] = useState(
    initial?.habit_steps?.length
      ? [...initial.habit_steps].sort((a, b) => a.sort_order - b.sort_order).map(step => step.title)
      : ["", ""],
  );
  const [validation, setValidation] = useState("");

  const toggleWeekday = value => {
    setWeekdays(current => current.includes(value)
      ? current.filter(day => day !== value)
      : [...current, value].sort());
  };

  const updateStep = (index, value) => {
    setSteps(current => current.map((step, stepIndex) => stepIndex === index ? value : step));
  };

  const moveStep = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    setSteps(current => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const submit = event => {
    event.preventDefault();
    const cleanSteps = steps.map(step => step.trim()).filter(Boolean);
    if (!title.trim()) return setValidation("Give this habit a name.");
    if (scheduleType === SCHEDULE_TYPES.FIXED && weekdays.length === 0) {
      return setValidation("Choose at least one weekday.");
    }
    if (habitType === HABIT_TYPES.ROUTINE && cleanSteps.length === 0) {
      return setValidation("Add at least one routine step.");
    }
    setValidation("");
    onSubmit({
      title,
      habit_type: habitType,
      schedule_type: scheduleType,
      weekdays,
      weekly_target: weeklyTarget,
      start_date: startDate,
      steps: cleanSteps,
    });
  };

  return (
    <form onSubmit={submit} style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 24,
      padding: 18,
      boxShadow: "0 12px 34px rgba(28,23,20,0.09)",
      animation: "fk-scaleIn 0.22s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <h2 style={{ margin: 0, color: C.text, fontFamily: displayFont, fontWeight: 400, fontSize: 28, fontStyle: "italic" }}>
          {initial ? "Edit your ritual" : "Begin a ritual"}
        </h2>
        <button type="button" onClick={onCancel} aria-label="Close habit form" style={{
          width: 36, height: 36, border: "none", borderRadius: "50%", background: C.cardAlt,
          color: C.textMuted, cursor: "pointer", fontSize: 20,
        }}>×</button>
      </div>

      <label style={labelSt} htmlFor="habit-title">Name</label>
      <input id="habit-title" className="fk-input" autoFocus maxLength={120} value={title}
        onChange={event => setTitle(event.target.value)} placeholder="Morning pages, vitamins…" style={{ ...fieldSt, marginBottom: 16 }} />

      <span style={labelSt}>Format</span>
      <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
        <button type="button" onClick={() => setHabitType(HABIT_TYPES.SIMPLE)}
          style={choiceStyle(habitType === HABIT_TYPES.SIMPLE)}>Single check</button>
        <button type="button" onClick={() => setHabitType(HABIT_TYPES.ROUTINE)}
          style={choiceStyle(habitType === HABIT_TYPES.ROUTINE)}>Routine with steps</button>
      </div>

      <span style={labelSt}>Rhythm</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 13 }}>
        {[
          [SCHEDULE_TYPES.DAILY, "Daily"],
          [SCHEDULE_TYPES.FIXED, "Set days"],
          [SCHEDULE_TYPES.WEEKLY, "Weekly goal"],
        ].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setScheduleType(value)}
            style={choiceStyle(scheduleType === value)}>{label}</button>
        ))}
      </div>

      {scheduleType === SCHEDULE_TYPES.FIXED && (
        <div style={{ display: "flex", gap: 5, marginBottom: 16 }} aria-label="Scheduled weekdays">
          {WEEKDAYS.map(day => {
            const active = weekdays.includes(day.value);
            return (
              <button key={day.value} type="button" title={day.label} aria-label={day.label}
                aria-pressed={active} onClick={() => toggleWeekday(day.value)} style={{
                  flex: 1, minWidth: 0, height: 40, borderRadius: 12, cursor: "pointer",
                  border: active ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                  color: active ? "#fff" : C.textMuted, background: active ? C.accent : C.cardAlt,
                  fontFamily: fonts, fontWeight: 700,
                }}>{day.short}</button>
            );
          })}
        </div>
      )}

      {scheduleType === SCHEDULE_TYPES.WEEKLY && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelSt} htmlFor="weekly-target">Completions per week</label>
          <select id="weekly-target" value={weeklyTarget} onChange={event => setWeeklyTarget(Number(event.target.value))}
            style={fieldSt}>
            {Array.from({ length: 7 }, (_, index) => index + 1).map(value => (
              <option key={value} value={value}>{value} time{value === 1 ? "" : "s"}</option>
            ))}
          </select>
        </div>
      )}

      {habitType === HABIT_TYPES.ROUTINE && (
        <div style={{ marginBottom: 16 }}>
          <span style={labelSt}>Routine steps</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {steps.map((step, index) => (
              <div key={index} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <span style={{ width: 18, color: C.textLight, fontSize: 12, textAlign: "center" }}>{index + 1}</span>
                <input value={step} maxLength={120} onChange={event => updateStep(index, event.target.value)}
                  aria-label={`Routine step ${index + 1}`} placeholder={`Step ${index + 1}`} className="fk-input"
                  style={{ ...fieldSt, flex: 1, minWidth: 0, padding: "10px 11px" }} />
                <button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0}
                  aria-label={`Move step ${index + 1} up`} style={miniButton}>↑</button>
                <button type="button" onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1}
                  aria-label={`Move step ${index + 1} down`} style={miniButton}>↓</button>
                <button type="button" onClick={() => setSteps(current => current.filter((_, stepIndex) => stepIndex !== index))}
                  aria-label={`Remove step ${index + 1}`} style={{ ...miniButton, color: C.accent }}>×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setSteps(current => [...current, ""])} style={{
            marginTop: 9, minHeight: 40, border: `1px dashed ${C.border}`, borderRadius: 12,
            background: "transparent", color: C.green, padding: "7px 12px", fontFamily: fonts,
            fontWeight: 700, cursor: "pointer", width: "100%",
          }}>+ Add another step</button>
        </div>
      )}

      <label style={labelSt} htmlFor="habit-start">Start date</label>
      <input id="habit-start" type="date" max={dateKey(new Date())} value={startDate}
        onChange={event => setStartDate(event.target.value)} style={{ ...fieldSt, marginBottom: 8 }} />

      {validation && <div role="alert" style={{ color: C.accent, fontSize: 12, fontWeight: 700, margin: "8px 0" }}>{validation}</div>}
      {error && <div role="alert" style={{
        color: C.accent, background: C.accentLight, borderRadius: 12,
        fontSize: 12, fontWeight: 700, margin: "8px 0", padding: "9px 10px",
      }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button type="button" onClick={onCancel} style={{ ...actionButton, background: C.cardAlt, color: C.textMuted, border: `1px solid ${C.border}` }}>
          Cancel
        </button>
        <button type="submit" disabled={saving} style={{ ...actionButton, flex: 1.5, background: C.green, color: "#fff", border: "none" }}>
          {saving ? "Saving…" : initial ? "Save changes" : "Create habit"}
        </button>
      </div>
    </form>
  );
}

const miniButton = {
  width: 32, height: 38, flexShrink: 0, border: "none", borderRadius: 10,
  background: C.cardAlt, color: C.textMuted, cursor: "pointer", fontSize: 14,
};

const actionButton = {
  minHeight: 46, padding: "11px 16px", borderRadius: 14, cursor: "pointer",
  fontFamily: fonts, fontWeight: 700, fontSize: 13,
};
