"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Toast from "@/components/Toast";

interface Room {
  id: number;
  roomNumber: string;
  roomType: string | null;
  baseRent: number;
  waterRate: number;
  electricRate: number;
  location: { id: number; name: string };
  options: { id: number; name: string; price: number }[];
}

interface LineItem {
  id: number;
  label: string;
  amount: number;
}

interface Bill {
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
  lineItems: LineItem[];
}

interface TenantData {
  tenant: { id: number; name: string; email: string };
  room: Room | null;
  latestBill: Bill | null;
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

function getCurrentThaiDate() {
  const now = new Date();
  const thaiYear = now.getFullYear() + 543;
  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  return `${monthNames[now.getMonth()]} ${thaiYear}`;
}

export default function TenantDashboardPage() {
  const [data, setData] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    fetch("/api/tenant/bill")
      .then((r) => r.json())
      .then((d: TenantData) => setData(d))
      .catch(() => setToast({ message: "โหลดข้อมูลล้มเหลว", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
    setToast({ message: "เปิดหน้าต่างพิมพ์แล้ว", type: "info" });
  };

  if (loading) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px", textAlign: "center", color: "#475569" }}>
        กำลังโหลด...
      </main>
    );
  }

  const bill = data?.latestBill;
  const room = data?.room;
  const tenantName = data?.tenant?.name ?? "";
  const isPaid = bill?.paymentStatus === "PAID";
  const isPending = bill?.paymentStatus === "SUBMITTED";

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }} id="main-content">

        {/* Greeting */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "2rem" }}>🏠</span>
            สวัสดี, คุณ{tenantName}
          </h1>
          <p style={{ fontSize: "1rem", color: "#64748B", marginTop: 8 }}>
            {room ? `ห้อง ${room.roomNumber} · ${room.location.name} · ` : ""}
            {getCurrentThaiDate()}
          </p>
        </div>

        {!room ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Hero empty state - neo-brutalist */}
            <div
              style={{
                background: "#FFD93D",
                border: "4px solid #2C3E50",
                borderRadius: 24,
                padding: "48px 40px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "5rem", marginBottom: 16 }}>🏠</div>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#2C3E50", marginBottom: 12 }}>
                ยังไม่ได้ผูกห้องพัก
              </h2>
              <p style={{ fontSize: "1rem", color: "#2C3E50", marginBottom: 8, fontWeight: 700 }}>
                คุณยังไม่ได้เข้าร่วมหอพักใด ๆ
              </p>
              <p style={{ fontSize: "0.875rem", color: "#2C3E50", fontWeight: 600 }}>
                เลือกหนึ่งในตัวเลือกด้านล่างเพื่อเริ่มต้นใช้งาน
              </p>
            </div>

            {/* Option card - Join with invite code */}
            <div
              style={{
                background: "#FFFFFF",
                border: "4px solid #2C3E50",
                borderRadius: 24,
                padding: "32px 28px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "#B8D8E8",
                    border: "4px solid #2C3E50",
                    borderRadius: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2rem",
                    flexShrink: 0,
                  }}
                >
                  🔑
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#2C3E50", marginBottom: 8 }}>
                    มี Invite Code จากหอพัก?
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "#2C3E50", marginBottom: 16, fontWeight: 600 }}>
                    ถ้าคุณได้รับรหัสเชิญจากเจ้าของหอพัก สามารถใช้รหัสเพื่อเข้าร่วมได้ทันที
                  </p>
                  <Link
                    href="/tenant/invite"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "14px 28px",
                      borderRadius: 16,
                      textDecoration: "none",
                      color: "#2C3E50",
                      background: "#B8D8E8",
                      border: "4px solid #2C3E50",
                      fontSize: "1rem",
                      fontWeight: 900,
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    ใช้ Invite Code
                  </Link>
                </div>
              </div>
            </div>

            {/* Option card - Create own apartment */}
            <div
              style={{
                background: "#FFFFFF",
                border: "4px solid #2C3E50",
                borderRadius: 24,
                padding: "32px 28px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "#7FDB9A",
                    border: "4px solid #2C3E50",
                    borderRadius: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2rem",
                    flexShrink: 0,
                  }}
                >
                  ✨
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#2C3E50", marginBottom: 8 }}>
                    สนใจเป็นเจ้าของหอพัก?
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "#2C3E50", marginBottom: 16, fontWeight: 600 }}>
                    ทดลองใช้ฟรี 30 วัน! จัดการห้อง ออกบิล รับสลิปชำระเงิน ครบทุกฟีเจอร์
                  </p>
                  <Link
                    href="/app/locations"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "14px 28px",
                      borderRadius: 16,
                      textDecoration: "none",
                      color: "#2C3E50",
                      background: "#7FDB9A",
                      border: "4px solid #2C3E50",
                      fontSize: "1rem",
                      fontWeight: 900,
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9,22 9,12 15,12 15,22" />
                    </svg>
                    เริ่มทดลองฟรี 30 วัน
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : !bill ? (
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 32, textAlign: "center", color: "#475569" }}>
            <p style={{ fontSize: "1rem" }}>ยังไม่มีบิลในระบบ</p>
          </div>
        ) : (
          <>
            {/* Due date notice — show when unpaid */}
            {!isPaid && !isPending && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "20px 24px",
                  background: "#FFD93D", 
                  border: "4px solid #2C3E50",
                  borderRadius: 20, 
                  color: "#2C3E50",
                  fontSize: "1rem", 
                  marginBottom: 24, 
                  fontWeight: 800,
                }}
              >
                <span style={{ fontSize: "2.5rem" }}>⏰</span>
                <div>
                  <strong style={{ fontSize: "1.125rem" }}>มีบิลค้างชำระ</strong> — กรุณาชำระให้ทันเวลาเพื่อหลีกเลี่ยงค่าปรับ
                </div>
              </div>
            )}

            {/* Bill hero card */}
            <section
              style={{
                background: "#FFFFFF", 
                border: "4px solid #2C3E50",
                borderRadius: 24, 
                overflow: "hidden", 
                marginBottom: 28,
              }}
              aria-label={`บิลเดือน${thaiPeriod(bill.period)}`}
            >
              {/* Header row */}
              <div style={{
                padding: 28, borderBottom: "3px solid #2C3E50",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
              }}>
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "0.02em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "2rem" }}>📊</span>
                    บิลประจำเดือน
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2C3E50", marginTop: 6 }}>
                    {thaiPeriod(bill.period)}
                  </div>
                </div>
                <StatusBadge status={bill.paymentStatus} />
              </div>

              {/* Total amount */}
              <div style={{
                padding: 40, textAlign: "center",
                background: isPaid ? "#ECFDF5" : "#FFF8F0",
                borderBottom: "3px solid #2C3E50",
              }}>
                <div style={{ fontSize: "1.125rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ fontSize: "2.5rem" }}>💰</span>
                  ยอดที่ต้องชำระ
                </div>
                <div
                  style={{
                    fontSize: "4rem", fontWeight: 900, fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em", lineHeight: 1,
                    color: "#2C3E50",
                    marginBottom: 8,
                  }}
                  aria-label={`${fmt(bill.total)} บาท`}
                >
                  {fmt(bill.total)}
                </div>
                <div style={{ fontSize: "1rem", color: "#2C3E50", fontWeight: 700 }}>บาท</div>
              </div>

              {/* Breakdown */}
              <div style={{ padding: "24px 28px" }}>
                <div style={{ fontSize: "1rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: 20 }}>
                  รายละเอียดค่าใช้จ่าย
                </div>
                <div style={{ border: "3px solid #2C3E50", borderRadius: 16, overflow: "hidden" }}>
                  {/* Rent */}
                  <BreakdownLine
                    iconBg="#EEF2FF" iconColor="#2D5BE3"
                    icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>}
                    label="ค่าเช่าห้อง"
                    detail={`ห้อง ${room.roomNumber}`}
                    amount={bill.baseRent}
                  />
                  {/* Water */}
                  <BreakdownLine
                    iconBg="#F0F9FF" iconColor="#0284C7"
                    icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" /></svg>}
                    label="ค่าน้ำ"
                    detail={`${bill.waterUnits} หน่วย × ${room.waterRate} ฿`}
                    amount={bill.waterCost}
                  />
                  {/* Electricity */}
                  <BreakdownLine
                    iconBg="#FFFBEB" iconColor="#D97706"
                    icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>}
                    label="ค่าไฟ"
                    detail={`${bill.electricUnits} หน่วย × ${room.electricRate} ฿`}
                    amount={bill.electricCost}
                  />
                  {/* Options — from lineItems if available, otherwise skip if 0 */}
                  {bill.lineItems.filter((li) => li.label !== "ค่าเช่า" && !li.label.startsWith("ค่าน้ำ") && !li.label.startsWith("ค่าไฟ")).map((li) => (
                    <BreakdownLine
                      key={li.id}
                      iconBg="#F1F5F9" iconColor="#475569"
                      icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M1 6l10.5 6L22 6M1 6v12l10.5 6L22 18V6" /></svg>}
                      label={li.label}
                      detail=""
                      amount={li.amount}
                      isLast={false}
                    />
                  ))}
                </div>
              </div>

              {/* CTA buttons */}
              <div style={{
                padding: "20px 24px",
                background: "#FFF8F0", 
                borderTop: "3px solid #2C3E50",
                display: "flex", gap: 12, flexWrap: "wrap",
              }}>
                <button
                  style={{ 
                    flex: 1, 
                    minWidth: 140, 
                    height: 56, 
                    fontSize: "1rem", 
                    fontWeight: 900,
                    background: "#B8D8E8",
                    border: "4px solid #2C3E50",
                    borderRadius: 16,
                    color: "#2C3E50",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  onClick={() => { window.open(`/api/tenant/bills/${bill.id}/pdf`, "_blank"); setToast({ message: "ดาวน์โหลด PDF", type: "info" }); }}
                  aria-label={`ดาวน์โหลดบิล ${thaiPeriod(bill.period)} เป็น PDF`}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  ดาวน์โหลด PDF
                </button>
                {!isPaid && !isPending && (
                  <Link
                    href="/tenant/payment"
                    style={{ 
                      flex: 1, 
                      minWidth: 140, 
                      height: 56, 
                      fontSize: "1rem", 
                      fontWeight: 900,
                      background: "#7FDB9A",
                      border: "4px solid #2C3E50",
                      borderRadius: 16,
                      color: "#2C3E50",
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: 8, 
                      textDecoration: "none" 
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    แจ้งชำระเงิน
                  </Link>
                )}
              </div>
            </section>

            {/* Room info card */}
            <div
              style={{
                background: "#FFFFFF", 
                border: "4px solid #2C3E50",
                borderRadius: 24, 
                padding: "24px 28px",
              }}
              aria-label="ข้อมูลห้องพัก"
            >
              <div style={{ fontSize: "1rem", fontWeight: 900, color: "#2C3E50", letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "2rem" }}>🏠</span>
                ข้อมูลห้องของคุณ
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <RoomInfoItem label="หอพัก" value={room.location.name} />
                <RoomInfoItem label="ห้อง" value={room.roomNumber} />
                <RoomInfoItem label="ประเภท" value={room.roomType ?? "—"} />
                <RoomInfoItem label="ค่าเช่ารายเดือน" value={`${fmt(room.baseRent)} ฿`} mono />
                <RoomInfoItem label="อัตราน้ำ" value={`${room.waterRate} ฿/หน่วย`} mono />
                <RoomInfoItem label="อัตราไฟ" value={`${room.electricRate} ฿/หน่วย`} mono />
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PAID") {
    return (
      <span role="status" style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 20px", borderRadius: 16,
        fontSize: "1rem", fontWeight: 900,
        background: "#7FDB9A", border: "4px solid #2C3E50", color: "#2C3E50",
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#2C3E50", flexShrink: 0 }} />
        จ่ายแล้ว
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span role="status" style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 20px", borderRadius: 16,
        fontSize: "1rem", fontWeight: 900,
        background: "#B8D8E8", border: "4px solid #2C3E50", color: "#2C3E50",
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#2C3E50", flexShrink: 0 }} />
        รอยืนยัน
      </span>
    );
  }
  return (
    <span role="status" style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "10px 20px", borderRadius: 16,
      fontSize: "1rem", fontWeight: 900,
      background: "#FFD93D", border: "4px solid #2C3E50", color: "#2C3E50",
    }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#2C3E50", flexShrink: 0 }} />
      ค้างชำระ
    </span>
  );
}

function BreakdownLine({
  iconBg, iconColor, icon, label, detail, amount, isLast,
}: {
  iconBg: string; iconColor: string; icon: React.ReactNode;
  label: string; detail: string; amount: number; isLast?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px",
      borderBottom: isLast === false ? "1px solid #F1F5F9" : undefined,
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: iconBg, color: iconColor,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#0F172A", lineHeight: 1.25 }}>{label}</div>
          {detail && <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: 1 }}>{detail}</div>}
        </div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8125rem", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "#0F172A", whiteSpace: "nowrap" }}>
        {fmt(amount)} ฿
      </div>
    </div>
  );
}

function RoomInfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: "0.8125rem", fontWeight: 600, color: "#0F172A",
        ...(mono ? { fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" } : {}),
      }}>
        {value}
      </span>
    </div>
  );
}
