import { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabase";

function groupIdeas(rows) {
  const grouped = {};
  (rows || []).forEach(r => {
    if (!grouped[r.date]) grouped[r.date] = [];
    grouped[r.date].push({
      id: r.id, dish: r.dish, author: r.author,
      tags: r.tags || [], likes: r.likes || [], comments: r.comments || [],
      recipe_url: r.recipe_url || null,
      recipe_image: r.recipe_image || null,
      recipe_title: r.recipe_title || null,
    });
  });
  return grouped;
}

export default function useIdeas() {
  const [ideas, setIdeas] = useState({});

  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("ideas").select("*").order("created_at", { ascending: true });
    if (error) { console.error("[ideas] fetch failed:", error); return; }
    setIdeas(groupIdeas(data));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const timer = window.setTimeout(() => { void fetchAll(); }, 0);
    const channel = supabase.channel("ideas-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "ideas" }, fetchAll)
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const addIdea = useCallback(async (date, { dish, tags, author, recipe }) => {
    if (!supabase) {
      alert("Backend not configured — cannot save. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Vercel project's Environment Variables, then redeploy.");
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const recipeFields = recipe
      ? { recipe_url: recipe.url || null, recipe_image: recipe.image || null, recipe_title: recipe.title || null }
      : { recipe_url: null, recipe_image: null, recipe_title: null };
    setIdeas(prev => ({
      ...prev,
      [date]: [...(prev[date] || []), { id: tempId, dish, author, tags, likes: [], comments: [], ...recipeFields }],
    }));
    const rollback = () => setIdeas(prev => ({
      ...prev,
      [date]: (prev[date] || []).filter(i => i.id !== tempId),
    }));
    try {
      const { data, error } = await supabase.from("ideas")
        .insert({ date, dish, tags, author, likes: [], comments: [], ...recipeFields })
        .select().single();
      if (error) {
        console.error("[ideas] insert failed:", error);
        alert(`Couldn't save idea: ${error.message}`);
        rollback();
        return;
      }
      setIdeas(prev => ({
        ...prev,
        [date]: (prev[date] || []).map(i => i.id === tempId ? {
          id: data.id, dish: data.dish, author: data.author,
          tags: data.tags || [], likes: data.likes || [], comments: data.comments || [],
          recipe_url: data.recipe_url || null,
          recipe_image: data.recipe_image || null,
          recipe_title: data.recipe_title || null,
        } : i),
      }));
    } catch (e) {
      console.error("[ideas] insert threw:", e);
      alert(`Couldn't save idea: ${e.message || e}`);
      rollback();
    }
  }, []);

  const likeIdea = useCallback(async (date, ideaId, userName) => {
    let prevLikes = null;
    let newLikes = null;
    setIdeas(prev => {
      const idea = prev[date]?.find(i => i.id === ideaId);
      if (!idea) return prev;
      prevLikes = idea.likes || [];
      const liked = prevLikes.includes(userName);
      newLikes = liked ? prevLikes.filter(n => n !== userName) : [...prevLikes, userName];
      return {
        ...prev,
        [date]: prev[date].map(i => i.id === ideaId ? { ...i, likes: newLikes } : i),
      };
    });
    if (!supabase || newLikes === null) return;
    const { error } = await supabase.from("ideas").update({ likes: newLikes }).eq("id", ideaId);
    if (error) {
      console.error("[ideas] like update failed:", error);
      setIdeas(prev => ({
        ...prev,
        [date]: (prev[date] || []).map(i => i.id === ideaId ? { ...i, likes: prevLikes } : i),
      }));
    }
  }, []);

  const commentIdea = useCallback(async (date, ideaId, author, text) => {
    let prevComments = null;
    let newComments = null;
    setIdeas(prev => {
      const idea = prev[date]?.find(i => i.id === ideaId);
      if (!idea) return prev;
      prevComments = idea.comments || [];
      newComments = [...prevComments, { author, text }];
      return {
        ...prev,
        [date]: prev[date].map(i => i.id === ideaId ? { ...i, comments: newComments } : i),
      };
    });
    if (!supabase || newComments === null) return;
    const { error } = await supabase.from("ideas").update({ comments: newComments }).eq("id", ideaId);
    if (error) {
      console.error("[ideas] comment update failed:", error);
      alert(`Couldn't save comment: ${error.message}`);
      setIdeas(prev => ({
        ...prev,
        [date]: (prev[date] || []).map(i => i.id === ideaId ? { ...i, comments: prevComments } : i),
      }));
    }
  }, []);

  const deleteComment = useCallback(async (date, ideaId, commentIndex) => {
    let prevComments = null;
    let newComments = null;
    setIdeas(prev => {
      const idea = prev[date]?.find(i => i.id === ideaId);
      if (!idea) return prev;
      prevComments = idea.comments || [];
      newComments = prevComments.filter((_, idx) => idx !== commentIndex);
      return {
        ...prev,
        [date]: prev[date].map(i => i.id === ideaId ? { ...i, comments: newComments } : i),
      };
    });
    if (!supabase || newComments === null) return;
    const { error } = await supabase.from("ideas").update({ comments: newComments }).eq("id", ideaId);
    if (error) {
      console.error("[ideas] comment delete failed:", error);
      alert(`Couldn't delete comment: ${error.message}`);
      setIdeas(prev => ({
        ...prev,
        [date]: (prev[date] || []).map(i => i.id === ideaId ? { ...i, comments: prevComments } : i),
      }));
    }
  }, []);

  const deleteIdea = useCallback(async (date, ideaId) => {
    setIdeas(prev => ({
      ...prev,
      [date]: (prev[date] || []).filter(i => i.id !== ideaId),
    }));
    if (supabase) await supabase.from("ideas").delete().eq("id", ideaId);
  }, []);

  return { ideas, addIdea, likeIdea, commentIdea, deleteComment, deleteIdea };
}
