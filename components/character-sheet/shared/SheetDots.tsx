"use client";

import React from "react";

interface SheetDotsProps {
  value: number;
  max: number;
  pendingValue?: number;
}

export function SheetDots({ value, max, pendingValue }: SheetDotsProps) {
  const result = [];
  const v = Number.isFinite(value) ? value : 0;
  const pendingV =
    pendingValue !== undefined && Number.isFinite(pendingValue)
      ? pendingValue
      : v;

  for (let i = 1; i <= max; i += 1) {
    const filled = i <= v;
    const isPending = i > v && i <= pendingV;
    const isFilledOrPending = filled || isPending;
    result.push(
      <span
        key={i}
        className={`dot ${isFilledOrPending ? "dotFilled" : "dotEmpty"}`}
        style={
          isPending
            ? { backgroundColor: "#ff8c00", borderColor: "#ff8c00" }
            : undefined
        }
      />,
    );
  }

  return <div className="dots">{result}</div>;
}

export default SheetDots;
