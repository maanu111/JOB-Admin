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

  return (
    <div>
      {/* Search and Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 0, width: '60%', gap: '8px' }}>
          <div className="sc" style={{ padding: '10px 12px' }}>
            <div className="sc-lbl">Total Posts</div>
            <div className="sc-val" style={{ fontSize: 18 }}>{userPosts.length}</div>
          </div>
          <div className="sc" style={{ padding: '10px 12px' }}>
            <div className="sc-lbl">Active Posts</div>
            <div className="sc-val" style={{ fontSize: 18 }}>{userPosts.filter(p => p.status === 'active').length}</div>
          </div>
          <div className="sc" style={{ padding: '10px 12px' }}>
            <div className="sc-lbl">Closed Posts</div>
            <div className="sc-val" style={{ fontSize: 18 }}>{userPosts.filter(p => p.status === 'closed').length}</div>
          </div>
        </div>
        
        <div className="srch">
          <span className="srch-ico">🔍</span>
          <input 
            className="srch-inp" 
            placeholder="Search posts..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            style={{ width: 260 }}
          />
        </div>
      </div>

      {/* Posts List - Compact View */}
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
              style={{ 
                padding: '12px 16px',
                cursor: 'pointer',
                transition: 'all 0.12s'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar name={post.user_name || null} src={null} size={24} />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{post.user_name}</span>
                    <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>{post.user_email}</span>
                  </div>
                </div>
                <span style={{
                  background: post.status === 'active' ? '#E8F5E9' : post.status === 'closed' ? '#FFEBEE' : '#FFF3E0',
                  color: post.status === 'active' ? '#2E7D32' : post.status === 'closed' ? '#C62828' : '#EF6C00',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'capitalize'
                }}>
                  {post.status}
                </span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>{post.job_title}</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#777' }}>📍 {post.location}</span>
                  <span style={{ fontSize: '11px', color: '#777' }}>💰 {post.salary}</span>
                  <span style={{ fontSize: '11px', color: '#777' }}>💼 {post.job_type}</span>
                </div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginTop: '6px',
                fontSize: '10px',
                color: '#999',
                borderTop: '1px solid #F0F0F0',
                paddingTop: '6px'
              }}>
                <span>Posted: {formatDate(post.created_at)}</span>
                <span>Last Apply: {formatDate(post.last_apply_date)}</span>
                <span className="post-openings" style={{ fontWeight: 600, color: '#111' }}>
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