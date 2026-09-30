import type { Message } from "@/lib/db";

export type MessageItemProps = {
  readonly isSelected: boolean;
  readonly message: Message;
  readonly onSelect: (id: string) => void;
};
