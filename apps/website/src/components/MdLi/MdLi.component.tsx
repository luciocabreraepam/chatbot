import * as stylex from "@stylexjs/stylex";
import type { MdLiProps } from "./MdLi.types";
import { styles } from "./MdLi.stylex";

export const MdLi = ({ children }: MdLiProps) => (
  <li {...stylex.props(styles.listItem)}>{children}</li>
);
