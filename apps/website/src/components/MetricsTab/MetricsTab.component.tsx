import * as stylex from "@stylexjs/stylex";
import { MetricRow } from "@/components/MetricRow";
import type { MetricsTabProps } from "./MetricsTab.types";
import { styles } from "./MetricsTab.stylex";

export const MetricsTab = ({ metrics }: MetricsTabProps) => (
  <div {...stylex.props(styles.tabContent)}>
    <div {...stylex.props(styles.metricsGrid)}>
      <MetricRow label="Time to First Token" value={metrics.ttft.toString()} unit="ms" highlight />
      <MetricRow label="Input Tokens" value={(metrics.inputTokens ?? 0).toString()} highlight />
      <MetricRow label="Tokens Generated" value={metrics.tokensGenerated.toString()} highlight />
      <MetricRow label="Total Tokens" value={(metrics.totalTokens ?? 0).toString()} highlight />
      <MetricRow
        label="Tokens per Second"
        value={metrics.tokensPerSecond.toFixed(2)}
        unit="tok/s"
        highlight
      />
      <MetricRow
        label="Total Duration"
        value={(metrics.totalDuration / 1000).toFixed(2)}
        unit="s"
      />
      {metrics.latencyBreakdown && (
        <>
          <MetricRow
            label="Network Latency"
            value={metrics.latencyBreakdown.networkLatency.toString()}
            unit="ms"
          />
          <MetricRow
            label="Processing Time"
            value={metrics.latencyBreakdown.processingTime.toString()}
            unit="ms"
          />
        </>
      )}
    </div>

    <div {...stylex.props(styles.metricsChart)}>
      <div {...stylex.props(styles.chartLabel)}>TTFT proportion</div>
      <div {...stylex.props(styles.progressBar)}>
        <div
          {...stylex.props(styles.progressFill)}
          style={{
            width: `${Math.min((metrics.ttft / metrics.totalDuration) * 100, 100).toFixed(1)}%`,
          }}
        />
      </div>
      <div {...stylex.props(styles.chartAnnotation)}>
        <span>{metrics.ttft}ms</span>
        <span>{metrics.totalDuration}ms total</span>
      </div>
    </div>
  </div>
);
