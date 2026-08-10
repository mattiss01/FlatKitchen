import { useState, useEffect } from "react";

export function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseDate(dk) {
  const [y, m, d] = dk.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDay(dk) {
  const d = parseDate(dk);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return { weekday: days[d.getDay()], day: d.getDate(), month: months[d.getMonth()], full: d };
}

export function isToday(dk) { return dk === dateKey(new Date()); }

export function useLocalStore(key, initial) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; }
    catch { return initial; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(val)); }, [key, val]);
  return [val, setVal];
}
