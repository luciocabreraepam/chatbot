import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef } from "react";
import { ChatInput } from "@/components/ChatInput";
import { MessageItem } from "@/components/MessageItem";
import type { ChatPanelProps } from "./ChatPanel.types";
import { styles } from "./ChatPanel.stylex";

export const ChatPanel = ({
  messages,
  isStreaming,
  streamingContent,
  selectedMessageId,
  isModelSelected,
  streamError,
  onSendMessage,
  onSelectMessage,
  onDismissError,
}: ChatPanelProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <section {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.messageList)}>
        {isEmpty && (
          <div {...stylex.props(styles.empty)}>
            <div {...stylex.props(styles.emptyIcon)}>◆</div>
            <p {...stylex.props(styles.emptyTitle)}>LocalOmni Studio</p>
            <p {...stylex.props(styles.emptySubtitle)}>
              Select a vendor and model above, then start a conversation.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            isSelected={selectedMessageId === msg.id}
            onSelect={onSelectMessage}
          />
        ))}

        {isStreaming && streamingContent && (
          <div {...stylex.props(styles.streamingRow)}>
            <div {...stylex.props(styles.streamingBubble)}>
              <div {...stylex.props(styles.streamingLabel)}>Assistant</div>
              <p {...stylex.props(styles.streamingText)}>{streamingContent}</p>
              <div {...stylex.props(styles.cursor)} />
            </div>
          </div>
        )}

        {streamError !== null && (
          <div {...stylex.props(styles.errorRow)}>
            <p {...stylex.props(styles.errorBubble)} role="alert">
              Stream error: {streamError}
            </p>
            <button
              {...stylex.props(styles.errorDismiss)}
              type="button"
              aria-label="Dismiss error"
              onClick={onDismissError}
            >
              ✕
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput isStreaming={isStreaming} isDisabled={!isModelSelected} onSend={onSendMessage} />
    </section>
  );
};
