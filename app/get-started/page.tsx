"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Plan {
  code: string;
  name: string;
  displayName: string;
  pricePerRoom: number;
  tierSize: number;
  maxRooms: number | null;
  features: string[];
  sortOrder: number;
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

const BASE_FEATURES = [
  "จัดการหอ/ห้อง/ผู้เช่า",
  "บันทึกมิเตอร์น้ำ/ไฟ",
  "ออกบิลรายเดือน",
  "อัปโหลดสลิปชำระเงิน",
  "PDF ใบแจ้งหนี้",
  "Invite code สำหรับผู้เช่า",
];

// Neo-brutalist plan colors - flat, no gradients
const PLAN_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  TRIAL: {
    bg: "bg-[#6BCF7F]",
    border: "border-[#2C3E50]",
    text: "text-[#2C3E50]",
  },
  STARTER: {
    bg: "bg-[#A8D8EA]",
    border: "border-[#2C3E50]",
    text: "text-[#2C3E50]",
  },
  STANDARD: {
    bg: "bg-[#FFB3BA]",
    border: "border-[#2C3E50]",
    text: "text-[#2C3E50]",
  },
  PRO: {
    bg: "bg-[#FFD700]",
    border: "border-[#2C3E50]",
    text: "text-[#2C3E50]",
  },
};

