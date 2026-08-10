import { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabase";

export default function useExpenses() {
  const [expenses, setExpenses] = useState([]);

  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
    setExpenses((data || []).map(e => ({ ...e, amount: parseFloat(e.amount) || 0 })));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const timer = window.setTimeout(() => { void fetchAll(); }, 0);
    const channel = supabase.channel("expenses-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, fetchAll)
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const addExpense = useCallback(async (amount, paidBy, description, splitBetween) => {
    if (!supabase) return;
    const tempId = `temp-${Date.now()}`;
    setExpenses(prev => [{ id: tempId, amount, paid_by: paidBy, description, split_between: splitBetween, created_at: new Date().toISOString() }, ...prev]);
    const { data, error } = await supabase.from("expenses").insert({ amount, paid_by: paidBy, description, split_between: splitBetween }).select().single();
    if (error) {
      console.error("[expenses] insert failed:", error);
      setExpenses(prev => prev.filter(e => e.id !== tempId));
    } else {
      setExpenses(prev => prev.map(e => e.id === tempId ? { ...data, amount: parseFloat(data.amount) || 0 } : e));
    }
  }, []);

  const deleteExpense = useCallback(async (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (supabase) await supabase.from("expenses").delete().eq("id", id);
  }, []);

  return { expenses, addExpense, deleteExpense };
}
