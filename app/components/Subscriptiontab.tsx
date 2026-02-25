"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing_cycle: "monthly" | "yearly" | "lifetime";
  features: string[];
  max_job_posts: number | null;
  max_applications: number | null;
  is_active: boolean;
  created_at: string;
  highlight?: boolean;
  description?: string;
}

interface MembershipRow {
  id: string;
  user_id: string;
  package_id: string;
  package_name: string;
  price: number;
  duration_months: number;
  starts_at: string;
  expires_at: string | null;
  status: string;
  created_at: string;
  seeker_name?: string;
  seeker_email?: string;
}

type ToastType = "loading" | "success" | "error";

interface SubscriptionTabProps {
  showToast: (msg: string, type?: ToastType, duration?: number) => number;
  dismissToast: (id: number) => void;
}

const EMPTY_PLAN: Omit<SubscriptionPlan, "id" | "created_at"> = {
  name: "",
  price: 0,
  billing_cycle: "monthly",
  features: [""],
  max_job_posts: null,
  max_applications: null,
  is_active: true,
  highlight: false,
  description: "",
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:          { bg: "#E6F9F0", color: "#1A8F5A", label: "Active" },
  pending_payment: { bg: "#FFF8E7", color: "#B7791F", label: "Pending Payment" },
  expired:         { bg: "#FFF5F5", color: "#C53030", label: "Expired" },
  cancelled:       { bg: "#F5F5F5", color: "#888",    label: "Cancelled" },
};

