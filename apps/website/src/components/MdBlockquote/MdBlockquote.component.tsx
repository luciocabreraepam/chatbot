import * as stylex from "@stylexjs/stylex";
import type { MdBlockquoteProps } from "./MdBlockquote.types";
import { styles } from "./MdBlockquote.stylex";

export const MdBlockquote = ({ children }: MdBlockquoteProps) => (
  <blockquote {...stylex.props(styles.blockquote)}>{children}</blockquote>
);
