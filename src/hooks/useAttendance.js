import { useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabase";

function groupAttendance(rows) {
  const grouped = {};
  (rows || []).forEach(r => {
    if (!grouped[r.date]) grouped[r.date] = {};
    grouped[r.date][r.name] = r.status;
  });
  return grouped;
}

export default function useAttendance() {
  const [attendance, setAttendance] = useState({});

  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("attendance").select("*");
    setAttendance(groupAttendance(data));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const timer = window.setTimeout(() => { void fetchAll(); }, 0);
    const channel = supabase.channel("attendance-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, fetchAll)
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const toggleAttendance = useCallback(async (date, name) => {
    const current = attendance[date]?.[name];
    let newStatus;
    if (!current) newStatus = "home";
    else if (current === "home") newStatus = "unsure";
    else if (current === "unsure") newStatus = "away";
    else newStatus = null;

    setAttendance(prev => {
      const copy = { ...prev, [date]: { ...(prev[date] || {}) } };
      if (newStatus) copy[date][name] = newStatus;
      else delete copy[date][name];
      return copy;
    });

    if (!supabase) return;
    if (newStatus) {
      await supabase.from("attendance").upsert({ date, name, status: newStatus });
    } else {
      await supabase.from("attendance").delete().eq("date", date).eq("name", name);
    }
  }, [attendance]);

  return { attendance, toggleAttendance };
}
