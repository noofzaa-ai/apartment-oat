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

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }} id="main-content">

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: 4 }}>
            ประวัติบิล
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "#475569" }}>
            {room ? `ห้อง ${room.roomNumber} · ${room.location.name} · ` : ""}
            คลิกที่บิลเพื่อดูรายละเอียดมิเตอร์
          </p>
        </div>

        {/* Summary stats */}
        <div
          role="region"
          aria-label="สรุปประวัติการชำระ"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}
        >
          <StatBox value={String(bills.length)} label="บิลทั้งหมด" />
          <StatBox value={String(paidCount)} label="ชำระแล้ว" color="#059669" />
          <StatBox value={String(unpaidCount)} label="ค้างชำระ" color="#D97706" />
        </div>

        {bills.length === 0 ? (
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 48, textAlign: "center", color: "#475569" }}>
            ยังไม่มีประวัติบิล
          </div>
        ) : (
          <div role="list" aria-label="รายการบิลย้อนหลัง" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bills.map((bill) => {
              const isOpen = openBillId === bill.id;
              const isPaid = bill.paymentStatus === "PAID";
              const isSubmitted = bill.paymentStatus === "SUBMITTED";
              const badgeColor = isPaid
                ? { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669" }
                : isSubmitted
                ? { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" }
                : { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706" };
              const monthBadgeColor = isPaid ? "#059669" : isSubmitted ? "#1D4ED8" : "#2D5BE3";
              const monthBadgeBg = isPaid ? "#ECFDF5" : isSubmitted ? "#EFF6FF" : "#EEF2FF";

              return (
                <div
                  key={bill.id}
                  role="listitem"
                  style={{
                    background: "white", border: "1px solid #E2E8F0",
                    borderRadius: 12, boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
                    overflow: "hidden",
                    transition: "box-shadow 200ms ease, border-color 200ms ease",
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
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "16px 20px", cursor: "pointer", userSelect: "none",
                    }}
                  >
                    {/* Month badge */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 8, background: monthBadgeBg,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, lineHeight: 1,
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: monthBadgeColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {shortMonthThai(bill.period)}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: monthBadgeColor, opacity: 0.7 }}>
                        {thaiYearFromPeriod(bill.period)}
                      </span>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>
                        {thaiPeriod(bill.period)}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      <div>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: "1rem",
                          fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#0F172A", textAlign: "right",
                        }}>
                          {fmt(bill.total)} ฿
                        </div>
                        <div style={{ textAlign: "right", marginTop: 3 }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "3px 10px", borderRadius: 9999,
                            fontSize: "0.75rem", fontWeight: 600,
                            background: badgeColor.bg, border: `1px solid ${badgeColor.border}`, color: badgeColor.text,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: badgeColor.text, flexShrink: 0 }} />
                            {isPaid ? "จ่ายแล้ว" : isSubmitted ? "รอยืนยัน" : "ค้างชำระ"}
                          </span>
                        </div>
                      </div>
                      <svg
                        viewBox="0 0 24 24" width="20" height="20"
                        fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"
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
                        <div style={{ padding: "16px 20px", background: "#F8FAFC", borderTop: "1px solid #F1F5F9" }}>
                          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
                            มิเตอร์เดือนนี้
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {/* Water */}
                            <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 16px" }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0284C7", marginBottom: 8 }}>
                                น้ำประปา
                              </div>
                              {bill.prevReading && (
                                <MeterRow label="เดือนก่อน" value={bill.prevReading.waterReading} />
                              )}
                              <MeterRow label="เดือนนี้" value={bill.currReading.waterReading} />
                              <span style={{
                                display: "inline-block", marginTop: 8,
                                padding: "2px 8px", borderRadius: 9999,
                                fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                                background: "#E0F2FE", color: "#0369A1",
                              }}>
                                ใช้ {bill.waterUnits} หน่วย
                              </span>
                            </div>
                            {/* Electric */}
                            <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 16px" }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#D97706", marginBottom: 8 }}>
                                ไฟฟ้า
                              </div>
                              {bill.prevReading && (
                                <MeterRow label="เดือนก่อน" value={bill.prevReading.electricReading} />
                              )}
                              <MeterRow label="เดือนนี้" value={bill.currReading.electricReading} />
                              <span style={{
                                display: "inline-block", marginTop: 8,
                                padding: "2px 8px", borderRadius: 9999,
                                fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                                background: "#FEF3C7", color: "#92400E",
                              }}>
                                ใช้ {bill.electricUnits} หน่วย
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderTop: "1px solid #F1F5F9" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDownloadPdf(bill)}
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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

function StatBox({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div style={{
      background: "white", border: "1px solid #E2E8F0", borderRadius: 12,
      padding: "16px 20px", boxShadow: "0 1px 3px rgba(15,23,42,0.08)", textAlign: "center",
    }}>
      <div style={{
        fontSize: "1.375rem", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
        fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1.25,
        color: color ?? "#0F172A",
      }}>
        {value}
      </div>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function MeterRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#475569", marginBottom: 2 }}>
      <span>{label}</span>
      <span style={{ fontFamily: "monospace", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#0F172A" }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}
