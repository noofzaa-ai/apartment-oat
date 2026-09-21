"use client";

import { useState, useEffect } from "react";
import Toast from "@/components/Toast";

interface MeterReading {
  id: number;
  roomId: number;
  period: string;
  waterReading: number;
  electricReading: number;
}

interface BillWithMeters {
  id: number;
  period: string;
  baseRent: number;
  waterUnits: number;
  waterCost: number;
  electricUnits: number;
  electricCost: number;
  optionsCost: number;
  total: number;
  paymentStatus: "PAID" | "UNPAID" | "SUBMITTED";
  paidAt: string | null;
  paymentRejectionReason: string | null;
  currReading: MeterReading | null;
  prevReading: MeterReading | null;
}

interface HistoryData {
  tenant: { id: number; name: string };
  room: { id: number; roomNumber: string; location: { name: string } } | null;
  bills: BillWithMeters[];
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function thaiPeriod(period: string) {
  const [y, m] = period.split("-");
  const thaiYear = Number(y) + 543;
  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  return `${monthNames[Number(m) - 1]} ${thaiYear}`;
}

function shortMonthThai(period: string) {
  const [, m] = period.split("-");
  const short = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return short[Number(m) - 1];
}

function thaiYearFromPeriod(period: string) {
  return String(Number(period.split("-")[0]) + 543);
}

export default function TenantHistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openBillId, setOpenBillId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    fetch("/api/tenant/bills")
      .then((r) => r.json())
      .then((d: HistoryData) => setData(d))
      .catch(() => setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const toggleBill = (billId: number) => {
    setOpenBillId((prev) => (prev === billId ? null : billId));
  };

  const handleDownloadPdf = (bill: BillWithMeters) => {
    window.open(`/api/tenant/bills/${bill.id}/pdf`, "_blank");
    setToast({ message: `ดาวน์โหลดบิล ${thaiPeriod(bill.period)}`, type: "info" });
  };

  const bills = data?.bills ?? [];
  const room = data?.room;
  const paidCount = bills.filter((b) => b.paymentStatus === "PAID").length;
  const unpaidCount = bills.filter((b) => b.paymentStatus !== "PAID").length;

  if (loading) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px", textAlign: "center", color: "#475569" }}>
        กำลังโหลด...
      </main>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 20px" }} id="main-content">

        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "-0.02em", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "3rem" }}>📄</span>
            ประวัติบิล
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#2C3E50", marginTop: 8, fontWeight: 700 }}>
            {room ? `ห้อง ${room.roomNumber} · ${room.location.name} · ` : ""}
            คลิกที่บิลเพื่อดูรายละเอียดมิเตอร์
          </p>
        </div>

        {/* Summary stats */}
        <div
          role="region"
          aria-label="สรุปประวัติการชำระ"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginBottom: 32 }}
        >
          <StatBox value={String(bills.length)} label="บิลทั้งหมด" icon="📊" />
          <StatBox value={String(paidCount)} label="ชำระแล้ว" color="#2C3E50" icon="💰" />
          <StatBox value={String(unpaidCount)} label="ค้างชำระ" color="#2C3E50" icon="📄" />
        </div>

        {bills.length === 0 ? (
          <div style={{ background: "linear-gradient(135deg, #ffffff 0%, #fefcfb 100%)", border: "none", borderRadius: 24, padding: 56, textAlign: "center", color: "#475569", boxShadow: "0 8px 32px rgba(15,23,42,0.08)" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>📄</div>
            ยังไม่มีประวัติบิล
          </div>
        ) : (
          <div role="list" aria-label="รายการบิลย้อนหลัง" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {bills.map((bill) => {
              const isOpen = openBillId === bill.id;
              const isPaid = bill.paymentStatus === "PAID";
              const isSubmitted = bill.paymentStatus === "SUBMITTED";
              const badgeColor = isPaid
                ? { bg: "#7FDB9A", border: "#2C3E50", text: "#2C3E50" }
                : isSubmitted
                ? { bg: "#B8D8E8", border: "#2C3E50", text: "#2C3E50" }
                : { bg: "#FFD93D", border: "#2C3E50", text: "#2C3E50" };
              const monthBadgeColor = "#2C3E50";
              const monthBadgeBg = isPaid ? "#7FDB9A" : isSubmitted ? "#B8D8E8" : "#FFD93D";

              return (
                <div
                  key={bill.id}
                  role="listitem"
                  style={{
                    background: "#FFFFFF", 
                    border: "4px solid #2C3E50",
                    borderRadius: 24, 
                    overflow: "hidden",
                    transition: "transform 200ms ease",
                  }}
                >
                  {/* Clickable header */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-controls={`detail-${bill.id}`}
                    onClick={() => toggleBill(bill.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleBill(bill.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 18,
                      padding: "22px 24px", cursor: "pointer", userSelect: "none",
                    }}
                  >
                    {/* Month badge */}
                    <div style={{
                      width: 64, 
                      height: 64, 
                      borderRadius: 16, 
                      background: monthBadgeBg,
                      border: "3px solid #2C3E50",
                      display: "flex", 
                      flexDirection: "column", 
                      alignItems: "center", 
                      justifyContent: "center",
                      flexShrink: 0, 
                      lineHeight: 1,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: monthBadgeColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {shortMonthThai(bill.period)}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: monthBadgeColor }}>
                        {thaiYearFromPeriod(bill.period)}
                      </span>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#2C3E50", marginBottom: 4 }}>
                        {thaiPeriod(bill.period)}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#2C3E50", fontWeight: 700 }}>
                        {isPaid && bill.paidAt
                          ? `ชำระ ${new Date(bill.paidAt).toLocaleDateString("th-TH")}`
                          : isSubmitted
                          ? "รอแอดมินยืนยันสลิป"
                          : bill.paymentRejectionReason
                          ? `ถูกปฏิเสธ: ${bill.paymentRejectionReason}`
                          : "ยังไม่ชำระ"}
                      </div>
                    </div>

                    {/* Right: amount + badge + chevron */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                      <div>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: "1.5rem",
                          fontWeight: 900, fontVariantNumeric: "tabular-nums", color: "#2C3E50", textAlign: "right",
                        }}>
                          {fmt(bill.total)} ฿
                        </div>
                        <div style={{ textAlign: "right", marginTop: 6 }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "6px 14px", borderRadius: 16,
                            fontSize: "0.875rem", fontWeight: 800,
                            background: badgeColor.bg, border: `4px solid ${badgeColor.border}`, color: badgeColor.text,
                          }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: badgeColor.text, flexShrink: 0 }} />
                            {isPaid ? "จ่ายแล้ว" : isSubmitted ? "รอยืนยัน" : "ค้างชำระ"}
                          </span>
                        </div>
                      </div>
                      <svg
                        viewBox="0 0 24 24" width="24" height="24"
                        fill="none" stroke="#2C3E50" strokeWidth="3" strokeLinecap="round"
                        aria-hidden="true"
                        style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* Expandable detail */}
                  {isOpen && (
                    <div id={`detail-${bill.id}`}>
                      {bill.currReading && (
                        <div style={{ padding: "20px 24px", background: "#FFF8F0", borderTop: "3px solid #2C3E50" }}>
                          <div style={{ fontSize: "1rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: 16 }}>
                            มิเตอร์เดือนนี้
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            {/* Water */}
                            <div style={{ background: "#B8D8E8", border: "3px solid #2C3E50", borderRadius: 16, padding: "16px 20px" }}>
                              <div style={{ fontSize: "0.875rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#2C3E50", marginBottom: 12 }}>
                                น้ำประปา
                              </div>
                              {bill.prevReading && (
                                <MeterRow label="เดือนก่อน" value={bill.prevReading.waterReading} />
                              )}
                              <MeterRow label="เดือนนี้" value={bill.currReading.waterReading} />
                              <span style={{
                                display: "inline-block", marginTop: 10,
                                padding: "6px 12px", borderRadius: 12,
                                fontSize: 13, fontWeight: 900, fontFamily: "monospace",
                                background: "#2C3E50", color: "#FFFFFF", border: "2px solid #2C3E50",
                              }}>
                                ใช้ {bill.waterUnits} หน่วย
                              </span>
                            </div>
                            {/* Electric */}
                            <div style={{ background: "#FFD93D", border: "3px solid #2C3E50", borderRadius: 16, padding: "16px 20px" }}>
                              <div style={{ fontSize: "0.875rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#2C3E50", marginBottom: 12 }}>
                                ไฟฟ้า
                              </div>
                              {bill.prevReading && (
                                <MeterRow label="เดือนก่อน" value={bill.prevReading.electricReading} />
                              )}
                              <MeterRow label="เดือนนี้" value={bill.currReading.electricReading} />
                              <span style={{
                                display: "inline-block", marginTop: 10,
                                padding: "6px 12px", borderRadius: 12,
                                fontSize: 13, fontWeight: 900, fontFamily: "monospace",
                                background: "#2C3E50", color: "#FFFFFF", border: "2px solid #2C3E50",
                              }}>
                                ใช้ {bill.electricUnits} หน่วย
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 12, padding: "16px 24px", borderTop: "3px solid #2C3E50", background: "#FFF8F0" }}>
                        <button
                          style={{
                            padding: "12px 24px",
                            background: "#B8D8E8",
                            border: "3px solid #2C3E50",
                            borderRadius: 16,
                            fontSize: "1rem",
                            fontWeight: 900,
                            color: "#2C3E50",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                          onClick={() => handleDownloadPdf(bill)}
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          ดาวน์โหลด PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function StatBox({ value, label, color, icon }: { value: string; label: string; color?: string; icon?: string }) {
  return (
    <div style={{
      background: "#FFFFFF", 
      border: "4px solid #2C3E50", 
      borderRadius: 20,
      padding: "22px 20px", 
      textAlign: "center",
    }}>
      {icon && <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>{icon}</div>}
      <div style={{
        fontSize: "2rem", fontWeight: 900, fontFamily: "'JetBrains Mono', monospace",
        fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1.25,
        color: color ?? "#2C3E50",
      }}>
        {value}
      </div>
      <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#2C3E50", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 8 }}>
        {label}
      </div>
    </div>
  );
}

function MeterRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "#2C3E50", marginBottom: 6, fontWeight: 700 }}>
      <span>{label}</span>
      <span style={{ fontFamily: "monospace", fontVariantNumeric: "tabular-nums", fontWeight: 900, color: "#2C3E50" }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}
