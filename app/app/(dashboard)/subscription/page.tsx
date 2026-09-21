"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Toast from "@/components/Toast";

interface SubscriptionData {
  active: boolean;
  status: string | null;
  planCode: string | null;
  planName: string | null;
  planDisplayName: string | null;
  billingCycle: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  roomCount: number;
  roomLimit: number | null;
  features: string[];
  price: number | null;
}

const FEATURE_LABELS: Record<string, string> = {
  room_preset: "Room Preset + Bulk create",
  bulk_create: "สร้างห้องแบบ bulk",
  export_csv: "Export Excel/CSV",
  dashboard: "Dashboard รายงาน",
  email_notify: "อีเมลแจ้งเตือนอัตโนมัติ",
  multi_user: "Multi-user access",
  custom_branding: "Custom branding",
  line_notify: "LINE notification",
  payment_gateway: "Payment gateway",
  api_access: "API access",
  priority_support: "Priority support",
  advanced_reports: "Advanced reports",
};

const PLAN_COLORS: Record<string, string> = {
  TRIAL: "#7FDB9A",
  STARTER: "#B8D8E8",
  STANDARD: "#FFD93D",
  PRO: "#FF9A8B",
};

function formatPrice(amount: number): string {
  return amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SubscriptionPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setToast({ message: json.error || "โหลดข้อมูลล้มเหลว", type: "error" });
      }
    } catch {
      setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setCanceling(true);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ยกเลิกไม่สำเร็จ");
      setToast({ message: "ยกเลิกสมัครสมาชิกสำเร็จ คุณยังใช้งานได้จนถึงสิ้นรอบ", type: "success" });
      setCancelModal(false);
      loadSubscription();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 64, fontSize: "1.125rem", color: "#2C3E50", fontWeight: 700 }}>
        กำลังโหลด...
      </div>
    );
  }

  if (!data || !data.active) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 20px" }}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div
          style={{
            maxWidth: 520,
            margin: "8px auto 0",
            textAlign: "center",
            padding: "48px 40px",
            background: "#FFFFFF",
            border: "4px solid #2C3E50",
            borderRadius: 24,
          }}
        >
          <div style={{ fontSize: "5rem", marginBottom: 16 }}>📦</div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#2C3E50", marginBottom: 12 }}>
            คุณยังไม่มีแผนสมัครสมาชิก
          </h2>
          <p style={{ color: "#2C3E50", fontSize: "1rem", lineHeight: 1.7, marginBottom: 24, fontWeight: 600 }}>
            เริ่มต้นใช้งานด้วยการเลือกแผนที่เหมาะสมกับคุณ
          </p>
          <Link
            href="/app/subscription/plans"
            style={{
              display: "inline-block",
              padding: "16px 32px",
              borderRadius: 20,
              fontSize: "1.125rem",
              fontWeight: 900,
              background: "#7FDB9A",
              border: "4px solid #2C3E50",
              color: "#2C3E50",
              textDecoration: "none",
            }}
          >
            เลือกแผนสมัครสมาชิก
          </Link>
        </div>
      </div>
    );
  }

  const isTrial = data.status === "TRIAL";
  const isCanceled = data.status === "CANCELED";
  const planCode = data.planCode || "TRIAL";
  const planColor = PLAN_COLORS[planCode] || PLAN_COLORS.TRIAL;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 20px" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page Header */}
      <div style={{ marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "3rem" }}>💳</span>
          สมัครสมาชิก
        </h1>
      </div>

      {/* Hero Card - Current Plan */}
      <div style={{ marginBottom: 24, background: planColor, border: "4px solid #2C3E50", borderRadius: 24, overflow: "hidden" }}>
        <div style={{ padding: "32px 28px" }}>
          {/* Status Badge */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  background: "#FFFFFF",
                  borderRadius: 16,
                  border: "3px solid #2C3E50",
                  marginBottom: 16,
                }}
              >
                <span style={{ fontWeight: 900, fontSize: "0.875rem", color: "#2C3E50" }}>
                  {isTrial ? "🎉 ทดลองใช้" : isCanceled ? "⚠️ ยกเลิกแล้ว" : "✅ ใช้งานอยู่"}
                </span>
              </div>
              <h2 style={{ fontSize: "3rem", fontWeight: 900, color: "#2C3E50", marginBottom: 8, margin: 0 }}>
                {data.planDisplayName || data.planName}
              </h2>
              {isTrial && (
                <p style={{ fontSize: "1.25rem", color: "#2C3E50", fontWeight: 700, margin: 0 }}>ฟรี 30 วันแรก!</p>
              )}
            </div>
            {data.price !== null && !isTrial && (
              <div style={{ textAlign: "right", background: "#FFFFFF", border: "3px solid #2C3E50", borderRadius: 20, padding: "20px 24px" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#2C3E50" }}>{formatPrice(data.price)}</div>
                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#2C3E50" }}>
                  บาท/{data.billingCycle === "YEARLY" ? "ปี" : "เดือน"}
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {/* Billing Cycle */}
            <div style={{ background: "#FFFFFF", borderRadius: 20, border: "3px solid #2C3E50", padding: 20 }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#64748B", marginBottom: 4 }}>รอบการชำระ</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50" }}>
                {data.billingCycle === "YEARLY" ? "รายปี" : "รายเดือน"}
              </div>
              {data.billingCycle === "YEARLY" && (
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#16A34A", marginTop: 4 }}>ประหยัด 2 เดือน</div>
              )}
            </div>

            {/* Room Usage */}
            <div style={{ background: "#FFFFFF", borderRadius: 20, border: "3px solid #2C3E50", padding: 20 }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#64748B", marginBottom: 4 }}>จำนวนห้อง</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50" }}>
                {data.roomCount} / {data.roomLimit || "∞"}
              </div>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#64748B", marginTop: 4 }}>ห้องที่ใช้งาน</div>
            </div>

            {/* Next Billing */}
            <div style={{ background: "#FFFFFF", borderRadius: 20, border: "3px solid #2C3E50", padding: 20 }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#64748B", marginBottom: 4 }}>
                {isTrial ? "ทดลองใช้จนถึง" : isCanceled ? "ใช้งานได้จนถึง" : "รอบถัดไป"}
              </div>
              <div style={{ fontSize: "1.125rem", fontWeight: 900, color: "#2C3E50" }}>
                {formatDate(isTrial ? data.trialEndsAt : data.currentPeriodEnd)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Card */}
      <div style={{ marginBottom: 24, background: "#FFFFFF", borderRadius: 24, border: "4px solid #2C3E50", padding: "32px 28px" }}>
        <h3 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: 24, color: "#2C3E50", margin: "0 0 24px 0" }}>ฟีเจอร์ที่มีในแผนนี้</h3>
        
        {/* Base Features */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, marginBottom: 24 }}>
          {["จัดการหอ/ห้อง/ผู้เช่า", "บันทึกมิเตอร์น้ำ/ไฟ", "ออกบิลรายเดือน", "PDF ใบแจ้งหนี้"].map((feat, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: planColor,
                  borderRadius: "50%",
                  border: "3px solid #2C3E50",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ color: "#2C3E50", fontSize: "1.25rem", fontWeight: 900 }}>✓</span>
              </div>
              <span style={{ fontWeight: 700, color: "#2C3E50" }}>{feat}</span>
            </div>
          ))}
        </div>

        {/* Plan-specific Features */}
        {data.features.length > 0 && (
          <div style={{ borderTop: "3px solid #2C3E50", paddingTop: 24 }}>
            <h4 style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: 16, color: "#2C3E50", margin: "0 0 16px 0" }}>🎁 ฟีเจอร์พิเศษ</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
              {data.features.map((feat) => (
                <div key={feat} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: planColor,
                      borderRadius: "50%",
                      border: "3px solid #2C3E50",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: "#2C3E50", fontSize: "1.25rem", fontWeight: 900 }}>✓</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "#2C3E50" }}>{FEATURE_LABELS[feat] || feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
        <Link
          href="/app/subscription/plans"
          style={{
            flex: 1,
            minWidth: 200,
            textAlign: "center",
            padding: "16px 32px",
            background: "#B8D8E8",
            color: "#2C3E50",
            fontSize: "1.125rem",
            fontWeight: 900,
            borderRadius: 20,
            border: "4px solid #2C3E50",
            textDecoration: "none",
            display: "block",
          }}
        >
          เปลี่ยนแผน
        </Link>
        
        {!isCanceled && (
          <button
            onClick={() => setCancelModal(true)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: "16px 32px",
              background: "#FFFFFF",
              color: "#DC2626",
              fontSize: "1.125rem",
              fontWeight: 900,
              borderRadius: 20,
              border: "4px solid #DC2626",
              cursor: "pointer",
            }}
          >
            ยกเลิกสมัครสมาชิก
          </button>
        )}
      </div>

      {/* Cancel Modal */}
      {cancelModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setCancelModal(false)}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "4px solid #2C3E50",
              borderRadius: 24,
              maxWidth: 520,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "#FF9A8B",
                padding: "20px 24px",
                borderBottom: "3px solid #2C3E50",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50", margin: 0 }}>ยืนยันการยกเลิก</h3>
              <button
                onClick={() => setCancelModal(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "3px solid #2C3E50",
                  background: "#FFFFFF",
                  color: "#2C3E50",
                  fontSize: "1.25rem",
                  fontWeight: 900,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "32px 28px", textAlign: "center" }}>
              <div style={{ fontSize: "4rem", marginBottom: 16 }}>⚠️</div>
              <h4 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50", marginBottom: 16, margin: "0 0 16px 0" }}>
                คุณแน่ใจว่าต้องการยกเลิก?
              </h4>
              <div style={{ background: "#FEF3C7", borderRadius: 20, border: "3px solid #F59E0B", padding: 16, marginBottom: 24 }}>
                <p style={{ color: "#2C3E50", fontWeight: 700, margin: 0 }}>
                  คุณยังใช้งานได้จนถึง<br />
                  <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "#2C3E50" }}>{formatDate(data.currentPeriodEnd)}</span>
                </p>
                <p style={{ fontSize: "0.875rem", color: "#64748B", marginTop: 8, fontWeight: 600, margin: "8px 0 0 0" }}>
                  แต่จะไม่ต่ออายุอัตโนมัติ
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: "flex", gap: 12, padding: "16px 20px", borderTop: "3px solid #2C3E50", background: "#FFF8F0" }}>
              <button
                onClick={() => setCancelModal(false)}
                disabled={canceling}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  background: "#FFFFFF",
                  color: "#2C3E50",
                  fontWeight: 900,
                  borderRadius: 16,
                  border: "3px solid #2C3E50",
                  cursor: canceling ? "not-allowed" : "pointer",
                  opacity: canceling ? 0.5 : 1,
                }}
              >
                ย้อนกลับ
              </button>
              <button
                onClick={handleCancel}
                disabled={canceling}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  background: "#FFFFFF",
                  color: "#DC2626",
                  fontWeight: 900,
                  borderRadius: 16,
                  border: "3px solid #DC2626",
                  cursor: canceling ? "not-allowed" : "pointer",
                  opacity: canceling ? 0.5 : 1,
                }}
              >
                {canceling ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
