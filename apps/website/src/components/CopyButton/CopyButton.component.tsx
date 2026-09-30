import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import type { CopyButtonProps } from "./CopyButton.types";
import { styles } from "./CopyButton.stylex";

export const CopyButton = ({ code }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button {...stylex.props(styles.copyBtn)} onClick={handleCopy} type="button">
      {copied ? "Copied!" : "Copy"}
    </button>
  );
};
