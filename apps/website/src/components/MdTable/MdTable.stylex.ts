import * as stylex from "@stylexjs/stylex";
import { fontSize, spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  tableWrapper: {
    overflowX: "auto",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  table: {
    borderCollapse: "collapse",
    width: "100%",
    fontSize: fontSize.md,
  },
});
