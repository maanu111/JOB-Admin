"use client";

import { useState } from "react";
import { Avatar } from "./Avatar";
import { UserPost } from "./types";
import { formatDate } from "./utils";
import { PostModal } from "./PostModal";

interface JobPostTabProps {
  userPosts: UserPost[];
  onDeletePost: (postId: string) => Promise<void>;
  showToast?: (message: string, type?: "success" | "error" | "loading", duration?: number) => number;
  dismissToast?: (id: number) => void;
}

export const JobPostTab = ({ userPosts, onDeletePost, showToast, dismissToast }: JobPostTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<UserPost | null>(null);

  const q = searchQuery.toLowerCase();
  const filteredPosts = userPosts.filter(post => 
    q === "" || 
    post.job_title?.toLowerCase().includes(q) || 
    post.user_name?.toLowerCase().includes(q) ||
    post.location?.toLowerCase().includes(q) ||
    post.job_type?.toLowerCase().includes(q)
  );

  const activeCount = userPosts.filter(p => p.status === 'active').length;
  const closedCount = userPosts.filter(p => p.status === 'closed').length;

  return (
    <div>
      {/* Header with Search */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '16px' 
      }}>
        {/* Stats for mobile */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '8px'
        }}>
          <div className="stat-card" style={{ padding: '10px' }}>
            <div className="stat-lbl">Total</div>
            <div className="stat-val" style={{ fontSize: '18px' }}>{userPosts.length}</div>
          </div>
          <div className="stat-card" style={{ padding: '10px' }}>
            <div className="stat-lbl">Active</div>
            <div className="stat-val" style={{ fontSize: '18px', color: '#4CAF50' }}>{activeCount}</div>
          </div>
          <div className="stat-card" style={{ padding: '10px' }}>
            <div className="stat-lbl">Closed</div>
            <div className="stat-val" style={{ fontSize: '18px', color: '#FF5252' }}>{closedCount}</div>
          </div>
        </div>

        {/* Search */}
        <div className="srch">
          <span className="srch-ico">🔍</span>
          <input 
            className="srch-inp" 
            placeholder="Search posts..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {/* Posts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filteredPosts.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <span style={{ fontSize: 30 }}>📄</span>
            <span className="empty-text">No job posts found</span>
          </div>
        ) : (
          filteredPosts.map(post => (
            <div 
              key={post.id} 
              className="post-card" 
              onClick={() => setSelectedPost(post)}
            >
              <div className="post-header">
                <div className="post-user">
                  <Avatar name={post.user_name || null} src={null} size={28} />
                  <div>
                    <div className="post-user-info">{post.user_name}</div>
                    <div className="post-user-email">{post.user_email}</div>
                  </div>
                </div>
                <span className={`post-status status-${post.status}`}>
                  {post.status}
                </span>
              </div>
              
              <div className="post-title">{post.job_title}</div>
              
              <div className="post-details">
                <span className="post-detail">📍 {post.location}</span>
                <span className="post-detail">💰 {post.salary}</span>
                <span className="post-detail">💼 {post.job_type}</span>
              </div>
              
              <div className="post-footer">
                <span>Posted: {formatDate(post.created_at)}</span>
                <span>Apply by: {formatDate(post.last_apply_date)}</span>
                <span className="post-openings">
                  {post.number_of_openings} {post.number_of_openings === 1 ? 'opening' : 'openings'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post Modal */}
      {selectedPost && (
        <PostModal 
          post={selectedPost} 
          onClose={() => setSelectedPost(null)} 
          onDelete={onDeletePost}
          showToast={showToast}
          dismissToast={dismissToast}
        />
      )}
    </div>
  );
};