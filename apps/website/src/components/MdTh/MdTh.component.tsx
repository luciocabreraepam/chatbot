import * as stylex from "@stylexjs/stylex";
import type { MdThProps } from "./MdTh.types";
import { styles } from "./MdTh.stylex";

export const MdTh = ({ children }: MdThProps) => <th {...stylex.props(styles.th)}>{children}</th>;
