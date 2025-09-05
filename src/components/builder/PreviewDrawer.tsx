"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import PreviewPane from "./PreviewPane";

export default function PreviewDrawer({
  open,
  width,
  onToggle,
  onResize,
  compiled,
}: {
  open: boolean;
  width: number; // in px
  onToggle: () => void;
  onResize: (w: number) => void;
  compiled: { schema: any; uiSchema: any };
}) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const minW = 300;
  const maxW = 640;
  const w = Math.min(Math.max(width, minW), maxW);

  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(w);

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = w;
    window.addEventListener("mousemove", onMouseMove as any);
    window.addEventListener("mouseup", onMouseUp as any);
    e.preventDefault();
  }
  function onMouseMove(e: MouseEvent) {
    if (!dragging.current) return;
    const dx = startX.current - e.clientX; // handle on left edge
    const next = Math.min(Math.max(startW.current + dx, minW), maxW);
    onResize(next);
  }
  function onMouseUp() {
    dragging.current = false;
    window.removeEventListener("mousemove", onMouseMove as any);
    window.removeEventListener("mouseup", onMouseUp as any);
  }

  if (!open) return null;

  if (isMobile) {
    // Full-screen overlay on mobile
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex drawer-overlay">
        <div className="bg-white ml-auto w-full h-full max-w-full p-3 overflow-auto drawer-panel">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Live Preview</div>
            <button className="btn btn-xs" onClick={onToggle}>Close</button>
          </div>
          <PreviewPane compiled={compiled} />
        </div>
      </div>
    );
  }

  // Desktop: right-docked drawer with resizer
  return (
    <div className="fixed top-[72px] right-0 bottom-0 z-40 flex drawer-overlay">
      <div
        className="h-full bg-white border-l shadow-lg overflow-auto drawer-panel"
        style={{ width: w }}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold">Live Preview</div>
          <button className="btn btn-xs" onClick={onToggle}>Hide</button>
        </div>
        <div className="p-3">
          <PreviewPane compiled={compiled} />
        </div>
      </div>
      <div
        className="w-2 cursor-col-resize bg-transparent hover:bg-blue-200"
        onMouseDown={onMouseDown}
        title="Drag to resize"
      />
    </div>
  );
}
