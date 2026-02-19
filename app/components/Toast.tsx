"use client";

import { useState } from "react";

export type ToastType = "success" | "error" | "loading";
export interface ToastItem { id: number; type: ToastType; message: string; }
let _toastId = 0;

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#1c0000" : t.type === "loading" ? "#111" : "#001c05",
          color: "#fff", padding: "11px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 9,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)", minWidth: 260, maxWidth: 380,
          border: `1px solid ${t.type === "error" ? "#ff222215" : t.type === "loading" ? "#33333360" : "#00dd3315"}`,
          animation: "toastIn 0.2s ease",
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "⟳"}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = (message: string, type: ToastType = "success", duration = 3000) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (type !== "loading") setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    return id;
  };
  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));
  return { toasts, show, dismiss };
}