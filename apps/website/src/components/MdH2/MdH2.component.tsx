import * as stylex from "@stylexjs/stylex";
import type { MdH2Props } from "./MdH2.types";
import { styles } from "./MdH2.stylex";

export const MdH2 = ({ children }: MdH2Props) => (
  <h2 {...stylex.props(styles.heading, styles.h2)}>{children}</h2>
);
