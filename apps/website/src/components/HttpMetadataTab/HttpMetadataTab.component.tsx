import * as stylex from "@stylexjs/stylex";
import { MetricRow } from "@/components/MetricRow";
import type { HttpMetadataTabProps } from "./HttpMetadataTab.types";
import { styles } from "./HttpMetadataTab.stylex";

export const HttpMetadataTab = ({ httpMetadata }: HttpMetadataTabProps) => {
  if (!httpMetadata) {
    return (
      <div {...stylex.props(styles.tabContent)}>
        <div {...stylex.props(styles.empty)}>No HTTP metadata captured</div>
      </div>
    );
  }

  return (
    <div {...stylex.props(styles.tabContent)}>
      <div {...stylex.props(styles.metricsGrid)}>
        <MetricRow label="Status Code" value={httpMetadata.status.toString()} highlight />
        <MetricRow label="Status Text" value={httpMetadata.statusText} />
        <MetricRow label="Response Time" value={httpMetadata.responseTime.toString()} unit="ms" />
      </div>

      {httpMetadata.headers && httpMetadata.headers.length > 0 && (
        <div {...stylex.props(styles.headersSection)}>
          <div {...stylex.props(styles.sectionTitle)}>Response Headers</div>
          <div {...stylex.props(styles.headersList)}>
            {httpMetadata.headers.map((header) => (
              <div key={`${header.name}`} {...stylex.props(styles.headerRow)}>
                <span {...stylex.props(styles.headerName)}>{header.name}</span>
                <span {...stylex.props(styles.headerValue)}>{header.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
