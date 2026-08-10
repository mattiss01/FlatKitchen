import { C, displayFont, fonts } from "../../lib/constants";
import {
  HABIT_TYPES,
  SCHEDULE_TYPES,
  calculateStreak,
  routineSnapshot,
  scheduleLabel,
  weeklyProgress,
} from "../../lib/habits";

export default function HabitCard({ habit, entry, entries, entryDate, disabled, onToggle, onToggleStep, delay = 0 }) {
  const steps = entry?.step_state?.length ? entry.step_state : routineSnapshot(habit);
  const completedSteps = steps.filter(step => step.completed).length;
  const progress = weeklyProgress(habit, entries, entryDate);
  const streak = calculateStreak(habit, entries);
  const complete = Boolean(entry?.completed);
  const isRoutine = habit.habit_type === HABIT_TYPES.ROUTINE;

  return (
    <article className="fk-card" style={{
      position: "relative", overflow: "hidden", borderRadius: 22,
      border: `1px solid ${complete ? `${C.green}55` : C.border}`,
      background: complete ? `linear-gradient(145deg, ${C.greenLight}, #F8FBF6)` : C.card,
      padding: "17px 17px 15px", marginBottom: 11,
      boxShadow: complete ? "0 8px 24px rgba(59,122,72,0.09)" : "0 3px 14px rgba(28,23,20,0.045)",
      animation: `fk-fadeUp 0.4s ease ${delay}s both`,
    }}>
      <div aria-hidden="true" style={{
        position: "absolute", width: 70, height: 70, borderRadius: "50%",
        right: -24, top: -32, background: complete ? `${C.green}12` : `${C.accent}08`,
      }} />
      <div style={{ display: "flex", gap: 13, alignItems: "flex-start", position: "relative" }}>
        {!isRoutine && (
          <button type="button" onClick={onToggle} disabled={disabled} aria-label={`${complete ? "Unmark" : "Complete"} ${habit.title}`}
            aria-pressed={complete} style={checkButton(complete, disabled)}>
            {complete ? "✓" : ""}
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <div>
              <h3 style={{
                margin: 0, color: C.text, fontFamily: displayFont, fontWeight: 400,
                fontSize: 23, lineHeight: 1.05, fontStyle: "italic",
                textDecoration: complete && !isRoutine ? "line-through" : "none",
                textDecorationThickness: "1px",
              }}>{habit.title}</h3>
              <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, marginTop: 5, letterSpacing: "0.035em" }}>
                {scheduleLabel(habit)}
              </div>
            </div>
            {streak > 0 && (
              <span title="Current streak" style={{
                flexShrink: 0, borderRadius: 20, padding: "5px 8px", background: C.accentLight,
                color: C.accent, fontFamily: fonts, fontSize: 11, fontWeight: 800,
              }}>↗ {streak}</span>
            )}
          </div>

          {isRoutine && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
              {steps.map(step => (
                <button key={step.id} type="button" disabled={disabled}
                  onClick={() => onToggleStep(step.id)} aria-pressed={step.completed}
                  style={{
                    width: "100%", minHeight: 44, display: "flex", gap: 10, alignItems: "center",
                    border: "none", borderRadius: 13, padding: "8px 10px",
                    background: step.completed ? "rgba(255,255,255,0.7)" : C.cardAlt,
                    color: step.completed ? C.textMuted : C.text, cursor: disabled ? "default" : "pointer",
                    fontFamily: fonts, fontSize: 13, fontWeight: 600, textAlign: "left",
                  }}>
                  <span aria-hidden="true" style={{
                    width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: step.completed ? `1.5px solid ${C.green}` : `1.5px solid ${C.border}`,
                    background: step.completed ? C.green : "#fff", color: "#fff", fontWeight: 800,
                  }}>{step.completed ? "✓" : ""}</span>
                  <span style={{ textDecoration: step.completed ? "line-through" : "none" }}>{step.title}</span>
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 13 }}>
            <span style={{ color: complete ? C.green : C.textLight, fontSize: 11, fontWeight: 700 }}>
              {isRoutine ? `${completedSteps}/${steps.length} steps` : complete ? "Complete" : "Ready when you are"}
            </span>
            {habit.schedule_type === SCHEDULE_TYPES.WEEKLY && (
              <span style={{ color: progress.completed >= progress.target ? C.green : C.textMuted, fontSize: 11, fontWeight: 800 }}>
                {progress.completed}/{progress.target} this week
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function checkButton(complete, disabled) {
  return {
    width: 46, height: 46, flexShrink: 0, borderRadius: 15,
    border: complete ? `1.5px solid ${C.green}` : `1.5px solid ${C.border}`,
    background: complete ? C.green : C.cardAlt, color: "#fff", fontSize: 22,
    fontWeight: 800, cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };
}
