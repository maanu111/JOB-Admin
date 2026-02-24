"use client";

import { useState, useEffect } from "react";
import { Avatar } from "./Avatar";
import { Profile, SignupLog, UserPost } from "./types";
import { formatDateTime, formatDate } from "./utils";
import { supabase } from "../../supabaseClient";
import * as echarts from 'echarts';

interface AdminPanelProps {
  profiles: Profile[];
  signupLogs: SignupLog[];
  userPosts: UserPost[];
  currentUser: any;
  totalUsers: number;
  totalSeekers: number;
  totalProfiles: number;
  verifiedDocs: number;
  todaySignups: number;
  monthSignups: number;
  onViewUser: (user: Profile) => void;
  onViewSeeker: (seeker: any) => void;
  onViewPost?: (post: UserPost) => void;
  onRefresh: () => void;
}

export const AdminPanel = ({
  profiles,
  signupLogs,
  userPosts,
  currentUser,
  totalUsers,
  totalSeekers,
  totalProfiles,
  verifiedDocs,
  todaySignups,
  monthSignups,
  onViewUser,
  onViewSeeker,
  onViewPost,
  onRefresh
}: AdminPanelProps) => {
  const [localProfiles, setLocalProfiles] = useState<Profile[]>(profiles);
  const [localSignupLogs, setLocalSignupLogs] = useState<SignupLog[]>(signupLogs);
  const [localUserPosts, setLocalUserPosts] = useState<UserPost[]>(userPosts);

  // Update local state when props change
  useEffect(() => {
    setLocalProfiles(profiles);
    setLocalSignupLogs(signupLogs);
    setLocalUserPosts(userPosts);
  }, [profiles, signupLogs, userPosts]);

  useEffect(() => {
  const channel = supabase
    .channel("admin-realtime-profiles")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "profiles",
      },
      (payload) => {
        console.log("Realtime profile change:", payload);

        if (payload.eventType === "INSERT") {
          const newProfile = payload.new as Profile;

          setLocalProfiles((prev) => [newProfile, ...prev]);
        }

        if (payload.eventType === "UPDATE") {
          const updatedProfile = payload.new as Profile;

          setLocalProfiles((prev) =>
            prev.map((p) =>
              p.id === updatedProfile.id ? updatedProfile : p
            )
          );
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  // Initialize charts
  useEffect(() => {
    // User Growth Chart
    const userGrowthChart = echarts.init(document.getElementById('userGrowthChart'));
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    }).reverse();

    const userGrowthData = last7Days.map(day => {
      return localSignupLogs.filter(log => {
        const logDate = new Date(log.created_at).toLocaleDateString('en-US', { weekday: 'short' });
        return logDate === day;
      }).length;
    });

    userGrowthChart.setOption({
      title: {
        text: 'User Growth (Last 7 Days)',
        left: 'center',
        top: 0,
        textStyle: { fontSize: 14, fontWeight: 'normal', color: '#333' }
      },
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: last7Days,
        axisLabel: { fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { fontSize: 11 }
      },
      series: [{
        data: userGrowthData,
        type: 'line',
        smooth: true,
        lineStyle: { color: '#2196F3', width: 3 },
        areaStyle: { color: 'rgba(33, 150, 243, 0.1)' },
        symbol: 'circle',
        symbolSize: 8
      }]
    });

    // User Distribution Pie Chart
    const distributionChart = echarts.init(document.getElementById('distributionChart'));
    distributionChart.setOption({
      title: {
        text: 'User Distribution',
        left: 'center',
        top: 0,
        textStyle: { fontSize: 14, fontWeight: 'normal', color: '#333' }
      },
      tooltip: { trigger: 'item' },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 11 }
      },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold' }
        },
        data: [
  {
    value: localProfiles.filter(p => p.user_type === "user").length,
    name: 'Regular Users',
    itemStyle: { color: '#4CAF50' }
  },
  {
    value: localProfiles.filter(p => p.user_type === "jobseeker").length,
    name: 'Job Seekers',
    itemStyle: { color: '#FF9800' }
  },
  {
    value: localProfiles.filter(p => p.status === "pending").length,
    name: 'Pending',
    itemStyle: { color: '#FF5252' }
  }
]
      }]
    });

    // Job Posts Chart
    const jobPostsChart = echarts.init(document.getElementById('jobPostsChart'));
   const activePosts = localUserPosts.filter(p => p.status === "active").length;
