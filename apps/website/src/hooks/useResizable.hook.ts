import { useState } from "react";

type UseResizableArgs = {
  readonly initial: number;
  readonly min: number;
  readonly max: number;
  readonly direction: "right" | "left";
};

type UseResizableReturn = {
  readonly width: number;
  readonly isDragging: boolean;
  readonly handleResizeStart: (e: React.MouseEvent) => void;
};

export const useResizable = ({
  initial,
  min,
  max,
  direction,
}: UseResizableArgs): UseResizableReturn => {
  const [width, setWidth] = useState(initial);
  const [isDragging, setIsDragging] = useState(false);

  const handleResizeStart = (e: React.MouseEvent): void => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    setIsDragging(true);

    const onMove = (event: MouseEvent): void => {
      const delta = direction === "right" ? event.clientX - startX : startX - event.clientX;
      setWidth(Math.max(min, Math.min(max, startWidth + delta)));
    };

    const onUp = (): void => {
      setIsDragging(false);
      globalThis.removeEventListener("mousemove", onMove);
      globalThis.removeEventListener("mouseup", onUp);
    };

    globalThis.addEventListener("mousemove", onMove);
    globalThis.addEventListener("mouseup", onUp);
  };

  return { width, isDragging, handleResizeStart };
};
