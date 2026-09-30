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
  empty: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
    textAlign: "center",
    padding: spacing.lg,
  },
  headersSection: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: "600",
  },
  headersList: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    border: `1px solid ${colors.border}`,
    padding: spacing.sm,
  },
  headerRow: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottom: `1px solid ${colors.borderSubtle}`,
    ":last-child": {
      paddingBottom: 0,
      borderBottom: "none",
    },
  },
  headerName: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: "500",
    fontFamily: "ui-monospace, monospace",
  },
  headerValue: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    fontFamily: "ui-monospace, monospace",
    wordBreak: "break-word",
  },
});
