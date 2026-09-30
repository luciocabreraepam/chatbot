import type { MessageRequestMetadata } from "@/lib/db";

type BuildCurlCommandArgs = {
  readonly metadata: MessageRequestMetadata;
  readonly requestPayload?: string;
};

const resolveUrl = (host: string | undefined, endpoint: string): string => {
  if (endpoint.startsWith("http")) return endpoint;
  // Strip Vite proxy prefix /api/<vendor>/... → host + /...
  const match = /^\/api\/[^/]+(.+)$/.exec(endpoint);
  const path = match?.[1] ?? endpoint;
  return host ? `${host}${path}` : endpoint;
};

export const buildCurlCommand = ({ metadata, requestPayload }: BuildCurlCommandArgs): string => {
  const url = resolveUrl(metadata.host, metadata.endpoint);
  const lines: string[] = [`curl -X ${metadata.method} \\`, `  "${url}"`];

  for (const { name, value } of metadata.headers ?? []) {
    lines.push(`  -H "${name}: ${value}"`);
  }

  if (requestPayload) {
    try {
      const minified = JSON.stringify(JSON.parse(requestPayload));
      lines.push(`  -d '${minified}'`);
    } catch {
      lines.push(`  -d '${requestPayload}'`);
    }
  }

  return lines.join(" \\\n");
};