const closedPosts = localUserPosts.filter(p => p.status === "closed").length;

    jobPostsChart.setOption({
      title: {
        text: 'Job Posts Status',
        left: 'center',
        top: 0,
        textStyle: { fontSize: 14, fontWeight: 'normal', color: '#333' }
      },
      tooltip: { trigger: 'item' },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 11 }
      },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false },
        data: [
          { value: activePosts, name: 'Active Posts', itemStyle: { color: '#4CAF50' } },
          { value: closedPosts, name: 'Closed Posts', itemStyle: { color: '#9E9E9E' } }
        ]
      }]
    });

    // Handle resize
    const handleResize = () => {
      userGrowthChart.resize();
      distributionChart.resize();
      jobPostsChart.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      userGrowthChart.dispose();
      distributionChart.dispose();
      jobPostsChart.dispose();
    };
 }, [localSignupLogs, localProfiles, localUserPosts]);



useEffect(() => {
  const channel = supabase
    .channel("admin-realtime-signups")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "signup_logs",
      },
      (payload) => {
        const newLog = payload.new as SignupLog;
        setLocalSignupLogs((prev) => [newLog, ...prev]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);


useEffect(() => {
  const channel = supabase
    .channel("admin-realtime-posts")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_posts",
      },
      (payload) => {
        if (payload.eventType === "INSERT") {
          const newPost = payload.new as UserPost;
          setLocalUserPosts((prev) => [newPost, ...prev]);
        }

        if (payload.eventType === "UPDATE") {
          const updatedPost = payload.new as UserPost;
          setLocalUserPosts((prev) =>
            prev.map((p) =>
              p.id === updatedPost.id ? updatedPost : p
            )
          );
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);


  const handleUserClick = (userId: string) => {
    const profile = localProfiles.find(p => p.id === userId);
    if (profile) {
      onViewUser(profile);
    }
  };

  const handlePostClick = (post: UserPost) => {
    if (onViewPost) {
      onViewPost(post);
    }
  };

  const pendingUsers = localProfiles.filter(p => p.status === 'pending');
  const approvedUsers = localProfiles.filter(p => p.status === 'approved');
  const rejectedUsers = localProfiles.filter(p => p.status === 'rejected');

  // Get only the 5 most recent signup logs
  const recentSignupLogs = [...localSignupLogs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Get only the 5 most recent job posts
  const recentJobPosts = [...localUserPosts]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div>
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-lbl">Total Users</div>
          <div className="stat-val">{localProfiles.filter(p => p.user_type === "user").length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Job Seekers</div>
          <div className="stat-val">{localProfiles.filter(p => p.user_type === "jobseeker").length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Total Profiles</div>
          <div className="stat-val">{totalProfiles}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Verified Docs</div>
          <div className="stat-val">{verifiedDocs}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Pending</div>
          <div className="stat-val" style={{ color: '#FF9800' }}>{pendingUsers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Approved</div>
          <div className="stat-val" style={{ color: '#4CAF50' }}>{approvedUsers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Rejected</div>
          <div className="stat-val" style={{ color: '#FF5252' }}>{rejectedUsers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Today</div>
          <div className="stat-val">{todaySignups}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Month</div>
          <div className="stat-val">{monthSignups}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Job Posts</div>
          <div className="stat-val">
  {localUserPosts.length}
</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Active Posts</div>
         <div className="stat-val" style={{ color: '#4CAF50' }}>
  {localUserPosts.filter(p => p.status === "active").length}
</div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ 
          background: '#fff', 
          borderRadius: '12px', 
          border: '1px solid #F0F0F0',
          padding: '16px',
          height: '250px'
        }}>
          <div id="userGrowthChart" style={{ width: '100%', height: '100%' }}></div>
        </div>
        <div style={{ 
          background: '#fff', 
          borderRadius: '12px', 
          border: '1px solid #F0F0F0',
          padding: '16px',
          height: '250px'
        }}>
          <div id="distributionChart" style={{ width: '100%', height: '100%' }}></div>
        </div>
        <div style={{ 
          background: '#fff', 
          borderRadius: '12px', 
          border: '1px solid #F0F0F0',
          padding: '16px',
          height: '250px'
        }}>
          <div id="jobPostsChart" style={{ width: '100%', height: '100%' }}></div>
        </div>
      </div>

      {/* Recent Signups */}
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
            Last 5
          </span>
        </div>

        <div style={{ 
          background: '#fff', 
          borderRadius: '12px', 
          border: '1px solid #F0F0F0',
          overflow: 'hidden'
        }}>
          {recentSignupLogs.length > 0 ? (
            recentSignupLogs.map((log, index) => {
              const profileData = log.profiles;
              const userProfile = localProfiles.find(p => p.id === log.user_id);
              
              return (
                <div 
                  key={log.id}
                  onClick={() => handleUserClick(log.user_id)}
                  style={{ 
                    padding: '12px',
                    borderBottom: index < recentSignupLogs.length - 1 ? '1px solid #F5F5F5' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar name={profileData?.name || null} src={null} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '2px' }}>
                        {profileData?.name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {profileData?.email}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ 
                        fontSize: '10px', 
                        background: '#F5F5F5', 
                        padding: '2px 8px',
                        borderRadius: '12px',
                        color: '#666',
                        whiteSpace: 'nowrap'
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
                               userProfile?.status === 'rejected' ? '#C62828' : '#999',
                        whiteSpace: 'nowrap'
                      }}>
                        {userProfile?.status || 'unknown'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#999', marginTop: '4px', textAlign: 'right' }}>
                    {formatDateTime(log.created_at)}
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

      {/* Recent Job Posts */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          marginBottom: '12px' 
        }}>
          <span style={{ fontSize: '14px' }}>💼</span>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Recent Job Posts</span>
          <span style={{ 
            fontSize: '10px', 
            background: '#F0F0F0', 
            padding: '2px 8px', 
            borderRadius: '12px',
            color: '#666'
          }}>
            Last 5
          </span>
        </div>

        <div style={{ 
          background: '#fff', 
          borderRadius: '12px', 
          border: '1px solid #F0F0F0',
          overflow: 'hidden'
        }}>
          {recentJobPosts.length > 0 ? (
            recentJobPosts.map((post, index) => (
              <div 
                key={post.id}
                onClick={() => handlePostClick(post)}
                style={{ 
                  padding: '12px',
                  borderBottom: index < recentJobPosts.length - 1 ? '1px solid #F5F5F5' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FAFAFA'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar name={post.user_name || null} src={null} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '2px' }}>
                      {post.job_title || 'Untitled Post'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {post.user_name} • {post.location || 'Location not specified'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: post.status === 'active' ? '#E8F5E9' : '#F5F5F5',
                      color: post.status === 'active' ? '#2E7D32' : '#666',
                      whiteSpace: 'nowrap'
                    }}>
                      {post.status || 'unknown'}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: '#F5F5F5',
                      color: '#666',
                      whiteSpace: 'nowrap'
                    }}>
                      {post.job_type || 'Not specified'}
                    </span>
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  marginTop: '8px',
                  fontSize: '10px',
                  color: '#999'
                }}>
                  <span>💰 {post.salary || 'Not specified'}</span>
                  <span>📍 {post.location || 'Not specified'}</span>
                  <span>📅 Posted: {formatDate(post.created_at)}</span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
              No job posts found
            </div>
          )}
        </div>
      </div>

      {/* Pending Approvals - Only View Button */}
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
            {pendingUsers.slice(0, 5).map((profile, index) => (
              <div 
                key={profile.id}
                style={{ 
                  padding: '12px',
                  borderBottom: index < Math.min(pendingUsers.length, 5) - 1 ? '1px solid #F5F5F5' : 'none',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar name={profile.name} src={null} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '2px' }}>
                        {profile.name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {profile.email}
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '11px', 
                      background: '#FFF3E0', 
                      color: '#EF6C00',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 500,
                      whiteSpace: 'nowrap'
                    }}>
                      {profile.user_type || 'user'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#999' }}>
                      {formatDateTime(profile.created_at)}
                    </span>
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
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingUsers.length > 5 && (
              <div style={{ 
                padding: '12px', 
                textAlign: 'center',
                background: '#FAFAFA',
                fontSize: '11px',
                color: '#666',
                borderTop: '1px solid #F0F0F0'
              }}>
                +{pendingUsers.length - 5} more pending approvals
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};