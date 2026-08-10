import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import supabase from "../lib/supabase";
import { HABIT_TYPES, routineSnapshot, setSnapshotCompletion, toggleSnapshotStep } from "../lib/habits";

function sortHabits(rows) {
  return [...(rows || [])]
    .map(habit => ({
      ...habit,
      weekdays: habit.weekdays || [],
      habit_steps: [...(habit.habit_steps || [])].sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

function upsertLocalEntry(entries, entry) {
  const exists = entries.some(item => item.habit_id === entry.habit_id && item.entry_date === entry.entry_date);
  if (!exists) return [...entries, entry];
  return entries.map(item => (
    item.habit_id === entry.habit_id && item.entry_date === entry.entry_date ? entry : item
  ));
}

export default function useHabits(ownerName) {
  const [habits, setHabits] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(Boolean(ownerName));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loadedOwner, setLoadedOwner] = useState(null);
  const requestRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const request = ++requestRef.current;
    if (!supabase || !ownerName) {
      setHabits([]);
      setEntries([]);
      setLoadedOwner(ownerName || null);
      setLoading(false);
      return;
    }

    const { data: habitRows, error: habitError } = await supabase
      .from("habits")
      .select("*, habit_steps(*)")
      .eq("owner_name", ownerName)
      .order("sort_order", { ascending: true });

    if (request !== requestRef.current) return;
    if (habitError) {
      setError(`Couldn't load habits: ${habitError.message}`);
      setHabits([]);
      setEntries([]);
      setLoadedOwner(ownerName);
      setLoading(false);
      return;
    }

    const nextHabits = sortHabits(habitRows);
    const ids = nextHabits.map(habit => habit.id);
    let entryRows = [];
    if (ids.length > 0) {
      const { data, error: entryError } = await supabase
        .from("habit_entries")
        .select("*")
        .in("habit_id", ids)
        .order("entry_date", { ascending: true });
      if (request !== requestRef.current) return;
      if (entryError) {
        setError(`Couldn't load habit history: ${entryError.message}`);
        setHabits(nextHabits);
        setEntries([]);
        setLoadedOwner(ownerName);
        setLoading(false);
        return;
      }
      entryRows = data || [];
    }

    setHabits(nextHabits);
    setEntries(entryRows);
    setLoadedOwner(ownerName);
    setError(null);
    setLoading(false);
  }, [ownerName]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchAll(); }, 0);
    if (!supabase || !ownerName) return () => window.clearTimeout(timer);

    const channel = supabase.channel(`habit-sync-${ownerName}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "habits" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "habit_steps" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "habit_entries" }, fetchAll)
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      requestRef.current += 1;
      void supabase.removeChannel(channel);
    };
  }, [fetchAll, ownerName]);

  const ownerMatches = loadedOwner === ownerName;
  const scopedHabits = useMemo(() => ownerMatches ? habits : [], [habits, ownerMatches]);
  const scopedEntries = useMemo(() => ownerMatches ? entries : [], [entries, ownerMatches]);

  const entriesByHabit = useMemo(() => {
    const grouped = {};
    scopedEntries.forEach(entry => {
      if (!grouped[entry.habit_id]) grouped[entry.habit_id] = [];
      grouped[entry.habit_id].push(entry);
    });
    return grouped;
  }, [scopedEntries]);

  const runMutation = useCallback(async operation => {
    if (!supabase) {
      setError("Backend not configured — habits cannot be saved yet.");
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      await operation();
      return true;
    } catch (mutationError) {
      console.error("[habits] mutation failed:", mutationError);
      setError(mutationError.message || "Couldn't save that change.");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const createHabit = useCallback(async values => runMutation(async () => {
    const sortOrder = habits.reduce((maximum, habit) => Math.max(maximum, habit.sort_order), -1) + 1;
    const row = {
      owner_name: ownerName,
      title: values.title.trim(),
      habit_type: values.habit_type,
      schedule_type: values.schedule_type,
      weekdays: values.schedule_type === "fixed_weekdays" ? values.weekdays : [],
      weekly_target: values.schedule_type === "weekly_target" ? values.weekly_target : null,
      start_date: values.start_date,
      sort_order: sortOrder,
    };
    const { data, error: insertError } = await supabase.from("habits").insert(row).select().single();
    if (insertError) throw insertError;

    if (values.habit_type === HABIT_TYPES.ROUTINE) {
      const steps = values.steps.map((title, index) => ({
        habit_id: data.id,
        title: title.trim(),
        sort_order: index,
      }));
      const { error: stepError } = await supabase.from("habit_steps").insert(steps);
      if (stepError) {
        await supabase.from("habits").delete().eq("id", data.id);
        throw stepError;
      }
    }
    await fetchAll();
  }), [fetchAll, habits, ownerName, runMutation]);

  const updateHabit = useCallback(async (habitId, values) => runMutation(async () => {
    const row = {
      title: values.title.trim(),
      habit_type: values.habit_type,
      schedule_type: values.schedule_type,
      weekdays: values.schedule_type === "fixed_weekdays" ? values.weekdays : [],
      weekly_target: values.schedule_type === "weekly_target" ? values.weekly_target : null,
      start_date: values.start_date,
      updated_at: new Date().toISOString(),
    };
    const { error: updateError } = await supabase.from("habits").update(row).eq("id", habitId);
    if (updateError) throw updateError;

    const { error: deleteError } = await supabase.from("habit_steps").delete().eq("habit_id", habitId);
    if (deleteError) throw deleteError;
    if (values.habit_type === HABIT_TYPES.ROUTINE) {
      const steps = values.steps.map((title, index) => ({ habit_id: habitId, title: title.trim(), sort_order: index }));
      const { error: stepError } = await supabase.from("habit_steps").insert(steps);
      if (stepError) throw stepError;
    }
    await fetchAll();
  }), [fetchAll, runMutation]);

  const setArchived = useCallback(async (habitId, isArchived) => runMutation(async () => {
    const { error: archiveError } = await supabase.from("habits")
      .update({ is_archived: isArchived, updated_at: new Date().toISOString() })
      .eq("id", habitId);
    if (archiveError) throw archiveError;
    await fetchAll();
  }), [fetchAll, runMutation]);

  const moveHabit = useCallback(async (habitId, direction) => runMutation(async () => {
    const active = habits.filter(habit => !habit.is_archived);
    const currentIndex = active.findIndex(habit => habit.id === habitId);
    const otherIndex = currentIndex + direction;
    if (currentIndex < 0 || otherIndex < 0 || otherIndex >= active.length) return;
    const current = active[currentIndex];
    const other = active[otherIndex];
    const [currentResult, otherResult] = await Promise.all([
      supabase.from("habits").update({ sort_order: other.sort_order }).eq("id", current.id),
      supabase.from("habits").update({ sort_order: current.sort_order }).eq("id", other.id),
    ]);
    if (currentResult.error) throw currentResult.error;
    if (otherResult.error) throw otherResult.error;
    await fetchAll();
  }), [fetchAll, habits, runMutation]);

  const saveEntry = useCallback(async (habit, entryDate, completed, stepState) => {
    if (!supabase) {
      setError("Backend not configured — habits cannot be saved yet.");
      return false;
    }
    const previous = entries.find(entry => entry.habit_id === habit.id && entry.entry_date === entryDate);
    const optimistic = {
      id: previous?.id || `temp-${habit.id}-${entryDate}`,
      habit_id: habit.id,
      entry_date: entryDate,
      completed,
      step_state: stepState,
      updated_at: new Date().toISOString(),
    };
    setEntries(current => upsertLocalEntry(current, optimistic));
    setError(null);

    const { data, error: entryError } = await supabase.from("habit_entries")
      .upsert({
        habit_id: habit.id,
        entry_date: entryDate,
        completed,
        step_state: stepState,
        updated_at: new Date().toISOString(),
      }, { onConflict: "habit_id,entry_date" })
      .select()
      .single();
    if (entryError) {
      setEntries(current => {
        const withoutOptimistic = current.filter(entry => !(
          entry.habit_id === habit.id && entry.entry_date === entryDate
        ));
        return previous ? [...withoutOptimistic, previous] : withoutOptimistic;
      });
      setError(`Couldn't save progress: ${entryError.message}`);
      return false;
    }
    setEntries(current => upsertLocalEntry(current, data));
    return true;
  }, [entries]);

  const toggleSimple = useCallback((habit, entryDate) => {
    const current = entries.find(entry => entry.habit_id === habit.id && entry.entry_date === entryDate);
    return saveEntry(habit, entryDate, !current?.completed, []);
  }, [entries, saveEntry]);

  const toggleRoutineStep = useCallback((habit, entryDate, stepId) => {
    const current = entries.find(entry => entry.habit_id === habit.id && entry.entry_date === entryDate);
    const snapshot = current?.step_state?.length ? current.step_state : routineSnapshot(habit);
    const next = toggleSnapshotStep(snapshot, stepId);
    return saveEntry(habit, entryDate, next.completed, next.steps);
  }, [entries, saveEntry]);

  const toggleRoutine = useCallback((habit, entryDate) => {
    const current = entries.find(entry => entry.habit_id === habit.id && entry.entry_date === entryDate);
    const snapshot = current?.step_state?.length ? current.step_state : routineSnapshot(habit);
    const next = setSnapshotCompletion(snapshot, !current?.completed);
    return saveEntry(habit, entryDate, next.completed, next.steps);
  }, [entries, saveEntry]);

  return {
    habits: scopedHabits,
    entries: scopedEntries,
    entriesByHabit,
    loading: loading || loadedOwner !== ownerName,
    saving,
    error,
    clearError: () => setError(null),
    createHabit,
    updateHabit,
    setArchived,
    moveHabit,
    toggleSimple,
    toggleRoutine,
    toggleRoutineStep,
    refresh: fetchAll,
  };
}
