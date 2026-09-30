export type ChatInputProps = {
  readonly isDisabled: boolean;
  readonly isStreaming: boolean;
  readonly onSend: (content: string) => void;
};