export function SubscriptionTab({ showToast, dismissToast }: SubscriptionTabProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<typeof EMPTY_PLAN>({ ...EMPTY_PLAN });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [featureInput, setFeatureInput] = useState("");

  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState("all");

  const [innerTab, setInnerTab] = useState<"plans" | "subscribers">("plans");
  const [newMembershipAlert, setNewMembershipAlert] = useState(false);

  useEffect(() => { fetchPlans(); fetchMemberships(); }, []);

  // ── Realtime: memberships ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("subscriptiontab-memberships")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memberships" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch profile info for the new membership
            const newMem = payload.new as MembershipRow;
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, name, email")
              .eq("id", newMem.user_id)
              .maybeSingle();

            const enriched: MembershipRow = {
              ...newMem,
              seeker_name: profile?.name ?? "Unknown",
              seeker_email: profile?.email ?? "—",
            };

            setMemberships((prev) => [enriched, ...prev]);
            // Flash the tab badge so admin notices even if on Plans tab
            setNewMembershipAlert(true);
            showToast("🎉 New subscription received!", "success", 4000);
          }

          if (payload.eventType === "UPDATE") {
            const updated = payload.new as MembershipRow;
            setMemberships((prev) =>
              prev.map((m) =>
                m.id === updated.id ? { ...m, ...updated } : m
              )
            );
          }

          if (payload.eventType === "DELETE") {
            const deleted = payload.old as MembershipRow;
            setMemberships((prev) => prev.filter((m) => m.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Realtime: subscription_plans ──────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("subscriptiontab-plans")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscription_plans" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPlans((prev) => [...prev, payload.new as SubscriptionPlan].sort((a, b) => a.price - b.price));
          }
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as SubscriptionPlan;
            setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }
          if (payload.eventType === "DELETE") {
            const deleted = payload.old as SubscriptionPlan;
            setPlans((prev) => prev.filter((p) => p.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const { data, error } = await supabase.from("subscription_plans").select("*").order("price", { ascending: true });
      if (error) throw error;
      setPlans(data ?? []);
    } catch (error: any) {
      showToast(error.message ?? "Failed to load plans", "error");
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchMemberships = async () => {
    setLoadingMembers(true);
    try {
      const { data: mem, error } = await supabase
        .from("memberships")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!mem || mem.length === 0) { setMemberships([]); setLoadingMembers(false); return; }

      const userIds = [...new Set(mem.map((m) => m.user_id).filter(Boolean))];
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);
      if (pErr) throw pErr;

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const merged: MembershipRow[] = mem.map((m) => {
        const profile = profileMap.get(m.user_id);
        return { ...m, seeker_name: profile?.name ?? "Unknown", seeker_email: profile?.email ?? "—" };
      });
      setMemberships(merged);
    } catch (error: any) {
      showToast(error.message ?? "Failed to load memberships", "error");
    } finally {
      setLoadingMembers(false);
    }
  };

  const updateMemberStatus = async (membershipId: string, newStatus: string) => {
    const loadId = showToast("Updating status...", "loading");
    try {
      const { error } = await supabase.from("memberships").update({ status: newStatus }).eq("id", membershipId);
      if (error) throw error;
      setMemberships((prev) => prev.map((m) => (m.id === membershipId ? { ...m, status: newStatus } : m)));
      dismissToast(loadId);
      showToast("Status updated", "success", 2000);
    } catch (error: any) {
      dismissToast(loadId);
      showToast(error.message ?? "Failed", "error");
    }
  };

  const openCreate = () => { setEditingPlan(null); setForm({ ...EMPTY_PLAN }); setFeatureInput(""); setShowForm(true); };
  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setForm({ name: plan.name, price: plan.price, billing_cycle: plan.billing_cycle, features: [...plan.features], max_job_posts: plan.max_job_posts, max_applications: plan.max_applications, is_active: plan.is_active, highlight: plan.highlight ?? false, description: plan.description ?? "" });
    setFeatureInput(""); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingPlan(null); setForm({ ...EMPTY_PLAN }); setFeatureInput(""); };
  const addFeature = () => { const t = featureInput.trim(); if (!t) return; setForm((f) => ({ ...f, features: [...f.features.filter(Boolean), t] })); setFeatureInput(""); };
  const removeFeature = (idx: number) => setForm((f) => ({ ...f, features: f.features.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (!form.name.trim()) return showToast("Plan name is required", "error");
    if (form.price < 0) return showToast("Price cannot be negative", "error");
    setSaving(true);
    const loadId = showToast(editingPlan ? "Updating plan..." : "Creating plan...", "loading");
    const payload = { name: form.name.trim(), price: form.price, billing_cycle: form.billing_cycle, features: form.features.filter(Boolean), max_job_posts: form.max_job_posts, max_applications: form.max_applications, is_active: form.is_active, highlight: form.highlight, description: form.description?.trim() ?? "" };
    try {
      if (editingPlan) {
        const { error } = await supabase.from("subscription_plans").update(payload).eq("id", editingPlan.id);
        if (error) throw error;
        setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? { ...p, ...payload } : p)));
      } else {
        const { data, error } = await supabase.from("subscription_plans").insert(payload).select().single();
        if (error) throw error;
        setPlans((prev) => [...prev, data]);
      }
      dismissToast(loadId);
      showToast(editingPlan ? "Plan updated!" : "Plan created!", "success", 2000);
      closeForm();
    } catch (error: any) {
      dismissToast(loadId);
      showToast(error.message ?? "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    const loadId = showToast("Deleting plan...", "loading");
    try {
      const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
      if (error) throw error;
      setPlans((prev) => prev.filter((p) => p.id !== id));
      dismissToast(loadId); showToast("Plan deleted", "success", 2000);
    } catch (error: any) {
      dismissToast(loadId); showToast(error.message ?? "Delete failed", "error");
    } finally { setDeleteConfirm(null); }
  };

  const toggleActive = async (plan: SubscriptionPlan) => {
    const loadId = showToast("Updating...", "loading");
    try {
      const { error } = await supabase.from("subscription_plans").update({ is_active: !plan.is_active }).eq("id", plan.id);
      if (error) throw error;
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, is_active: !p.is_active } : p)));
      dismissToast(loadId); showToast(`Plan ${!plan.is_active ? "activated" : "deactivated"}`, "success", 2000);
    } catch (error: any) {
      dismissToast(loadId); showToast(error.message ?? "Failed", "error");
    }
  };

  const filteredMembers = memberships.filter((m) => {
    const q = memberSearch.toLowerCase();
    const matchSearch = !q || m.seeker_name?.toLowerCase().includes(q) || m.seeker_email?.toLowerCase().includes(q) || m.package_name?.toLowerCase().includes(q);
    const matchStatus = memberStatusFilter === "all" || m.status === memberStatusFilter;
    return matchSearch && matchStatus;
  });

  const billingLabel = (cycle: string) => cycle === "monthly" ? "/mo" : cycle === "yearly" ? "/yr" : " one-time";
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const isExpired = (d: string | null) => d ? new Date(d) < new Date() : false;

  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        .sub-inner-tabs { display: flex; gap: 0; margin-bottom: 20px; border-bottom: 2px solid #F0F0F0; }
        .sub-inner-tab { padding: 10px 20px; font-size: 13px; font-weight: 600; color: #999; cursor: pointer; border: none; background: none; font-family: inherit; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
        .sub-inner-tab.on { color: #111; border-bottom-color: #111; }
        .sub-inner-tab:hover:not(.on) { color: #555; }
        .sub-tab-count { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 8px; background: #F0F0F0; color: #888; }
        .sub-inner-tab.on .sub-tab-count { background: #111; color: #fff; }

        .sub-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .sub-title { font-size: 16px; font-weight: 700; color: #111; }
        .sub-subtitle { font-size: 12px; color: #999; margin-top: 2px; }
        .btn-create { background: #111; color: #fff; border: none; border-radius: 8px; padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px; transition: background 0.15s; }
        .btn-create:hover { background: #333; }
        .refresh-btn { border: 1px solid #EBEBEB; background: #fff; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; color: #555; transition: all 0.12s; }
        .refresh-btn:hover { border-color: #111; color: #111; }

        .plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .plan-card { background: #fff; border: 1.5px solid #EBEBEB; border-radius: 14px; padding: 20px; transition: all 0.15s; }
        .plan-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); border-color: #ddd; }
        .plan-card.highlighted { border-color: #111; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .plan-card.inactive { opacity: 0.55; }

        .plan-badge-row { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
        .plan-badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-active { background: #E6F9F0; color: #1A8F5A; }
        .badge-inactive { background: #F5F5F5; color: #999; }
        .badge-highlight { background: #111; color: #fff; }
        .badge-cycle { background: #F0F0F0; color: #666; }

        .plan-name { font-size: 18px; font-weight: 700; color: #111; margin-bottom: 4px; }
        .plan-desc { font-size: 12px; color: #999; margin-bottom: 14px; line-height: 1.5; }
        .plan-price { font-size: 28px; font-weight: 800; color: #111; line-height: 1; margin-bottom: 16px; }
        .plan-price span { font-size: 14px; font-weight: 500; color: #999; }
        .plan-limits { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
        .plan-limit { background: #F8F8F8; border-radius: 6px; padding: 5px 10px; font-size: 11px; color: #555; font-weight: 500; }
        .plan-features { margin-bottom: 16px; }
        .plan-feature { display: flex; align-items: flex-start; gap: 7px; font-size: 12.5px; color: #555; padding: 4px 0; line-height: 1.4; }
        .feat-check { color: #1A8F5A; font-size: 12px; flex-shrink: 0; margin-top: 1px; }
        .plan-actions { display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px solid #F0F0F0; padding-top: 14px; }
        .btn-sm { border: 1px solid #EBEBEB; background: #fff; border-radius: 7px; padding: 6px 12px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all 0.12s; flex: 1; text-align: center; min-width: 60px; }
        .btn-sm:hover { border-color: #111; background: #F8F8F8; }
        .btn-sm.danger:hover { border-color: #E53E3E; color: #E53E3E; }
        .btn-sm.toggle-on { background: #E6F9F0; border-color: #1A8F5A; color: #1A8F5A; }
        .btn-sm.toggle-off { background: #F5F5F5; border-color: #ccc; color: #888; }

        .empty-plans { text-align: center; padding: 60px 20px; background: #fff; border: 2px dashed #E0E0E0; border-radius: 14px; }
        .empty-plans-ico { font-size: 40px; margin-bottom: 12px; }
        .empty-plans-txt { font-size: 14px; color: #999; margin-bottom: 16px; }

        .plans-summary, .members-summary { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
        .summary-chip { background: #fff; border: 1px solid #EBEBEB; border-radius: 8px; padding: 7px 12px; font-size: 12px; color: #555; display: flex; align-items: center; gap: 5px; }
        .summary-chip strong { color: #111; font-weight: 700; }

        .members-toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
        .members-search { position: relative; flex: 1; min-width: 200px; }
        .members-search-ico { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 13px; color: #bbb; pointer-events: none; }
        .members-search-inp { width: 100%; border: 1px solid #EBEBEB; border-radius: 8px; padding: 8px 12px 8px 32px; font-size: 13px; font-family: inherit; outline: none; background: #FAFAFA; color: #111; transition: border-color 0.15s; }
        .members-search-inp:focus { border-color: #111; background: #fff; }
        .members-search-inp::placeholder { color: #ccc; }
        .filter-sel { border: 1px solid #EBEBEB; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-family: inherit; background: #FAFAFA; color: #555; outline: none; cursor: pointer; }

        .member-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 12px; margin-bottom: 10px; overflow: hidden; transition: border-color 0.12s; }
        .member-card:hover { border-color: #ccc; }
        .member-card-top { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; flex-wrap: wrap; gap: 10px; }
        .member-left { display: flex; align-items: center; gap: 12px; }
        .member-avatar { width: 40px; height: 40px; border-radius: 50%; background: #111; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .member-name { font-size: 14px; font-weight: 600; color: #111; }
        .member-email { font-size: 11.5px; color: #999; margin-top: 1px; }
        .member-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .status-badge { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }

        .member-card-bottom { display: flex; border-top: 1px solid #F5F5F5; flex-wrap: wrap; }
        .member-stat { padding: 10px 14px; border-right: 1px solid #F5F5F5; flex: 1; min-width: 100px; }
        .member-stat:last-child { border-right: none; }
        .member-stat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #bbb; font-weight: 600; margin-bottom: 3px; }
        .member-stat-val { font-size: 12.5px; font-weight: 600; color: #111; }
        .member-stat-val.expired-val { color: #C53030; }

        .status-select { border: 1px solid #EBEBEB; border-radius: 7px; padding: 5px 8px; font-size: 11px; font-family: inherit; background: #FAFAFA; color: #555; outline: none; cursor: pointer; }

        .empty-members { text-align: center; padding: 48px 20px; background: #fff; border: 2px dashed #E8E8E8; border-radius: 12px; }
        .empty-members-ico { font-size: 36px; margin-bottom: 10px; }
        .empty-members-txt { font-size: 13px; color: #bbb; }

        .del-confirm { background: #FFF5F5; border: 1px solid #FED7D7; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
        .del-confirm-txt { font-size: 12.5px; color: #C53030; font-weight: 500; }
        .del-btns { display: flex; gap: 8px; }
        .btn-del-confirm { background: #E53E3E; color: #fff; border: none; border-radius: 7px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .btn-del-cancel { background: #fff; color: #555; border: 1px solid #E0E0E0; border-radius: 7px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(2px); }
        .modal-box { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid #F0F0F0; position: sticky; top: 0; background: #fff; z-index: 1; }
        .modal-title { font-size: 16px; font-weight: 700; color: #111; }
        .modal-close { background: #F5F5F5; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { background: #E8E8E8; }
        .modal-body { padding: 20px 24px; }
        .modal-foot { padding: 16px 24px 20px; border-top: 1px solid #F0F0F0; display: flex; gap: 10px; justify-content: flex-end; }

        .form-row { margin-bottom: 16px; }
        .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
        .form-lbl { font-size: 12px; font-weight: 600; color: #555; margin-bottom: 6px; display: block; }
        .form-inp, .form-sel, .form-textarea { width: 100%; border: 1px solid #EBEBEB; border-radius: 8px; padding: 9px 12px; font-size: 13px; font-family: inherit; color: #111; outline: none; transition: border-color 0.15s; background: #FAFAFA; }
        .form-inp:focus, .form-sel:focus, .form-textarea:focus { border-color: #111; background: #fff; }
        .form-textarea { resize: vertical; min-height: 68px; }
        .form-hint { font-size: 11px; color: #bbb; margin-top: 4px; }

        .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F8F8F8; }
        .toggle-lbl { font-size: 13px; font-weight: 500; color: #333; }
        .toggle-sub { font-size: 11px; color: #bbb; margin-top: 1px; }
        .toggle-switch { width: 44px; height: 24px; border-radius: 12px; border: none; cursor: pointer; transition: background 0.2s; position: relative; flex-shrink: 0; }
        .toggle-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .toggle-switch.on { background: #111; }
        .toggle-switch.on::after { transform: translateX(20px); }
        .toggle-switch.off { background: #E0E0E0; }

        .feature-list { margin-bottom: 10px; }
        .feature-tag { display: inline-flex; align-items: center; gap: 6px; background: #F0F0F0; border-radius: 6px; padding: 4px 10px; font-size: 12px; color: #333; margin: 0 6px 6px 0; }
        .feature-remove { background: none; border: none; cursor: pointer; color: #999; font-size: 14px; line-height: 1; padding: 0; }
        .feature-remove:hover { color: #E53E3E; }
        .feature-add-row { display: flex; gap: 8px; }
        .btn-add-feat { background: #111; color: #fff; border: none; border-radius: 7px; padding: 9px 14px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; font-family: inherit; }

        .btn-cancel { background: #F5F5F5; border: 1px solid #EBEBEB; color: #555; border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .btn-cancel:hover { background: #E8E8E8; }
        .btn-save { background: #111; color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .btn-save:disabled { background: #ccc; cursor: not-allowed; }
        .btn-save:not(:disabled):hover { background: #333; }
      `}</style>

      {/* Inner Tab Nav */}
      <div className="sub-inner-tabs">
        <button className={`sub-inner-tab ${innerTab === "plans" ? "on" : ""}`} onClick={() => setInnerTab("plans")}>
          📦 Plans <span className="sub-tab-count">{plans.length}</span>
        </button>
        <button
          className={`sub-inner-tab ${innerTab === "subscribers" ? "on" : ""}`}
          onClick={() => { setInnerTab("subscribers"); setNewMembershipAlert(false); }}
          style={{ position: "relative" }}
        >
          👥 Subscribers <span className="sub-tab-count">{memberships.length}</span>
          {newMembershipAlert && innerTab !== "subscribers" && (
            <span style={{
              position: "absolute", top: 6, right: -4,
              width: 8, height: 8, borderRadius: "50%",
              background: "#E53E3E",
              boxShadow: "0 0 0 2px #fff",
              animation: "pulse-dot 1.5s ease-in-out infinite",
            }} />
          )}
        </button>
      </div>

      {/* ══════════ PLANS ══════════ */}
      {innerTab === "plans" && (
        <>
          <div className="sub-header">
            <div>
              <div className="sub-title">Subscription Plans</div>
              <div className="sub-subtitle">Plans shown to job seekers on the app</div>
            </div>
            <button className="btn-create" onClick={openCreate}>＋ New Plan</button>
          </div>

          {!loadingPlans && plans.length > 0 && (
            <div className="plans-summary">
              <div className="summary-chip"><strong>{plans.length}</strong> Total</div>
              <div className="summary-chip"><strong>{plans.filter(p => p.is_active).length}</strong> Active</div>
              <div className="summary-chip"><strong>{plans.filter(p => p.highlight).length}</strong> Featured</div>
            </div>
          )}

          {loadingPlans ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#bbb" }}>Loading plans...</div>
          ) : plans.length === 0 ? (
            <div className="empty-plans">
              <div className="empty-plans-ico">📦</div>
              <div className="empty-plans-txt">No plans yet. Create your first plan!</div>
              <button className="btn-create" onClick={openCreate}>＋ Create Plan</button>
            </div>
          ) : (
            <div className="plans-grid">
              {plans.map((plan) => (
                <div key={plan.id} className={`plan-card ${plan.highlight ? "highlighted" : ""} ${!plan.is_active ? "inactive" : ""}`}>
                  <div className="plan-badge-row">
                    <span className={`plan-badge ${plan.is_active ? "badge-active" : "badge-inactive"}`}>{plan.is_active ? "● Active" : "○ Inactive"}</span>
                    {plan.highlight && <span className="plan-badge badge-highlight">⭐ Featured</span>}
                    <span className="plan-badge badge-cycle">{plan.billing_cycle}</span>
                  </div>
                  <div className="plan-name">{plan.name}</div>
                  {plan.description && <div className="plan-desc">{plan.description}</div>}
                  <div className="plan-price">₹{plan.price.toLocaleString()}<span>{billingLabel(plan.billing_cycle)}</span></div>
                  <div className="plan-limits">
                    <div className="plan-limit">📝 {plan.max_job_posts === null ? "Unlimited" : plan.max_job_posts} posts</div>
                    <div className="plan-limit">📨 {plan.max_applications === null ? "Unlimited" : plan.max_applications} apps</div>
                  </div>
                  {plan.features.length > 0 && (
                    <div className="plan-features">
                      {plan.features.map((feat, i) => (
                        <div className="plan-feature" key={i}><span className="feat-check">✓</span><span>{feat}</span></div>
                      ))}
                    </div>
                  )}
                  {deleteConfirm === plan.id && (
                    <div className="del-confirm">
                      <span className="del-confirm-txt">⚠️ Delete this plan permanently?</span>
                      <div className="del-btns">
                        <button className="btn-del-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                        <button className="btn-del-confirm" onClick={() => handleDeletePlan(plan.id)}>Delete</button>
                      </div>
                    </div>
                  )}
                  <div className="plan-actions">
                    <button className="btn-sm" onClick={() => openEdit(plan)}>✏️ Edit</button>
                    <button className={`btn-sm ${plan.is_active ? "toggle-on" : "toggle-off"}`} onClick={() => toggleActive(plan)}>{plan.is_active ? "● On" : "○ Off"}</button>
                    <button className="btn-sm danger" onClick={() => setDeleteConfirm(plan.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════ SUBSCRIBERS ══════════ */}
      {innerTab === "subscribers" && (
        <>
          <div className="sub-header">
            <div>
              <div className="sub-title">Subscribers</div>
              <div className="sub-subtitle">Job seekers who selected a membership plan</div>
            </div>
            <button className="refresh-btn" onClick={fetchMemberships}>↻ Refresh</button>
          </div>

          {!loadingMembers && memberships.length > 0 && (
            <div className="members-summary">
              <div className="summary-chip"><strong>{memberships.length}</strong> Total</div>
              <div className="summary-chip"><strong>{memberships.filter(m => m.status === "active").length}</strong> Active</div>
              <div className="summary-chip"><strong>{memberships.filter(m => m.status === "pending_payment").length}</strong> Pending</div>
              <div className="summary-chip"><strong>{memberships.filter(m => m.status === "expired").length}</strong> Expired</div>
              <div className="summary-chip">
                <strong>₹{memberships.filter(m => m.status === "active").reduce((s, m) => s + (m.price ?? 0), 0).toLocaleString()}</strong> Active Revenue
              </div>
            </div>
          )}

          <div className="members-toolbar">
            <div className="members-search">
              <span className="members-search-ico">🔍</span>
              <input className="members-search-inp" placeholder="Search by name, email or plan..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
            </div>
            <select className="filter-sel" value={memberStatusFilter} onChange={(e) => setMemberStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {loadingMembers ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#bbb" }}>Loading subscribers...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="empty-members">
              <div className="empty-members-ico">👥</div>
              <div className="empty-members-txt">{memberships.length === 0 ? "No subscribers yet." : "No results match your search."}</div>
            </div>
          ) : (
            filteredMembers.map((m) => {
              const statusInfo = STATUS_STYLE[m.status] ?? STATUS_STYLE["pending_payment"];
              const expired = isExpired(m.expires_at);
              const initials = (m.seeker_name ?? "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
              return (
                <div key={m.id} className="member-card">
                  <div className="member-card-top">
                    <div className="member-left">
                      <div className="member-avatar">{initials}</div>
                      <div>
                        <div className="member-name">{m.seeker_name}</div>
                        <div className="member-email">{m.seeker_email}</div>
                      </div>
                    </div>
                    <div className="member-right">
                      <span className="status-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>{statusInfo.label}</span>
                      <select className="status-select" value={m.status} onChange={(e) => updateMemberStatus(m.id, e.target.value)}>
                        <option value="active">Set Active</option>
                        <option value="pending_payment">Set Pending</option>
                        <option value="expired">Set Expired</option>
                        <option value="cancelled">Set Cancelled</option>
                      </select>
                    </div>
                  </div>
                  <div className="member-card-bottom">
                    <div className="member-stat"><div className="member-stat-lbl">Plan</div><div className="member-stat-val">{m.package_name}</div></div>
                    <div className="member-stat"><div className="member-stat-lbl">Price</div><div className="member-stat-val">₹{m.price?.toLocaleString()}</div></div>
                    <div className="member-stat"><div className="member-stat-lbl">Duration</div><div className="member-stat-val">{m.duration_months} mo</div></div>
                    <div className="member-stat"><div className="member-stat-lbl">Started</div><div className="member-stat-val">{formatDate(m.starts_at)}</div></div>
                    <div className="member-stat">
                      <div className="member-stat-lbl">Expires</div>
                      <div className={`member-stat-val ${expired ? "expired-val" : ""}`}>{formatDate(m.expires_at)} {expired && "⚠️"}</div>
                    </div>
                    <div className="member-stat"><div className="member-stat-lbl">Purchased</div><div className="member-stat-val">{formatDate(m.created_at)}</div></div>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* ══════════ CREATE / EDIT MODAL ══════════ */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="modal-box">
            <div className="modal-head">
              <div className="modal-title">{editingPlan ? "Edit Plan" : "Create Plan"}</div>
              <button className="modal-close" onClick={closeForm}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row-2">
                <div>
                  <label className="form-lbl">Plan Name *</label>
                  <input className="form-inp" placeholder="e.g. Pro, Premium" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="form-lbl">Billing Cycle</label>
                  <select className="form-sel" value={form.billing_cycle} onChange={(e) => setForm((f) => ({ ...f, billing_cycle: e.target.value as any }))}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <label className="form-lbl">Price (₹) *</label>
                <input className="form-inp" type="number" min="0" placeholder="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
                <div className="form-hint">Enter 0 for a free plan</div>
              </div>
              <div className="form-row">
                <label className="form-lbl">Description</label>
                <textarea className="form-textarea" placeholder="Short tagline..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="form-row-2">
                <div>
                  <label className="form-lbl">Max Job Posts</label>
                  <input className="form-inp" type="number" min="0" placeholder="Blank = unlimited" value={form.max_job_posts ?? ""} onChange={(e) => setForm((f) => ({ ...f, max_job_posts: e.target.value === "" ? null : parseInt(e.target.value) }))} />
                </div>
                <div>
                  <label className="form-lbl">Max Applications</label>
                  <input className="form-inp" type="number" min="0" placeholder="Blank = unlimited" value={form.max_applications ?? ""} onChange={(e) => setForm((f) => ({ ...f, max_applications: e.target.value === "" ? null : parseInt(e.target.value) }))} />
                </div>
              </div>
              <div className="form-row">
                <label className="form-lbl">Features</label>
                <div className="feature-list">
                  {form.features.filter(Boolean).map((feat, i) => (
                    <span className="feature-tag" key={i}>{feat}<button className="feature-remove" onClick={() => removeFeature(i)}>×</button></span>
                  ))}
                </div>
                <div className="feature-add-row">
                  <input className="form-inp" placeholder="Add a feature..." value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())} />
                  <button className="btn-add-feat" onClick={addFeature}>Add</button>
                </div>
                <div className="form-hint">Press Enter or click Add</div>
              </div>
              <div>
                <div className="toggle-row">
                  <div><div className="toggle-lbl">Active</div><div className="toggle-sub">Visible to job seekers on app</div></div>
                  <button className={`toggle-switch ${form.is_active ? "on" : "off"}`} onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))} />
                </div>
                <div className="toggle-row">
                  <div><div className="toggle-lbl">Featured / Highlighted</div><div className="toggle-sub">Show as recommended plan</div></div>
                  <button className={`toggle-switch ${form.highlight ? "on" : "off"}`} onClick={() => setForm((f) => ({ ...f, highlight: !f.highlight }))} />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={closeForm}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingPlan ? "Save Changes" : "Create Plan"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}