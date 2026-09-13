"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        return;
      }
      router.push("/admin/locations");
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg-light)", padding: "var(--space-lg) var(--space-md)" }}>
      <div className="card" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          </svg>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
            ApartmentOAT Admin
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: 4 }}>
            เข้าสู่ระบบผู้ดูแล
          </p>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", color: "var(--color-error)", borderRadius: "var(--border-radius)", marginBottom: 16, fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="username">ชื่อผู้ใช้</label>
            <input
              id="username"
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="username"
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <a href="/tenant/login" style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
            เข้าสู่ระบบผู้เช่า →
          </a>
        </div>
      </div>
    </div>
  );
}
