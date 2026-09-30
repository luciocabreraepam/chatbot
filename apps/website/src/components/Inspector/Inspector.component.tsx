import * as stylex from "@stylexjs/stylex";
import { HttpMetadataTab } from "@/components/HttpMetadataTab";
import { JsonViewer } from "@/components/JsonViewer";
import { MetricRow } from "@/components/MetricRow";
import { MetricsTab } from "@/components/MetricsTab";
import { buildCurlCommand } from "@/lib/curlBuilder.util";
import type { InspectorProps, InspectorTab } from "./Inspector.types";
import { styles } from "./Inspector.stylex";

type NormalizedEvent = {
  readonly eventType: string;
  readonly display: string;
};

const resolveEventType = (evt: unknown): string => {
  if (evt === null || evt === undefined) return "unknown";
  if (typeof evt !== "object") return "unknown";
  const rec = evt as Record<string, unknown>;
  if (typeof rec.event === "string" && rec.event) return rec.event;
  if (typeof rec.data === "object" && rec.data !== null) {
    const data = rec.data as Record<string, unknown>;
    if (typeof data.type === "string") return data.type;
  }
  return "event";
};

const parseRawResponse = (raw: string | undefined): readonly NormalizedEvent[] => {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [{ eventType: "raw", display: raw }];
  }

  // New format: SseRawEvent[]
  if (Array.isArray(parsed)) {
    return parsed.flatMap((item: unknown, idx): readonly NormalizedEvent[] => {
      if (item === null || item === undefined) return [];

      // Legacy format: string[]
      if (typeof item === "string") {
        const dataStr = item.startsWith("data: ") ? item.slice(6) : item;
        let data: unknown = dataStr;
        try {
          data = JSON.parse(dataStr);
        } catch {
          /* keep as string */
        }
        return [
          {
            eventType:
              data !== null &&
              typeof data === "object" &&
              "type" in (data as Record<string, unknown>)
                ? String((data as Record<string, unknown>).type)
                : `chunk-${idx}`,
            display: typeof data === "string" ? data : JSON.stringify(data, null, 2),
          },
        ];
      }

      // New SseRawEvent object
      return [
        {
          eventType: resolveEventType(item),
          display: JSON.stringify((item as Record<string, unknown>).data ?? item, null, 2),
        },
      ];
    });
  }

  // Non-array: plain object or primitive (non-streaming response body)
  return [
    {
      eventType: typeof parsed === "object" && parsed !== null ? "response" : "raw",
      display: JSON.stringify(parsed, null, 2),
    },
  ];
};

export const Inspector = ({
  selectedMessage,
  activeTab,
  customStylex,
  isCollapsed,
  onTabChange,
  onToggleCollapse,
}: InspectorProps) => {
  const tabs: readonly { readonly id: InspectorTab; readonly label: string }[] = [
    { id: "request", label: "Request" },
    { id: "response", label: "Response" },
    { id: "http", label: "HTTP" },
    { id: "metrics", label: "Metrics" },
  ];

  const renderTabContent = () => {
    if (!selectedMessage) return null;

    if (activeTab === "request") {
      const { requestMetadata, requestPayload } = selectedMessage;
      const handleCopyCurl = () => {
        if (!requestMetadata) return;
        void navigator.clipboard.writeText(
          buildCurlCommand({ metadata: requestMetadata, requestPayload }),
        );
      };

      return (
        <div {...stylex.props(styles.tabContent)}>
          {requestMetadata && (
            <div {...stylex.props(styles.metricsGrid)}>
              <MetricRow label="Endpoint" value={requestMetadata.endpoint} />
              {requestMetadata.host && <MetricRow label="Host" value={requestMetadata.host} />}
              <MetricRow label="Method" value={requestMetadata.method} highlight />
            </div>
          )}
          {requestPayload ? (
            <JsonViewer content={requestPayload} label="Request Body" />
          ) : (
            <div {...stylex.props(styles.empty)}>No request payload captured</div>
          )}
          {requestMetadata && (
            <div {...stylex.props(styles.actionRow)}>
              <button {...stylex.props(styles.curlBtn)} type="button" onClick={handleCopyCurl}>
                Copy as cURL
              </button>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "response") {
      const events = parseRawResponse(selectedMessage.rawResponse);

      if (events.length === 0) {
        return (
          <div {...stylex.props(styles.tabContent)}>
            <div {...stylex.props(styles.empty)}>No response payload captured</div>
          </div>
        );
      }

      return (
        <div {...stylex.props(styles.sseEventList)}>
          {events.map((evt, idx) => {
            const isDelta = evt.eventType.includes("delta");
            return (
              <div key={`${evt.eventType}-${idx}`} {...stylex.props(styles.sseEvent)}>
                <div {...stylex.props(styles.sseEventHeader)}>
                  <span
                    {...stylex.props(styles.sseEventBadge, isDelta && styles.sseEventBadgeDelta)}
                  >
                    {evt.eventType}
                  </span>
                </div>
                <pre {...stylex.props(styles.sseEventData)}>{evt.display}</pre>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeTab === "http") {
      return <HttpMetadataTab httpMetadata={selectedMessage.httpMetadata} />;
    }

    if (activeTab === "metrics") {
      return selectedMessage.metrics ? (
        <MetricsTab metrics={selectedMessage.metrics} />
      ) : (
        <div {...stylex.props(styles.tabContent)}>
          <div {...stylex.props(styles.empty)}>No metrics captured for this message</div>
        </div>
      );
    }

    return null;
  };

  if (isCollapsed) {
    return (
      <aside {...stylex.props(styles.root, styles.rootCollapsed)}>
        <button
          {...stylex.props(styles.toggleBtn)}
          type="button"
          onClick={onToggleCollapse}
          title="Expand inspector"
        >
          ‹
        </button>
      </aside>
    );
  }

  return (
    <aside {...stylex.props(styles.root, customStylex)}>
      <div {...stylex.props(styles.header)}>
        <span {...stylex.props(styles.headerTitle)}>Inspector</span>
        <button
          {...stylex.props(styles.collapseBtn)}
          type="button"
          onClick={onToggleCollapse}
          title="Collapse inspector"
        >
          ›
        </button>
      </div>

      <div {...stylex.props(styles.tabs)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            {...stylex.props(styles.tab, activeTab === tab.id && styles.tabActive)}
            type="button"
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div {...stylex.props(styles.body)}>
        {!selectedMessage ? (
          <div {...stylex.props(styles.emptyState)}>
            <div {...stylex.props(styles.emptyIcon)}>⚙</div>
            <p {...stylex.props(styles.emptyTitle)}>No message selected</p>
            <p {...stylex.props(styles.emptySubtitle)}>
              Click an assistant response to inspect its request, raw output, and performance
              metrics.
            </p>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </aside>
  );
};
