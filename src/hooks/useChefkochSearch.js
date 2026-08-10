import { useState, useCallback } from "react";
import supabase from "../lib/supabase";

export default function useChefkochSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (q) => {
    if (!supabase) { setError("Backend not configured."); return; }
    if (!q || !q.trim()) { setResults([]); setError(null); return; }
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("chefkoch-search", { body: { q: q.trim() } });
      if (error) {
        console.error("[chefkoch-search] invoke failed:", error);
        setError(error.message || "Search failed");
        setResults([]);
      } else if (data && data.error) {
        setError(data.error);
        setResults([]);
      } else {
        setResults(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("[chefkoch-search] threw:", e);
      setError(e.message || String(e));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setResults([]); setError(null); }, []);

  return { results, loading, error, search, reset };
}
