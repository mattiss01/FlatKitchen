import { dateKey, parseDate } from "./utils.js";

export const HABIT_TYPES = {
  SIMPLE: "simple",
  ROUTINE: "routine",
};

export const SCHEDULE_TYPES = {
  DAILY: "daily",
  FIXED: "fixed_weekdays",
  WEEKLY: "weekly_target",
};

export const WEEKDAYS = [
  { value: 1, short: "M", label: "Monday" },
  { value: 2, short: "T", label: "Tuesday" },
  { value: 3, short: "W", label: "Wednesday" },
  { value: 4, short: "T", label: "Thursday" },
  { value: 5, short: "F", label: "Friday" },
  { value: 6, short: "S", label: "Saturday" },
  { value: 7, short: "S", label: "Sunday" },
];

export function addDays(dk, amount) {
  const date = parseDate(dk);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

export function isoWeekday(dk) {
  const day = parseDate(dk).getDay();
  return day === 0 ? 7 : day;
}

export function weekStart(dk) {
  return addDays(dk, 1 - isoWeekday(dk));
}

export function weekDates(dk) {
  const start = weekStart(dk);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function isHabitDue(habit, dk) {
  if (!habit || habit.is_archived || dk < habit.start_date) return false;
  if (habit.schedule_type === SCHEDULE_TYPES.DAILY) return true;
  if (habit.schedule_type === SCHEDULE_TYPES.WEEKLY) return true;
  if (habit.schedule_type === SCHEDULE_TYPES.FIXED) {
    return (habit.weekdays || []).map(Number).includes(isoWeekday(dk));
  }
  return false;
}

export function scheduleLabel(habit) {
  if (habit.schedule_type === SCHEDULE_TYPES.DAILY) return "Every day";
  if (habit.schedule_type === SCHEDULE_TYPES.WEEKLY) {
    const target = Number(habit.weekly_target) || 1;
    return `${target} time${target === 1 ? "" : "s"} a week`;
  }
  const selected = new Set((habit.weekdays || []).map(Number));
  return WEEKDAYS.filter(day => selected.has(day.value)).map(day => day.short).join(" · ");
}

export function entriesByDate(entries) {
  return new Map((entries || []).map(entry => [entry.entry_date, entry]));
}

export function weeklyProgress(habit, entries, dk) {
  const byDate = entriesByDate(entries);
  const dates = weekDates(dk).filter(date => date >= habit.start_date);
  const completed = dates.filter(date => byDate.get(date)?.completed).length;
  const target = habit.schedule_type === SCHEDULE_TYPES.WEEKLY
    ? Number(habit.weekly_target) || 1
    : dates.filter(date => isHabitDue(habit, date)).length;
  return { completed, target };
}

function previousDueDate(habit, fromDate) {
  let cursor = fromDate;
  for (let index = 0; index < 3700 && cursor >= habit.start_date; index += 1) {
    if (isHabitDue(habit, cursor)) return cursor;
    cursor = addDays(cursor, -1);
  }
  return null;
}

function occurrenceStreak(habit, entries, today) {
  const byDate = entriesByDate(entries);
  let cursor = previousDueDate(habit, today);

  // Today is still in progress, so an unchecked occurrence does not break a streak yet.
  if (cursor === today && !byDate.get(cursor)?.completed) {
    cursor = previousDueDate(habit, addDays(cursor, -1));
  }

  let streak = 0;
  while (cursor && cursor >= habit.start_date && byDate.get(cursor)?.completed) {
    streak += 1;
    cursor = previousDueDate(habit, addDays(cursor, -1));
  }
  return streak;
}

function weeklyStreak(habit, entries, today) {
  const byDate = entriesByDate(entries);
  const target = Number(habit.weekly_target) || 1;
  let cursor = weekStart(today);

  const completedInWeek = start => weekDates(start)
    .filter(date => date >= habit.start_date && date <= today)
    .filter(date => byDate.get(date)?.completed).length;

  // Like today, the current week gets a grace period until it has ended.
  if (completedInWeek(cursor) < target) cursor = addDays(cursor, -7);

  let streak = 0;
  while (addDays(cursor, 6) >= habit.start_date) {
    const completed = weekDates(cursor)
      .filter(date => date >= habit.start_date)
      .filter(date => byDate.get(date)?.completed).length;
    if (completed < target) break;
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export function calculateStreak(habit, entries, today = dateKey(new Date())) {
  if (!habit || habit.start_date > today) return 0;
  if (habit.schedule_type === SCHEDULE_TYPES.WEEKLY) {
    return weeklyStreak(habit, entries, today);
  }
  return occurrenceStreak(habit, entries, today);
}

export function routineSnapshot(habit) {
  return [...(habit.habit_steps || [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(step => ({ id: step.id, title: step.title, completed: false }));
}

export function toggleSnapshotStep(snapshot, stepId) {
  const next = (snapshot || []).map(step => (
    String(step.id) === String(stepId) ? { ...step, completed: !step.completed } : step
  ));
  return { steps: next, completed: next.length > 0 && next.every(step => step.completed) };
}

export function setSnapshotCompletion(snapshot, completed) {
  const steps = (snapshot || []).map(step => ({ ...step, completed }));
  return { steps, completed: completed && steps.length > 0 };
}
