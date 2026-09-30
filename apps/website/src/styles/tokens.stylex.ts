import * as stylex from "@stylexjs/stylex";

export const colors = stylex.defineVars({
  bgDark: "#0f172a",
  bgSurface: "#1e293b",
  bgElevated: "#243044",
  textMain: "#f8fafc",
  textMuted: "#94a3b8",
  textSubtle: "#64748b",
  accent: "#2563eb",
  accentHover: "#1d4ed8",
  border: "#334155",
  borderSubtle: "#1e293b",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  userBubble: "#1e3a5f",
  codeBg: "#0d1117",
});

export const spacing = stylex.defineVars({
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
});

export const fontSize = stylex.defineVars({
  xs: "11px",
  sm: "12px",
  md: "13px",
  lg: "15px",
  xl: "18px",
  xxl: "22px",
});

export const radius = stylex.defineVars({
  sm: "4px",
  md: "8px",
  lg: "12px",
  pill: "9999px",
});

export const lineHeight = stylex.defineVars({
  tight: "1.3",
  normal: "1.6",
  relaxed: "1.8",
});
