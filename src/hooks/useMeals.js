import { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabase";

export default function useMeals() {
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
    const timer = window.setTimeout(() => { void fetchAll(); }, 0);
    const channel = supabase.channel("meals-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "meals" }, fetchAll)
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const addMeal = useCallback(async (meal) => {
    if (!supabase) return;
    const rest = { ...meal };
    delete rest.id;
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
