"use client";

import { useState } from "react";
import { Avatar } from "./Avatar";
import { Profile, SignupLog } from "./types";
import { formatDateTime } from "./utils";
import { supabase } from "../../supabaseClient";

interface AdminPanelProps {
  profiles: Profile[];
  signupLogs: SignupLog[];
  currentUser: any;
  totalUsers: number;
  totalSeekers: number;
  totalProfiles: number;
  verifiedDocs: number;
  todaySignups: number;
  monthSignups: number;
  onViewUser: (user: Profile) => void;
  onViewSeeker: (seeker: any) => void;
  onRefresh: () => void;
}

export const AdminPanel = ({
  profiles,
  signupLogs,
  currentUser,
  totalUsers,
  totalSeekers,
  totalProfiles,
  verifiedDocs,
  todaySignups,
  monthSignups,
  onViewUser,
  onViewSeeker,
  onRefresh
}: AdminPanelProps) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleUserClick = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    if (profile) {
      onViewUser(profile);
    }
  };

  const handleApprove = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingId(userId);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "approved" })
        .eq("id", userId);

      if (error) throw error;
      
      alert("User approved successfully");
      onRefresh();
    } catch (error: any) {
      alert(error.message || "Failed to approve user");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingId(userId);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "rejected" })
        .eq("id", userId);

      if (error) throw error;
      
      alert("User rejected");
      onRefresh();
    } catch (error: any) {
      alert(error.message || "Failed to reject user");
    } finally {
      setProcessingId(null);
    }
  };

  // Separate users by status
  const pendingUsers = profiles.filter(p => p.status === 'pending');
  const approvedUsers = profiles.filter(p => p.status === 'approved');
  const rejectedUsers = profiles.filter(p => p.status === 'rejected');

  // Sort signup logs by date (newest first)
  const sortedSignupLogs = [...signupLogs].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div>
      {/* Stats Cards - Compact Row */}
      <div style={{ 
        display: 'flex', 
        gap: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{ 
          background: '#fff', 
          borderRadius: '10px', 
          padding: '10px 14px',
          border: '1px solid #F0F0F0',
          minWidth: '100px',
          flex: 1
        }}>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Total Users</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#111' }}>{totalUsers}</div>
        </div>
        <div style={{ 
          background: '#fff', 
          borderRadius: '10px', 
          padding: '10px 14px',
          border: '1px solid #F0F0F0',
          minWidth: '100px',
          flex: 1
        }}>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Pending</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#FF9800' }}>{pendingUsers.length}</div>
        </div>
        <div style={{ 
          background: '#fff', 
          borderRadius: '10px', 
          padding: '10px 14px',
          border: '1px solid #F0F0F0',
          minWidth: '100px',
          flex: 1
        }}>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Approved</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#4CAF50' }}>{approvedUsers.length}</div>
        </div>
        <div style={{ 
          background: '#fff', 
          borderRadius: '10px', 
          padding: '10px 14px',
          border: '1px solid #F0F0F0',
          minWidth: '100px',
          flex: 1
        }}>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Rejected</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#FF5252' }}>{rejectedUsers.length}</div>
        </div>
        <div style={{ 
          background: '#F8F8F8', 
          borderRadius: '10px', 
          padding: '10px 14px',
          minWidth: '100px',
          flex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <span style={{ fontSize: '12px' }}>📝</span>
            <span style={{ fontSize: '11px', color: '#666' }}>Today</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#111' }}>{todaySignups}</div>
        </div>
        <div style={{ 
          background: '#F8F8F8', 
          borderRadius: '10px', 
          padding: '10px 14px',
          minWidth: '100px',
          flex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <span style={{ fontSize: '12px' }}>📅</span>
            <span style={{ fontSize: '11px', color: '#666' }}>Month</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#111' }}>{monthSignups}</div>
        </div>
      </div>

      {/* Current Session Card - Minimal */}
      {/* <div style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '14px 18px',
        border: '1px solid #F0F0F0',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>🔐</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Current Session</span>
          </div>
          <span style={{ 
            fontSize: '10px', 
            color: '#4CAF50', 
            background: '#E8F5E9', 
            padding: '3px 8px', 
            borderRadius: '20px',
            fontWeight: 500
          }}>
            Active
          </span>
        </div>
        
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar name={currentUser.profile?.name || currentUser.user_metadata?.name} src={null} size={40} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>
                {currentUser.profile?.name || currentUser.user_metadata?.name || 'Admin'}
              </div>
              <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>{currentUser.email}</div>
              <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
                Last: {formatDateTime(currentUser.last_sign_in_at)}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#777', padding: '6px 0', fontSize: '12px' }}>No active session</div>
        )}
      </div> */}

      {/* Recent Signups Section - First */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          marginBottom: '12px' 
        }}>
          <span style={{ fontSize: '14px' }}>✨</span>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Recent Signups</span>
          <span style={{ 
            fontSize: '10px', 
            background: '#F0F0F0', 
            padding: '2px 8px', 
            borderRadius: '12px',
            color: '#666'
          }}>
            {signupLogs.length}
          </span>
        </div>

        <div style={{ 
          background: '#fff', 
          borderRadius: '12px', 
          border: '1px solid #F0F0F0',
          overflow: 'hidden'
        }}>
          {sortedSignupLogs.length > 0 ? (
            sortedSignupLogs.slice(0, 10).map((log, index) => {
              const profileData = log.profiles;
              const userProfile = profiles.find(p => p.id === log.user_id);
              
              return (
                <div 
                  key={log.id}
                  onClick={() => handleUserClick(log.user_id)}
                  style={{ 
                    padding: '10px 14px',
                    borderBottom: index < Math.min(sortedSignupLogs.length, 10) - 1 ? '1px solid #F5F5F5' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <Avatar name={profileData?.name || null} src={null} size={28} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '12px', marginBottom: '2px' }}>
                        {profileData?.name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#777' }}>{profileData?.email}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        fontSize: '10px', 
                        background: '#F5F5F5', 
                        padding: '2px 8px',
                        borderRadius: '12px',
                        color: '#666'
                      }}>
                        {profileData?.user_type || 'user'}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: userProfile?.status === 'approved' ? '#E8F5E9' :
                                   userProfile?.status === 'pending' ? '#FFF3E0' :
                                   userProfile?.status === 'rejected' ? '#FFEBEE' : '#F5F5F5',
                        color: userProfile?.status === 'approved' ? '#2E7D32' :
                               userProfile?.status === 'pending' ? '#EF6C00' :
                               userProfile?.status === 'rejected' ? '#C62828' : '#999'
                      }}>
                        {userProfile?.status || 'unknown'}
                      </span>
                      <span style={{ fontSize: '10px', color: '#999' }}>
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
              No signup logs found
            </div>
          )}
        </div>
      </div>

      {/* Pending Approvals Section - Second */}
      {pendingUsers.length > 0 && (
        <div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            marginBottom: '12px' 
          }}>
            <span style={{ fontSize: '14px' }}>⏳</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Pending Approvals</span>
            <span style={{ 
              fontSize: '10px', 
              background: '#F0F0F0', 
              padding: '2px 8px', 
              borderRadius: '12px',
              color: '#666'
            }}>
              {pendingUsers.length}
            </span>
          </div>

          <div style={{ 
            background: '#fff', 
            borderRadius: '12px', 
            border: '1px solid #F0F0F0',
            overflow: 'hidden'
          }}>
            {pendingUsers.map((profile, index) => (
              <div 
                key={profile.id}
                style={{ 
                  padding: '12px 14px',
                  borderBottom: index < pendingUsers.length - 1 ? '1px solid #F5F5F5' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <Avatar name={profile.name} src={null} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '2px' }}>
                      {profile.name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#777' }}>{profile.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      background: '#FFF3E0', 
                      color: '#EF6C00',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 500
                    }}>
                      {profile.user_type || 'user'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#999' }}>
                      {formatDateTime(profile.created_at)}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewUser(profile);
                    }}
                    style={{
                      border: '1px solid #E5E5E5',
                      background: '#fff',
                      borderRadius: '5px',
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#666',
                      cursor: 'pointer'
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={(e) => handleApprove(profile.id, e)}
                    disabled={processingId === profile.id}
                    style={{
                      border: 'none',
                      background: processingId === profile.id ? '#E0E0E0' : '#4CAF50',
                      borderRadius: '5px',
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#fff',
                      cursor: processingId === profile.id ? 'not-allowed' : 'pointer',
                      opacity: processingId === profile.id ? 0.6 : 1
                    }}
                  >
                    {processingId === profile.id ? '...' : 'Approve'}
                  </button>
                  <button
                    onClick={(e) => handleReject(profile.id, e)}
                    disabled={processingId === profile.id}
                    style={{
                      border: '1px solid #FF5252',
                      background: '#fff',
                      borderRadius: '5px',
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#FF5252',
                      cursor: processingId === profile.id ? 'not-allowed' : 'pointer',
                      opacity: processingId === profile.id ? 0.6 : 1
                    }}
                  >
                    {processingId === profile.id ? '...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};