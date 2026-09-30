import * as stylex from "@stylexjs/stylex";
import type { MdTdProps } from "./MdTd.types";
import { styles } from "./MdTd.stylex";

export const MdTd = ({ children }: MdTdProps) => <td {...stylex.props(styles.td)}>{children}</td>;
