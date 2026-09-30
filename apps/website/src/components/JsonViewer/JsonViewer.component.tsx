import * as stylex from "@stylexjs/stylex";
import type { JsonViewerProps } from "./JsonViewer.types";
import { styles } from "./JsonViewer.stylex";

export const JsonViewer = ({ content, label }: JsonViewerProps) => {
  const handleCopy = () => {
    void navigator.clipboard.writeText(content);
  };

  return (
    <div {...stylex.props(styles.jsonSection)}>
      <div {...stylex.props(styles.jsonHeader)}>
        <span {...stylex.props(styles.jsonLabel)}>{label}</span>
        <button {...stylex.props(styles.copyBtn)} type="button" onClick={handleCopy}>
          Copy
        </button>
      </div>
      <pre {...stylex.props(styles.jsonPre)}>
        <code {...stylex.props(styles.jsonCode)}>{content}</code>
      </pre>
    </div>
  );
};
