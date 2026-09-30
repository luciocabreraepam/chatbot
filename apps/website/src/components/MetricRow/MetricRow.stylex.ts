import * as stylex from "@stylexjs/stylex";
import { colors, fontSize, spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottom: `1px solid ${colors.borderSubtle}`,
    containerType: "inline-size",
    containerName: "inspector",
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  value: {
    fontSize: fontSize.md,
    color: colors.textMain,
    fontWeight: "500",
    fontVariantNumeric: "tabular-nums",
  },
  valueHighlight: {
    color: colors.success,
  },
  unit: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    fontWeight: "400",
  },
});
