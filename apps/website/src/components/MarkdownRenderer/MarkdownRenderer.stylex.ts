import * as stylex from "@stylexjs/stylex";
import { colors, fontSize } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  root: {
    color: colors.textMain,
    fontSize: fontSize.md,
    lineHeight: "1.7",
  },
});
