"use client";

import { useState, useMemo, useEffect } from "react";
import { Avatar } from "./Avatar";
import { Profile, JobSeeker } from "./types";
import { formatDate, formatDateTime, formatCurrency } from "./utils";
import { supabase } from "../../supabaseClient";
import { ToastContainer, useToast } from "../components/Toast";

interface UserTabProps {
  profiles: Profile[];
  jobSeekers: JobSeeker[];
  totalUsers: number;
  totalSeekers: number;
  onViewUser: (user: Profile) => void;
  onViewSeeker: (seeker: JobSeeker) => void;
  onViewDoc: (url: string, title: string) => void;
  onRefresh?: () => void;
}

type SubTab = "users" | "jobseekers" | "requests";

interface UserFilters {
  userType: string;
  dateRange: string;
}

interface JobSeekerFilters {
  jobType: string;
  minCharges: number | null;
  maxCharges: number | null;
  hasDocuments: string;
  dateRange: string;
}

export const UserTab = ({
  profiles,
  jobSeekers,
  totalUsers,
  totalSeekers,
  onViewUser,
  onViewSeeker,
  onViewDoc,
  onRefresh
}: UserTabProps) => {
  const [subTab, setSubTab] = useState<SubTab>("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [localProfiles, setLocalProfiles] = useState<Profile[]>(profiles);



  const { show } = useToast();
  // Update local profiles when props change
  useEffect(() => {
    setLocalProfiles(profiles);
  }, [profiles]);

  useEffect(() => {
  const channel = supabase
    .channel("profiles-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "profiles",
      },
      (payload) => {
        console.log("Realtime change:", payload);

        if (payload.eventType === "INSERT") {
          const newProfile = payload.new as Profile;

          // Only add if jobseeker and pending
          if (
            newProfile.user_type === "jobseeker" &&
            newProfile.status === "pending"
          ) {
            setLocalProfiles((prev) => [newProfile, ...prev]);
          }
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

  const [userFilters, setUserFilters] = useState<UserFilters>({
    userType: "all",
    dateRange: "all"
  });

  const [seekerFilters, setSeekerFilters] = useState<JobSeekerFilters>({
    jobType: "all",
    minCharges: null,
    maxCharges: null,
    hasDocuments: "all",
    dateRange: "all"
  });

  const jobTypes = useMemo(() => {
    const types = new Set<string>();
    jobSeekers.forEach(seeker => {
      if (seeker.job_type) types.add(seeker.job_type);
    });
    return Array.from(types).sort();
  }, [jobSeekers]);

 const pendingRequests = useMemo(() => {
  return localProfiles.filter(
    p => p.status === "pending" && p.user_type === "jobseeker"
  );
}, [localProfiles]);

  const filteredUsers = useMemo(() => {
    let filtered = localProfiles.filter(p => p.user_type === "user");

    const q = searchQuery.toLowerCase();
    if (q) {
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.email?.toLowerCase().includes(q)
      );
    }

    if (userFilters.userType !== "all") {
      filtered = filtered.filter(p => p.user_type === userFilters.userType);
    }

    if (userFilters.dateRange !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      switch (userFilters.dateRange) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(p => p.created_at && new Date(p.created_at) >= filterDate);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(p => p.created_at && new Date(p.created_at) >= filterDate);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(p => p.created_at && new Date(p.created_at) >= filterDate);
          break;
      }
    }

    return filtered;
  }, [localProfiles, searchQuery, userFilters]);

  const filteredSeekers = useMemo(() => {
    let filtered = [...jobSeekers];

    const q = searchQuery.toLowerCase();
    if (q) {
      filtered = filtered.filter(s => 
        s.profiles?.name?.toLowerCase().includes(q) || 
        s.profiles?.email?.toLowerCase().includes(q) ||
        s.job_type?.toLowerCase().includes(q) ||
        s.mobile?.toLowerCase().includes(q)
      );
    }

    if (seekerFilters.jobType !== "all") {
      filtered = filtered.filter(s => s.job_type === seekerFilters.jobType);
    }

    if (seekerFilters.minCharges !== null) {
      filtered = filtered.filter(s => (s.monthly_charges || 0) >= seekerFilters.minCharges!);
    }
    if (seekerFilters.maxCharges !== null) {
      filtered = filtered.filter(s => (s.monthly_charges || 0) <= seekerFilters.maxCharges!);
    }

    if (seekerFilters.hasDocuments === "both") {
      filtered = filtered.filter(s => s.aadhar_url && s.pan_url);
    } else if (seekerFilters.hasDocuments === "aadhar") {
      filtered = filtered.filter(s => s.aadhar_url);
    } else if (seekerFilters.hasDocuments === "pan") {
      filtered = filtered.filter(s => s.pan_url);
    } else if (seekerFilters.hasDocuments === "none") {
      filtered = filtered.filter(s => !s.aadhar_url && !s.pan_url);
    }

    if (seekerFilters.dateRange !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      switch (seekerFilters.dateRange) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(s => s.created_at && new Date(s.created_at) >= filterDate);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(s => s.created_at && new Date(s.created_at) >= filterDate);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(s => s.created_at && new Date(s.created_at) >= filterDate);
          break;
      }
    }

    return filtered;
  }, [jobSeekers, searchQuery, seekerFilters]);

  const resetFilters = () => {
    if (subTab === "users") {
      setUserFilters({
        userType: "all",
        dateRange: "all"
      });
    } else if (subTab === "jobseekers") {
      setSeekerFilters({
        jobType: "all",
        minCharges: null,
        maxCharges: null,
        hasDocuments: "all",
        dateRange: "all"
      });
    }
    setSearchQuery("");
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
      
      // Update local state immediately for real-time removal
      // setLocalProfiles(prevProfiles => 
      //   prevProfiles.map(profile => 
      //     profile.id === userId 
      //       ? { ...profile, status: "approved" }
      //       : profile
      //   )
      // );
      
      // Show success message
  show("User approved successfully 🎉", "success");
      
      // Call onRefresh if provided (optional)
     
    } catch (error: any) {
    show(error.message || "Failed to approve user", "error");
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
      
      // Update local state immediately for real-time removal
      // setLocalProfiles(prevProfiles => 
      //   prevProfiles.map(profile => 
      //     profile.id === userId 
      //       ? { ...profile, status: "rejected" }
      //       : profile
      //   )
      // );
      
   show("User rejected ❌", "error");
      onRefresh?.();
    } catch (error: any) {
      alert(error.message || "Failed to reject user");
    } finally {
      setProcessingId(null);
    }
  };

  // User Card Component for Mobile
  const UserCard = ({ user }: { user: Profile }) => (
    <div style={{
      background: '#fff',
      border: '1px solid #EBEBEB',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <Avatar name={user.name} src={null} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
            {user.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '13px', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.email || '—'}
          </div>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '12px',
        marginBottom: '16px',
        fontSize: '13px'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Type</div>
          <span className="badge">{user.user_type || '—'}</span>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Joined</div>
          <div style={{ color: '#111' }}>{formatDate(user.created_at)}</div>
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>User ID</div>
          <div style={{ fontSize: '12px', color: '#777', fontFamily: 'monospace' }}>
            {user.id.slice(0, 18)}…
          </div>
        </div>
      </div>

      <button 
        className="view-btn" 
        onClick={() => onViewUser(user)}
        style={{ width: '100%' }}
      >
        View Details
      </button>
    </div>
  );

  // Job Seeker Card Component for Mobile
  const SeekerCard = ({ seeker }: { seeker: JobSeeker }) => (
    <div style={{
      background: '#fff',
      border: '1px solid #EBEBEB',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <Avatar name={seeker.profiles?.name ?? null} src={seeker.photo_url} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
            {seeker.profiles?.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '13px', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {seeker.profiles?.email || '—'}
          </div>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '12px',
        marginBottom: '16px',
        fontSize: '13px'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Mobile</div>
          <div style={{ color: '#111' }}>{seeker.mobile || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Job Type</div>
          {seeker.job_type ? (
            <span className="badge blk">{seeker.job_type}</span>
          ) : <span style={{ color: '#999' }}>—</span>}
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Charges/mo</div>
          <div style={{ fontWeight: 600, color: '#111' }}>{formatCurrency(seeker.monthly_charges)}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Joined</div>
          <div style={{ color: '#111' }}>{formatDate(seeker.created_at)}</div>
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>Documents</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {seeker.aadhar_url ? (
              <button 
                className="doc-pill" 
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDoc(seeker.aadhar_url!, "Aadhar Card");
                }}
                style={{ padding: '6px 12px' }}
              >
                🪪 Aadhar
              </button>
            ) : (
              <span style={{ color: '#ccc', fontSize: '12px' }}>No Aadhar</span>
            )}
            {seeker.pan_url ? (
              <button 
                className="doc-pill" 
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDoc(seeker.pan_url!, "PAN Card");
                }}
                style={{ padding: '6px 12px' }}
              >
                📄 PAN
              </button>
            ) : (
              <span style={{ color: '#ccc', fontSize: '12px' }}>No PAN</span>
            )}
          </div>
        </div>
      </div>

      <button 
        className="view-btn" 
        onClick={() => onViewSeeker(seeker)}
        style={{ width: '100%' }}
      >
        View Details
      </button>
    </div>
  );

  // Request Card Component for Mobile
  const RequestCard = ({ profile }: { profile: Profile }) => (
    <div style={{
      background: '#fff',
      border: '1px solid #FFF3E0',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <Avatar name={profile.name} src={null} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
            {profile.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '13px', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile.email || '—'}
          </div>
        </div>
        <span style={{ 
          fontSize: '11px', 
          background: '#FFF3E0', 
          color: '#EF6C00',
          padding: '3px 10px',
          borderRadius: '12px',
          fontWeight: 500,
          whiteSpace: 'nowrap'
        }}>
          {profile.user_type || 'user'}
        </span>
      </div>

      <div style={{ fontSize: '11px', color: '#999', marginBottom: '14px' }}>
        Requested: {formatDateTime(profile.created_at)}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="view-btn"
          onClick={() => onViewUser(profile)}
          style={{ flex: 1 }}
        >
          View
        </button>
        <button
          onClick={(e) => handleApprove(profile.id, e)}
          disabled={processingId === profile.id}
          style={{
            flex: 1,
            border: 'none',
            background: processingId === profile.id ? '#E0E0E0' : '#4CAF50',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
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
            flex: 1,
            border: '1px solid #FF5252',
            background: '#fff',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
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
  );

  return (
    <div>
      {/* Header with Tabs and Search */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '16px' 
      }}>
        <div className="tabs">
          <button className={`tb ${subTab === "users" ? "on" : ""}`} onClick={() => setSubTab("users")}>
            Users <span className="tc">{filteredUsers.length}</span>
          </button>
          <button className={`tb ${subTab === "jobseekers" ? "on" : ""}`} onClick={() => setSubTab("jobseekers")}>
            Job Seekers <span className="tc">{filteredSeekers.length}</span>
          </button>
          <button className={`tb ${subTab === "requests" ? "on" : ""}`} onClick={() => setSubTab("requests")}>
            Requests{" "}
            <span className="tc" style={{
              background: pendingRequests.length > 0 ? '#FF9800' : undefined,
              color: pendingRequests.length > 0 ? '#fff' : undefined
            }}>
              {pendingRequests.length}
            </span>
          </button>
        </div>

        {subTab !== "requests" && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div className="srch" style={{ flex: 1 }}>
              <span className="srch-ico">🔍</span>
              <input 
                className="srch-inp" 
                placeholder={`Search ${subTab}...`} 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            
            <button 
              className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${showFilters ? '#111' : '#EBEBEB'}`,
                background: showFilters ? '#111' : '#fff',
                color: showFilters ? '#fff' : '#555',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Filters {showFilters ? '▲' : '▼'}
            </button>
            
            {(userFilters.userType !== "all" || userFilters.dateRange !== "all" || 
              seekerFilters.jobType !== "all" || seekerFilters.hasDocuments !== "all" || 
              seekerFilters.minCharges || seekerFilters.maxCharges) && (
              <button 
                onClick={resetFilters}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #FF5252',
                  background: '#fff',
                  color: '#FF5252',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && subTab !== "requests" && (
        <div style={{
          background: '#fff',
          border: '1px solid #EBEBEB',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          {subTab === "users" ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px' }}>User Type</label>
                <select 
                  value={userFilters.userType}
                  onChange={(e) => setUserFilters({...userFilters, userType: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #EBEBEB',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#111'
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="user">Regular User</option>
                  <option value="jobseeker">Job Seeker</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px' }}>Registration Date</label>
                <select 
                  value={userFilters.dateRange}
                  onChange={(e) => setUserFilters({...userFilters, dateRange: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #EBEBEB',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#111'
                  }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px' }}>Job Type</label>
                <select 
                  value={seekerFilters.jobType}
                  onChange={(e) => setSeekerFilters({...seekerFilters, jobType: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #EBEBEB',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#111'
                  }}
                >
                  <option value="all">All Types</option>
                  {jobTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px' }}>Monthly Charges (₹)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="number"
                    placeholder="Min"
                    value={seekerFilters.minCharges || ''}
                    onChange={(e) => setSeekerFilters({
                      ...seekerFilters, 
                      minCharges: e.target.value ? Number(e.target.value) : null
                    })}
                    style={{
                      width: '50%',
                      padding: '10px',
                      border: '1px solid #EBEBEB',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  />
                  <input 
                    type="number"
                    placeholder="Max"
                    value={seekerFilters.maxCharges || ''}
                    onChange={(e) => setSeekerFilters({
                      ...seekerFilters, 
                      maxCharges: e.target.value ? Number(e.target.value) : null
                    })}
                    style={{
                      width: '50%',
                      padding: '10px',
                      border: '1px solid #EBEBEB',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px' }}>Documents Status</label>
                <select 
                  value={seekerFilters.hasDocuments}
                  onChange={(e) => setSeekerFilters({...seekerFilters, hasDocuments: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #EBEBEB',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#111'
                  }}
                >
                  <option value="all">All</option>
                  <option value="both">Both Aadhar & PAN</option>
                  <option value="aadhar">Has Aadhar Only</option>
                  <option value="pan">Has PAN Only</option>
                  <option value="none">No Documents</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#999', display: 'block', marginBottom: '4px' }}>Registration Date</label>
                <select 
                  value={seekerFilters.dateRange}
                  onChange={(e) => setSeekerFilters({...seekerFilters, dateRange: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #EBEBEB',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#111'
                  }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users Section */}
      {subTab === "users" && (
        <div className="tbl-wrap">
          <div className="tbl-head">
            <span className="tbl-head-ttl">Registered Users</span>
            <span className="tbl-head-meta">{filteredUsers.length} records</span>
          </div>
          
          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize: 30 }}>👤</span>
              <span className="empty-text">No users found</span>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="desktop-only">
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Type</th>
                        <th>User ID</th>
                        <th>Joined</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div className="nm">
                              <Avatar name={u.name} src={null} />
                              <span className="nm-main">{u.name ?? "—"}</span>
                            </div>
                          </td>
                          <td className="t-sub">{u.email ?? "—"}</td>
                          <td><span className="badge">{u.user_type ?? "—"}</span></td>
                          <td className="t-mono">{u.id.slice(0, 14)}…</td>
                          <td className="t-sub">{formatDate(u.created_at)}</td>
                          <td>
                            <button className="view-btn" onClick={() => onViewUser(u)}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="mobile-only">
                {filteredUsers.map(user => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Job Seekers Section */}
      {subTab === "jobseekers" && (
        <div className="tbl-wrap">
          <div className="tbl-head">
            <span className="tbl-head-ttl">Job Seeker Profiles</span>
            <span className="tbl-head-meta">{filteredSeekers.length} records</span>
          </div>
          
          {filteredSeekers.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize: 30 }}>💼</span>
              <span className="empty-text">No job seekers found</span>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="desktop-only">
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Seeker</th>
                        <th>Mobile</th>
                        <th>Job Type</th>
                        <th>Charges</th>
                        <th>Docs</th>
                        <th>Joined</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSeekers.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <div className="nm">
                              <Avatar name={s.profiles?.name ?? null} src={s.photo_url} />
                              <div>
                                <div className="nm-main">{s.profiles?.name ?? "Unknown"}</div>
                                <div className="nm-sub">{s.profiles?.email ?? "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="t-sub">{s.mobile ?? "—"}</td>
                          <td>{s.job_type ? <span className="badge blk">{s.job_type}</span> : "—"}</td>
                          <td className="t-bold">{formatCurrency(s.monthly_charges)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {s.aadhar_url ? (
                                <button className="doc-pill" onClick={() => onViewDoc(s.aadhar_url!, "Aadhar Card")}>A</button>
                              ) : "✕"}
                              {s.pan_url ? (
                                <button className="doc-pill" onClick={() => onViewDoc(s.pan_url!, "PAN Card")}>P</button>
                              ) : "✕"}
                            </div>
                          </td>
                          <td className="t-sub">{formatDate(s.created_at)}</td>
                          <td>
                            <button className="view-btn" onClick={() => onViewSeeker(s)}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="mobile-only">
                {filteredSeekers.map(seeker => (
                  <SeekerCard key={seeker.id} seeker={seeker} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Requests Section */}
      {subTab === "requests" && (
        <div className="tbl-wrap">
          <div className="tbl-head">
            <span className="tbl-head-ttl">Pending Approval Requests</span>
            <span className="tbl-head-meta">{pendingRequests.length} pending</span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize: 30 }}>✅</span>
              <span className="empty-text">No pending requests</span>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="desktop-only">
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>User Type</th>
                        <th>Requested</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((profile) => (
                        <tr key={profile.id}>
                          <td>
                            <div className="nm">
                              <Avatar name={profile.name} src={null} />
                              <span className="nm-main">{profile.name ?? "—"}</span>
                            </div>
                          </td>
                          <td className="t-sub">{profile.email ?? "—"}</td>
                          <td>
                            <span style={{
                              fontSize: '11px',
                              background: '#FFF3E0',
                              color: '#EF6C00',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: 500
                            }}>
                              {profile.user_type || 'user'}
                            </span>
                          </td>
                          <td className="t-sub">{formatDateTime(profile.created_at)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                className="view-btn"
                                onClick={() => onViewUser(profile)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px'
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
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#fff',
                                  cursor: processingId === profile.id ? 'not-allowed' : 'pointer',
                                  opacity: processingId === profile.id ? 0.6 : 1,
                                  whiteSpace: 'nowrap'
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
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#FF5252',
                                  cursor: processingId === profile.id ? 'not-allowed' : 'pointer',
                                  opacity: processingId === profile.id ? 0.6 : 1,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {processingId === profile.id ? '...' : 'Reject'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="mobile-only">
                {pendingRequests.map(profile => (
                  <RequestCard key={profile.id} profile={profile} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        /* Hide on desktop by default */
        .mobile-only {
          display: block;
        }
        .desktop-only {
          display: none;
        }

        /* Show desktop view on larger screens */
        @media (min-width: 768px) {
          .mobile-only {
            display: none;
          }
          .desktop-only {
            display: block;
          }
        }

        .tbl-wrap {
          background: #fff;
          border: 1px solid #EBEBEB;
          border-radius: 12px;
          overflow: hidden;
        }
        .tbl-head {
          padding: 12px 16px;
          border-bottom: 1px solid #F0F0F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .table-responsive {
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        th {
          background: #FAFAFA;
          padding: 10px 12px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: #777;
          border-bottom: 1px solid #F0F0F0;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #F5F5F5;
        }
        .badge {
          background: #F5F5F5;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
        }
        .badge.blk {
          background: #111;
          color: #fff;
        }
        .view-btn {
          border: 1px solid #E5E5E5;
          background: #fff;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          color: #555;
          cursor: pointer;
          transition: all 0.15s;
        }
        .view-btn:hover {
          border-color: #111;
          color: #111;
        }
        .doc-pill {
          border: 1px solid #E5E5E5;
          background: #FAFAFA;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .doc-pill:hover {
          background: #111;
          color: #fff;
          border-color: #111;
        }
        .empty-state {
          padding: 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .empty-text {
          font-size: 13px;
          color: #999;
        }
      `}</style>
    </div>
  );
};