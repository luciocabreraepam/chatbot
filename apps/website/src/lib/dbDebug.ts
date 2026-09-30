import { getMessages, getNativeDB } from "@/lib/db";
import type { Message } from "@/lib/db";

/**
 * Debug utility to verify IndexedDB persistence
 * Usage in browser console: queryAndLogMessages("conversation_id")
 */
export const queryAndLogMessages = async (conversationId: string): Promise<void> => {
  try {
    const messages = await getMessages(conversationId);
    console.group(`📊 Messages for conversation: ${conversationId}`);
    messages.forEach((msg, idx) => {
      console.group(`Message ${idx + 1} - ${msg.role.toUpperCase()}`);
      console.log("ID:", msg.id);
      console.log("Timestamp:", new Date(msg.timestamp).toISOString());
      console.log("Content length:", msg.content.length, "chars");

      if (msg.requestPayload) {
        console.group("Request Payload");
        try {
          const parsed = JSON.parse(msg.requestPayload);
          console.table(parsed);
        } catch {
          console.log(msg.requestPayload);
        }
        console.groupEnd();
      }

      if (msg.rawResponse) {
        console.group("Raw Response");
        try {
          const chunks = JSON.parse(msg.rawResponse) as string[];
          console.log(`${chunks.length} chunks received`);
          console.log("First chunk:", chunks[0]);
          console.log("Last chunk:", chunks[chunks.length - 1]);
        } catch {
          console.log(msg.rawResponse);
        }
        console.groupEnd();
      }

      if (msg.httpMetadata) {
        console.group("HTTP Metadata");
        console.log("Status:", msg.httpMetadata.status, msg.httpMetadata.statusText);
        console.log("Response time:", msg.httpMetadata.responseTime, "ms");
        if (msg.httpMetadata.headers) {
          console.group("Headers");
          msg.httpMetadata.headers.forEach((h) => {
            console.log(`${h.name}: ${h.value}`);
          });
          console.groupEnd();
        }
        console.groupEnd();
      }

      if (msg.metrics) {
        console.group("Metrics");
        console.log("TTFT:", msg.metrics.ttft, "ms");
        console.log("Tokens generated:", msg.metrics.tokensGenerated);
        console.log("Tokens/sec:", msg.metrics.tokensPerSecond.toFixed(2));
        console.log("Total duration:", msg.metrics.totalDuration, "ms");
        if (msg.metrics.latencyBreakdown) {
          console.log("Network latency:", msg.metrics.latencyBreakdown.networkLatency, "ms");
          console.log("Processing time:", msg.metrics.latencyBreakdown.processingTime, "ms");
        }
        console.groupEnd();
      }

      console.groupEnd();
    });
    console.groupEnd();
  } catch (e) {
    console.error("Error querying messages:", e);
  }
};

/**
 * Get all messages from a conversation as a structured export
 * Useful for analysis or export
 */
export const exportConversationData = async (
  conversationId: string,
): Promise<readonly Message[]> => {
  return getMessages(conversationId);
};

/**
 * Get storage stats
 */
export const getStorageStats = async (): Promise<{
  readonly messageCount: number;
  readonly totalSize: number;
  readonly avgMessageSize: number;
}> => {
  try {
    const db = await getNativeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("messages", "readonly");
      const store = transaction.objectStore("messages");
      const request = store.getAll();

      request.onsuccess = () => {
        const messages = request.result as Message[];
        const totalSize = JSON.stringify(messages).length;
        resolve({
          messageCount: messages.length,
          totalSize,
          avgMessageSize: messages.length > 0 ? totalSize / messages.length : 0,
        });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Error getting storage stats:", e);
    throw e;
  }
};

// Auto-expose on window for easy console access
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).debugDB = {
    queryAndLogMessages,
    exportConversationData,
    getStorageStats,
  };
  console.log("✅ Debug DB utilities available at window.debugDB");
}
