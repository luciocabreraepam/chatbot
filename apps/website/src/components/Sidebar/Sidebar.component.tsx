import * as stylex from "@stylexjs/stylex";
import type { SidebarProps } from "./Sidebar.types";
import { styles } from "./Sidebar.stylex";
import { formatDate } from "./Sidebar.util";

export const Sidebar = ({
  conversations,
  activeConvId,
  customStylex,
  isCollapsed,
  isDbReady,
  onDeleteConversation,
  onNewConversation,
  onSelectConversation,
  onToggleCollapse,
}: SidebarProps) => {
  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteConversation(id);
  };

  if (isCollapsed) {
    return (
      <aside {...stylex.props(styles.root, styles.rootCollapsed)}>
        <button
          {...stylex.props(styles.toggleBtn)}
          type="button"
          onClick={onToggleCollapse}
          title="Expand sidebar"
        >
          ›
        </button>
      </aside>
    );
  }

  return (
    <aside {...stylex.props(styles.root, customStylex)}>
      <div {...stylex.props(styles.header)}>
        <span {...stylex.props(styles.sectionTitle)}>Conversations</span>
        <div {...stylex.props(styles.headerActions)}>
          <button
            {...stylex.props(styles.newBtn)}
            type="button"
            onClick={onNewConversation}
            title="New conversation"
          >
            +
          </button>
          <button
            {...stylex.props(styles.collapseBtn)}
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
          >
            ‹
          </button>
        </div>
      </div>

      <div {...stylex.props(styles.list)}>
        {!isDbReady && <div {...stylex.props(styles.placeholder)}>Initializing…</div>}
        {isDbReady && conversations.length === 0 && (
          <div {...stylex.props(styles.placeholder)}>No conversations yet</div>
        )}
        {conversations.map((conv) => (
          <button
            key={conv.id}
            {...stylex.props(styles.convItem, activeConvId === conv.id && styles.convItemActive)}
            type="button"
            onClick={() => onSelectConversation(conv.id)}
          >
            <div {...stylex.props(styles.convTop)}>
              <span {...stylex.props(styles.convTitle)}>{conv.title}</span>
              <button
                {...stylex.props(styles.deleteBtn)}
                type="button"
                onClick={(e) => handleDeleteClick(e, conv.id)}
                title="Delete"
              >
                ×
              </button>
            </div>
            <div {...stylex.props(styles.convMeta)}>
              <span {...stylex.props(styles.convVendor)}>{conv.vendor}</span>
              <span {...stylex.props(styles.convDate)}>{formatDate(conv.updatedAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
};
