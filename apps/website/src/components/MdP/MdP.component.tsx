import * as stylex from "@stylexjs/stylex";
import type { MdPProps } from "./MdP.types";
import { styles } from "./MdP.stylex";

export const MdP = ({ children }: MdPProps) => (
  <p {...stylex.props(styles.paragraph)}>{children}</p>
);
