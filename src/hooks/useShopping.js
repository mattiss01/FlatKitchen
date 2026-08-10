import { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabase";

export default function useShopping() {
  const [items, setItems] = useState([]);

  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("shopping_items").select("*").order("created_at", { ascending: true });
    setItems(data || []);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const timer = window.setTimeout(() => { void fetchAll(); }, 0);
    const channel = supabase.channel("shopping-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, fetchAll)
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const addItem = useCallback(async (text, addedBy) => {
    if (!supabase) return;
    const tempId = `temp-${Date.now()}`;
    setItems(prev => [...prev, { id: tempId, text, added_by: addedBy, bought_by: null, bought_at: null, created_at: new Date().toISOString() }]);
    const { data, error } = await supabase.from("shopping_items").insert({ text, added_by: addedBy }).select().single();
    if (error) {
      console.error("[shopping] insert failed:", error);
      setItems(prev => prev.filter(i => i.id !== tempId));
    } else {
      setItems(prev => prev.map(i => i.id === tempId ? data : i));
    }
  }, []);

  const markBought = useCallback(async (id, boughtBy) => {
    const now = new Date().toISOString();
    setItems(prev => prev.map(i => i.id === id ? { ...i, bought_by: boughtBy, bought_at: now } : i));
    if (supabase) await supabase.from("shopping_items").update({ bought_by: boughtBy, bought_at: now }).eq("id", id);
  }, []);

  const unmarkBought = useCallback(async (id) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, bought_by: null, bought_at: null } : i));
    if (supabase) await supabase.from("shopping_items").update({ bought_by: null, bought_at: null }).eq("id", id);
  }, []);

  const deleteItem = useCallback(async (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (supabase) await supabase.from("shopping_items").delete().eq("id", id);
  }, []);

  return { items, addItem, markBought, unmarkBought, deleteItem };
}
