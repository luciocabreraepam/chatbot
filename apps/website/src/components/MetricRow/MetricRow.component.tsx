import * as stylex from "@stylexjs/stylex";
import type { MetricRowProps } from "./MetricRow.types";
import { styles } from "./MetricRow.stylex";

export const MetricRow = ({ label, value, unit, highlight = false }: MetricRowProps) => (
  <div {...stylex.props(styles.row)}>
    <span {...stylex.props(styles.label)}>{label}</span>
    <span {...stylex.props(styles.value, highlight && styles.valueHighlight)}>
      {value}
      {unit && <span {...stylex.props(styles.unit)}> {unit}</span>}
    </span>
  </div>
);
