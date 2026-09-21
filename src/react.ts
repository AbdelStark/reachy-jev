/** SSR-safe optional React wrapper. The custom element is registered only on the client. */
import { createElement, useEffect, useRef, type CSSProperties } from "react";
import type { JevPanelElement, PanelFrame } from "./panel.js";

export interface JevPanelProps {
  frame: PanelFrame;
  className?: string;
  style?: CSSProperties;
  onError?: (error: Error) => void;
}

export function JevPanel({ frame, className, style, onError }: JevPanelProps) {
  const ref = useRef<JevPanelElement>(null);
  useEffect(() => {
    let active = true;
    void import("./panel.js").then(() => {
      if (active) ref.current?.update(frame);
    }).catch((error: unknown) => {
      if (active) onError?.(error instanceof Error ? error : new Error("Jev panel unavailable"));
    });
    return () => { active = false; };
  }, [frame, onError]);
  return createElement("jev-panel", { ref, className, style });
}
