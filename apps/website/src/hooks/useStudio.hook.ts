import { useCallback } from "react";
import type { ConnectionSettings } from "@/lib/settings.cookie";
import "@/lib/dbDebug"; // Import to auto-register debug utilities
import { useConversations } from "./useConversations.hook";
import { useInspector } from "./useInspector.hook";
import { useSettings } from "./useSettings.hook";
import { useStreaming } from "./useStreaming.hook";

export const useStudio = (initialSettings: ConnectionSettings) => {
  const settings = useSettings(initialSettings);
  const conversations = useConversations();
  const inspector = useInspector();

  const streaming = useStreaming({
    model: settings.model,
    vendor: settings.vendor,
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    endpoint: settings.endpoint,
    messages: conversations.messages,
    conversations: conversations.conversations,
    activeConvIdRef: conversations.activeConvIdRef,
    setMessages: conversations.setMessages,
    setConversations: conversations.setConversations,
    setActiveConvId: conversations.setActiveConvId,
    setSelectedMessageId: inspector.setSelectedMessageId,
  });

  const onNewConversation = useCallback(() => {
    conversations.handleNewConversation();
    streaming.clearStream();
    inspector.setSelectedMessageId(null);
  }, [conversations.handleNewConversation, streaming.clearStream, inspector.setSelectedMessageId]);

  const onSelectConversation = useCallback(
    async (id: string) => {
      await conversations.handleSelectConversation(id);
      inspector.setSelectedMessageId(null);
    },
    [conversations.handleSelectConversation, inspector.setSelectedMessageId],
  );

  const onDeleteConversation = useCallback(
    async (id: string) => {
      const wasActive = conversations.activeConvId === id;
      await conversations.handleDeleteConversation(id);
      if (wasActive) inspector.setSelectedMessageId(null);
    },
    [
      conversations.activeConvId,
      conversations.handleDeleteConversation,
      inspector.setSelectedMessageId,
    ],
  );

  return {
    ...settings,

    conversations: conversations.conversations,
    activeConvId: conversations.activeConvId,
    isDbReady: conversations.isDbReady,
    onNewConversation,
    onSelectConversation,
    onDeleteConversation,

    messages: conversations.messages,
    isStreaming: streaming.isStreaming,
    streamingContent: streaming.streamingContent,
    streamError: streaming.streamError,
    onSendMessage: streaming.handleSendMessage,
    onDismissError: streaming.dismissError,

    selectedMessageId: inspector.selectedMessageId,
    inspectorTab: inspector.inspectorTab,
    onSelectMessage: inspector.setSelectedMessageId,
    onInspectorTabChange: inspector.setInspectorTab,
  } as const;
};

export type StudioContext = ReturnType<typeof useStudio>;
