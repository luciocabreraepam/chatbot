import type { StyleXStyles } from "@stylexjs/stylex";
import type { Message } from "@/lib/db";

export type InspectorTab = "http" | "metrics" | "request" | "response";

export type InspectorProps = {
  readonly activeTab: InspectorTab;
  readonly customStylex?: StyleXStyles;
  readonly isCollapsed: boolean;
  readonly onTabChange: (tab: InspectorTab) => void;
  readonly onToggleCollapse: () => void;
  readonly selectedMessage: Message | null;
};
