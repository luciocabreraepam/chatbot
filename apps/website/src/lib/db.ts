export type Conversation = {
  readonly id: string;
  readonly title: string;
  readonly vendor: string;
  readonly model: string;
  readonly updatedAt: number;
};

export type MessageRequestMetadata = {
  readonly endpoint: string;
  readonly headers?: readonly { readonly name: string; readonly value: string }[];
  readonly host?: string;
  readonly method: string;
};

export type MessageHttpMetadata = {
  readonly status: number;
  readonly statusText: string;
  readonly responseTime: number;
  readonly headers?: readonly { readonly name: string; readonly value: string }[];
};

export type MessageExecutionMetrics = {
  readonly ttft: number;
  readonly inputTokens?: number;
  readonly tokensGenerated: number;
  readonly totalTokens?: number;
  readonly tokensPerSecond: number;
  readonly totalDuration: number;
  readonly latencyBreakdown?: {
    readonly networkLatency: number;
    readonly processingTime: number;
  };
};

/** @deprecated Use MessageExecutionMetrics instead */
export type MessageMetrics = MessageExecutionMetrics;

export type Message = {
  readonly id: string;
  readonly conversationId: string;
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly timestamp: number;
  readonly requestPayload?: string;
  readonly requestMetadata?: MessageRequestMetadata;
  readonly rawResponse?: string;
  readonly httpMetadata?: MessageHttpMetadata;
  readonly metrics?: MessageExecutionMetrics;
};

const DB_NAME = "LocalOmniStudioDB";
const DB_VERSION = 2;

export const getNativeDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("IndexedDB cannot be accessed on the server tier."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("conversations")) {
        db.createObjectStore("conversations", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("messages")) {
        const messageStore = db.createObjectStore("messages", { keyPath: "id" });
        messageStore.createIndex("conversationId", "conversationId", { unique: false });
      }
    };
  });
};

export const saveConversation = async (conversation: Conversation): Promise<void> => {
  const db = await getNativeDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("conversations", "readwrite");
    const store = transaction.objectStore("conversations");
    const request = store.put(conversation);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllConversations = async (): Promise<readonly Conversation[]> => {
  const db = await getNativeDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("conversations", "readonly");
    const store = transaction.objectStore("conversations");
    const request = store.getAll();
    request.onsuccess = () => {
      const sorted = [...(request.result as Conversation[])].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      );
      resolve(sorted);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteConversation = async (id: string): Promise<void> => {
  const db = await getNativeDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["conversations", "messages"], "readwrite");
    const convStore = transaction.objectStore("conversations");
    const msgStore = transaction.objectStore("messages");
    const msgIndex = msgStore.index("conversationId");

    convStore.delete(id);

    const msgCursorReq = msgIndex.openCursor(IDBKeyRange.only(id));
    msgCursorReq.onsuccess = () => {
      const cursor = msgCursorReq.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const saveMessage = async (message: Message): Promise<void> => {
  const db = await getNativeDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("messages", "readwrite");
    const store = transaction.objectStore("messages");
    const request = store.put(message);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getMessages = async (conversationId: string): Promise<readonly Message[]> => {
  const db = await getNativeDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("messages", "readonly");
    const store = transaction.objectStore("messages");
    const index = store.index("conversationId");
    const request = index.getAll(IDBKeyRange.only(conversationId));
    request.onsuccess = () => {
      const sorted = [...(request.result as Message[])].sort((a, b) => a.timestamp - b.timestamp);
      resolve(sorted);
    };
    request.onerror = () => reject(request.error);
  });
};
