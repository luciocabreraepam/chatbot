import * as stylex from "@stylexjs/stylex";
import type { MdPreProps } from "./MdPre.types";
import { styles } from "./MdPre.stylex";

export const MdPre = ({ children }: MdPreProps) => (
  <div {...stylex.props(styles.preWrapper)}>{children}</div>
);
