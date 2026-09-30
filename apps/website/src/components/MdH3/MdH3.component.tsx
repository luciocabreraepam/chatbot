import * as stylex from "@stylexjs/stylex";
import type { MdH3Props } from "./MdH3.types";
import { styles } from "./MdH3.stylex";

export const MdH3 = ({ children }: MdH3Props) => (
  <h3 {...stylex.props(styles.heading, styles.h3)}>{children}</h3>
);