export default function GetStartedPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.sort((a: Plan, b: Plan) => a.sortOrder - b.sortOrder));
      } else {
        setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" });
      }
    } catch {
      setToast({ message: "เกิดข้อผิดพลาดในการโหลด", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "เริ่ม trial ไม่สำเร็จ");
      }

      setToast({ message: "เริ่มทดลองใช้งานสำเร็จ! กำลังพาคุณเข้าสู่ระบบ...", type: "success" });
      
      setTimeout(() => {
        router.push("/app/locations");
      }, 1000);
    } catch (e: unknown) {
      setToast({ 
        message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", 
        type: "error" 
      });
      setStarting(false);
    }
  };

  const handleContactUs = () => {
    setToast({ 
      message: "กรุณาติดต่อทีมงานเพื่อเปิดใช้งาน หรือเริ่มด้วย Trial ก่อน", 
      type: "success" 
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFFFF" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50" }}>กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", padding: 32 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50 }}>
          <div style={{
            border: "4px solid #2C3E50",
            borderRadius: 24,
            padding: "16px 24px",
            background: toast.type === "success" ? "#7FDB9A" : "#FFD93D",
            position: "relative"
          }}>
            <p style={{ fontWeight: 700, color: "#2C3E50" }}>{toast.message}</p>
            <button 
              onClick={() => setToast(null)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                color: "#2C3E50",
                fontWeight: 700,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.125rem"
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ maxWidth: 1280, margin: "0 auto 48px" }}>
        {/* Hero Title */}
        <div style={{
          border: "4px solid #2C3E50",
          borderRadius: 24,
          background: "#FFD93D",
          padding: 48,
          marginBottom: 32,
          textAlign: "center"
        }}>
          <div style={{ fontSize: "5rem", marginBottom: 24 }}>🎉</div>
          <h1 style={{
            fontSize: "3rem",
            fontWeight: 900,
            color: "#2C3E50",
            marginBottom: 16,
            letterSpacing: "-0.02em"
          }}>
            ยินดีต้อนรับสู่ระบบจัดการหอพัก!
          </h1>
          <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2C3E50" }}>
            เลือกแผนที่เหมาะกับคุณเพื่อเริ่มต้นใช้งาน
          </p>
        </div>

        {/* Recommended Badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
          <div style={{
            border: "4px solid #2C3E50",
            borderRadius: 24,
            background: "#7FDB9A",
            padding: "16px 32px"
          }}>
            <p style={{ color: "#2C3E50", fontWeight: 900, fontSize: "1.125rem", textAlign: "center" }}>
              ⭐ แนะนำให้เริ่มด้วย TRIAL 30 วัน ฟรี เพื่อทดลองใช้งาน
            </p>
          </div>
          <button
            onClick={() => router.push("/login")}
            style={{
              border: "4px solid #2C3E50",
              borderRadius: 24,
              background: "#B8D8E8",
              padding: "16px 32px",
              color: "#2C3E50",
              fontWeight: 900,
              fontSize: "1.125rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            🏠 เข้าสู่ระบบผู้เช่า
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div style={{
        maxWidth: 1280,
        margin: "0 auto 48px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 32
      }}>
        {plans.map((plan) => {
          const isTrial = plan.code === "TRIAL";
          const bgColor = plan.code === "TRIAL" ? "#7FDB9A" :
                         plan.code === "STARTER" ? "#B8D8E8" :
                         plan.code === "STANDARD" ? "#FFD93D" : "#FFB3BA";

          return (
            <div
              key={plan.code}
              style={{
                border: "4px solid #2C3E50",
                borderRadius: 24,
                background: "#FFFFFF",
                padding: 24,
                position: "relative",
                boxShadow: isTrial ? "0 0 0 4px #FFD93D" : "none"
              }}
            >
              {/* Recommended Badge for TRIAL */}
              {isTrial && (
                <div style={{
                  position: "absolute",
                  top: -16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 10
                }}>
                  <div style={{
                    border: "3px solid #2C3E50",
                    borderRadius: 16,
                    background: "#FFD93D",
                    padding: "8px 24px",
                    fontWeight: 900,
                    color: "#2C3E50",
                    fontSize: "0.875rem"
                  }}>
                    ⭐ แนะนำ
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div style={{ textAlign: "center", marginBottom: 24, marginTop: 8 }}>
                <div style={{
                  display: "inline-block",
                  border: "4px solid #2C3E50",
                  borderRadius: 24,
                  background: bgColor,
                  padding: "12px 24px",
                  marginBottom: 16
                }}>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50" }}>{plan.displayName}</h3>
                </div>

                <div style={{ marginBottom: 8 }}>
                  {isTrial ? (
                    <>
                      <div style={{ fontSize: "3.75rem", fontWeight: 900, color: "#7FDB9A", marginBottom: 4 }}>ฟรี</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2C3E50" }}>30 วัน</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: "3rem", fontWeight: 900, color: "#2C3E50", marginBottom: 4 }}>
                        {plan.pricePerRoom}
                        <span style={{ fontSize: "1.5rem", marginLeft: 4 }}>฿</span>
                      </div>
                      <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#2C3E50" }}>/ห้อง/เดือน</div>
                    </>
                  )}
                </div>

                {isTrial && plan.maxRooms && (
                  <div style={{
                    marginTop: 8,
                    border: "2px solid #2C3E50",
                    borderRadius: 16,
                    background: "#FFD93D",
                    padding: "8px 16px",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: "#2C3E50"
                  }}>
                    จำกัด {plan.maxRooms} ห้อง
                  </div>
                )}

                {!isTrial && (
                  <div style={{
                    marginTop: 8,
                    border: "2px solid #2C3E50",
                    borderRadius: 16,
                    background: "#FFFFFF",
                    padding: "8px 16px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#2C3E50"
                  }}>
                    ชำระตามจำนวนห้องจริง
                  </div>
                )}
              </div>

              {/* Features List */}
              <div style={{ marginBottom: 24, minHeight: 320 }}>
                {/* Base features */}
                {BASE_FEATURES.map((feat, idx) => (
                  <div key={`base-${idx}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: "1.125rem", flexShrink: 0 }}>✅</span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#2C3E50" }}>{feat}</span>
                  </div>
                ))}

                {/* Plan-specific features */}
                {plan.features.map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: "1.125rem", flexShrink: 0 }}>✨</span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#2C3E50" }}>
                      {FEATURE_LABELS[feat] || feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div style={{ marginTop: 24 }}>
                {isTrial ? (
                  <button
                    style={{
                      width: "100%",
                      border: "4px solid #2C3E50",
                      borderRadius: 16,
                      background: starting ? "#CBD5E1" : bgColor,
                      padding: "20px 24px",
                      fontWeight: 900,
                      fontSize: "1.125rem",
                      color: "#2C3E50",
                      cursor: starting ? "not-allowed" : "pointer",
                      transition: "transform 0.2s"
                    }}
                    onClick={handleStartTrial}
                    disabled={starting}
                    onMouseEnter={(e) => !starting && (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    {starting ? "กำลังเริ่มทดลอง..." : "เริ่มทดลองฟรี 30 วัน"}
                  </button>
                ) : (
                  <button
                    style={{
                      width: "100%",
                      border: "4px solid #2C3E50",
                      borderRadius: 16,
                      background: "#FFFFFF",
                      padding: "20px 24px",
                      fontWeight: 900,
                      fontSize: "1.125rem",
                      color: "#2C3E50",
                      cursor: "pointer",
                      transition: "transform 0.2s"
                    }}
                    onClick={handleContactUs}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    ติดต่อเราเพื่อเปิดใช้งาน
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{
          border: "4px solid #2C3E50",
          borderRadius: 24,
          background: "#FFFFFF",
          padding: 32
        }}>
          <h3 style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            textAlign: "center",
            marginBottom: 24,
            color: "#2C3E50"
          }}>💡 คำแนะนำ</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, color: "#2C3E50" }}>
            <p style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>🎯</span>
              <span style={{ fontWeight: 600 }}>
                เริ่มด้วย <span style={{ fontWeight: 900 }}>Trial ฟรี 30 วัน</span> เพื่อทดลองฟีเจอร์ทั้งหมดก่อนตัดสินใจ
              </span>
            </p>
            <p style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>📊</span>
              <span style={{ fontWeight: 600 }}>
                ราคาคำนวณตามจำนวนห้องจริง — จ่ายเท่าที่ใช้
              </span>
            </p>
            <p style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>🚀</span>
              <span style={{ fontWeight: 600 }}>
                อัปเกรดหรือเปลี่ยนแผนได้ทุกเมื่อในหน้าการจัดการ Subscription
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
