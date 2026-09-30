import * as stylex from "@stylexjs/stylex";
import { colors } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  link: {
    color: colors.accent,
    textDecoration: "underline",
    ":hover": {
      color: colors.accentHover,
    },
  },
});
