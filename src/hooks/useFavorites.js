import { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabase";

export default function useFavorites() {
  const [favorites, setFavorites] = useState([]);

  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("recipe_favorites")
      .select("*").order("created_at", { ascending: false });
    if (error) { console.error("[favorites] fetch failed:", error); return; }
    setFavorites(data || []);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const timer = window.setTimeout(() => { void fetchAll(); }, 0);
    const channel = supabase.channel("favorites-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "recipe_favorites" }, fetchAll)
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const addFavorite = useCallback(async ({ name, recipe }) => {
    if (!supabase) {
      alert("Backend not configured — cannot save favorites.");
      return;
    }
    const row = {
      name, recipe_id: String(recipe.id),
      title: recipe.title, url: recipe.url, image: recipe.image || null,
    };
    const tempId = `temp-${Date.now()}`;
    setFavorites(prev => [{ id: tempId, ...row, created_at: new Date().toISOString() }, ...prev]);
    const { data, error } = await supabase.from("recipe_favorites")
      .upsert(row, { onConflict: "name,recipe_id" })
      .select().single();
    if (error) {
      console.error("[favorites] insert failed:", error);
      alert(`Couldn't save favorite: ${error.message}`);
      setFavorites(prev => prev.filter(f => f.id !== tempId));
      return;
    }
    setFavorites(prev => prev.map(f => f.id === tempId ? data : f));
  }, []);

  const removeFavorite = useCallback(async (id) => {
    const prev = favorites;
    setFavorites(p => p.filter(f => f.id !== id));
    if (!supabase) return;
    const { error } = await supabase.from("recipe_favorites").delete().eq("id", id);
    if (error) {
      console.error("[favorites] delete failed:", error);
      alert(`Couldn't remove favorite: ${error.message}`);
      setFavorites(prev);
    }
  }, [favorites]);

  const isFavorite = useCallback((recipeId, name) =>
    favorites.some(f => f.name === name && f.recipe_id === String(recipeId)),
  [favorites]);

  const findFavorite = useCallback((recipeId, name) =>
    favorites.find(f => f.name === name && f.recipe_id === String(recipeId)),
  [favorites]);

  return { favorites, addFavorite, removeFavorite, isFavorite, findFavorite };
}
