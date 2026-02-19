"use client";

import { Avatar } from "../components/Avatar";
import { formatDate, formatCurrency } from "../components/utils";
import { Profile, JobSeeker } from "../components/types";

const Field = ({ label, value, mono, chip, bold }: { label: string; value: string; mono?: boolean; chip?: boolean; bold?: boolean }) => (
  <div>
    <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.9, color: "#bbb", fontWeight: 600, marginBottom: 4 }}>{label}</div>
    {chip ? (
      <span style={{ background: "#111", color: "#fff", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 5, display: "inline-block" }}>{value}</span>
    ) : (
      <div style={{ fontSize: 13, color: "#111", fontFamily: mono ? "monospace" : "inherit", fontWeight: bold ? 700 : 400 }}>{value}</div>
    )}
  </div>
);

const DocPillBtn = ({ label, url, onClick }: { label: string; url: string | null; onClick: () => void }) =>
  url ? (
    <button onClick={onClick} style={{ border: "1.5px solid #E5E5E5", background: "#FAFAFA", borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 600, color: "#111", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.13s", fontFamily: "inherit" }}
      onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "#111"; b.style.color = "#fff"; b.style.borderColor = "#111"; }}
      onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "#FAFAFA"; b.style.color = "#111"; b.style.borderColor = "#E5E5E5"; }}>
      📄 {label}
    </button>
  ) : (
    <div style={{ border: "1.5px dashed #E8E8E8", borderRadius: 8, padding: "9px 16px", fontSize: 12, color: "#ccc" }}>No {label}</div>
  );

export const DetailModal = ({ type, user, seeker, onClose, onViewDoc }: { type: "users" | "jobseekers"; user?: Profile; seeker?: JobSeeker; onClose: () => void; onViewDoc: (url: string, title: string) => void }) => {
  const profile = type === "users" ? user : seeker?.profiles;
  const name = profile?.name ?? "Unknown";
  const email = profile?.email ?? "—";
  
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 500, boxShadow: "0 24px 60px rgba(0,0,0,0.18)", overflow: "hidden" }}>
        <div style={{ background: "#111", padding: "20px 22px", display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={name} src={type === "jobseekers" ? seeker?.photo_url ?? null : null} size={50} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{name}</div>
            <div style={{ fontSize: 11.5, color: "#777" }}>{email}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#222", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, color: "#777", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px", marginBottom: type === "jobseekers" ? 20 : 0 }}>
            <Field label="Full Name" value={name} />
            <Field label="Email" value={email} />
            <Field label="Account Type" value={profile?.user_type ?? "—"} chip />
            <Field label="User ID" value={(profile?.id ?? "").slice(0, 18) + "…"} mono />
            <Field label="Joined" value={formatDate(profile?.created_at ?? null)} />
            {type === "jobseekers" && seeker && (
              <>
                <Field label="Mobile" value={seeker.mobile ?? "—"} />
                <Field label="Job Type" value={seeker.job_type ?? "—"} chip />
                <Field label="Monthly Charges" value={formatCurrency(seeker.monthly_charges)} bold />
              </>
            )}
          </div>
          {type === "jobseekers" && seeker && (
            <>
              <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.9, color: "#bbb", fontWeight: 600, marginBottom: 10 }}>Uploaded Documents</div>
              <div style={{ display: "flex", gap: 10 }}>
                <DocPillBtn label="Aadhar Card" url={seeker.aadhar_url} onClick={() => seeker.aadhar_url && onViewDoc(seeker.aadhar_url, "Aadhar Card")} />
                <DocPillBtn label="PAN Card" url={seeker.pan_url} onClick={() => seeker.pan_url && onViewDoc(seeker.pan_url, "PAN Card")} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};