import * as stylex from "@stylexjs/stylex";
import type { MdUlProps } from "./MdUl.types";
import { styles } from "./MdUl.stylex";

export const MdUl = ({ children }: MdUlProps) => <ul {...stylex.props(styles.list)}>{children}</ul>;
