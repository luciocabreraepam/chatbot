import * as stylex from "@stylexjs/stylex";
import type { MdH1Props } from "./MdH1.types";
import { styles } from "./MdH1.stylex";

export const MdH1 = ({ children }: MdH1Props) => (
  <h1 {...stylex.props(styles.heading, styles.h1)}>{children}</h1>
);
