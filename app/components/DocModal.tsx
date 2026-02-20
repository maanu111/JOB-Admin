"use client";

export const DocModal = ({ url, title, onClose }: { url: string; title: string; onClose: () => void }) => (
  <div onClick={onClose} style={{ 
    position: "fixed", 
    inset: 0, 
    background: "rgba(0,0,0,0.78)", 
    zIndex: 1000, 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    padding: 16 
  }}>
    <div onClick={(e) => e.stopPropagation()} style={{ 
      background: "#fff", 
      borderRadius: 12, 
      overflow: "hidden", 
      maxWidth: 680, 
      width: "100%", 
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: "0 28px 70px rgba(0,0,0,0.35)" 
    }}>
      <div style={{ 
        padding: "12px 16px", 
        borderBottom: "1px solid #F0F0F0", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "#111" }}>{title}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a href={url} target="_blank" rel="noreferrer" style={{ 
            fontSize: 11.5, 
            color: "#555", 
            textDecoration: "none", 
            border: "1px solid #E5E5E5", 
            padding: "4px 10px", 
            borderRadius: 6,
            whiteSpace: 'nowrap'
          }}>
            Open in tab ↗
          </a>
          <button onClick={onClose} style={{ 
            border: "none", 
            background: "#F5F5F5", 
            borderRadius: 6, 
            width: 32, 
            height: 32, 
            cursor: "pointer", 
            fontSize: 14, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "#555" 
          }}>✕</button>
        </div>
      </div>
      <div style={{ 
        padding: 16, 
        background: "#FAFAFA", 
        minHeight: 280,
        maxHeight: 'calc(90vh - 80px)',
        overflow: 'auto',
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <img src={url} alt={title} style={{ 
          width: "100%", 
          maxHeight: "70vh", 
          objectFit: "contain", 
          borderRadius: 8, 
          display: "block" 
        }} />
      </div>
    </div>
  </div>
);