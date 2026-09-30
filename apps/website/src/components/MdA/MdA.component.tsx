import * as stylex from "@stylexjs/stylex";
import type { MdAProps } from "./MdA.types";
import { styles } from "./MdA.stylex";

export const MdA = ({ href, children }: MdAProps) => (
  <a href={href} {...stylex.props(styles.link)} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);
