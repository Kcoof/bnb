"use client";

import { Icon } from "@/components/Icon";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn btn-primary btn-sm">
      <Icon name="printer" size={14} />
      Print card
    </button>
  );
}
