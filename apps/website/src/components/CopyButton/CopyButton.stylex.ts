import * as stylex from "@stylexjs/stylex";
import { colors, fontSize, radius, spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
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
    transition: "color 0.15s, border-color 0.15s",
    ":hover": {
      color: colors.textMain,
      borderColor: colors.accent,
    },
  },
});
