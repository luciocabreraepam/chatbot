export const extractCode = (node: React.ReactNode): string => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map((c) => (typeof c === "string" ? c : "")).join("");
  return "";
};
