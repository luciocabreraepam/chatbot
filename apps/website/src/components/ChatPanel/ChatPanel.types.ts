import type { Message } from "@/lib/db";

export type ChatPanelProps = {
  readonly isModelSelected: boolean;
  readonly isStreaming: boolean;
  readonly messages: readonly Message[];
  readonly onDismissError: () => void;
  readonly onSelectMessage: (id: string) => void;
  readonly onSendMessage: (content: string) => void;
  readonly selectedMessageId: string | null;
  readonly streamError: string | null;
  readonly streamingContent: string;
};
