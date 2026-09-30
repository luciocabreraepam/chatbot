import * as stylex from "@stylexjs/stylex";
import { colors, spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  th: {
    padding: `${spacing.xs} ${spacing.sm}`,
    borderBottom: `1px solid ${colors.border}`,
    color: colors.textMuted,
    fontWeight: "600",
    textAlign: "left",
  },
});
