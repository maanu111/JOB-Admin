"use client";

import { useState } from "react";

export const Avatar = ({ name, src, size = 32 }: { name: string | null; src: string | null; size?: number }) => {
  const [imgError, setImgError] = useState(false);
  const initials = (name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  
  if (src && !imgError) {
    return <img src={src} alt={name ?? "User"} width={size} height={size} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1.5px solid #E5E5E5", flexShrink: 0 }} onError={() => setImgError(true)} />;
  }
  
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {initials}
    </div>
  );
};