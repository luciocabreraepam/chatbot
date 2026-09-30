import * as stylex from "@stylexjs/stylex";
import { spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  paragraph: {
    marginTop: 0,
    marginBottom: spacing.sm,
    ":last-child": {
      marginBottom: 0,
    },
  },
});
