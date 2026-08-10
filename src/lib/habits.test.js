import test from "node:test";
import assert from "node:assert/strict";
import {
  SCHEDULE_TYPES,
  calculateStreak,
  isHabitDue,
  toggleSnapshotStep,
  weekDates,
  weeklyProgress,
} from "./habits.js";

const daily = {
  start_date: "2026-08-01",
  schedule_type: SCHEDULE_TYPES.DAILY,
  weekdays: [],
  is_archived: false,
};

const entry = entry_date => ({ entry_date, completed: true });

test("weeks run Monday through Sunday", () => {
  assert.deepEqual(weekDates("2026-08-10"), [
    "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13",
    "2026-08-14", "2026-08-15", "2026-08-16",
  ]);
});

test("fixed habits are due only on configured weekdays", () => {
  const habit = { ...daily, schedule_type: SCHEDULE_TYPES.FIXED, weekdays: [1, 3, 5] };
  assert.equal(isHabitDue(habit, "2026-08-10"), true);
  assert.equal(isHabitDue(habit, "2026-08-11"), false);
  assert.equal(isHabitDue(habit, "2026-08-12"), true);
});

test("daily streak gives the unfinished current day a grace period", () => {
  const entries = [entry("2026-08-07"), entry("2026-08-08"), entry("2026-08-09")];
  assert.equal(calculateStreak(daily, entries, "2026-08-10"), 3);
  assert.equal(calculateStreak(daily, [...entries, entry("2026-08-10")], "2026-08-10"), 4);
});

test("fixed schedule streak skips non-due days", () => {
  const habit = { ...daily, schedule_type: SCHEDULE_TYPES.FIXED, weekdays: [1, 3, 5] };
  const entries = [entry("2026-08-05"), entry("2026-08-07")];
  assert.equal(calculateStreak(habit, entries, "2026-08-10"), 2);
});

test("weekly target streak does not break during the open week", () => {
  const habit = { ...daily, start_date: "2026-07-01", schedule_type: SCHEDULE_TYPES.WEEKLY, weekly_target: 2 };
  const entries = [entry("2026-07-27"), entry("2026-07-30")];
  assert.equal(calculateStreak(habit, entries, "2026-08-05"), 1);
  const current = [...entries, entry("2026-08-03"), entry("2026-08-05")];
  assert.equal(calculateStreak(habit, current, "2026-08-05"), 2);
});

test("weekly progress counts completed dates in the selected week", () => {
  const habit = { ...daily, schedule_type: SCHEDULE_TYPES.WEEKLY, weekly_target: 3 };
  assert.deepEqual(weeklyProgress(habit, [entry("2026-08-10"), entry("2026-08-12")], "2026-08-13"), {
    completed: 2,
    target: 3,
  });
});

test("routine snapshots complete only when every step is complete", () => {
  const snapshot = [
    { id: 1, title: "Water", completed: false },
    { id: 2, title: "Stretch", completed: false },
  ];
  const first = toggleSnapshotStep(snapshot, 1);
  assert.equal(first.completed, false);
  const second = toggleSnapshotStep(first.steps, 2);
  assert.equal(second.completed, true);
  assert.equal(toggleSnapshotStep(second.steps, 1).completed, false);
});
