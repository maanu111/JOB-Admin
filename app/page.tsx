"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

type ToastType = "success" | "error" | "loading";
interface ToastItem { id: number; type: ToastType; message: string; }
let _tid = 0;

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#1c0000" : t.type === "loading" ? "#111" : "#001c05",
          color: "#fff", padding: "11px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 9,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)", minWidth: 260, maxWidth: 360,
          border: `1px solid ${t.type === "error" ? "#ff222215" : t.type === "loading" ? "#33333360" : "#00dd3315"}`,
          animation: "tin 0.2s ease",
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "⟳"}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = (message: string, type: ToastType = "success", duration = 3500) => {
    const id = ++_tid;
    setToasts((p) => [...p, { id, type, message }]);
    if (type !== "loading") {
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), duration);
    }
    return id;
  };
  const dismiss = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));
  return { toasts, show, dismiss };
}

export default function AdminAuth() {
  const router = useRouter();
  const { toasts, show, dismiss } = useToast();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/admin-dashboard");
    });
  }, []);

  const switchMode = (m: "signin" | "signup") => {
    setMode(m);
    setName("");
    setEmail("");
    setPassword("");
  };

  const validate = () => {
    if (mode === "signup" && !name.trim()) { show("Please enter your name.", "error"); return false; }
    if (!email.trim()) { show("Please enter your email.", "error"); return false; }
    if (!password) { show("Please enter your password.", "error"); return false; }
    if (password.length < 6) { show("Password must be at least 6 characters.", "error"); return false; }
    return true;
  };

  const handleSignUp = async () => {
    const lid = show("Creating your account...", "loading");
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
        },
      });
      if (error) throw error;

      if (data.user) {
        const { error: insertErr } = await supabase.from("admins").insert({
          auth_id: data.user.id,
          name: name.trim(),
          email: email.trim(),
          role: "admin",
        });
        if (insertErr) console.error("Admins insert:", insertErr.message);
      }

      dismiss(lid);
      show("Account created! Signing you in...", "success");

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) {
        show("Check your email to confirm your account, then sign in.", "success", 6000);
        switchMode("signin");
      } else {
        show("Welcome! Redirecting to dashboard...", "success");
        setTimeout(() => router.push("/admin-dashboard"), 1000);
      }
    } catch (err: any) {
      dismiss(lid);
      show(err.message ?? "Sign up failed. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    const lid = show("Signing in...", "loading");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      dismiss(lid);
      show("Signed in! Redirecting...", "success");
      setTimeout(() => router.push("/admin-dashboard"), 1000);
    } catch (err: any) {
      dismiss(lid);
      show(err.message ?? "Sign in failed. Check your credentials.", "error");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    if (mode === "signup") {
      await handleSignUp();
    } else {
      await handleSignIn();
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #F5F5F5; }
        @keyframes tin { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
        .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: #F5F5F5; }
        .card { background: #fff; border: 1px solid #E8E8E8; border-radius: 14px; width: 100%; max-width: 380px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
        .card-top { background: #111; padding: 28px 28px 24px; }
        .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .brand-dot { width: 8px; height: 8px; border-radius: 50%; background: #fff; }
        .brand-name { font-size: 14px; font-weight: 700; color: #fff; letter-spacing: -0.2px; }
        .card-title { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.4px; margin-bottom: 4px; }
        .card-sub { font-size: 12.5px; color: #666; }
        .card-body { padding: 24px 28px 28px; }
        .toggle { display: flex; background: #F5F5F5; border-radius: 8px; padding: 3px; margin-bottom: 22px; }
        .toggle-btn { flex: 1; padding: 7px; border: none; border-radius: 6px; font-size: 12.5px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.12s; color: #999; background: transparent; }
        .toggle-btn.on { background: #fff; color: #111; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .toggle-btn:disabled { cursor: not-allowed; opacity: 0.5; }
        .field { margin-bottom: 14px; }
        .field-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #999; margin-bottom: 6px; }
        .field-input { width: 100%; border: 1.5px solid #EBEBEB; border-radius: 8px; padding: 10px 13px; font-size: 13.5px; font-family: 'Inter', sans-serif; color: #111; background: #FAFAFA; outline: none; transition: border-color 0.15s, background 0.15s; }
        .field-input::placeholder { color: #ccc; }
        .field-input:focus { border-color: #111; background: #fff; }
        .field-input:disabled { opacity: 0.45; cursor: not-allowed; }
        .divider { border: none; border-top: 1px solid #F0F0F0; margin: 18px 0; }
        .submit-btn { width: 100%; background: #111; color: #fff; border: none; border-radius: 8px; padding: 11px; font-size: 13.5px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; transition: opacity 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .submit-btn:hover:not(:disabled) { opacity: 0.82; }
        .submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn-spin { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.65s linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .footer-note { text-align: center; margin-top: 18px; font-size: 11.5px; color: #bbb; }
        .footer-link { color: #111; font-weight: 600; cursor: pointer; background: none; border: none; font-size: 11.5px; font-family: 'Inter', sans-serif; padding: 0; }
        .footer-link:hover { text-decoration: underline; }
        .footer-link:disabled { opacity: 0.5; cursor: not-allowed; }
        .secure-note { display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 11px; color: #ddd; margin-top: 14px; }
      `}</style>

      <ToastContainer toasts={toasts} />

      <div className="page">
        <div className="card">
          <div className="card-top">
            {/* <div className="brand">
              <div className="brand-dot" />
              <span className="brand-name">WorkAdmin</span>
            </div> */}
            <div className="card-title">
              {mode === "signin" ? "Sign In" : "Create account"}
            </div>
            {/* <div className="card-sub">
              {mode === "signin"
                ? "Sign in to access your admin panel"
                : "Set up your admin account"}
            </div> */}
          </div>

          <div className="card-body">
            <div className="toggle">
              <button
                type="button"
                className={`toggle-btn ${mode === "signin" ? "on" : ""}`}
                onClick={() => switchMode("signin")}
                disabled={loading}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`toggle-btn ${mode === "signup" ? "on" : ""}`}
                onClick={() => switchMode("signup")}
                disabled={loading}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              {/* Name — Sign Up only */}
              {mode === "signup" && (
                <div className="field">
                  <label className="field-label">Full Name</label>
                  <input
                    className="field-input"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    disabled={loading}
                  />
                </div>
              )}

              {/* Email — both modes */}
              <div className="field">
                <label className="field-label">Email Address</label>
                <input
                  className="field-input"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              {/* Password — both modes */}
              <div className="field">
                <label className="field-label">Password</label>
                <input
                  className="field-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  disabled={loading}
                />
              </div>

              <hr className="divider" />

              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="btn-spin" />
                    {mode === "signin" ? "Signing in..." : "Creating account..."}
                  </>
                ) : mode === "signin" ? (
                  "Sign In →"
                ) : (
                  "Create Account →"
                )}
              </button>
            </form>

            <div className="footer-note">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button className="footer-link" onClick={() => switchMode("signup")} disabled={loading}>
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button className="footer-link" onClick={() => switchMode("signin")} disabled={loading}>
                    Sign in
                  </button>
                </>
              )}
            </div>

            {/* <div className="secure-note">🔒 Secured by Supabase Auth</div> */}
          </div>
        </div>
      </div>
    </>
  );
}