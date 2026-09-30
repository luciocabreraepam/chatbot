import type { StyleXStyles } from "@stylexjs/stylex";
import type { Conversation } from "@/lib/db";

export type SidebarProps = {
  readonly conversations: readonly Conversation[];
  readonly activeConvId: string | null;
  readonly customStylex?: StyleXStyles;
  readonly isCollapsed: boolean;
  readonly isDbReady: boolean;
  readonly onDeleteConversation: (id: string) => void;
  readonly onNewConversation: () => void;
  readonly onSelectConversation: (id: string) => void;
  readonly onToggleCollapse: () => void;
};
