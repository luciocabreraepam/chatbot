import * as stylex from "@stylexjs/stylex";
import { spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  list: {
    paddingLeft: spacing.md,
    marginBottom: spacing.sm,
  },
});
