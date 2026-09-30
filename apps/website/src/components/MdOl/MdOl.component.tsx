import * as stylex from "@stylexjs/stylex";
import type { MdOlProps } from "./MdOl.types";
import { styles } from "./MdOl.stylex";

export const MdOl = ({ children }: MdOlProps) => <ol {...stylex.props(styles.list)}>{children}</ol>;
