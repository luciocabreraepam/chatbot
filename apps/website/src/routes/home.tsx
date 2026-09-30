import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { Link, Outlet, useLoaderData } from "react-router";
import { ChatPanel } from "@/components/ChatPanel";
import { Inspector } from "@/components/Inspector";
import { Sidebar } from "@/components/Sidebar";
import { useResizable } from "@/hooks/useResizable.hook";
import { useStudio } from "@/hooks/useStudio.hook";
import { parseSettingsCookie } from "@/lib/settings.cookie";
import { colors, fontSize, radius, spacing } from "@/styles/tokens.stylex";

export const meta = () => [
  { title: "LocalOmni Studio" },
  { name: "description", content: "Developer playground for testing local and cloud AI models" },
];

export const loader = ({ request }: { request: Request }) => ({
  initializedAt: Date.now(),
  settings: parseSettingsCookie(request.headers.get("Cookie")),
});

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 480;
const INSPECTOR_MIN = 240;
const INSPECTOR_MAX = 1200;
const SIDEBAR_DEFAULT = 240;
const INSPECTOR_DEFAULT = 340;

const Home = () => {
  const { settings } = useLoaderData<typeof loader>();
  const studio = useStudio(settings);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const sidebar = useResizable({
    initial: SIDEBAR_DEFAULT,
    min: SIDEBAR_MIN,
    max: SIDEBAR_MAX,
    direction: "right",
  });
  const inspector = useResizable({
    initial: INSPECTOR_DEFAULT,
    min: INSPECTOR_MIN,
    max: INSPECTOR_MAX,
    direction: "left",
  });
  const isDragging = sidebar.isDragging || inspector.isDragging;

  const selectedMessage =
    studio.selectedMessageId !== null
      ? (studio.messages.find((m) => m.id === studio.selectedMessageId) ?? null)
      : null;

  const handleToggleSidebar = () => setIsSidebarCollapsed((v) => !v);
  const handleToggleInspector = () => setIsInspectorCollapsed((v) => !v);

  return (
    <div {...stylex.props(styles.root)}>
      {isDragging && <div {...stylex.props(styles.dragOverlay)} />}

      <header {...stylex.props(styles.topBar)}>
        <div {...stylex.props(styles.brand)}>
          <span {...stylex.props(styles.logo)}>◆</span>
          <span {...stylex.props(styles.title)}>LocalOmni Studio</span>
        </div>
        <div {...stylex.props(styles.headerMeta)}>
          {studio.model && (
            <span {...stylex.props(styles.modelBadge)}>
              {studio.vendor} · {studio.model}
            </span>
          )}
          <Link {...stylex.props(styles.settingsBtn)} to="/settings">
            ⚙ Settings
          </Link>
        </div>
      </header>

      <div {...stylex.props(styles.workspace)}>
        <Sidebar
          conversations={studio.conversations}
          activeConvId={studio.activeConvId}
          customStylex={panelStyles.width(sidebar.width)}
          isCollapsed={isSidebarCollapsed}
          isDbReady={studio.isDbReady}
          onDeleteConversation={studio.onDeleteConversation}
          onNewConversation={studio.onNewConversation}
          onSelectConversation={studio.onSelectConversation}
          onToggleCollapse={handleToggleSidebar}
        />

        {!isSidebarCollapsed && (
          <div {...stylex.props(styles.resizeHandle)} onMouseDown={sidebar.handleResizeStart} />
        )}

        <ChatPanel
          isModelSelected={studio.model.length > 0}
          isStreaming={studio.isStreaming}
          messages={studio.messages}
          selectedMessageId={studio.selectedMessageId}
          streamError={studio.streamError}
          streamingContent={studio.streamingContent}
          onDismissError={studio.onDismissError}
          onSendMessage={studio.onSendMessage}
          onSelectMessage={studio.onSelectMessage}
        />

        {!isInspectorCollapsed && (
          <div {...stylex.props(styles.resizeHandle)} onMouseDown={inspector.handleResizeStart} />
        )}

        <Inspector
          selectedMessage={selectedMessage}
          activeTab={studio.inspectorTab}
          customStylex={panelStyles.width(inspector.width)}
          isCollapsed={isInspectorCollapsed}
          onTabChange={studio.onInspectorTabChange}
          onToggleCollapse={handleToggleInspector}
        />
      </div>

      {/* Outlet renders overlay child routes (e.g. /settings) */}
      <Outlet context={studio} />
    </div>
  );
};

export default Home;

const styles = stylex.create({
  root: {
    containerType: "inline-size",
    containerName: "root",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: colors.bgDark,
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    backgroundColor: colors.bgSurface,
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    color: colors.accent,
    fontSize: fontSize.xl,
    lineHeight: 1,
  },
  title: {
    color: colors.textMain,
    fontSize: fontSize.lg,
    fontWeight: "600",
    letterSpacing: "-0.02em",
  },
  headerMeta: {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
  },
  modelBadge: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.pill,
    paddingTop: "3px",
    paddingBottom: "3px",
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    border: `1px solid ${colors.border}`,
  },
  settingsBtn: {
    backgroundColor: colors.bgElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.textMuted,
    cursor: "pointer",
    fontSize: fontSize.sm,
    paddingTop: "5px",
    paddingBottom: "5px",
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    textDecoration: "none",
    ":hover": {
      borderColor: colors.accent,
      color: colors.textMain,
    },
  },
  workspace: {
    containerType: "inline-size",
    containerName: "workspace",
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  resizeHandle: {
    width: "4px",
    flexShrink: 0,
    cursor: "col-resize",
    backgroundColor: colors.border,
    transition: "background-color 0.15s",
    ":hover": {
      backgroundColor: colors.accent,
    },
  },
  dragOverlay: {
    position: "fixed",
    inset: 0,
    cursor: "col-resize",
    zIndex: 9999,
    userSelect: "none",
  },
});

const panelStyles = stylex.create({
  width: (w: number) => ({
    width: `${w}px`,
  }),
});
