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

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }} id="main-content">

        {/* Page heading */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: 4 }}>
            แจ้งชำระเงิน
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "#475569" }}>
            {room ? `ห้อง ${room.roomNumber} · ${room.location.name}` : ""}
          </p>
        </div>

        {!room ? (
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 48, textAlign: "center", color: "#475569" }}>
            ยังไม่ได้ผูกห้อง กรุณาติดต่อผู้ดูแลระบบ
          </div>
        ) : pendingBills.length === 0 ? (
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 48, textAlign: "center", color: "#475569" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#059669" strokeWidth="1.5" style={{ margin: "0 auto" }}>
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p style={{ fontSize: "1rem", fontWeight: 600, color: "#059669", marginBottom: 8 }}>ไม่มีบิลค้างชำระ</p>
            <p style={{ fontSize: "0.875rem" }}>บิลทั้งหมดชำระครบแล้ว</p>
          </div>
        ) : (
          <>
            {/* Bill selector */}
            <div style={{
              background: "white", border: "1px solid #E2E8F0",
              borderRadius: 16, boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
              marginBottom: 20, overflow: "hidden",
            }}>
              <div style={{
                padding: "16px 20px", borderBottom: "1px solid #F1F5F9",
                fontSize: "0.8125rem", fontWeight: 700, color: "#0F172A",
              }}>
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
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "16px 20px", cursor: "pointer",
                      borderBottom: "1px solid #F1F5F9",
                      background: isSelected ? "#F5F7FF" : "transparent",
                      transition: "background 120ms",
                    }}
                  >
                    <input
                      type="radio"
                      name="bill"
                      value={bill.id}
                      checked={isSelected}
                      onChange={() => setSelectedBillId(bill.id)}
                      style={{ width: 20, height: 20, accentColor: "#2D5BE3" }}
                      disabled={isThisSubmitted}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#0F172A" }}>
                        {thaiPeriod(bill.period)}
                      </div>
                      {wasRejected && (
                        <div style={{ fontSize: "0.75rem", color: "#DC2626", marginTop: 3 }}>
                          ถูกปฏิเสธ: {bill.paymentRejectionReason}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: "1rem",
                        fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#0F172A",
                      }}>
                        {fmt(bill.total)} ฿
                      </div>
                      <div style={{ marginTop: 4 }}>
                        {isThisSubmitted ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "3px 10px", borderRadius: 9999,
                            fontSize: "0.75rem", fontWeight: 600,
                            background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8",
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563EB" }} />
                            รอยืนยัน
                          </span>
                        ) : (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "3px 10px", borderRadius: 9999,
                            fontSize: "0.75rem", fontWeight: 600,
                            background: "#FFFBEB", border: "1px solid #FDE68A", color: "#D97706",
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706" }} />
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
                background: "white", border: "1px solid #E2E8F0",
                borderRadius: 16, boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
                overflow: "hidden",
              }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", fontSize: "0.8125rem", fontWeight: 700, color: "#0F172A" }}>
                  อัปโหลดหลักฐานการชำระ
                </div>

                <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

                  {/* File drop zone */}
                  <div>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>
                      สลิปการชำระ <span style={{ color: "#DC2626" }}>*</span>
                    </div>
                    <label
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        padding: "32px 24px", border: `2px dashed ${file ? "#2D5BE3" : "#CBD5E1"}`,
                        borderRadius: 12, cursor: "pointer",
                        background: file ? "#F5F7FF" : "#F8FAFC",
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
                        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: file ? "#2D5BE3" : "#475569" }}>
                          {file ? file.name : "คลิกเพื่อเลือกไฟล์"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: 2 }}>
                          รองรับ JPG, PNG, WebP, GIF, PDF — ขนาดสูงสุด 10 MB
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Note */}
                  <div>
                    <label style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#0F172A", marginBottom: 8, display: "block" }}>
                      หมายเหตุเพิ่มเติม (ไม่จำเป็น)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="เช่น โอนผ่านธนาคาร X เวลา 10:30 น."
                      rows={3}
                      style={{
                        width: "100%", padding: "10px 14px",
                        border: "1px solid #CBD5E1", borderRadius: 8,
                        fontSize: "0.875rem", color: "#0F172A",
                        resize: "vertical", outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Submit */}
                  <button
                    className="btn btn-primary"
                    style={{ height: 52, fontSize: "1rem", fontWeight: 700 }}
                    onClick={handleSubmit}
                    disabled={submitting || !file}
                  >
                    {submitting ? (
                      "กำลังส่ง..."
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
                background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12,
                padding: "20px 24px", display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1D4ED8" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <div style={{ fontWeight: 700, color: "#1D4ED8", marginBottom: 4 }}>สลิปส่งแล้ว — รอแอดมินยืนยัน</div>
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
