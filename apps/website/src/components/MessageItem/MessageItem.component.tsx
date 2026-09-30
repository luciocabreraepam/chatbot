import * as stylex from "@stylexjs/stylex";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { MessageItemProps } from "./MessageItem.types";
import { styles } from "./MessageItem.stylex";
import { formatTime } from "./MessageItem.util";

export const MessageItem = ({ message, isSelected, onSelect }: MessageItemProps) => {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const handleClick = () => {
    if (!isUser) onSelect(message.id);
  };

  return (
    <div {...stylex.props(styles.root, isUser && styles.rootUser, isSystem && styles.rootSystem)}>
      <div
        {...stylex.props(
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
          isSystem && styles.bubbleSystem,
          isSelected && styles.bubbleSelected,
          !isUser && !isSystem && styles.clickable,
        )}
        onClick={handleClick}
        role={!isUser && !isSystem ? "button" : undefined}
        tabIndex={!isUser && !isSystem ? 0 : undefined}
      >
        <div {...stylex.props(styles.roleLabel)}>
          {isUser ? "You" : isSystem ? "System" : "Assistant"}
          {message.metrics && (
            <span {...stylex.props(styles.metricsBadge)}>
              {message.metrics.ttft}ms TTFT · {message.metrics.tokensPerSecond.toFixed(1)} tok/s
            </span>
          )}
        </div>

        {isUser || isSystem ? (
          <p {...stylex.props(styles.plainText)}>{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}

        <div {...stylex.props(styles.timestamp)}>{formatTime(message.timestamp)}</div>
      </div>
    </div>
  );
};
