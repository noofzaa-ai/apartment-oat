"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TenantLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", pin: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/tenant-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        return;
      }
      router.push("/tenant/dashboard");
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
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
            ApartmentOAT
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: 4 }}>
            เข้าสู่ระบบผู้เช่า
          </p>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", color: "var(--color-error)", borderRadius: "var(--border-radius)", marginBottom: 16, fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="email">อีเมล</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="pin">PIN (6 หลัก)</label>
            <input
              id="pin"
              type="password"
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
              placeholder="••••••"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-success" disabled={loading} style={{ width: "100%" }}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <a href="/admin/login" style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
            เข้าสู่ระบบผู้ดูแล →
          </a>
        </div>
      </div>
    </div>
  );
}
