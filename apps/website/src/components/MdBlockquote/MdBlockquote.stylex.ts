import * as stylex from "@stylexjs/stylex";
import { colors, spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  blockquote: {
    borderLeft: `3px solid ${colors.accent}`,
    marginLeft: 0,
    marginRight: 0,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingLeft: spacing.md,
    color: colors.textMuted,
    fontStyle: "italic",
  },
});
