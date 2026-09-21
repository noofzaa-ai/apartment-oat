"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Toast from "@/components/Toast";

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

interface CurrentSubscription {
  planCode: string | null;
  roomCount: number;
  status: string | null;
}

type BillingCycle = "MONTHLY" | "YEARLY";

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

// Plan color gradients (claymorphism style)
const PLAN_COLORS: Record<string, { gradient: string; shadow: string; border: string }> = {
  TRIAL: {
    gradient: "bg-gradient-to-br from-green-400 via-emerald-400 to-teal-400",
    shadow: "shadow-[8px_8px_0px_0px_rgba(16,185,129,0.5)]",
    border: "border-green-600",
  },
  STARTER: {
    gradient: "bg-gradient-to-br from-blue-400 via-cyan-400 to-sky-400",
    shadow: "shadow-[8px_8px_0px_0px_rgba(59,130,246,0.5)]",
    border: "border-blue-600",
  },
  STANDARD: {
    gradient: "bg-gradient-to-br from-purple-400 via-violet-400 to-fuchsia-400",
    shadow: "shadow-[8px_8px_0px_0px_rgba(168,85,247,0.5)]",
    border: "border-purple-600",
  },
  PRO: {
    gradient: "bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400",
    shadow: "shadow-[8px_8px_0px_0px_rgba(251,146,60,0.5)]",
    border: "border-orange-600",
  },
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<Plan | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, subRes] = await Promise.all([
        fetch("/api/admin/plans"),
        fetch("/api/subscription"),
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.sort((a: Plan, b: Plan) => a.sortOrder - b.sortOrder));
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        setCurrentSub({
          planCode: subData.planCode || null,
          roomCount: subData.roomCount || 0,
          status: subData.status || null,
        });
      }
    } catch {
      setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setConfirmModal(plan);
  };

  const handleConfirmUpgrade = async () => {
    if (!confirmModal) return;
    setUpgrading(confirmModal.code);
    try {
      const res = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: confirmModal.code,
          billingCycle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เปลี่ยนแผนไม่สำเร็จ");
      
      setToast({ message: "เปลี่ยนแผนสำเร็จ", type: "success" });
      setConfirmModal(null);
      
      setTimeout(() => {
        window.location.href = "/app/subscription";
      }, 1000);
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally {
      setUpgrading(null);
    }
  };

  const getPlanPrice = (plan: Plan): number | null => {
    if (plan.code === "TRIAL") return null;
    const roomCount = currentSub?.roomCount || 1;
    const effectiveRoomCount = Math.max(roomCount, 1);
    
    const tierIndex = Math.floor((effectiveRoomCount - 1) / plan.tierSize);
    const tierRoomCount = (tierIndex + 1) * plan.tierSize;
    const monthlyPrice = tierRoomCount * plan.pricePerRoom;
    
    return billingCycle === "YEARLY" ? monthlyPrice * 10 : monthlyPrice;
  };

  const formatPrice = (amount: number): string => {
    return amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const getPlanButton = (plan: Plan) => {
    const isCurrent = currentSub?.planCode === plan.code;
    const isTrial = plan.code === "TRIAL";
    const colors = PLAN_COLORS[plan.code] || PLAN_COLORS.STARTER;

    if (isCurrent) {
      return (
        <button 
          className={`w-full px-6 py-4 rounded-2xl border-4 border-black font-bold text-lg transition-transform hover:translate-y-[-2px] bg-gray-200 text-gray-600 cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
          disabled
        >
          แผนปัจจุบัน
        </button>
      );
    }

    if (isTrial) {
      return (
        <button 
          className={`w-full px-6 py-4 rounded-2xl border-4 border-black font-bold text-lg bg-gray-100 text-gray-500 cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
          disabled
        >
          ทดลองใช้ครั้งเดียว
        </button>
      );
    }

    return (
      <button
        className={`w-full px-6 py-4 rounded-2xl border-4 border-black font-bold text-lg transition-all hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] ${colors.gradient} ${colors.shadow} text-white`}
        onClick={() => handleSelectPlan(plan)}
      >
        เลือกแผนนี้
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-bold">กำลังโหลด...</div>
      </div>
    );
  }

  const roomCount = currentSub?.roomCount || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="mb-4">
          <Link href="/app/subscription" className="text-purple-600 hover:text-purple-800 font-semibold">
            ← กลับ
          </Link>
        </div>
        
        {/* Title with clay effect */}
        <div className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 rounded-3xl border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-white text-center mb-3">
            เลือกแผนที่เหมาะกับคุณ
          </h1>
          <p className="text-center text-white text-lg font-semibold">
            คุณมีห้องอยู่ <span className="text-yellow-300 font-black">{roomCount} ห้อง</span> — ราคาจะคำนวณตามจำนวนห้อง
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-3xl border-4 border-black p-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] inline-flex gap-2">
            <button
              className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${
                billingCycle === "MONTHLY"
                  ? "bg-gradient-to-r from-purple-400 to-pink-400 text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setBillingCycle("MONTHLY")}
            >
              รายเดือน
            </button>
            <button
              className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all relative ${
                billingCycle === "YEARLY"
                  ? "bg-gradient-to-r from-purple-400 to-pink-400 text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-transparent text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setBillingCycle("YEARLY")}
            >
              รายปี
              <span className="ml-2 px-3 py-1 bg-yellow-400 text-black text-sm font-black rounded-xl border-2 border-black">
                ประหยัด 2 เดือน
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {plans.map((plan) => {
          const price = getPlanPrice(plan);
          const isCurrent = currentSub?.planCode === plan.code;
          const isTrial = plan.code === "TRIAL";
          const colors = PLAN_COLORS[plan.code] || PLAN_COLORS.STARTER;
          
          // Calculate tier info for display
          const effectiveRoomCount = Math.max(roomCount, 1);
          const tierIndex = Math.floor((effectiveRoomCount - 1) / plan.tierSize);
          const tierRoomCount = (tierIndex + 1) * plan.tierSize;

          return (
            <div
              key={plan.code}
              className={`bg-white rounded-3xl border-4 border-black p-6 transition-all hover:translate-y-[-4px] ${colors.shadow} hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative`}
            >
              {/* Current Plan Badge */}
              {isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-2 rounded-2xl border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-white text-sm">
                    แผนปัจจุบัน
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6 mt-2">
                <div className={`inline-block px-6 py-3 rounded-2xl border-4 ${colors.border} mb-4 ${colors.gradient} ${colors.shadow}`}>
                  <h3 className="text-2xl font-black text-white">{plan.displayName}</h3>
                </div>
                
                <div className="mb-2">
                  {isTrial ? (
                    <>
                      <div className="text-5xl font-black text-green-600 mb-1">ฟรี</div>
                      <div className="text-lg font-bold text-gray-600">30 วัน</div>
                    </>
                  ) : price !== null ? (
                    <>
                      <div className="text-5xl font-black text-gray-800 mb-1">
                        {formatPrice(price)}
                        <span className="text-2xl ml-1">฿</span>
                      </div>
                      <div className="text-lg font-bold text-gray-600">
                        /{billingCycle === "YEARLY" ? "ปี" : "เดือน"}
                      </div>
                      {billingCycle === "YEARLY" && (
                        <div className="text-sm font-semibold text-purple-600 mt-1">
                          ~{formatPrice(Math.round(price / 12))} บาท/เดือน
                        </div>
                      )}
                    </>
                  ) : null}
                </div>

                {/* Tier calculation display */}
                {!isTrial && (
                  <div className="bg-gray-100 rounded-xl border-2 border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                    {plan.pricePerRoom}฿/ห้อง × {tierRoomCount} ห้อง
                  </div>
                )}

                {isTrial && plan.maxRooms && (
                  <div className="mt-2 bg-yellow-100 rounded-xl border-2 border-yellow-400 px-4 py-2 text-sm font-bold text-yellow-800">
                    จำกัด {plan.maxRooms} ห้อง
                  </div>
                )}
              </div>

              {/* Features List */}
              <div className="mb-6 space-y-2 min-h-[300px]">
                {/* Base features */}
                {BASE_FEATURES.map((feat, idx) => (
                  <div key={`base-${idx}`} className="flex items-start gap-2">
                    <span className="text-xl flex-shrink-0">✅</span>
                    <span className="text-sm font-semibold text-gray-700">{feat}</span>
                  </div>
                ))}
                
                {/* Plan-specific features */}
                {plan.features.map((feat) => (
                  <div key={feat} className="flex items-start gap-2">
                    <span className="text-xl flex-shrink-0">✨</span>
                    <span className="text-sm font-bold text-purple-700">{FEATURE_LABELS[feat] || feat}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div className="mt-6">
                {getPlanButton(plan)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-8 relative">
            <button 
              className="absolute top-4 right-4 text-3xl font-bold hover:text-red-600 transition-colors"
              onClick={() => setConfirmModal(null)}
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-3xl font-black text-gray-800 mb-2">ยืนยันการเปลี่ยนแผน</h2>
              <p className="text-lg text-gray-600">
                คุณต้องการเปลี่ยนเป็นแผน <span className="font-bold text-purple-600">{confirmModal.displayName}</span> ใช่หรือไม่?
              </p>
            </div>

            {getPlanPrice(confirmModal) !== null && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-3 border-purple-200 p-6 mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">แผน</span>
                  <span className="font-bold text-gray-800">{confirmModal.displayName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">จำนวนห้อง</span>
                  <span className="font-bold text-gray-800">{roomCount} ห้อง</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">รอบการชำระ</span>
                  <span className="font-bold text-gray-800">{billingCycle === "YEARLY" ? "รายปี" : "รายเดือน"}</span>
                </div>
                <div className="border-t-2 border-purple-200 pt-3 flex justify-between items-center">
                  <span className="font-bold text-lg text-gray-800">ราคา</span>
                  <span className="font-black text-2xl text-purple-600">
                    {formatPrice(getPlanPrice(confirmModal)!)} บาท
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                className="flex-1 px-6 py-4 rounded-2xl border-4 border-black font-bold text-lg bg-gray-200 hover:bg-gray-300 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px]"
                onClick={() => setConfirmModal(null)}
                disabled={upgrading !== null}
              >
                ยกเลิก
              </button>
              <button
                className="flex-1 px-6 py-4 rounded-2xl border-4 border-black font-bold text-lg bg-gradient-to-r from-green-400 to-emerald-500 text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                onClick={handleConfirmUpgrade}
                disabled={upgrading !== null}
              >
                {upgrading ? "กำลังเปลี่ยนแผน..." : "ยืนยันการเปลี่ยนแผน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
