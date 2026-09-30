import * as stylex from "@stylexjs/stylex";
import { colors, fontSize, radius, spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  jsonSection: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
  },
  jsonHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  jsonLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: "600",
  },
  copyBtn: {
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.textMuted,
    cursor: "pointer",
    fontSize: fontSize.xs,
    paddingTop: "2px",
    paddingBottom: "2px",
    paddingLeft: spacing.xs,
    paddingRight: spacing.xs,
    ":hover": {
      color: colors.textMain,
      borderColor: colors.accent,
    },
  },
  jsonPre: {
    backgroundColor: colors.codeBg,
    borderRadius: radius.md,
    border: `1px solid ${colors.border}`,
    overflow: "auto",
    maxHeight: "400px",
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  jsonCode: {
    color: "#e2e8f0",
    fontSize: fontSize.xs,
    fontFamily: "ui-monospace, 'Cascadia Code', monospace",
    lineHeight: "1.6",
    whiteSpace: "pre",
  },
});
