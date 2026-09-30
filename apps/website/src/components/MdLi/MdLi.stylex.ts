import * as stylex from "@stylexjs/stylex";
import { spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  listItem: {
    marginBottom: spacing.xs,
    lineHeight: "1.6",
  },
});
