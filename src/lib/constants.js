export const FLATMATES = [
  { name: "Mattis", emoji: "🦊" },
  { name: "Robert", emoji: "🐻" },
  { name: "Jakob", emoji: "🦅" },
];

export const ATTENDANCE = { HOME: "home", AWAY: "away", UNSURE: "unsure" };

export const ATT_COLORS = {
  home: { bg: "#D9F2D0", border: "#4AAF50", text: "#256D2B" },
  away: { bg: "#FCE0E0", border: "#D94F4F", text: "#A63030" },
  unsure: { bg: "#FFF4CC", border: "#D4A720", text: "#8A6A00" },
  none: { bg: "transparent", border: "#DDD3C4", text: "#B0A090" },
};

export const fonts = `'DM Sans', 'Helvetica Neue', sans-serif`;
export const displayFont = `'Instrument Serif', Georgia, serif`;

export const C = {
  bg: "#F4EDE4", card: "#FFFFFF", cardAlt: "#FBF7F1",
  border: "#DDD3C4", borderLight: "#EBE4DA",
  text: "#1C1714", textMuted: "#857668", textLight: "#AEA090",
  accent: "#C24530", accentLight: "#FBEAE4", accentSoft: "#E8907E",
  dark: "#1C1714", darkCard: "#2E251D",
  green: "#3B7A48", greenLight: "#D6EDD9",
};

export const cssAnimation = `
@keyframes fk-fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fk-scaleIn {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes fk-popIn {
  0% { transform: scale(1); }
  40% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
.fk-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.fk-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(28,23,20,0.08);
}
.fk-btn {
  transition: all 0.15s ease;
}
.fk-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.06);
}
.fk-btn:active {
  transform: translateY(0) scale(0.97);
}
.fk-input:focus {
  border-color: #C24530 !important;
  box-shadow: 0 0 0 3px #C2453018;
}
.fk-picker-btn {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fk-picker-btn:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 12px 28px rgba(28,23,20,0.1);
}
.fk-picker-btn:active {
  transform: translateY(0) scale(0.98);
}
.fk-like-pop {
  animation: fk-popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fk-tag {
  transition: all 0.12s ease;
}
.fk-tag:hover {
  transform: scale(1.04);
}
.fk-att-btn {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fk-att-btn:active {
  transform: scale(0.94);
}
button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible {
  outline: 3px solid #C2453040;
  outline-offset: 2px;
}
button:disabled {
  cursor: default !important;
  opacity: 0.48;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
div::-webkit-scrollbar { display: none; }
* { scrollbar-width: none; }
`;

export const labelSt = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#857668",
  marginBottom: 5, fontFamily: `'DM Sans', 'Helvetica Neue', sans-serif`,
  textTransform: "uppercase", letterSpacing: "0.06em",
};

export const fieldSt = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: `1.5px solid #DDD3C4`, background: "#FBF7F1",
  fontSize: 14, fontFamily: `'DM Sans', 'Helvetica Neue', sans-serif`,
  color: "#1C1714", outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export const smallBtn = {
  padding: "6px 14px", borderRadius: 10, background: "transparent",
  border: `1.5px solid #3B7A48`, fontSize: 12, fontWeight: 600,
  color: "#3B7A48", cursor: "pointer", fontFamily: `'DM Sans', 'Helvetica Neue', sans-serif`,
};
