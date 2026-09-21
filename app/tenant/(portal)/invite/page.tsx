"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";

export default function TenantInvitePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setToast({ message: "กรุณากรอกรหัสเชิญ", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tenant/invites/${code.trim()}/claim`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถใช้รหัสเชิญได้");
      }

      setToast({ message: "เข้าร่วมหอพักสำเร็จ!", type: "success" });
      setTimeout(() => {
        router.push(data.redirectTo || "/tenant/dashboard");
      }, 1000);
    } catch (e: unknown) {
      setToast({
        message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "56px 20px" }}>
        {/* Page heading */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: 16 }}>🔑</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "#2C3E50", marginBottom: 12 }}>
            ใช้ Invite Code
          </h1>
          <p style={{ fontSize: "1rem", color: "#2C3E50", fontWeight: 600 }}>
            กรอกรหัสเชิญที่ได้รับจากเจ้าของหอพัก
          </p>
        </div>

        {/* Form card - neo-brutalist */}
        <div
          style={{
            background: "#FFFFFF",
            border: "4px solid #2C3E50",
            borderRadius: 16,
            padding: "40px 32px",
          }}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="invite-code"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "#2C3E50",
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                รหัสเชิญ (Invite Code)
              </label>
              <input
                id="invite-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="เช่น ABC123XYZ"
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  border: "3px solid #2C3E50",
                  borderRadius: 12,
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "#2C3E50",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.1em",
                  textAlign: "center",
                  textTransform: "uppercase",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#F8F9FA",
                }}
                autoComplete="off"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !code.trim()}
              style={{
                width: "100%",
                padding: "16px 24px",
                border: "3px solid #2C3E50",
                borderRadius: 12,
                fontSize: "1rem",
                fontWeight: 900,
                color: "#2C3E50",
                background: submitting || !code.trim() ? "#E2E8F0" : "#A8D8EA",
                cursor: submitting || !code.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {submitting ? (
                "กำลังตรวจสอบ..."
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  ยืนยันรหัสเชิญ
                </>
              )}
            </button>
          </form>

          {/* Help text */}
          <div
            style={{
              marginTop: 24,
              padding: 20,
              background: "#FEF3C7",
              border: "3px solid #2C3E50",
              borderRadius: 12,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>💡</span>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#2C3E50", marginBottom: 6 }}>
                  ไม่มีรหัสเชิญ?
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#2C3E50", fontWeight: 600, lineHeight: 1.5 }}>
                  ติดต่อเจ้าของหอพักเพื่อขอรหัสเชิญ หรือสร้างหอพักของคุณเองได้ที่ปุ่มด้านล่าง
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alternative action */}
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", color: "#64748B", marginBottom: 16, fontWeight: 600 }}>
            หรือ
          </p>
          <a
            href="/app/(dashboard)/locations"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              borderRadius: 12,
              textDecoration: "none",
              color: "#2C3E50",
              background: "#6BCF7F",
              border: "3px solid #2C3E50",
              fontSize: "0.9375rem",
              fontWeight: 900,
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
            สร้างหอพักของคุณเอง
          </a>
        </div>
      </main>
    </>
  );
}
