"use client";

import React from "react";

export default function Modal({
  onClose,
  children,
  contentClassName = "",
  overlayClassName = "",
  closeOnOverlay = true,
  ariaLabel = "Dialog",
}: {
  onClose: () => void;
  children: React.ReactNode;
  contentClassName?: string;
  overlayClassName?: string;
  closeOnOverlay?: boolean;
  ariaLabel?: string;
}) {
  const [closing, setClosing] = React.useState(false);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);

  function requestClose() {
    setClosing(true);
    window.setTimeout(() => onClose(), 180); // match transition duration
  }

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity duration-150 ${closing ? "opacity-0" : "opacity-100"} ${overlayClassName}`}
      onMouseDown={(e) => {
        if (!closeOnOverlay) return;
        // only close when clicking on the overlay, not on the content
        if (e.target === overlayRef.current) requestClose();
      }}
      role="dialog"
      aria-label={ariaLabel}
      aria-modal="true"
    >
      <div className="modal-shell">
        <div
          className={`bg-white bg-clip-padding rounded-xl overflow-hidden transition-opacity duration-150 ${closing ? "opacity-0" : "opacity-100"} ${contentClassName}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

