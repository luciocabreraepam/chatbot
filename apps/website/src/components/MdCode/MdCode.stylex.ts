import * as stylex from "@stylexjs/stylex";
import { colors, fontSize, radius, spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  codeBlockWrapper: {
    borderRadius: radius.md,
    overflow: "hidden",
    border: `1px solid ${colors.border}`,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  codeBlockHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderBottom: `1px solid ${colors.border}`,
  },
  langLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  inlineCode: {
    backgroundColor: colors.codeBg,
    borderRadius: radius.sm,
    paddingTop: "2px",
    paddingBottom: "2px",
    paddingLeft: "5px",
    paddingRight: "5px",
    fontSize: fontSize.sm,
    fontFamily: "ui-monospace, 'Cascadia Code', monospace",
    color: "#e2e8f0",
  },
});
