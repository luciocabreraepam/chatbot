import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";
import type { ChatInputProps } from "./ChatInput.types";
import { styles } from "./ChatInput.stylex";

export const ChatInput = ({ isStreaming, isDisabled, onSend }: ChatInputProps) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || isDisabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const canSend = value.trim().length > 0 && !isStreaming && !isDisabled;

  return (
    <div {...stylex.props(styles.root)}>
      {isStreaming && (
        <div {...stylex.props(styles.streamingIndicator)}>
          <span {...stylex.props(styles.dot)} />
          <span {...stylex.props(styles.dot)} />
          <span {...stylex.props(styles.dot)} />
          <span {...stylex.props(styles.streamingLabel)}>Streaming…</span>
        </div>
      )}
      <div {...stylex.props(styles.inputRow)}>
        <textarea
          ref={textareaRef}
          {...stylex.props(styles.textarea)}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isDisabled
              ? "Select a model to start chatting…"
              : "Ask anything… (Enter to send, Shift+Enter for newline)"
          }
          disabled={isDisabled || isStreaming}
          rows={1}
        />
        <button
          {...stylex.props(styles.sendBtn, canSend && styles.sendBtnActive)}
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          title="Send message"
        >
          ↑
        </button>
      </div>
      <div {...stylex.props(styles.hint)}>
        Enter to send · Shift+Enter for newline · Click a response to inspect it
      </div>
    </div>
  );
};
