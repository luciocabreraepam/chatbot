import * as stylex from "@stylexjs/stylex";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MdA } from "@/components/MdA";
import { MdBlockquote } from "@/components/MdBlockquote";
import { MdCode } from "@/components/MdCode";
import { MdH1 } from "@/components/MdH1";
import { MdH2 } from "@/components/MdH2";
import { MdH3 } from "@/components/MdH3";
import { MdLi } from "@/components/MdLi";
import { MdOl } from "@/components/MdOl";
import { MdP } from "@/components/MdP";
import { MdPre } from "@/components/MdPre";
import { MdTable } from "@/components/MdTable";
import { MdTd } from "@/components/MdTd";
import { MdTh } from "@/components/MdTh";
import { MdUl } from "@/components/MdUl";
import type { MarkdownRendererProps } from "./MarkdownRenderer.types";
import { styles } from "./MarkdownRenderer.stylex";

// Stable reference — defined once at module scope so ReactMarkdown never re-mounts subtrees.
const MARKDOWN_COMPONENTS = {
  a: MdA,
  blockquote: MdBlockquote,
  code: MdCode,
  h1: MdH1,
  h2: MdH2,
  h3: MdH3,
  li: MdLi,
  ol: MdOl,
  p: MdP,
  pre: MdPre,
  table: MdTable,
  td: MdTd,
  th: MdTh,
  ul: MdUl,
} as const;

const REMARK_PLUGINS = [remarkGfm];

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => (
  <div {...stylex.props(styles.root)}>
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
      {content}
    </ReactMarkdown>
  </div>
);
