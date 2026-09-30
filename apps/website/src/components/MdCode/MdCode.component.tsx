import * as stylex from "@stylexjs/stylex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { CopyButton } from "@/components/CopyButton";
import type { MdCodeProps } from "./MdCode.types";
import { styles } from "./MdCode.stylex";
import { extractCode } from "./extractCode.util";

export const MdCode = ({ className, children }: MdCodeProps) => {
  const langMatch = /language-(\w+)/.exec(className ?? "");
  const code = extractCode(children).replace(/\n$/, "");

  if (langMatch) {
    return (
      <div {...stylex.props(styles.codeBlockWrapper)}>
        <div {...stylex.props(styles.codeBlockHeader)}>
          <span {...stylex.props(styles.langLabel)}>{langMatch[1]}</span>
          <CopyButton code={code} />
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={langMatch[1]}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: "0 0 8px 8px",
            fontSize: "12px",
            lineHeight: "1.6",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }

  return <code {...stylex.props(styles.inlineCode)}>{children}</code>;
};
