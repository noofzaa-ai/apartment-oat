"use client";

import { useState, useEffect, useRef } from "react";
import Toast from "@/components/Toast";

interface Bill {
  id: number;
  period: string;
  total: number;
  paymentStatus: string;
  paymentRejectionReason: string | null;
}

interface TenantData {
  tenant: { id: number; name: string };
  room: { id: number; roomNumber: string; location: { name: string } } | null;
  bills: Bill[];
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function thaiPeriod(period: string) {
  const [y, m] = period.split("-");
  const thaiYear = Number(y) + 543;
  const months = [
    "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
  ];
  return `${months[Number(m) - 1]} ${thaiYear}`;
}

export default function TenantPaymentPage() {
  const [data, setData] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/tenant/bills")
      .then((r) => r.json())
      .then((d: TenantData) => {
        setData(d);
        // Auto-select first pending/unpaid bill
        const pending = d.bills.find((b) => b.paymentStatus === "UNPAID" || b.paymentStatus === "SUBMITTED");
        if (pending) setSelectedBillId(pending.id);
      })
      .catch(() => setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    if (f) {
      if (f.type.startsWith("image/")) {
        setPreview(URL.createObjectURL(f));
      } else {
        setPreview(null);
      }
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBillId) {
      setToast({ message: "กรุณาเลือกบิลที่ต้องการแจ้งชำระ", type: "error" });
      return;
    }
    if (!file) {
      setToast({ message: "กรุณาอัปโหลดสลิปการชำระ", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("billId", String(selectedBillId));
      formData.set("slip", file);
      formData.set("note", note);

      const res = await fetch("/api/tenant/payment", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setToast({ message: "แจ้งชำระสำเร็จ รอแอดมินยืนยัน", type: "success" });
      setFile(null);
      setPreview(null);
      setNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Reload bills
      const updated = await fetch("/api/tenant/bills").then((r) => r.json());
      setData(updated);
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingBills = data?.bills.filter(
    (b) => b.paymentStatus === "UNPAID" || b.paymentStatus === "SUBMITTED"
  ) ?? [];

  const selectedBill = data?.bills.find((b) => b.id === selectedBillId) ?? null;
  const isSubmitted = selectedBill?.paymentStatus === "SUBMITTED";

  if (loading) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px", textAlign: "center", color: "#475569" }}>
        กำลังโหลด...
      </main>
    );
  }

  const room = data?.room;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 20px" }} id="main-content">

        {/* Page heading */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "-0.02em", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "3rem" }}>💰</span>
            แจ้งชำระเงิน
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#2C3E50", marginTop: 8, fontWeight: 700 }}>
            {room ? `ห้อง ${room.roomNumber} · ${room.location.name}` : ""}
          </p>
        </div>

        {!room ? (
          <div style={{ background: "linear-gradient(135deg, #ffffff 0%, #fefcfb 100%)", border: "none", borderRadius: 24, padding: 56, textAlign: "center", color: "#475569", boxShadow: "0 8px 32px rgba(15,23,42,0.08)" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🏠</div>
            ยังไม่ได้ผูกห้อง กรุณาติดต่อผู้ดูแลระบบ
          </div>
        ) : pendingBills.length === 0 ? (
          <div style={{ background: "linear-gradient(135deg, #ffffff 0%, #ECFDF5 100%)", border: "none", borderRadius: 24, padding: 56, textAlign: "center", color: "#475569", boxShadow: "0 8px 32px rgba(5,150,105,0.12)" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 20 }}>💰</div>
            <p style={{ fontSize: "1rem", fontWeight: 600, color: "#059669", marginBottom: 8 }}>ไม่มีบิลค้างชำระ</p>
            <p style={{ fontSize: "0.875rem" }}>บิลทั้งหมดชำระครบแล้ว</p>
          </div>
        ) : (
          <>
            {/* Bill selector */}
            <div style={{
              background: "#FFFFFF", 
              border: "4px solid #2C3E50",
              borderRadius: 24, 
              marginBottom: 28, 
              overflow: "hidden",
            }}>
              <div style={{
                padding: "20px 24px", 
                borderBottom: "3px solid #2C3E50",
                fontSize: "1rem", 
                fontWeight: 900, 
                color: "#2C3E50", 
                display: "flex", 
                alignItems: "center", 
                gap: 10,
              }}>
                <span style={{ fontSize: "2rem" }}>📊</span>
                เลือกบิลที่ต้องการแจ้งชำระ
              </div>

              {pendingBills.map((bill) => {
                const isSelected = selectedBillId === bill.id;
                const isThisSubmitted = bill.paymentStatus === "SUBMITTED";
                const wasRejected = bill.paymentStatus === "UNPAID" && bill.paymentRejectionReason;

                return (
                  <label
                    key={bill.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 18,
                      padding: "20px 24px", cursor: "pointer",
                      borderBottom: "2px solid #E5E7EB",
                      background: isSelected ? "#B8D8E8" : "transparent",
                      transition: "background 120ms",
                    }}
                  >
                    <input
                      type="radio"
                      name="bill"
                      value={bill.id}
                      checked={isSelected}
                      onChange={() => setSelectedBillId(bill.id)}
                      style={{ width: 24, height: 24, accentColor: "#2C3E50" }}
                      disabled={isThisSubmitted}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: "1.125rem", color: "#2C3E50" }}>
                        {thaiPeriod(bill.period)}
                      </div>
                      {wasRejected && (
                        <div style={{ fontSize: "0.875rem", color: "#DC2626", marginTop: 3, fontWeight: 700 }}>
                          ถูกปฏิเสธ: {bill.paymentRejectionReason}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: "1.25rem",
                        fontWeight: 900, fontVariantNumeric: "tabular-nums", color: "#2C3E50",
                      }}>
                        {fmt(bill.total)} ฿
                      </div>
                      <div style={{ marginTop: 6 }}>
                        {isThisSubmitted ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "6px 14px", borderRadius: 16,
                            fontSize: "0.875rem", fontWeight: 800,
                            background: "#B8D8E8", border: "3px solid #2C3E50", color: "#2C3E50",
                          }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2C3E50" }} />
                            รอยืนยัน
                          </span>
                        ) : (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "6px 14px", borderRadius: 16,
                            fontSize: "0.875rem", fontWeight: 800,
                            background: "#FFD93D", border: "3px solid #2C3E50", color: "#2C3E50",
                          }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2C3E50" }} />
                            ค้างชำระ
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Upload form — only show when non-submitted bill is selected */}
            {selectedBill && !isSubmitted && (
              <div style={{
                background: "#FFFFFF", 
                border: "4px solid #2C3E50",
                borderRadius: 24, 
                overflow: "hidden",
              }}>
                <div style={{ padding: "20px 24px", borderBottom: "3px solid #2C3E50", fontSize: "1rem", fontWeight: 900, color: "#2C3E50", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "2rem" }}>💰</span>
                  อัปโหลดหลักฐานการชำระ
                </div>

                <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

                  {/* File drop zone */}
                  <div>
                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 12 }}>
                      สลิปการชำระ <span style={{ color: "#DC2626" }}>*</span>
                    </div>
                    <label
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        padding: "32px 24px", 
                        border: `4px dashed ${file ? "#7FDB9A" : "#2C3E50"}`,
                        borderRadius: 20, 
                        cursor: "pointer",
                        background: file ? "#ECFDF5" : "#FFF8F0",
                        transition: "border-color 150ms, background 150ms",
                        gap: 12,
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                      {preview ? (
                        <img
                          src={preview}
                          alt="ตัวอย่างสลิป"
                          style={{ maxWidth: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 8 }}
                        />
                      ) : (
                        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke={file ? "#2D5BE3" : "#94A3B8"} strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      )}
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#2C3E50" }}>
                          {file ? file.name : "คลิกเพื่อเลือกไฟล์"}
                        </div>
                        <div style={{ fontSize: "0.875rem", color: "#2C3E50", marginTop: 4, fontWeight: 600 }}>
                          รองรับ JPG, PNG, WebP, GIF, PDF — ขนาดสูงสุด 10 MB
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Note */}
                  <div>
                    <label style={{ fontSize: "1rem", fontWeight: 800, color: "#2C3E50", marginBottom: 12, display: "block" }}>
                      หมายเหตุเพิ่มเติม (ไม่จำเป็น)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="เช่น โอนผ่านธนาคาร X เวลา 10:30 น."
                      rows={3}
                      style={{
                        width: "100%", 
                        padding: "14px 16px",
                        border: "3px solid #2C3E50", 
                        borderRadius: 16,
                        fontSize: "1rem", 
                        color: "#2C3E50",
                        fontWeight: 600,
                        resize: "vertical", 
                        outline: "none",
                        boxSizing: "border-box",
                        background: "#FFF8F0",
                      }}
                    />
                  </div>

                  {/* Submit */}
                  <button
                    style={{ 
                      width: "100%",
                      height: 64, 
                      fontSize: "1.125rem", 
                      fontWeight: 900, 
                      borderRadius: 20,
                      background: submitting || !file ? "#CBD5E1" : "#7FDB9A",
                      border: "4px solid #2C3E50",
                      color: "#2C3E50",
                      cursor: submitting || !file ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                    }}
                    onClick={handleSubmit}
                    disabled={submitting || !file}
                  >
                    {submitting ? (
                      "กำลังส่ง..."
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" />
                        </svg>
                        ส่งหลักฐานการชำระ
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Already submitted notice */}
            {selectedBill && isSubmitted && (
              <div style={{
                background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)", border: "none", borderRadius: 20,
                padding: "24px 28px", display: "flex", alignItems: "flex-start", gap: 16, boxShadow: "0 6px 24px rgba(29,78,216,0.12)",
              }}>
                <span style={{ fontSize: "2rem", flexShrink: 0 }}>📝</span>
                <div>
                  <div style={{ fontWeight: 700, color: "#1D4ED8", marginBottom: 6, fontSize: "1.0625rem" }}>สลิปส่งแล้ว — รอแอดมินยืนยัน</div>
                  <div style={{ fontSize: "0.875rem", color: "#1E40AF" }}>
                    ระบบกำลังตรวจสอบสลิปของคุณ กรุณารอการยืนยันจากผู้ดูแล
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
