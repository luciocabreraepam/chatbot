import { useState } from "react";

type InspectorTab = "request" | "response" | "http" | "metrics";

export type UseInspectorReturn = {
  readonly selectedMessageId: string | null;
  readonly inspectorTab: InspectorTab;
  readonly setSelectedMessageId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly setInspectorTab: React.Dispatch<React.SetStateAction<InspectorTab>>;
};

export const useInspector = (): UseInspectorReturn => {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("request");

  return { selectedMessageId, inspectorTab, setSelectedMessageId, setInspectorTab };
};
