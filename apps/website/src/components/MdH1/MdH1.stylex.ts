import * as stylex from "@stylexjs/stylex";
import { colors, fontSize, spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  heading: {
    color: colors.textMain,
    fontWeight: "600",
    lineHeight: "1.3",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  h1: { fontSize: fontSize.xxl },
});
