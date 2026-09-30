import * as stylex from "@stylexjs/stylex";
import { spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  preWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
});
