import * as stylex from "@stylexjs/stylex";
import { colors, fontSize, radius, spacing } from "@/styles/tokens.stylex";

export const styles = stylex.create({
  root: {
    display: "flex",
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  rootUser: {
    justifyContent: "flex-end",
  },
  rootSystem: {
    justifyContent: "center",
  },
  bubble: {
    borderRadius: radius.lg,
    maxWidth: "75%",
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  bubbleUser: {
    backgroundColor: colors.userBubble,
    borderBottomRightRadius: radius.sm,
  },
  bubbleAssistant: {
    backgroundColor: colors.bgSurface,
    border: `1px solid ${colors.border}`,
    borderBottomLeftRadius: radius.sm,
    maxWidth: "90%",
  },
  bubbleSystem: {
    backgroundColor: colors.bgElevated,
    border: `1px dashed ${colors.border}`,
    borderRadius: radius.md,
    maxWidth: "80%",
    opacity: 0.8,
  },
  bubbleSelected: {
    borderColor: colors.accent,
    boxShadow: `0 0 0 1px ${colors.accent}`,
  },
  clickable: {
    cursor: "pointer",
    transition: "border-color 0.15s",
    ":hover": {
      borderColor: colors.accent,
    },
  },
  roleLabel: {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: spacing.xs,
  },
  metricsBadge: {
    color: colors.success,
    fontWeight: "400",
    textTransform: "none",
    letterSpacing: 0,
  },
  plainText: {
    color: colors.textMain,
    fontSize: fontSize.md,
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    marginTop: spacing.xs,
    textAlign: "right",
  },
});
