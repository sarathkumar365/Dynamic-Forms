"use client";
import React, { useMemo, useRef } from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

export default function LineNumberedTextarea({ value, onChange, className = "", ...rest }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  const lines = useMemo(() => {
    const count = Math.max(1, (value?.split("\n").length ?? 1));
    // Create an array of line numbers as strings once per value change
    return Array.from({ length: count }, (_, i) => String(i + 1));
  }, [value]);
  const digitCount = useMemo(() => String(lines.length).length, [lines.length]);
  // Width in ch units + a little padding for comfort
  const gutterCh = Math.max(2, digitCount) + 2; // e.g., 2 digits -> 4ch

  function handleScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg border focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${className}`}
    >
      {/* Gutter */}
      <div
        ref={gutterRef}
        className="absolute left-0 top-0 bottom-0 select-none bg-gray-50 border-r overflow-y-auto overflow-x-hidden text-right text-gray-500"
        style={{ width: `${gutterCh}ch` }}
        aria-hidden
      >
        <div className="py-2 pr-2 font-mono text-xs leading-5">
          {lines.map((n) => (
            <div key={n} className="leading-5">
              {n}
            </div>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onScroll={handleScroll}
        className="block w-full h-full pl-2 m-2 font-mono text-xs leading-5 outline-none bg-white"
        style={{ paddingLeft: `calc(${gutterCh}ch + 0.5rem)` }}
        {...rest}
      />
    </div>
  );
}
