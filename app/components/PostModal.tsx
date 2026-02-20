"use client";

import { useState } from "react";
import { Avatar } from "./Avatar";
import { formatDate, formatDateTime } from "./utils";
import { UserPost } from "./types";

interface PostModalProps {
  post: UserPost;
  onClose: () => void;
  onDelete: (postId: string) => Promise<void>;
  showToast?: (message: string, type?: "success" | "error" | "loading", duration?: number) => number;
  dismissToast?: (id: number) => void;
}

export const PostModal = ({ post, onClose, onDelete, showToast, dismissToast }: PostModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    
    let toastId: number | undefined;
    
    try {
      if (showToast) {
        toastId = showToast("Deleting post...", "loading");
      }
      
      setIsDeleting(true);
      await onDelete(post.id);
      
      if (showToast && toastId) {
        if (dismissToast) dismissToast(toastId);
        showToast("Post deleted successfully", "success", 2000);
      }
      
      onClose();
    } catch (error: any) {
      console.error("Delete error in modal:", error);
      if (showToast && toastId) {
        if (dismissToast) dismissToast(toastId);
        showToast(error.message || "Failed to delete post", "error", 2000);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
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
        maxHeight: "90vh", 
        overflowY: "auto", 
        boxShadow: "0 28px 70px rgba(0,0,0,0.35)" 
      }}>
        <div style={{ 
          padding: "13px 16px", 
          borderBottom: "1px solid #F0F0F0", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          position: "sticky", 
          top: 0, 
          background: "#fff", 
          zIndex: 10 
        }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#111" }}>Post Details</span>
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
        
        <div style={{ padding: "16px" }}>
          <div style={{ 
            display: "flex", 
            flexDirection: 'column',
            gap: 12, 
            marginBottom: 20, 
            padding: 12, 
            background: "#F5F5F5", 
            borderRadius: 10 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={post.user_name || null} src={null} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>{post.user_name}</div>
                <div style={{ fontSize: 12, color: "#777", overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {post.user_email}
                </div>
              </div>
            </div>
            <div>
              <span style={{ 
                background: post.status === 'active' ? '#4CAF50' : post.status === 'closed' ? '#FF5252' : '#FF9800', 
                color: '#fff', 
                padding: '4px 12px', 
                borderRadius: 20, 
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'capitalize',
                display: 'inline-block'
              }}>
                {post.status}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 8 }}>{post.job_title}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#777", display: "flex", alignItems: "center", gap: 4 }}>📍 {post.location}</span>
              <span style={{ fontSize: 12, color: "#777", display: "flex", alignItems: "center", gap: 4 }}>💰 {post.salary}</span>
              <span style={{ fontSize: 12, color: "#777", display: "flex", alignItems: "center", gap: 4 }}>💼 {post.job_type}</span>
              <span style={{ fontSize: 12, color: "#777", display: "flex", alignItems: "center", gap: 4 }}>📅 {formatDate(post.last_apply_date)}</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 8 }}>Description</div>
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6, wordBreak: 'break-word' }}>{post.job_description}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 8 }}>Required Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {post.required_skills.split(',').map((skill, index) => (
                <span key={index} style={{ background: "#E8F5E9", color: "#2E7D32", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>
                  {skill.trim()}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 8 }}>Additional Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><div style={{ fontSize: 11, color: "#999" }}>Experience</div><div style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>{post.experience}</div></div>
              <div><div style={{ fontSize: 11, color: "#999" }}>Openings</div><div style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>{post.number_of_openings}</div></div>
              <div><div style={{ fontSize: 11, color: "#999" }}>Category</div><div style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>{post.job_category}</div></div>
              <div><div style={{ fontSize: 11, color: "#999" }}>Posted</div><div style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>{formatDateTime(post.created_at)}</div></div>
            </div>
          </div>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              width: '100%',
              padding: '12px',
              background: isDeleting ? '#F5F5F5' : '#fff',
              border: isDeleting ? '1.5px solid #E0E0E0' : '1.5px solid #FF5252',
              borderRadius: 8,
              color: isDeleting ? '#999' : '#FF5252',
              fontSize: 14,
              fontWeight: 600,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 16,
              transition: 'all 0.2s'
            }}
          >
            {isDeleting ? (
              <>
                <div className="btn-spin" style={{ width: 14, height: 14, border: '2px solid #E0E0E0', borderTopColor: '#999', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} />
                Deleting...
              </>
            ) : (
              <>
                <span>🗑️</span> Delete Post
              </>
            )}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};