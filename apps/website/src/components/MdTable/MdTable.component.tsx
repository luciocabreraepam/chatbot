import * as stylex from "@stylexjs/stylex";
import type { MdTableProps } from "./MdTable.types";
import { styles } from "./MdTable.stylex";

export const MdTable = ({ children }: MdTableProps) => (
  <div {...stylex.props(styles.tableWrapper)}>
    <table {...stylex.props(styles.table)}>{children}</table>
  </div>
);
