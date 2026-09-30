import { useCallback, useEffect, useRef, useState } from "react";
import { deleteConversation, getAllConversations, getMessages, getNativeDB } from "@/lib/db";
import type { Conversation, Message } from "@/lib/db";

export type UseConversationsReturn = {
  readonly conversations: readonly Conversation[];
  readonly activeConvId: string | null;
  readonly messages: readonly Message[];
  readonly isDbReady: boolean;
  readonly activeConvIdRef: React.RefObject<string | null>;
  readonly setMessages: React.Dispatch<React.SetStateAction<readonly Message[]>>;
  readonly setConversations: React.Dispatch<React.SetStateAction<readonly Conversation[]>>;
  readonly setActiveConvId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly handleNewConversation: () => void;
  readonly handleSelectConversation: (id: string) => Promise<void>;
  readonly handleDeleteConversation: (id: string) => Promise<void>;
};

export const useConversations = (): UseConversationsReturn => {
  const [conversations, setConversations] = useState<readonly Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<readonly Message[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);
  const activeConvIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  useEffect(() => {
    getNativeDB()
      .then(async () => {
        setIsDbReady(true);
        setConversations(await getAllConversations());
      })
      .catch(console.error);
  }, []);

  const handleNewConversation = useCallback(() => {
    setActiveConvId(null);
    setMessages([]);
  }, []);

  const handleSelectConversation = useCallback(async (id: string) => {
    setActiveConvId(id);
    try {
      setMessages(await getMessages(id));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        setConversations(await getAllConversations());
        if (activeConvId === id) {
          setActiveConvId(null);
          setMessages([]);
        }
      } catch (e) {
        console.error(e);
      }
    },
    [activeConvId],
  );

  return {
    conversations,
    activeConvId,
    messages,
    isDbReady,
    activeConvIdRef,
    setMessages,
    setConversations,
    setActiveConvId,
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation,
  };
};
