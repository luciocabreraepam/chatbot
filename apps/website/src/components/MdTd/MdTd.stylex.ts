import * as stylex from "@stylexjs/stylex";
import { colors, spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  td: {
    padding: `${spacing.xs} ${spacing.sm}`,
    borderBottom: `1px solid ${colors.borderSubtle}`,
    color: colors.textMain,
  },
});
