import * as stylex from "@stylexjs/stylex";
import { colors, fontSize, radius, spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  tabContent: {
    padding: spacing.md,
    display: "flex",
    flexDirection: "column",
    gap: spacing.md,
  },
  metricsGrid: {
    display: "flex",
    flexDirection: "column",
  },
  metricsChart: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  chartLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: "600",
  },
  progressBar: {
    height: "8px",
    backgroundColor: colors.bgElevated,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    transition: "width 0.3s",
  },
  chartAnnotation: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    fontVariantNumeric: "tabular-nums",
  },
});
