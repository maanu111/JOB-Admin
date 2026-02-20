"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabaseClient";

// Import components
import { ToastContainer, useToast } from "../components/Toast";
import { AdminPanel } from "../components/AdminPanel";
import { UserTab } from "../components/UserTab";
import { JobPostTab } from "../components/JobPostTab";
import { BannerManager } from "../components/BannerManager";
import { DocModal } from "../components/DocModal";
import { DetailModal } from "../components/DetailModal";
import { Avatar } from "../components/Avatar";

// Import types
import { Profile, JobSeeker, UserPost, LoginLog, SignupLog } from "../components/types";
import { formatDateTime } from "../components/utils";

export default function AdminDashboard() {
  const router = useRouter();
  const { toasts, show, dismiss } = useToast();

  const [activeTab, setActiveTab] = useState<"admin" | "users" | "posts" | "banners">("admin");
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [jobSeekers, setJobSeekers] = useState<JobSeeker[]>([]);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);

  const [totalUsers, setTotalUsers] = useState(0);
  const [totalSeekers, setTotalSeekers] = useState(0);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [verifiedDocs, setVerifiedDocs] = useState(0);
  
  const [todaySignups, setTodaySignups] = useState(0);
  const [todayLogins, setTodayLogins] = useState(0);
  const [monthSignups, setMonthSignups] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);

  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [signupLogs, setSignupLogs] = useState<SignupLog[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [docModal, setDocModal] = useState<{ url: string; title: string } | null>(null);
  const [detailModal, setDetailModal] = useState<{ type: "users" | "jobseekers"; user?: Profile; seeker?: JobSeeker } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }

      const { data: adminRow } = await supabase
        .from("admins")
        .select("name, email")
        .eq("email", session.user.email)
        .single();

      if (!adminRow) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      setAdminName(adminRow.name ?? null);
      setAdminEmail(adminRow.email ?? null);
      
      await fetchAllData();
      await getCurrentUser();
      await fetchAuthLogs();
    };
    init();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    const loadId = show("Fetching dashboard data...", "loading");
    
    try {
      await Promise.all([
        fetchProfiles(),
        fetchJobSeekers(),
        fetchUserPosts(),
        fetchStatistics(),
      ]);
      dismiss(loadId);
      show("Data loaded successfully", "success", 2000);
    } catch (error: any) {
      dismiss(loadId);
      show(error.message ?? "Failed to fetch data", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data ?? []);
      setTotalProfiles(data?.length || 0);
      setTotalUsers(data?.filter(p => p.user_type === "user").length || 0);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      show('Failed to fetch users', 'error');
    }
  };

  const fetchJobSeekers = async () => {
    try {
      const { data, error } = await supabase
        .from("job_seekers")
        .select(`*, profiles(id, name, email, user_type, created_at)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobSeekers(data ?? []);
      setTotalSeekers(data?.length || 0);
      const verified = data?.filter(s => s.aadhar_url && s.pan_url).length || 0;
      setVerifiedDocs(verified);
    } catch (error) {
      console.error('Error fetching job seekers:', error);
      show('Failed to fetch job seekers', 'error');
    }
  };

  const fetchUserPosts = async () => {
    try {
      const { data: posts, error } = await supabase
        .from('job_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(posts.map(post => post.user_id))];
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      if (profileError) throw profileError;

      const profileMap = new Map();
      profiles?.forEach(profile => profileMap.set(profile.id, profile));

      const postsWithUserInfo = posts.map(post => ({
        ...post,
        user_name: profileMap.get(post.user_id)?.name || 'Unknown User',
        user_email: profileMap.get(post.user_id)?.email || 'No email',
      }));

      setUserPosts(postsWithUserInfo);
    } catch (error) {
      console.error('Error fetching posts:', error);
      show('Failed to fetch posts', 'error');
    }
  };

  const fetchStatistics = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: todaySignupsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const { count: monthSignupsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString());

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const { count: activeUsersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', lastWeek.toISOString());

      const { count: todayLoginsCount } = await supabase
        .from('login_logs')
        .select('*', { count: 'exact', head: true })
        .gte('login_time', today.toISOString());

      setTodaySignups(todaySignupsCount || 0);
      setTodayLogins(todayLoginsCount || 0);
      setMonthSignups(monthSignupsCount || 0);
      setActiveUsers(activeUsersCount || 0);

    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRefresh = () => {
    fetchAllData();
    fetchAuthLogs();
  };

  const fetchAuthLogs = async () => {
    try {
      const { data: signups, error: signupError } = await supabase
        .from('signup_logs')
        .select(`
          id,
          user_id,
          created_at,
          profiles:user_id (name, email, user_type)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (signupError) throw signupError;
      
      const transformedSignups = signups?.map(log => ({
        ...log,
        profiles: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles
      }));
      
      setSignupLogs(transformedSignups || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      
      setCurrentUser({
        ...session.user,
        profile: profile || { name: session.user.user_metadata?.name || 'Admin' }
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    const loadId = show("Deleting post...", "loading");
    try {
      const { error } = await supabase
        .from('job_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setUserPosts(prev => prev.filter(post => post.id !== postId));
      dismiss(loadId);
      show("Post deleted successfully", "success", 2000);
      fetchStatistics();
    } catch (error: any) {
      dismiss(loadId);
      show(error.message ?? "Failed to delete post", "error");
    }
  };

  const handleSignOut = async () => {
    const loadId = show("Signing out...", "loading");
    await supabase.auth.signOut();
    dismiss(loadId);
    show("Signed out successfully", "success");
    setTimeout(() => router.push("/"), 1000);
  };

  const firstName = adminName ? adminName.split(" ")[0] : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #F5F5F5; color: #111; }
        @keyframes toastIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }

        .root { display: flex; min-height: 100vh; flex-direction: column; }
        @media (min-width: 768px) {
          .root { flex-direction: row; }
        }

        /* Mobile Menu Toggle */
        .mobile-menu-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #fff;
          border-bottom: 1px solid #EBEBEB;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        @media (min-width: 768px) {
          .mobile-menu-toggle { display: none; }
        }
        .menu-btn {
          background: none;
          border: 1px solid #EBEBEB;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 14px;
          cursor: pointer;
        }

        .sidebar { 
          width: 100%; 
          background: #fff; 
          border-right: 1px solid #EBEBEB; 
          display: flex; 
          flex-direction: column; 
          transition: transform 0.3s ease;
          position: fixed;
          top: 56px;
          left: 0;
          height: calc(100vh - 56px);
          transform: translateX(-100%);
          z-index: 99;
        }
        .sidebar.open {
          transform: translateX(0);
        }
        @media (min-width: 768px) {
          .sidebar { 
            width: 220px; 
            position: sticky; 
            top: 0; 
            height: 100vh;
            transform: none;
          }
        }
        @media (min-width: 1024px) {
          .sidebar { width: 240px; }
        }

        .sb-top { padding: 16px; border-bottom: 1px solid #EBEBEB; }
        .sb-brand { font-size: 13px; font-weight: 700; color: #111; letter-spacing: -0.3px; margin-bottom: 12px; }
        .sb-admin-card { display: flex; align-items: center; gap: 9px; }
        .sb-admin-avatar { width: 34px; height: 34px; border-radius: 50%; background: #111; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .sb-admin-name { font-size: 13px; font-weight: 600; color: #111; line-height: 1.2; word-break: break-word; }
        .sb-admin-role { font-size: 10px; color: #bbb; font-weight: 500; margin-top: 1px; }

        .sb-nav { padding: 14px 10px; flex: 1; overflow-y: auto; }
        .sb-nav-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1.2px; color: #ccc; font-weight: 600; padding: 0 8px; margin-bottom: 6px; display: block; }
        .sb-btn { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 7px; font-size: 13px; font-weight: 500; color: #777; cursor: pointer; border: none; background: transparent; width: 100%; text-align: left; transition: all 0.12s; margin-bottom: 2px; font-family: 'Inter', sans-serif; }
        .sb-btn:hover { background: #F5F5F5; color: #111; }
        .sb-btn.on { background: #111; color: #fff; }
        .sb-cnt { margin-left: auto; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 8px; background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.7); }
        .sb-btn:not(.on) .sb-cnt { background: #F0F0F0; color: #999; }

        .sb-foot { padding: 14px 16px; border-top: 1px solid #EBEBEB; }
        .sb-email { font-size: 10.5px; color: #bbb; word-break: break-all; }

        .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .topbar { background: #fff; border-bottom: 1px solid #EBEBEB; padding: 0 16px; height: 52px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
        @media (min-width: 768px) {
          .topbar { padding: 0 24px; }
        }
        .topbar-ttl { font-size: 14px; font-weight: 600; color: #111; }
        .topbar-r { display: flex; align-items: center; gap: 8px; }
        .rfsh-btn, .logout-btn { 
          border: 1px solid #EBEBEB; 
          background: #fff; 
          border-radius: 7px; 
          padding: 6px 10px; 
          font-size: 12px; 
          font-weight: 500; 
          color: #555; 
          cursor: pointer; 
          font-family: 'Inter', sans-serif; 
          transition: all 0.12s;
          white-space: nowrap;
        }
        @media (min-width: 480px) {
          .rfsh-btn, .logout-btn { padding: 6px 12px; }
        }
        .rfsh-btn:hover { border-color: #111; color: #111; }
        .logout-btn:hover { background: #111; color: #fff; border-color: #111; }

        .content { flex: 1; padding: 16px; overflow-y: auto; }
        @media (min-width: 768px) {
          .content { padding: 22px 24px; }
        }

        /* Responsive Stats Grid */
        .stats-grid { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 8px; 
          margin-bottom: 20px; 
        }
        @media (min-width: 480px) {
          .stats-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 768px) {
          .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 12px; }
        }
        @media (min-width: 1024px) {
          .stats-grid { grid-template-columns: repeat(6, 1fr); }
        }

        .stat-card { 
          background: #fff; 
          border: 1px solid #EBEBEB; 
          border-radius: 10px; 
          padding: 12px; 
        }
        .stat-lbl { 
          font-size: 10px; 
          text-transform: uppercase; 
          letter-spacing: 0.8px; 
          color: #bbb; 
          font-weight: 600; 
          margin-bottom: 4px; 
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .stat-val { 
          font-size: 20px; 
          font-weight: 700; 
          color: #111; 
          line-height: 1; 
          margin-bottom: 2px; 
        }
        @media (min-width: 768px) {
          .stat-val { font-size: 24px; }
        }

        .activity-grid { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 8px; 
          margin-bottom: 20px; 
        }
        @media (min-width: 640px) {
          .activity-grid { grid-template-columns: repeat(4, 1fr); }
        }

        .activity-card { 
          background: linear-gradient(145deg, #fff, #fafafa); 
          border: 1px solid #EBEBEB; 
          border-radius: 10px; 
          padding: 12px; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.02); 
        }
        .activity-lbl { 
          font-size: 10px; 
          text-transform: uppercase; 
          letter-spacing: 0.8px; 
          color: #888; 
          font-weight: 600; 
          margin-bottom: 4px; 
          display: flex; 
          align-items: center; 
          gap: 4px; 
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .activity-val { 
          font-size: 20px; 
          font-weight: 700; 
          color: #111; 
          line-height: 1; 
          margin-bottom: 2px; 
        }

        .tabs { 
          display: flex; 
          gap: 2px; 
          background: #EFEFEF; 
          padding: 3px; 
          border-radius: 8px; 
          width: fit-content; 
          margin-bottom: 16px; 
          flex-wrap: wrap;
        }
        .tb { 
          padding: 7px 12px; 
          border-radius: 6px; 
          border: none; 
          background: transparent; 
          font-size: 12px; 
          font-weight: 500; 
          color: #888; 
          cursor: pointer; 
          font-family: 'Inter', sans-serif; 
          display: flex; 
          align-items: center; 
          gap: 6px; 
          transition: all 0.12s;
          white-space: nowrap;
        }
        @media (min-width: 640px) {
          .tb { padding: 7px 18px; font-size: 12.5px; }
        }
        .tb.on { background: #fff; color: #111; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .tc { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 7px; background: #E5E5E5; color: #888; }
        .tb.on .tc { background: #111; color: #fff; }

        /* Responsive Table */
        .table-responsive { 
          overflow-x: auto; 
          -webkit-overflow-scrolling: touch;
          margin: 0 -16px;
          padding: 0 16px;
        }
        @media (min-width: 768px) {
          .table-responsive { margin: 0; padding: 0; }
        }

        table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: 12px; 
          min-width: 600px;
        }
        @media (min-width: 768px) {
          table { font-size: 12.5px; min-width: 0; }
        }

        thead th { 
          background: #FAFAFA; 
          padding: 8px 12px; 
          text-align: left; 
          font-size: 10px; 
          text-transform: uppercase; 
          letter-spacing: 0.8px; 
          color: #bbb; 
          font-weight: 600; 
          border-bottom: 1px solid #F0F0F0; 
          white-space: nowrap; 
        }
        td { 
          padding: 8px 12px; 
          color: #111; 
          vertical-align: middle; 
        }

        /* Mobile Cards for Posts */
        .post-card { 
          background: #fff; 
          border: 1px solid #EBEBEB; 
          border-radius: 12px; 
          padding: 16px; 
          margin-bottom: 12px; 
          cursor: pointer; 
          transition: all 0.12s; 
        }
        .post-card:hover { border-color: #111; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .post-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
        .post-user { display: flex; align-items: center; gap: 10px; }
        .post-user-info { font-size: 13px; font-weight: 600; color: #111; }
        .post-user-email { font-size: 11px; color: #999; margin-top: 2px; }
        .post-status { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
        .post-title { font-size: 16px; font-weight: 700; color: #111; margin-bottom: 8px; }
        .post-details { display: flex; flex-wrap: wrap; gap: 8px 12px; margin-bottom: 10px; }
        .post-detail { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #777; }
        .post-footer { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; border-top: 1px solid #F0F0F0; padding-top: 10px; font-size: 11px; color: #999; gap: 8px; }
        .post-openings { color: #111; font-weight: 600; }

        /* Search Bar */
        .search-container { 
          width: 100%; 
          margin-bottom: 12px; 
        }
        @media (min-width: 640px) {
          .search-container { width: auto; margin-bottom: 0; }
        }
        .srch { 
          position: relative; 
          display: flex; 
          align-items: center; 
          width: 100%;
        }
        .srch-ico { 
          position: absolute; 
          left: 10px; 
          font-size: 12px; 
          color: #ccc; 
          pointer-events: none; 
        }
        .srch-inp { 
          width: 100%;
          border: 1px solid #EBEBEB; 
          border-radius: 7px; 
          background: #FAFAFA; 
          padding: 8px 12px 8px 30px; 
          font-size: 13px; 
          font-family: 'Inter', sans-serif; 
          color: #111; 
          outline: none; 
          transition: border-color 0.15s; 
        }
        .srch-inp::placeholder { color: #ccc; }
        .srch-inp:focus { border-color: #111; background: #fff; }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; gap: 10px; }
        .spin { width: 24px; height: 24px; border: 2px solid #F0F0F0; border-top-color: #111; border-radius: 50%; animation: sp 0.65s linear infinite; }
        @keyframes sp { to { transform: rotate(360deg); } }
        .empty-text { font-size: 12.5px; color: #bbb; }
      `}</style>

      <ToastContainer toasts={toasts} />

      {/* Mobile Menu Toggle */}
      <div className="mobile-menu-toggle">
        <div className="sb-brand">WorkAdmin</div>
        <button className="menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? '✕' : '☰'} Menu
        </button>
      </div>

      <div className="root">
        <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="sb-top">
            <div className="sb-brand">WorkAdmin</div>
            <div className="sb-admin-card">
              <div className="sb-admin-avatar">
                {firstName ? firstName[0].toUpperCase() : "A"}
              </div>
              <div>
                <div className="sb-admin-name">{firstName ?? "Admin"}</div>
                <div className="sb-admin-role">Admin</div>
              </div>
            </div>
          </div>

          <div className="sb-nav">
            <span className="sb-nav-label">Main</span>
            <button className={`sb-btn ${activeTab === "admin" ? "on" : ""}`} onClick={() => { setActiveTab("admin"); setMobileMenuOpen(false); }}>
              📊 Admin
            </button>
            <button className={`sb-btn ${activeTab === "users" ? "on" : ""}`} onClick={() => { setActiveTab("users"); setMobileMenuOpen(false); }}>
              👥 Users
            </button>
            <button className={`sb-btn ${activeTab === "posts" ? "on" : ""}`} onClick={() => { setActiveTab("posts"); setMobileMenuOpen(false); }}>
              📄 Jobs <span className="sb-cnt">{userPosts.length}</span>
            </button>
            <button className={`sb-btn ${activeTab === "banners" ? "on" : ""}`} onClick={() => { setActiveTab("banners"); setMobileMenuOpen(false); }}>
              🖼️ Banners 
            </button>
          </div>

          <div className="sb-foot">
            {adminEmail && <div className="sb-email">🔐 {adminEmail}</div>}
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <span className="topbar-ttl">
              {activeTab === "admin" && "Admin Panel"}
              {activeTab === "users" && "User Management"}
              {activeTab === "posts" && "Job Posts"}
              {activeTab === "banners" && "Banner Management"}
            </span>
            <div className="topbar-r">
              <button className="rfsh-btn" onClick={fetchAllData}>↻</button>
              <button className="logout-btn" onClick={handleSignOut}>
                <span>↩</span> <span className="hide-mobile">Logout</span>
              </button>
            </div>
          </div>

          <div className="content">
            {loading ? (
              <div className="empty-state">
                <div className="spin" />
                <span className="empty-text">Loading dashboard...</span>
              </div>
            ) : (
              <>
                {activeTab === "admin" && (
                  <AdminPanel
                    profiles={profiles}
                    signupLogs={signupLogs}
                    currentUser={currentUser}
                    totalUsers={totalUsers}
                    totalSeekers={totalSeekers}
                    totalProfiles={totalProfiles}
                    verifiedDocs={verifiedDocs}
                    todaySignups={todaySignups}
                    monthSignups={monthSignups}
                    onRefresh={handleRefresh} 
                    onViewUser={(user) => setDetailModal({ type: "users", user })}
                    onViewSeeker={(seeker) => setDetailModal({ type: "jobseekers", seeker })}
                  />
                )}

                {activeTab === "users" && (
                  <UserTab
                    profiles={profiles}
                    jobSeekers={jobSeekers}
                    totalUsers={totalUsers}
                    totalSeekers={totalSeekers}
                    onViewUser={(user) => setDetailModal({ type: "users", user })}
                    onViewSeeker={(seeker) => setDetailModal({ type: "jobseekers", seeker })}
                    onViewDoc={(url, title) => setDocModal({ url, title })}
                  />
                )}

                {activeTab === "posts" && (
                  <JobPostTab
                    userPosts={userPosts}
                    onDeletePost={handleDeletePost}
                    showToast={show}
                    dismissToast={dismiss}
                  />
                )}

                {activeTab === "banners" && (
                  <BannerManager 
                    showToast={show}
                    dismissToast={dismiss}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {docModal && <DocModal url={docModal.url} title={docModal.title} onClose={() => setDocModal(null)} />}
      
      {detailModal && (
        <DetailModal
          type={detailModal.type}
          user={detailModal.user}
          seeker={detailModal.seeker}
          onClose={() => setDetailModal(null)}
          onViewDoc={(url, title) => { setDetailModal(null); setDocModal({ url, title }); }}
        />
      )}
    </>
  );
}